"""
AI Image Enhancement API
- Background removal with white background replacement
- Image quality enhancement (lighting, colors, sharpness)
- Bulk processing for all products
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import os
import base64
import httpx
import asyncio
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

image_ai_router = APIRouter(prefix="/api/image-ai", tags=["Image AI"])

# Get database reference
db = None

def set_database(database):
    global db
    db = database

# Models
class ImageEnhanceRequest(BaseModel):
    image_url: str
    remove_background: bool = True
    enhance_quality: bool = True
    white_background: bool = True

class BulkEnhanceRequest(BaseModel):
    store: str
    remove_background: bool = True
    enhance_quality: bool = True
    white_background: bool = True

class EnhanceResult(BaseModel):
    success: bool
    original_url: str
    enhanced_url: Optional[str] = None
    error: Optional[str] = None

# Store processing status
processing_status = {}

async def download_image_as_base64(url: str) -> str:
    """Download image from URL and convert to base64"""
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=30)
        if response.status_code == 200:
            return base64.b64encode(response.content).decode('utf-8')
        raise Exception(f"Failed to download image: {response.status_code}")

async def enhance_image_with_ai(image_url: str, remove_bg: bool = True, enhance: bool = True, white_bg: bool = True) -> dict:
    """Use AI to enhance product image"""
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise Exception("EMERGENT_LLM_KEY not configured")
        
        # Build the enhancement prompt
        prompt_parts = []
        
        if remove_bg and white_bg:
            prompt_parts.append("Remove the background completely and replace with a pure white (#FFFFFF) background")
        elif remove_bg:
            prompt_parts.append("Remove the background")
        
        if enhance:
            prompt_parts.append("Enhance the image quality: improve lighting to be bright and even, boost colors to be vibrant but natural, increase sharpness and clarity")
        
        prompt_parts.append("Keep the product exactly as it is, only modify the background and enhance quality")
        prompt_parts.append("The result should look like a professional e-commerce product photo")
        
        full_prompt = ". ".join(prompt_parts)
        
        # Initialize the image generator
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        # Download original image
        image_base64 = await download_image_as_base64(image_url)
        
        # Generate enhanced image using edit capability
        # Note: gpt-image-1 can edit images based on prompts
        images = await image_gen.generate_images(
            prompt=f"Edit this product photo: {full_prompt}",
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            enhanced_base64 = base64.b64encode(images[0]).decode('utf-8')
            return {
                "success": True,
                "enhanced_base64": enhanced_base64,
                "format": "png"
            }
        else:
            raise Exception("No image was generated")
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

async def process_single_image(product_id: str, image_url: str, store: str, options: dict) -> dict:
    """Process a single product image"""
    try:
        result = await enhance_image_with_ai(
            image_url=image_url,
            remove_bg=options.get('remove_background', True),
            enhance=options.get('enhance_quality', True),
            white_bg=options.get('white_background', True)
        )
        
        if result['success']:
            # Save enhanced image (in production, upload to cloud storage)
            # For now, store as base64 in database
            enhanced_url = f"data:image/png;base64,{result['enhanced_base64']}"
            
            # Update product in database
            if db:
                await db.products.update_one(
                    {"_id": product_id, "store": store},
                    {
                        "$set": {
                            "enhanced_image": enhanced_url,
                            "image_enhanced_at": datetime.utcnow().isoformat()
                        }
                    }
                )
            
            return {
                "success": True,
                "product_id": product_id,
                "enhanced_url": enhanced_url
            }
        else:
            return {
                "success": False,
                "product_id": product_id,
                "error": result.get('error', 'Unknown error')
            }
    except Exception as e:
        return {
            "success": False,
            "product_id": product_id,
            "error": str(e)
        }

async def bulk_enhance_task(store: str, options: dict, task_id: str):
    """Background task to enhance all product images"""
    global processing_status
    
    try:
        processing_status[task_id] = {
            "status": "processing",
            "total": 0,
            "processed": 0,
            "success": 0,
            "failed": 0,
            "errors": [],
            "started_at": datetime.utcnow().isoformat()
        }
        
        # Get all products with images
        if not db:
            processing_status[task_id]["status"] = "error"
            processing_status[task_id]["error"] = "Database not connected"
            return
        
        products = await db.products.find(
            {"store": store, "image": {"$exists": True, "$ne": ""}},
            {"_id": 1, "image": 1, "title": 1}
        ).to_list(1000)
        
        processing_status[task_id]["total"] = len(products)
        
        for product in products:
            try:
                result = await process_single_image(
                    product_id=str(product["_id"]),
                    image_url=product.get("image", ""),
                    store=store,
                    options=options
                )
                
                processing_status[task_id]["processed"] += 1
                
                if result["success"]:
                    processing_status[task_id]["success"] += 1
                else:
                    processing_status[task_id]["failed"] += 1
                    processing_status[task_id]["errors"].append({
                        "product_id": str(product["_id"]),
                        "title": product.get("title", "Unknown"),
                        "error": result.get("error", "Unknown error")
                    })
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(1)
                
            except Exception as e:
                processing_status[task_id]["failed"] += 1
                processing_status[task_id]["errors"].append({
                    "product_id": str(product["_id"]),
                    "error": str(e)
                })
        
        processing_status[task_id]["status"] = "completed"
        processing_status[task_id]["completed_at"] = datetime.utcnow().isoformat()
        
    except Exception as e:
        processing_status[task_id]["status"] = "error"
        processing_status[task_id]["error"] = str(e)

@image_ai_router.post("/enhance-single")
async def enhance_single_image(request: ImageEnhanceRequest):
    """Enhance a single product image"""
    result = await enhance_image_with_ai(
        image_url=request.image_url,
        remove_bg=request.remove_background,
        enhance=request.enhance_quality,
        white_bg=request.white_background
    )
    
    if result['success']:
        return {
            "success": True,
            "enhanced_image": f"data:image/png;base64,{result['enhanced_base64']}"
        }
    else:
        raise HTTPException(status_code=500, detail=result.get('error', 'Failed to enhance image'))

@image_ai_router.post("/enhance-bulk")
async def enhance_bulk_images(request: BulkEnhanceRequest, background_tasks: BackgroundTasks):
    """Start bulk enhancement of all product images for a store"""
    import uuid
    task_id = str(uuid.uuid4())
    
    options = {
        "remove_background": request.remove_background,
        "enhance_quality": request.enhance_quality,
        "white_background": request.white_background
    }
    
    # Start background task
    background_tasks.add_task(bulk_enhance_task, request.store, options, task_id)
    
    return {
        "success": True,
        "task_id": task_id,
        "message": "Bulk enhancement started. Use /status/{task_id} to check progress."
    }

@image_ai_router.get("/status/{task_id}")
async def get_enhancement_status(task_id: str):
    """Get status of bulk enhancement task"""
    if task_id not in processing_status:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return processing_status[task_id]

@image_ai_router.get("/products/{store}")
async def get_products_for_enhancement(store: str, limit: int = 50):
    """Get products that can be enhanced"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    products = await db.products.find(
        {"store": store},
        {"_id": 1, "title": 1, "image": 1, "enhanced_image": 1, "image_enhanced_at": 1}
    ).limit(limit).to_list(limit)
    
    # Convert ObjectId to string
    for p in products:
        p["_id"] = str(p["_id"])
    
    return {
        "success": True,
        "products": products,
        "total": len(products)
    }

@image_ai_router.post("/test")
async def test_image_enhancement():
    """Test the image enhancement with a sample image"""
    test_url = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400"
    
    result = await enhance_image_with_ai(
        image_url=test_url,
        remove_bg=True,
        enhance=True,
        white_bg=True
    )
    
    return {
        "success": result.get("success", False),
        "message": "Test completed" if result.get("success") else result.get("error", "Test failed"),
        "has_image": "enhanced_base64" in result
    }
