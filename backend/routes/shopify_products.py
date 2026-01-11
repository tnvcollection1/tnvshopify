"""
Shopify Products Router
Handles Shopify product-specific operations like variant creation.
"""
from fastapi import APIRouter, HTTPException, Body
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/shopify/products", tags=["Shopify Products"])


async def get_db():
    """Get database instance from main server"""
    from server import db
    return db


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
