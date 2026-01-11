"""
1688 Product Scraper Service
Scrapes products from 1688 store/collection pages and creates them in Shopify
Includes Chinese to English translation for product data

Note: Much of the logic has been moved to service modules:
- services/translation_service.py - Translation functions
- services/product_linking_service.py - Product linking logic
- services/tmapi_service.py - TMAPI operations and monitoring
- services/image_search_service.py - Image search functionality
- services/product_fetcher_service.py - Product fetching from APIs
- services/scraper_service.py - Web scraping functions
- services/job_manager_service.py - Background job management
"""

import httpx
import re
import json
import asyncio
import os
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Body
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Import from service modules
from services.translation_service import translate_to_english, translate_product
from services.product_linking_service import (
    link_product_to_1688 as _link_product_service,
    get_1688_link as _get_link_service,
    auto_link_from_image as _auto_link_service,
    get_all_product_links as _get_all_links_service,
)
from services.tmapi_service import (
    get_tmapi_usage_stats,
    get_tmapi_usage_summary as _tmapi_summary_service,
    get_import_history as _import_history_service,
    get_import_stats as _import_stats_service,
)
from services.product_fetcher_service import (
    fetch_product_via_tmapi as _fetch_tmapi,
    fetch_taobao_product_via_tmapi as _fetch_taobao_tmapi,
    fetch_product_via_official_api as _fetch_official_api,
    fetch_product_auto,
    detect_product_platform,
    save_product_to_db,
    batch_fetch_products,
    log_tmapi_usage as _log_tmapi_usage,
)
from services.scraper_service import (
    scrape_product_details as _scrape_product,
    scrape_collection_with_playwright as _scrape_collection_playwright,
    scrape_collection_page as _scrape_collection,
    extract_product_ids_from_html,
)
from services.job_manager_service import (
    scrape_jobs,
    import_jobs,
    create_scrape_job,
    create_import_job,
    get_job,
    update_job,
    complete_job,
    add_job_error,
    increment_job_counter,
    run_scrape_job as _run_scrape_job,
    run_batch_import as _run_batch_import,
    run_extension_import as _run_extension_import,
)
from services.shopify_publishing_service import (
    publish_product_to_shopify,
)

load_dotenv()

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client[os.environ.get('DB_NAME', 'shopify_customers_db')]
    return _db

router = APIRouter(prefix="/api/1688-scraper", tags=["1688 Scraper"])

# Translation setup - Now using service module
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Aliases to service functions for backward compatibility
scrape_product_details = _scrape_product
scrape_collection_with_playwright = _scrape_collection_playwright
scrape_collection_page = _scrape_collection
run_scrape_job = _run_scrape_job
run_batch_import = _run_batch_import
run_extension_import = _run_extension_import


class ScrapeRequest(BaseModel):
    url: str = Field(..., description="1688 store or collection URL")
    store_name: Optional[str] = Field(None, description="Shopify store to import to")
    create_in_shopify: bool = Field(False, description="Auto-create products in Shopify")
    max_products: int = Field(50, description="Maximum products to scrape")
    translate: bool = Field(True, description="Translate Chinese to English")


class BatchImportRequest(BaseModel):
    """Request for batch importing products by their IDs"""
    product_ids: List[str] = Field(..., description="List of 1688 product IDs to import")
    store_name: Optional[str] = Field(None, description="Shopify store to import to")
    create_in_shopify: bool = Field(False, description="Auto-create products in Shopify")
    translate: bool = Field(True, description="Translate Chinese to English")


class ExtensionProduct(BaseModel):
    """Product data from browser extension - Full scrape v3"""
    id: str
    title: str = ""
    price: str = ""
    image: str = ""
    url: str = ""
    isCurrentPage: bool = False
    # Full data from v3 extension (no API needed!)
    fullData: Optional[dict] = None


class FullProductData(BaseModel):
    """Complete product data scraped by extension v3"""
    product_id: str
    title: Optional[str] = None
    title_cn: Optional[str] = None
    price: Optional[float] = None
    price_range: Optional[str] = None
    images: List[str] = []
    description: Optional[str] = None
    description_images: List[str] = []
    skus: List[dict] = []
    variants: List[dict] = []
    seller: Optional[dict] = None
    min_order: int = 1
    sold_count: Optional[int] = None
    source: str = "extension_v3"


class ExtensionImportRequest(BaseModel):
    """Request for importing products directly from browser extension with full data"""
    products: List[ExtensionProduct] = Field(..., description="Products scraped by extension")
    translate: bool = Field(True, description="Translate Chinese to English")


class ScrapedProduct(BaseModel):
    product_id: str
    title: str
    price: float
    price_range: Optional[str] = None
    images: List[str] = []
    url: str
    seller_name: Optional[str] = None
    min_order: Optional[int] = None
    variants: List[dict] = []


# Headers for requests
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Referer': 'https://www.1688.com/',
}

# TMAPI Configuration (Third-party 1688 API - like Dianxiaomi uses)
TMAPI_BASE_URL = "http://api.tmapi.top"
TMAPI_TOKEN = os.environ.get("TMAPI_TOKEN", "")

# 1688 API Configuration (Official - limited to products you've ordered from)
import hmac
import hashlib
import time as _time

ALIBABA_APP_KEY = os.environ.get("ALIBABA_1688_APP_KEY", "8585237")
ALIBABA_APP_SECRET = os.environ.get("ALIBABA_1688_APP_SECRET", "Gin6sv4MkP")
ALIBABA_ACCESS_TOKEN = os.environ.get("ALIBABA_1688_ACCESS_TOKEN", "")
ALIBABA_API_URL = "https://gw.open.1688.com/openapi"

# Aliases to service functions for backward compatibility
# These functions are now in services/product_fetcher_service.py
fetch_product_via_api = _fetch_official_api
fetch_product_via_tmapi = _fetch_tmapi
fetch_taobao_product_via_tmapi = _fetch_taobao_tmapi
log_tmapi_usage = _log_tmapi_usage


async def extract_product_ids_from_page(html: str) -> List[str]:
    """Extract product IDs from a 1688 page HTML"""
    product_ids = []
    
    # Pattern 1: offer/ID.html links
    offer_pattern = r'offer/(\d{10,})'
    matches = re.findall(offer_pattern, html)
    product_ids.extend(matches)
    
    # Pattern 2: data-offer-id attributes
    offer_id_pattern = r'data-offer-id=["\'](\d{10,})["\']'
    matches = re.findall(offer_id_pattern, html)
    product_ids.extend(matches)
    
    # Pattern 3: offerId in JSON
    offer_json_pattern = r'"offerId"[:\s]*["\']?(\d{10,})["\']?'
    matches = re.findall(offer_json_pattern, html)
    product_ids.extend(matches)
    
    # Deduplicate while preserving order
    seen = set()
    unique_ids = []
    for pid in product_ids:
        if pid not in seen:
            seen.add(pid)
            unique_ids.append(pid)
    
    return unique_ids


