"""
AI Product Editor API Routes
Uses OpenAI GPT for intelligent product title and selling point generation
Also integrates with 1688 AI for image recognition and title suggestions
"""

from fastapi import APIRouter, HTTPException, Body, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import json
import base64
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage

router = APIRouter(prefix="/api/ai-product", tags=["AI Product Editor"])

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client['shopify_customers_db']
    return _db

# Get API key
def get_llm_key():
    return os.environ.get('EMERGENT_LLM_KEY', '')


# ==================== Request/Response Models ====================

class ProductInput(BaseModel):
    title: str = Field(..., description="Original product title (can be Chinese)")
    description: Optional[str] = Field(None, description="Product description")
    attributes: Optional[List[Dict[str, str]]] = Field(None, description="Product attributes/specs")
    images: Optional[List[str]] = Field(None, description="Product image URLs")
    price: Optional[float] = Field(None, description="Product price")
    category: Optional[str] = Field(None, description="Product category")
    target_language: str = Field("English", description="Target language for output")
    target_market: str = Field("International", description="Target market (e.g., US, UK, International)")


class GeneratedContent(BaseModel):
    optimized_title: str
    seo_title: str
    selling_points: List[str]
    product_description: str
    tags: List[str]


class TranslationInput(BaseModel):
    text: str = Field(..., description="Text to translate")
    source_language: str = Field("Chinese", description="Source language")
    target_language: str = Field("English", description="Target language")


class ImageRecognitionResult(BaseModel):
    recognized_products: List[Dict[str, Any]]
    suggested_titles: List[str]
    suggested_category: Optional[str]
    attributes_detected: List[Dict[str, str]]


# ==================== AI Generation Functions ====================

