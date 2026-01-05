"""
TMAPI Service Module
Handles all TMAPI-related operations including:
- Product fetching from 1688/Taobao/Tmall
- API usage logging
- Response parsing
"""

from typing import Optional, Dict, List
from datetime import datetime, timezone
import os
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

# TMAPI Configuration
TMAPI_BASE_URL = os.environ.get('TMAPI_BASE_URL', 'http://api.tmapi.top/1688')
TMAPI_TOKEN = os.environ.get('TMAPI_TOKEN', '')

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client['shopify_customers_db']
    return _db


async def log_tmapi_usage(endpoint: str, product_id: str, success: bool, error_msg: str = None):
    """Log TMAPI API usage for monitoring"""
    db = get_db()
    
    cost_map = {
        "item_detail": 50,
        "global/item_detail": 50,
        "search/image": 100,
        "taobao/item_detail": 50,
    }
    
    cost = cost_map.get(endpoint, 50)
    
    await db.tmapi_logs.insert_one({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "endpoint": endpoint,
        "product_id": product_id,
        "success": success,
        "error": error_msg,
        "cost": cost if success else 0,
    })


def parse_variant_props(variant: dict) -> dict:
    """
    Parse variant properties from TMAPI response.
    Handles props_names like "颜色:黑色;尺码:46"
    """
    result = {
        "specId": variant.get("specId", ""),
        "price": str(variant.get("price", variant.get("consignPrice", "0"))),
        "stock": variant.get("amountOnSale", variant.get("canBookCount", 0)),
        "color": "",
        "size": "",
        "props_names": variant.get("propsNames", ""),
    }
    
    props_names = variant.get("propsNames", "") or variant.get("props_names", "")
    
    if props_names:
        result["props_names"] = props_names
        parts = props_names.split(";")
        for part in parts:
            if ":" in part:
                key, value = part.split(":", 1)
                key_lower = key.lower()
                if any(k in key_lower for k in ["颜色", "color", "colour", "款式"]):
                    result["color"] = value.strip()
                elif any(k in key_lower for k in ["尺码", "尺寸", "size", "规格", "码"]):
                    result["size"] = value.strip()
    
    # Try attributes array if props_names didn't work
    if not result["color"] and not result["size"]:
        attributes = variant.get("skuAttributes", []) or variant.get("attributes", [])
        for attr in attributes:
            attr_name = attr.get("attributeName", "") or attr.get("name", "")
            attr_value = attr.get("attributeValue", "") or attr.get("value", "")
            name_lower = attr_name.lower()
            if any(k in name_lower for k in ["颜色", "color", "colour", "款式"]):
                result["color"] = attr_value
            elif any(k in name_lower for k in ["尺码", "尺寸", "size", "规格", "码"]):
                result["size"] = attr_value
    
    return result