# NOTE: The following functions have been moved to service modules:
# - scrape_product_details -> services/scraper_service.py
# - scrape_collection_with_playwright -> services/scraper_service.py
# - scrape_collection_page -> services/scraper_service.py
# - create_shopify_product -> services/shopify_publishing_service.py (as publish_product_to_shopify)
# - run_scrape_job, run_batch_import, run_extension_import -> services/job_manager_service.py
# - scrape_jobs dict -> services/job_manager_service.py


@router.post("/scrape")
async def start_scrape(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    Start scraping products from a 1688 URL
    Returns a job ID to track progress
    
    This uses Playwright headless browser to reliably scrape 1688 collection pages.
    """
    # Validate URL
    if not request.url or not request.url.strip():
        raise HTTPException(status_code=400, detail="URL is required")
    
    if "1688.com" not in request.url.lower():
        raise HTTPException(status_code=400, detail="URL must be a valid 1688.com URL")
    
    import uuid
    job_id = str(uuid.uuid4())[:8]
    
    scrape_jobs[job_id] = {
        "status": "started",
        "url": request.url,
        "progress": 0,
        "total": 0,
        "products_scraped": 0,
        "products_created": 0,
        "products_translated": 0,
        "errors": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "method": "playwright",
    }
    
    # Start background task
    background_tasks.add_task(
        run_scrape_job,
        job_id,
        request.url,
        request.store_name,
        request.create_in_shopify,
        request.max_products,
        request.translate
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": "Scraping started with Playwright browser" + (" + translation" if request.translate else ""),
    }


# run_scrape_job function moved to services/job_manager_service.py


@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Get status of a scraping job"""
    if job_id not in scrape_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "success": True,
        "job": scrape_jobs[job_id],
    }


# ==================== Merchants Endpoints ====================

