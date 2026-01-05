"""
Product Linking Service
Handles linking between Shopify products and 1688 supplier products
"""

import re
import os
import httpx
from typing import Dict, Optional, List
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


# TMAPI Configuration
TMAPI_BASE_URL = "http://api.tmapi.top"
TMAPI_TOKEN = os.environ.get("TMAPI_TOKEN", "")


async def link_product_to_1688(
    shopify_product_id: str,
    product_1688_id: str,
    shopify_sku: Optional[str] = None,
) -> Dict:
    """
    Create a link between a Shopify product and a 1688 product.
    
    Args:
        shopify_product_id: Shopify product ID
        product_1688_id: 1688 product ID
        shopify_sku: Optional Shopify SKU for more specific linking
    
    Returns:
        Result dict with success status and link data
    """
    db = get_db()
    
    try:
        # Get the 1688 product details
        product_1688 = await db.scraped_products.find_one(
            {"product_id": product_1688_id},
            {"_id": 0}
        )
        
        if not product_1688:
            return {
                "success": False,
                "error": f"1688 product {product_1688_id} not found. Please import it first."
            }
        
        # Create/update the link
        link_data = {
            "shopify_product_id": shopify_product_id,
            "shopify_sku": shopify_sku,
            "product_1688_id": product_1688_id,
            "product_1688_url": f"https://detail.1688.com/offer/{product_1688_id}.html",
            "product_1688_title": product_1688.get("title") or product_1688.get("title_cn"),
            "product_1688_price": product_1688.get("price"),
            "product_1688_image": (product_1688.get("images") or [None])[0],
            "variants_count": len(product_1688.get("variants") or []),
            "linked_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Use shopify_sku as primary key if available
        filter_key = {"shopify_sku": shopify_sku} if shopify_sku else {"shopify_product_id": shopify_product_id}
        
        await db.product_links.update_one(
            filter_key,
            {"$set": link_data},
            upsert=True
        )
        
        return {
            "success": True,
            "message": f"Linked to 1688 product {product_1688_id}",
            "link": link_data,
        }
        
    except Exception as e:
        logger.error(f"Error linking product: {e}")
        return {"success": False, "error": str(e)}


async def get_1688_link(
    shopify_sku: Optional[str] = None,
    shopify_product_id: Optional[str] = None
) -> Dict:
    """
    Get the linked 1688 product for a Shopify SKU or product ID.
    
    Args:
        shopify_sku: Shopify SKU to look up
        shopify_product_id: Shopify product ID to look up
    
    Returns:
        Result dict with link data or suggested link from SKU
    """
    db = get_db()
    
    if not shopify_sku and not shopify_product_id:
        return {"success": False, "error": "Provide shopify_sku or shopify_product_id"}
    
    # Try to find existing link
    query = {}
    if shopify_sku:
        query["shopify_sku"] = shopify_sku
    else:
        query["shopify_product_id"] = shopify_product_id
    
    link = await db.product_links.find_one(query, {"_id": 0})
    
    if link:
        return {
            "success": True,
            "linked": True,
            "link": link,
        }
    
    # Try to extract 1688 ID from SKU (if SKU contains product ID)
    if shopify_sku:
        match = re.search(r'(\d{12,})', shopify_sku)
        if match:
            product_1688_id = match.group(1)
            # Check if this product exists in our database
            product = await db.scraped_products.find_one(
                {"product_id": product_1688_id},
                {"_id": 0, "product_id": 1, "title": 1, "title_cn": 1, "price": 1, "images": 1, "variants": 1}
            )
            if product:
                return {
                    "success": True,
                    "linked": False,
                    "suggested_link": {
                        "product_1688_id": product_1688_id,
                        "product_1688_url": f"https://detail.1688.com/offer/{product_1688_id}.html",
                        "product_1688_title": product.get("title") or product.get("title_cn"),
                        "product_1688_price": product.get("price"),
                        "product_1688_image": (product.get("images") or [None])[0],
                        "variants_count": len(product.get("variants") or []),
                        "source": "extracted_from_sku",
                    }
                }
            else:
                return {
                    "success": True,
                    "linked": False,
                    "suggested_link": {
                        "product_1688_id": product_1688_id,
                        "product_1688_url": f"https://detail.1688.com/offer/{product_1688_id}.html",
                        "source": "extracted_from_sku",
                        "needs_import": True,
                    }
                }
    
    return {
        "success": True,
        "linked": False,
        "link": None,
    }


async def auto_link_from_image(
    shopify_sku: str,
    image_url: str
) -> Dict:
    """
    Auto-suggest 1688 product links by searching with an image.
    
    Args:
        shopify_sku: Shopify SKU to link
        image_url: Image URL to search with
    
    Returns:
        Result dict with suggested matches
    """
    if not TMAPI_TOKEN:
        return {"success": False, "error": "TMAPI token not configured"}
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{TMAPI_BASE_URL}/1688/search/image",
                params={
                    "apiToken": TMAPI_TOKEN,
                    "img_url": image_url,
                    "page": 1,
                    "page_size": 10,
                }
            )
            result = response.json()
        
        if result.get("code") != 200:
            return {"success": False, "error": result.get("msg", "Image search failed")}
        
        items = result.get("data", {}).get("items", [])
        
        # Format results
        suggestions = []
        for item in items[:5]:
            product_id = str(item.get("item_id", ""))
            shop_info = item.get("shop_info", {})
            
            suggestions.append({
                "product_1688_id": product_id,
                "product_1688_url": f"https://detail.1688.com/offer/{product_id}.html",
                "title": item.get("title"),
                "price": item.get("price"),
                "image": item.get("img"),
                "shop_name": shop_info.get("company_name") or shop_info.get("login_id"),
                "is_factory": shop_info.get("is_factory", False),
            })
        
        return {
            "success": True,
            "shopify_sku": shopify_sku,
            "suggestions": suggestions,
            "total_found": result.get("data", {}).get("total_count", 0),
        }
        
    except Exception as e:
        logger.error(f"Auto-link image search error: {e}")
        return {"success": False, "error": str(e)}


