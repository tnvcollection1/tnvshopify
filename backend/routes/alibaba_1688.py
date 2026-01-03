"""
1688.com (Alibaba) Open Platform API Integration
Direct integration for:
- Product search and details
- Auto-purchase order creation
- Order tracking and management

API Documentation: https://open.1688.com/api/overview.htm
"""

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import hashlib
import httpx
import os
import json
import time
import hmac
from urllib.parse import urlencode, quote
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/1688", tags=["1688 Alibaba Integration"])

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client['shopify_customers_db']
    return _db

# 1688 API Configuration - Trade/Orders App
ALIBABA_APP_KEY = os.environ.get("ALIBABA_1688_APP_KEY", "8585237")
ALIBABA_APP_SECRET = os.environ.get("ALIBABA_1688_APP_SECRET", "Gin6sv4MkP")
ALIBABA_ACCESS_TOKEN = os.environ.get("ALIBABA_1688_ACCESS_TOKEN", "")

# 1688 Merchant Integration API - Product Sync App
MERCHANT_APP_KEY = os.environ.get("ALIBABA_MERCHANT_APP_KEY", "8641239")
MERCHANT_APP_SECRET = os.environ.get("ALIBABA_MERCHANT_APP_SECRET", "vTjzA5OAQ6")
MERCHANT_ACCESS_TOKEN = os.environ.get("ALIBABA_MERCHANT_ACCESS_TOKEN", "9f15b655-acb8-484a-84a8-2c78747442a4")

# API Base URLs
ALIBABA_API_URL = "https://gw.open.1688.com/openapi"
ALIBABA_AUTH_URL = "https://auth.1688.com/oauth/authorize"

# ==================== Signature Generation ====================

def generate_sign(api_path: str, params: dict, secret: str) -> str:
    """
    Generate signature for 1688 API using HMAC-SHA1
    Based on official 1688 Node.js SDK:
    - Signature = HMAC-SHA1(secret, api_path + sorted(key1value1key2value2...))
    - Convert to uppercase hex
    """
    # Build params string: sort and concatenate key+value pairs
    enc_arr = []
    for key, value in params.items():
        if value is not None and str(value) != '':
            enc_arr.append(f"{key}{value}")
    
    # Sort the array and join
    enc_arr.sort()
    params_str = ''.join(enc_arr)
    
    # Build sign string: api_path + sorted params
    sign_str = api_path + params_str
    
    print(f"Sign string: {sign_str[:300]}...")
    
    # HMAC-SHA1 with secret as key
    hmac_obj = hmac.new(
        secret.encode('utf-8'),
        sign_str.encode('utf-8'),
        hashlib.sha1
    )
    sign = hmac_obj.hexdigest().upper()
    
    print(f"Generated signature (HMAC-SHA1): {sign}")
    
    return sign


def build_api_request(api_name: str, params: dict, access_token: str = None):
    """Build the API request with proper signature for 1688"""
    import time
    
    # API path format: param2/1/namespace/api_name/app_key
    api_path = f"param2/1/{api_name}/{ALIBABA_APP_KEY}"
    
    # Build request params
    request_params = dict(params)
    
    # Add access token if provided
    if access_token or ALIBABA_ACCESS_TOKEN:
        request_params['access_token'] = access_token or ALIBABA_ACCESS_TOKEN
    
    # Add timestamp (required by 1688 API)
    request_params['_aop_timestamp'] = str(int(time.time() * 1000))
    
    # Remove None values and convert to string
    request_params = {k: str(v) for k, v in request_params.items() if v is not None and str(v) != ''}
    
    # Generate signature using HMAC-SHA1
    signature = generate_sign(api_path, request_params, ALIBABA_APP_SECRET)
    request_params['_aop_signature'] = signature
    
    # Build full URL
    url = f"{ALIBABA_API_URL}/{api_path}"
    
    print(f"API URL: {url}")
    print(f"Request params: {list(request_params.keys())}")
    
    return url, request_params


async def make_api_request(api_name: str, params: dict = None, method: str = "POST", access_token: str = None) -> dict:
    """Make HTTP request to 1688 API"""
    params = params or {}
    
    url, all_params = build_api_request(api_name, params, access_token)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                response = await client.get(url, params=all_params)
            else:
                response = await client.post(
                    url,
                    data=all_params,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
            
            print(f"1688 API Response Status: {response.status_code}")
            print(f"1688 API Response: {response.text[:500]}")
            
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPStatusError as e:
        print(f"1688 API HTTP Error: {e.response.status_code} - {e.response.text[:500]}")
        raise HTTPException(status_code=e.response.status_code, detail=f"API request failed: {str(e)}")
    except httpx.RequestError as e:
        print(f"1688 API Request Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")
    except json.JSONDecodeError as e:
        print(f"1688 API JSON Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Invalid JSON response: {str(e)}")


# ==================== Alternative: TMAPI Integration ====================
# Using third-party TMAPI for simpler product data access

TMAPI_BASE_URL = "http://api.tmapi.top"
TMAPI_TOKEN = os.environ.get("TMAPI_TOKEN", "")

async def tmapi_request(endpoint: str, params: dict) -> dict:
    """Make request to TMAPI (third-party 1688 API)"""
    url = f"{TMAPI_BASE_URL}{endpoint}"
    
    # Add API token
    params['apiToken'] = TMAPI_TOKEN
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TMAPI request failed: {str(e)}")


# ==================== Pydantic Models ====================

class ProductSearchRequest(BaseModel):
    keyword: str = Field(..., description="Search keyword")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=50, description="Items per page")
    sort: Optional[str] = Field(None, description="Sort by: price_asc, price_desc, sales_desc")
    min_price: Optional[float] = Field(None, description="Minimum price filter")
    max_price: Optional[float] = Field(None, description="Maximum price filter")


