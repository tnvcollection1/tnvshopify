"""
Shopify Products Router
Handles Shopify product-specific operations like variant creation.
"""
from fastapi import APIRouter, HTTPException, Body, Query, BackgroundTasks
from datetime import datetime, timezone
from typing import Optional
import logging
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/shopify/products", tags=["Shopify Products"])


async def get_db():
    """Get database instance from main server"""
    from server import db
    return db


async def scrape_1688_variants(product_id: str) -> dict:
    """
    Scrape variants from 1688 product page.
    Returns dict with colors, sizes, and variants.
    """
    try:
        url = f"https://detail.1688.com/offer/{product_id}.html"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            }
            response = await client.get(url, headers=headers, follow_redirects=True)
            
            if response.status_code != 200:
                return {"success": False, "error": f"HTTP {response.status_code}"}
            
            html = response.text
            
            # Extract SKU data from the page
            import re
            import json
            
            # Try to find iDetailData or skuProps in the HTML
            sku_match = re.search(r'iDetailData\s*=\s*(\{.+?\});', html, re.DOTALL)
            if not sku_match:
                sku_match = re.search(r'"skuProps"\s*:\s*(\[.+?\])', html)
            
            colors = []
            sizes = []
            variants = []
            
            if sku_match:
                try:
                    data = json.loads(sku_match.group(1))
                    sku_props = data.get('skuProps', []) if isinstance(data, dict) else data
                    
                    for prop in sku_props:
                        prop_name = prop.get('prop', '').lower()
                        values = prop.get('value', [])
                        
                        if '颜色' in prop_name or 'color' in prop_name:
                            colors = [v.get('name', '') for v in values if v.get('name')]
                        elif '尺' in prop_name or 'size' in prop_name or '码' in prop_name:
                            sizes = [v.get('name', '') for v in values if v.get('name')]
                    
                    # Generate variant combinations
                    if colors and sizes:
                        for color in colors:
                            for size in sizes:
                                variants.append({
                                    "color": color,
                                    "size": size,
                                    "price": 0,
                                    "stock": 0
                                })
                    elif colors:
                        for color in colors:
                            variants.append({"color": color, "size": "One Size", "price": 0, "stock": 0})
                    elif sizes:
                        for size in sizes:
                            variants.append({"color": "Default", "size": size, "price": 0, "stock": 0})
                            
                except json.JSONDecodeError:
                    pass
            
            # Fallback: try to extract from other patterns
            if not variants:
                # Look for color/size in different format
                color_match = re.findall(r'"颜色[^"]*":\s*"([^"]+)"', html)
                size_match = re.findall(r'"尺[^"]*":\s*"([^"]+)"', html)
                
                if color_match:
                    colors = list(set(color_match))
                if size_match:
                    sizes = list(set(size_match))
                    
                if colors or sizes:
                    colors = colors or ["Default"]
                    sizes = sizes or ["One Size"]
                    for color in colors:
                        for size in sizes:
                            variants.append({"color": color, "size": size, "price": 0, "stock": 0})
            
            return {
                "success": True,
                "colors": colors,
                "sizes": sizes,
                "variants": variants,
                "total_variants": len(variants)
            }
            
    except Exception as e:
        logger.error(f"Error scraping 1688 variants for {product_id}: {e}")
        return {"success": False, "error": str(e)}


@router.post("/bulk-variants/preview")
async def preview_bulk_variant_creation(
    store_name: Optional[str] = Body(None),
    limit: int = Body(100, ge=1, le=500)
):
    """
    DRY-RUN PREVIEW: Scan linked products and show what variants would be created.
    Does NOT make any changes to Shopify - only generates a report.
    """
    try:
        db = await get_db()
        
        # Find all linked products
        query = {"linked_1688_product_id": {"$exists": True, "$ne": None}}
        if store_name:
            query["store_name"] = store_name
        
        products = await db.shopify_products.find(
            query,
            {"_id": 0, "shopify_product_id": 1, "title": 1, "store_name": 1, 
             "linked_1688_product_id": 1, "variants": 1, "image_url": 1}
        ).limit(limit).to_list(limit)
        
        if not products:
            return {
                "success": True,
                "message": "No linked products found",
                "summary": {
                    "products_scanned": 0,
                    "products_with_missing": 0,
                    "total_missing_variants": 0
                },
                "products": []
            }
        
        # Analyze each product
        products_with_missing = []
        total_missing_variants = 0
        products_scanned = 0
        errors = []
        
        for product in products:
            products_scanned += 1
            product_id_1688 = product.get("linked_1688_product_id")
            shopify_variants = product.get("variants", [])
            
            if not product_id_1688:
                continue
            
            try:
                # Scrape 1688 variants
                result = await scrape_1688_variants(product_id_1688)
                
                if not result.get("success"):
                    errors.append({
                        "product_id": product.get("shopify_product_id"),
                        "title": product.get("title", "")[:50],
                        "error": result.get("error", "Failed to scrape")
                    })
                    continue
                
                variants_1688 = result.get("variants", [])
                
                if not variants_1688:
                    continue
                
                # Compare with Shopify variants
                shopify_combos = set()
                for v in shopify_variants:
                    opt1 = (v.get("option1") or "").lower().strip()
                    opt2 = (v.get("option2") or "").lower().strip()
                    shopify_combos.add(f"{opt1}|{opt2}")
                
                # Find missing variants
                missing_variants = []
                for v in variants_1688:
                    color = (v.get("color") or "").lower().strip()
                    size = (v.get("size") or "").lower().strip()
                    combo = f"{color}|{size}"
                    
                    if combo not in shopify_combos:
                        missing_variants.append({
                            "color": v.get("color") or "Default",
                            "size": v.get("size") or "One Size",
                            "price": v.get("price", 0),
                            "stock": v.get("stock", 0)
                        })
                
                if missing_variants:
                    products_with_missing.append({
                        "shopify_product_id": product.get("shopify_product_id"),
                        "title": product.get("title", "")[:80],
                        "store_name": product.get("store_name"),
                        "image_url": product.get("image_url"),
                        "linked_1688_id": product_id_1688,
                        "shopify_variant_count": len(shopify_variants),
                        "variants_1688_count": len(variants_1688),
                        "missing_count": len(missing_variants),
                        "missing_variants": missing_variants[:20]  # Limit to first 20 for preview
                    })
                    total_missing_variants += len(missing_variants)
                    
            except Exception as e:
                errors.append({
                    "product_id": product.get("shopify_product_id"),
                    "title": product.get("title", "")[:50],
                    "error": str(e)
                })
        
        # Sort by missing count descending
        products_with_missing.sort(key=lambda x: x["missing_count"], reverse=True)
        
        return {
            "success": True,
            "message": f"Preview complete. {len(products_with_missing)} products have missing variants.",
            "summary": {
                "products_scanned": products_scanned,
                "products_with_missing": len(products_with_missing),
                "total_missing_variants": total_missing_variants,
                "errors_count": len(errors)
            },
            "products": products_with_missing[:50],  # Return top 50 products
            "errors": errors[:10] if errors else [],
            "note": "This is a DRY-RUN preview. No changes have been made to Shopify."
        }
        
    except Exception as e:
        logger.error(f"Error in bulk variant preview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{product_id}/create-variants")