async def generate_product_content(product: ProductInput) -> GeneratedContent:
    """Use GPT to generate optimized product content"""
    
    api_key = get_llm_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    # Build product context
    product_context = f"""
Product Title: {product.title}
Description: {product.description or 'Not provided'}
Price: {product.price or 'Not provided'}
Category: {product.category or 'Not provided'}
Attributes: {json.dumps(product.attributes, ensure_ascii=False) if product.attributes else 'Not provided'}
"""
    
    system_message = f"""You are an expert e-commerce copywriter specializing in product listings.
Your task is to create compelling, SEO-optimized product content for {product.target_market} market in {product.target_language}.

Guidelines:
1. Create clear, benefit-focused titles (max 80 characters)
2. Generate 5 compelling selling points that highlight key benefits
3. Write a concise product description (150-200 words)
4. Suggest relevant tags for SEO

Always output in valid JSON format."""

    prompt = f"""Based on this product information:
{product_context}

Generate optimized content for this product. Return a JSON object with:
{{
    "optimized_title": "A clear, benefit-focused title in {product.target_language} (max 80 chars)",
    "seo_title": "An SEO-optimized title with keywords (max 100 chars)",
    "selling_points": ["5 compelling selling points as bullet points"],
    "product_description": "A compelling 150-200 word product description",
    "tags": ["8-10 relevant SEO tags"]
}}

IMPORTANT: Return ONLY the JSON object, no other text."""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai-product-{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        # Clean up response if needed
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text.strip())
        return GeneratedContent(**result)
        
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}, Response: {response[:500]}")
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        print(f"AI generation error: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Use GPT to translate text"""
    
    api_key = get_llm_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    system_message = """You are an expert translator specializing in e-commerce product content.
Translate accurately while maintaining the original meaning and tone.
Adapt cultural references for the target market when appropriate."""

    prompt = f"""Translate the following text from {source_lang} to {target_lang}.
Return ONLY the translated text, nothing else.

Text to translate:
{text}"""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"translate-{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response.strip()
        
    except Exception as e:
        print(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


# ==================== API Endpoints ====================

@router.post("/generate")
async def generate_content(product: ProductInput):
    """
    Generate optimized product content using AI.
    Takes product info (can be in Chinese) and generates:
    - Optimized title
    - SEO title
    - Selling points
    - Product description
    - Tags
    """
    content = await generate_product_content(product)
    
    # Save to history
    db = get_db()
    await db.ai_product_history.insert_one({
        "input": product.dict(),
        "output": content.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {
        "success": True,
        "content": content.dict(),
    }


@router.post("/translate")
async def translate_content(request: TranslationInput):
    """Translate text from one language to another"""
    translated = await translate_text(
        request.text, 
        request.source_language, 
        request.target_language
    )
    
    return {
        "success": True,
        "original": request.text,
        "translated": translated,
        "source_language": request.source_language,
        "target_language": request.target_language,
    }


@router.post("/bulk-generate")
async def bulk_generate_content(products: List[ProductInput]):
    """Generate content for multiple products at once"""
    results = []
    
    for product in products:
        try:
            content = await generate_product_content(product)
            results.append({
                "success": True,
                "original_title": product.title,
                "content": content.dict(),
            })
        except Exception as e:
            results.append({
                "success": False,
                "original_title": product.title,
                "error": str(e),
            })
    
    return {
        "success": True,
        "total": len(products),
        "successful": len([r for r in results if r["success"]]),
        "results": results,
    }


@router.post("/improve-title")
async def improve_title(
    title: str = Body(..., embed=True),
    target_language: str = Body("English", embed=True),
    max_length: int = Body(80, embed=True),
):
    """Quick endpoint to just improve a product title"""
    
    api_key = get_llm_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    prompt = f"""Improve this product title for e-commerce:
Original: {title}

Requirements:
- Language: {target_language}
- Maximum {max_length} characters
- Clear, benefit-focused
- SEO-friendly

Return ONLY the improved title, nothing else."""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"title-{datetime.now().timestamp()}",
            system_message="You are an expert e-commerce copywriter."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        improved = await chat.send_message(user_message)
        
        return {
            "success": True,
            "original": title,
            "improved": improved.strip().strip('"'),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to improve title: {str(e)}")


@router.get("/history")
async def get_generation_history(
    page: int = 1,
    limit: int = 20,
):
    """Get history of AI-generated content"""
    db = get_db()
    
    skip = (page - 1) * limit
    
    history = await db.ai_product_history.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.ai_product_history.count_documents({})
    
    return {
        "success": True,
        "history": history,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post("/generate-from-1688/{product_id}")
async def generate_from_1688_product(
    product_id: str,
    target_language: str = Body("English", embed=True),
    target_market: str = Body("International", embed=True),
):
    """
    Generate optimized content directly from a scraped 1688 product.
    Fetches product from database and generates content.
    """
    db = get_db()
    
    # Find the product in scraped_products
    product = await db.scraped_products.find_one(
        {"product_id": product_id},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    
    # Build ProductInput from scraped product
    attributes = []
    if product.get("variants"):
        for variant in product["variants"][:5]:  # Limit to first 5 variants
            if variant.get("attributes"):
                for attr in variant["attributes"]:
                    attributes.append({
                        "name": attr.get("name", ""),
                        "value": attr.get("value", "")
                    })
    
    product_input = ProductInput(
        title=product.get("title", ""),
        description=product.get("description"),
        attributes=attributes if attributes else None,
        images=product.get("images"),
        price=product.get("price"),
        category=product.get("category"),
        target_language=target_language,
        target_market=target_market,
    )
    
    # Generate content
    content = await generate_product_content(product_input)
    
    # Save to history with product_id reference
    await db.ai_product_history.insert_one({
        "product_id": product_id,
        "input": product_input.dict(),
        "output": content.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {
        "success": True,
        "product_id": product_id,
        "original_title": product.get("title"),
        "content": content.dict(),
    }


# ==================== Image Recognition & 1688 AI Endpoints ====================

async def recognize_product_from_image(image_url: str) -> dict:
    """
    Use 1688 image search to recognize product from image.
    Returns similar products found on 1688 with their details.
    """
    db = get_db()
    
    # Get 1688 API credentials
    config = await db.system_config.find_one({"key": "alibaba_api"}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="1688 API not configured")
    
    app_key = config.get("app_key") or os.environ.get("ALIBABA_MERCHANT_APP_KEY")
    app_secret = config.get("app_secret") or os.environ.get("ALIBABA_MERCHANT_APP_SECRET")
    access_token = config.get("access_token") or os.environ.get("ALIBABA_MERCHANT_ACCESS_TOKEN")
    
    if not all([app_key, app_secret, access_token]):
        # Fallback: Use GPT-4 Vision for image analysis
        return await analyze_image_with_gpt(image_url)
    
    # Try 1688 image search API
    try:
        import time
        import hashlib
        import hmac
        
        timestamp = str(int(time.time() * 1000))
        api_method = "com.alibaba.fenxiao/alibaba.pifatuan.product.imgSearch"
        
        params = {
            "imageUrl": image_url,
            "pageSize": 10,
            "pageNo": 1,
        }
        
        # Build signature
        sorted_params = sorted(params.items())
        sign_str = api_method + ''.join([f"{k}{v}" for k, v in sorted_params])
        signature = hmac.new(app_secret.encode(), sign_str.encode(), hashlib.sha256).hexdigest().upper()
        
        url = f"https://gw.open.1688.com/openapi/param2/2/{api_method}/{app_key}"
        
        all_params = {
            **params,
            "access_token": access_token,
            "_aop_timestamp": timestamp,
            "_aop_signature": signature,
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, data=all_params)
            result = response.json()
            
            if result.get("success") and result.get("result"):
                products = result["result"].get("data", [])
                return {
                    "source": "1688_api",
                    "products": products[:5],
                    "total": len(products)
                }
            
    except Exception as e:
        print(f"1688 image search failed: {e}")
    
    # Fallback to GPT-4 Vision
    return await analyze_image_with_gpt(image_url)


async def analyze_image_with_gpt(image_url: str) -> dict:
    """
    Use GPT-4 Vision to analyze product image and suggest titles/attributes.
    """
    api_key = get_llm_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    system_message = """You are an expert e-commerce product analyst.
Analyze product images and provide:
1. Suggested product titles (3 variations)
2. Detected product category
3. Key attributes/features visible in the image
4. Suggested tags for SEO

Be specific and accurate based on what you can see in the image."""

    prompt = f"""Analyze this product image and provide detailed information.
Image URL: {image_url}

Return a JSON object with:
{{
    "suggested_titles": ["3 different title suggestions"],
    "category": "detected product category",
    "attributes": [
        {{"name": "attribute name", "value": "attribute value"}}
    ],
    "tags": ["relevant SEO tags"],
    "description_points": ["key features visible in image"]
}}

IMPORTANT: Return ONLY the JSON object."""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"image-analyze-{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Create message with image
        user_message = UserMessage(text=prompt, image_url=image_url)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text.strip())
        
        return {
            "source": "gpt4_vision",
            "suggested_titles": result.get("suggested_titles", []),
            "category": result.get("category"),
            "attributes": result.get("attributes", []),
            "tags": result.get("tags", []),
            "description_points": result.get("description_points", []),
        }
        
    except Exception as e:
        print(f"GPT Vision analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")


@router.post("/recognize-image")
async def recognize_image(
    image_url: str = Body(..., embed=True, description="URL of the product image to analyze"),
):
    """
    Recognize product from image and suggest titles/attributes.
    Uses 1688 image search API or GPT-4 Vision as fallback.
    """
    result = await recognize_product_from_image(image_url)
    
    # Save to history
    db = get_db()
    await db.ai_image_recognition_history.insert_one({
        "image_url": image_url,
        "result": result,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {
        "success": True,
        "image_url": image_url,
        **result,
    }


@router.post("/recognize-and-generate")
async def recognize_and_generate_content(
    image_url: str = Body(..., description="URL of the product image"),
    target_language: str = Body("English", description="Target language for content"),
    target_market: str = Body("International", description="Target market"),
):
    """
    Analyze product image and generate optimized content in one step.
    1. Recognize product from image
    2. Generate optimized titles, descriptions, and selling points
    """
    # Step 1: Recognize image
    recognition = await recognize_product_from_image(image_url)
    
    # Step 2: Build product input from recognition
    suggested_title = recognition.get("suggested_titles", ["Product"])[0] if recognition.get("suggested_titles") else "Product"
    
    attributes = recognition.get("attributes", [])
    if not attributes and recognition.get("description_points"):
        attributes = [{"name": "Feature", "value": point} for point in recognition["description_points"][:5]]
    
    product_input = ProductInput(
        title=suggested_title,
        description="; ".join(recognition.get("description_points", [])),
        attributes=attributes,
        images=[image_url],
        category=recognition.get("category"),
        target_language=target_language,
        target_market=target_market,
    )
    
    # Step 3: Generate content
    content = await generate_product_content(product_input)
    
    # Save combined result
    db = get_db()
    await db.ai_product_history.insert_one({
        "source": "image_recognition",
        "image_url": image_url,
        "recognition": recognition,
        "input": product_input.dict(),
        "output": content.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {
        "success": True,
        "image_url": image_url,
        "recognition": recognition,
        "content": content.dict(),
    }


@router.post("/upload-and-recognize")
async def upload_and_recognize(
    file: UploadFile = File(..., description="Product image file to upload and analyze"),
    target_language: str = Form("English"),
    target_market: str = Form("International"),
):
    """
    Upload an image file, analyze it, and generate product content.
    Accepts: JPG, PNG, WebP images (max 5MB)
    """
    # Validate file
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")
    
    # Convert to base64 data URL for GPT Vision
    base64_image = base64.b64encode(content).decode("utf-8")
    content_type = file.content_type or "image/jpeg"
    data_url = f"data:{content_type};base64,{base64_image}"
    
    # Use GPT-4 Vision to analyze (1688 API needs a URL, not base64)
    recognition = await analyze_image_with_gpt(data_url)
    
    # Build product input
    suggested_title = recognition.get("suggested_titles", ["Product"])[0] if recognition.get("suggested_titles") else "Product"
    
    attributes = recognition.get("attributes", [])
    if not attributes and recognition.get("description_points"):
        attributes = [{"name": "Feature", "value": point} for point in recognition["description_points"][:5]]
    
    product_input = ProductInput(
        title=suggested_title,
        description="; ".join(recognition.get("description_points", [])),
        attributes=attributes,
        category=recognition.get("category"),
        target_language=target_language,
        target_market=target_market,
    )
    
    # Generate content
    generated_content = await generate_product_content(product_input)
    
    # Save to history
    db = get_db()
    await db.ai_product_history.insert_one({
        "source": "uploaded_image",
        "filename": file.filename,
        "recognition": recognition,
        "input": product_input.dict(),
        "output": generated_content.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {
        "success": True,
        "filename": file.filename,
        "recognition": recognition,
        "content": generated_content.dict(),
    }


@router.get("/recognition-history")
async def get_recognition_history(
    page: int = 1,
    limit: int = 20,
):
    """Get history of image recognition requests"""
    db = get_db()
    
    skip = (page - 1) * limit
    
    history = await db.ai_image_recognition_history.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.ai_image_recognition_history.count_documents({})
    
    return {
        "success": True,
        "history": history,
        "total": total,
        "page": page,
        "limit": limit,
    }


# ==================== Catalog-Based Enhancement ====================

async def scrape_1688_product_details(product_id: str) -> dict:
    """
    Scrape product title and description from 1688.
    """
    try:
        url = f"https://detail.1688.com/offer/{product_id}.html"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            }
            response = await client.get(url, headers=headers, follow_redirects=True)
            
            if response.status_code != 200:
                return {"success": False, "error": f"HTTP {response.status_code}"}
            
            html = response.text
            
            import re
            
            # Extract title
            title_match = re.search(r'<title>([^<]+)</title>', html)
            original_title = title_match.group(1).replace(' - 阿里巴巴', '').strip() if title_match else None
            
            # Extract description from meta or content
            desc_match = re.search(r'<meta name="description" content="([^"]+)"', html)
            description = desc_match.group(1) if desc_match else None
            
            # Try to extract product attributes
            attributes = []
            attr_matches = re.findall(r'"attrName":"([^"]+)","attrValue":"([^"]+)"', html)
            for name, value in attr_matches[:10]:
                attributes.append({"name": name, "value": value})
            
            # Extract price
            price_match = re.search(r'"price":"?([\d.]+)"?', html)
            price = float(price_match.group(1)) if price_match else None
            
            return {
                "success": True,
                "original_title": original_title,
                "description": description,
                "attributes": attributes,
                "price": price,
            }
            
    except Exception as e:
        return {"success": False, "error": str(e)}


async def translate_text_simple(text: str, target_lang: str = "English") -> str:
    """Quick translation using LLM"""
    if not text:
        return ""
    
    api_key = get_llm_key()
    if not api_key:
        return text
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"translate-{datetime.now().timestamp()}"
        ).with_model("openai", "gpt-4o-mini")
        
        response = await chat.send_message(
            UserMessage(text=f"Translate this Chinese text to {target_lang}. Return ONLY the translation, nothing else:\n\n{text}")
        )
        return response.strip()
    except:
        return text


@router.post("/enhance-from-catalog")
async def enhance_product_from_catalog(
    shopify_product_id: str = Body(...),
    store_name: str = Body(...),
    target_language: str = Body("English"),
):
    """
    Enhance a product from the catalog:
    1. Get product from DB
    2. If linked to 1688, scrape details
    3. Analyze product image with AI
    4. Generate improved titles and description
    """
    db = get_db()
    
    # Get product from DB
    product = await db.shopify_products.find_one(
        {"shopify_product_id": str(shopify_product_id), "store_name": store_name},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    result = {
        "success": True,
        "product_id": shopify_product_id,
        "original_title": product.get("title"),
        "suggested_titles": [],
        "description": "",
        "selling_points": [],
        "tags": [],
        "seo_title": "",
        "scraped_from_1688": False,
        "image_recognition": None,
    }
    
    # Step 1: If linked to 1688, scrape details
    linked_1688_id = product.get("linked_1688_product_id")
    scraped_data = None
    
    if linked_1688_id:
        scraped_data = await scrape_1688_product_details(linked_1688_id)
        if scraped_data.get("success"):
            result["scraped_from_1688"] = True
            result["original_1688_title"] = scraped_data.get("original_title")
            
            # Translate title
            if scraped_data.get("original_title"):
                translated = await translate_text_simple(scraped_data["original_title"], target_language)
                result["translated_title"] = translated
            
            # Translate description
            if scraped_data.get("description"):
                translated_desc = await translate_text_simple(scraped_data["description"], target_language)
                result["description"] = translated_desc
    
    # Step 2: Analyze product image with AI
    image_url = product.get("image_url")
    if image_url:
        try:
            recognition = await analyze_image_with_gpt(image_url)
            result["image_recognition"] = recognition
            
            # Get tags from recognition
            if recognition.get("tags"):
                result["tags"] = recognition["tags"]
                
        except Exception as e:
            print(f"Image recognition failed: {e}")
    
    # Step 3: Generate improved titles using AI
    api_key = get_llm_key()
    if api_key:
        try:
            # Build context for title generation
            context_parts = [f"Original title: {product.get('title')}"]
            
            if result.get("translated_title"):
                context_parts.append(f"1688 title (translated): {result['translated_title']}")
            
            if result.get("image_recognition", {}).get("category"):
                context_parts.append(f"Product category: {result['image_recognition']['category']}")
            
            if result.get("image_recognition", {}).get("suggested_titles"):
                context_parts.append(f"Image-based suggestions: {', '.join(result['image_recognition']['suggested_titles'][:2])}")
            
            if scraped_data and scraped_data.get("attributes"):
                attrs = [f"{a['name']}: {a['value']}" for a in scraped_data["attributes"][:5]]
                context_parts.append(f"Product attributes: {', '.join(attrs)}")
            
            prompt = f"""Improve this e-commerce product title for international buyers.

{chr(10).join(context_parts)}

Requirements:
- Keep the title concise (under 80 characters)
- Include key product features
- Make it SEO-friendly
- Target language: {target_language}
- Keep brand names if present

Provide 3 different title variations as a JSON array:
{{"titles": ["title1", "title2", "title3"], "selling_points": ["point1", "point2", "point3"], "seo_title": "SEO optimized title under 60 chars"}}

Return ONLY the JSON."""

            chat = LlmChat(
                api_key=api_key,
                session_id=f"enhance-{datetime.now().timestamp()}"
            ).with_model("openai", "gpt-4o-mini")
            
            response = await chat.send_message(UserMessage(text=prompt))
            
            # Parse response
            response_text = response.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            ai_result = json.loads(response_text.strip())
            
            result["suggested_titles"] = ai_result.get("titles", [product.get("title")])
            result["selling_points"] = ai_result.get("selling_points", [])
            result["seo_title"] = ai_result.get("seo_title", "")
            
        except Exception as e:
            print(f"AI title generation failed: {e}")
            # Fallback to image recognition titles
            if result.get("image_recognition", {}).get("suggested_titles"):
                result["suggested_titles"] = result["image_recognition"]["suggested_titles"]
            else:
                result["suggested_titles"] = [product.get("title")]
    
    # Ensure we have at least the original title
    if not result["suggested_titles"]:
        result["suggested_titles"] = [product.get("title")]
    
    # Save to history
    await db.ai_product_history.insert_one({
        "source": "catalog_enhancement",
        "shopify_product_id": shopify_product_id,
        "store_name": store_name,
        "result": result,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return result


@router.post("/save-enhancement")
async def save_product_enhancement(
    shopify_product_id: str = Body(...),
    store_name: str = Body(...),
    title: str = Body(...),
    description: str = Body(None),
    tags: List[str] = Body([]),
    selling_points: List[str] = Body([]),
):
    """
    Save AI-enhanced content back to Shopify product.
    """
    db = get_db()
    
    # Get store credentials
    store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
    if not store or not store.get("shopify_domain") or not store.get("shopify_token"):
        raise HTTPException(status_code=400, detail="Store not configured")
    
    try:
        import shopify
        session = shopify.Session(store['shopify_domain'], '2024-01', store['shopify_token'])
        shopify.ShopifyResource.activate_session(session)
        
        try:
            # Get product
            product = shopify.Product.find(int(shopify_product_id))
            if not product:
                raise HTTPException(status_code=404, detail="Product not found in Shopify")
            
            # Update title
            product.title = title
            
            # Update description (body_html)
            if description:
                # Format selling points as HTML list
                if selling_points:
                    points_html = "<ul>" + "".join([f"<li>{p}</li>" for p in selling_points]) + "</ul>"
                    product.body_html = f"{description}\n\n<h3>Key Features</h3>\n{points_html}"
                else:
                    product.body_html = description
            
            # Update tags
            if tags:
                existing_tags = product.tags.split(", ") if product.tags else []
                all_tags = list(set(existing_tags + tags))
                product.tags = ", ".join(all_tags[:20])  # Shopify tag limit
            
            # Save to Shopify
            if product.save():
                # Update local DB
                await db.shopify_products.update_one(
                    {"shopify_product_id": str(shopify_product_id), "store_name": store_name},
                    {
                        "$set": {
                            "title": title,
                            "description": description,
                            "tags": tags,
                            "ai_enhanced": True,
                            "ai_enhanced_at": datetime.now(timezone.utc).isoformat(),
                        }
                    }
                )
                
                return {
                    "success": True,
                    "message": "Product updated successfully",
                    "product_id": shopify_product_id,
                }
            else:
                errors = product.errors.full_messages() if product.errors else ["Unknown error"]
                raise HTTPException(status_code=400, detail=f"Shopify error: {errors}")
                
        finally:
            shopify.ShopifyResource.clear_session()
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