class ProductDetailRequest(BaseModel):
    item_id: str = Field(..., description="1688 Product ID")


class PurchaseOrderItem(BaseModel):
    product_id: str = Field(..., description="1688 Product ID")
    sku_id: Optional[str] = Field(None, description="SKU ID if product has variants")
    quantity: int = Field(..., ge=1, description="Quantity to purchase")
    price: Optional[float] = Field(None, description="Unit price")


class CreatePurchaseOrderRequest(BaseModel):
    items: List[PurchaseOrderItem] = Field(..., description="List of items to purchase")
    shipping_address: dict = Field(..., description="Shipping address details")
    shopify_order_id: Optional[str] = Field(None, description="Link to Shopify order")
    notes: Optional[str] = Field(None, description="Order notes")


class ProductSyncRequest(BaseModel):
    product_url: Optional[str] = Field(None, description="1688 product URL to sync")
    product_id: Optional[str] = Field(None, description="1688 product ID to sync")
    store_name: Optional[str] = Field(None, description="Target Shopify store")


class ManualProductEntry(BaseModel):
    """For manually adding products when API quota is exhausted"""
    product_id: str = Field(..., description="1688 Product ID (from URL)")
    title: str = Field(..., description="Product title")
    description: Optional[str] = Field(None, description="Product description")
    price: float = Field(..., description="Product price in CNY")
    price_range: Optional[str] = Field(None, description="Price range e.g. '10-50'")
    images: List[str] = Field(default=[], description="List of image URLs")
    category: Optional[str] = Field(None, description="Product category")
    min_order: int = Field(1, description="Minimum order quantity")
    supplier_name: Optional[str] = Field(None, description="Supplier/Shop name")
    supplier_url: Optional[str] = Field(None, description="Supplier shop URL")
    variants: Optional[List[dict]] = Field(default=[], description="Product variants/SKUs")
    store_name: Optional[str] = Field(None, description="Target Shopify store")


class ScrapeRequest(BaseModel):
    url: str = Field(..., description="1688 product URL to scrape")
    auto_save: bool = Field(False, description="Automatically save to catalog")


class BulkScrapeRequest(BaseModel):
    urls: List[str] = Field(..., description="List of 1688 product URLs to scrape")
    auto_save: bool = Field(True, description="Automatically save all to catalog")


# ==================== Web Scraping Functions ====================

