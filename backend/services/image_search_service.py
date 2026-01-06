"""
Image Search Service Module
Handles 1688 image search and product linking operations
"""

from typing import Optional, Dict, List
from datetime import datetime, timezone
import os
import httpx
import re
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
load_dotenv(Path(__file__).parent.parent / '.env')

# TMAPI Configuration - loaded dynamically to pick up .env values
def get_tmapi_token():
    return os.environ.get('TMAPI_TOKEN', '')

def get_tmapi_base_url():
    return os.environ.get('TMAPI_BASE_URL', 'http://api.tmapi.top/1688')

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client[os.environ.get('DB_NAME', 'shopify_customers_db')]
    return _db


async def search_products_by_image(image_url: str, limit: int = 20) -> Dict:
    """
    Search for similar products on 1688 using image URL.
    Automatically converts non-Alibaba images to Alibaba CDN format.
    
    Args:
        image_url: URL of the image to search
        limit: Maximum number of results
    
    Returns:
        Dict with success status and products list
    """
    tmapi_token = get_tmapi_token()
    if not tmapi_token:
        return {"success": False, "error": "TMAPI token not configured"}
    
    db = get_db()
    
    try:
        # Step 1: Convert non-Alibaba images to Alibaba CDN format
        img_url = image_url
        if not any(domain in img_url.lower() for domain in ['alicdn.com', '1688.com', 'taobao.com', 'tmall.com']):
            # Use POST request with JSON body as per TMAPI docs
            convert_url = "http://api.tmapi.top/1688/tools/image/convert_url"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                convert_response = await client.post(
                    convert_url,
                    params={"apiToken": tmapi_token},
                    json={"url": img_url},
                    headers={"Content-Type": "application/json"}
                )
                convert_result = convert_response.json()
                
                if convert_result.get("code") == 200:
                    data = convert_result.get("data", {})
                    # Response can have 'image_url' or 'img_url' key
                    converted_path = data.get("image_url") or data.get("img_url") or data.get("url")
                    if converted_path:
                        # TMAPI returns a relative path, need to construct full URL
                        if converted_path.startswith("/"):
                            img_url = f"https://cbu01.alicdn.com{converted_path}"
                        else:
                            img_url = converted_path
                        print(f"[Image Search] Converted image URL: {img_url[:80]}...")
                    else:
                        print(f"[Image Search] Conversion succeeded but no URL in response: {data}")
                else:
                    print(f"[Image Search] Could not convert image: {convert_result.get('msg', 'Unknown error')}")
                    # Still try with original URL
        
        # Step 2: Search by converted image
        search_url = "http://api.tmapi.top/1688/search/image"
        params = {
            "apiToken": tmapi_token,
            "img_url": img_url,
            "page_size": min(limit, 20),  # Max 20 per TMAPI docs
            "sort": "sales",  # Prioritize popular products
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(search_url, params=params)
            result = response.json()
            
            # Log usage
            await db.tmapi_logs.insert_one({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "endpoint": "search/image",
                "product_id": image_url[:100],
                "success": result.get("code") == 200,
                "cost": 100 if result.get("code") == 200 else 0,
            })
            
            if result.get("code") == 200:
                data = result.get("data", {})
                items = data.get("items", []) or data.get("products", [])
                
                products = []
                for item in items[:limit]:
                    product = {
                        "product_id": str(item.get("item_id", item.get("offerId", ""))),
                        "title": item.get("title", item.get("subject", "")),
                        "price": str(item.get("price", "0")),
                        "image": item.get("main_img", item.get("pic_url", "")),
                        "url": item.get("detail_url") or f"https://detail.1688.com/offer/{item.get('item_id', '')}.html",
                        "shop_name": item.get("shop_name", ""),
                        "sales": item.get("sold_out", 0),
                    }
                    products.append(product)
                
                return {
                    "success": True,
                    "total": len(products),
                    "products": products,
                }
            else:
                return {
                    "success": False,
                    "error": result.get("msg", "Image search failed"),
                    "code": result.get("code"),
                }
                
    except Exception as e:
        print(f"[Image Search] Error: {e}")
        return {"success": False, "error": str(e)}


async def link_product_by_image(
    shopify_sku: str,
    image_url: str,
    store_name: str = None,
) -> Dict:
    """
    Find and link a 1688 product to a Shopify SKU using image search.
    
    Args:
        shopify_sku: The Shopify product SKU
        image_url: Image URL to search
        store_name: Optional store name
    
    Returns:
        Dict with linked product info
    """
    db = get_db()
    
    # Search for similar products
    search_result = await search_products_by_image(image_url, limit=5)
    
    if not search_result.get("success") or not search_result.get("products"):
        return {
            "success": False,
            "error": "No matching products found",
            "search_result": search_result,
        }
    
    # Get the best match (first result)
    best_match = search_result["products"][0]
    
    # Save the link
    link_data = {
        "shopify_sku": shopify_sku,
        "product_1688_id": best_match["product_id"],
        "product_1688_url": best_match["url"],
        "product_1688_title": best_match["title"],
        "product_1688_price": best_match["price"],
        "product_1688_image": best_match["image"],
        "linked_by": "image_search",
        "confidence": "high" if len(search_result["products"]) > 0 else "low",
        "store_name": store_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.product_links.update_one(
        {"shopify_sku": shopify_sku},
        {"$set": link_data},
        upsert=True
    )
    
    return {
        "success": True,
        "linked_product": best_match,
        "alternatives": search_result["products"][1:5],
        "shopify_sku": shopify_sku,
    }


async def auto_link_products_by_image(
    products: List[Dict],
    store_name: str = None,
) -> Dict:
    """
    Auto-link multiple products using their images.
    
    Args:
        products: List of products with 'sku' and 'image_url' fields
        store_name: Store name for the links
    
    Returns:
        Summary of linking results
    """
    results = {
        "success": True,
        "total": len(products),
        "linked": 0,
        "failed": 0,
        "links": [],
        "errors": [],
    }
    
    for product in products:
        sku = product.get("sku")
        image_url = product.get("image_url") or product.get("image")
        
        if not sku or not image_url:
            results["failed"] += 1
            results["errors"].append({
                "sku": sku,
                "error": "Missing SKU or image URL"
            })
            continue
        
        try:
            link_result = await link_product_by_image(sku, image_url, store_name)
            
            if link_result.get("success"):
                results["linked"] += 1
                results["links"].append({
                    "sku": sku,
                    "product_1688_id": link_result["linked_product"]["product_id"],
                })
            else:
                results["failed"] += 1
                results["errors"].append({
                    "sku": sku,
                    "error": link_result.get("error", "Unknown error")
                })
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({
                "sku": sku,
                "error": str(e)
            })
    
    return results


async def get_product_link(shopify_sku: str) -> Optional[Dict]:
    """Get the 1688 product link for a Shopify SKU"""
    db = get_db()
    
    link = await db.product_links.find_one(
        {"shopify_sku": shopify_sku},
        {"_id": 0}
    )
    
    return link


async def get_all_product_links(
    store_name: str = None,
    page: int = 1,
    page_size: int = 50,
) -> Dict:
    """Get all product links with pagination"""
    db = get_db()
    
    query = {}
    if store_name:
        query["store_name"] = store_name
    
    skip = (page - 1) * page_size
    
    links = await db.product_links.find(
        query,
        {"_id": 0}
    ).sort("updated_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    total = await db.product_links.count_documents(query)
    
    return {
        "success": True,
        "links": links,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def extract_1688_id_from_sku(sku: str) -> Optional[str]:
    """
    Extract 1688 product ID from a SKU string.
    Supports formats: 1688-PRODUCTID, SKU-1688-PRODUCTID, etc.
    """
    if not sku:
        return None
    
    # Try various patterns
    patterns = [
        r'1688[_-]?(\d{10,})',  # 1688-123456789012 or 1688_123456789012
        r'(\d{10,})[_-]1688',   # 123456789012-1688
        r'^(\d{10,})$',         # Just the ID
    ]
    
    for pattern in patterns:
        match = re.search(pattern, sku)
        if match:
            return match.group(1)
    
    return None