async def create_product_variants(product_id: str, data: dict = Body(...)):
    """
    Create new variants for an existing Shopify product.
    Used to add missing color/size variants from 1688.
    """
    try:
        db = await get_db()
        store_name = data.get("store_name")
        variants = data.get("variants", [])
        
        if not variants:
            raise HTTPException(status_code=400, detail="No variants provided")
        
        # Find the product in local DB
        query = {"shopify_product_id": str(product_id)}
        if store_name:
            query["store_name"] = store_name
        
        product = await db.shopify_products.find_one(query, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        actual_store = store_name or product.get("store_name")
        
        # Get store credentials
        store = await db.stores.find_one({"store_name": actual_store}, {"_id": 0})
        if not store or not store.get("shopify_domain") or not store.get("shopify_token"):
            raise HTTPException(status_code=400, detail="Store not configured with Shopify credentials")
        
        # Create variants in Shopify
        import shopify
        session = shopify.Session(store['shopify_domain'], '2024-01', store['shopify_token'])
        shopify.ShopifyResource.activate_session(session)
        
        try:
            # Get the product from Shopify
            shopify_product = shopify.Product.find(int(product_id))
            if not shopify_product:
                raise HTTPException(status_code=404, detail="Product not found in Shopify")
            
            created_variants = []
            failed_variants = []
            
            for variant_data in variants:
                try:
                    # Create new variant
                    new_variant = shopify.Variant()
                    new_variant.product_id = int(product_id)
                    new_variant.option1 = variant_data.get("option1", "Default")
                    new_variant.option2 = variant_data.get("option2")
                    new_variant.option3 = variant_data.get("option3")
                    new_variant.price = str(variant_data.get("price", 0))
                    new_variant.sku = variant_data.get("sku", "")
                    new_variant.inventory_quantity = variant_data.get("inventory_quantity", 0)
                    new_variant.inventory_management = "shopify"
                    
                    if new_variant.save():
                        created_variants.append({
                            "id": new_variant.id,
                            "option1": new_variant.option1,
                            "option2": new_variant.option2,
                            "sku": new_variant.sku,
                        })
                        logger.info(f"Created variant: {new_variant.option1} / {new_variant.option2}")
                    else:
                        failed_variants.append({
                            "option1": variant_data.get("option1"),
                            "option2": variant_data.get("option2"),
                            "error": str(new_variant.errors.full_messages()) if new_variant.errors else "Unknown error"
                        })
                except Exception as e:
                    failed_variants.append({
                        "option1": variant_data.get("option1"),
                        "option2": variant_data.get("option2"),
                        "error": str(e)
                    })
            
            # Update local DB with new variants
            if created_variants:
                # Fetch updated product from Shopify to get all variants
                updated_shopify_product = shopify.Product.find(int(product_id))
                if updated_shopify_product:
                    variants_data = [v.to_dict() for v in updated_shopify_product.variants]
                    await db.shopify_products.update_one(
                        query,
                        {
                            "$set": {
                                "variants": variants_data,
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
            
            return {
                "success": True,
                "created_count": len(created_variants),
                "failed_count": len(failed_variants),
                "created_variants": created_variants,
                "failed_variants": failed_variants,
                "message": f"Created {len(created_variants)} variants" + (f", {len(failed_variants)} failed" if failed_variants else "")
            }
            
        finally:
            shopify.ShopifyResource.clear_session()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating variants: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