@router.get("/merchants")
async def get_merchants(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
):
    """
    Get list of unique merchants from scraped products.
    Groups products by seller_id and returns merchant info with product counts.
    """
    db = get_db()
    
    # Aggregation pipeline to group by seller
    pipeline = [
        # Match search if provided
        {"$match": {"$or": [
            {"seller_name": {"$regex": search or "", "$options": "i"}},
            {"seller_id": {"$regex": str(search) if search else "", "$options": "i"}},
        ]} if search else {}},
        # Group by seller
        {"$group": {
            "_id": {"seller_id": "$seller_id", "seller_name": "$seller_name"},
            "product_count": {"$sum": 1},
            "total_value": {"$sum": "$price"},
            "avg_price": {"$avg": "$price"},
            "platforms": {"$addToSet": "$platform"},
            "first_scraped": {"$min": "$scraped_at"},
            "last_scraped": {"$max": "$scraped_at"},
            "sample_products": {"$push": {
                "product_id": "$product_id",
                "title": "$title",
                "price": "$price",
                "images": {"$slice": ["$images", 1]},
            }},
        }},
        # Sort by product count
        {"$sort": {"product_count": -1}},
        # Paginate
        {"$skip": (page - 1) * limit},
        {"$limit": limit},
        # Reshape output
        {"$project": {
            "_id": 0,
            "seller_id": "$_id.seller_id",
            "seller_name": "$_id.seller_name",
            "product_count": 1,
            "total_value": {"$round": ["$total_value", 2]},
            "avg_price": {"$round": ["$avg_price", 2]},
            "platforms": 1,
            "first_scraped": 1,
            "last_scraped": 1,
            "sample_products": {"$slice": ["$sample_products", 3]},
        }},
    ]
    
    merchants = await db.scraped_products.aggregate(pipeline).to_list(limit)
    
    # Get total count of unique merchants
    count_pipeline = [
        {"$match": {"$or": [
            {"seller_name": {"$regex": search or "", "$options": "i"}},
            {"seller_id": {"$regex": str(search) if search else "", "$options": "i"}},
        ]} if search else {}},
        {"$group": {"_id": {"seller_id": "$seller_id", "seller_name": "$seller_name"}}},
        {"$count": "total"},
    ]
    count_result = await db.scraped_products.aggregate(count_pipeline).to_list(1)
    total = count_result[0]["total"] if count_result else 0
    
    return {
        "success": True,
        "merchants": merchants,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.get("/merchants/{seller_id}/products")
async def get_merchant_products(
    seller_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get all products from a specific merchant"""
    db = get_db()
    
    # Handle "unknown" seller_id (products without seller_id)
    if seller_id == "unknown" or seller_id == "null":
        query = {"$or": [{"seller_id": None}, {"seller_id": {"$exists": False}}]}
    else:
        # Try both string and numeric seller_id
        query = {"$or": [
            {"seller_id": seller_id},
            {"seller_id": int(seller_id) if seller_id.isdigit() else seller_id},
        ]}
    
    skip = (page - 1) * limit
    
    products = await db.scraped_products.find(
        query,
        {"_id": 0}
    ).sort("scraped_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.scraped_products.count_documents(query)
    
    # Get merchant info
    merchant_info = None
    if products:
        merchant_info = {
            "seller_id": products[0].get("seller_id"),
            "seller_name": products[0].get("seller_name"),
        }
    
    return {
        "success": True,
        "merchant": merchant_info,
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.get("/merchants/stats")
async def get_merchants_stats():
    """Get overall merchant statistics"""
    db = get_db()
    
    pipeline = [
        {"$group": {
            "_id": None,
            "total_products": {"$sum": 1},
            "total_value": {"$sum": "$price"},
            "unique_merchants": {"$addToSet": "$seller_id"},
            "platforms": {"$addToSet": "$platform"},
        }},
        {"$project": {
            "_id": 0,
            "total_products": 1,
            "total_value": {"$round": ["$total_value", 2]},
            "unique_merchants": {"$size": "$unique_merchants"},
            "platforms": 1,
        }},
    ]
    
    result = await db.scraped_products.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {
        "total_products": 0,
        "total_value": 0,
        "unique_merchants": 0,
        "platforms": [],
    }
    
    return {
        "success": True,
        "stats": stats,
    }


@router.get("/products")
async def get_scraped_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
):
    """Get list of scraped products"""
    db = get_db()
    
    query = {}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"product_id": {"$regex": search, "$options": "i"}},
        ]
    
    skip = (page - 1) * limit
    
    products = await db.scraped_products.find(
        query,
        {"_id": 0}
    ).sort("scraped_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.scraped_products.count_documents(query)
    
    return {
        "success": True,
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.post("/import-to-shopify/{product_id}")
async def import_product_to_shopify(product_id: str, store_name: str):
    """Import a single scraped product to Shopify"""
    db = get_db()
    
    # Get the scraped product
    product = await db.scraped_products.find_one(
        {"product_id": product_id},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Create in Shopify
    shopify_id = await publish_product_to_shopify(product, store_name)
    
    if shopify_id:
        # Update database
        await db.scraped_products.update_one(
            {"product_id": product_id},
            {"$set": {"shopify_product_id": shopify_id, "imported_to": store_name}}
        )
        
        return {
            "success": True,
            "shopify_product_id": shopify_id,
            "message": f"Product imported to Shopify store {store_name}",
        }
    
    raise HTTPException(status_code=500, detail="Failed to create product in Shopify")


@router.delete("/products/{product_id}")
async def delete_scraped_product(product_id: str):
    """Delete a scraped product"""
    db = get_db()
    
    result = await db.scraped_products.delete_one({"product_id": product_id})
    
    if result.deleted_count > 0:
        return {"success": True, "message": "Product deleted"}
    
    raise HTTPException(status_code=404, detail="Product not found")


# ==================== TMAPI Configuration ====================

class TmapiConfigRequest(BaseModel):
    api_token: str = Field(..., description="TMAPI API token from console.tmapi.io")


@router.post("/tmapi/configure")
async def configure_tmapi(request: TmapiConfigRequest):
    """Configure TMAPI token for accessing 1688 product data"""
    global TMAPI_TOKEN
    
    # Test the token
    test_url = f"{TMAPI_BASE_URL}/1688/item_detail"
    test_params = {
        "apiToken": request.api_token,
        "item_id": "652702302959",  # Test product ID
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(test_url, params=test_params)
            result = response.json()
            
            if result.get("code") == 200 or result.get("data"):
                # Token works! Save it
                TMAPI_TOKEN = request.api_token
                
                # Also save to .env for persistence
                env_path = Path(__file__).parent.parent / '.env'
                with open(env_path, 'a') as f:
                    f.write(f"\nTMAPI_TOKEN={request.api_token}")
                
                return {
                    "success": True,
                    "message": "TMAPI token configured successfully",
                    "test_product": result.get("data", {}).get("item", {}).get("title", "Test successful")
                }
            else:
                return {
                    "success": False,
                    "message": f"Token validation failed: {result.get('message', 'Unknown error')}",
                    "code": result.get("code")
                }
                
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to validate token: {str(e)}"
        }


@router.get("/tmapi/status")
async def get_tmapi_status():
    """Check TMAPI configuration status"""
    return {
        "configured": bool(TMAPI_TOKEN),
        "token_preview": TMAPI_TOKEN[:8] + "..." if TMAPI_TOKEN else None,
        "api_url": TMAPI_BASE_URL,
        "supported_platforms": ["1688", "taobao", "tmall"],
    }


# ==================== TAOBAO SHOP SCRAPING API ====================

class TaobaoShopRequest(BaseModel):
    """Request for Taobao shop scraping"""
    shop_url: str = Field(..., description="Taobao shop URL (home page)")
    page: int = Field(1, description="Page number")
    page_size: int = Field(20, description="Items per page (fixed at 20)")


@router.post("/taobao/shop/products")
async def get_taobao_shop_products(request: TaobaoShopRequest):
    """
    Get products from a Taobao shop using TMAPI.
    
    Note: This API may have limitations. Check TMAPI docs for latest status.
    
    API Reference: http://api.tmapi.top/taobao/shop/items/v4
    
    Example shop_url: https://shop123456.taobao.com or https://abc.taobao.com
    """
    if not TMAPI_TOKEN:
        raise HTTPException(status_code=400, detail="TMAPI token not configured")
    
    try:
        # Try v4 endpoint first (may be under maintenance)
        url = f"{TMAPI_BASE_URL}/taobao/shop/items/v4"
        params = {
            "apiToken": TMAPI_TOKEN,
            "shop_url": request.shop_url,
            "page": request.page,
            "page_size": request.page_size,
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            result = response.json()
            
            # Check response code
            if result.get("code") == 200:
                data = result.get("data", {})
                
                # Handle case where data might be a string (error message)
                if isinstance(data, str):
                    return {
                        "success": False,
                        "error": data,
                        "message": "API returned string data instead of object",
                    }
                
                items = data.get("items", [])
                
                # Parse products
                products = []
                for item in items:
                    product = {
                        "product_id": str(item.get("item_id", "")),
                        "title": item.get("title", ""),
                        "price": item.get("price") or item.get("sale_price"),
                        "image": item.get("main_img"),
                        "url": item.get("url"),
                        "sales_count": item.get("sales_count"),
                        "platform": "taobao",
                    }
                    products.append(product)
                
                return {
                    "success": True,
                    "shop_id": data.get("shop_id"),
                    "seller_id": data.get("seller_id"),
                    "total": data.get("total", len(products)),
                    "page": data.get("page", request.page),
                    "page_size": data.get("page_size", request.page_size),
                    "products": products,
                    "api_version": "v4",
                }
            
            elif result.get("code") == 417:
                # API under maintenance - try alternative endpoint
                return {
                    "success": False,
                    "error": "Taobao shop API is under maintenance",
                    "message": "Please use item_detail API for individual products instead",
                    "code": 417,
                    "alternative": "Use /api/1688-scraper/taobao/product/{product_id} for individual products",
                }
            
            else:
                return {
                    "success": False,
                    "error": result.get("msg", "Unknown error"),
                    "code": result.get("code"),
                }
                
    except Exception as e:
        print(f"[Taobao Shop] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
        }


@router.get("/taobao/product/{product_id}")
async def get_taobao_product(product_id: str):
    """
    Get a single Taobao/Tmall product by ID using TMAPI.
    This is more reliable than the shop scraping API.
    
    product_id: The item ID from a Taobao/Tmall URL (e.g., from item.taobao.com/item.htm?id=XXXXX)
    """
    if not TMAPI_TOKEN:
        raise HTTPException(status_code=400, detail="TMAPI token not configured")
    
    db = get_db()
    
    try:
        # Log TMAPI call
        await db.tmapi_logs.insert_one({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "endpoint": "taobao/item_detail",
            "product_id": product_id,
            "cost": 50,  # Approximate cost
        })
        
        product = await fetch_taobao_product_via_tmapi(product_id)
        
        if product:
            # Save to scraped_products for history
            product["scraped_at"] = datetime.now(timezone.utc).isoformat()
            product["source_url"] = f"https://item.taobao.com/item.htm?id={product_id}"
            
            await db.scraped_products.update_one(
                {"product_id": product_id},
                {"$set": product},
                upsert=True
            )
            
            return {
                "success": True,
                "product": product,
                "platform": product.get("platform", "taobao"),
            }
        else:
            return {
                "success": False,
                "error": "Product not found or API error",
                "product_id": product_id,
            }
            
    except Exception as e:
        print(f"[Taobao Product] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
        }


@router.post("/taobao/batch-import")
async def batch_import_taobao_products(
    product_ids: List[str] = Body(..., description="List of Taobao product IDs"),
    translate: bool = Body(True, description="Translate to English"),
    background_tasks: BackgroundTasks = None,
):
    """
    Batch import multiple Taobao/Tmall products.
    Products are processed in background.
    """
    import uuid
    
    if not product_ids:
        raise HTTPException(status_code=400, detail="No product IDs provided")
    
    # Clean product IDs (extract from URLs if needed)
    clean_ids = []
    for pid in product_ids:
        pid = pid.strip()
        if not pid:
            continue
        # Extract from URL if needed
        match = re.search(r'[?&]id=(\d+)', pid)
        if match:
            clean_ids.append(match.group(1))
        elif pid.isdigit():
            clean_ids.append(pid)
    
    if not clean_ids:
        raise HTTPException(status_code=400, detail="No valid product IDs found")
    
    job_id = str(uuid.uuid4())[:8]
    
    scrape_jobs[job_id] = {
        "status": "started",
        "url": "taobao_batch_import",
        "progress": 0,
        "total": len(clean_ids),
        "products_scraped": 0,
        "errors": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "platform": "taobao",
    }
    
    # Run in background
    if background_tasks:
        background_tasks.add_task(
            _run_batch_import,
            job_id,
            clean_ids,
            translate
        )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": f"Importing {len(clean_ids)} Taobao products",
        "product_ids": clean_ids,
    }


# run_taobao_batch_import function moved to services/job_manager_service.py


# ==================== IMAGE SEARCH API ====================

class ImageSearchRequest(BaseModel):
    """Request for image search"""
    image_url: str = Field(..., description="URL of the image to search with")
    page: int = Field(1, description="Page number")
    page_size: int = Field(20, description="Items per page (max 20)")
    sort: str = Field("default", description="Sort: default, sales, price_up, price_down")
    price_start: Optional[str] = Field(None, description="Minimum price filter")
    price_end: Optional[str] = Field(None, description="Maximum price filter")


@router.post("/image-search")
async def search_by_image(request: ImageSearchRequest):
    """
    Search for 1688 products using an image URL.
    
    Steps:
    1. If image is not from Alibaba, convert it first using /image-convert endpoint
    2. Search for matching products
    3. Returns list of similar products with prices, sales, etc.
    """
    if not TMAPI_TOKEN:
        raise HTTPException(status_code=400, detail="TMAPI token not configured")
    
    try:
        # Step 1: Convert image URL if not from Alibaba
        img_url = request.image_url
        if not any(domain in img_url.lower() for domain in ['alicdn.com', '1688.com', 'taobao.com', 'tmall.com']):
            # Convert the image URL first
            convert_url = f"{TMAPI_BASE_URL}/1688/img_url_transfer"
            convert_params = {
                "apiToken": TMAPI_TOKEN,
                "url": img_url,
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                convert_response = await client.get(convert_url, params=convert_params)
                convert_result = convert_response.json()
                
                if convert_result.get("code") == 200 and convert_result.get("data", {}).get("img_url"):
                    img_url = convert_result["data"]["img_url"]
                    print(f"[Image Search] Converted image URL: {img_url[:50]}...")
                else:
                    # Try using original URL anyway
                    print("[Image Search] Could not convert image, trying original URL")
        
        # Step 2: Search by image - using correct TMAPI endpoint
        search_url = f"{TMAPI_BASE_URL}/1688/search/image"
        search_params = {
            "apiToken": TMAPI_TOKEN,
            "img_url": img_url,
            "page": request.page,
            "page_size": min(request.page_size, 20),
            "sort": request.sort,
        }
        
        if request.price_start:
            search_params["price_start"] = request.price_start
        if request.price_end:
            search_params["price_end"] = request.price_end
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(search_url, params=search_params)
            result = response.json()
            
            if result.get("code") != 200:
                return {
                    "success": False,
                    "error": result.get("msg", "Image search failed"),
                    "code": result.get("code"),
                }
            
            data = result.get("data", {})
            items = data.get("items", [])
            
            # Parse results with full product info
            products = []
            for item in items:
                product_id = str(item.get("item_id") or item.get("num_iid") or "")
                shop_info = item.get("shop_info", {})
                price_info = item.get("price_info", {})
                sale_info = item.get("sale_info", {})
                
                products.append({
                    "product_id": product_id,
                    "title": item.get("title"),
                    "price": item.get("price") or price_info.get("origin_price"),
                    "wholesale_price": price_info.get("wholesale_price"),
                    "dropship_price": price_info.get("drop_ship_price"),
                    "sales": sale_info.get("sale_quantity") or item.get("sales") or 0,
                    "orders": sale_info.get("orders_count") or 0,
                    "image": item.get("img") or item.get("pic_url"),
                    "shop_name": shop_info.get("company_name") or shop_info.get("login_id") or item.get("shop_name"),
                    "shop_url": shop_info.get("shop_url"),
                    "is_factory": shop_info.get("is_factory", False),
                    "location": shop_info.get("location", []),
                    "url": item.get("product_url") or f"https://detail.1688.com/offer/{product_id}.html",
                    "min_order": item.get("quantity_begin") or 1,
                })
            
            return {
                "success": True,
                "total": data.get("total_count") or len(products),
                "page": data.get("page") or request.page,
                "page_size": data.get("page_size") or request.page_size,
                "products": products,
                "converted_image": img_url if img_url != request.image_url else None,
            }
            
    except Exception as e:
        print(f"[Image Search] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
        }


@router.post("/image-convert")
async def convert_image_url(image_url: str = Query(..., description="Image URL to convert")):
    """
    Convert a non-Alibaba image URL to an Alibaba-compatible URL.
    Required before using image search with external images.
    The converted URL is valid for 24 hours.
    """
    if not TMAPI_TOKEN:
        raise HTTPException(status_code=400, detail="TMAPI token not configured")
    
    try:
        url = f"{TMAPI_BASE_URL}/1688/img_url_transfer"
        params = {
            "apiToken": TMAPI_TOKEN,
            "url": image_url,
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            result = response.json()
            
            if result.get("code") == 200 and result.get("data", {}).get("img_url"):
                return {
                    "success": True,
                    "original_url": image_url,
                    "converted_url": result["data"]["img_url"],
                    "valid_for": "24 hours",
                }
            else:
                return {
                    "success": False,
                    "error": result.get("msg", "Failed to convert image URL"),
                    "code": result.get("code"),
                }
                
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@router.post("/link-product-by-image")
async def link_product_by_image(
    order_item_index: int = Query(..., description="Index of the order item to link"),
    customer_id: str = Query(..., description="Customer/Order ID"),
    image_url: str = Query(..., description="Image URL to search with"),
    store_name: str = Query("tnvcollection", description="Store name"),
):
    """
    Search for a product by image and link the best match to an order item.
    
    This combines:
    1. Image search to find matching 1688 products
    2. Auto-linking the best match to the order
    """
    if not TMAPI_TOKEN:
        raise HTTPException(status_code=400, detail="TMAPI token not configured")
    
    db = get_db()
    
    try:
        # Step 1: Search by image
        search_request = ImageSearchRequest(image_url=image_url, page_size=5)
        search_result = await search_by_image(search_request)
        
        if not search_result.get("success") or not search_result.get("products"):
            return {
                "success": False,
                "error": "No matching products found",
                "search_result": search_result,
            }
        
        # Step 2: Get the best match (first result)
        best_match = search_result["products"][0]
        product_id = best_match["product_id"]
        
        # Step 3: Get full product details with SKUs
        product = await fetch_product_via_tmapi(str(product_id))
        
        # Step 4: Update the order with the linked product
        update_result = await db.customers.update_one(
            {"customer_id": customer_id, "store_name": store_name},
            {
                "$set": {
                    f"line_items.{order_item_index}.linked_1688_product_id": str(product_id),
                    f"line_items.{order_item_index}.linked_1688_url": best_match["url"],
                    f"line_items.{order_item_index}.linked_1688_title": best_match["title"],
                    f"line_items.{order_item_index}.linked_1688_price": best_match.get("price"),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            }
        )
        
        return {
            "success": True,
            "linked_product": {
                "product_id": product_id,
                "title": best_match["title"],
                "price": best_match.get("price"),
                "image": best_match.get("image"),
                "url": best_match["url"],
            },
            "product_details": product,
            "all_matches": search_result["products"][:5],
            "message": f"Linked product {product_id} to order item",
        }
        
    except Exception as e:
        print(f"[Link by Image] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
        }


@router.post("/batch-import")
async def batch_import_products(request: BatchImportRequest, background_tasks: BackgroundTasks):
    """
    Import multiple products by their product IDs.
    Supports: 1688, Taobao, and Tmall products.
    
    Accepts product IDs or full product URLs (will extract ID).
    
    Examples:
    - 1688: "739758517850" or "https://detail.1688.com/offer/739758517850.html"
    - Taobao: "649752139926" or "https://item.taobao.com/item.htm?id=649752139926"
    - Tmall: "https://detail.tmall.com/item.htm?id=649752139926"
    """
    import uuid
    db = get_db()
    
    # Extract product IDs from URLs if needed
    product_ids = []
    for item in request.product_ids:
        item = item.strip()
        if not item:
            continue
        
        # Keep the full URL/ID for platform detection later
        # Extract ID from 1688 URL
        id_match = re.search(r'offer/(\d{10,})', item)
        if id_match:
            product_ids.append(item)  # Keep original to detect platform
        # Extract ID from Taobao/Tmall URL
        elif 'id=' in item:
            product_ids.append(item)  # Keep original to detect platform
        elif item.isdigit() and len(item) >= 10:
            product_ids.append(item)
    
    if not product_ids:
        raise HTTPException(status_code=400, detail="No valid product IDs found")
    
    job_id = str(uuid.uuid4())[:8]
    
    scrape_jobs[job_id] = {
        "status": "started",
        "url": "batch_import",
        "progress": 0,
        "total": len(product_ids),
        "products_scraped": 0,
        "products_created": 0,
        "errors": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Run import in background
    background_tasks.add_task(
        run_batch_import,
        job_id,
        product_ids,
        request.store_name,
        request.create_in_shopify,
        request.translate
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": f"Importing {len(product_ids)} products" + (" with translation" if request.translate else ""),
        "product_ids": product_ids,
    }


# run_batch_import function moved to services/job_manager_service.py


@router.post("/extension-import")
async def extension_import_products(request: ExtensionImportRequest, background_tasks: BackgroundTasks):
    """
    Import products directly from browser extension with full scraped data.
    This bypasses the server-side scraping limitation since the extension 
    already extracted the data from the user's browser session.
    """
    import uuid
    db = get_db()
    
    if not request.products:
        raise HTTPException(status_code=400, detail="No products provided")
    
    job_id = str(uuid.uuid4())[:8]
    
    scrape_jobs[job_id] = {
        "status": "started",
        "url": "extension_import",
        "progress": 0,
        "total": len(request.products),
        "products_scraped": 0,
        "products_created": 0,
        "errors": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Run import in background
    background_tasks.add_task(
        run_extension_import,
        job_id,
        request.products,
        request.translate
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": f"Importing {len(request.products)} products from extension" + (" with translation" if request.translate else ""),
        "product_ids": [p.id for p in request.products],
    }


# parse_variant_props and fetch_product_from_tmapi functions moved to services/product_fetcher_service.py


# parse_global_api_response function moved to services/product_fetcher_service.py


# parse_standard_api_response function moved to services/product_fetcher_service.py


# log_tmapi_usage function moved to services/product_fetcher_service.py


# run_extension_import function moved to services/job_manager_service.py




@router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: dict = Body(...)):
    """Update a scraped product (for editing before Shopify publish)"""
    db = get_db()
    
    try:
        # Remove _id if present to avoid MongoDB errors
        product_data.pop('_id', None)
        product_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        result = await db.scraped_products.update_one(
            {"product_id": product_id},
            {"$set": product_data}
        )
        
        if result.matched_count > 0:
            return {"success": True, "message": "Product updated"}
        else:
            return {"success": False, "error": "Product not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/products/{product_id}")
async def get_product(product_id: str):
    """Get a single product by ID"""
    db = get_db()
    
    try:
        product = await db.scraped_products.find_one(
            {"product_id": product_id},
            {"_id": 0}
        )
        
        if product:
            return {"success": True, "product": product}
        else:
            return {"success": False, "error": "Product not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a scraped product"""
    db = get_db()
    
    try:
        result = await db.scraped_products.delete_one({"product_id": product_id})
        
        if result.deleted_count > 0:
            return {"success": True, "message": "Product deleted"}
        else:
            return {"success": False, "error": "Product not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/products/{product_id}/fetch-details")
async def fetch_product_details(product_id: str):
    """
    Fetch full product details including variants/SKUs using TMAPI.
    Updates the product in database with fresh data.
    """
    db = get_db()
    TMAPI_TOKEN = os.environ.get("TMAPI_TOKEN", "")
    
    if not TMAPI_TOKEN:
        return {"success": False, "error": "TMAPI token not configured"}
    
    try:
        # Fetch from TMAPI
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                "http://api.tmapi.top/1688/item_detail",
                params={
                    "apiToken": TMAPI_TOKEN,
                    "item_id": product_id,
                }
            )
            data = response.json()
        
        if data.get("code") != 200:
            return {
                "success": False,
                "error": data.get("msg", data.get("message", "TMAPI request failed")),
            }
        
        item = data.get("data", {})
        
        # Extract images
        images = []
        main_imgs = item.get("main_imgs", []) or item.get("images", [])
        for img in main_imgs[:15]:
            if img:
                if img.startswith("//"):
                    img = "https:" + img
                images.append(img)
        
        # Extract variants with proper parsing
        variants = []
        sku_list = item.get("skus", [])
        for sku in sku_list[:50]:
            props_names = sku.get("props_names", "")
            color = ""
            size = ""
            
            if props_names:
                for part in props_names.split(";"):
                    if ":" in part:
                        key, value = part.split(":", 1)
                        key_lower = key.strip().lower()
                        if '颜色' in key_lower or 'color' in key_lower or '款式' in key_lower:
                            color = value.strip()
                        if '尺码' in key_lower or '尺寸' in key_lower or 'size' in key_lower or '规格' in key_lower:
                            size = value.strip()
            
            price_val = sku.get("sale_price") or sku.get("price") or 0
            if isinstance(price_val, str):
                try:
                    price_val = float(price_val)
                except:
                    price_val = 0
            
            variants.append({
                "sku_id": sku.get("skuid"),
                "spec_id": sku.get("specid"),
                "price": price_val,
                "stock": sku.get("stock", 0),
                "props_names": props_names,
                "color": color,
                "size": size,
            })
        
        # Extract price
        price_info = item.get("price_info", {})
        price = float(price_info.get("price", 0) or price_info.get("price_min", 0) or item.get("price", 0) or 0)
        
        # Build update data
        update_data = {
            "title_cn": item.get("title"),
            "price": price,
            "images": images,
            "variants": variants,
            "description": item.get("desc"),
            "min_order": item.get("mixed_batch", {}).get("mix_num", 1) or 1,
            "sold_count": item.get("sale_count"),
            "seller_name": item.get("shop_info", {}).get("shop_name"),
            "seller_member_id": item.get("shop_info", {}).get("shop_id"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "details_fetched": True,
            "source": "tmapi_enriched",
        }
        
        # Translate title if needed
        if item.get("title") and EMERGENT_LLM_KEY:
            try:
                translated_title = await translate_to_english(item.get("title"), "product title")
                if translated_title:
                    update_data["title"] = translated_title
            except Exception as e:
                print(f"Translation failed: {e}")
        
        # Update database
        result = await db.scraped_products.update_one(
            {"product_id": product_id},
            {"$set": update_data}
        )
        
        # Return updated product
        updated_product = await db.scraped_products.find_one(
            {"product_id": product_id},
            {"_id": 0}
        )
        
        return {
            "success": True,
            "message": f"Fetched {len(images)} images and {len(variants)} variants",
            "product": updated_product,
            "images_count": len(images),
            "variants_count": len(variants),
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}



class PublishToShopifyRequest(BaseModel):
    product_ids: List[str]
    store_name: str
    price_multiplier: float = 2.5  # Default markup
    currency_rate: float = 20.0  # CNY to target currency (e.g., PKR)


@router.post("/shopify/publish-batch")
async def publish_products_to_shopify(request: PublishToShopifyRequest):
    """
    Publish scraped products to Shopify with all variants and images.
    This creates full Shopify products with proper variant structure.
    """
    db = get_db()
    
    # Get store credentials
    store = await db.stores.find_one({"store_name": request.store_name}, {"_id": 0})
    if not store or not store.get("shopify_domain") or not store.get("shopify_token"):
        return {"success": False, "error": f"Shopify not configured for store: {request.store_name}"}
    
    results = {
        "success": True,
        "published": [],
        "failed": [],
        "total": len(request.product_ids),
    }
    
    try:
        import shopify
        
        # Initialize Shopify session
        shop_url = f"https://{store['shopify_domain']}"
        api_version = '2024-01'
        session = shopify.Session(shop_url, api_version, store['shopify_token'])
        shopify.ShopifyResource.activate_session(session)
        
        for product_id in request.product_ids:
            try:
                # Get product from database
                product = await db.scraped_products.find_one(
                    {"product_id": product_id},
                    {"_id": 0}
                )
                
                if not product:
                    results["failed"].append({
                        "product_id": product_id,
                        "error": "Product not found in database"
                    })
                    continue
                
                # Check if already published
                if product.get("shopify_product_id"):
                    results["failed"].append({
                        "product_id": product_id,
                        "error": "Already published to Shopify",
                        "shopify_id": product.get("shopify_product_id")
                    })
                    continue
                
                # Create Shopify product
                new_product = shopify.Product()
                
                # Use English title if available, otherwise Chinese
                title = product.get("title") or product.get("title_en") or product.get("title_cn") or f"Product {product_id}"
                new_product.title = title
                
                # Build description
                description = product.get("description") or ""
                new_product.body_html = f"""
                    <p>{description}</p>
                    <hr>
                    <p><strong>Imported from 1688</strong></p>
                    <p>Original Product ID: {product_id}</p>
                    <p>Original Price: ¥{product.get('price', 0):.2f}</p>
                """
                
                new_product.vendor = product.get("seller_name") or "1688 Supplier"
                new_product.product_type = "Imported from 1688"
                new_product.tags = f"1688-import,1688-{product_id}"
                
                # Add images (max 250 for Shopify)
                images = []
                for img_url in (product.get("images") or [])[:20]:
                    if img_url:
                        # Ensure URL is absolute
                        if img_url.startswith("//"):
                            img_url = "https:" + img_url
                        images.append({"src": img_url})
                new_product.images = images
                
                # Build variants
                variants = product.get("variants") or []
                shopify_variants = []
                
                if variants:
                    # Collect unique option values
                    colors = list(set([v.get("color") for v in variants if v.get("color")]))
                    sizes = list(set([v.get("size") for v in variants if v.get("size")]))
                    
                    # Set product options with position (required by Shopify API)
                    options = []
                    position = 1
                    if colors:
                        options.append({"name": "Color", "position": position})
                        position += 1
                    if sizes:
                        options.append({"name": "Size", "position": position})
                    
                    if options:
                        new_product.options = options
                    
                    # Create variant entries using shopify.Variant objects (required by ShopifyAPI library)
                    for v in variants[:100]:  # Shopify limit is 100 variants
                        cny_price = v.get("price") or product.get("price") or 0
                        target_price = round(cny_price * request.currency_rate * request.price_multiplier, 2)
                        
                        variant_obj = shopify.Variant()
                        variant_obj.price = str(target_price)
                        variant_obj.sku = v.get("spec_id") or v.get("sku_id") or f"1688-{product_id}-{len(shopify_variants)}"
                        variant_obj.inventory_management = "shopify"
                        
                        # Add option values
                        if v.get("color"):
                            variant_obj.option1 = v.get("color")
                        if v.get("size"):
                            variant_obj.option2 = v.get("size")
                        
                        shopify_variants.append(variant_obj)
                    
                    new_product.variants = shopify_variants
                else:
                    # Single variant (no options) - use Variant object
                    cny_price = product.get("price") or 0
                    target_price = round(cny_price * request.currency_rate * request.price_multiplier, 2)
                    
                    single_variant = shopify.Variant()
                    single_variant.price = str(target_price)
                    single_variant.sku = f"1688-{product_id}"
                    single_variant.inventory_management = "shopify"
                    
                    new_product.variants = [single_variant]
                
                # Save to Shopify
                success = new_product.save()
                
                if success:
                    shopify_id = str(new_product.id)
                    
                    # Update database with Shopify ID
                    await db.scraped_products.update_one(
                        {"product_id": product_id},
                        {"$set": {
                            "shopify_product_id": shopify_id,
                            "shopify_store": request.store_name,
                            "published_at": datetime.now(timezone.utc).isoformat(),
                        }}
                    )
                    
                    results["published"].append({
                        "product_id": product_id,
                        "shopify_id": shopify_id,
                        "title": title,
                        "variants_count": len(shopify_variants) if shopify_variants else 1,
                        "images_count": len(images),
                    })
                else:
                    error_msg = "Shopify save failed"
                    if hasattr(new_product, 'errors') and new_product.errors:
                        error_msg = str(new_product.errors.full_messages())
                    results["failed"].append({
                        "product_id": product_id,
                        "error": error_msg
                    })
                
            except Exception as e:
                results["failed"].append({
                    "product_id": product_id,
                    "error": str(e)
                })
        
        shopify.ShopifyResource.clear_session()
        
        results["success"] = len(results["failed"]) == 0
        results["message"] = f"Published {len(results['published'])} products, {len(results['failed'])} failed"
        
        return results
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "published": results["published"],
            "failed": results["failed"],
        }


@router.get("/shopify/stores")
async def get_shopify_stores():
    """Get list of stores with Shopify configured"""
    db = get_db()
    
    stores = await db.stores.find(
        {"shopify_domain": {"$exists": True, "$ne": None}},
        {"_id": 0, "store_name": 1, "shopify_domain": 1}
    ).to_list(100)
    
    return {
        "success": True,
        "stores": stores,
    }



class ProductLinkRequest(BaseModel):
    shopify_product_id: Optional[str] = None
    shopify_sku: Optional[str] = None
    product_1688_id: str


@router.post("/product-links/link-1688")
async def link_product_to_1688_endpoint(request: ProductLinkRequest):
    """
    Link a Shopify product/SKU to a 1688 product.
    This creates a mapping so orders can be automatically fulfilled.
    Uses product_linking_service for the actual linking logic.
    """
    return await _link_product_service(
        shopify_product_id=request.shopify_product_id,
        product_1688_id=request.product_1688_id,
        shopify_sku=request.shopify_sku
    )


@router.get("/product-links/get-1688")
async def get_1688_link_endpoint(
    shopify_sku: Optional[str] = Query(None),
    shopify_product_id: Optional[str] = Query(None)
):
    """
    Get the linked 1688 product for a Shopify SKU or product ID.
    Returns the 1688 product details and URL.
    Uses product_linking_service for the lookup logic.
    """
    return await _get_link_service(shopify_sku=shopify_sku, shopify_product_id=shopify_product_id)


@router.post("/product-links/auto-link-from-image")
async def auto_link_from_image_endpoint(
    shopify_sku: str = Query(...),
    image_url: str = Query(...)
):
    """
    Auto-link a Shopify product to 1688 by searching for similar products using image.
    Returns top matches that user can choose from.
    Uses product_linking_service for the search logic.
    """
    return await _auto_link_service(shopify_sku=shopify_sku, image_url=image_url)


@router.get("/product-links/all")
async def get_all_product_links_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500)
):
    """Get all product links (Shopify -> 1688 mappings)"""
    return await _get_all_links_service(page=page, limit=limit)


