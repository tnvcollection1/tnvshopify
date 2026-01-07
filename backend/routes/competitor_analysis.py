"""
Competitor Price Analysis Routes
Endpoints for product image analysis and competitor price discovery
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging
import uuid
import os
import base64
import re
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/competitor", tags=["Competitor Analysis"])

# Database reference
_db = None

def set_database(db):
    global _db
    _db = db

def get_db():
    if _db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return _db


# Import Vision API service
from services.vision_api_service import vision_api_service


# Pydantic Models
class CompetitorAnalysis(BaseModel):
    product_id: str
    product_name: str
    your_price: float
    category: Optional[str] = "general"


class PriceExtractionResult(BaseModel):
    url: str
    domain: str
    extracted_prices: List[float]
    currency: str = "INR"
    title: Optional[str] = None


# Price extraction patterns for common currencies
PRICE_PATTERNS = [
    r'₹\s*([\d,]+(?:\.\d{2})?)',  # Indian Rupee
    r'Rs\.?\s*([\d,]+(?:\.\d{2})?)',  # Rs format
    r'\$\s*([\d,]+(?:\.\d{2})?)',  # USD
    r'€\s*([\d,]+(?:\.\d{2})?)',  # Euro
    r'£\s*([\d,]+(?:\.\d{2})?)',  # GBP
    r'([\d,]+(?:\.\d{2})?)\s*(?:INR|USD|EUR|GBP)',  # Currency suffix
]


def extract_domain(url: str) -> str:
    """Extract domain from URL"""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.replace('www.', '')
        return domain
    except Exception:
        return url


async def extract_prices_from_url(url: str) -> Dict[str, Any]:
    """
    Scrape a competitor page and extract prices.
    
    Args:
        url: Competitor page URL
    
    Returns:
        Dictionary with extracted prices and metadata
    """
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = await client.get(url, headers=headers)
            
            if response.status_code != 200:
                return {"url": url, "error": f"HTTP {response.status_code}", "prices": []}
            
            html = response.text
            soup = BeautifulSoup(html, 'html.parser')
            
            # Get page title
            title = soup.title.string if soup.title else None
            
            # Extract text content
            text_content = soup.get_text()
            
            # Find all prices using patterns
            all_prices = []
            for pattern in PRICE_PATTERNS:
                matches = re.findall(pattern, text_content)
                for match in matches:
                    try:
                        # Clean and convert price
                        price_str = match.replace(',', '')
                        price = float(price_str)
                        # Filter reasonable prices (₹10 to ₹10,00,000)
                        if 10 <= price <= 1000000:
                            all_prices.append(price)
                    except ValueError:
                        continue
            
            # Remove duplicates and sort
            unique_prices = sorted(list(set(all_prices)))
            
            return {
                "url": url,
                "domain": extract_domain(url),
                "title": title,
                "prices": unique_prices[:10],  # Top 10 unique prices
                "price_count": len(unique_prices),
                "success": True
            }
            
    except Exception as e:
        logger.error(f"Error extracting prices from {url}: {str(e)}")
        return {"url": url, "error": str(e), "prices": [], "success": False}


@router.post("/analyze-image")
async def analyze_competitor_image(
    file: UploadFile = File(...),
    product_id: str = Form(...),
    product_name: str = Form(...),
    your_price: float = Form(...),
    category: str = Form("general"),
    background_tasks: BackgroundTasks = None
):
    """
    Upload a product image to find competitors selling similar products.
    Uses Google Cloud Vision API for web detection.
    """
    db = get_db()
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Check file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")
    
    try:
        # Encode image for Vision API
        image_base64 = base64.b64encode(content).decode("utf-8")
        
        # Call Vision API
        vision_result = await vision_api_service.detect_web_entities(image_base64=image_base64)
        
        if not vision_result.get("success", False) and "error" in vision_result:
            # If Vision API not configured, return mock data for testing
            if "not configured" in str(vision_result.get("error", "")):
                vision_result = {
                    "success": True,
                    "pages_with_matching_images": [],
                    "web_entities": [],
                    "best_guess_labels": [],
                    "full_matching_images": [],
                    "partial_matching_images": [],
                    "visually_similar_images": [],
                    "message": "Vision API not configured. Add GOOGLE_VISION_API_KEY to enable."
                }
            else:
                raise HTTPException(status_code=500, detail=vision_result.get("error"))
        
        # Create analysis record
        analysis_id = str(uuid.uuid4())[:12]
        analysis_record = {
            "analysis_id": analysis_id,
            "product_id": product_id,
            "product_name": product_name,
            "your_price": your_price,
            "category": category,
            "competitor_pages": vision_result.get("pages_with_matching_images", []),
            "full_matches": vision_result.get("full_matching_images", []),
            "partial_matches": vision_result.get("partial_matching_images", []),
            "similar_images": vision_result.get("visually_similar_images", []),
            "web_entities": vision_result.get("web_entities", []),
            "best_guess_labels": vision_result.get("best_guess_labels", []),
            "competitor_prices": [],  # Will be populated by background task
            "status": "completed" if not vision_result.get("message") else "limited",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Save to database
        await db.competitor_analyses.insert_one(analysis_record)
        
        # Start background price extraction if we have competitor pages
        competitor_urls = [p["url"] for p in vision_result.get("pages_with_matching_images", [])]
        if competitor_urls and background_tasks:
            background_tasks.add_task(
                extract_competitor_prices,
                analysis_id,
                competitor_urls[:20]  # Limit to 20 URLs
            )
        
        return {
            "success": True,
            "analysis_id": analysis_id,
            "product_name": product_name,
            "your_price": your_price,
            "competitor_count": len(vision_result.get("pages_with_matching_images", [])),
            "competitor_pages": vision_result.get("pages_with_matching_images", [])[:20],
            "web_entities": vision_result.get("web_entities", [])[:10],
            "best_guess_labels": vision_result.get("best_guess_labels", []),
            "status": analysis_record["status"],
            "message": vision_result.get("message")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def extract_competitor_prices(analysis_id: str, urls: List[str]):
    """Background task to extract prices from competitor URLs"""
    db = get_db()
    
    try:
        prices_data = []
        
        for url in urls:
            result = await extract_prices_from_url(url)
            if result.get("success") and result.get("prices"):
                prices_data.append({
                    "url": url,
                    "domain": result.get("domain"),
                    "title": result.get("title"),
                    "prices": result.get("prices"),
                    "min_price": min(result["prices"]) if result["prices"] else None,
                    "max_price": max(result["prices"]) if result["prices"] else None
                })
        
        # Update analysis with extracted prices
        await db.competitor_analyses.update_one(
            {"analysis_id": analysis_id},
            {
                "$set": {
                    "competitor_prices": prices_data,
                    "price_extraction_complete": True,
                    "price_extraction_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"Extracted prices for analysis {analysis_id}: {len(prices_data)} competitors")
        
    except Exception as e:
        logger.error(f"Error extracting prices for {analysis_id}: {str(e)}")


@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get detailed competitor analysis results"""
    db = get_db()
    
    analysis = await db.competitor_analyses.find_one(
        {"analysis_id": analysis_id},
        {"_id": 0}
    )
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Calculate price comparison if we have competitor prices
    your_price = analysis.get("your_price", 0)
    competitor_prices = analysis.get("competitor_prices", [])
    
    if competitor_prices and your_price > 0:
        all_prices = []
        for cp in competitor_prices:
            all_prices.extend(cp.get("prices", []))
        
        if all_prices:
            avg_competitor_price = sum(all_prices) / len(all_prices)
            min_competitor_price = min(all_prices)
            max_competitor_price = max(all_prices)
            
            analysis["price_analysis"] = {
                "your_price": your_price,
                "avg_competitor_price": round(avg_competitor_price, 2),
                "min_competitor_price": min_competitor_price,
                "max_competitor_price": max_competitor_price,
                "price_difference": round(your_price - avg_competitor_price, 2),
                "price_difference_percent": round(((your_price - avg_competitor_price) / avg_competitor_price) * 100, 1) if avg_competitor_price > 0 else 0,
                "recommendation": "competitive" if abs(your_price - avg_competitor_price) / avg_competitor_price < 0.1 else (
                    "consider_lowering" if your_price > avg_competitor_price else "premium_pricing"
                )
            }
    
    return {"success": True, "analysis": analysis}


