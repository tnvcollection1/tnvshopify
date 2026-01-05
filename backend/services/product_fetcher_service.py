"""
Product Fetcher Service
Handles fetching product details from various sources:
- 1688 Official API (for ordered products)
- TMAPI (third-party API for any 1688 product)
- Taobao/Tmall via TMAPI
"""

import os
import hmac
import hashlib
import time as _time
import httpx
from typing import Optional, Dict, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client[os.environ.get('DB_NAME', 'shopify_customers_db')]
    return _db


# API Configuration
TMAPI_BASE_URL = os.environ.get('TMAPI_BASE_URL', 'http://api.tmapi.top')
TMAPI_TOKEN = os.environ.get('TMAPI_TOKEN', '')

# 1688 Official API Configuration
ALIBABA_APP_KEY = os.environ.get("ALIBABA_1688_APP_KEY", "8585237")
ALIBABA_APP_SECRET = os.environ.get("ALIBABA_1688_APP_SECRET", "")
ALIBABA_ACCESS_TOKEN = os.environ.get("ALIBABA_1688_ACCESS_TOKEN", "")
ALIBABA_API_URL = "https://gw.open.1688.com/openapi"


def generate_sign(api_path: str, params: dict, secret: str) -> str:
    """Generate HMAC-SHA1 signature for 1688 Official API"""
    enc_arr = []
    for key, value in params.items():
        if value is not None and str(value) != '':
            enc_arr.append(f"{key}{value}")
    enc_arr.sort()
    params_str = ''.join(enc_arr)
    sign_str = api_path + params_str
    hmac_obj = hmac.new(
        secret.encode('utf-8'),
        sign_str.encode('utf-8'),
        hashlib.sha1
    )
    return hmac_obj.hexdigest().upper()