@router.post("/products/{product_1688_id}/scrape-variants")
async def scrape_1688_variants(
    product_1688_id: str,
    shopify_product_id: Optional[str] = Body(None, embed=True),
):
    """
    Scrape all variants (colors/sizes) from a 1688 product.
    Returns the variants that can be used to create new Shopify variants.
    """
    db = get_db()
    TMAPI_TOKEN = os.environ.get("TMAPI_TOKEN", "")
    
    if not TMAPI_TOKEN:
        return {"success": False, "error": "TMAPI token not configured"}
    
    try:
        # Fetch from TMAPI
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                "http://api.tmapi.top/1688/item_detail",
                params={
                    "apiToken": TMAPI_TOKEN,
                    "item_id": product_1688_id,
                }
            )
            data = response.json()
        
        if data.get("code") != 200:
            return {
                "success": False,
                "error": data.get("msg", data.get("message", "TMAPI request failed")),
            }
        
        item = data.get("data", {})
        
        # Extract all variants with color and size
        variants = []
        colors = set()
        sizes = set()
        
        sku_list = item.get("skus", [])
        for sku in sku_list:
            props_names = sku.get("props_names", "")
            color = ""
            size = ""
            
            if props_names:
                for part in props_names.split(";"):
                    if ":" in part:
                        key, value = part.split(":", 1)
                        key_lower = key.strip().lower()
                        if '颜色' in key_lower or 'color' in key_lower or '款式' in key_lower:
                            color = value.strip()
                            colors.add(color)
                        if '尺码' in key_lower or '尺寸' in key_lower or 'size' in key_lower or '规格' in key_lower:
                            size = value.strip()
                            sizes.add(size)
            
            price_val = sku.get("sale_price") or sku.get("price") or 0
            try:
                price = float(price_val)
            except:
                price = 0
            
            sku_id = sku.get("sku_id", "")
            stock = sku.get("quantity", 0) or sku.get("stock", 0)
            
            # Get image for this variant
            sku_img = sku.get("sku_img", "")
            if sku_img and sku_img.startswith("//"):
                sku_img = "https:" + sku_img
            
            variants.append({
                "sku_id": sku_id,
                "color": color,
                "size": size,
                "price": price,
                "stock": stock,
                "image": sku_img,
                "props_names": props_names,
            })
        
        # Get product title and main image
        title = item.get("title", "")
        main_image = ""
        main_imgs = item.get("main_imgs", []) or item.get("images", [])
        if main_imgs:
            main_image = main_imgs[0]
            if main_image.startswith("//"):
                main_image = "https:" + main_image
        
        # If shopify_product_id provided, compare with existing variants
        existing_variants = []
        missing_variants = []
        
        if shopify_product_id:
            shopify_product = await db.shopify_products.find_one(
                {"id": int(shopify_product_id) if shopify_product_id.isdigit() else shopify_product_id},
                {"_id": 0, "variants": 1}
            )
            
            if shopify_product and shopify_product.get("variants"):
                for sv in shopify_product["variants"]:
                    existing_variants.append({
                        "color": sv.get("option1", ""),
                        "size": sv.get("option2", ""),
                        "sku": sv.get("sku", ""),
                    })
                
                # Find variants in 1688 that don't exist in Shopify
                existing_combos = set()
                for ev in existing_variants:
                    combo = (ev.get("color", "").lower(), ev.get("size", "").lower())
                    existing_combos.add(combo)
                
                for v in variants:
                    combo = (v.get("color", "").lower(), v.get("size", "").lower())
                    if combo not in existing_combos and (v.get("color") or v.get("size")):
                        missing_variants.append(v)
        
        return {
            "success": True,
            "product_1688_id": product_1688_id,
            "title": title,
            "main_image": main_image,
            "total_variants": len(variants),
            "variants": variants,
            "colors": list(colors),
            "sizes": list(sizes),
            "existing_in_shopify": len(existing_variants),
            "missing_in_shopify": len(missing_variants),
            "missing_variants": missing_variants,
        }
        
    except Exception as e:
        logger.error(f"Error scraping variants: {e}")
        return {"success": False, "error": str(e)}


