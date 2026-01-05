"""
Shopify Publishing Service Module
Handles publishing products to Shopify stores
"""

from typing import Optional, Dict, List
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client['shopify_customers_db']
    return _db


def convert_price(cny_price: float, target_currency: str = "PKR", markup: float = 1.4) -> float:
    """
    Convert CNY price to target currency with markup.
    
    Args:
        cny_price: Price in Chinese Yuan
        target_currency: Target currency code
        markup: Markup multiplier (default 1.4 = 40% markup)
    
    Returns:
        Price in target currency
    """
    exchange_rates = {
        "PKR": 39.0,
        "USD": 0.14,
        "INR": 11.7,
        "AED": 0.51,
        "GBP": 0.11,
        "EUR": 0.13,
        "CAD": 0.19,
        "AUD": 0.21,
    }
    
    rate = exchange_rates.get(target_currency, 39.0)
    return round(cny_price * rate * markup, 2)


async def publish_product_to_shopify(
    product: Dict,
    store_name: str,
    target_currency: str = "PKR",
    markup: float = 1.4,
    tags: List[str] = None
) -> Dict:
    """
    Publish a scraped product to a Shopify store.
    
    Args:
        product: Product data dictionary
        store_name: Name of the Shopify store
        target_currency: Currency for pricing
        markup: Price markup multiplier
        tags: Additional tags to add
    
    Returns:
        Result dictionary with success status and Shopify product ID
    """
    import shopify
    
    db = get_db()
    
    # Get store credentials
    store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
    if not store:
        return {"success": False, "error": f"Store '{store_name}' not found"}
    
    shopify_domain = store.get("shopify_domain")
    shopify_token = store.get("shopify_token")
    
    if not shopify_domain or not shopify_token:
        return {"success": False, "error": f"Shopify not configured for store '{store_name}'"}
    
    try:
        # Connect to Shopify
        session = shopify.Session(shopify_domain, "2024-01", shopify_token)
        shopify.ShopifyResource.activate_session(session)
        
        # Build product data
        title = product.get("title", "") or product.get("title_en", "") or f"Product {product.get('product_id', '')}"
        description = product.get("description", "") or product.get("description_en", "") or ""
        
        # Create Shopify product
        shopify_product = shopify.Product()
        shopify_product.title = title[:255]
        shopify_product.body_html = description[:65535] if description else ""
        shopify_product.vendor = product.get("shop_name", "1688 Supplier")
        shopify_product.product_type = product.get("category", "")
        
        # Build tags
        product_tags = tags or []
        product_tags.append("1688-import")
        product_tags.append(f"1688-{product.get('product_id', '')}")
        shopify_product.tags = ",".join(product_tags)
        
        # Add images
        images = product.get("images", [])
        if images:
            shopify_product.images = []
            for i, img_url in enumerate(images[:10]):
                if img_url and isinstance(img_url, str):
                    shopify_product.images.append({"src": img_url, "position": i + 1})
        
        # Build variants
        variants = product.get("variants", [])
        base_price = float(product.get("price", "0").replace(",", "").replace("¥", ""))
        
        if variants and len(variants) > 0:
            # Product with variants
            shopify_product.variants = []
            
            for i, variant in enumerate(variants[:100]):
                var_price = float(variant.get("price", base_price) or base_price)
                converted_price = convert_price(var_price, target_currency, markup)
                
                color = variant.get("color", "")
                size = variant.get("size", "")
                props = variant.get("props_names", "")
                
                option1 = color or size or props.split(";")[0] if props else f"Option {i+1}"
                option2 = size if color else (props.split(";")[1] if ";" in props else None)
                
                var_data = {
                    "price": str(converted_price),
                    "sku": f"1688-{product.get('product_id', '')}-{variant.get('specId', i)}",
                    "inventory_quantity": int(variant.get("stock", 10)),
                    "inventory_management": "shopify",
                    "option1": option1[:255] if option1 else None,
                }
                
                if option2:
                    var_data["option2"] = option2[:255]
                
                shopify_product.variants.append(var_data)
            
            # Set options based on variant attributes
            if any(v.get("color") for v in variants):
                shopify_product.options = [{"name": "Color"}]
                if any(v.get("size") for v in variants):
                    shopify_product.options.append({"name": "Size"})
            else:
                shopify_product.options = [{"name": "Option"}]
        else:
            # Simple product without variants
            converted_price = convert_price(base_price, target_currency, markup)
            shopify_product.variants = [{
                "price": str(converted_price),
                "sku": f"1688-{product.get('product_id', '')}",
                "inventory_quantity": 100,
                "inventory_management": "shopify",
            }]
        
        # Save to Shopify
        success = shopify_product.save()
        
        shopify.ShopifyResource.clear_session()
        
        if success and shopify_product.id:
            # Update local product with Shopify ID
            await db.scraped_products.update_one(
                {"product_id": product.get("product_id")},
                {"$set": {
                    "shopify_product_id": shopify_product.id,
                    "shopify_store": store_name,
                    "published_to_shopify": True,
                    "published_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            
            return {
                "success": True,
                "shopify_product_id": shopify_product.id,
                "shopify_handle": shopify_product.handle,
                "variants_created": len(shopify_product.variants),
                "images_uploaded": len(images[:10]),
            }
        else:
            errors = shopify_product.errors.full_messages() if hasattr(shopify_product, 'errors') else []
            return {
                "success": False,
                "error": "Failed to save product",
                "shopify_errors": errors,
            }
            
    except Exception as e:
        try:
            shopify.ShopifyResource.clear_session()
        except Exception:
            pass
        return {
            "success": False,
            "error": str(e),
        }


async def batch_publish_to_shopify(
    products: List[Dict],
    store_name: str,
    target_currency: str = "PKR",
    markup: float = 1.4,
) -> Dict:
    """
    Publish multiple products to Shopify.
    
    Args:
        products: List of product dictionaries
        store_name: Shopify store name
        target_currency: Target currency
        markup: Price markup
    
    Returns:
        Summary of results
    """
    results = {
        "success": True,
        "total": len(products),
        "published": 0,
        "failed": 0,
        "products": [],
        "errors": [],
    }
    
    for product in products:
        result = await publish_product_to_shopify(
            product,
            store_name,
            target_currency,
            markup
        )
        
        if result.get("success"):
            results["published"] += 1
            results["products"].append({
                "product_id": product.get("product_id"),
                "shopify_id": result.get("shopify_product_id"),
            })
        else:
            results["failed"] += 1
            results["errors"].append({
                "product_id": product.get("product_id"),
                "error": result.get("error"),
            })
    
    results["success"] = results["published"] > 0
    return results


async def get_connected_shopify_stores() -> List[Dict]:
    """Get list of Shopify-connected stores"""
    db = get_db()
    
    stores = await db.stores.find(
        {"shopify_domain": {"$exists": True, "$ne": None}},
        {"_id": 0, "store_name": 1, "shopify_domain": 1}
    ).to_list(100)
    
    return stores