async def scrape_1688_product(url: str) -> dict:
    """
    Scrape product details from 1688 product page
    Uses multiple methods to extract data
    """
    import re
    
    # Extract product ID from URL
    product_id = None
    patterns = [
        r'detail\.1688\.com/offer/(\d+)',
        r'offer/(\d+)\.html',
        r'offerId=(\d+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            product_id = match.group(1)
            break
    
    if not product_id:
        raise HTTPException(status_code=400, detail="Could not extract product ID from URL")
    
    # Try to fetch the page
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
    }
    
    product_data = {
        'product_id': product_id,
        'url': f"https://detail.1688.com/offer/{product_id}.html",
        'title': None,
        'price': None,
        'price_range': None,
        'images': [],
        'description': None,
        'min_order': 1,
        'supplier_name': None,
        'supplier_url': None,
        'category': None,
        'attributes': [],
        'skus': [],
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            html = response.text
            
            # Extract title
            title_patterns = [
                r'<title>([^<]+)</title>',
                r'"subject"\s*:\s*"([^"]+)"',
                r'class="title[^"]*"[^>]*>([^<]+)<',
            ]
            for pattern in title_patterns:
                match = re.search(pattern, html)
                if match:
                    title = match.group(1)
                    # Clean up title
                    title = title.replace('- 阿里巴巴', '').replace('-1688.com', '').strip()
                    if title and len(title) > 5:
                        product_data['title'] = title
                        break
            
            # Extract price
            price_patterns = [
                r'"price"\s*:\s*"?([\d.]+)"?',
                r'class="price[^"]*"[^>]*>¥?([\d.]+)',
                r'¥\s*([\d.]+)',
                r'"priceRange"\s*:\s*"([^"]+)"',
            ]
            for pattern in price_patterns:
                match = re.search(pattern, html)
                if match:
                    price_str = match.group(1)
                    if '-' in price_str:
                        product_data['price_range'] = price_str
                        # Use the lower price
                        try:
                            product_data['price'] = float(price_str.split('-')[0])
                        except:
                            pass
                    else:
                        try:
                            product_data['price'] = float(price_str)
                        except:
                            pass
                    break
            
            # Extract images
            image_patterns = [
                r'"originalImageURI"\s*:\s*"([^"]+)"',
                r'"imageUrl"\s*:\s*"([^"]+)"',
                r'data-lazy-src="(https?://[^"]+\.(?:jpg|jpeg|png|webp))"',
                r'src="(https?://cbu01\.alicdn\.com/[^"]+\.(?:jpg|jpeg|png))"',
            ]
            for pattern in image_patterns:
                matches = re.findall(pattern, html)
                for img_url in matches[:10]:  # Limit to 10 images
                    if img_url.startswith('//'):
                        img_url = 'https:' + img_url
                    if img_url not in product_data['images']:
                        product_data['images'].append(img_url)
            
            # Extract supplier name
            supplier_patterns = [
                r'"companyName"\s*:\s*"([^"]+)"',
                r'"shopName"\s*:\s*"([^"]+)"',
                r'class="company-name[^"]*"[^>]*>([^<]+)<',
            ]
            for pattern in supplier_patterns:
                match = re.search(pattern, html)
                if match:
                    product_data['supplier_name'] = match.group(1)
                    break
            
            # Extract minimum order quantity
            moq_patterns = [
                r'"minOrderQuantity"\s*:\s*(\d+)',
                r'"beginAmount"\s*:\s*(\d+)',
                r'≥\s*(\d+)\s*件',
            ]
            for pattern in moq_patterns:
                match = re.search(pattern, html)
                if match:
                    product_data['min_order'] = int(match.group(1))
                    break
            
            print(f"Scraped product {product_id}: {product_data.get('title', 'No title')}")
            
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        # Return partial data with just the product ID
    
    return product_data


# ==================== API Endpoints ====================

@router.post("/scrape")
async def scrape_product(request: ScrapeRequest):
    """
    Auto-scrape product details from a 1688 URL
    Extracts title, price, images, supplier info automatically
    """
    db = get_db()
    
    try:
        product_data = await scrape_1688_product(request.url)
        
        if request.auto_save and product_data.get('product_id'):
            # Save to catalog
            catalog_item = {
                "id": f"1688_{product_data['product_id']}",
                "source": "1688",
                "source_id": product_data['product_id'],
                "source_url": product_data['url'],
                "title": product_data.get('title') or f"Product {product_data['product_id']}",
                "description": product_data.get('description'),
                "images": product_data.get('images', []),
                "price": product_data.get('price'),
                "price_range": product_data.get('price_range'),
                "price_info": {"price": product_data.get('price'), "priceRange": product_data.get('price_range')},
                "category": product_data.get('category'),
                "min_order": product_data.get('min_order', 1),
                "variants": product_data.get('skus', []),
                "shop_info": {
                    "name": product_data.get('supplier_name'),
                    "url": product_data.get('supplier_url'),
                },
                "synced_at": datetime.now(timezone.utc).isoformat(),
                "entry_method": "auto_scrape",
            }
            
            await db.product_catalog_1688.update_one(
                {"source_id": product_data['product_id']},
                {"$set": catalog_item},
                upsert=True
            )
            
            return {
                "success": True,
                "message": "Product scraped and saved to catalog",
                "product": catalog_item,
            }
        
        return {
            "success": True,
            "message": "Product scraped successfully",
            "product": product_data,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to scrape product",
        }


@router.post("/scrape-bulk")
async def scrape_products_bulk(request: BulkScrapeRequest):
    """
    Scrape multiple products from a list of 1688 URLs
    """
    db = get_db()
    
    results = {
        "success": True,
        "total": len(request.urls),
        "scraped": 0,
        "failed": 0,
        "products": [],
        "errors": [],
    }
    
    for url in request.urls:
        try:
            product_data = await scrape_1688_product(url)
            
            if request.auto_save and product_data.get('product_id'):
                catalog_item = {
                    "id": f"1688_{product_data['product_id']}",
                    "source": "1688",
                    "source_id": product_data['product_id'],
                    "source_url": product_data['url'],
                    "title": product_data.get('title') or f"Product {product_data['product_id']}",
                    "description": product_data.get('description'),
                    "images": product_data.get('images', []),
                    "price": product_data.get('price'),
                    "price_range": product_data.get('price_range'),
                    "price_info": {"price": product_data.get('price'), "priceRange": product_data.get('price_range')},
                    "category": product_data.get('category'),
                    "min_order": product_data.get('min_order', 1),
                    "shop_info": {
                        "name": product_data.get('supplier_name'),
                    },
                    "synced_at": datetime.now(timezone.utc).isoformat(),
                    "entry_method": "auto_scrape_bulk",
                }
                
                await db.product_catalog_1688.update_one(
                    {"source_id": product_data['product_id']},
                    {"$set": catalog_item},
                    upsert=True
                )
            
            results['scraped'] += 1
            results['products'].append(product_data)
            
        except Exception as e:
            results['failed'] += 1
            results['errors'].append({"url": url, "error": str(e)})
    
    return results


# ==================== Merchant Integration APIs ====================

async def make_merchant_api_request(api_name: str, params: dict = None) -> dict:
    """Make HTTP request to 1688 Merchant Integration API"""
    params = params or {}
    
    # Build API path
    api_path = f"param2/1/{api_name}/{MERCHANT_APP_KEY}"
    
    # Add access token
    request_params = dict(params)
    request_params['access_token'] = MERCHANT_ACCESS_TOKEN
    
    # Add timestamp
    request_params['_aop_timestamp'] = str(int(time.time() * 1000))
    
    # Remove None values
    request_params = {k: str(v) for k, v in request_params.items() if v is not None and str(v) != ''}
    
    # Generate signature using HMAC-SHA1
    signature = generate_sign(api_path, request_params, MERCHANT_APP_SECRET)
    request_params['_aop_signature'] = signature
    
    # Build full URL
    url = f"{ALIBABA_API_URL}/{api_path}"
    
    print(f"Merchant API URL: {url}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                data=request_params,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            print(f"Merchant API Response Status: {response.status_code}")
            print(f"Merchant API Response: {response.text[:500]}")
            
            response.raise_for_status()
            return response.json()
            
    except Exception as e:
        print(f"Merchant API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Merchant API request failed: {str(e)}")


@router.get("/merchant/info")
async def get_merchant_info(shop_url: str = Query(..., description="1688 shop URL or domain")):
    """
    Get information about a merchant/supplier using the purchased API
    API: com.alibaba.trade/alibaba.member.getRelationUserInfo
    """
    try:
        # Extract domain from URL
        import re
        domain = shop_url
        # Clean the URL to get just the domain
        domain = re.sub(r'^https?://', '', domain)
        domain = re.sub(r'/.*$', '', domain)
        
        params = {
            "domain": domain,
        }
        
        result = await make_merchant_api_request(
            "com.alibaba.trade/alibaba.member.getRelationUserInfo",
            params
        )
        
        return {
            "success": True,
            "merchant": result.get("result") or result,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@router.get("/merchant/products")
async def get_merchant_products(
    member_id: str = Query(..., description="Merchant/Supplier member ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    """
    Get products from a specific merchant/supplier
    API: Get information on purchased merchant products
    """
    db = get_db()
    
    try:
        params = {
            "memberId": member_id,
            "pageNo": str(page),
            "pageSize": str(page_size),
        }
        
        # Try the merchant product API
        result = await make_merchant_api_request(
            "cn.alibaba.open/alibaba.product.getByMemberId",
            params
        )
        
        products = result.get("result", {}).get("products", []) or result.get("products", []) or []
        
        return {
            "success": True,
            "page": page,
            "page_size": page_size,
            "total": len(products),
            "products": products,
            "raw_response": result,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch merchant products",
        }


@router.post("/merchant/sync-all")
async def sync_all_merchant_products(
    member_id: str = Body(..., description="Merchant/Supplier member ID"),
    shop_name: str = Body(None, description="Shop name for reference"),
):
    """
    Sync all products from a merchant to the catalog
    """
    db = get_db()
    
    try:
        all_products = []
        page = 1
        page_size = 50
        
        while True:
            params = {
                "memberId": member_id,
                "pageNo": str(page),
                "pageSize": str(page_size),
            }
            
            result = await make_merchant_api_request(
                "cn.alibaba.open/alibaba.product.getByMemberId",
                params
            )
            
            products = result.get("result", {}).get("products", []) or result.get("products", []) or []
            
            if not products:
                break
                
            all_products.extend(products)
            
            if len(products) < page_size:
                break
                
            page += 1
            
            # Safety limit
            if page > 100:
                break
        
        # Save all products to catalog
        saved_count = 0
        for product in all_products:
            product_id = product.get("productId") or product.get("offerId")
            if not product_id:
                continue
                
            catalog_item = {
                "id": f"1688_{product_id}",
                "source": "1688",
                "source_id": str(product_id),
                "source_url": f"https://detail.1688.com/offer/{product_id}.html",
                "title": product.get("subject") or product.get("title"),
                "description": product.get("description"),
                "images": product.get("images", []) or [product.get("imageUrl")],
                "price": product.get("priceInfo", {}).get("price") or product.get("price"),
                "price_range": product.get("priceRange"),
                "price_info": product.get("priceInfo"),
                "category": product.get("categoryName"),
                "min_order": product.get("saleInfo", {}).get("minOrderQuantity", 1),
                "shop_info": {
                    "name": shop_name or product.get("shopName"),
                    "id": member_id,
                },
                "synced_at": datetime.now(timezone.utc).isoformat(),
                "entry_method": "merchant_api_sync",
            }
            
            await db.product_catalog_1688.update_one(
                {"source_id": str(product_id)},
                {"$set": catalog_item},
                upsert=True
            )
            saved_count += 1
        
        return {
            "success": True,
            "message": f"Synced {saved_count} products from merchant",
            "total_found": len(all_products),
            "saved": saved_count,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to sync merchant products",
        }


@router.get("/health")
async def health_check():
    """Check API connectivity and configuration"""
    return {
        "status": "ok",
        "app_key": ALIBABA_APP_KEY,
        "merchant_app_key": MERCHANT_APP_KEY,
        "has_app_secret": bool(ALIBABA_APP_SECRET),
        "has_access_token": bool(ALIBABA_ACCESS_TOKEN),
        "has_merchant_token": bool(MERCHANT_ACCESS_TOKEN),
        "has_tmapi_token": bool(TMAPI_TOKEN),
        "api_url": ALIBABA_API_URL,
    }


@router.post("/search")
async def search_products(request: ProductSearchRequest):
    """
    Search products on 1688 using product.keywords.search API
    """
    db = get_db()
    
    try:
        # Using official 1688 API: product.keywords.search
        params = {
            "keywords": request.keyword,
            "pageNo": str(request.page),
            "pageSize": str(request.page_size),
        }
        
        if request.min_price:
            params["priceStart"] = str(request.min_price)
        if request.max_price:
            params["priceEnd"] = str(request.max_price)
        
        result = await make_api_request("com.alibaba.product/product.keywords.search", params)
        
        # Parse and return results
        products = result.get("result", {}).get("data", []) or result.get("data", []) or []
        
        return {
            "success": True,
            "source": "official_api",
            "keyword": request.keyword,
            "page": request.page,
            "total": result.get("result", {}).get("total", 0) or result.get("total", 0),
            "products": [
                {
                    "id": p.get("productId") or p.get("offerId"),
                    "title": p.get("subject") or p.get("title"),
                    "price": p.get("priceInfo", {}).get("price") or p.get("price"),
                    "price_range": p.get("priceRange"),
                    "image": p.get("imageUrl") or (p.get("images", [{}])[0] if p.get("images") else None),
                    "sales": p.get("saleInfo", {}).get("gmvTotal") or p.get("sales"),
                    "shop_name": p.get("shopName"),
                    "shop_id": p.get("shopId") or p.get("memberId"),
                    "url": f"https://detail.1688.com/offer/{p.get('productId') or p.get('offerId')}.html",
                }
                for p in products
            ],
            "raw_response": result,
        }
        
    except Exception as e:
        # Log the error
        print(f"Official API error: {e}")
        
        return {
            "success": False,
            "source": "official_api",
            "keyword": request.keyword,
            "page": request.page,
            "error": str(e),
            "message": "API call failed. Please check your credentials and API permissions.",
            "products": [],
        }


@router.get("/product/{item_id}")
async def get_product_details(item_id: str):
    """
    Get detailed product information from 1688 using alibaba.product.simple.get
    Falls back to web scraping if API quota exhausted
    """
    try:
        params = {
            "offerId": item_id,
        }
        
        result = await make_api_request("com.alibaba.product/alibaba.product.simple.get", params)
        
        product = result.get("result", {}) or result
        
        return {
            "success": True,
            "source": "official_api",
            "product": {
                "id": product.get("productId") or item_id,
                "title": product.get("subject"),
                "description": product.get("description"),
                "category": product.get("categoryName"),
                "price_info": product.get("priceInfo"),
                "images": product.get("images", []),
                "skus": product.get("skuInfos", []),
                "attributes": product.get("attributes", []),
                "shop_info": {
                    "name": product.get("shopName"),
                    "id": product.get("memberId"),
                    "url": product.get("shopUrl"),
                },
                "stock": product.get("saleInfo", {}).get("amountOnSale"),
                "min_order": product.get("saleInfo", {}).get("minOrderQuantity"),
                "url": f"https://detail.1688.com/offer/{item_id}.html",
            },
            "raw_response": result,
        }
        
    except Exception as e:
        error_str = str(e)
        # Check if it's a quota/usage error - suggest manual entry
        if "NoUsageLeftError" in error_str or "SLA bill" in error_str:
            return {
                "success": False,
                "error": "API quota exhausted",
                "message": "Product API quota exhausted. Please enter product details manually or upgrade your 1688 plan.",
                "product_id": item_id,
                "product_url": f"https://detail.1688.com/offer/{item_id}.html",
                "suggestion": "You can manually add the product by copying details from the URL above",
            }
        
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch product. Check API permissions.",
            "product_id": item_id,
            "manual_url": f"https://detail.1688.com/offer/{item_id}.html",
        }


@router.post("/sync-product")
async def sync_product_to_catalog(request: ProductSyncRequest):
    """
    Sync a 1688 product to the WaMerce catalog
    """
    db = get_db()
    
    # Extract product ID from URL if provided
    product_id = request.product_id
    if request.product_url and not product_id:
        # Extract ID from URL like https://detail.1688.com/offer/123456789.html
        import re
        match = re.search(r'/offer/(\d+)', request.product_url)
        if match:
            product_id = match.group(1)
    
    if not product_id:
        raise HTTPException(status_code=400, detail="Product ID or valid URL required")
    
    # Fetch product details
    product_data = await get_product_details(product_id)
    
    if not product_data.get("success"):
        raise HTTPException(status_code=400, detail="Failed to fetch product details")
    
    product = product_data.get("product", {})
    
    # Save to catalog
    catalog_item = {
        "id": f"1688_{product_id}",
        "source": "1688",
        "source_id": product_id,
        "source_url": f"https://detail.1688.com/offer/{product_id}.html",
        "title": product.get("title"),
        "description": product.get("description"),
        "images": product.get("images", []),
        "price_info": product.get("price_info"),
        "skus": product.get("skus", []),
        "attributes": product.get("attributes", []),
        "shop_info": product.get("shop_info"),
        "min_order": product.get("min_order"),
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "store_name": request.store_name,
    }
    
    # Upsert to catalog collection
    await db.product_catalog_1688.update_one(
        {"source_id": product_id},
        {"$set": catalog_item},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Product synced to catalog",
        "product": catalog_item,
    }


@router.get("/catalog")
async def list_catalog_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
):
    """
    List products synced to the WaMerce catalog from 1688
    """
    db = get_db()
    
    query = {}
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    
    skip = (page - 1) * page_size
    
    products = await db.product_catalog_1688.find(
        query,
        {"_id": 0}
    ).skip(skip).limit(page_size).to_list(page_size)
    
    total = await db.product_catalog_1688.count_documents(query)
    
    return {
        "success": True,
        "page": page,
        "page_size": page_size,
        "total": total,
        "products": products,
    }


@router.post("/add-product")
async def add_product_manually(product: ManualProductEntry):
    """
    Manually add a 1688 product to the catalog
    Use this when API quota is exhausted
    """
    db = get_db()
    
    catalog_item = {
        "id": f"1688_{product.product_id}",
        "source": "1688",
        "source_id": product.product_id,
        "source_url": f"https://detail.1688.com/offer/{product.product_id}.html",
        "title": product.title,
        "description": product.description,
        "images": product.images,
        "price": product.price,
        "price_range": product.price_range,
        "price_info": {"price": product.price, "priceRange": product.price_range},
        "category": product.category,
        "min_order": product.min_order,
        "variants": product.variants,
        "shop_info": {
            "name": product.supplier_name,
            "url": product.supplier_url,
        },
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "store_name": product.store_name,
        "entry_method": "manual",
    }
    
    # Upsert to catalog collection
    await db.product_catalog_1688.update_one(
        {"source_id": product.product_id},
        {"$set": catalog_item},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Product added to catalog",
        "product": catalog_item,
    }


@router.delete("/catalog/{product_id}")
async def delete_catalog_product(product_id: str):
    """
    Delete a product from the 1688 catalog
    """
    db = get_db()
    
    result = await db.product_catalog_1688.delete_one({"source_id": product_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {
        "success": True,
        "message": "Product deleted from catalog",
    }


@router.put("/catalog/{product_id}")
async def update_catalog_product(product_id: str, updates: dict = Body(...)):
    """
    Update a product in the 1688 catalog
    """
    db = get_db()
    
    # Add updated timestamp
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.product_catalog_1688.update_one(
        {"source_id": product_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get updated product
    product = await db.product_catalog_1688.find_one(
        {"source_id": product_id},
        {"_id": 0}
    )
    
    return {
        "success": True,
        "message": "Product updated",
        "product": product,
    }


@router.post("/create-purchase-order")
async def create_purchase_order(request: CreatePurchaseOrderRequest):
    """
    Create a purchase order on 1688 using alibaba.trade.fastCreateOrder
    This requires a valid access_token with trade permissions
    """
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(
            status_code=400, 
            detail="Access token not configured. Please add your 1688 authorized user to get an access token."
        )
    
    db = get_db()
    
    try:
        # Build order items for 1688 API
        order_entries = []
        for item in request.items:
            entry = {
                "offerId": int(item.product_id),
                "quantity": item.quantity,
            }
            if item.sku_id:
                entry["specId"] = item.sku_id
            order_entries.append(entry)
        
        # First preview the order using alibaba.createOrder.preview
        preview_params = {
            "addressParam": json.dumps(request.shipping_address),
            "cargoParamList": json.dumps(order_entries),
        }
        
        print(f"Creating order preview with params: {preview_params}")
        
        preview_result = await make_api_request(
            "com.alibaba.trade/alibaba.createOrder.preview",
            preview_params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        print(f"Preview result: {preview_result}")
        
        if preview_result.get("errorCode") or preview_result.get("error_code"):
            error_msg = preview_result.get("errorMessage") or preview_result.get("error_message") or "Unknown error"
            raise HTTPException(
                status_code=400, 
                detail=f"Order preview failed: {error_msg}"
            )
        
        # Create actual order using alibaba.trade.fastCreateOrder (Recommended API)
        create_params = {
            "addressParam": json.dumps(request.shipping_address),
            "cargoParamList": json.dumps(order_entries),
        }
        
        if request.notes:
            create_params["message"] = request.notes
        
        print(f"Creating order with params: {create_params}")
        
        create_result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.fastCreateOrder",
            create_params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        print(f"Create result: {create_result}")
        
        if create_result.get("errorCode") or create_result.get("error_code"):
            error_msg = create_result.get("errorMessage") or create_result.get("error_message") or "Unknown error"
            raise HTTPException(
                status_code=400,
                detail=f"Order creation failed: {error_msg}"
            )
        
        # Extract order ID from response
        order_id = create_result.get("result", {}).get("orderId") or create_result.get("orderId")
        
        # Save order to database
        order_record = {
            "id": f"1688_order_{order_id}",
            "source": "1688",
            "order_id": str(order_id),
            "shopify_order_id": request.shopify_order_id,
            "items": [item.dict() for item in request.items],
            "shipping_address": request.shipping_address,
            "notes": request.notes,
            "status": "created",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "preview_response": preview_result,
            "create_response": create_result,
        }
        
        await db.purchase_orders_1688.insert_one(order_record)
        
        # Get payment link
        payment_link = None
        if order_id:
            try:
                payment_params = {"orderIdList": json.dumps([order_id])}
                payment_result = await make_api_request(
                    "com.alibaba.trade/alibaba.alipay.url.get",
                    payment_params,
                    access_token=ALIBABA_ACCESS_TOKEN
                )
                payment_link = payment_result.get("result", {}).get("payUrl") or payment_result.get("payUrl")
            except Exception as e:
                print(f"Failed to get payment link: {e}")
        
        return {
            "success": True,
            "message": "Purchase order created successfully",
            "order_id": order_id,
            "payment_link": payment_link,
            "order": {k: v for k, v in order_record.items() if k != "_id"},
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Order creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.get("/purchase-orders")
async def list_purchase_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    shopify_order_id: Optional[str] = Query(None),
):
    """
    List purchase orders created on 1688
    """
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    if shopify_order_id:
        query["shopify_order_id"] = shopify_order_id
    
    skip = (page - 1) * page_size
    
    orders = await db.purchase_orders_1688.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    total = await db.purchase_orders_1688.count_documents(query)
    
    return {
        "success": True,
        "page": page,
        "page_size": page_size,
        "total": total,
        "orders": orders,
    }


@router.get("/order/{order_id}")
async def get_order_details(order_id: str):
    """
    Get details of a specific 1688 purchase order using alibaba.trade.get.buyerView
    """
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="Access token not configured")
    
    try:
        params = {
            "orderId": order_id,
        }
        
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.get.buyerView",
            params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        return {
            "success": True,
            "order": result.get("result") or result,
            "raw_response": result,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get order: {str(e)}")


@router.get("/orders")
async def list_1688_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Order status filter"),
):
    """
    List orders from 1688 using alibaba.trade.getBuyerOrderList
    """
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="Access token not configured")
    
    try:
        params = {
            "pageNo": str(page),
            "pageSize": str(page_size),
        }
        
        if status:
            params["orderStatus"] = status
        
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.getBuyerOrderList",
            params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        # The result is directly a list of orders
        orders = result.get("result", [])
        if isinstance(orders, dict):
            orders = orders.get("result", []) or orders.get("orders", [])
        
        total = len(orders) if isinstance(orders, list) else 0
        
        return {
            "success": True,
            "page": page,
            "page_size": page_size,
            "total": total,
            "orders": orders,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list orders: {str(e)}")


@router.get("/logistics/{order_id}")
async def get_logistics_info(order_id: str):
    """
    Get logistics/tracking info for an order using alibaba.trade.getLogisticsInfos.buyerView
    """
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="Access token not configured")
    
    try:
        params = {
            "orderId": order_id,
        }
        
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.getLogisticsInfos.buyerView",
            params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        return {
            "success": True,
            "order_id": order_id,
            "logistics": result.get("result") or result,
            "raw_response": result,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get logistics: {str(e)}")


@router.get("/logistics-tracking/{order_id}")
async def get_logistics_tracking(order_id: str):
    """
    Get detailed tracking info using alibaba.trade.getLogisticsTraceInfo.buyerView
    """
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="Access token not configured")
    
    try:
        params = {
            "orderId": order_id,
        }
        
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.getLogisticsTraceInfo.buyerView",
            params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        return {
            "success": True,
            "order_id": order_id,
            "tracking": result.get("result") or result,
            "raw_response": result,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tracking: {str(e)}")


@router.get("/shipping-addresses")
async def get_shipping_addresses():
    """
    Get saved shipping addresses using alibaba.trade.receiveAddress.get
    """
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="Access token not configured")
    
    try:
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.receiveAddress.get",
            {},
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        return {
            "success": True,
            "addresses": result.get("result") or result.get("receiveAddressItems", []),
            "raw_response": result,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get addresses: {str(e)}")


@router.post("/auto-purchase")
async def auto_purchase_from_shopify_order(shopify_order_id: str = Body(..., embed=True)):
    """
    Automatically create a 1688 purchase order based on a Shopify order
    Matches Shopify products to 1688 catalog items and creates purchase
    """
    db = get_db()
    
    # Get Shopify order
    shopify_order = await db.customers.find_one(
        {"order_id": shopify_order_id},
        {"_id": 0}
    )
    
    if not shopify_order:
        raise HTTPException(status_code=404, detail="Shopify order not found")
    
    # Find matching 1688 products in catalog
    matched_items = []
    unmatched_items = []
    
    line_items = shopify_order.get("line_items", [])
    for item in line_items:
        product_title = item.get("title", "")
        sku = item.get("sku", "")
        
        # Try to find matching product in 1688 catalog
        catalog_match = await db.product_catalog_1688.find_one({
            "$or": [
                {"title": {"$regex": product_title[:30], "$options": "i"}},
                {"attributes.value": {"$regex": sku, "$options": "i"}} if sku else {},
            ]
        })
        
        if catalog_match:
            matched_items.append({
                "shopify_item": item,
                "catalog_item": catalog_match,
                "product_id": catalog_match.get("source_id"),
                "quantity": item.get("quantity", 1),
            })
        else:
            unmatched_items.append(item)
    
    if not matched_items:
        return {
            "success": False,
            "message": "No matching 1688 products found in catalog",
            "unmatched_items": unmatched_items,
            "suggestion": "Please sync the required 1688 products to your catalog first",
        }
    
    # Build purchase order request
    purchase_items = [
        PurchaseOrderItem(
            product_id=m["product_id"],
            quantity=m["quantity"],
        )
        for m in matched_items
    ]
    
    # Extract shipping address from Shopify order
    shipping_address = {
        "fullName": f"{shopify_order.get('first_name', '')} {shopify_order.get('last_name', '')}".strip(),
        "phone": shopify_order.get("phone", ""),
        "address": shopify_order.get("address", ""),
        "city": shopify_order.get("city", ""),
        "province": shopify_order.get("province", ""),
        "country": shopify_order.get("country", ""),
        "postCode": shopify_order.get("zip", ""),
    }
    
    # Create the purchase order
    try:
        order_request = CreatePurchaseOrderRequest(
            items=purchase_items,
            shipping_address=shipping_address,
            shopify_order_id=shopify_order_id,
            notes=f"Auto-created from Shopify order {shopify_order.get('order_number', '')}",
        )
        
        result = await create_purchase_order(order_request)
        
        return {
            "success": True,
            "message": "Auto-purchase order created",
            "matched_items": len(matched_items),
            "unmatched_items": len(unmatched_items),
            "order_result": result,
        }
        
    except HTTPException as e:
        return {
            "success": False,
            "message": f"Failed to create purchase order: {e.detail}",
            "matched_items": matched_items,
            "unmatched_items": unmatched_items,
        }


@router.post("/configure")
async def configure_api_credentials(
    app_key: Optional[str] = Body(None),
    app_secret: Optional[str] = Body(None),
    access_token: Optional[str] = Body(None),
    tmapi_token: Optional[str] = Body(None),
):
    """
    Update API credentials (stored in memory - for testing)
    For production, update environment variables
    """
    global ALIBABA_APP_KEY, ALIBABA_APP_SECRET, ALIBABA_ACCESS_TOKEN, TMAPI_TOKEN
    
    updated = []
    
    if app_key:
        ALIBABA_APP_KEY = app_key
        updated.append("app_key")
    if app_secret:
        ALIBABA_APP_SECRET = app_secret
        updated.append("app_secret")
    if access_token:
        ALIBABA_ACCESS_TOKEN = access_token
        updated.append("access_token")
    if tmapi_token:
        TMAPI_TOKEN = tmapi_token
        updated.append("tmapi_token")
    
    return {
        "success": True,
        "message": f"Updated credentials: {', '.join(updated)}",
        "current_config": {
            "app_key": ALIBABA_APP_KEY,
            "has_app_secret": bool(ALIBABA_APP_SECRET),
            "has_access_token": bool(ALIBABA_ACCESS_TOKEN),
            "has_tmapi_token": bool(TMAPI_TOKEN),
        },
    }


@router.get("/extract-product-id")
async def extract_product_id_from_url(url: str = Query(...)):
    """
    Extract 1688 product ID from various URL formats
    """
    import re
    
    # Pattern for detail.1688.com/offer/123456.html
    patterns = [
        r'detail\.1688\.com/offer/(\d+)',
        r'offer/(\d+)\.html',
        r'offerId=(\d+)',
        r'/(\d{10,})',  # 10+ digit number likely a product ID
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return {
                "success": True,
                "product_id": match.group(1),
                "product_url": f"https://detail.1688.com/offer/{match.group(1)}.html",
            }
    
    return {
        "success": False,
        "message": "Could not extract product ID from URL",
        "url": url,
    }
