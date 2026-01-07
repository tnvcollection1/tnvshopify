"""
Competitor Price Analysis Routes
Endpoints for product image analysis and competitor price discovery
Includes fallback to title-based search when image search yields no results
Includes currency detection and conversion for accurate price comparisons
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
# Import Web Search service for title-based fallback
from services.web_search_service import web_search_service
# Import Currency service for price conversion
from services.currency_service import currency_service


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


# Price extraction patterns for common currencies with currency detection
PRICE_PATTERNS_WITH_CURRENCY = [
    (r'₹\s*([\d,]+(?:\.\d{2})?)', 'INR'),  # Indian Rupee
    (r'Rs\.?\s*([\d,]+(?:\.\d{2})?)', 'INR'),  # Rs format
    (r'\$\s*([\d,]+(?:\.\d{2})?)', 'USD'),  # USD
    (r'€\s*([\d,]+(?:\.\d{2})?)', 'EUR'),  # Euro
    (r'£\s*([\d,]+(?:\.\d{2})?)', 'GBP'),  # GBP
    (r'¥\s*([\d,]+(?:\.\d{2})?)', 'CNY'),  # Chinese Yuan / Japanese Yen
    (r'([\d,]+(?:\.\d{2})?)\s*INR', 'INR'),  # Currency suffix
    (r'([\d,]+(?:\.\d{2})?)\s*USD', 'USD'),
    (r'([\d,]+(?:\.\d{2})?)\s*EUR', 'EUR'),
    (r'([\d,]+(?:\.\d{2})?)\s*GBP', 'GBP'),
]

# Legacy patterns (without currency, for backwards compatibility)
PRICE_PATTERNS = [p[0] for p in PRICE_PATTERNS_WITH_CURRENCY]


def extract_domain(url: str) -> str:
    """Extract domain from URL"""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.replace('www.', '')
        return domain
    except Exception:
        return url


async def extract_prices_from_url(url: str, base_currency: str = "INR") -> Dict[str, Any]:
    """
    Scrape a competitor page and extract prices with currency conversion.
    
    Args:
        url: Competitor page URL
        base_currency: Target currency for conversion (default: INR)
    
    Returns:
        Dictionary with extracted prices, currencies, and metadata
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
            
            # Detect currency from URL domain
            detected_currency = currency_service.detect_currency("", url)
            
            # Find all prices using patterns with currency detection
            all_prices = []
            original_prices = []
            
            for pattern, currency in PRICE_PATTERNS_WITH_CURRENCY:
                matches = re.findall(pattern, text_content)
                for match in matches:
                    try:
                        # Clean and convert price
                        price_str = match.replace(',', '')
                        price = float(price_str)
                        
                        # Filter reasonable prices based on currency
                        if currency in ['USD', 'EUR', 'GBP']:
                            if not (1 <= price <= 10000):
                                continue
                        elif currency == 'CNY':
                            if not (1 <= price <= 100000):
                                continue
                        else:  # INR and others
                            if not (10 <= price <= 1000000):
                                continue
                        
                        # Store original price with currency
                        original_prices.append({
                            'price': price,
                            'currency': currency
                        })
                        
                        # Convert to base currency
                        if currency != base_currency:
                            converted, rate = await currency_service.convert_price(
                                price, currency, base_currency
                            )
                            all_prices.append(converted)
                        else:
                            all_prices.append(price)
                            
                    except ValueError:
                        continue
            
            # If no prices found with currency patterns, use domain-based detection
            if not all_prices:
                for pattern in PRICE_PATTERNS:
                    matches = re.findall(pattern, text_content)
                    for match in matches:
                        try:
                            price_str = match.replace(',', '')
                            price = float(price_str)
                            if 10 <= price <= 1000000:
                                # Convert using domain-detected currency
                                if detected_currency != base_currency:
                                    converted, rate = await currency_service.convert_price(
                                        price, detected_currency, base_currency
                                    )
                                    all_prices.append(converted)
                                    original_prices.append({
                                        'price': price,
                                        'currency': detected_currency
                                    })
                                else:
                                    all_prices.append(price)
                                    original_prices.append({
                                        'price': price,
                                        'currency': base_currency
                                    })
                        except ValueError:
                            continue
            
            # Remove duplicates and sort
            unique_prices = sorted(list(set(all_prices)))
            
            return {
                "url": url,
                "domain": extract_domain(url),
                "title": title,
                "prices": unique_prices[:10],  # Top 10 unique prices (in base currency)
                "prices_converted": True,
                "base_currency": base_currency,
                "detected_currency": detected_currency,
                "original_prices": original_prices[:10],
                "price_count": len(unique_prices),
                "success": True
            }
            
    except Exception as e:
        logger.error(f"Error extracting prices from {url}: {str(e)}")
        return {"url": url, "error": str(e), "prices": [], "success": False}


