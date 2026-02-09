"""
1688.com (Alibaba) Open Platform API Integration
Direct integration for:
- Product search and details
- Auto-purchase order creation
- Order tracking and management

API Documentation: https://open.1688.com/api/overview.htm
"""

from fastapi import APIRouter, HTTPException, Query, Body, File, UploadFile
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import hashlib
import httpx
import os
import json
import time
import hmac
import re
import io
import asyncio
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
        _db = client[os.environ.get('DB_NAME', 'wamerce')]
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


# ==================== OAuth & Authorization Helpers ====================

class UpdateAccessTokenRequest(BaseModel):
    access_token: str = Field(..., description="New 1688 access token")
    refresh_token: Optional[str] = Field(None, description="Refresh token for future renewal")


@router.get("/auth/url")
async def get_auth_url(redirect_uri: str = Query("https://wamerce.com/callback", description="OAuth callback URL")):
    """
    Get the OAuth authorization URL for 1688
    User should visit this URL to authorize the app and get a new access token
    """
    # Build OAuth URL for 1688
    auth_params = {
        "client_id": ALIBABA_APP_KEY,
        "site": "1688",
        "redirect_uri": redirect_uri,
        "state": "wamerce_auth",
    }
    
    auth_url = f"{ALIBABA_AUTH_URL}?{urlencode(auth_params)}"
    
    return {
        "auth_url": auth_url,
        "instructions": [
            "1. Visit the authorization URL in your browser",
            "2. Log in to your 1688 account if not already logged in",
            "3. Authorize the WaMerce application",
            "4. Copy the 'code' parameter from the redirect URL",
            "5. Use the code to exchange for an access token on 1688 console",
            "6. Update the access token using POST /api/1688/auth/token"
        ],
        "app_key": ALIBABA_APP_KEY,
        "note": "For Product API access, ensure you have authorized 'com.alibaba.product' scope"
    }


@router.post("/auth/token")
async def update_access_token(request: UpdateAccessTokenRequest):
    """
    Update the 1688 access token in the database and environment
    This allows updating the token without restarting the server
    """
    global ALIBABA_ACCESS_TOKEN
    
    db = get_db()
    
    # Save to database for persistence
    await db.system_config.update_one(
        {"key": "alibaba_1688_credentials"},
        {"$set": {
            "key": "alibaba_1688_credentials",
            "access_token": request.access_token,
            "refresh_token": request.refresh_token,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )
    
    # Update in-memory variable
    ALIBABA_ACCESS_TOKEN = request.access_token
    
    # Test the new token
    try:
        test_result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.receiveAddress.get",
            {},
            access_token=request.access_token
        )
        token_valid = "error" not in str(test_result).lower() and "errorCode" not in test_result
    except Exception as e:
        token_valid = False
    
    return {
        "success": True,
        "message": "Access token updated",
        "token_valid": token_valid,
        "token_prefix": request.access_token[:20] + "..." if len(request.access_token) > 20 else request.access_token,
    }


@router.get("/auth/test")
async def test_access_token():
    """
    Test if the current access token is valid by calling a simple API
    """
    results = {
        "trade_api": {"status": "unknown", "error": None},
        "product_api": {"status": "unknown", "error": None},
    }
    
    # Test Trade API (should work)
    try:
        trade_result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.receiveAddress.get",
            {}
        )
        if "errorCode" in trade_result or "error" in str(trade_result).lower():
            results["trade_api"]["status"] = "failed"
            results["trade_api"]["error"] = trade_result.get("errorMessage", str(trade_result))
        else:
            results["trade_api"]["status"] = "working"
    except Exception as e:
        results["trade_api"]["status"] = "error"
        results["trade_api"]["error"] = str(e)
    
    # Test Product API (might not work due to authorization)
    try:
        product_result = await make_api_request(
            "com.alibaba.product/alibaba.product.simple.get",
            {"productId": "123456789"}  # Dummy ID just for auth test
        )
        if "errorCode" in product_result:
            error_code = product_result.get("errorCode", "")
            if error_code == "401" or "Unauthorized" in str(product_result):
                results["product_api"]["status"] = "unauthorized"
                results["product_api"]["error"] = "Token not authorized for Product API. Re-authorize with product scope."
            else:
                results["product_api"]["status"] = "error"
                results["product_api"]["error"] = product_result.get("errorMessage", str(product_result))
        else:
            results["product_api"]["status"] = "working"
    except HTTPException as e:
        if e.status_code == 401:
            results["product_api"]["status"] = "unauthorized"
            results["product_api"]["error"] = "Token not authorized for Product API"
        else:
            results["product_api"]["status"] = "error"
            results["product_api"]["error"] = str(e.detail)
    except Exception as e:
        results["product_api"]["status"] = "error"
        results["product_api"]["error"] = str(e)
    
    return {
        "access_token_configured": bool(ALIBABA_ACCESS_TOKEN),
        "token_prefix": ALIBABA_ACCESS_TOKEN[:15] + "..." if ALIBABA_ACCESS_TOKEN else None,
        "results": results,
        "recommendation": (
            "Trade API is working! Product API requires re-authorization. "
            "Go to 1688 console → Your App → Iteration → Delete existing user → Re-add user with all scopes"
            if results["trade_api"]["status"] == "working" and results["product_api"]["status"] != "working"
            else None
        )
    }


