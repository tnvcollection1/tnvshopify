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
    
    system_message = f"""You are an expert translator specializing in e-commerce product content.
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