async def get_all_product_links(
    page: int = 1,
    limit: int = 50
) -> Dict:
    """
    Get all product links with pagination.
    
    Args:
        page: Page number (1-indexed)
        limit: Items per page
    
    Returns:
        Result dict with links and pagination info
    """
    db = get_db()
    
    skip = (page - 1) * limit
    
    links = await db.product_links.find(
        {},
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    total = await db.product_links.count_documents({})
    
    return {
        "success": True,
        "links": links,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


async def bulk_auto_link_from_title(
    products: List[Dict],
    confidence_threshold: float = 0.8
) -> Dict:
    """
    Bulk auto-link products by matching titles.
    
    Args:
        products: List of products with shopify_sku and title
        confidence_threshold: Minimum similarity score to auto-link
    
    Returns:
        Result dict with linked and unlinked products
    """
    db = get_db()
    
    results = {
        "linked": [],
        "unlinked": [],
        "errors": []
    }
    
    for product in products:
        shopify_sku = product.get("shopify_sku")
        title = product.get("title")
        
        if not shopify_sku:
            results["errors"].append({"product": product, "error": "Missing shopify_sku"})
            continue
        
        # First check if already linked
        existing_link = await db.product_links.find_one(
            {"shopify_sku": shopify_sku},
            {"_id": 0}
        )
        
        if existing_link:
            results["linked"].append({
                "shopify_sku": shopify_sku,
                "existing": True,
                "link": existing_link
            })
            continue
        
        # Try to extract 1688 ID from SKU
        match = re.search(r'(\d{12,})', shopify_sku)
        if match:
            product_1688_id = match.group(1)
            # Check if product exists
            product_1688 = await db.scraped_products.find_one(
                {"product_id": product_1688_id},
                {"_id": 0}
            )
            
            if product_1688:
                # Auto-link it
                link_result = await link_product_to_1688(
                    shopify_product_id=product.get("shopify_product_id", ""),
                    product_1688_id=product_1688_id,
                    shopify_sku=shopify_sku
                )
                
                if link_result.get("success"):
                    results["linked"].append({
                        "shopify_sku": shopify_sku,
                        "auto_linked": True,
                        "link": link_result.get("link")
                    })
                    continue
        
        results["unlinked"].append({
            "shopify_sku": shopify_sku,
            "title": title
        })
    
    return {
        "success": True,
        "results": results,
        "summary": {
            "total": len(products),
            "linked": len(results["linked"]),
            "unlinked": len(results["unlinked"]),
            "errors": len(results["errors"])
        }
    }


async def delete_product_link(
    shopify_sku: Optional[str] = None,
    shopify_product_id: Optional[str] = None
) -> Dict:
    """
    Delete a product link.
    
    Args:
        shopify_sku: Shopify SKU to unlink
        shopify_product_id: Shopify product ID to unlink
    
    Returns:
        Result dict with deletion status
    """
    db = get_db()
    
    if not shopify_sku and not shopify_product_id:
        return {"success": False, "error": "Provide shopify_sku or shopify_product_id"}
    
    query = {}
    if shopify_sku:
        query["shopify_sku"] = shopify_sku
    else:
        query["shopify_product_id"] = shopify_product_id
    
    result = await db.product_links.delete_one(query)
    
    return {
        "success": True,
        "deleted": result.deleted_count > 0
    }