# ============= TMAPI USAGE MONITORING =============

@router.get("/tmapi/usage")
async def get_tmapi_usage_endpoint(
    days: int = Query(7, ge=1, le=90),
):
    """
    Get TMAPI usage statistics for monitoring credits.
    Uses tmapi_service for the stats logic.
    """
    stats = await get_tmapi_usage_stats(days=days)
    return {"success": True, **stats}


@router.get("/tmapi/usage/summary")
async def get_tmapi_usage_summary_endpoint():
    """Get quick summary of TMAPI usage. Uses tmapi_service."""
    summary = await _tmapi_summary_service()
    return {"success": True, **summary}


# ============= PRODUCT IMPORT HISTORY =============

@router.get("/import-history")
async def get_import_history_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    source: Optional[str] = Query(None),
):
    """
    Get product import history with details.
    Uses tmapi_service for the history lookup.
    """
    result = await _import_history_service(page=page, limit=limit, source=source)
    return {"success": True, **result}


@router.get("/import-history/stats")
async def get_import_stats_endpoint():
    """Get import statistics summary. Uses tmapi_service."""
    result = await _import_stats_service()
    return {"success": True, **result}


class BulkAutoLinkRequest(BaseModel):
    skus: List[str]  # List of Shopify SKUs to auto-link
    use_image_search: bool = False  # Whether to use image search for matching