# Pydantic model for URL-based analysis
class AnalyzeFromURLRequest(BaseModel):
    image_url: str
    product_id: str
    product_name: str
    your_price: float
    category: str = "general"
    store_name: Optional[str] = None


@router.post("/analyze-from-url")
async def analyze_from_url(
    request: AnalyzeFromURLRequest,
    background_tasks: BackgroundTasks = None
):
    """
    Analyze a product using an existing image URL (from Shopify products).
    Uses Google Cloud Vision API for web detection.
    Falls back to title-based search if no image matches found.
    """
    db = get_db()
    
    try:
        search_method = "image_search"
        vision_result = None
        title_result = None
        
        # Step 1: Try Vision API image search first
        vision_result = await vision_api_service.detect_web_entities(image_url=request.image_url)
        
        has_image_results = (
            vision_result.get("success", False) and 
            len(vision_result.get("pages_with_matching_images", [])) > 0
        )
        
        # Step 2: If no image matches, fallback to title-based search
        if not has_image_results:
            logger.info(f"[Competitor] No image matches for '{request.product_name}', trying title search")
            search_method = "title_fallback"
            
            title_result = await web_search_service.search_by_title(
                product_title=request.product_name,
                category=request.category,
                max_results=20
            )
            
            if title_result.get("success") and title_result.get("pages_with_matching_products"):
                # Convert title search results to the same format
                vision_result = {
                    "success": True,
                    "pages_with_matching_images": title_result.get("pages_with_matching_products", []),
                    "web_entities": title_result.get("web_entities", []),
                    "best_guess_labels": title_result.get("best_guess_labels", []),
                    "full_matching_images": [],
                    "partial_matching_images": [],
                    "visually_similar_images": [],
                    "search_method": title_result.get("search_method", "title_search"),
                    "search_query": title_result.get("query", request.product_name)
                }
                logger.info(f"[Competitor] Title search found {len(vision_result['pages_with_matching_images'])} results")
        
        # Handle case where Vision API is not configured
        if not vision_result or (not vision_result.get("success", False) and "error" in vision_result):
            if vision_result and "not configured" in str(vision_result.get("error", "")):
                # Try title search as the primary method if Vision API is not configured
                logger.info("[Competitor] Vision API not configured, using title search")
                search_method = "title_only"
                
                title_result = await web_search_service.search_by_title(
                    product_title=request.product_name,
                    category=request.category,
                    max_results=20
                )
                
                vision_result = {
                    "success": title_result.get("success", False),
                    "pages_with_matching_images": title_result.get("pages_with_matching_products", []),
                    "web_entities": title_result.get("web_entities", []),
                    "best_guess_labels": title_result.get("best_guess_labels", []),
                    "full_matching_images": [],
                    "partial_matching_images": [],
                    "visually_similar_images": [],
                    "search_method": "title_search",
                    "message": "Vision API not configured. Using title-based search."
                }
            elif vision_result:
                raise HTTPException(status_code=500, detail=vision_result.get("error"))
        
        # Create analysis record
        analysis_id = str(uuid.uuid4())[:12]
        competitor_pages = vision_result.get("pages_with_matching_images", [])
        
        analysis_record = {
            "analysis_id": analysis_id,
            "product_id": request.product_id,
            "product_name": request.product_name,
            "your_price": request.your_price,
            "category": request.category,
            "store_name": request.store_name,
            "image_url": request.image_url,
            "search_method": search_method,
            "search_query": vision_result.get("search_query", ""),
            "competitor_pages": competitor_pages,
            "full_matches": vision_result.get("full_matching_images", []),
            "partial_matches": vision_result.get("partial_matching_images", []),
            "similar_images": vision_result.get("visually_similar_images", []),
            "web_entities": vision_result.get("web_entities", []),
            "best_guess_labels": vision_result.get("best_guess_labels", []),
            "competitor_prices": [],  # Will be populated by background task
            "status": "completed" if len(competitor_pages) > 0 else "no_results",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Save to database
        await db.competitor_analyses.insert_one(analysis_record)
        
        # Start background price extraction if we have competitor pages
        competitor_urls = [p["url"] for p in competitor_pages]
        if competitor_urls and background_tasks:
            background_tasks.add_task(
                extract_competitor_prices,
                analysis_id,
                competitor_urls[:20]  # Limit to 20 URLs
            )
        
        return {
            "success": True,
            "analysis_id": analysis_id,
            "product_name": request.product_name,
            "your_price": request.your_price,
            "search_method": search_method,
            "search_query": vision_result.get("search_query", ""),
            "competitor_count": len(competitor_pages),
            "competitor_pages": competitor_pages[:20],
            "web_entities": vision_result.get("web_entities", [])[:10],
            "best_guess_labels": vision_result.get("best_guess_labels", []),
            "status": analysis_record["status"],
            "message": vision_result.get("message") or (
                f"Found {len(competitor_pages)} competitors via {search_method.replace('_', ' ')}"
            )
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing image URL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
    Falls back to title-based search if no image matches found.
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
        search_method = "image_search"
        
        # Encode image for Vision API
        image_base64 = base64.b64encode(content).decode("utf-8")
        
        # Step 1: Try Vision API image search first
        vision_result = await vision_api_service.detect_web_entities(image_base64=image_base64)
        
        has_image_results = (
            vision_result.get("success", False) and 
            len(vision_result.get("pages_with_matching_images", [])) > 0
        )
        
        # Step 2: If no image matches and we have a product name, try title search
        if not has_image_results and product_name:
            logger.info(f"[Competitor] No image matches for '{product_name}', trying title search")
            search_method = "title_fallback"
            
            title_result = await web_search_service.search_by_title(
                product_title=product_name,
                category=category,
                max_results=20
            )
            
            if title_result.get("success") and title_result.get("pages_with_matching_products"):
                vision_result = {
                    "success": True,
                    "pages_with_matching_images": title_result.get("pages_with_matching_products", []),
                    "web_entities": title_result.get("web_entities", []),
                    "best_guess_labels": title_result.get("best_guess_labels", []),
                    "full_matching_images": [],
                    "partial_matching_images": [],
                    "visually_similar_images": [],
                    "search_method": title_result.get("search_method", "title_search"),
                    "search_query": title_result.get("query", product_name)
                }
                logger.info(f"[Competitor] Title search found {len(vision_result['pages_with_matching_images'])} results")
        
        # Handle Vision API not configured
        if not vision_result.get("success", False) and "error" in vision_result:
            if "not configured" in str(vision_result.get("error", "")):
                search_method = "title_only"
                title_result = await web_search_service.search_by_title(
                    product_title=product_name,
                    category=category,
                    max_results=20
                )
                vision_result = {
                    "success": title_result.get("success", False),
                    "pages_with_matching_images": title_result.get("pages_with_matching_products", []),
                    "web_entities": title_result.get("web_entities", []),
                    "best_guess_labels": title_result.get("best_guess_labels", []),
                    "full_matching_images": [],
                    "partial_matching_images": [],
                    "visually_similar_images": [],
                    "message": "Vision API not configured. Using title-based search."
                }
            else:
                raise HTTPException(status_code=500, detail=vision_result.get("error"))
        
        # Create analysis record
        analysis_id = str(uuid.uuid4())[:12]
        competitor_pages = vision_result.get("pages_with_matching_images", [])
        
        analysis_record = {
            "analysis_id": analysis_id,
            "product_id": product_id,
            "product_name": product_name,
            "your_price": your_price,
            "category": category,
            "search_method": search_method,
            "search_query": vision_result.get("search_query", ""),
            "competitor_pages": competitor_pages,
            "full_matches": vision_result.get("full_matching_images", []),
            "partial_matches": vision_result.get("partial_matching_images", []),
            "similar_images": vision_result.get("visually_similar_images", []),
            "web_entities": vision_result.get("web_entities", []),
            "best_guess_labels": vision_result.get("best_guess_labels", []),
            "competitor_prices": [],  # Will be populated by background task
            "status": "completed" if len(competitor_pages) > 0 else "no_results",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Save to database
        await db.competitor_analyses.insert_one(analysis_record)
        
        # Start background price extraction if we have competitor pages
        competitor_urls = [p["url"] for p in competitor_pages]
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
            "search_method": search_method,
            "competitor_count": len(competitor_pages),
            "competitor_pages": competitor_pages[:20],
            "web_entities": vision_result.get("web_entities", [])[:10],
            "best_guess_labels": vision_result.get("best_guess_labels", []),
            "status": analysis_record["status"],
            "message": vision_result.get("message") or (
                f"Found {len(competitor_pages)} competitors via {search_method.replace('_', ' ')}"
            )
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def extract_competitor_prices(analysis_id: str, urls: List[str], base_currency: str = "INR"):
    """Background task to extract prices from competitor URLs with currency conversion"""
    db = get_db()
    
    try:
        prices_data = []
        
        for url in urls:
            result = await extract_prices_from_url(url, base_currency)
            if result.get("success") and result.get("prices"):
                prices_data.append({
                    "url": url,
                    "domain": result.get("domain"),
                    "title": result.get("title"),
                    "prices": result.get("prices"),  # Prices in base_currency
                    "min_price": min(result["prices"]) if result["prices"] else None,
                    "max_price": max(result["prices"]) if result["prices"] else None,
                    "base_currency": base_currency,
                    "original_currency": result.get("detected_currency", base_currency),
                    "original_prices": result.get("original_prices", []),
                    "prices_converted": result.get("prices_converted", False)
                })
        
        # Update analysis with extracted prices
        await db.competitor_analyses.update_one(
            {"analysis_id": analysis_id},
            {
                "$set": {
                    "competitor_prices": prices_data,
                    "base_currency": base_currency,
                    "price_extraction_complete": True,
                    "price_extraction_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"Extracted prices for analysis {analysis_id}: {len(prices_data)} competitors (base: {base_currency})")
        
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
    base_currency = analysis.get("base_currency", "INR")
    
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
                ),
                "currency": base_currency,
                "prices_converted": any(cp.get("prices_converted") for cp in competitor_prices)
            }
    
    return {"success": True, "analysis": analysis}


@router.get("/currency-rates")
async def get_currency_rates():
    """Get current exchange rates for supported currencies"""
    try:
        rates = {}
        base = currency_service.base_currency
        
        for currency in ['USD', 'EUR', 'GBP', 'CNY', 'AED']:
            rate = await currency_service.get_exchange_rate(currency, base)
            rates[currency] = round(rate, 4)
        
        return {
            "success": True,
            "base_currency": base,
            "rates": rates,
            "note": "Rates show conversion to base currency"
        }
    except Exception as e:
        logger.error(f"Error fetching currency rates: {e}")
        return {
            "success": False,
            "error": str(e)
        }


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
async def extract_prices_endpoint(urls: List[str], base_currency: str = "INR"):
    """
    Manually extract prices from a list of competitor URLs.
    Useful for re-extracting or testing specific URLs.
    Prices are converted to the specified base currency.
    """
    if len(urls) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 URLs per request")
    
    results = []
    for url in urls:
        result = await extract_prices_from_url(url, base_currency)
        results.append(result)
    
    return {
        "success": True,
        "base_currency": base_currency,
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


# Pydantic model for title-based search
class TitleSearchRequest(BaseModel):
    product_name: str
    product_id: Optional[str] = None
    your_price: float = 0
    category: str = "general"
    store_name: Optional[str] = None


@router.post("/search-by-title")
async def search_by_title(
    request: TitleSearchRequest,
    background_tasks: BackgroundTasks = None
):
    """
    Search for competitors using product title only (no image required).
    Useful for products with unique/custom images that won't match via image search.
    """
    db = get_db()
    
    try:
        # Perform title-based search
        title_result = await web_search_service.search_by_title(
            product_title=request.product_name,
            category=request.category,
            max_results=20
        )
        
        competitor_pages = title_result.get("pages_with_matching_products", [])
        
        # Create analysis record
        analysis_id = str(uuid.uuid4())[:12]
        analysis_record = {
            "analysis_id": analysis_id,
            "product_id": request.product_id or f"title_{analysis_id}",
            "product_name": request.product_name,
            "your_price": request.your_price,
            "category": request.category,
            "store_name": request.store_name,
            "image_url": None,
            "search_method": "title_search",
            "search_query": title_result.get("query", request.product_name),
            "competitor_pages": competitor_pages,
            "full_matches": [],
            "partial_matches": [],
            "similar_images": [],
            "web_entities": title_result.get("web_entities", []),
            "best_guess_labels": title_result.get("best_guess_labels", []),
            "competitor_prices": [],
            "status": "completed" if len(competitor_pages) > 0 else "no_results",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Save to database
        await db.competitor_analyses.insert_one(analysis_record)
        
        # Start background price extraction if we have competitor pages
        competitor_urls = [p["url"] for p in competitor_pages]
        if competitor_urls and background_tasks:
            background_tasks.add_task(
                extract_competitor_prices,
                analysis_id,
                competitor_urls[:20]
            )
        
        return {
            "success": True,
            "analysis_id": analysis_id,
            "product_name": request.product_name,
            "your_price": request.your_price,
            "search_method": "title_search",
            "search_query": title_result.get("query", request.product_name),
            "competitor_count": len(competitor_pages),
            "competitor_pages": competitor_pages[:20],
            "web_entities": title_result.get("web_entities", [])[:10],
            "best_guess_labels": title_result.get("best_guess_labels", []),
            "status": analysis_record["status"],
            "message": f"Found {len(competitor_pages)} competitors via title search"
        }
        
    except Exception as e:
        logger.error(f"Error in title search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