def parse_global_api_response(item: dict, product_id: str) -> dict:
    """Parse response from TMAPI global/item_detail endpoint (pre-translated)"""
    
    # Handle nested data structure
    if "data" in item:
        item = item["data"]
    if "item" in item:
        item = item["item"]
    
    # Extract images
    images = []
    if item.get("main_imgs"):
        images = item["main_imgs"] if isinstance(item["main_imgs"], list) else [item["main_imgs"]]
    elif item.get("images"):
        images = item["images"] if isinstance(item["images"], list) else [item["images"]]
    elif item.get("pic_url"):
        images = [item["pic_url"]]
    
    # Extract variants/SKUs
    variants = []
    sku_list = item.get("sku_list", []) or item.get("skus", []) or []
    
    for sku in sku_list:
        parsed = parse_variant_props(sku)
        variants.append(parsed)
    
    # Build product object
    product = {
        "product_id": product_id,
        "title": item.get("title", "") or item.get("subject", ""),
        "title_original": item.get("title_original", "") or item.get("title", ""),
        "description": item.get("desc", "") or item.get("description", ""),
        "price": str(item.get("price", item.get("sale_price", "0"))),
        "price_range": item.get("priceRange", ""),
        "images": images,
        "variants": variants,
        "platform": "1688",
        "source": "tmapi_global",
        "shop_name": item.get("shop_name", "") or item.get("supplier_name", ""),
        "shop_id": item.get("shop_id", ""),
        "category": item.get("category", "") or item.get("category_name", ""),
        "min_order": item.get("min_order", 1),
        "unit": item.get("unit", "件"),
        "sales": item.get("sold_out", 0) or item.get("sales", 0),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    
    return product


def parse_standard_api_response(item: dict, product_id: str) -> dict:
    """Parse response from standard TMAPI item_detail endpoint"""
    
    if "data" in item:
        item = item["data"]
    if "item" in item:
        item = item["item"]
    
    # Extract images
    images = []
    if item.get("main_imgs"):
        images = item["main_imgs"] if isinstance(item["main_imgs"], list) else [item["main_imgs"]]
    elif item.get("images"):
        images = item["images"] if isinstance(item["images"], list) else []
    
    # Extract variants
    variants = []
    sku_list = item.get("sku_list", []) or item.get("skuInfos", []) or []
    
    for sku in sku_list:
        parsed = parse_variant_props(sku)
        variants.append(parsed)
    
    product = {
        "product_id": product_id,
        "title": item.get("title", "") or item.get("subject", ""),
        "description": item.get("desc", ""),
        "price": str(item.get("price", "0")),
        "price_range": item.get("priceRange", ""),
        "images": images,
        "variants": variants,
        "platform": "1688",
        "source": "tmapi_standard",
        "shop_name": item.get("shop_name", ""),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    
    return product


async def fetch_product_via_tmapi(product_id: str, use_global: bool = True) -> Optional[Dict]:
    """
    Fetch product details from TMAPI.
    
    Args:
        product_id: 1688 product ID
        use_global: If True, use global/item_detail for pre-translated data
    
    Returns:
        Product dictionary or None if failed
    """
    if not TMAPI_TOKEN:
        print(f"[TMAPI] No token configured")
        return None
    
    try:
        if use_global:
            # Use global API for pre-translated data
            url = f"{TMAPI_BASE_URL}/global/item_detail"
            params = {
                "apiToken": TMAPI_TOKEN,
                "item_id": product_id,
                "lang": "en",
            }
        else:
            # Standard endpoint
            url = f"{TMAPI_BASE_URL}/item_detail"
            params = {
                "apiToken": TMAPI_TOKEN,
                "item_id": product_id,
            }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            result = response.json()
            
            if result.get("code") == 200:
                endpoint = "global/item_detail" if use_global else "item_detail"
                await log_tmapi_usage(endpoint, product_id, True)
                
                if use_global:
                    return parse_global_api_response(result, product_id)
                else:
                    return parse_standard_api_response(result, product_id)
            else:
                error_msg = result.get("msg", "Unknown error")
                await log_tmapi_usage(
                    "global/item_detail" if use_global else "item_detail",
                    product_id, False, error_msg
                )
                print(f"[TMAPI] Error for {product_id}: {error_msg}")
                return None
                
    except Exception as e:
        print(f"[TMAPI] Exception fetching {product_id}: {e}")
        await log_tmapi_usage(
            "global/item_detail" if use_global else "item_detail",
            product_id, False, str(e)
        )
        return None


async def fetch_taobao_product_via_tmapi(product_id: str) -> Optional[Dict]:
    """
    Fetch Taobao/Tmall product via TMAPI.
    
    Args:
        product_id: Taobao item ID
    
    Returns:
        Product dictionary or None
    """
    if not TMAPI_TOKEN:
        return None
    
    try:
        # Use Taobao endpoint
        url = "http://api.tmapi.top/taobao/item_detail"
        params = {
            "apiToken": TMAPI_TOKEN,
            "item_id": product_id,
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            result = response.json()
            
            if result.get("code") == 200:
                await log_tmapi_usage("taobao/item_detail", product_id, True)
                
                data = result.get("data", {})
                item = data.get("item", data)
                
                # Extract images
                images = []
                if item.get("main_imgs"):
                    images = item["main_imgs"] if isinstance(item["main_imgs"], list) else [item["main_imgs"]]
                elif item.get("pic_url"):
                    images = [item["pic_url"]]
                
                # Extract variants
                variants = []
                sku_list = item.get("sku_list", []) or item.get("skus", []) or []
                for sku in sku_list:
                    parsed = parse_variant_props(sku)
                    variants.append(parsed)
                
                product = {
                    "product_id": product_id,
                    "title": item.get("title", ""),
                    "description": item.get("desc", ""),
                    "price": str(item.get("price", item.get("sale_price", "0"))),
                    "images": images,
                    "variants": variants,
                    "platform": "taobao",
                    "source": "tmapi_taobao",
                    "shop_name": item.get("shop_name", "") or item.get("seller_nick", ""),
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                }
                
                return product
            else:
                error_msg = result.get("msg", "Unknown error")
                await log_tmapi_usage("taobao/item_detail", product_id, False, error_msg)
                return None
                
    except Exception as e:
        print(f"[TMAPI Taobao] Exception: {e}")
        await log_tmapi_usage("taobao/item_detail", product_id, False, str(e))
        return None


async def search_products_by_image(image_url: str, limit: int = 20) -> List[Dict]:
    """
    Search for similar products using image URL.
    
    Args:
        image_url: URL of the image to search
        limit: Maximum number of results
    
    Returns:
        List of product results
    """
    if not TMAPI_TOKEN:
        return []
    
    try:
        url = "http://api.tmapi.top/1688/search/image"
        params = {
            "apiToken": TMAPI_TOKEN,
            "image_url": image_url,
            "page_size": min(limit, 50),
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            result = response.json()
            
            if result.get("code") == 200:
                await log_tmapi_usage("search/image", image_url[:50], True)
                
                data = result.get("data", {})
                items = data.get("items", []) or data.get("products", [])
                
                products = []
                for item in items[:limit]:
                    products.append({
                        "product_id": str(item.get("item_id", item.get("offerId", ""))),
                        "title": item.get("title", item.get("subject", "")),
                        "price": str(item.get("price", "0")),
                        "image": item.get("main_img", item.get("pic_url", "")),
                        "url": item.get("detail_url", f"https://detail.1688.com/offer/{item.get('item_id', '')}.html"),
                        "shop_name": item.get("shop_name", ""),
                        "sales": item.get("sold_out", 0),
                    })
                
                return products
            else:
                await log_tmapi_usage("search/image", image_url[:50], False, result.get("msg"))
                return []
                
    except Exception as e:
        print(f"[TMAPI Image Search] Error: {e}")
        return []


async def get_tmapi_usage_stats(days: int = 7) -> Dict:
    """Get TMAPI usage statistics for the specified number of days"""
    db = get_db()
    
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get logs from the past N days
    logs = await db.tmapi_logs.find({
        "timestamp": {"$gte": cutoff.isoformat()}
    }).to_list(10000)
    
    # Calculate stats
    total_calls = len(logs)
    successful_calls = sum(1 for log in logs if log.get("success"))
    total_cost = sum(log.get("cost", 0) for log in logs)
    
    # Group by endpoint
    by_endpoint = {}
    for log in logs:
        endpoint = log.get("endpoint", "unknown")
        if endpoint not in by_endpoint:
            by_endpoint[endpoint] = {"calls": 0, "success": 0, "cost": 0}
        by_endpoint[endpoint]["calls"] += 1
        if log.get("success"):
            by_endpoint[endpoint]["success"] += 1
        by_endpoint[endpoint]["cost"] += log.get("cost", 0)
    
    return {
        "total_calls": total_calls,
        "successful_calls": successful_calls,
        "failed_calls": total_calls - successful_calls,
        "success_rate": (successful_calls / total_calls * 100) if total_calls > 0 else 0,
        "total_cost": total_cost,
        "by_endpoint": by_endpoint,
        "period_days": days,
    }