@router.get("/analyses")
async def get_recent_analyses(
    limit: int = 50,
    category: Optional[str] = None
):
    """Get recent competitor analyses"""
    db = get_db()
    
    query = {}
    if category:
        query["category"] = category
    
    analyses = await db.competitor_analyses.find(query, {"_id": 0}) \
        .sort("created_at", -1) \
        .limit(limit) \
        .to_list(limit)
    
    return {
        "success": True,
        "total": len(analyses),
        "analyses": analyses
    }


@router.post("/extract-prices")
async def extract_prices_endpoint(urls: List[str]):
    """
    Manually extract prices from a list of competitor URLs.
    Useful for re-extracting or testing specific URLs.
    """
    if len(urls) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 URLs per request")
    
    results = []
    for url in urls:
        result = await extract_prices_from_url(url)
        results.append(result)
    
    return {
        "success": True,
        "results": results
    }


@router.get("/dashboard-stats")
async def get_dashboard_stats():
    """Get statistics for the competitor dashboard"""
    db = get_db()
    
    try:
        # Get total analyses
        total_analyses = await db.competitor_analyses.count_documents({})
        
        # Get analyses with price data
        with_prices = await db.competitor_analyses.count_documents({
            "competitor_prices": {"$exists": True, "$ne": []}
        })
        
        # Get recent analyses
        recent = await db.competitor_analyses.find({}, {"_id": 0}) \
            .sort("created_at", -1) \
            .limit(5) \
            .to_list(5)
        
        # Calculate average competitors found
        pipeline = [
            {"$project": {"competitor_count": {"$size": {"$ifNull": ["$competitor_pages", []]}}}},
            {"$group": {"_id": None, "avg": {"$avg": "$competitor_count"}}}
        ]
        avg_result = await db.competitor_analyses.aggregate(pipeline).to_list(1)
        avg_competitors = avg_result[0]["avg"] if avg_result else 0
        
        return {
            "success": True,
            "stats": {
                "total_analyses": total_analyses,
                "analyses_with_prices": with_prices,
                "avg_competitors_found": round(avg_competitors, 1),
                "recent_analyses": recent
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        return {
            "success": True,
            "stats": {
                "total_analyses": 0,
                "analyses_with_prices": 0,
                "avg_competitors_found": 0,
                "recent_analyses": []
            }
        }


@router.delete("/analysis/{analysis_id}")
async def delete_analysis(analysis_id: str):
    """Delete a competitor analysis"""
    db = get_db()
    
    result = await db.competitor_analyses.delete_one({"analysis_id": analysis_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {"success": True, "message": "Analysis deleted"}