@router.post("/product-links/bulk-auto-link")
async def bulk_auto_link_products(request: BulkAutoLinkRequest):
    """
    Bulk auto-link multiple Shopify SKUs to 1688 products.
    First tries to extract product ID from SKU, then optionally uses image search.
    """
    db = get_db()
    TMAPI_TOKEN = os.environ.get("TMAPI_TOKEN", "")
    
    results = {
        "success": True,
        "linked": [],
        "not_found": [],
        "errors": [],
        "total": len(request.skus),
    }
    
    for sku in request.skus:
        try:
            # Try to extract 1688 ID from SKU
            import re
            match = re.search(r'(\d{12,})', sku)
            
            if match:
                product_1688_id = match.group(1)
                # Check if product exists in our database
                product = await db.scraped_products.find_one(
                    {"product_id": product_1688_id},
                    {"_id": 0, "product_id": 1, "title": 1, "title_cn": 1, "price": 1, "images": 1, "variants": 1}
                )
                
                if product:
                    # Create link
                    link_data = {
                        "shopify_sku": sku,
                        "product_1688_id": product_1688_id,
                        "product_1688_url": f"https://detail.1688.com/offer/{product_1688_id}.html",
                        "product_1688_title": product.get("title") or product.get("title_cn"),
                        "product_1688_price": product.get("price"),
                        "product_1688_image": (product.get("images") or [None])[0],
                        "variants_count": len(product.get("variants") or []),
                        "linked_at": datetime.now(timezone.utc).isoformat(),
                        "source": "bulk_auto_link",
                    }
                    
                    await db.product_links.update_one(
                        {"shopify_sku": sku},
                        {"$set": link_data},
                        upsert=True
                    )
                    
                    results["linked"].append({
                        "sku": sku,
                        "product_1688_id": product_1688_id,
                        "title": link_data["product_1688_title"],
                    })
                else:
                    results["not_found"].append({
                        "sku": sku,
                        "product_1688_id": product_1688_id,
                        "reason": "Product not in database - needs import"
                    })
            else:
                results["not_found"].append({
                    "sku": sku,
                    "reason": "No 1688 product ID found in SKU"
                })
                
        except Exception as e:
            results["errors"].append({
                "sku": sku,
                "error": str(e)
            })
    
    results["success"] = len(results["errors"]) == 0
    results["message"] = f"Linked {len(results['linked'])} products, {len(results['not_found'])} not found, {len(results['errors'])} errors"
    
    return results


