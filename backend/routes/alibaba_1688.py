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

# 1688 API Configuration
ALIBABA_APP_KEY = os.environ.get("ALIBABA_1688_APP_KEY", "8585237")
ALIBABA_APP_SECRET = os.environ.get("ALIBABA_1688_APP_SECRET", "Gin6sv4MkP")
ALIBABA_ACCESS_TOKEN = os.environ.get("ALIBABA_1688_ACCESS_TOKEN", "")

# API Base URLs
ALIBABA_API_URL = "https://gw.open.1688.com/openapi"
ALIBABA_AUTH_URL = "https://auth.1688.com/oauth/authorize"

# ==================== Signature Generation ====================

def generate_sign(api_path: str, params: dict, secret: str) -> str:
    """
    Generate signature for 1688 API
    Sign = HEX(MD5(secret + api_path + sorted_params_string + secret))
    """
    # Sort parameters alphabetically
    sorted_params = sorted(params.items())
    
    # Build params string: key1value1key2value2...
    params_str = ""
    for key, value in sorted_params:
        if value is not None and str(value) != '':
            params_str += f"{key}{value}"
    
    # Build sign string: secret + api_path + params + secret
    sign_str = secret + api_path + params_str + secret
    
    # MD5 hash and convert to uppercase hex
    sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()
    
    return sign


def build_api_request(api_name: str, params: dict, access_token: str = None):
    """Build the API request with proper signature for 1688"""
    
    # API path format: param2/1/com.alibaba.xxx/api_name/app_key
    api_path = f"param2/1/{api_name}/{ALIBABA_APP_KEY}"
    
    # Add access token if provided
    if access_token or ALIBABA_ACCESS_TOKEN:
        params['access_token'] = access_token or ALIBABA_ACCESS_TOKEN
    
    # Remove None values
    params = {k: str(v) for k, v in params.items() if v is not None}
    
    # Generate signature
    signature = generate_sign(api_path, params, ALIBABA_APP_SECRET)
    params['_aop_signature'] = signature
    
    # Build full URL
    url = f"{ALIBABA_API_URL}/{api_path}"
    
    return url, params


async def make_api_request(api_name: str, params: dict = None, method: str = "POST", access_token: str = None) -> dict:
    """Make HTTP request to 1688 API"""
    params = params or {}
    
    url, all_params = build_api_url(api_name, params, access_token)
    
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
            
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"API request failed: {str(e)}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")
    except json.JSONDecodeError as e:
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


# ==================== API Endpoints ====================

@router.get("/health")
async def health_check():
    """Check API connectivity and configuration"""
    return {
        "status": "ok",
        "app_key": ALIBABA_APP_KEY,
        "has_app_secret": bool(ALIBABA_APP_SECRET),
        "has_access_token": bool(ALIBABA_ACCESS_TOKEN),
        "has_tmapi_token": bool(TMAPI_TOKEN),
        "api_url": ALIBABA_API_URL,
    }


@router.post("/search")
async def search_products(request: ProductSearchRequest):
    """
    Search products on 1688
    """
    db = get_db()
    
    # Try official API first, fallback to TMAPI
    try:
        # Using official 1688 API
        params = {
            "keywords": request.keyword,
            "pageNo": str(request.page),
            "pageSize": str(request.page_size),
        }
        
        if request.min_price:
            params["priceStart"] = str(request.min_price)
        if request.max_price:
            params["priceEnd"] = str(request.max_price)
        
        # Try alibaba.product.search API
        result = await make_api_request("alibaba.product.search", params)
        
        # Parse and return results
        products = result.get("result", {}).get("data", [])
        
        return {
            "success": True,
            "source": "official_api",
            "keyword": request.keyword,
            "page": request.page,
            "total": result.get("result", {}).get("total", 0),
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
        }
        
    except Exception as e:
        # Log the error and try alternative method
        print(f"Official API error: {e}")
        
        # Fallback: Return mock data for testing
        return {
            "success": True,
            "source": "mock_data",
            "keyword": request.keyword,
            "page": request.page,
            "message": "Using mock data - configure access_token for live data",
            "products": [],
        }


@router.get("/product/{item_id}")
async def get_product_details(item_id: str):
    """
    Get detailed product information from 1688
    """
    try:
        params = {
            "offerId": item_id,
        }
        
        result = await make_api_request("alibaba.product.get", params)
        
        product = result.get("result", {})
        
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
        # Return error with helpful message
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch product. Ensure access_token is configured.",
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


@router.post("/create-purchase-order")
async def create_purchase_order(request: CreatePurchaseOrderRequest):
    """
    Create a purchase order on 1688
    This requires a valid access_token with trade permissions
    """
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(
            status_code=400, 
            detail="Access token not configured. Please add your 1688 authorized user to get an access token."
        )
    
    db = get_db()
    
    try:
        # Build order items
        order_items = []
        for item in request.items:
            order_items.append({
                "offerId": item.product_id,
                "specId": item.sku_id or "",
                "quantity": item.quantity,
            })
        
        # Create order preview first
        preview_params = {
            "orderEntryParam": json.dumps({
                "entries": order_items,
            }),
            "addressParam": json.dumps(request.shipping_address),
        }
        
        preview_result = await make_api_request(
            "alibaba.trade.createOrder.preview",
            preview_params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        if preview_result.get("errorCode"):
            raise HTTPException(
                status_code=400, 
                detail=f"Order preview failed: {preview_result.get('errorMessage')}"
            )
        
        # Create actual order
        create_params = {
            "orderEntryParam": json.dumps({
                "entries": order_items,
            }),
            "addressParam": json.dumps(request.shipping_address),
        }
        
        create_result = await make_api_request(
            "alibaba.trade.createOrder",
            create_params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        if create_result.get("errorCode"):
            raise HTTPException(
                status_code=400,
                detail=f"Order creation failed: {create_result.get('errorMessage')}"
            )
        
        # Save order to database
        order_id = create_result.get("result", {}).get("orderId")
        order_record = {
            "id": f"1688_order_{order_id}",
            "source": "1688",
            "order_id": order_id,
            "shopify_order_id": request.shopify_order_id,
            "items": [item.dict() for item in request.items],
            "shipping_address": request.shipping_address,
            "notes": request.notes,
            "status": "created",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "raw_response": create_result,
        }
        
        await db.purchase_orders_1688.insert_one(order_record)
        
        return {
            "success": True,
            "message": "Purchase order created successfully",
            "order_id": order_id,
            "order": order_record,
        }
        
    except HTTPException:
        raise
    except Exception as e:
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
    Get details of a specific 1688 purchase order
    """
    if not ALIBABA_ACCESS_TOKEN:
        raise HTTPException(status_code=400, detail="Access token not configured")
    
    try:
        params = {
            "orderId": order_id,
        }
        
        result = await make_api_request(
            "alibaba.trade.get.buyerView",
            params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        
        return {
            "success": True,
            "order": result.get("result"),
            "raw_response": result,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get order: {str(e)}")


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