@router.post("/parse-purchase-excel")
async def parse_purchase_excel(file: UploadFile = File(...)):
    """
    Parse an Excel file with purchase orders and extract 1688 product IDs
    Expected columns: ORDER ID, SKU (containing 12-digit 1688 ID), SIZE, COLOR
    """
    try:
        import pandas as pd
        
        # Read the file
        contents = await file.read()
        
        # Try to parse as Excel
        try:
            df = pd.read_excel(io.BytesIO(contents))
        except Exception:
            # Try CSV
            try:
                df = pd.read_csv(io.BytesIO(contents))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Could not parse file: {str(e)}")
        
        # Normalize column names
        df.columns = [str(col).strip().upper() for col in df.columns]
        
        # Find relevant columns
        order_col = None
        sku_col = None
        size_col = None
        color_col = None
        
        for col in df.columns:
            if 'ORDER' in col and 'ID' in col:
                order_col = col
            elif col == 'ORDER ID':
                order_col = col
            elif 'SKU' in col:
                sku_col = col
            elif 'SIZE' in col:
                size_col = col
            elif 'COLOR' in col or 'COLOUR' in col:
                color_col = col
        
        # Fallback: use first column as order ID if not found
        if not order_col and len(df.columns) > 0:
            order_col = df.columns[0]
        
        # Fallback: use second column as SKU if not found
        if not sku_col and len(df.columns) > 1:
            sku_col = df.columns[1]
        
        orders = []
        
        for idx, row in df.iterrows():
            order_id = str(row.get(order_col, '')).strip() if order_col else str(idx)
            sku = str(row.get(sku_col, '')) if sku_col else ''
            size = str(row.get(size_col, '')) if size_col else ''
            color = ''
            
            # Try to find color in unnamed columns or the 4th column
            for col in df.columns:
                if col.startswith('UNNAMED') or 'COLOR' in col:
                    val = row.get(col)
                    if pd.notna(val) and str(val).strip():
                        color = str(val).strip()
                        break
            
            # Skip empty rows
            if not order_id or order_id == 'nan' or order_id == '':
                continue
            
            # Extract 1688 product ID (12-digit number) from SKU
            product_id_1688 = None
            if sku and sku != 'nan':
                match = re.search(r'(\d{12})', sku)
                if match:
                    product_id_1688 = match.group(1)
            
            # Extract product name from SKU (text before the number)
            product_name = sku.split('\n')[0] if '\n' in sku else sku
            if '/' in product_name:
                product_name = product_name.split('/')[0]
            product_name = re.sub(r'\d{12}', '', product_name).strip()
            
            # Clean up order_id (remove .0 from float conversion)
            if '.' in order_id:
                try:
                    order_id = str(int(float(order_id)))
                except:
                    pass
            
            # Clean up size
            if size and size != 'nan':
                try:
                    size = str(int(float(size)))
                except:
                    pass
            else:
                size = ''
            
            orders.append({
                'order_id': order_id,
                'sku': sku if sku != 'nan' else '',
                'product_name': product_name,
                'size': size,
                'color': color,
                'product_id_1688': product_id_1688,
                'url_1688': f"https://detail.1688.com/offer/{product_id_1688}.html" if product_id_1688 else None,
            })
        
        return {
            "success": True,
            "message": f"Parsed {len(orders)} orders from file",
            "orders": orders,
            "columns_found": {
                "order": order_col,
                "sku": sku_col,
                "size": size_col,
                "color": color_col,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")


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


async def scrape_product_skus_from_html(product_id: str) -> dict:
    """
    Scrape SKU/variant info from 1688 product page HTML
    This is a fallback when the API doesn't work
    """
    url = f"https://detail.1688.com/offer/{product_id}.html"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Referer': 'https://www.1688.com/',
    }
    
    skus = []
    attributes = {}
    title = None
    
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            html = response.text
            
            # Extract title
            title_match = re.search(r'<title>([^<]+)</title>', html)
            if title_match:
                title = title_match.group(1).replace('- 阿里巴巴', '').replace('-1688.com', '').strip()
            
            # Method 1: Look for skuProps/skuMap in the page JSON data
            # 1688 pages often have SKU info in __INIT_DATA or window.detailData
            sku_patterns = [
                r'"skuProps"\s*:\s*(\[.*?\])\s*[,}]',
                r'"skuMap"\s*:\s*(\{.*?\})\s*[,}]',
                r'"skuInfos"\s*:\s*(\[.*?\])\s*[,}]',
                r'"productSkuInfos"\s*:\s*(\[.*?\])\s*[,}]',
            ]
            
            # Try to find SKU properties (color, size names)
            sku_props_match = re.search(r'"skuProps"\s*:\s*(\[.*?\])\s*[,}]', html, re.DOTALL)
            if sku_props_match:
                try:
                    sku_props_str = sku_props_match.group(1)
                    # Clean up any JS-specific syntax
                    sku_props_str = re.sub(r'(\w+):', r'"\1":', sku_props_str)
                    sku_props = json.loads(sku_props_str)
                    
                    for prop in sku_props:
                        prop_name = prop.get('prop', prop.get('name', ''))
                        prop_values = prop.get('value', [])
                        if prop_name and prop_values:
                            attributes[prop_name] = [v.get('name', v) if isinstance(v, dict) else v for v in prop_values]
                except:
                    pass
            
            # Try to find SKU map with specId
            sku_map_match = re.search(r'"skuMap"\s*:\s*(\{[^}]*\})', html, re.DOTALL)
            if sku_map_match:
                try:
                    sku_map_str = sku_map_match.group(1)
                    sku_map = json.loads(sku_map_str)
                    
                    for key, value in sku_map.items():
                        # Key is usually like "颜色:白色;尺码:XL"
                        attrs = []
                        for attr_pair in key.split(';'):
                            if ':' in attr_pair:
                                attr_name, attr_value = attr_pair.split(':', 1)
                                attrs.append({
                                    'attributeName': attr_name.strip(),
                                    'attributeValue': attr_value.strip()
                                })
                        
                        sku_data = {
                            'specId': value.get('specId') or value.get('skuId'),
                            'price': value.get('price') or value.get('discountPrice'),
                            'stock': value.get('canBookCount') or value.get('saleCount'),
                            'attributes': attrs,
                        }
                        if sku_data['specId']:
                            skus.append(sku_data)
                except:
                    pass
            
            # Alternative: Look for globalData or detailData patterns
            if not skus:
                detail_data_match = re.search(r'window\.__INIT_DATA__\s*=\s*(\{.*?\})\s*;', html, re.DOTALL)
                if detail_data_match:
                    try:
                        data_str = detail_data_match.group(1)
                        # This can be complex, try to extract SKU parts
                        spec_id_matches = re.findall(r'"specId"\s*:\s*"?(\d+)"?', data_str)
                        for spec_id in spec_id_matches[:20]:  # Limit
                            skus.append({
                                'specId': spec_id,
                                'attributes': [],
                            })
                    except:
                        pass
            
            # If still no SKUs, try to find any specId references
            if not skus:
                spec_matches = re.findall(r'"specId"\s*:\s*"?(\d+)"?', html)
                unique_specs = list(set(spec_matches))[:20]
                for spec_id in unique_specs:
                    skus.append({
                        'specId': spec_id,
                        'attributes': [],
                    })
            
            # Extract attribute options from common patterns
            if not attributes:
                # Look for color/size options in various formats
                color_patterns = [
                    r'"颜色"\s*:\s*\[([^\]]+)\]',
                    r'"color"\s*:\s*\[([^\]]+)\]',
                    r'颜色[：:]\s*([^<\n]+)',
                ]
                size_patterns = [
                    r'"尺码"\s*:\s*\[([^\]]+)\]',
                    r'"size"\s*:\s*\[([^\]]+)\]',
                    r'"尺寸"\s*:\s*\[([^\]]+)\]',
                    r'尺码[：:]\s*([^<\n]+)',
                ]
                
                for pattern in color_patterns:
                    match = re.search(pattern, html, re.IGNORECASE)
                    if match:
                        values = re.findall(r'"([^"]+)"', match.group(1))
                        if values:
                            attributes['颜色'] = values
                            break
                
                for pattern in size_patterns:
                    match = re.search(pattern, html, re.IGNORECASE)
                    if match:
                        values = re.findall(r'"([^"]+)"', match.group(1))
                        if values:
                            attributes['尺码'] = values
                            break
            
            print(f"Scraped SKUs for {product_id}: {len(skus)} SKUs, attributes: {list(attributes.keys())}")
            
    except Exception as e:
        print(f"Error scraping SKUs from {url}: {e}")
    
    return {
        'skus': skus,
        'attributes': attributes,
        'title': title,
    }


@router.get("/product-skus/{product_id}")
async def get_product_skus(product_id: str):
    """
    Fetch product SKU/variant information from 1688
    Returns available sizes, colors, and their specIds for ordering
    Tries TMAPI first, then official API, then falls back to HTML scraping
    """
    import httpx
    
    skus = []
    attributes = {}
    api_error = None
    api_source = None
    
    # Method 0: Try TMAPI first (works for ANY product!)
    tmapi_token = os.environ.get("TMAPI_TOKEN", "")
    if tmapi_token:
        try:
            url = f"http://api.tmapi.top/1688/item_detail"
            params = {
                "apiToken": tmapi_token,
                "item_id": product_id,
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                result = response.json()
                
                if result.get("code") == 200 and result.get("data"):
                    data = result["data"]
                    sku_list = data.get("skus", [])
                    
                    for sku in sku_list:
                        # Parse props_names like "颜色:黑色;尺码:46"
                        props_names = sku.get("props_names", "")
                        attrs = {}
                        if props_names:
                            for prop in props_names.split(";"):
                                if ":" in prop:
                                    name, value = prop.split(":", 1)
                                    attrs[name.strip()] = value.strip()
                                    
                                    # Build attributes dict for filtering
                                    if name.strip() not in attributes:
                                        attributes[name.strip()] = []
                                    if value.strip() not in attributes[name.strip()]:
                                        attributes[name.strip()].append(value.strip())
                        
                        sku_data = {
                            "specId": sku.get("specid"),
                            "skuId": sku.get("skuid"),
                            "price": sku.get("sale_price"),
                            "stock": sku.get("stock", 0),
                            "color": attrs.get("颜色") or attrs.get("color") or attrs.get("Color"),
                            "size": attrs.get("尺码") or attrs.get("size") or attrs.get("Size") or attrs.get("码数"),
                            "props_names": props_names,
                        }
                        
                        if sku_data["specId"]:
                            skus.append(sku_data)
                    
                    if skus:
                        api_source = "tmapi"
                        print(f"[TMAPI] Got {len(skus)} SKUs for {product_id}")
                        return {
                            "success": True,
                            "product_id": product_id,
                            "skus": skus,
                            "attributes": attributes,
                            "source": api_source,
                        }
        except Exception as e:
            print(f"[TMAPI] SKU fetch error for {product_id}: {e}")
    
    # Method 1: Try alibaba.product.simple.get (Buyer API - works for merchants you've purchased from)
    try:
        params = {
            "productID": int(product_id),
            "webSite": "1688",
        }
        
        result = await make_api_request(
            "com.alibaba.product/alibaba.product.simple.get",
            params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        print(f"alibaba.product.simple.get response for {product_id}: {json.dumps(result, ensure_ascii=False)[:1000]}")
        
        # Parse the product info to extract SKUs
        product_info = result.get("productInfo") or result.get("result") or result
        
        if isinstance(product_info, dict):
            sku_infos = product_info.get("skuInfos") or []
            
            for sku in sku_infos:
                # Parse attributes from the SKU
                sku_attrs = []
                for attr in (sku.get("attributes") or []):
                    sku_attrs.append({
                        "attributeName": attr.get("attributeDisplayName") or attr.get("attributeName", ""),
                        "attributeValue": attr.get("attributeValue") or attr.get("customValueName", ""),
                    })
                
                sku_data = {
                    "specId": sku.get("specId"),
                    "skuId": sku.get("skuId"),
                    "price": sku.get("price") or sku.get("consignPrice") or sku.get("retailPrice"),
                    "stock": sku.get("amountOnSale"),
                    "skuCode": sku.get("skuCode") or sku.get("cargoNumber"),
                    "attributes": sku_attrs,
                }
                if sku_data["specId"]:
                    skus.append(sku_data)
            
            # Get product attributes
            for attr in (product_info.get("attributes") or []):
                attr_name = attr.get("attributeName", "")
                attr_value = attr.get("value", "")
                if attr_name:
                    if attr_name not in attributes:
                        attributes[attr_name] = []
                    if attr_value:
                        attributes[attr_name].append(attr_value)
            
            if skus:
                api_source = "alibaba.product.simple.get"
                print(f"Found {len(skus)} SKUs via alibaba.product.simple.get")
                    
    except Exception as e:
        api_error = str(e)
        print(f"alibaba.product.simple.get failed for {product_id}: {api_error}")
    
    # Method 2: Try alibaba.product.get API (official product API - for sellers)
    if not skus:
        try:
            params = {
                "productID": int(product_id),
                "webSite": "1688",
            }
            
            result = await make_api_request(
                "com.alibaba.product/alibaba.product.get",
                params,
                access_token=ALIBABA_ACCESS_TOKEN
            )
            
            print(f"alibaba.product.get response for {product_id}: {json.dumps(result, ensure_ascii=False)[:500]}")
            
            product_info = result.get("productInfo") or result.get("result") or result
            
            if isinstance(product_info, dict):
                sku_infos = product_info.get("skuInfos") or []
                
                for sku in sku_infos:
                    sku_attrs = []
                    for attr in (sku.get("attributes") or []):
                        sku_attrs.append({
                            "attributeName": attr.get("attributeDisplayName") or attr.get("attributeName", ""),
                            "attributeValue": attr.get("attributeValue") or attr.get("customValueName", ""),
                        })
                    
                    sku_data = {
                        "specId": sku.get("specId"),
                        "skuId": sku.get("skuId"),
                        "price": sku.get("price") or sku.get("consignPrice") or sku.get("retailPrice"),
                        "stock": sku.get("amountOnSale"),
                        "skuCode": sku.get("skuCode") or sku.get("cargoNumber"),
                        "attributes": sku_attrs,
                    }
                    if sku_data["specId"]:
                        skus.append(sku_data)
                
                if skus:
                    api_source = "alibaba.product.get"
                    print(f"Found {len(skus)} SKUs via alibaba.product.get")
                        
        except Exception as e:
            if not api_error:
                api_error = str(e)
            print(f"alibaba.product.get failed for {product_id}: {e}")
    
    # Method 3: Try cross-border API
    if not skus:
        try:
            params = {
                "offerId": product_id,
            }
            
            result = await make_api_request(
                "com.alibaba.product/alibaba.cross.syncProductInfo",
                params,
                access_token=ALIBABA_ACCESS_TOKEN
            )
            
            product_info = result.get("result") or result
            
            if isinstance(product_info, dict):
                sku_infos = product_info.get("skuInfos") or product_info.get("skus") or []
                
                for sku in sku_infos:
                    sku_data = {
                        "specId": sku.get("specId") or sku.get("skuId"),
                        "price": sku.get("price") or sku.get("consignPrice"),
                        "stock": sku.get("amountOnSale") or sku.get("canBookCount"),
                        "attributes": sku.get("attributes") or [],
                    }
                    if sku_data["specId"]:
                        skus.append(sku_data)
                
                if skus:
                    api_source = "alibaba.cross.syncProductInfo"
                        
        except Exception as e:
            if not api_error:
                api_error = str(e)
            print(f"cross.syncProductInfo also failed for {product_id}: {e}")
    
    # If API didn't return SKUs, try HTML scraping
    if not skus:
        print(f"Falling back to HTML scraping for product {product_id}")
        scraped = await scrape_product_skus_from_html(product_id)
        skus = scraped.get('skus', [])
        attributes = scraped.get('attributes', {}) or attributes
        if skus:
            api_source = "html_scrape"
    
    return {
        "success": True,
        "product_id": product_id,
        "skus": skus,
        "attributes": attributes,
        "message": f"SKUs fetched via {api_source}" if skus else "Could not fetch SKUs - enter size/color manually",
        "source": api_source or "none",
        "api_error": api_error,
    }


class CreatePurchaseOrderRequest(BaseModel):
    product_id: str = Field(..., description="1688 product ID")
    quantity: int = Field(1, ge=1, description="Quantity to order")
    size: Optional[str] = Field(None, description="Product size")
    color: Optional[str] = Field(None, description="Product color")
    spec_id: Optional[str] = Field(None, description="1688 SKU/specId for specific variant")
    shopify_order_id: Optional[str] = Field(None, description="Related Shopify order ID")
    sku: Optional[str] = Field(None, description="Shopify SKU for this line item")
    product_name: Optional[str] = Field(None, description="Product name for this line item")
    notes: Optional[str] = Field(None, description="Order notes")
    account_id: Optional[str] = Field(None, description="1688 account ID to use for ordering")


@router.post("/create-purchase-order")
async def create_purchase_order(request: CreatePurchaseOrderRequest):
    """
    Create a purchase order on 1688 for a product
    Uses the alibaba.trade.fastCreateOrder API
    Optionally uses a specific 1688 account if account_id is provided
    """
    db = get_db()
    
    # Determine which access token to use
    access_token = ALIBABA_ACCESS_TOKEN
    account_name = "Default"
    
    # If account_id is provided, look up the account's access token
    if request.account_id:
        account = await db.alibaba_1688_accounts.find_one({"account_id": request.account_id})
        if account and account.get("access_token"):
            access_token = account["access_token"]
            account_name = account.get("account_name", account.get("member_id", request.account_id))
            print(f"[1688 Order] Using account: {account_name}")
        else:
            return {
                "success": False,
                "error": "Account not found or no access token",
                "message": f"Could not find 1688 account with ID: {request.account_id}"
            }
    
    if not access_token:
        return {
            "success": False,
            "error": "No access token configured",
            "message": "Please configure 1688 access token or add an account"
        }
    
    try:
        # First, get the shipping address
        address_result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.receiveAddress.get",
            {},
            access_token=access_token
        )
        
        # Handle nested response structure
        result_data = address_result.get("result", {})
        addresses = result_data.get("receiveAddressItems", [])
        
        if not addresses:
            return {
                "success": False,
                "error": "No shipping address configured",
                "message": f"Please add a shipping address on 1688 for account: {account_name}"
            }
        
        default_address = addresses[0]
        address_id = default_address.get("id") or default_address.get("addressId")
        
        if not address_id:
            return {
                "success": False,
                "error": "Could not find address ID",
                "message": "Invalid address configuration on 1688"
            }
        
        # Build cargo list - the products to order
        cargo = {
            "offerId": int(request.product_id),
            "quantity": float(request.quantity),
        }
        
        # Add specId if provided (required for variants with size/color)
        if request.spec_id:
            cargo["specId"] = request.spec_id
        
        # Build order notes
        order_notes = request.notes or ""
        if request.size:
            order_notes += f" | Size: {request.size}"
        if request.color:
            order_notes += f" | Color: {request.color}"
        
        # Create order params
        create_params = {
            "addressParam": json.dumps({"addressId": int(address_id)}),
            "cargoParamList": json.dumps([cargo]),
            "flow": "general",
            "message": order_notes.strip() if order_notes.strip() else f"Order for product {request.product_id}",
        }
        
        # Create the order using the selected account's access token
        create_result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.fastCreateOrder",
            create_params,
            access_token=access_token  # Use the selected account's token
        )
        
        alibaba_order_id = None
        if create_result.get("result"):
            alibaba_order_id = create_result["result"].get("orderId")
        if not alibaba_order_id:
            alibaba_order_id = create_result.get("orderId")
        
        if alibaba_order_id:
            # Save to database for tracking
            order_record = {
                "alibaba_order_id": str(alibaba_order_id),
                "product_id": request.product_id,
                "quantity": request.quantity,
                "size": request.size,
                "color": request.color,
                "shopify_order_id": request.shopify_order_id,
                "shopify_order_number": request.shopify_order_id,  # Also store as order_number
                "sku": request.sku if hasattr(request, 'sku') else None,
                "product_name": request.product_name if hasattr(request, 'product_name') else None,
                "notes": request.notes,
                "account_id": request.account_id,
                "account_name": account_name,
                "status": "created",
                "api_response": create_result,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.purchase_orders_1688.insert_one(order_record)
            
            # Also update the customers collection with line_item_orders for per-SKU tracking
            line_item_order = {
                "alibaba_order_id": str(alibaba_order_id),
                "product_id": request.product_id,
                "sku": request.sku if hasattr(request, 'sku') else None,
                "product_name": request.product_name if hasattr(request, 'product_name') else None,
                "size": request.size,
                "color": request.color,
                "quantity": request.quantity,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            
            # Update the customer/order record with this line item order
            await db.customers.update_one(
                {"$or": [
                    {"shopify_order_id": request.shopify_order_id},
                    {"order_number": request.shopify_order_id},
                    {"order_number": str(request.shopify_order_id)},
                ]},
                {
                    "$push": {"line_item_orders": line_item_order},
                    "$set": {"order_1688_id": str(alibaba_order_id)}  # Keep legacy field for backward compatibility
                }
            )
            
            return {
                "success": True,
                "message": f"Order created on 1688 via account: {account_name}",
                "alibaba_order_id": str(alibaba_order_id),
                "product_id": request.product_id,
                "quantity": request.quantity,
                "account_used": account_name,
            }
        else:
            # Order creation failed
            error_msg = create_result.get("message") or create_result.get("errorMessage") or create_result.get("error_message") or "Unknown error"
            error_code = create_result.get("code") or create_result.get("errorCode") or create_result.get("error_code")
            
            return {
                "success": False,
                "error": error_msg,
                "error_code": error_code,
                "message": f"Failed to create order: {error_msg}",
                "api_response": create_result,
            }
            
    except HTTPException as e:
        return {
            "success": False,
            "error": str(e.detail),
            "message": "API error - try ordering manually on 1688.com"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to create order - try ordering manually on 1688.com"
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


@router.post("/sync-products-from-orders")
async def sync_products_from_orders():
    """
    Sync all products from your 1688 order history to the catalog
    This extracts product info from orders you've placed
    """
    db = get_db()
    
    try:
        # Fetch all orders
        all_products = {}
        page = 1
        page_size = 50
        
        while page <= 20:  # Limit to 20 pages (1000 orders max)
            params = {
                "pageNo": str(page),
                "pageSize": str(page_size),
            }
            
            result = await make_api_request(
                "com.alibaba.trade/alibaba.trade.getBuyerOrderList",
                params,
                access_token=ALIBABA_ACCESS_TOKEN
            )
            
            orders = result.get("result", [])
            if isinstance(orders, dict):
                orders = orders.get("result", []) or []
            
            if not orders:
                break
            
            # Extract products from each order
            for order in orders:
                product_items = order.get("productItems", [])
                for item in product_items:
                    product_id = str(item.get("productID") or item.get("productId", ""))
                    if not product_id or product_id in all_products:
                        continue
                    
                    # Extract product details from order
                    all_products[product_id] = {
                        "product_id": product_id,
                        "title": item.get("name") or item.get("productName"),
                        "price": item.get("itemAmount") or item.get("price"),
                        "unit_price": item.get("price"),
                        "quantity": item.get("quantity"),
                        "sku_id": item.get("skuID") or item.get("specId"),
                        "sku_info": item.get("productCargoNumber") or item.get("skuInfos"),
                        "image": item.get("productImgUrl", [None])[0] if isinstance(item.get("productImgUrl"), list) else item.get("productImgUrl"),
                        "supplier": order.get("sellerContact", {}).get("companyName") or order.get("sellerLoginId"),
                        "supplier_id": order.get("sellerMemberId") or order.get("sellerLoginId"),
                    }
            
            if len(orders) < page_size:
                break
            page += 1
        
        # Save products to catalog
        saved_count = 0
        for product_id, product in all_products.items():
            catalog_item = {
                "id": f"1688_{product_id}",
                "source": "1688",
                "source_id": product_id,
                "source_url": f"https://detail.1688.com/offer/{product_id}.html",
                "title": product.get("title"),
                "price": product.get("unit_price") or product.get("price"),
                "price_info": {"price": product.get("unit_price")},
                "images": [product.get("image")] if product.get("image") else [],
                "sku_id": product.get("sku_id"),
                "sku_info": product.get("sku_info"),
                "shop_info": {
                    "name": product.get("supplier"),
                    "id": product.get("supplier_id"),
                },
                "min_order": 1,
                "synced_at": datetime.now(timezone.utc).isoformat(),
                "entry_method": "order_history_sync",
            }
            
            await db.product_catalog_1688.update_one(
                {"source_id": product_id},
                {"$set": catalog_item},
                upsert=True
            )
            saved_count += 1
        
        return {
            "success": True,
            "message": f"Synced {saved_count} products from order history",
            "total_products": len(all_products),
            "saved": saved_count,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to sync products from orders",
        }


@router.post("/auto-order-from-shopify")
async def auto_order_from_shopify(
    shopify_order_id: str = Body(..., embed=True),
    store_name: Optional[str] = Body(None, embed=True)
):
    """
    Automatically create a 1688 purchase order from a Shopify order
    Matches products and creates the order on 1688
    """
    db = get_db()
    
    # Build query - always include store_name if provided to avoid cross-store issues
    query = {"shopify_order_id": shopify_order_id}
    if store_name:
        query["store_name"] = store_name
    
    # Get Shopify order
    shopify_order = await db.customers.find_one(query, {"_id": 0})
    
    if not shopify_order:
        # Try alternate field name for backwards compatibility
        query_alt = {"order_id": shopify_order_id}
        if store_name:
            query_alt["store_name"] = store_name
        shopify_order = await db.customers.find_one(query_alt, {"_id": 0})
    
    if not shopify_order:
        raise HTTPException(status_code=404, detail="Shopify order not found")
    
    # Get shipping addresses from 1688
    try:
        address_result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.receiveAddress.get",
            {},
            access_token=ALIBABA_ACCESS_TOKEN
        )
        addresses = address_result.get("result", {}).get("receiveAddressItems", [])
        default_address = addresses[0] if addresses else None
    except:
        default_address = None
    
    # Find matching 1688 products in catalog
    line_items = shopify_order.get("line_items", [])
    matched_items = []
    unmatched_items = []
    
    for item in line_items:
        product_title = item.get("title", "")
        sku = item.get("sku", "")
        
        # Try to find matching product in 1688 catalog
        query = {"$or": []}
        if product_title:
            query["$or"].append({"title": {"$regex": product_title[:20], "$options": "i"}})
        if sku:
            query["$or"].append({"sku_id": sku})
            query["$or"].append({"sku_info": {"$regex": sku, "$options": "i"}})
        
        if not query["$or"]:
            unmatched_items.append(item)
            continue
            
        catalog_match = await db.product_catalog_1688.find_one(query, {"_id": 0})
        
        if catalog_match:
            matched_items.append({
                "shopify_item": item,
                "catalog_item": catalog_match,
                "product_id": catalog_match.get("source_id"),
                "sku_id": catalog_match.get("sku_id"),
                "quantity": item.get("quantity", 1),
            })
        else:
            unmatched_items.append(item)
    
    if not matched_items:
        return {
            "success": False,
            "message": "No matching 1688 products found in catalog",
            "unmatched_items": [{"title": i.get("title"), "sku": i.get("sku")} for i in unmatched_items],
            "suggestion": "Please sync products from your 1688 orders first using /api/1688/sync-products-from-orders",
        }
    
    # Build 1688 order
    try:
        # Prepare cargo list (items to order)
        cargo_list = []
        for match in matched_items:
            cargo = {
                "offerId": int(match["product_id"]),
                "quantity": float(match["quantity"]),
            }
            if match.get("sku_id"):
                cargo["specId"] = match["sku_id"]
            cargo_list.append(cargo)
        
        # Prepare address
        if default_address:
            address_param = {
                "addressId": default_address.get("addressId"),
            }
        else:
            # Use Shopify shipping address
            address_param = {
                "fullName": f"{shopify_order.get('first_name', '')} {shopify_order.get('last_name', '')}".strip(),
                "mobile": shopify_order.get("phone", ""),
                "phone": shopify_order.get("phone", ""),
                "postCode": shopify_order.get("zip", ""),
                "cityText": shopify_order.get("city", ""),
                "provinceText": shopify_order.get("province", ""),
                "areaText": shopify_order.get("district", ""),
                "address": shopify_order.get("address", ""),
            }
        
        # Preview the order first
        preview_params = {
            "addressParam": json.dumps(address_param),
            "cargoParamList": json.dumps(cargo_list),
            "flow": "general",
        }
        
        preview_result = await make_api_request(
            "com.alibaba.trade/alibaba.createOrder.preview",
            preview_params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        if preview_result.get("error_code"):
            return {
                "success": False,
                "message": f"Order preview failed: {preview_result.get('error_message')}",
                "matched_items": len(matched_items),
            }
        
        # Create the actual order
        create_params = {
            "addressParam": json.dumps(address_param),
            "cargoParamList": json.dumps(cargo_list),
            "flow": "general",
            "message": f"Shopify Order: {shopify_order.get('order_number', shopify_order_id)}",
        }
        
        create_result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.fastCreateOrder",
            create_params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        if create_result.get("error_code"):
            return {
                "success": False,
                "message": f"Order creation failed: {create_result.get('error_message')}",
                "preview_success": True,
            }
        
        # Extract order ID
        alibaba_order_id = create_result.get("result", {}).get("orderId") or create_result.get("orderId")
        
        # Save to fulfillment pipeline
        fulfillment_record = {
            "shopify_order_id": shopify_order_id,
            "order_number": shopify_order.get("order_number"),
            "store_name": shopify_order.get("store_name"),  # Include store for proper filtering
            "alibaba_order_id": str(alibaba_order_id),
            "status": "purchased",
            "stages": {
                "shopify_received": True,
                "alibaba_purchased": True,
                "alibaba_shipped": False,
                "dwz56_received": False,
                "dwz56_shipped": False,
            },
            "matched_items": len(matched_items),
            "unmatched_items": len(unmatched_items),
            "customer": {
                "name": f"{shopify_order.get('first_name', '')} {shopify_order.get('last_name', '')}".strip(),
                "phone": shopify_order.get("phone"),
            },
            "shipping_address": {
                "address": shopify_order.get("address"),
                "city": shopify_order.get("city"),
                "province": shopify_order.get("province"),
                "country": shopify_order.get("country"),
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await db.fulfillment_pipeline.update_one(
            {"shopify_order_id": shopify_order_id, "store_name": shopify_order.get("store_name")},
            {"$set": fulfillment_record},
            upsert=True
        )
        
        # Update Shopify order status - use correct field and include store_name
        await db.customers.update_one(
            {"shopify_order_id": shopify_order_id, "store_name": shopify_order.get("store_name")},
            {"$set": {
                "alibaba_order_id": str(alibaba_order_id),
                "purchase_status": "ordered_on_1688",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        # Get payment link
        payment_url = None
        try:
            payment_params = {"orderIdList": json.dumps([alibaba_order_id])}
            payment_result = await make_api_request(
                "com.alibaba.trade/alibaba.alipay.url.get",
                payment_params,
                access_token=ALIBABA_ACCESS_TOKEN
            )
            payment_url = payment_result.get("result", {}).get("payUrl") or payment_result.get("payUrl")
        except:
            pass
        
        return {
            "success": True,
            "message": "1688 order created successfully!",
            "alibaba_order_id": alibaba_order_id,
            "payment_url": payment_url,
            "matched_items": len(matched_items),
            "unmatched_items": len(unmatched_items),
            "order_details": create_result.get("result"),
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to create 1688 order",
            "matched_items": len(matched_items),
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
    store_name: Optional[str] = Query(None),
    linked_only: bool = Query(True, description="Only show orders linked to Shopify"),
):
    """
    List purchase orders created on 1688 with fulfillment data
    Includes: supplier fulfillment status, DWZ tracking number
    By default, only shows orders linked to a Shopify order
    """
    db = get_db()
    
    query = {}
    
    # By default, only show linked orders (orders with shopify_order_number)
    if linked_only:
        query["$and"] = [
            {"$or": [
                {"shopify_order_number": {"$exists": True, "$ne": None, "$ne": ""}},
                {"shopify_order_id": {"$exists": True, "$ne": None, "$ne": ""}}
            ]}
        ]
    
    if status:
        query["status"] = status
    if shopify_order_id:
        # Search by both shopify_order_id AND shopify_order_number to handle both formats
        shopify_query = [
            {"shopify_order_id": shopify_order_id},
            {"shopify_order_number": shopify_order_id},
            {"shopify_order_number": int(shopify_order_id) if shopify_order_id.isdigit() else shopify_order_id}
        ]
        if "$and" in query:
            query["$and"].append({"$or": shopify_query})
        else:
            query["$or"] = shopify_query
    if store_name:
        query["store_name"] = store_name
    
    skip = (page - 1) * page_size
    
    orders = await db.purchase_orders_1688.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    # Enrich orders with fulfillment data
    enriched_orders = []
    for order in orders:
        enriched = dict(order)
        
        # FIRST: Use dwz_tracking directly from the order document if it exists
        # This field is set by the /place-order-from-1688 endpoint
        dwz_tracking_from_order = order.get("dwz_tracking") or order.get("dwz_waybill")
        
        # Try to find fulfillment pipeline data
        pipeline_data = await db.fulfillment_pipeline.find_one(
            {"$or": [
                {"alibaba_order_id": order.get("alibaba_order_id")},
                {"shopify_order_id": order.get("shopify_order_id")},
                {"order_number": order.get("shopify_order_id")},
            ]},
            {"_id": 0}
        )
        
        if pipeline_data:
            # Add fulfillment data
            enriched["supplier_status"] = pipeline_data.get("alibaba_status") or pipeline_data.get("status")
            enriched["supplier_tracking"] = pipeline_data.get("alibaba_tracking")
            enriched["supplier_carrier"] = pipeline_data.get("alibaba_carrier")
            # Use order's dwz_tracking first, fallback to pipeline data
            enriched["dwz_tracking"] = dwz_tracking_from_order or pipeline_data.get("dwz56_tracking")
            enriched["dwz_status"] = pipeline_data.get("dwz_status")
            enriched["stages"] = pipeline_data.get("stages", {})
        else:
            # Use order's own fields first
            enriched["supplier_status"] = order.get("supplier_status")
            enriched["supplier_tracking"] = order.get("supplier_tracking")
            enriched["dwz_tracking"] = dwz_tracking_from_order
            enriched["dwz_status"] = order.get("dwz_status")
            enriched["stages"] = {}
        
        # Also check customers collection for additional order info
        customer_data = await db.customers.find_one(
            {"$or": [
                {"shopify_order_id": order.get("shopify_order_id")},
                {"order_number": order.get("shopify_order_id")},
            ]},
            {"_id": 0, "order_number": 1, "fulfillment_status": 1, "tracking_number": 1}
        )
        
        if customer_data:
            # IMPORTANT: Do NOT overwrite shopify_order_number from purchase order with customer data
            # The purchase order's shopify_order_number is the authoritative source
            # Only use customer data to fill in missing values
            if not enriched.get("shopify_order_number"):
                enriched["shopify_order_number"] = customer_data.get("order_number")
            enriched["shopify_fulfillment_status"] = customer_data.get("fulfillment_status")
            if not enriched.get("dwz_tracking"):
                enriched["dwz_tracking"] = customer_data.get("tracking_number")
        
        enriched_orders.append(enriched)
    
    total = await db.purchase_orders_1688.count_documents(query)
    
    return {
        "success": True,
        "page": page,
        "page_size": page_size,
        "total": total,
        "orders": enriched_orders,
    }


class Link1688OrderRequest(BaseModel):
    shopify_order_number: str = Field(..., description="Shopify order number (e.g., 29160)")
    alibaba_order_id: str = Field(..., description="1688 order ID")
    store_name: str = Field(default="tnvcollection")
    alibaba_status: Optional[str] = Field(default="ordered", description="Status: ordered, paid, shipped, received")
    notes: Optional[str] = None


@router.post("/link-order")
async def link_1688_order_to_shopify(request: Link1688OrderRequest):
    """
    Manually link an existing 1688 order to a Shopify order.
    Use this when you've already placed orders on 1688 and want to track them.
    """
    db = get_db()
    
    # Find the Shopify order in customers collection
    shopify_order = await db.customers.find_one({
        "store_name": request.store_name,
        "order_number": request.shopify_order_number,
    }, {"_id": 0})
    
    if not shopify_order:
        # Try as string comparison
        shopify_order = await db.customers.find_one({
            "store_name": request.store_name,
            "order_number": str(request.shopify_order_number),
        }, {"_id": 0})
    
    if not shopify_order:
        raise HTTPException(status_code=404, detail=f"Shopify order #{request.shopify_order_number} not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update or create fulfillment pipeline entry
    pipeline_update = {
        "$set": {
            "alibaba_order_id": request.alibaba_order_id,
            "alibaba_status": request.alibaba_status,
            "current_stage": "alibaba_ordered" if request.alibaba_status in ["ordered", "paid"] else "alibaba_shipped",
            "updated_at": now,
            "linked_manually": True,
            "link_notes": request.notes,
        },
        "$setOnInsert": {
            "shopify_order_id": shopify_order.get("shopify_order_id"),
            "order_number": request.shopify_order_number,
            "customer_name": f"{shopify_order.get('first_name', '')} {shopify_order.get('last_name', '')}".strip(),
            "customer_phone": shopify_order.get("phone"),
            "store_name": request.store_name,
            "created_at": now,
            "line_items": shopify_order.get("line_items", []),
            "total_price": shopify_order.get("total_price") or shopify_order.get("total_spent"),
        }
    }
    
    # Set stage date
    stage_key = f"stage_dates.alibaba_ordered"
    if request.alibaba_status == "shipped":
        stage_key = f"stage_dates.alibaba_shipped"
    pipeline_update["$set"][stage_key] = now
    
    await db.fulfillment_pipeline.update_one(
        {"order_number": request.shopify_order_number, "store_name": request.store_name},
        pipeline_update,
        upsert=True
    )
    
    # Also create entry in purchase_orders_1688 collection
    purchase_order = {
        "alibaba_order_id": request.alibaba_order_id,
        "shopify_order_id": shopify_order.get("shopify_order_id"),
        "shopify_order_number": request.shopify_order_number,
        "store_name": request.store_name,
        "status": request.alibaba_status,
        "customer_name": f"{shopify_order.get('first_name', '')} {shopify_order.get('last_name', '')}".strip(),
        "line_items": shopify_order.get("line_items", []),
        "total_price": shopify_order.get("total_price") or shopify_order.get("total_spent"),
        "created_at": now,
        "updated_at": now,
        "linked_manually": True,
        "notes": request.notes,
    }
    
    await db.purchase_orders_1688.update_one(
        {"alibaba_order_id": request.alibaba_order_id},
        {"$set": purchase_order},
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Linked 1688 order {request.alibaba_order_id} to Shopify order #{request.shopify_order_number}",
        "shopify_order": request.shopify_order_number,
        "alibaba_order": request.alibaba_order_id,
        "status": request.alibaba_status,
    }


class BulkLink1688OrdersRequest(BaseModel):
    orders: List[dict] = Field(..., description="List of {shopify_order_number, alibaba_order_id, status}")
    store_name: str = Field(default="tnvcollection")


@router.post("/link-orders-bulk")
async def bulk_link_1688_orders(request: BulkLink1688OrdersRequest):
    """
    Bulk link multiple 1688 orders to Shopify orders.
    
    Example body:
    {
        "store_name": "tnvcollection",
        "orders": [
            {"shopify_order_number": "29160", "alibaba_order_id": "1234567890", "status": "shipped"},
            {"shopify_order_number": "29161", "alibaba_order_id": "1234567891", "status": "paid"}
        ]
    }
    """
    results = []
    success_count = 0
    error_count = 0
    
    for order_link in request.orders:
        try:
            link_request = Link1688OrderRequest(
                shopify_order_number=str(order_link.get("shopify_order_number")),
                alibaba_order_id=str(order_link.get("alibaba_order_id")),
                store_name=request.store_name,
                alibaba_status=order_link.get("status", "ordered"),
                notes=order_link.get("notes"),
            )
            result = await link_1688_order_to_shopify(link_request)
            results.append({"success": True, **order_link})
            success_count += 1
        except Exception as e:
            results.append({"success": False, "error": str(e), **order_link})
            error_count += 1
    
    return {
        "success": True,
        "message": f"Linked {success_count} orders, {error_count} errors",
        "success_count": success_count,
        "error_count": error_count,
        "results": results,
    }


@router.post("/purchase-orders/{alibaba_order_id}/link-shopify")
async def link_purchase_order_to_shopify(alibaba_order_id: str, data: dict = Body(...)):
    """
    Link an existing 1688 purchase order to a Shopify order number.
    
    Body:
    {
        "shopify_order_number": "29160"
    }
    """
    db = get_db()
    shopify_order_number = data.get("shopify_order_number")
    
    if not shopify_order_number:
        raise HTTPException(status_code=400, detail="shopify_order_number is required")
    
    # Find the purchase order
    purchase_order = await db.purchase_orders_1688.find_one(
        {"alibaba_order_id": alibaba_order_id}
    )
    
    if not purchase_order:
        raise HTTPException(status_code=404, detail=f"1688 order {alibaba_order_id} not found")
    
    # Update the purchase order with Shopify order number
    now = datetime.now(timezone.utc).isoformat()
    update_result = await db.purchase_orders_1688.update_one(
        {"alibaba_order_id": alibaba_order_id},
        {"$set": {
            "shopify_order_id": str(shopify_order_number),
            "shopify_order_number": str(shopify_order_number),
            "updated_at": now,
            "linked_manually": True,
        }}
    )
    
    if update_result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update purchase order")
    
    return {
        "success": True,
        "message": f"Linked 1688 order {alibaba_order_id} to Shopify #{shopify_order_number}",
        "alibaba_order_id": alibaba_order_id,
        "shopify_order_number": shopify_order_number,
    }


@router.post("/purchase-orders/{alibaba_order_id}/sync-status")
async def sync_purchase_order_status(alibaba_order_id: str):
    """
    Sync shipping/fulfillment status from 1688 API for a specific order.
    Uses the logistics API to get tracking info and status.
    """
    db = get_db()
    
    # Find the purchase order
    purchase_order = await db.purchase_orders_1688.find_one(
        {"alibaba_order_id": alibaba_order_id}
    )
    
    if not purchase_order:
        raise HTTPException(status_code=404, detail=f"1688 order {alibaba_order_id} not found")
    
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="1688 API access token not configured")
    
    try:
        # Use logistics API to get shipping info
        params = {
            "orderId": alibaba_order_id,
            "webSite": "1688",
        }
        
        result = await make_api_request(
            "com.alibaba.logistics/alibaba.trade.getLogisticsInfos.buyerView",
            params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        logistics_list = result.get("result") or []
        
        # Determine status from logistics
        seller_tracking_number = None
        seller_courier_name = None
        supplier_status = purchase_order.get("supplier_status", "created")
        
        if logistics_list:
            first_logistics = logistics_list[0]
            seller_tracking_number = first_logistics.get("logisticsBillNo")
            seller_courier_name = first_logistics.get("logisticsCompanyName")
            logistics_status = first_logistics.get("status", "")
            
            # Map logistics status to supplier status
            if logistics_status == "SIGN":
                supplier_status = "delivered"
            elif logistics_status in ["SEND", "TRANSPORT", "DELIVERING"]:
                supplier_status = "shipped"
            elif seller_tracking_number:
                supplier_status = "shipped"
        
        # Update the database
        now = datetime.now(timezone.utc).isoformat()
        update_data = {
            "supplier_status": supplier_status,
            "status_synced_at": now,
            "updated_at": now,
        }
        
        if supplier_status in ["shipped", "delivered"]:
            update_data["status"] = "shipped"
        
        if seller_tracking_number:
            update_data["seller_tracking_number"] = seller_tracking_number
            update_data["seller_courier_name"] = seller_courier_name
        
        await db.purchase_orders_1688.update_one(
            {"alibaba_order_id": alibaba_order_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": f"Status synced for order {alibaba_order_id}",
            "alibaba_order_id": alibaba_order_id,
            "status": update_data.get("status", purchase_order.get("status")),
            "supplier_status": supplier_status,
            "is_shipped": supplier_status in ["shipped", "delivered"],
            "seller_tracking_number": seller_tracking_number,
            "seller_courier_name": seller_courier_name,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync status: {str(e)}")


@router.post("/purchase-orders/bulk-sync-tracking")
async def bulk_sync_seller_tracking():
    """
    Bulk sync seller tracking numbers from 1688 for all shipped orders.
    This fetches the logistics/tracking info from 1688 API and stores it locally.
    """
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="1688 API access token not configured")
    
    db = get_db()
    
    # Find all shipped orders that don't have seller tracking yet
    orders = await db.purchase_orders_1688.find({
        "status": "shipped",
        "$or": [
            {"seller_tracking_number": {"$exists": False}},
            {"seller_tracking_number": None},
            {"seller_tracking_number": ""},
        ]
    }).to_list(100)
    
    results = {
        "total_orders": len(orders),
        "synced": 0,
        "failed": 0,
        "details": []
    }
    
    for order in orders:
        alibaba_order_id = order.get("alibaba_order_id")
        shopify_order = order.get("shopify_order_number")
        
        try:
            # Fetch logistics from 1688
            logistics_params = {
                "orderId": alibaba_order_id,
                "webSite": "1688",
            }
            logistics_result = await make_api_request(
                "com.alibaba.logistics/alibaba.trade.getLogisticsInfos.buyerView",
                logistics_params,
                access_token=ALIBABA_ACCESS_TOKEN
            )
            
            logistics_list = logistics_result.get("result") or []
            
            if logistics_list:
                first_logistics = logistics_list[0]
                seller_tracking = first_logistics.get("logisticsBillNo")
                seller_courier = first_logistics.get("logisticsCompanyName")
                
                if seller_tracking:
                    # Update the order
                    await db.purchase_orders_1688.update_one(
                        {"alibaba_order_id": alibaba_order_id},
                        {"$set": {
                            "seller_tracking_number": seller_tracking,
                            "seller_courier_name": seller_courier,
                            "tracking_synced_at": datetime.now(timezone.utc).isoformat(),
                        }}
                    )
                    
                    results["synced"] += 1
                    results["details"].append({
                        "shopify_order": shopify_order,
                        "alibaba_order_id": alibaba_order_id,
                        "seller_tracking": seller_tracking,
                        "courier": seller_courier,
                        "status": "synced"
                    })
                else:
                    results["details"].append({
                        "shopify_order": shopify_order,
                        "alibaba_order_id": alibaba_order_id,
                        "status": "no_tracking_found"
                    })
            else:
                results["details"].append({
                    "shopify_order": shopify_order,
                    "alibaba_order_id": alibaba_order_id,
                    "status": "no_logistics_data"
                })
                
        except Exception as e:
            results["failed"] += 1
            results["details"].append({
                "shopify_order": shopify_order,
                "alibaba_order_id": alibaba_order_id,
                "status": "error",
                "error": str(e)
            })
        
        # Small delay to avoid rate limiting
        import asyncio
        await asyncio.sleep(0.3)
    
    return {
        "success": True,
        "message": f"Synced {results['synced']} of {results['total_orders']} orders",
        **results
    }


@router.post("/purchase-orders/sync-logistics-status")
async def sync_logistics_status():
    """
    Sync logistics/delivery status from 1688 for all orders with seller tracking.
    Updates status to: in_transit, delivered, etc.
    """
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="1688 API access token not configured")
    
    db = get_db()
    
    # Find all orders that have seller tracking (to check their status)
    orders = await db.purchase_orders_1688.find({
        "seller_tracking_number": {"$exists": True, "$ne": None, "$ne": ""},
        # Only sync orders not yet delivered
        "supplier_status": {"$nin": ["delivered", "received"]}
    }).to_list(100)
    
    results = {
        "total_orders": len(orders),
        "in_transit": 0,
        "delivered": 0,
        "failed": 0,
        "no_update": 0,
        "details": []
    }
    
    for order in orders:
        alibaba_order_id = order.get("alibaba_order_id")
        shopify_order = order.get("shopify_order_number")
        current_status = order.get("supplier_status")
        seller_tracking = order.get("seller_tracking_number")
        
        try:
            # Fetch logistics from 1688
            logistics_params = {
                "orderId": alibaba_order_id,
                "webSite": "1688",
            }
            logistics_result = await make_api_request(
                "com.alibaba.logistics/alibaba.trade.getLogisticsInfos.buyerView",
                logistics_params,
                access_token=ALIBABA_ACCESS_TOKEN
            )
            
            logistics_list = logistics_result.get("result") or []
            
            if logistics_list:
                first_logistics = logistics_list[0]
                logistics_status = first_logistics.get("status", "")
                logistics_company = first_logistics.get("logisticsCompanyName", "")
                
                # Get detailed tracking steps if available
                logistics_steps = first_logistics.get("logisticsSteps") or []
                latest_step = logistics_steps[0] if logistics_steps else {}
                latest_desc = latest_step.get("remark", "") or latest_step.get("acceptAddress", "")
                latest_time = latest_step.get("acceptTime", "")
                
                # Map 1688 logistics status to our status
                # Common 1688 statuses: WAIT_SELLER_SEND, SEND, TRANSPORT, DELIVERING, SIGN
                new_status = current_status
                if logistics_status == "SIGN":
                    new_status = "delivered"
                    results["delivered"] += 1
                elif logistics_status in ["SEND", "TRANSPORT", "DELIVERING"]:
                    new_status = "in_transit"
                    results["in_transit"] += 1
                elif logistics_status == "WAIT_SELLER_SEND":
                    new_status = "pending_shipment"
                else:
                    new_status = logistics_status.lower() if logistics_status else current_status
                
                # Update the order
                update_data = {
                    "supplier_status": new_status,
                    "logistics_status": logistics_status,
                    "logistics_company": logistics_company,
                    "logistics_updated_at": datetime.now(timezone.utc).isoformat(),
                }
                
                if latest_desc:
                    update_data["latest_logistics_update"] = latest_desc
                if latest_time:
                    update_data["latest_logistics_time"] = latest_time
                
                await db.purchase_orders_1688.update_one(
                    {"alibaba_order_id": alibaba_order_id},
                    {"$set": update_data}
                )
                
                results["details"].append({
                    "shopify_order": shopify_order,
                    "alibaba_order_id": alibaba_order_id,
                    "seller_tracking": seller_tracking,
                    "old_status": current_status,
                    "new_status": new_status,
                    "logistics_status": logistics_status,
                    "latest_update": latest_desc[:50] if latest_desc else "",
                    "status": "updated"
                })
            else:
                results["no_update"] += 1
                results["details"].append({
                    "shopify_order": shopify_order,
                    "alibaba_order_id": alibaba_order_id,
                    "seller_tracking": seller_tracking,
                    "status": "no_logistics_data"
                })
                
        except Exception as e:
            results["failed"] += 1
            results["details"].append({
                "shopify_order": shopify_order,
                "alibaba_order_id": alibaba_order_id,
                "status": "error",
                "error": str(e)[:100]
            })
        
        await asyncio.sleep(0.3)  # Rate limiting
    
    return {
        "success": True,
        "message": f"Updated {results['in_transit'] + results['delivered']} orders: {results['in_transit']} in transit, {results['delivered']} delivered",
        **results
    }


@router.post("/purchase-orders/update-dwz-with-tracking")
async def update_dwz_remarks_with_seller_tracking():
    """
    Update DWZ shipment remarks with 1688 seller tracking numbers.
    Reads seller_tracking_number from purchase orders and updates DWZ cMemo field.
    """
    db = get_db()
    
    # Find orders that have both DWZ tracking and seller tracking
    orders = await db.purchase_orders_1688.find({
        "seller_tracking_number": {"$exists": True, "$ne": None, "$ne": ""},
        "dwz_tracking": {"$exists": True, "$ne": None, "$ne": ""},
    }).to_list(100)
    
    if not orders:
        return {
            "success": True,
            "message": "No orders found with both DWZ and seller tracking numbers",
            "updated": 0
        }
    
    # Import DWZ functions
    from routes.dwz56 import build_request_payload, make_api_request as dwz_make_request, DWZ56_API_URL
    import httpx
    
    results = {
        "total": len(orders),
        "updated": 0,
        "failed": 0,
        "details": []
    }
    
    for order in orders:
        dwz_tracking = order.get("dwz_tracking")
        seller_tracking = order.get("seller_tracking_number")
        seller_courier = order.get("seller_courier_name", "")
        shopify_order = order.get("shopify_order_number")
        
        try:
            # First, get the DWZ record ID by tracking number
            from routes.dwz56 import build_request_payload
            
            list_payload = build_request_payload("PreInputList", {
                "iPage": 1,
                "iPagePer": 100,
                "cqNum": dwz_tracking,
                "cqStateMask": "11",
            })
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    DWZ56_API_URL,
                    json=list_payload,
                    headers={"Content-Type": "application/json; charset=utf-8"}
                )
                data = response.json()
            
            records = data.get("RecList", [])
            
            if records:
                record = records[0]
                iID = record.get("iID")
                
                # Build new memo with seller tracking
                new_memo = f"1688 Tracking: {seller_tracking}"
                if seller_courier:
                    new_memo += f" ({seller_courier})"
                
                # Update the DWZ record
                update_payload = build_request_payload("PreInputSet", {
                    "RecList": [{"iID": iID, "cMemo": new_memo}]
                })
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    update_response = await client.post(
                        DWZ56_API_URL,
                        json=update_payload,
                        headers={"Content-Type": "application/json; charset=utf-8"}
                    )
                    update_data = update_response.json()
                
                if update_data.get("ReturnValue", -9) >= 0:
                    results["updated"] += 1
                    results["details"].append({
                        "shopify_order": shopify_order,
                        "dwz_tracking": dwz_tracking,
                        "seller_tracking": seller_tracking,
                        "memo": new_memo,
                        "status": "updated"
                    })
                else:
                    results["failed"] += 1
                    results["details"].append({
                        "shopify_order": shopify_order,
                        "dwz_tracking": dwz_tracking,
                        "status": "dwz_update_failed",
                        "error": f"ReturnValue: {update_data.get('ReturnValue')}"
                    })
            else:
                results["details"].append({
                    "shopify_order": shopify_order,
                    "dwz_tracking": dwz_tracking,
                    "status": "dwz_record_not_found"
                })
                
        except Exception as e:
            results["failed"] += 1
            results["details"].append({
                "shopify_order": shopify_order,
                "dwz_tracking": dwz_tracking,
                "status": "error",
                "error": str(e)
            })
        
        import asyncio
        await asyncio.sleep(0.3)
    
    return {
        "success": True,
        "message": f"Updated {results['updated']} of {results['total']} DWZ records with seller tracking",
        **results
    }


@router.post("/purchase-orders/update-dwz-remarks-by-shopify")
async def update_dwz_remarks_by_shopify_order():
    """
    Update DWZ shipment remarks with 1688 seller tracking numbers.
    Matches DWZ records by Shopify order number (from cBy1 field).
    """
    from routes.dwz56 import build_request_payload, DWZ56_API_URL
    import httpx
    
    db = get_db()
    
    # Get orders with seller tracking
    orders_with_tracking = await db.purchase_orders_1688.find({
        "seller_tracking_number": {"$exists": True, "$ne": None, "$ne": ""}
    }).to_list(100)
    
    # Create lookup by shopify order number
    tracking_lookup = {}
    for o in orders_with_tracking:
        shopify_num = o.get("shopify_order_number")
        if shopify_num:
            tracking_lookup[str(shopify_num)] = {
                "tracking": o.get("seller_tracking_number"),
                "courier": o.get("seller_courier_name", "")
            }
    
    if not tracking_lookup:
        return {
            "success": True,
            "message": "No orders found with seller tracking numbers",
            "updated": 0
        }
    
    # Get all DWZ records
    list_payload = build_request_payload("PreInputList", {
        "iPage": 1,
        "iPagePer": 100,
        "cqStateMask": "11",
    })
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                DWZ56_API_URL,
                json=list_payload,
                headers={"Content-Type": "application/json; charset=utf-8"}
            )
            data = response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch DWZ records: {str(e)}")
    
    dwz_records = data.get("RecList", [])
    
    results = {
        "tracking_in_db": len(tracking_lookup),
        "dwz_records": len(dwz_records),
        "updated": 0,
        "skipped": 0,
        "no_match": 0,
        "details": []
    }
    
    for record in dwz_records:
        cBy1 = record.get("cBy1", "") or ""
        if not cBy1.startswith("Shopify#"):
            continue
        
        shopify_num = cBy1.replace("Shopify#", "")
        
        if shopify_num not in tracking_lookup:
            results["no_match"] += 1
            continue
        
        tracking_info = tracking_lookup[shopify_num]
        seller_tracking = tracking_info["tracking"]
        courier = tracking_info["courier"]
        
        iID = record.get("iID")
        cNum = record.get("cNum", "")
        current_memo = record.get("cMemo", "") or ""
        
        # Skip if already has this tracking
        if seller_tracking in current_memo:
            results["skipped"] += 1
            continue
        
        # Skip cancelled
        if current_memo == "CANCELLED":
            results["skipped"] += 1
            continue
        
        # Build new memo - just the tracking number for simplicity
        new_memo = f"1688: {seller_tracking}"
        
        # Update DWZ record
        update_payload = build_request_payload("PreInputSet", {
            "RecList": [{"iID": iID, "cMemo": new_memo}]
        })
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                update_response = await client.post(
                    DWZ56_API_URL,
                    json=update_payload,
                    headers={"Content-Type": "application/json; charset=utf-8"}
                )
                update_data = update_response.json()
            
            if update_data.get("ReturnValue", -9) >= 0:
                results["updated"] += 1
                results["details"].append({
                    "dwz_tracking": cNum,
                    "shopify_order": shopify_num,
                    "seller_tracking": seller_tracking,
                    "status": "updated"
                })
            else:
                results["details"].append({
                    "dwz_tracking": cNum,
                    "shopify_order": shopify_num,
                    "status": "failed",
                    "error": f"ReturnValue: {update_data.get('ReturnValue')}"
                })
        except Exception as e:
            results["details"].append({
                "dwz_tracking": cNum,
                "shopify_order": shopify_num,
                "status": "error",
                "error": str(e)
            })
        
        import asyncio
        await asyncio.sleep(0.3)
    
    return {
        "success": True,
        "message": f"Updated {results['updated']} DWZ records with 1688 seller tracking",
        **results
    }


@router.post("/purchase-orders/link-item")
async def link_item_to_1688_order(data: dict = Body(...)):
    """
    Link a Shopify order line item to a 1688 order.
    Creates the 1688 order record if it doesn't exist, or updates if it does.
    
    Body:
    {
        "alibaba_order_id": "4993683410995978802",
        "shopify_order_number": "29245",
        "shopify_order_id": "optional",
        "product_id": "705489288334",
        "sku": "705489288334-black-42",
        "product_name": "Men's leather shoes...",
        "quantity": 1,
        "size": "42",
        "color": "black",
        "notes": "Optional notes",
        "customer_name": "Customer Name",
        "store_name": "tnvcollection"
    }
    """
    db = get_db()
    
    alibaba_order_id = data.get("alibaba_order_id")
    shopify_order_number = data.get("shopify_order_number")
    
    if not alibaba_order_id:
        raise HTTPException(status_code=400, detail="alibaba_order_id is required")
    if not shopify_order_number:
        raise HTTPException(status_code=400, detail="shopify_order_number is required")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if this 1688 order already exists
    existing = await db.purchase_orders_1688.find_one(
        {"alibaba_order_id": alibaba_order_id}
    )
    
    if existing:
        # Update existing record with Shopify link
        update_result = await db.purchase_orders_1688.update_one(
            {"alibaba_order_id": alibaba_order_id},
            {"$set": {
                "shopify_order_number": str(shopify_order_number),
                "shopify_order_id": data.get("shopify_order_id") or str(shopify_order_number),
                "updated_at": now,
                "linked_manually": True,
            }}
        )
        return {
            "success": True,
            "message": f"Updated existing 1688 order {alibaba_order_id} with Shopify link",
            "alibaba_order_id": alibaba_order_id,
            "shopify_order_number": shopify_order_number,
            "updated": True
        }
    
    # Create new 1688 order record
    new_order = {
        "alibaba_order_id": alibaba_order_id,
        "product_id": data.get("product_id", ""),
        "sku": data.get("sku", ""),
        "product_name": data.get("product_name", ""),
        "quantity": data.get("quantity", 1),
        "size": data.get("size", ""),
        "color": data.get("color", ""),
        "notes": data.get("notes", ""),
        "shopify_order_number": str(shopify_order_number),
        "shopify_order_id": data.get("shopify_order_id") or str(shopify_order_number),
        "customer_name": data.get("customer_name", ""),
        "store_name": data.get("store_name", "default"),
        "status": "created",
        "created_at": now,
        "updated_at": now,
        "linked_manually": True,
        "api_response": None,
    }
    
    await db.purchase_orders_1688.insert_one(new_order)
    
    return {
        "success": True,
        "message": f"Created new 1688 order record and linked to Shopify #{shopify_order_number}",
        "alibaba_order_id": alibaba_order_id,
        "shopify_order_number": shopify_order_number,
        "created": True
    }


@router.post("/purchase-orders/backfill-names")
async def backfill_product_names():
    """
    Backfill product_name for orders that have it empty.
    Tries to get name from:
    1. api_response.productItems[0].name (1688 API response)
    2. notes field
    """
    db = get_db()
    
    # Find orders with empty or missing product_name
    cursor = db.purchase_orders_1688.find(
        {"$or": [
            {"product_name": {"$exists": False}},
            {"product_name": None},
            {"product_name": ""},
        ]}
    )
    
    updated_count = 0
    orders_checked = 0
    
    async for order in cursor:
        orders_checked += 1
        alibaba_order_id = order.get("alibaba_order_id")
        product_name = None
        
        # Try to get from api_response
        api_response = order.get("api_response", {})
        if api_response:
            product_items = api_response.get("productItems", [])
            if product_items and len(product_items) > 0:
                product_name = product_items[0].get("name")
        
        # Fallback to notes
        if not product_name and order.get("notes"):
            product_name = order.get("notes")
        
        # Update if we found a name
        if product_name:
            await db.purchase_orders_1688.update_one(
                {"alibaba_order_id": alibaba_order_id},
                {"$set": {
                    "product_name": product_name,
                    "notes": product_name if not order.get("notes") else order.get("notes")
                }}
            )
            updated_count += 1
    
    return {
        "success": True,
        "message": f"Backfilled {updated_count} orders out of {orders_checked} checked",
        "updated_count": updated_count,
        "orders_checked": orders_checked
    }


# ==================== 1688 Order Fulfillment with Auto DWZ56 Shipment ====================

class Mark1688ShippedRequest(BaseModel):
    shopify_order_number: str = Field(..., description="Shopify order number")
    alibaba_order_id: str = Field(..., description="1688 order ID")
    fulfillment_number_1688: Optional[str] = Field(default=None, description="1688 fulfillment/tracking number from supplier")
    store_name: str = Field(default="tnvcollection")
    courier_type: Optional[str] = Field(default=None, description="DWZ56 courier type. Auto-detected based on store if not provided")
    estimated_weight: Optional[float] = Field(default=0.5, description="Estimated weight in kg")
    goods_description: Optional[str] = Field(default="Fashion items", description="Goods description for customs")
    color_override: Optional[str] = Field(default=None, description="Override color code (e.g., R, B, K)")
    size_override: Optional[str] = Field(default=None, description="Override size code (e.g., 42, SM, LG)")
    auto_create_dwz: bool = Field(default=True, description="Automatically create DWZ56 shipment")


# Store to courier type mapping
STORE_COURIER_MAP = {
    "tnvcollection": "印度专线",      # India
    "ashmiaa": "印度专线",            # India  
    "asmia": "印度专线",              # India
    "tnvcollectionpk": "巴基斯坦专线", # Pakistan
}

# Store to country code mapping
STORE_COUNTRY_CODE = {
    "tnvcollection": "IN",
    "ashmiaa": "IN",
    "asmia": "IN",
    "tnvcollectionpk": "PK",
}

# Color code mapping (color name -> single letter code)
COLOR_CODE_MAP = {
    "red": "R", "maroon": "R", "burgundy": "R", "wine": "R", "crimson": "R",
    "blue": "U", "navy": "U", "royal": "U", "cobalt": "U", "azure": "U",
    "black": "B", "charcoal": "B", "ebony": "B",
    "white": "W", "ivory": "W", "cream": "W", "off-white": "W",
    "green": "G", "olive": "G", "mint": "G", "sage": "G", "emerald": "G",
    "yellow": "Y", "gold": "Y", "mustard": "Y", "lemon": "Y",
    "pink": "P", "rose": "P", "blush": "P", "coral": "P", "salmon": "P",
    "purple": "V", "violet": "V", "lavender": "V", "plum": "V", "magenta": "V",
    "orange": "O", "tangerine": "O", "peach": "O", "rust": "O",
    "brown": "N", "tan": "N", "beige": "N", "camel": "N", "chocolate": "N", "coffee": "N",
    "grey": "E", "gray": "E", "silver": "E", "ash": "E",
    "multi": "M", "multicolor": "M", "print": "M", "pattern": "M",
}

# Chinese color mapping (1688 uses Chinese color names)
CHINESE_COLOR_MAP = {
    "红": ("R", "Red"), "红色": ("R", "Red"), "酒红": ("R", "Wine Red"), "暗红": ("R", "Dark Red"),
    "蓝": ("U", "Blue"), "蓝色": ("U", "Blue"), "深蓝": ("U", "Navy Blue"), "浅蓝": ("U", "Light Blue"),
    "黑": ("B", "Black"), "黑色": ("B", "Black"),
    "白": ("W", "White"), "白色": ("W", "White"), "米白": ("W", "Off-White"), "乳白": ("W", "Ivory"),
    "绿": ("G", "Green"), "绿色": ("G", "Green"), "墨绿": ("G", "Dark Green"), "浅绿": ("G", "Light Green"),
    "黄": ("Y", "Yellow"), "黄色": ("Y", "Yellow"), "金色": ("Y", "Gold"), "米黄": ("Y", "Beige Yellow"),
    "粉": ("P", "Pink"), "粉色": ("P", "Pink"), "粉红": ("P", "Pink"),
    "紫": ("V", "Purple"), "紫色": ("V", "Purple"),
    "橙": ("O", "Orange"), "橙色": ("O", "Orange"), "橘色": ("O", "Orange"),
    "棕": ("N", "Brown"), "棕色": ("N", "Brown"), "咖啡": ("N", "Coffee"), "卡其": ("N", "Khaki"), "驼色": ("N", "Camel"),
    "灰": ("E", "Grey"), "灰色": ("E", "Grey"), "银色": ("E", "Silver"),
    "彩": ("M", "Multi"), "花色": ("M", "Pattern"), "印花": ("M", "Print"),
}

# Reverse mapping: code -> display name (for remarks)
COLOR_CODE_TO_NAME = {
    "R": "Red", "U": "Blue", "B": "Black", "W": "White", "G": "Green",
    "Y": "Yellow", "P": "Pink", "V": "Purple", "O": "Orange", "N": "Brown",
    "E": "Grey", "M": "Multi", "X": "Unknown"
}


def extract_color_from_1688(color_1688: str) -> tuple:
    """
    Extract color code and display name from 1688 Chinese color.
    Returns (color_code, color_display_name) tuple.
    """
    if not color_1688:
        return "X", "Unknown"
    
    color_1688 = color_1688.strip()
    
    # Direct match in Chinese color map
    if color_1688 in CHINESE_COLOR_MAP:
        return CHINESE_COLOR_MAP[color_1688]
    
    # Partial match for compound colors like "黑色加绒"
    for chinese, (code, name) in CHINESE_COLOR_MAP.items():
        if chinese in color_1688:
            return code, name
    
    # If it's already in English, try English mapping
    color_lower = color_1688.lower()
    for eng_color, code in COLOR_CODE_MAP.items():
        if eng_color in color_lower:
            return code, eng_color.capitalize()
    
    # Return the original 1688 color as display name with unknown code
    return "X", color_1688


def extract_color_size_from_order(order: dict, purchase_order_1688: dict = None) -> tuple:
    """
    Extract color and size from order data.
    PRIORITY: 1688 purchase order data > Shopify order data
    
    Returns (color_code, size_code, color_name) tuple.
    """
    color_code = "X"  # Default unknown
    size_code = "00"  # Default unknown
    color_name = "Unknown"  # Full color name for remarks
    
    # PRIORITY 1: Get from 1688 purchase order (most accurate)
    if purchase_order_1688:
        color_1688 = purchase_order_1688.get("color", "")
        size_1688 = purchase_order_1688.get("size", "")
        
        if color_1688:
            color_code, color_name = extract_color_from_1688(color_1688)
        
        if size_1688:
            # Clean size value
            size_str = str(size_1688).strip()
            # Extract numeric part
            import re
            numbers = re.findall(r'\d+', size_str)
            if numbers:
                size_code = numbers[0].zfill(2)[-2:]
            elif size_str.upper() in ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]:
                size_map = {"XS": "XS", "S": "SM", "M": "MD", "L": "LG", "XL": "XL", "XXL": "2X", "XXXL": "3X"}
                size_code = size_map.get(size_str.upper(), size_str.upper()[:2])
        
        # If we got valid data from 1688, return it
        if color_code != "X" or size_code != "00":
            return color_code, size_code, color_name
    
    # PRIORITY 2: Fall back to Shopify order data
    line_items = order.get("line_items", [])
    if not line_items:
        # Try order-level fields
        order_skus = order.get("order_skus", [])
        shoe_sizes = order.get("shoe_sizes", [])
        if order_skus:
            # Parse SKU like "866 GREEN-41"
            sku = order_skus[0].lower()
            for cname, code in COLOR_CODE_MAP.items():
                if cname in sku:
                    color_code = code
                    color_name = cname.capitalize()
                    break
        if shoe_sizes and shoe_sizes[0]:
            size_code = str(shoe_sizes[0]).zfill(2)[-2:]
        return color_code, size_code, color_name
    
    first_item = line_items[0] if isinstance(line_items, list) else line_items
    
    # Try multiple fields: name, variant_title, title
    variant_info = first_item.get("name", "") or first_item.get("variant_title", "") or first_item.get("title", "")
    sku = first_item.get("sku", "")
    
    # Parse variant info (e.g., "866 green / 41" or "product - Red / 42")
    if variant_info:
        # Split by common delimiters
        parts = variant_info.replace("-", "/").replace(",", "/").split("/")
        for part in parts:
            part_lower = part.strip().lower()
            
            # Check for color
            if color_code == "X":
                for cname, code in COLOR_CODE_MAP.items():
                    if cname in part_lower:
                        color_code = code
                        color_name = cname.capitalize()
                        break
            
            # Check for size (number at end or standalone)
            part_stripped = part.strip()
            # Extract numbers from the part
            import re
            numbers = re.findall(r'\d+', part_stripped)
            if numbers:
                for num in numbers:
                    if 30 <= int(num) <= 50:  # Shoe sizes typically 30-50
                        size_code = num.zfill(2)[-2:]
                        break
                    elif 1 <= int(num) <= 10:  # Could be size 1-10
                        size_code = num.zfill(2)
                        break
            
            # Check letter sizes
            if part_stripped.upper() in ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]:
                size_map = {"XS": "XS", "S": "SM", "M": "MD", "L": "LG", "XL": "XL", "XXL": "2X", "XXXL": "3X"}
                size_code = size_map.get(part_stripped.upper(), part_stripped.upper()[:2])
    
    # Also try SKU (e.g., "866 green-41" or "739758517850-black-40")
    if sku and (color_code == "X" or size_code == "00"):
        sku_lower = sku.lower().replace("_", "-").replace(" ", "-")
        sku_parts = sku_lower.split("-")
        for part in sku_parts:
            if color_code == "X":
                for cname, code in COLOR_CODE_MAP.items():
                    if cname in part:
                        color_code = code
                        color_name = cname.capitalize()
                        break
            if size_code == "00" and part.isdigit():
                size_code = part.zfill(2)[-2:]
    
    # If color_name not found but code exists, use mapping
    if color_name == "Unknown" and color_code != "X":
        color_name = COLOR_CODE_TO_NAME.get(color_code, "Unknown")
    
    return color_code, size_code, color_name


def _build_dwz_memo(order_number: str, alibaba_info: str, shopify_info: str, 
                     colors_match, sizes_match, has_1688_data: bool) -> str:
    """
    Build DWZ56 memo/remarks with detailed mismatch info.
    
    Format examples:
    - Match: "#29401 | 1688: Black/42 | Shopify: Black/42 ✓"
    - Mismatch: "#29401 | 1688: Black/42 | Shopify: Gold/41 | MISMATCH: Color+Size"
    - No 1688: "#29401 | 1688: N/A | Shopify: Gold/41 | NO 1688 DATA"
    """
    memo = f"#{order_number} | 1688: {alibaba_info} | Shopify: {shopify_info}"
    
    if not has_1688_data:
        memo += " | NO 1688 DATA"
    elif colors_match is not None and sizes_match is not None:
        if colors_match and sizes_match:
            memo += " ✓"
        else:
            # Build specific mismatch details
            mismatches = []
            if not colors_match:
                mismatches.append("Color")
            if not sizes_match:
                mismatches.append("Size")
            memo += f" | MISMATCH: {'+'.join(mismatches)}"
    
    return memo


async def generate_tnv_waybill_number(db, country_code: str, color_code: str, size_code: str) -> str:
    """
    Generate custom waybill number: TNV{COUNTRY}{DATE}{COLOR}{SIZE}{SERIAL}
    
    Example: TNVIN0109R42001
    - TNV = Company prefix
    - IN = India
    - 0109 = January 9th (DDMM)
    - R = Red
    - 42 = Size 42
    - 001 = First order of the day
    """
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%d%m")  # DDMM format
    
    # Build prefix for serial lookup
    prefix = f"TNV{country_code}{date_str}"
    
    # Find highest serial for today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    latest = await db.dwz_waybill_serials.find_one(
        {"prefix": prefix, "created_at": {"$gte": today_start}},
        sort=[("serial", -1)]
    )
    
    next_serial = (latest.get("serial", 0) + 1) if latest else 1
    serial_str = str(next_serial).zfill(3)
    
    # Build waybill: TNV{COUNTRY}{DATE}{COLOR}{SIZE}{SERIAL}
    waybill = f"TNV{country_code}{date_str}{color_code}{size_code}{serial_str}"
    
    # Save for serial tracking
    await db.dwz_waybill_serials.insert_one({
        "waybill": waybill,
        "prefix": prefix,
        "serial": next_serial,
        "country_code": country_code,
        "color_code": color_code,
        "size_code": size_code,
        "created_at": now.isoformat(),
    })
    
    return waybill


@router.post("/mark-shipped")
async def mark_1688_order_shipped(request: Mark1688ShippedRequest):
    """
    Mark a 1688 order as shipped and automatically create a DWZ56 shipping order.
    
    Creates a custom waybill number: TNV{COUNTRY}{DATE}{COLOR}{SIZE}{SERIAL}
    Example: TNVIN0109R42001
    
    Workflow:
    1. 1688 order is shipped from supplier
    2. Call this API with Shopify order + 1688 order ID
    3. System extracts color/size from order, generates custom waybill
    4. DWZ56 shipment created with custom waybill as tracking number
    5. Package arrives at DWZ56, they scan 1688 order ID and match to waybill
    """
    db = get_db()
    
    # Find the Shopify order to get customer shipping details
    shopify_order = await db.customers.find_one({
        "store_name": request.store_name,
        "$or": [
            {"order_number": request.shopify_order_number},
            {"order_number": str(request.shopify_order_number)},
        ]
    }, {"_id": 0})
    
    if not shopify_order:
        raise HTTPException(status_code=404, detail=f"Shopify order #{request.shopify_order_number} not found")
    
    now = datetime.now(timezone.utc).isoformat()
    dwz_result = None
    dwz_tracking = None
    
    # Extract shipping address
    shipping_addr = shopify_order.get("shipping_address", {})
    if not shipping_addr:
        shipping_addr = {
            "first_name": shopify_order.get("first_name", ""),
            "last_name": shopify_order.get("last_name", ""),
            "address1": shopify_order.get("address1", "") or shopify_order.get("address", ""),
            "city": shopify_order.get("city", ""),
            "province": shopify_order.get("province", "") or shopify_order.get("state", ""),
            "country": shopify_order.get("country", ""),  # Don't default - let country detection handle it
            "zip": shopify_order.get("zip", "") or shopify_order.get("postal_code", ""),
            "phone": shopify_order.get("phone", ""),
        }
    
    receiver_name = f"{shipping_addr.get('first_name', '')} {shipping_addr.get('last_name', '')}".strip()
    if not receiver_name:
        receiver_name = shopify_order.get("customer_name") or "Customer"
    
    # Determine destination and courier
    # Check multiple fields for country
    country = (
        shipping_addr.get("country", "") or 
        shipping_addr.get("country_code", "") or 
        shopify_order.get("country_code", "") or
        shopify_order.get("country", "") or
        ""
    ).upper()  # Normalize to uppercase
    
    if country in ["IN", "INDIA"]:
        destination = "印度"
        default_courier = "印度专线"
        country_code = "IN"
    elif country in ["PK", "PAKISTAN"]:
        destination = "巴基斯坦"
        default_courier = "巴基斯坦专线"
        country_code = "PK"
    else:
        # Fall back to store-based detection
        if "pk" in request.store_name.lower():
            destination = "巴基斯坦"
            country_code = "PK"
        else:
            destination = "印度"
            country_code = "IN"
        default_courier = STORE_COURIER_MAP.get(request.store_name, "印度专线")
    
    courier_type = request.courier_type or STORE_COURIER_MAP.get(request.store_name) or default_courier
    
    # PRIORITY: Fetch 1688 purchase order for color/size (more accurate than Shopify)
    purchase_order_1688 = await db.purchase_orders_1688.find_one({
        "alibaba_order_id": request.alibaba_order_id
    }, {"_id": 0})
    
    # If not found by alibaba_order_id, try by shopify_order_number
    if not purchase_order_1688:
        purchase_order_1688 = await db.purchase_orders_1688.find_one({
            "shopify_order_number": request.shopify_order_number,
            "store_name": request.store_name
        }, {"_id": 0})
    
    # Extract color and size from BOTH sources for verification
    # 1. Get Shopify color/size (for verification)
    shopify_color_code, shopify_size_code, shopify_color_name = extract_color_size_from_order(shopify_order, None)
    
    # 2. Get 1688 color/size (priority for waybill)
    has_1688_data = False
    if purchase_order_1688:
        color_1688 = purchase_order_1688.get("color", "")
        size_1688 = purchase_order_1688.get("size", "")
        if color_1688:
            has_1688_data = True
            extracted_color, extracted_color_name = extract_color_from_1688(color_1688)
        else:
            extracted_color, extracted_color_name = shopify_color_code, shopify_color_name
        
        if size_1688:
            has_1688_data = True
            import re
            numbers = re.findall(r'\d+', str(size_1688))
            extracted_size = numbers[0].zfill(2)[-2:] if numbers else shopify_size_code
        else:
            extracted_size = shopify_size_code
    else:
        # No 1688 data - use Shopify but mark as "no 1688 data"
        extracted_color, extracted_size, extracted_color_name = shopify_color_code, shopify_size_code, shopify_color_name
    
    color_code = request.color_override or extracted_color
    size_code = request.size_override or extracted_size
    # Get display color name (full name for remarks)
    color_display = extracted_color_name if not request.color_override else COLOR_CODE_TO_NAME.get(request.color_override, request.color_override)
    
    # Build comparison string for remarks
    # If no 1688 data, show "N/A" to make it clear
    shopify_info = f"{shopify_color_name}/{shopify_size_code}"
    if has_1688_data:
        alibaba_info = f"{color_display}/{size_code}"
    else:
        alibaba_info = "N/A (no 1688 data)"
    
    # Check if they match (only if 1688 data exists)
    if has_1688_data:
        colors_match = (shopify_color_code == color_code) or (shopify_color_name.lower() == color_display.lower())
        sizes_match = (shopify_size_code == size_code)
        mismatch_warning = "" if (colors_match and sizes_match) else " ⚠️MISMATCH"
    else:
        colors_match = None
        sizes_match = None
        mismatch_warning = " ⚠️NO 1688 DATA"
    
    # Generate custom waybill: TNV{COUNTRY}{DATE}{COLOR}{SIZE}{SERIAL}
    custom_waybill = await generate_tnv_waybill_number(db, country_code, color_code, size_code)
    
    # Build full address
    address_parts = [
        shipping_addr.get("address1", ""),
        shipping_addr.get("address2", ""),
    ]
    full_address = ", ".join([p for p in address_parts if p])
    
    # Create DWZ56 shipment if requested
    if request.auto_create_dwz:
        try:
            from routes.dwz56 import build_request_payload, make_api_request
            
            # Build shipment record for DWZ56
            # cNum = Custom waybill number (TNVIN0109R42001)
            # cRNo = 1688 Order ID (for warehouse package matching)
            shipment_record = {
                "iID": 0,
                "nItemType": 1,
                "nLanguage": 0,
                "cEmsKind": courier_type,
                "cDes": destination,
                
                # Custom waybill number
                "cNum": custom_waybill,
                
                # Receiver info
                "cReceiver": receiver_name,
                "cRAddr": full_address,
                "cRCity": shipping_addr.get("city", ""),
                "cRProvince": shipping_addr.get("province", ""),
                "cRCountry": shipping_addr.get("country") or destination,
                "cRPostcode": shipping_addr.get("zip", ""),
                "cRPhone": shipping_addr.get("phone", "") or shopify_order.get("phone", ""),
                "cREMail": shopify_order.get("email", ""),
                
                # Reference numbers:
                # cRNo = 1688 Fulfillment Number (for warehouse package matching - this is on the package label)
                # cCNo = Shopify Order ID (customer reference)
                "cRNo": request.fulfillment_number_1688 or request.alibaba_order_id,
                "cCNo": f"#{request.shopify_order_number}",
                
                # Package details
                "fWeight": request.estimated_weight,
                "iItem": 1,
                "nPayWay": 0,
                
                # Goods
                "cGoods": request.goods_description or "Fashion items",
                "iQuantity": 1,
                "fPrice": float(shopify_order.get("total_price", 0) or shopify_order.get("total_spent", 0) or 0),
                
                # Memo with all references for easy search and verification
                # Build detailed mismatch info
                "cMemo": _build_dwz_memo(request.shopify_order_number, alibaba_info, shopify_info, colors_match, sizes_match, has_1688_data),
                
                # Mark for filtering
                "cMark": f"#{request.shopify_order_number}",
            }
            
            # Create shipment via DWZ56 API
            payload = build_request_payload("PreInputSet", {"RecList": [shipment_record]})
            response = await make_api_request(payload)
            
            if response.get("ReturnValue", 0) > 0:
                created_ids = response.get("RecIDs", [])
                err_list = response.get("ErrList", [])
                
                # DWZ56 may assign its own tracking or use our custom waybill
                if err_list and err_list[0].get("cNum"):
                    dwz_tracking = err_list[0].get("cNum")
                else:
                    dwz_tracking = custom_waybill
                
                dwz_result = {
                    "success": True,
                    "message": f"DWZ56 shipment created",
                    "record_ids": created_ids,
                    "dwz_tracking": dwz_tracking,
                    "raw_response": response,
                }
            else:
                # Check if there's an error message
                err_list = response.get("ErrList", [])
                error_msg = err_list[0].get("cMess") if err_list else f"DWZ56 API error: {response.get('ReturnValue')}"
                dwz_result = {
                    "success": False,
                    "message": error_msg,
                    "raw_response": response,
                }
                
        except Exception as e:
            dwz_result = {
                "success": False,
                "message": f"Failed to create DWZ56 shipment: {str(e)}",
                "error": str(e),
            }
    
    # Update purchase_orders_1688 collection
    await db.purchase_orders_1688.update_one(
        {"alibaba_order_id": request.alibaba_order_id},
        {
            "$set": {
                "status": "shipped",
                "alibaba_status": "SHIPPED",
                "shipped_at": now,
                "updated_at": now,
                "dwz_waybill": custom_waybill,
                "dwz_tracking": dwz_tracking,
                "dwz_result": dwz_result,
            }
        },
        upsert=True
    )
    
    # Update fulfillment pipeline
    new_stage = "dwz56_shipped" if dwz_result and dwz_result.get("success") else "1688_ordered"
    
    pipeline_update = {
        "$set": {
            "alibaba_order_id": request.alibaba_order_id,
            "alibaba_status": "SHIPPED",
            "fulfillment_number_1688": request.fulfillment_number_1688,
            "current_stage": new_stage,
            "updated_at": now,
            f"stage_dates.{new_stage}": now,
            "dwz_waybill": custom_waybill,
            "color_code": color_code,
            "color_name": color_display,
            "size_code": size_code,
        }
    }
    
    if dwz_tracking:
        pipeline_update["$set"]["dwz_tracking"] = dwz_tracking
    
    await db.fulfillment_pipeline.update_one(
        {"order_number": request.shopify_order_number, "store_name": request.store_name},
        pipeline_update,
        upsert=True
    )
    
    # Also update customers collection
    await db.customers.update_one(
        {"order_number": request.shopify_order_number, "store_name": request.store_name},
        {
            "$set": {
                "alibaba_order_id": request.alibaba_order_id,
                "alibaba_status": "SHIPPED",
                "fulfillment_number_1688": request.fulfillment_number_1688,
                "fulfillment_stage": new_stage,
                "dwz_waybill": custom_waybill,
                "dwz_tracking": dwz_tracking,
                "updated_at": now,
            }
        }
    )
    
    # Build detailed remarks for response
    detailed_remarks = _build_dwz_memo(request.shopify_order_number, alibaba_info, shopify_info, colors_match, sizes_match, has_1688_data)
    
    return {
        "success": True,
        "message": f"DWZ56 shipment created",
        "waybill": custom_waybill,
        "shopify_order": request.shopify_order_number,
        "alibaba_order_id": request.alibaba_order_id,
        "fulfillment_number_1688": request.fulfillment_number_1688,
        "dwz_tracking": dwz_tracking,
        "color_code": color_code,
        "color_name": color_display,
        "size_code": size_code,
        "shopify_color": shopify_color_name,
        "shopify_size": shopify_size_code,
        "colors_match": colors_match,
        "sizes_match": sizes_match,
        "has_1688_data": has_1688_data,
        "remarks": detailed_remarks,
        "current_stage": new_stage,
        "courier_type": courier_type,
        "dwz_shipment": dwz_result,
        "shipping_details": {
            "receiver": receiver_name,
            "destination": destination,
            "city": shipping_addr.get("city", ""),
            "country": shipping_addr.get("country") or country_code,
        }
    }


class BulkMark1688ShippedRequest(BaseModel):
    orders: List[dict] = Field(..., description="List of {shopify_order_number, alibaba_order_id, fulfillment_number_1688}")
    store_name: str = Field(default="tnvcollection")
    courier_type: Optional[str] = Field(default=None, description="DWZ56 courier type. Auto-detected if not provided")
    estimated_weight: float = Field(default=0.5)
    auto_create_dwz: bool = Field(default=True)


@router.post("/mark-shipped-bulk")
async def bulk_mark_1688_orders_shipped(request: BulkMark1688ShippedRequest):
    """
    Bulk mark multiple 1688 orders as shipped and create DWZ56 shipments.
    
    Each order in the list MUST include:
    - shopify_order_number
    - alibaba_order_id (used as reference in DWZ56)
    - fulfillment_number_1688 (optional - 1688 tracking number for package matching)
    
    Example:
    {
        "orders": [
            {"shopify_order_number": "29160", "alibaba_order_id": "4993919316996978802", "fulfillment_number_1688": "YT1234567890"},
            {"shopify_order_number": "29161", "alibaba_order_id": "4993919316996978803"}
        ]
    }
    """
    results = []
    success_count = 0
    dwz_created_count = 0
    error_count = 0
    
    for order in request.orders:
        try:
            mark_request = Mark1688ShippedRequest(
                shopify_order_number=str(order.get("shopify_order_number")),
                alibaba_order_id=str(order.get("alibaba_order_id")),
                fulfillment_number_1688=order.get("fulfillment_number_1688"),
                store_name=request.store_name,
                courier_type=request.courier_type,
                estimated_weight=request.estimated_weight,
                goods_description=order.get("goods_description", "Fashion items"),
                auto_create_dwz=request.auto_create_dwz,
            )
            result = await mark_1688_order_shipped(mark_request)
            
            results.append({
                "success": True,
                "shopify_order": order.get("shopify_order_number"),
                "alibaba_order_id": order.get("alibaba_order_id"),
                "fulfillment_number_1688": order.get("fulfillment_number_1688"),
                "waybill": result.get("waybill"),
                "dwz_tracking": result.get("dwz_tracking"),
                "dwz_created": result.get("dwz_shipment", {}).get("success", False),
            })
            success_count += 1
            if result.get("dwz_shipment", {}).get("success"):
                dwz_created_count += 1
                
        except Exception as e:
            results.append({
                "success": False,
                "error": str(e),
                **order,
            })
            error_count += 1
    
    return {
        "success": True,
        "message": f"Processed {success_count} orders, created {dwz_created_count} DWZ56 shipments, {error_count} errors",
        "success_count": success_count,
        "dwz_created_count": dwz_created_count,
        "error_count": error_count,
        "results": results,
    }


# ==================== Auto-Sync 1688 Shipped Orders to DWZ56 ====================

@router.post("/auto-sync-shipped")
async def auto_sync_shipped_orders_to_dwz(store_name: str = "tnvcollection"):
    """
    Auto-sync: Find all 1688 orders marked as shipped but not yet in DWZ56,
    and automatically create DWZ56 shipments for them.
    
    This should be called:
    - Periodically (e.g., every hour via cron)
    - After marking orders as shipped in 1688
    - Manually when you want to sync pending orders
    """
    db = get_db()
    
    # Find orders that have alibaba_order_id but no dwz_waybill
    pending_orders = await db.purchase_orders_1688.find({
        "alibaba_order_id": {"$exists": True, "$ne": None},
        "alibaba_status": "SHIPPED",
        "$or": [
            {"dwz_waybill": {"$exists": False}},
            {"dwz_waybill": None},
            {"dwz_waybill": ""},
        ]
    }).to_list(100)
    
    if not pending_orders:
        # Also check fulfillment_pipeline for orders without dwz_waybill
        pending_orders = await db.fulfillment_pipeline.find({
            "store_name": store_name,
            "alibaba_order_id": {"$exists": True, "$ne": None},
            "$or": [
                {"dwz_waybill": {"$exists": False}},
                {"dwz_waybill": None},
            ]
        }).to_list(100)
    
    results = []
    synced_count = 0
    error_count = 0
    
    for order in pending_orders:
        try:
            shopify_order_num = order.get("shopify_order_number") or order.get("order_number")
            alibaba_order_id = order.get("alibaba_order_id")
            
            if not shopify_order_num or not alibaba_order_id:
                continue
            
            # Create DWZ56 shipment
            mark_request = Mark1688ShippedRequest(
                shopify_order_number=str(shopify_order_num),
                alibaba_order_id=str(alibaba_order_id),
                store_name=store_name,
                auto_create_dwz=True,
            )
            result = await mark_1688_order_shipped(mark_request)
            
            results.append({
                "success": True,
                "shopify_order": shopify_order_num,
                "alibaba_order_id": alibaba_order_id,
                "waybill": result.get("waybill"),
                "color": result.get("color_code"),
                "size": result.get("size_code"),
            })
            synced_count += 1
            
        except Exception as e:
            results.append({
                "success": False,
                "shopify_order": order.get("shopify_order_number") or order.get("order_number"),
                "error": str(e),
            })
            error_count += 1
    
    return {
        "success": True,
        "message": f"Auto-synced {synced_count} orders to DWZ56, {error_count} errors",
        "synced_count": synced_count,
        "error_count": error_count,
        "pending_found": len(pending_orders),
        "results": results,
    }


@router.get("/pending-dwz-sync")
async def get_pending_dwz_sync(store_name: str = "tnvcollection"):
    """
    Get list of orders that have 1688 order ID but no DWZ56 waybill yet.
    These orders are ready to be synced to DWZ56.
    """
    db = get_db()
    
    # Find orders with alibaba_order_id but no dwz_waybill
    pending = await db.fulfillment_pipeline.find({
        "store_name": store_name,
        "alibaba_order_id": {"$exists": True, "$ne": None},
        "$or": [
            {"dwz_waybill": {"$exists": False}},
            {"dwz_waybill": None},
        ]
    }, {"_id": 0}).to_list(100)
    
    return {
        "success": True,
        "pending_count": len(pending),
        "orders": [
            {
                "shopify_order": o.get("order_number"),
                "alibaba_order_id": o.get("alibaba_order_id"),
                "customer": o.get("customer_name"),
                "stage": o.get("current_stage"),
            }
            for o in pending
        ]
    }


@router.post("/sync-shipping-address/{store_name}/{order_number}")
async def sync_shipping_address_from_shopify(store_name: str, order_number: str):
    """
    Fetch shipping address from Shopify for a specific order and update the database.
    
    Use this to update shipping address for orders that were synced before the address fields were added.
    """
    import httpx
    
    db = get_db()
    
    # Get store credentials - try both collections
    store = await db.stores.find_one(
        {"$or": [{"name": store_name}, {"shopify_domain": {"$regex": store_name, "$options": "i"}}]},
        {"_id": 0}
    )
    if not store:
        store = await db.shopify_stores.find_one({"name": store_name}, {"_id": 0})
    
    if not store:
        raise HTTPException(status_code=404, detail=f"Store {store_name} not found")
    
    shopify_domain = store.get("shopify_domain")
    shopify_token = store.get("shopify_token")
    
    if not shopify_domain or not shopify_token:
        raise HTTPException(status_code=400, detail="Store not configured with Shopify credentials")
    
    # Find the order to get shopify_order_id
    order = await db.customers.find_one(
        {"store_name": store_name, "order_number": order_number},
        {"_id": 0, "shopify_order_id": 1}
    )
    
    if not order or not order.get("shopify_order_id"):
        raise HTTPException(status_code=404, detail=f"Order {order_number} not found")
    
    shopify_order_id = order.get("shopify_order_id")
    
    # Fetch order from Shopify
    async with httpx.AsyncClient() as client:
        url = f"https://{shopify_domain}/admin/api/2024-01/orders/{shopify_order_id}.json"
        headers = {"X-Shopify-Access-Token": shopify_token}
        
        response = await client.get(url, headers=headers)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Shopify API error: {response.text}")
        
        data = response.json()
        shopify_order = data.get("order", {})
    
    # Extract shipping address
    shipping_addr = shopify_order.get("shipping_address", {})
    
    if not shipping_addr:
        return {"success": False, "message": "No shipping address in Shopify order"}
    
    # Build shipping address object
    shipping_address = {
        "first_name": shipping_addr.get("first_name", ""),
        "last_name": shipping_addr.get("last_name", ""),
        "company": shipping_addr.get("company", ""),
        "address1": shipping_addr.get("address1", ""),
        "address2": shipping_addr.get("address2", ""),
        "city": shipping_addr.get("city", ""),
        "province": shipping_addr.get("province", ""),
        "province_code": shipping_addr.get("province_code", ""),
        "country": shipping_addr.get("country", ""),
        "country_code": shipping_addr.get("country_code", ""),
        "zip": shipping_addr.get("zip", ""),
        "phone": shipping_addr.get("phone", ""),
    }
    
    # Update the order in customers database
    result = await db.customers.update_one(
        {"store_name": store_name, "order_number": order_number},
        {
            "$set": {
                "shipping_address": shipping_address,
                "country_code": shipping_address.get("country_code", ""),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        }
    )
    
    # CRITICAL: Also update purchase_orders_1688 collection so DWZ fulfillment has the address
    # This fixes the data sync issue where shipping addresses weren't propagating to purchase orders
    po_result = await db.purchase_orders_1688.update_many(
        {
            "$or": [
                {"shopify_order_number": order_number},
                {"shopify_order_number": int(order_number) if order_number.isdigit() else order_number},
                {"shopify_order_id": order_number},
                {"shopify_order_id": str(shopify_order_id)},
            ],
            "store_name": store_name
        },
        {
            "$set": {
                "shipping_address": shipping_address,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Shipping address updated for order {order_number}",
        "shipping_address": shipping_address,
        "customers_modified": result.modified_count,
        "purchase_orders_modified": po_result.modified_count,
    }


@router.post("/sync-shipping-addresses-bulk/{store_name}")
async def sync_shipping_addresses_bulk(store_name: str, limit: int = 50):
    """
    Bulk sync shipping addresses from Shopify for orders that don't have shipping_address.
    """
    import httpx
    
    db = get_db()
    
    # Get store credentials - try both collections
    store = await db.stores.find_one(
        {"$or": [{"name": store_name}, {"shopify_domain": {"$regex": store_name, "$options": "i"}}]},
        {"_id": 0}
    )
    if not store:
        store = await db.shopify_stores.find_one({"name": store_name}, {"_id": 0})
    
    if not store:
        raise HTTPException(status_code=404, detail=f"Store {store_name} not found")
    
    shopify_domain = store.get("shopify_domain")
    shopify_token = store.get("shopify_token")
    
    if not shopify_domain or not shopify_token:
        raise HTTPException(status_code=400, detail="Store not configured")
    
    # Find orders without shipping_address
    orders = await db.customers.find({
        "store_name": store_name,
        "shopify_order_id": {"$exists": True, "$ne": None},
        "$or": [
            {"shipping_address": {"$exists": False}},
            {"shipping_address": None},
        ]
    }, {"_id": 0, "order_number": 1, "shopify_order_id": 1}).to_list(limit)
    
    results = []
    success_count = 0
    error_count = 0
    
    async with httpx.AsyncClient() as client:
        for order in orders:
            try:
                shopify_order_id = order.get("shopify_order_id")
                order_number = order.get("order_number")
                
                # Fetch from Shopify
                url = f"https://{shopify_domain}/admin/api/2024-01/orders/{shopify_order_id}.json"
                headers = {"X-Shopify-Access-Token": shopify_token}
                
                response = await client.get(url, headers=headers)
                
                if response.status_code != 200:
                    results.append({"order": order_number, "success": False, "error": f"HTTP {response.status_code}"})
                    error_count += 1
                    continue
                
                data = response.json()
                shipping_addr = data.get("order", {}).get("shipping_address", {})
                
                if not shipping_addr:
                    results.append({"order": order_number, "success": False, "error": "No shipping address"})
                    error_count += 1
                    continue
                
                # Update database
                shipping_address = {
                    "first_name": shipping_addr.get("first_name", ""),
                    "last_name": shipping_addr.get("last_name", ""),
                    "address1": shipping_addr.get("address1", ""),
                    "address2": shipping_addr.get("address2", ""),
                    "city": shipping_addr.get("city", ""),
                    "province": shipping_addr.get("province", ""),
                    "country": shipping_addr.get("country", ""),
                    "country_code": shipping_addr.get("country_code", ""),
                    "zip": shipping_addr.get("zip", ""),
                    "phone": shipping_addr.get("phone", ""),
                }
                
                # Update customers collection
                await db.customers.update_one(
                    {"store_name": store_name, "order_number": order_number},
                    {"$set": {"shipping_address": shipping_address, "country_code": shipping_addr.get("country_code", "")}}
                )
                
                # CRITICAL: Also update purchase_orders_1688 for DWZ fulfillment
                await db.purchase_orders_1688.update_many(
                    {
                        "$or": [
                            {"shopify_order_number": order_number},
                            {"shopify_order_number": int(order_number) if order_number.isdigit() else order_number},
                            {"shopify_order_id": order_number},
                            {"shopify_order_id": str(shopify_order_id)},
                        ],
                        "store_name": store_name
                    },
                    {"$set": {"shipping_address": shipping_address, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                results.append({
                    "order": order_number,
                    "success": True,
                    "city": shipping_address.get("city"),
                    "country": shipping_address.get("country"),
                })
                success_count += 1
                
            except Exception as e:
                results.append({"order": order.get("order_number"), "success": False, "error": str(e)})
                error_count += 1
    
    return {
        "success": True,
        "message": f"Synced {success_count} orders, {error_count} errors",
        "total_found": len(orders),
        "success_count": success_count,
        "error_count": error_count,
        "results": results,
    }


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
            "webSite": "1688",  # Required parameter
        }
        
        result = await make_api_request(
            "com.alibaba.logistics/alibaba.trade.getLogisticsInfos.buyerView",
            params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        logistics_list = result.get("result") or []
        
        # Extract tracking numbers
        tracking_info = []
        for item in logistics_list:
            tracking_info.append({
                "logistics_id": item.get("logisticsId"),
                "tracking_number": item.get("logisticsBillNo"),
                "courier_name": item.get("logisticsCompanyName"),
                "courier_code": item.get("logisticsCompanyNo"),
                "status": item.get("status"),
                "sender": item.get("sender"),
                "receiver": item.get("receiver"),
                "goods": item.get("sendGoods") or item.get("logisticsOrderGoods"),
            })
        
        return {
            "success": True,
            "order_id": order_id,
            "logistics": tracking_info,
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


# ==================== Official 1688 Buyer APIs ====================
# Based on open.1688.com API Testing - WaMerce CRM Integration

@router.get("/buyer/shipping-addresses")
async def get_buyer_shipping_addresses():
    """
    Get saved shipping addresses for the buyer
    API: alibaba.trade.receiveAddress.get
    """
    try:
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.receiveAddress.get",
            {},
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        addresses = result.get("result", {}).get("receiveAddressItems", [])
        return {
            "success": True,
            "addresses": addresses,
            "count": len(addresses),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/buyer/purchased-products")
async def get_purchased_products(page: int = Query(1), page_size: int = Query(20)):
    """
    Get basic info about products purchased from merchants
    API: alibaba.trade.getBuyerOrderList then extract products
    """
    try:
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.getBuyerOrderList",
            {"pageNo": str(page), "pageSize": str(page_size)},
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        orders = result.get("result", [])
        if isinstance(orders, dict):
            orders = orders.get("result", [])
        
        products = []
        for order in orders:
            for item in order.get("productItems", []):
                products.append({
                    "product_id": item.get("productID"),
                    "name": item.get("name"),
                    "price": item.get("price"),
                    "quantity": item.get("quantity"),
                    "image": item.get("productImgUrl", [None])[0] if isinstance(item.get("productImgUrl"), list) else item.get("productImgUrl"),
                    "order_id": order.get("orderId"),
                    "seller": order.get("sellerLoginId"),
                })
        
        return {
            "success": True,
            "products": products,
            "count": len(products),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/buyer/merchant-info")
async def get_purchased_merchant_info():
    """
    Get info about merchants you have purchased from
    API: alibaba.trade.getBuyerOrderList to extract unique sellers
    """
    try:
        all_merchants = {}
        page = 1
        
        while page <= 5:  # Limit to 5 pages
            result = await make_api_request(
                "com.alibaba.trade/alibaba.trade.getBuyerOrderList",
                {"pageNo": str(page), "pageSize": "50"},
                access_token=ALIBABA_ACCESS_TOKEN
            )
            
            orders = result.get("result", [])
            if isinstance(orders, dict):
                orders = orders.get("result", [])
            
            if not orders:
                break
            
            for order in orders:
                seller_id = order.get("sellerMemberId") or order.get("sellerLoginId")
                if seller_id and seller_id not in all_merchants:
                    all_merchants[seller_id] = {
                        "member_id": seller_id,
                        "login_id": order.get("sellerLoginId"),
                        "company_name": order.get("sellerContact", {}).get("companyName"),
                        "order_count": 1,
                    }
                elif seller_id:
                    all_merchants[seller_id]["order_count"] += 1
            
            page += 1
        
        return {
            "success": True,
            "merchants": list(all_merchants.values()),
            "count": len(all_merchants),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/buyer/preview-order")
async def preview_order_before_creating(
    product_id: str = Body(...),
    quantity: int = Body(1),
    spec_id: str = Body(None),
):
    """
    Preview order data before creating
    API: alibaba.trade.fastCreateOrder.preview
    """
    try:
        cargo = {
            "offerId": int(product_id),
            "quantity": float(quantity),
        }
        if spec_id:
            cargo["specId"] = spec_id
        
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.fastCreateOrder.preview",
            {"cargoParamList": json.dumps([cargo])},
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        return {
            "success": True,
            "preview": result.get("result", result),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/buyer/quick-order")
async def create_quick_order(
    product_id: str = Body(...),
    quantity: int = Body(1),
    spec_id: str = Body(None),
    address_id: int = Body(None),
    message: str = Body(""),
):
    """
    Quickly create 1688 order (Recommended)
    API: alibaba.trade.fastCreateOrder
    """
    try:
        # Get default address if not provided
        if not address_id:
            addr_result = await make_api_request(
                "com.alibaba.trade/alibaba.trade.receiveAddress.get",
                {},
                access_token=ALIBABA_ACCESS_TOKEN
            )
            addresses = addr_result.get("result", {}).get("receiveAddressItems", [])
            if addresses:
                address_id = addresses[0].get("id")
        
        if not address_id:
            return {"success": False, "error": "No shipping address available"}
        
        cargo = {
            "offerId": int(product_id),
            "quantity": float(quantity),
        }
        if spec_id:
            cargo["specId"] = spec_id
        
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.fastCreateOrder",
            {
                "addressParam": json.dumps({"addressId": int(address_id)}),
                "cargoParamList": json.dumps([cargo]),
                "flow": "general",
                "message": message or f"Order for {product_id}",
            },
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        order_id = None
        if result.get("result"):
            order_id = result["result"].get("orderId")
        
        return {
            "success": bool(order_id),
            "order_id": order_id,
            "result": result.get("result", result),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/buyer/keyword-search")
async def buyer_keyword_search(
    keyword: str = Query(...),
    page: int = Query(1),
    page_size: int = Query(20),
):
    """
    Domestic distribution keyword search
    API: alibaba.distributor.product.list
    """
    try:
        result = await make_api_request(
            "cn.alibaba.open/alibaba.distributor.product.list",
            {
                "keyword": keyword,
                "pageNo": str(page),
                "pageSize": str(page_size),
            },
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        return {
            "success": True,
            "keyword": keyword,
            "products": result.get("result", {}).get("products", []),
            "total": result.get("result", {}).get("totalCount", 0),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/buyer/recommended-suppliers")
async def get_recommended_suppliers(keyword: str = Query(None)):
    """
    Get recommended suppliers for buyers
    API: alibaba.member.getRelatedSuppliers
    """
    try:
        params = {}
        if keyword:
            params["keyword"] = keyword
        
        result = await make_api_request(
            "com.alibaba.trade/alibaba.member.getRelatedSuppliers",
            params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        return {
            "success": True,
            "suppliers": result.get("result", []),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/buyer/follow-product")
async def follow_product(product_id: str = Body(..., embed=True)):
    """
    Add product to favorites/watchlist
    API: alibaba.product.follow
    """
    try:
        result = await make_api_request(
            "com.alibaba.product/alibaba.product.follow",
            {"offerId": product_id},
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        return {
            "success": True,
            "message": "Product followed",
            "result": result,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/buyer/unfollow-product")
async def unfollow_product(product_id: str = Body(..., embed=True)):
    """
    Remove product from favorites/watchlist
    API: alibaba.product.unfollow
    """
    try:
        result = await make_api_request(
            "com.alibaba.product/alibaba.product.unfollow",
            {"offerId": product_id},
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        return {
            "success": True,
            "message": "Product unfollowed",
            "result": result,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/buyer/order-list")
async def get_buyer_orders(
    page: int = Query(1),
    page_size: int = Query(20),
    status: str = Query(None, description="Order status filter"),
):
    """
    Get buyer's order list with details
    API: alibaba.trade.getBuyerOrderList
    """
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
        
        orders = result.get("result", [])
        if isinstance(orders, dict):
            orders = orders.get("result", [])
        
        return {
            "success": True,
            "orders": orders,
            "count": len(orders),
            "page": page,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/buyer/order/{order_id}")
async def get_order_detail(order_id: str):
    """
    Get detailed info for a specific order
    API: alibaba.trade.get.buyerView
    """
    try:
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.get.buyerView",
            {"orderId": order_id},
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        return {
            "success": True,
            "order": result.get("result", result),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ==================== Official 1688 Image Search APIs ====================

@router.post("/image-search/distributed")
async def image_search_distributed(
    image_url: str = Body(..., description="Image URL to search"),
    page: int = Body(1),
    page_size: int = Body(20),
):
    """
    Search for similar products in distribution pool by image
    API: alibaba.distributor.imageSearch
    """
    try:
        result = await make_api_request(
            "cn.alibaba.open/alibaba.distributor.imageSearch",
            {
                "imageUrl": image_url,
                "pageNo": str(page),
                "pageSize": str(page_size),
            },
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        products = result.get("result", {}).get("products", [])
        return {
            "success": True,
            "source": "1688_official_distributed",
            "total": result.get("result", {}).get("totalCount", len(products)),
            "products": products,
            "page": page,
        }
    except Exception as e:
        return {"success": False, "error": str(e), "source": "1688_official_distributed"}


@router.post("/image-search/cross-border")
async def image_search_cross_border(
    image_url: str = Body(..., description="Image URL to search"),
    page: int = Body(1),
    page_size: int = Body(20),
):
    """
    Search for similar products in cross-border e-commerce pool by image
    API: com.alibaba.linkplus/alibaba.cross.similar.offer.search
    """
    try:
        # Use the correct API from user's purchased capabilities
        api_name = "com.alibaba.linkplus/alibaba.cross.similar.offer.search"
        api_path = f"param2/1/{api_name}/{MERCHANT_APP_KEY}"
        
        access_token = MERCHANT_ACCESS_TOKEN or os.environ.get("ALIBABA_1688_ACCESS_TOKEN", "")
        
        params = {
            "access_token": access_token,
            "picUrl": image_url,
            "page": str(page),
        }
        
        signature = generate_sign(api_path, params, MERCHANT_APP_SECRET)
        params["_aop_signature"] = signature
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ALIBABA_API_URL}/{api_path}",
                data=params,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            result = response.json() if response.text else {}
            
            if result.get("success"):
                search_result = result.get("result", {})
                products = search_result.get("result", [])
                
                # Format products
                formatted_products = []
                for p in products:
                    formatted_products.append({
                        "offer_id": p.get("offerId"),
                        "title": p.get("subject"),
                        "price": p.get("oldPrice"),
                        "image_url": p.get("imageUrl"),
                        "min_order_qty": p.get("quantityBegin"),
                        "unit": p.get("unit"),
                        "province": p.get("province"),
                        "city": p.get("city"),
                        "product_url": f"https://detail.1688.com/offer/{p.get('offerId')}.html" if p.get("offerId") else None,
                    })
                
                return {
                    "success": True,
                    "source": "1688_official_cross_border",
                    "total": search_result.get("total", len(formatted_products)),
                    "products": formatted_products,
                    "page": page,
                }
            else:
                return {
                    "success": False, 
                    "error": result.get("message", "Image search failed"),
                    "error_code": result.get("code"),
                    "source": "1688_official_cross_border"
                }
    except Exception as e:
        return {"success": False, "error": str(e), "source": "1688_official_cross_border"}


@router.post("/image-search")
async def unified_image_search(
    image_url: str = Body(..., description="Image URL to search"),
    page: int = Body(1),
    page_size: int = Body(20),
    source: str = Body("auto", description="Search source: auto, cross_border, distributed, tmapi"),
):
    """
    Unified image search - tries official 1688 APIs first, falls back to TMAPI
    """
    results = {
        "success": False,
        "products": [],
        "total": 0,
        "sources_tried": [],
    }
    
    # Try cross-border first (user has this ordered)
    if source in ["auto", "cross_border"]:
        try:
            cb_result = await image_search_cross_border(image_url, page, page_size)
            results["sources_tried"].append("cross_border")
            if cb_result.get("success") and cb_result.get("products"):
                results["success"] = True
                results["products"] = cb_result["products"]
                results["total"] = cb_result.get("total", 0)
                results["source"] = "1688_cross_border"
                return results
        except:
            pass
    
    # Try distributed
    if source in ["auto", "distributed"]:
        try:
            dist_result = await image_search_distributed(image_url, page, page_size)
            results["sources_tried"].append("distributed")
            if dist_result.get("success") and dist_result.get("products"):
                results["success"] = True
                results["products"] = dist_result["products"]
                results["total"] = dist_result.get("total", 0)
                results["source"] = "1688_distributed"
                return results
        except:
            pass
    
    # Fall back to TMAPI
    if source in ["auto", "tmapi"] and TMAPI_TOKEN:
        try:
            results["sources_tried"].append("tmapi")
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(
                    f"{TMAPI_BASE_URL}/1688/search/img",
                    params={
                        "apiToken": TMAPI_TOKEN,
                        "img_url": image_url,
                        "page": page,
                        "page_size": page_size,
                    }
                )
                tmapi_data = response.json()
                
                if tmapi_data.get("code") == 200:
                    results["success"] = True
                    results["products"] = tmapi_data.get("data", {}).get("items", [])
                    results["total"] = tmapi_data.get("data", {}).get("total", 0)
                    results["source"] = "tmapi"
                    return results
        except:
            pass
    
    results["error"] = "No image search source available or all failed"
    return results


@router.get("/auth/reauthorize-url")
async def get_reauthorize_url(redirect_uri: str = Query("https://wamerce.com/api/1688/auth/callback")):
    """
    Get URL to re-authorize with all API scopes including image search
    Use force_auth=true to refresh permissions
    """
    # All available scopes for buyer APIs
    scopes = [
        "ali.cross.imageSearch",  # Cross-border image search
        "ali.distributor.imageSearch",  # Distributed image search
        "ali.trade",  # Trade APIs
        "ali.product",  # Product APIs
        "ali.member",  # Member APIs
    ]
    
    auth_url = (
        f"https://auth.1688.com/oauth/authorize?"
        f"response_type=code&"
        f"client_id={ALIBABA_APP_KEY}&"
        f"redirect_uri={redirect_uri}&"
        f"force_auth=true&"
        f"scope={','.join(scopes)}&"
        f"state=reauth_with_image_search"
    )
    
    return {
        "reauthorize_url": auth_url,
        "instructions": [
            "1. Click the URL below to re-authorize",
            "2. Login with your 1688 account",
            "3. Accept ALL permissions shown",
            "4. You'll be redirected back with new token",
        ],
        "scopes_requested": scopes,
    }


@router.get("/buyer/product-detail/{product_id}")
async def get_purchased_product_detail(product_id: str):
    """
    Get product details using Official 1688 API (FREE)
    Works for products from merchants you've purchased from
    """
    try:
        # Try official 1688 API first
        result = await make_api_request(
            "com.alibaba.product/alibaba.product.get",
            {"productId": product_id},
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        if result.get("result"):
            product = result["result"]
            return {
                "success": True,
                "source": "1688_official",
                "product": {
                    "product_id": product_id,
                    "title": product.get("subject"),
                    "price": product.get("referencePrice"),
                    "images": product.get("image", {}).get("images", []),
                    "description": product.get("description"),
                    "skus": product.get("productSkuInfos", []),
                    "raw": product,
                }
            }
        else:
            return {"success": False, "error": "Product not found or not from purchased merchant"}
    except Exception as e:
        return {"success": False, "error": str(e), "source": "1688_official"}


# ==================== Multi-Account 1688 Authorization ====================

class Alibaba1688Account(BaseModel):
    """1688 Account model"""
    account_name: str
    member_id: Optional[str] = None
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[str] = None
    authorized_at: str
    is_active: bool = True


@router.get("/accounts")
async def list_1688_accounts():
    """List all authorized 1688 accounts"""
    db = get_db()
    
    try:
        accounts = await db.alibaba_1688_accounts.find(
            {},
            {"_id": 0, "access_token": 0, "refresh_token": 0}  # Don't expose tokens
        ).to_list(100)
        
        return {
            "success": True,
            "accounts": accounts,
            "count": len(accounts),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/accounts/{account_id}")
async def get_1688_account(account_id: str):
    """Get a specific 1688 account (without exposing full token)"""
    db = get_db()
    
    try:
        account = await db.alibaba_1688_accounts.find_one(
            {"account_id": account_id},
            {"_id": 0}
        )
        
        if account:
            # Mask the token for security
            if account.get("access_token"):
                account["access_token"] = account["access_token"][:8] + "..." + account["access_token"][-4:]
            return {"success": True, "account": account}
        else:
            return {"success": False, "error": "Account not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/accounts/authorize")
async def initiate_1688_authorization(
    redirect_uri: str = Body("https://wamerce.com/api/1688/accounts/callback"),
    account_name: str = Body("My 1688 Account"),
):
    """
    Generate OAuth URL to authorize a new 1688 account.
    User should be redirected to this URL to authorize.
    """
    import uuid
    
    # Generate state for security
    state = str(uuid.uuid4())
    
    # Store pending authorization
    db = get_db()
    await db.pending_1688_auth.update_one(
        {"state": state},
        {"$set": {
            "state": state,
            "account_name": account_name,
            "redirect_uri": redirect_uri,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )
    
    # Build OAuth URL
    auth_url = (
        f"https://auth.1688.com/oauth/authorize?"
        f"client_id={ALIBABA_APP_KEY}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"state={state}&"
        f"view=web"
    )
    
    return {
        "success": True,
        "auth_url": auth_url,
        "state": state,
        "instructions": [
            "1. Click the auth_url to open 1688 authorization page",
            "2. Login with your 1688 account",
            "3. Verify with SMS code",
            "4. Click Confirm (确定) to authorize",
            "5. You'll be redirected back with the access token",
        ],
    }


@router.get("/accounts/callback")
async def handle_1688_oauth_callback(
    code: str = Query(None, description="Authorization code from 1688"),
    state: str = Query(None, description="State parameter for security"),
    error: str = Query(None, description="Error if authorization failed"),
):
    """
    Handle OAuth callback from 1688.
    Exchange authorization code for access token.
    """
    from fastapi.responses import RedirectResponse
    
    if error:
        return RedirectResponse(
            url=f"/1688-accounts?error={error}",
            status_code=302
        )
    
    if not code or not state:
        return {"success": False, "error": "Missing code or state parameter"}
    
    db = get_db()
    
    # Verify state
    pending = await db.pending_1688_auth.find_one({"state": state})
    if not pending:
        return {"success": False, "error": "Invalid or expired state"}
    
    account_name = pending.get("account_name", "1688 Account")
    
    try:
        # Exchange code for access token
        async with httpx.AsyncClient(timeout=30.0) as client:
            token_url = "https://gw.open.1688.com/openapi/http/1/system.oauth2/getToken"
            
            response = await client.post(
                token_url,
                data={
                    "grant_type": "authorization_code",
                    "need_refresh_token": "true",
                    "client_id": ALIBABA_APP_KEY,
                    "client_secret": ALIBABA_APP_SECRET,
                    "redirect_uri": pending.get("redirect_uri", "https://wamerce.com/api/1688/accounts/callback"),
                    "code": code,
                }
            )
            
            token_data = response.json()
        
        if token_data.get("access_token"):
            import uuid
            account_id = str(uuid.uuid4())[:8]
            
            # Get member info
            member_id = token_data.get("memberId") or token_data.get("resource_owner")
            
            # Save account to database
            account = {
                "account_id": account_id,
                "account_name": account_name,
                "member_id": member_id,
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in": token_data.get("expires_in"),
                "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=int(token_data.get("expires_in", 86400)))).isoformat() if token_data.get("expires_in") else None,
                "authorized_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True,
            }
            
            await db.alibaba_1688_accounts.update_one(
                {"account_id": account_id},
                {"$set": account},
                upsert=True
            )
            
            # Clean up pending auth
            await db.pending_1688_auth.delete_one({"state": state})
            
            # Redirect to success page
            return RedirectResponse(
                url=f"/1688-accounts?success=true&account={account_name}",
                status_code=302
            )
        else:
            error_msg = token_data.get("error_description") or token_data.get("error") or "Token exchange failed"
            return RedirectResponse(
                url=f"/1688-accounts?error={error_msg}",
                status_code=302
            )
            
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/auth/exchange-code")
async def exchange_auth_code_for_token(
    code: str = Body(..., description="Authorization code from 1688"),
    redirect_uri: str = Body("https://wamerce.com/api/1688/auth/callback", description="Same redirect_uri used in authorize URL"),
):
    """
    Manually exchange an authorization code for an access token.
    Use this if the automatic callback didn't work.
    
    Steps:
    1. Go to the authorize URL
    2. After authorizing, copy the 'code' parameter from the redirect URL
    3. Call this endpoint with that code
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            token_url = "https://gw.open.1688.com/openapi/http/1/system.oauth2/getToken"
            
            response = await client.post(
                token_url,
                data={
                    "grant_type": "authorization_code",
                    "need_refresh_token": "true",
                    "client_id": ALIBABA_APP_KEY,
                    "client_secret": ALIBABA_APP_SECRET,
                    "redirect_uri": redirect_uri,
                    "code": code,
                }
            )
            
            token_data = response.json()
        
        if token_data.get("access_token"):
            # Save to database
            db = get_db()
            import uuid
            account_id = str(uuid.uuid4())[:8]
            member_id = token_data.get("memberId") or token_data.get("resource_owner")
            
            account = {
                "account_id": account_id,
                "account_name": f"1688 Account ({member_id})",
                "member_id": member_id,
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in": token_data.get("expires_in"),
                "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=int(token_data.get("expires_in", 86400)))).isoformat() if token_data.get("expires_in") else None,
                "authorized_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True,
            }
            
            await db.alibaba_1688_accounts.update_one(
                {"member_id": member_id},
                {"$set": account},
                upsert=True
            )
            
            # Also update .env variable in memory (for current session)
            global ALIBABA_ACCESS_TOKEN
            ALIBABA_ACCESS_TOKEN = token_data["access_token"]
            
            return {
                "success": True,
                "message": "Token obtained and saved successfully",
                "account_id": account_id,
                "member_id": member_id,
                "access_token": token_data["access_token"][:20] + "...",  # Show partial token
                "refresh_token": "saved" if token_data.get("refresh_token") else None,
                "expires_in": token_data.get("expires_in"),
            }
        else:
            return {
                "success": False,
                "error": token_data.get("error_description") or token_data.get("error") or "Token exchange failed",
                "raw_response": token_data,
            }
            
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/accounts/add-token")
async def add_1688_account_manually(
    account_name: str = Body(...),
    access_token: str = Body(...),
    member_id: str = Body(None),
):
    """
    Manually add a 1688 account with access token.
    Use this if you already have a token from 1688 Open Platform.
    """
    import uuid
    db = get_db()
    
    try:
        account_id = str(uuid.uuid4())[:8]
        
        account = {
            "account_id": account_id,
            "account_name": account_name,
            "member_id": member_id,
            "access_token": access_token,
            "refresh_token": None,
            "authorized_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True,
            "added_manually": True,
        }
        
        await db.alibaba_1688_accounts.insert_one(account)
        
        return {
            "success": True,
            "account_id": account_id,
            "message": f"Account '{account_name}' added successfully",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.delete("/accounts/{account_id}")
async def delete_1688_account(account_id: str):
    """Delete a 1688 account"""
    db = get_db()
    
    try:
        result = await db.alibaba_1688_accounts.delete_one({"account_id": account_id})
        
        if result.deleted_count > 0:
            return {"success": True, "message": "Account deleted"}
        else:
            return {"success": False, "error": "Account not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/accounts/{account_id}/set-default")
async def set_default_1688_account(account_id: str):
    """Set a 1688 account as the default for API calls"""
    global ALIBABA_ACCESS_TOKEN
    db = get_db()
    
    try:
        account = await db.alibaba_1688_accounts.find_one({"account_id": account_id})
        
        if not account:
            return {"success": False, "error": "Account not found"}
        
        # Update global token
        ALIBABA_ACCESS_TOKEN = account["access_token"]
        
        # Mark as default in DB
        await db.alibaba_1688_accounts.update_many({}, {"$set": {"is_default": False}})
        await db.alibaba_1688_accounts.update_one(
            {"account_id": account_id},
            {"$set": {"is_default": True}}
        )
        
        return {
            "success": True,
            "message": f"Account '{account['account_name']}' set as default",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/accounts/{account_id}/test")
async def test_1688_account(account_id: str):
    """Test if a 1688 account's token is valid"""
    db = get_db()
    
    try:
        account = await db.alibaba_1688_accounts.find_one({"account_id": account_id})
        
        if not account:
            return {"success": False, "error": "Account not found"}
        
        # Test the token by making a simple API call
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.receiveAddress.get",
            {},
            access_token=account["access_token"]
        )
        
        if "error" in str(result).lower() or "unauthorized" in str(result).lower():
            return {
                "success": False,
                "status": "invalid",
                "message": "Token is invalid or expired",
                "error": str(result),
            }
        else:
            return {
                "success": True,
                "status": "valid",
                "message": "Token is working",
                "account_name": account["account_name"],
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ==================== BULK ORDER FEATURE ====================

class BulkOrderItem(BaseModel):
    """Single item for bulk ordering"""
    shopify_order_id: str = Field(..., description="Shopify order ID")
    product_id_1688: str = Field(..., description="1688 product ID")
    quantity: int = Field(1, ge=1, description="Quantity to order")
    spec_id: Optional[str] = Field(None, description="SKU/spec ID for variant")
    size: Optional[str] = Field(None, description="Size")
    color: Optional[str] = Field(None, description="Color")


class BulkOrderRequest(BaseModel):
    """Request for bulk ordering multiple items on 1688"""
    items: List[BulkOrderItem] = Field(..., description="List of items to order")
    account_id: Optional[str] = Field(None, description="1688 account to use")
    auto_link: bool = Field(True, description="Auto-link 1688 product to Shopify SKU")


@router.post("/bulk-order")
async def create_bulk_order(request: BulkOrderRequest):
    """
    Create bulk orders on 1688 for multiple Shopify orders.
    Each Shopify order's linked 1688 product will be ordered.
    
    This is useful when you have multiple confirmed Shopify orders
    and want to place all 1688 orders in one go.
    """
    db = get_db()
    
    if not request.items:
        raise HTTPException(status_code=400, detail="No items provided")
    
    if len(request.items) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 items per bulk order")
    
    # Determine access token
    access_token = ALIBABA_ACCESS_TOKEN
    account_name = "Default"
    
    if request.account_id:
        account = await db.alibaba_1688_accounts.find_one({"account_id": request.account_id})
        if account and account.get("access_token"):
            access_token = account["access_token"]
            account_name = account.get("account_name", account.get("member_id", request.account_id))
    
    if not access_token:
        return {
            "success": False,
            "error": "No 1688 access token configured",
            "message": "Please configure 1688 access token or add an account"
        }
    
    results = {
        "success": True,
        "total": len(request.items),
        "ordered": 0,
        "failed": 0,
        "skipped": 0,
        "orders": [],
        "errors": [],
        "account_used": account_name,
    }
    
    # Get shipping address once
    try:
        address_result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.receiveAddress.get",
            {},
            access_token=access_token
        )
        
        result_data = address_result.get("result", {})
        addresses = result_data.get("receiveAddressItems", [])
        
        if not addresses:
            return {
                "success": False,
                "error": "No shipping address configured on 1688",
                "message": f"Please add a shipping address for account: {account_name}"
            }
        
        default_address = addresses[0]
        address_id = default_address.get("id") or default_address.get("addressId")
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to get shipping address: {str(e)}"
        }
    
    # Process each item
    for item in request.items:
        try:
            # Check if already ordered for this Shopify order
            existing = await db.purchase_orders_1688.find_one({
                "shopify_order_id": item.shopify_order_id,
                "product_id": item.product_id_1688,
                "status": {"$ne": "cancelled"}
            })
            
            if existing:
                results["skipped"] += 1
                results["errors"].append({
                    "shopify_order_id": item.shopify_order_id,
                    "reason": f"Already ordered (1688 Order: {existing.get('alibaba_order_id', 'N/A')})"
                })
                continue
            
            # Build cargo
            cargo = {
                "offerId": int(item.product_id_1688),
                "quantity": float(item.quantity),
            }
            
            if item.spec_id:
                cargo["specId"] = item.spec_id
            
            # Build notes
            notes = f"Shopify #{item.shopify_order_id}"
            if item.size:
                notes += f" | Size: {item.size}"
            if item.color:
                notes += f" | Color: {item.color}"
            
            # Create order params
            create_params = {
                "addressParam": json.dumps({"addressId": int(address_id)}),
                "cargoParamList": json.dumps([cargo]),
                "flow": "general",
                "message": notes,
            }
            
            # Create the order
            create_result = await make_api_request(
                "com.alibaba.trade/alibaba.trade.fastCreateOrder",
                create_params,
                access_token=access_token
            )
            
            alibaba_order_id = None
            if create_result.get("result"):
                alibaba_order_id = create_result["result"].get("orderId")
            if not alibaba_order_id:
                alibaba_order_id = create_result.get("orderId")
            
            if alibaba_order_id:
                # Save to database
                await db.purchase_orders_1688.insert_one({
                    "alibaba_order_id": str(alibaba_order_id),
                    "shopify_order_id": item.shopify_order_id,
                    "product_id": item.product_id_1688,
                    "quantity": item.quantity,
                    "spec_id": item.spec_id,
                    "size": item.size,
                    "color": item.color,
                    "account_id": request.account_id,
                    "account_name": account_name,
                    "status": "created",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "bulk_order": True,
                })
                
                results["ordered"] += 1
                results["orders"].append({
                    "shopify_order_id": item.shopify_order_id,
                    "alibaba_order_id": str(alibaba_order_id),
                    "product_id": item.product_id_1688,
                })
                
                # Update fulfillment pipeline if exists
                await db.fulfillment_pipeline.update_one(
                    {"shopify_order_id": item.shopify_order_id},
                    {"$set": {
                        "alibaba_order_id": str(alibaba_order_id),
                        "status": "purchased",
                        "stages.alibaba_ordered": True,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
            else:
                error_msg = create_result.get("message") or create_result.get("errorMessage") or "Unknown error"
                results["failed"] += 1
                results["errors"].append({
                    "shopify_order_id": item.shopify_order_id,
                    "product_id": item.product_id_1688,
                    "reason": error_msg,
                })
                
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({
                "shopify_order_id": item.shopify_order_id,
                "product_id": item.product_id_1688,
                "reason": str(e),
            })
    
    results["success"] = results["ordered"] > 0
    results["message"] = f"Ordered {results['ordered']}/{results['total']} items on 1688"
    
    return results


@router.post("/find-linked-products")
async def find_linked_1688_products(
    shopify_order_ids: List[str] = Body(..., description="List of Shopify order IDs")
):
    """
    Find 1688 product links for multiple Shopify orders.
    Useful before bulk ordering to see which orders have linked products.
    """
    db = get_db()
    
    results = {
        "success": True,
        "total": len(shopify_order_ids),
        "linked": 0,
        "unlinked": 0,
        "orders": [],
    }
    
    for shopify_order_id in shopify_order_ids:
        # Get order from customers collection
        order = await db.customers.find_one(
            {"$or": [
                {"shopify_order_id": shopify_order_id},
                {"customer_id": shopify_order_id},
                {"order_number": int(shopify_order_id) if shopify_order_id.isdigit() else shopify_order_id},
            ]},
            {"_id": 0}
        )
        
        if not order:
            results["orders"].append({
                "shopify_order_id": shopify_order_id,
                "found": False,
                "linked": False,
            })
            results["unlinked"] += 1
            continue
        
        # Check line items for 1688 product IDs
        linked_products = []
        line_items = order.get("line_items", [])
        
        for item in line_items:
            sku = item.get("sku", "")
            product_id_1688 = None
            
            # Try to extract 1688 ID from SKU
            if sku:
                # Pattern: 1688-PRODUCTID-... or SKU-1688-PRODUCTID-...
                import re
                match = re.search(r'1688[_-]?(\d{10,})', sku)
                if match:
                    product_id_1688 = match.group(1)
            
            # Also check order_fulfillment collection
            if not product_id_1688:
                fulfillment = await db.order_fulfillment.find_one(
                    {"shopify_order_id": shopify_order_id},
                    {"_id": 0}
                )
                if fulfillment:
                    for li in fulfillment.get("line_items", []):
                        if li.get("product_id_1688"):
                            product_id_1688 = li["product_id_1688"]
                            break
            
            linked_products.append({
                "name": item.get("name", "Unknown"),
                "sku": sku,
                "quantity": item.get("quantity", 1),
                "product_id_1688": product_id_1688,
                "linked": bool(product_id_1688),
            })
        
        has_linked = any(p["linked"] for p in linked_products)
        
        results["orders"].append({
            "shopify_order_id": shopify_order_id,
            "order_number": order.get("order_number"),
            "customer_name": order.get("customer_name") or order.get("name"),
            "found": True,
            "linked": has_linked,
            "products": linked_products,
        })
        
        if has_linked:
            results["linked"] += 1
        else:
            results["unlinked"] += 1
    
    return results


# ==================== 1688 Translation API ====================

class TranslateRequest(BaseModel):
    text: str = Field(..., description="Text to translate (max 2000 chars)")
    field_type: str = Field("title", description="Type: 'title' for product title, 'offer' for description")
    source_language: str = Field("zh", description="Source language code (zh, en, etc.)")
    target_language: str = Field("en", description="Target language code")


@router.post("/translate")
async def translate_product_text(request: TranslateRequest):
    """
    Translate product text using 1688's official translation API.
    
    API: com.alibaba.text/alibaba.offer.translate
    
    Supports:
    - Product titles (field_type='title')
    - Product descriptions (field_type='offer')
    
    Languages: zh (Chinese), en (English), and many more
    """
    try:
        # Build API request
        api_name = "com.alibaba.text/alibaba.offer.translate"
        api_path = f"param2/1/{api_name}/{MERCHANT_APP_KEY}"
        
        # Get access token
        access_token = MERCHANT_ACCESS_TOKEN or os.environ.get("ALIBABA_1688_ACCESS_TOKEN", "")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="1688 access token not configured")
        
        # Build params - note: 1688 API has a typo 'filedType' instead of 'fieldType'
        params = {
            "access_token": access_token,
            "sourceText": request.text[:2000],  # Max 2000 chars
            "filedType": request.field_type,  # Note the typo in their API
            "sourceLanguage": request.source_language,
            "targetLanguage": request.target_language,
        }
        
        # Generate signature
        signature = generate_sign(api_path, params, MERCHANT_APP_SECRET)
        params["_aop_signature"] = signature
        
        url = f"{ALIBABA_API_URL}/{api_path}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                data=params,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            result = response.json() if response.text else {}
            
            if result.get("success"):
                translate_results = result.get("translateResult", [])
                if translate_results:
                    return {
                        "success": True,
                        "original_text": request.text,
                        "translated_text": translate_results[0].get("translateText", ""),
                        "source_language": request.source_language,
                        "target_language": request.target_language,
                    }
            
            # Handle errors
            return {
                "success": False,
                "error": result.get("errorMsg") or result.get("error_message") or "Translation failed",
                "error_code": result.get("errorCode") or result.get("error_code"),
                "raw_response": result,
            }
            
    except HTTPException:
        raise
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


# Note: Image search endpoint is defined earlier in this file
# See @router.post("/image-search") for the unified image search

@router.post("/image-search/from-shopify")
async def search_from_shopify_product(
    store_name: str = Body(..., description="Shopify store name"),
    product_id: str = Body(..., description="Shopify product ID"),
    page: int = Body(1, description="Page number"),
):
    """
    Search for similar 1688 products using a Shopify product's image.
    
    This endpoint fetches the product image from Shopify and uses it
    to find similar products on 1688.
    """
    try:
        # Get store from database
        store = await _db.stores.find_one({"store_name": store_name})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        shop_domain = store.get("shopify_domain") or store.get("shop_url")
        token = store.get("shopify_token") or store.get("access_token")
        
        if not token:
            raise HTTPException(status_code=400, detail="Store not connected to Shopify")
        
        # Fetch product from Shopify
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "X-Shopify-Access-Token": token,
                "Content-Type": "application/json"
            }
            
            response = await client.get(
                f"https://{shop_domain}/admin/api/2024-01/products/{product_id}.json",
                headers=headers
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Product not found in Shopify")
            
            product_data = response.json().get("product", {})
            images = product_data.get("images", [])
            
            if not images:
                raise HTTPException(status_code=400, detail="Product has no images")
            
            # Use the first image
            image_url = images[0].get("src")
            
            # Search on 1688
            search_result = await search_by_image(ImageSearchRequest(
                image_url=image_url,
                page=page
            ))
            
            return {
                "shopify_product": {
                    "id": product_id,
                    "title": product_data.get("title"),
                    "image_url": image_url,
                },
                "search_result": search_result,
            }
            
    except HTTPException:
        raise
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@router.post("/translate/batch")
async def translate_batch(
    texts: List[str] = Body(..., description="List of texts to translate"),
    field_type: str = Body("title", description="Type: 'title' or 'offer'"),
    source_language: str = Body("zh"),
    target_language: str = Body("en"),
):
    """
    Translate multiple texts in batch.
    """
    results = []
    
    for text in texts[:20]:  # Limit to 20 texts per batch
        try:
            result = await translate_product_text(TranslateRequest(
                text=text,
                field_type=field_type,
                source_language=source_language,
                target_language=target_language,
            ))
            results.append({
                "original": text,
                "translated": result.get("translated_text", ""),
                "success": result.get("success", False),
            })
        except Exception as e:
            results.append({
                "original": text,
                "translated": "",
                "success": False,
                "error": str(e),
            })
    
    return {
        "success": True,
        "count": len(results),
        "translations": results,
    }


# ==================== 1688 AI Title Generation API ====================

class TitleGenerationRequest(BaseModel):
    image_url: str = Field(..., description="URL of product image")
    category_id: str = Field("1036", description="1688 category ID for the product")


@router.post("/ai/generate-title")
async def generate_product_title(request: TitleGenerationRequest):
    """
    Generate intelligent product titles and selling points from an image.
    
    API: com.alibaba.image/image.product.intelligent.generate
    
    This API analyzes the product image and suggests titles and selling points.
    """
    try:
        api_name = "com.alibaba.image/image.product.intelligent.generate"
        api_path = f"param2/1/{api_name}/{MERCHANT_APP_KEY}"
        
        access_token = MERCHANT_ACCESS_TOKEN or os.environ.get("ALIBABA_1688_ACCESS_TOKEN", "")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="1688 access token not configured")
        
        params = {
            "access_token": access_token,
            "imageUrl": request.image_url,
            "catId": request.category_id,
        }
        
        signature = generate_sign(api_path, params, MERCHANT_APP_SECRET)
        params["_aop_signature"] = signature
        
        url = f"{ALIBABA_API_URL}/{api_path}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                data=params,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            result = response.json() if response.text else {}
            
            return {
                "success": True,
                "image_url": request.image_url,
                "category_id": request.category_id,
                "generated_content": result,
            }
            
    except HTTPException:
        raise
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }



# Image proxy endpoint to bypass CORS/mixed content issues
@router.get("/image-proxy")
async def proxy_image(url: str = Query(..., description="Image URL to proxy")):
    """
    Proxy images from 1688/Alibaba to bypass CORS and mixed content issues.
    Converts http:// to https:// and fetches the image.
    """
    try:
        # Convert http to https
        if url.startswith('http://'):
            url = url.replace('http://', 'https://')
        
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/*,*/*',
                    'Referer': 'https://1688.com/',
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch image")
            
            # Get content type
            content_type = response.headers.get('content-type', 'image/jpeg')
            
            from fastapi.responses import Response
            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    'Cache-Control': 'public, max-age=86400',
                    'Access-Control-Allow-Origin': '*',
                }
            )
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Image fetch timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image proxy error: {str(e)}")


# Create DWZ order from 1688 order
class Create1688DwzOrderRequest(BaseModel):
    order_id: str = Field(..., description="1688 Order ID")
    company_prefix: str = Field(default="TNV", description="Company prefix for reference number")
    courier_type: Optional[str] = Field(None, description="DWZ courier type (auto-detected if not provided)")
    destination: Optional[str] = Field(None, description="Destination country (auto-detected if not provided)")
    shopify_order_number: Optional[str] = Field(None, description="Shopify order number for tag")
    shopify_color: Optional[str] = Field(None, description="Shopify variant color for verification")
    shopify_size: Optional[str] = Field(None, description="Shopify variant size for verification")
    configured_remark: Optional[str] = Field(None, description="Previously configured remark to include")


@router.post("/create-dwz-from-1688")
async def create_dwz_order_from_1688(request: Create1688DwzOrderRequest):
    """
    Create a DWZ56 shipment from a 1688 order.
    
    Uses:
    - 1688 seller's tracking number as Internal Tracking (cNum)
    - Generated reference number format: {COMPANY}{COUNTRY}{DDMM}{COLOR}{SIZE}{SEQ}
    - 1688 order ID or Shopify order number as Tag (cMark)
    - Color/size info in remarks for verification
    """
    from routes.dwz56 import make_api_request as dwz_api_request, build_request_payload
    from datetime import datetime, timezone
    
    db = get_db()
    
    try:
        # Step 1: Get logistics/tracking info from 1688
        params = {
            "orderId": request.order_id,
            "webSite": "1688",
        }
        
        logistics_result = await make_api_request(
            "com.alibaba.logistics/alibaba.trade.getLogisticsInfos.buyerView",
            params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        logistics_list = logistics_result.get("result") or []
        if not logistics_list:
            raise HTTPException(status_code=400, detail="No logistics/tracking info found. Order must be shipped first.")
        
        first_logistics = logistics_list[0]
        tracking_number = first_logistics.get("logisticsBillNo")
        courier_name = first_logistics.get("logisticsCompanyName", "")
        
        if not tracking_number:
            raise HTTPException(status_code=400, detail="No tracking number found in logistics info")
        
        # Step 2: Get order details for color/size and address
        order_params = {
            "orderId": request.order_id,
            "webSite": "1688",
        }
        
        order_result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.get.buyerView",
            order_params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        order_info = order_result.get("result") or order_result
        base_info = order_info.get("baseInfo", {})
        product_items = order_info.get("productItems", [])
        native_logistics = order_info.get("nativeLogistics", {})
        
        # Step 3: Extract color and size from 1688 order
        first_product = product_items[0] if product_items else {}
        sku_infos = first_product.get("skuInfos", [])
        
        color_1688 = ""
        size_1688 = ""
        for sku in sku_infos:
            name = (sku.get("name") or "").lower()
            value = sku.get("value") or ""
            if "颜色" in name or "color" in name:
                color_1688 = value
            if "尺码" in name or "size" in name or "尺寸" in name:
                size_1688 = value
        
        # Get color code using the helper
        color_code, color_display = extract_color_from_1688(color_1688)
        
        # Step 4: Determine country and courier from store mapping (or use provided)
        # Try to detect from order or use defaults
        country_code = request.destination or "IN"  # Default to India
        courier_type = request.courier_type
        
        if not courier_type:
            # Auto-detect based on country
            if country_code in ["IN", "India"]:
                courier_type = "印度专线"
                country_code = "IN"
            elif country_code in ["PK", "Pakistan"]:
                courier_type = "巴基斯坦专线"
                country_code = "PK"
            else:
                courier_type = "印度专线"  # Default
                country_code = "IN"
        
        # Step 5: Generate reference number
        # Format: TNVIN0901Y41015 = {COMPANY}{COUNTRY}{DDMM}{COLOR}{SIZE}{SEQ}
        now = datetime.now(timezone.utc)
        date_str = f"{now.day:02d}{now.month:02d}"
        size_str = size_1688 if size_1688 else "00"
        seq_num = request.order_id[-3:] if request.order_id else "000"
        
        reference_number = f"{request.company_prefix}{country_code}{date_str}{color_code}{size_str}{seq_num}"
        
        # Step 6: Build remarks with verification info
        # Format:
        # [Configured Remark]
        # ✅ Using 1688 data (Color/Size) for the waybill
        # ✅ Showing Shopify data (Color/Size) for verification
        # 🔄 Color: MATCH/MISMATCH | Size: MATCH/MISMATCH
        
        remarks_parts = []
        
        # Add configured remark first if provided
        if request.configured_remark:
            remarks_parts.append(request.configured_remark)
        
        # 1688 data
        remarks_parts.append(f"✅ Using 1688 data ({color_1688 or 'N/A'}/{size_1688 or 'N/A'}) for the waybill")
        
        # Shopify data and match/mismatch verification
        if request.shopify_color or request.shopify_size:
            remarks_parts.append(f"✅ Showing Shopify data ({request.shopify_color or 'N/A'}/{request.shopify_size or 'N/A'}) for verification")
            
            # Compare color and size
            color_match = "N/A"
            size_match = "N/A"
            
            if request.shopify_color and color_1688:
                # Normalize colors for comparison (lowercase, strip whitespace)
                shopify_color_norm = request.shopify_color.lower().strip()
                color_1688_norm = color_1688.lower().strip()
                # Also check if translated color matches
                color_display_norm = color_display.lower().strip() if color_display else ""
                
                if shopify_color_norm == color_1688_norm or shopify_color_norm == color_display_norm or color_1688_norm in shopify_color_norm or shopify_color_norm in color_1688_norm:
                    color_match = "✅ MATCH"
                else:
                    color_match = "❌ MISMATCH"
            
            if request.shopify_size and size_1688:
                shopify_size_norm = request.shopify_size.lower().strip()
                size_1688_norm = size_1688.lower().strip()
                
                if shopify_size_norm == size_1688_norm:
                    size_match = "✅ MATCH"
                else:
                    size_match = "❌ MISMATCH"
            
            remarks_parts.append(f"Color: {color_match} | Size: {size_match}")
        
        remarks = " | ".join(remarks_parts)
        
        # Step 7: Build tag (Shopify order number or 1688 order ID)
        tag = request.shopify_order_number if request.shopify_order_number else f"1688-{request.order_id[-8:]}"
        
        # Step 8: Build address
        address_parts = [
            native_logistics.get("province"),
            native_logistics.get("city"),
            native_logistics.get("area"),
            native_logistics.get("town"),
            native_logistics.get("address"),
        ]
        full_address = " ".join(filter(None, address_parts))
        
        # Step 9: Create DWZ shipment
        dwz_record = {
            "iID": 0,
            "nItemType": 1,
            "nLanguage": 1,
            "cEmsKind": courier_type,
            "cDes": country_code,
            # Internal tracking = 1688 seller's tracking
            "cNum": tracking_number,
            # Reference number in configured format
            "cRNo": reference_number,
            # Remarks with color/size verification
            "cMemo": remarks,
            # Tag = Shopify order or 1688 ID
            "cMark": tag,
            # Receiver info
            "cReceiver": native_logistics.get("contactPerson") or base_info.get("buyerContact", {}).get("name", ""),
            "cRPhone": native_logistics.get("mobile") or base_info.get("buyerContact", {}).get("mobile", ""),
            "cRAddr": full_address,
            "cRPostcode": native_logistics.get("zip", ""),
            "cRCity": native_logistics.get("city", ""),
            "cRProvince": native_logistics.get("province", ""),
            # Goods info
            "cGoods": first_product.get("name", "1688 Order")[:50] if first_product.get("name") else "1688 Order",
            "iQuantity": sum(item.get("quantity", 1) for item in product_items),
            "fPrice": float(base_info.get("totalAmount", 0) or 0),
        }
        
        # Use RecList format as expected by DWZ API
        payload = build_request_payload("PreInputSet", {"RecList": [dwz_record]})
        dwz_response = await dwz_api_request(payload)
        
        return_value = dwz_response.get("ReturnValue", 0)
        if return_value < 0:
            # Map error codes to messages
            error_messages = {
                -1: "Authentication failed",
                -2: "Invalid request format",
                -3: "Missing required fields (cEmsKind, cDes)",
                -4: "Invalid courier type",
                -5: "Invalid destination",
            }
            error_msg = error_messages.get(return_value, f"Unknown error: {return_value}")
            raise HTTPException(
                status_code=400, 
                detail=f"DWZ API error: {error_msg}. Raw: {dwz_response}"
            )
        
        # Get created record ID and AWB from response
        created_ids = dwz_response.get("RecIDs", [])
        err_list = dwz_response.get("ErrList", [])
        awb_number = err_list[0].get("cNo") if err_list else None
        
        return {
            "success": True,
            "message": "DWZ order created successfully",
            "dwz_record_id": created_ids[0] if created_ids else (err_list[0].get("iID") if err_list else None),
            "awb_number": awb_number,
            "tracking_number_1688": tracking_number,
            "courier_1688": courier_name,
            "reference_number": reference_number,
            "tag": tag,
            "color_1688": color_1688,
            "color_code": color_code,
            "color_display": color_display,
            "size_1688": size_1688,
            "shopify_color": request.shopify_color,
            "shopify_size": request.shopify_size,
            "remarks": remarks,
            "dwz_response": dwz_response,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create DWZ from 1688: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create DWZ order: {str(e)}")


# =============================================================================
# TOKEN MANAGEMENT - Postpone/Refresh Token
# =============================================================================

@router.post("/auth/postpone-token")
async def postpone_token():
    """
    Extend/Postpone the current 1688 access token to prevent expiration.
    
    Uses the 1688 OAuth2 API: system.oauth2/postponeToken
    This extends the token validity period.
    
    Call this periodically (e.g., every few hours) to keep the token active.
    """
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="No access token configured")
    
    if not ALIBABA_APP_KEY or not ALIBABA_APP_SECRET:
        raise HTTPException(status_code=400, detail="App key and secret not configured")
    
    try:
        # Build the postpone token request
        api_path = f"param2/1/system.oauth2/postponeToken/{ALIBABA_APP_KEY}"
        
        params = {
            "access_token": ALIBABA_ACCESS_TOKEN,
        }
        
        # Build full URL (HTTPS required)
        url = f"https://gw.open.1688.com/openapi/{api_path}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                data=params,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Cache-Control": "no-cache",
                }
            )
            result = response.json()
        
        if "error_code" in result:
            return {
                "success": False,
                "error_code": result.get("error_code"),
                "error_message": result.get("error_message"),
                "message": "Failed to postpone token. You may need to re-authorize."
            }
        
        # Token postponed successfully
        return {
            "success": True,
            "message": "Token postponed successfully",
            "result": result,
            "current_token": ALIBABA_ACCESS_TOKEN[:20] + "..."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to postpone token: {str(e)}")


@router.post("/auth/refresh-token")
async def refresh_token_endpoint(refresh_token: str = Query(..., description="The refresh token")):
    """
    Get a new access token using the refresh token.
    
    Uses the 1688 OAuth2 API: system.oauth2/getToken with grant_type=refresh_token
    
    After getting a new token, update the .env file with the new access_token.
    """
    if not ALIBABA_APP_KEY or not ALIBABA_APP_SECRET:
        raise HTTPException(status_code=400, detail="App key and secret not configured")
    
    try:
        # Build the refresh token request
        api_path = f"param2/1/system.oauth2/getToken/{ALIBABA_APP_KEY}"
        
        params = {
            "grant_type": "refresh_token",
            "client_id": ALIBABA_APP_KEY,
            "client_secret": ALIBABA_APP_SECRET,
            "refresh_token": refresh_token,
        }
        
        # Build full URL (HTTPS required)
        url = f"https://gw.open.1688.com/openapi/{api_path}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                data=params,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Cache-Control": "no-cache",
                }
            )
            result = response.json()
        
        if "error_code" in result:
            return {
                "success": False,
                "error_code": result.get("error_code"),
                "error_message": result.get("error_message"),
                "message": "Failed to refresh token"
            }
        
        # Extract new tokens
        new_access_token = result.get("access_token")
        new_refresh_token = result.get("refresh_token")
        expires_in = result.get("expires_in")
        
        return {
            "success": True,
            "message": "Token refreshed successfully! Update your .env with the new access_token.",
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "expires_in": expires_in,
            "expires_in_hours": expires_in / 3600 if expires_in else None,
            "note": "Copy the new access_token to ALIBABA_1688_ACCESS_TOKEN in .env and restart backend"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh token: {str(e)}")


@router.get("/auth/token-status")
async def get_token_status():
    """
    Check the current token configuration status.
    """
    return {
        "app_key": ALIBABA_APP_KEY[:4] + "***" if ALIBABA_APP_KEY else None,
        "app_secret_configured": bool(ALIBABA_APP_SECRET),
        "access_token_configured": bool(ALIBABA_ACCESS_TOKEN),
        "access_token_preview": ALIBABA_ACCESS_TOKEN[:20] + "..." if ALIBABA_ACCESS_TOKEN else None,
        "api_url": ALIBABA_API_URL,
        "note": "Use /auth/postpone-token to extend token validity, or /auth/refresh-token to get a new token"
    }


@router.get("/auth/authorize-url")
async def get_authorize_url(
    redirect_uri: str = Query("https://multi-shop-hub-5.preview.emergentagent.com/api/1688/auth/callback", description="Callback URL after authorization")
):
    """
    Get the 1688 authorization URL to start OAuth flow.
    
    Steps:
    1. Visit the returned URL in your browser
    2. Login to 1688 and authorize the app
    3. You'll be redirected to the callback with a 'code' parameter
    4. Use that code to get access_token and refresh_token
    """
    if not ALIBABA_APP_KEY:
        raise HTTPException(status_code=400, detail="App key not configured")
    
    # Build authorization URL
    auth_url = f"https://auth.1688.com/oauth/authorize"
    params = {
        "client_id": ALIBABA_APP_KEY,
        "site": "1688",
        "redirect_uri": redirect_uri,
        "state": "1688auth",
    }
    
    from urllib.parse import urlencode
    full_url = f"{auth_url}?{urlencode(params)}"
    
    return {
        "authorization_url": full_url,
        "instructions": [
            "1. Click or copy the authorization_url and open in browser",
            "2. Login to your 1688 account",
            "3. Authorize the app",
            "4. You'll be redirected with a 'code' parameter",
            "5. Use /auth/exchange-code to get access_token and refresh_token"
        ],
        "redirect_uri": redirect_uri,
        "app_key": ALIBABA_APP_KEY
    }


@router.get("/auth/callback")
async def oauth_callback(
    code: str = Query(None, description="Authorization code from 1688"),
    state: str = Query(None),
    error: str = Query(None)
):
    """
    OAuth callback endpoint - receives the authorization code from 1688.
    """
    if error:
        return {"success": False, "error": error}
    
    if not code:
        return {
            "success": False,
            "message": "No authorization code received. Please start the authorization flow again.",
            "start_url": "/api/1688/auth/authorize-url"
        }
    
    # Automatically exchange code for tokens
    return {
        "success": True,
        "message": "Authorization code received! Use this code to get tokens.",
        "code": code,
        "next_step": f"Call POST /api/1688/auth/exchange-code with code={code}",
        "or_use_curl": f"curl -X POST 'https://multi-shop-hub-5.preview.emergentagent.com/api/1688/auth/exchange-code?code={code}'"
    }


@router.post("/auth/exchange-code")
async def exchange_code_for_tokens(
    code: str = Query(..., description="Authorization code from 1688 OAuth"),
    redirect_uri: str = Query("https://multi-shop-hub-5.preview.emergentagent.com/api/1688/auth/callback", description="Must match the redirect_uri used in authorize")
):
    """
    Exchange authorization code for access_token and refresh_token.
    
    This is the key step to get your refresh_token for long-term access.
    """
    if not ALIBABA_APP_KEY or not ALIBABA_APP_SECRET:
        raise HTTPException(status_code=400, detail="App key and secret not configured")
    
    try:
        # Build token request URL
        token_url = "https://gw.open.1688.com/openapi/http/1/system.oauth2/getToken/" + ALIBABA_APP_KEY
        
        params = {
            "grant_type": "authorization_code",
            "need_refresh_token": "true",
            "client_id": ALIBABA_APP_KEY,
            "client_secret": ALIBABA_APP_SECRET,
            "redirect_uri": redirect_uri,
            "code": code,
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                token_url,
                data=params,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                }
            )
            result = response.json()
        
        if "error_code" in result or "error" in result:
            return {
                "success": False,
                "error": result.get("error_code") or result.get("error"),
                "error_message": result.get("error_message") or result.get("error_description"),
                "raw_response": result
            }
        
        # Extract tokens
        access_token = result.get("access_token")
        refresh_token = result.get("refresh_token")
        expires_in = result.get("expires_in")
        refresh_expires_in = result.get("refresh_token_timeout") or result.get("refresh_expires_in")
        member_id = result.get("memberId") or result.get("aliId")
        
        return {
            "success": True,
            "message": "Tokens obtained successfully!",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in_seconds": expires_in,
            "expires_in_hours": round(expires_in / 3600, 1) if expires_in else None,
            "refresh_token_expires_in": refresh_expires_in,
            "member_id": member_id,
            "instructions": [
                "1. Copy access_token to ALIBABA_1688_ACCESS_TOKEN in backend/.env",
                "2. Copy refresh_token to ALIBABA_1688_REFRESH_TOKEN in backend/.env", 
                "3. Restart backend: sudo supervisorctl restart backend",
                "4. Use /auth/refresh-token periodically to get new access_token before it expires"
            ],
            "raw_response": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to exchange code: {str(e)}")