async def log_tmapi_usage(endpoint: str, product_id: str, success: bool, error_msg: str = None):
    """Log TMAPI API usage for monitoring"""
    db = get_db()
    
    cost_map = {
        "item_detail": 50,
        "global/item_detail": 50,
        "search/image": 100,
        "taobao/item_detail": 50,
        "1688/item_detail": 50,
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


def fix_image_url(img_url: str) -> str:
    """Fix protocol-relative and partial image URLs"""
    if not img_url:
        return ""
    if img_url.startswith("//"):
        return "https:" + img_url
    elif img_url.startswith("img/") or img_url.startswith("ibank/"):
        return "https://cbu01.alicdn.com/" + img_url
    elif not img_url.startswith("http"):
        return "https://cbu01.alicdn.com/" + img_url
    return img_url


async def fetch_product_via_official_api(product_id: str) -> Optional[Dict]:
    """
    Fetch product details using 1688 Official API.
    Only works for products from suppliers you've ordered from.
    """
    if not ALIBABA_ACCESS_TOKEN or not ALIBABA_APP_SECRET:
        logger.debug("1688 Official API not configured")
        return None
    
    api_path = f"param2/1/com.alibaba.product/alibaba.product.simple.get/{ALIBABA_APP_KEY}"
    
    params = {
        "productID": int(product_id),
        "webSite": "1688",
        "access_token": ALIBABA_ACCESS_TOKEN,
        "_aop_timestamp": str(int(_time.time() * 1000)),
    }
    
    params = {k: str(v) for k, v in params.items() if v is not None and str(v) != ''}
    signature = generate_sign(api_path, params, ALIBABA_APP_SECRET)
    params['_aop_signature'] = signature
    
    url = f"{ALIBABA_API_URL}/{api_path}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                data=params,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            response.raise_for_status()
            result = response.json()
            
            product_info = result.get("productInfo") or result.get("result") or result
            
            if isinstance(product_info, dict) and product_info.get("subject"):
                # Extract images
                images = []
                image_data = product_info.get("image", {})
                image_list = image_data.get("images", [])
                
                for img in image_list[:10]:
                    img_url = img if isinstance(img, str) else img.get("url", "")
                    if img_url:
                        images.append(fix_image_url(img_url))
                
                # Extract price
                price = 0
                sale_info = product_info.get("saleInfo", {})
                price_ranges = sale_info.get("priceRange", [])
                if price_ranges:
                    price = float(price_ranges[0].get("price", 0))
                
                # Extract SKU variants
                variants = []
                sku_infos = product_info.get("skuInfos", [])
                for sku in sku_infos:
                    sku_attrs = []
                    for attr in (sku.get("attributes") or []):
                        sku_attrs.append({
                            "attributeName": attr.get("attributeDisplayName") or attr.get("attributeName", ""),
                            "attributeValue": attr.get("attributeValue") or attr.get("customValueName", ""),
                        })
                    variants.append({
                        "specId": sku.get("specId"),
                        "price": sku.get("price") or sku.get("consignPrice"),
                        "stock": sku.get("amountOnSale"),
                        "attributes": sku_attrs,
                    })
                
                return {
                    "product_id": product_id,
                    "url": f"https://detail.1688.com/offer/{product_id}.html",
                    "title": product_info.get("subject"),
                    "price": price,
                    "price_range": None,
                    "images": images,
                    "description": product_info.get("description"),
                    "seller_name": product_info.get("supplierLoginId"),
                    "min_order": sale_info.get("minOrderQuantity", 1),
                    "variants": variants,
                    "source": "official_api",
                }
                
    except Exception as e:
        logger.error(f"Official API fetch failed for {product_id}: {e}")
        return None
    
    return None


async def fetch_product_via_tmapi(product_id: str, log_usage: bool = True) -> Optional[Dict]:
    """
    Fetch product details using TMAPI (third-party API).
    Works for ANY 1688 product.
    
    Args:
        product_id: 1688 product ID
        log_usage: Whether to log API usage (for monitoring)
    """
    if not TMAPI_TOKEN:
        logger.warning("[TMAPI] No API token configured")
        return None
    
    url = f"{TMAPI_BASE_URL}/1688/item_detail"
    params = {
        "apiToken": TMAPI_TOKEN,
        "item_id": product_id,
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            result = response.json()
            
            # Check for success
            if result.get("code") != 200:
                error_msg = result.get('msg', 'Unknown error')
                logger.warning(f"[TMAPI] API error for {product_id}: {error_msg}")
                if log_usage:
                    await log_tmapi_usage("1688/item_detail", product_id, False, error_msg)
                return None
            
            data = result.get("data", {})
            
            if not data:
                logger.warning(f"[TMAPI] No data for {product_id}")
                if log_usage:
                    await log_tmapi_usage("1688/item_detail", product_id, False, "No data returned")
                return None
            
            # Extract images
            images = []
            main_imgs = data.get("main_imgs", [])
            for img in main_imgs[:10]:
                if img:
                    images.append(fix_image_url(img))
            
            # Extract price info
            price_info = data.get("price_info", {})
            price = float(price_info.get("price", 0) or price_info.get("price_min", 0) or 0)
            
            # Build price range string
            price_range_str = None
            price_min = price_info.get("price_min")
            price_max = price_info.get("price_max")
            if price_min and price_max and price_min != price_max:
                price_range_str = f"¥{price_min} - ¥{price_max}"
            
            # Extract SKU/variants
            variants = []
            sku_list = data.get("skus", [])
            for sku in sku_list[:50]:
                props_names = sku.get("props_names", "")
                attributes = []
                if props_names:
                    for prop in props_names.split(";"):
                        if ":" in prop:
                            name, value = prop.split(":", 1)
                            attributes.append({
                                "name": name.strip(),
                                "value": value.strip(),
                            })
                
                variants.append({
                    "sku_id": sku.get("skuid"),
                    "spec_id": sku.get("specid"),
                    "price": float(sku.get("sale_price", 0) or 0),
                    "stock": sku.get("stock", 0),
                    "attributes": attributes,
                    "props_names": props_names,
                })
            
            # Extract shop/seller info
            shop_info = data.get("shop_info", {})
            
            product = {
                "product_id": product_id,
                "url": data.get("product_url") or f"https://detail.1688.com/offer/{product_id}.html",
                "title": data.get("title", ""),
                "price": price,
                "price_range": price_range_str,
                "images": images,
                "description": None,
                "seller_name": shop_info.get("shop_name"),
                "seller_id": shop_info.get("shop_id"),
                "min_order": data.get("mixed_batch", {}).get("mix_num", 1) or 1,
                "variants": variants,
                "sales": data.get("sale_count"),
                "source": "tmapi",
            }
            
            logger.info(f"[TMAPI] Successfully fetched {product_id}: {product['title'][:40]}... ({len(variants)} variants)")
            
            if log_usage:
                await log_tmapi_usage("1688/item_detail", product_id, True)
            
            return product
            
    except httpx.HTTPStatusError as e:
        error_msg = f"HTTP {e.response.status_code}"
        if e.response.status_code == 439:
            error_msg = "Quota exceeded"
        logger.warning(f"[TMAPI] {error_msg} for {product_id}")
        if log_usage:
            await log_tmapi_usage("1688/item_detail", product_id, False, error_msg)
        return None
    except Exception as e:
        logger.error(f"[TMAPI] Error fetching {product_id}: {e}")
        if log_usage:
            await log_tmapi_usage("1688/item_detail", product_id, False, str(e))
        return None


async def fetch_taobao_product_via_tmapi(product_id: str, log_usage: bool = True) -> Optional[Dict]:
    """
    Fetch product details from Taobao/Tmall using TMAPI.
    
    Args:
        product_id: Taobao/Tmall product ID
        log_usage: Whether to log API usage
    """
    if not TMAPI_TOKEN:
        logger.warning("[TMAPI-Taobao] No API token configured")
        return None
    
    url = f"{TMAPI_BASE_URL}/taobao/item_detail"
    params = {
        "apiToken": TMAPI_TOKEN,
        "item_id": product_id,
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            result = response.json()
            
            if result.get("code") != 200:
                error_msg = result.get('msg', 'Unknown error')
                logger.warning(f"[TMAPI-Taobao] API error for {product_id}: {error_msg}")
                if log_usage:
                    await log_tmapi_usage("taobao/item_detail", product_id, False, error_msg)
                return None
            
            data = result.get("data", {})
            
            if not data:
                logger.warning(f"[TMAPI-Taobao] No data for {product_id}")
                if log_usage:
                    await log_tmapi_usage("taobao/item_detail", product_id, False, "No data")
                return None
            
            # Extract images
            images = []
            main_imgs = data.get("main_imgs", data.get("images", []))
            for img in main_imgs[:10]:
                if img:
                    images.append(fix_image_url(img))
            
            # Extract price
            price_info = data.get("price_info", {})
            price = float(price_info.get("price", 0) or data.get("price", 0) or 0)
            
            # Extract variants
            variants = []
            sku_list = data.get("skus", [])
            for sku in sku_list[:50]:
                props_names = sku.get("props_names", "")
                attributes = []
                if props_names:
                    for prop in props_names.split(";"):
                        if ":" in prop:
                            name, value = prop.split(":", 1)
                            attributes.append({
                                "name": name.strip(),
                                "value": value.strip(),
                            })
                
                variants.append({
                    "sku_id": sku.get("skuid"),
                    "spec_id": sku.get("specid"),
                    "price": float(sku.get("price", 0) or 0),
                    "stock": sku.get("stock", 0),
                    "attributes": attributes,
                    "props_names": props_names,
                })
            
            product = {
                "product_id": product_id,
                "url": data.get("product_url") or f"https://item.taobao.com/item.htm?id={product_id}",
                "title": data.get("title", ""),
                "price": price,
                "price_range": None,
                "images": images,
                "description": data.get("desc"),
                "seller_name": data.get("shop_info", {}).get("shop_name"),
                "min_order": 1,
                "variants": variants,
                "sales": data.get("sales"),
                "source": "tmapi_taobao",
                "platform": "taobao",
            }
            
            logger.info(f"[TMAPI-Taobao] Successfully fetched {product_id}: {product['title'][:40]}...")
            
            if log_usage:
                await log_tmapi_usage("taobao/item_detail", product_id, True)
            
            return product
            
    except Exception as e:
        logger.error(f"[TMAPI-Taobao] Error fetching {product_id}: {e}")
        if log_usage:
            await log_tmapi_usage("taobao/item_detail", product_id, False, str(e))
        return None


def detect_product_platform(product_id_or_url: str) -> str:
    """
    Detect which platform a product ID or URL belongs to.
    
    Returns: "1688", "taobao", "tmall", or "unknown"
    """
    s = product_id_or_url.lower()
    
    if "1688.com" in s or "detail.1688" in s:
        return "1688"
    elif "taobao.com" in s or "item.taobao" in s:
        return "taobao"
    elif "tmall.com" in s:
        return "tmall"
    elif product_id_or_url.isdigit():
        # Just a number - assume 1688 by default
        return "1688"
    
    return "unknown"


async def fetch_product_auto(product_id: str, platform: str = None) -> Optional[Dict]:
    """
    Automatically fetch product from the appropriate source.
    
    Args:
        product_id: Product ID or URL
        platform: Optional platform hint ("1688", "taobao", "tmall")
    
    Returns:
        Product dict or None
    """
    # Detect platform if not specified
    if not platform:
        platform = detect_product_platform(product_id)
    
    # Extract just the ID if URL was provided
    import re
    if "1688.com" in product_id:
        match = re.search(r'offer/(\d+)', product_id)
        if match:
            product_id = match.group(1)
    elif "taobao.com" in product_id or "tmall.com" in product_id:
        match = re.search(r'id=(\d+)', product_id)
        if match:
            product_id = match.group(1)
    
    # Fetch based on platform
    if platform in ["taobao", "tmall"]:
        return await fetch_taobao_product_via_tmapi(product_id)
    else:
        # Default to 1688
        # Try TMAPI first (works for any product)
        result = await fetch_product_via_tmapi(product_id)
        if result:
            return result
        
        # Fall back to official API (only works for ordered products)
        return await fetch_product_via_official_api(product_id)


async def save_product_to_db(product: Dict, translate: bool = False) -> Dict:
    """
    Save a fetched product to the database.
    
    Args:
        product: Product data dict
        translate: Whether to translate Chinese text to English
    
    Returns:
        Saved product dict
    """
    db = get_db()
    
    product_id = product.get("product_id")
    
    # Add metadata
    product["scraped_at"] = datetime.now(timezone.utc).isoformat()
    
    # Optionally translate
    if translate:
        from services.translation_service import translate_product
        product = await translate_product(product)
    
    # Upsert to database
    await db.scraped_products.update_one(
        {"product_id": product_id},
        {"$set": product},
        upsert=True
    )
    
    return product


async def batch_fetch_products(
    product_ids: List[str],
    platform: str = "1688",
    translate: bool = False,
    save_to_db: bool = True,
) -> Dict:
    """
    Batch fetch multiple products.
    
    Args:
        product_ids: List of product IDs
        platform: Platform to fetch from
        translate: Whether to translate
        save_to_db: Whether to save to database
    
    Returns:
        Result dict with fetched and failed products
    """
    results = {
        "success": [],
        "failed": [],
        "total": len(product_ids),
    }
    
    for product_id in product_ids:
        try:
            product = await fetch_product_auto(product_id, platform)
            
            if product:
                if save_to_db:
                    product = await save_product_to_db(product, translate)
                results["success"].append(product)
            else:
                results["failed"].append({
                    "product_id": product_id,
                    "error": "Failed to fetch product"
                })
        except Exception as e:
            results["failed"].append({
                "product_id": product_id,
                "error": str(e)
            })
    
    return results