@router.post("/product-links/link-by-title-match")
async def link_by_title_match(
    shopify_sku: str = Query(...),
    shopify_title: str = Query(...)
):
    """
    Try to find a matching 1688 product by searching scraped products with similar titles.
    Uses fuzzy matching to find the best match.
    """
    db = get_db()
    
    # Search scraped products for similar titles
    # Use regex for basic matching
    search_words = shopify_title.lower().split()[:3]  # First 3 words
    
    # Build regex pattern for any of the words
    pattern = "|".join([re.escape(word) for word in search_words if len(word) > 2])
    
    if not pattern:
        return {"success": False, "error": "Title too short for matching"}
    
    products = await db.scraped_products.find(
        {
            "$or": [
                {"title": {"$regex": pattern, "$options": "i"}},
                {"title_cn": {"$regex": pattern, "$options": "i"}},
            ]
        },
        {"_id": 0, "product_id": 1, "title": 1, "title_cn": 1, "price": 1, "images": 1, "variants": 1}
    ).limit(5).to_list(5)
    
    if not products:
        return {
            "success": True,
            "matches": [],
            "message": "No matching products found"
        }
    
    matches = []
    for p in products:
        matches.append({
            "product_1688_id": p.get("product_id"),
            "product_1688_url": f"https://detail.1688.com/offer/{p.get('product_id')}.html",
            "title": p.get("title") or p.get("title_cn"),
            "price": p.get("price"),
            "image": (p.get("images") or [None])[0],
            "variants_count": len(p.get("variants") or []),
        })
    
    return {
        "success": True,
        "shopify_sku": shopify_sku,
        "shopify_title": shopify_title,
        "matches": matches,
    }


@router.get("/orders/with-linkable-products")
async def get_orders_with_linkable_products(
    store_name: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Get orders that have products which can be linked to 1688.
    Returns orders with line items and their link status.
    """
    db = get_db()
    
    query = {}
    if store_name:
        query["store_name"] = store_name
    
    orders = await db.customers.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    result_orders = []
    
    for order in orders:
        order_data = {
            "order_number": order.get("order_number"),
            "store_name": order.get("store_name"),
            "customer": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
            "total": order.get("total_price"),
            "currency": order.get("currency"),
            "created_at": order.get("created_at"),
            "line_items": [],
            "linkable_count": 0,
            "linked_count": 0,
        }
        
        for item in (order.get("line_items") or []):
            sku = item.get("sku", "")
            
            # Check if already linked
            link = await db.product_links.find_one({"shopify_sku": sku}, {"_id": 0})
            
            # Check if SKU contains 1688 ID
            import re
            match = re.search(r'(\d{12,})', sku)
            
            item_data = {
                "sku": sku,
                "name": item.get("name") or item.get("title"),
                "quantity": item.get("quantity", 1),
                "price": item.get("price"),
                "variant_title": item.get("variant_title"),
                "is_linked": link is not None,
                "has_1688_id_in_sku": match is not None,
                "extracted_1688_id": match.group(1) if match else None,
                "link": link,
            }
            
            order_data["line_items"].append(item_data)
            
            if link:
                order_data["linked_count"] += 1
            if match or link:
                order_data["linkable_count"] += 1
        
        result_orders.append(order_data)
    
    return {
        "success": True,
        "orders": result_orders,
        "total": len(result_orders),
    }
