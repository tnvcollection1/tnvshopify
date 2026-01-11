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
    Scrape variants from 1688 product using TMAPI.
    """
    import os
    
    TMAPI_TOKEN = os.environ.get("TMAPI_TOKEN", "")
    
    if not TMAPI_TOKEN:
        return {"success": False, "error": "TMAPI token not configured"}
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                "http://api.tmapi.top/1688/item_detail",
                params={
                    "apiToken": TMAPI_TOKEN,
                    "item_id": product_id,
                }
            )
            data = response.json()
        
        if data.get("code") != 200:
            return {
                "success": False,
                "error": data.get("msg", data.get("message", "TMAPI request failed")),
            }
        
        item = data.get("data", {})
        
        # Extract all variants with color and size
        variants = []
        colors = set()
        sizes = set()
        
        sku_list = item.get("skus", [])
        for sku in sku_list:
            props_names = sku.get("props_names", "")
            color = ""
            size = ""
            
            if props_names:
                for part in props_names.split(";"):
                    if ":" in part:
                        key, value = part.split(":", 1)
                        key_lower = key.strip().lower()
                        if '颜色' in key_lower or 'color' in key_lower or '款式' in key_lower:
                            color = value.strip()
                            colors.add(color)
                        if '尺码' in key_lower or '尺寸' in key_lower or 'size' in key_lower or '规格' in key_lower:
                            size = value.strip()
                            sizes.add(size)
            
            variants.append({
                "sku_id": sku.get("sku_id", ""),
                "color": color or "Default",
                "size": size or "One Size",
                "price": float(sku.get("price", 0)),
                "stock": int(sku.get("quantity", 0)),
                "image": sku.get("pic", ""),
                "props_names": props_names,
            })
        
        return {
            "success": True,
            "colors": list(colors),
            "sizes": list(sizes),
            "variants": variants,
            "total_variants": len(variants),
            "title": item.get("title", ""),
        }
            
    except Exception as e:
        logger.error(f"Error scraping 1688 variants for {product_id}: {e}")
        return {"success": False, "error": str(e)}
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


# Store for bulk creation job status
bulk_creation_jobs = {}


@router.post("/bulk-variants/create")
async def bulk_create_variants(
    background_tasks: BackgroundTasks,
    store_name: Optional[str] = Body(None),
    product_ids: list = Body(None, description="Optional list of specific product IDs to process"),
    limit: int = Body(50, ge=1, le=200)
):
    """
    EXECUTE bulk variant creation for linked products.
    Creates missing variants in Shopify based on 1688 data.
    Returns a job ID to track progress.
    """
    import uuid
    
    job_id = str(uuid.uuid4())[:8]
    
    # Initialize job status
    bulk_creation_jobs[job_id] = {
        "status": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "progress": {
            "products_processed": 0,
            "products_total": 0,
            "variants_created": 0,
            "variants_failed": 0,
        },
        "logs": [],
        "completed_products": [],
        "failed_products": [],
    }
    
    # Start background task
    background_tasks.add_task(
        execute_bulk_variant_creation,
        job_id,
        store_name,
        product_ids,
        limit
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": "Bulk variant creation started. Use the job_id to track progress.",
        "status_url": f"/api/shopify/products/bulk-variants/status/{job_id}"
    }


async def execute_bulk_variant_creation(job_id: str, store_name: str, product_ids: list, limit: int):
    """Background task to execute bulk variant creation"""
    job = bulk_creation_jobs[job_id]
    
    def add_log(message: str, level: str = "info"):
        job["logs"].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "message": message
        })
        logger.info(f"[Job {job_id}] {message}")
    
    try:
        db = await get_db()
        add_log("Starting bulk variant creation...")
        
        # Build query for linked products
        query = {"linked_1688_product_id": {"$exists": True, "$ne": None}}
        if store_name:
            query["store_name"] = store_name
        if product_ids:
            query["shopify_product_id"] = {"$in": [str(pid) for pid in product_ids]}
        
        products = await db.shopify_products.find(
            query,
            {"_id": 0, "shopify_product_id": 1, "title": 1, "store_name": 1, 
             "linked_1688_product_id": 1, "variants": 1, "price": 1}
        ).limit(limit).to_list(limit)
        
        job["progress"]["products_total"] = len(products)
        add_log(f"Found {len(products)} linked products to process")
        
        if not products:
            job["status"] = "completed"
            add_log("No products to process", "warning")
            return
        
        # Group products by store for batch processing
        stores_cache = {}
        
        for product in products:
            product_id = product.get("shopify_product_id")
            product_title = product.get("title", "")[:50]
            store = product.get("store_name")
            product_id_1688 = product.get("linked_1688_product_id")
            shopify_variants = product.get("variants", [])
            
            add_log(f"Processing: {product_title}...")
            
            try:
                # Scrape 1688 variants
                result = await scrape_1688_variants(product_id_1688)
                
                if not result.get("success"):
                    add_log(f"Failed to scrape 1688 for {product_title}: {result.get('error')}", "error")
                    job["failed_products"].append({
                        "product_id": product_id,
                        "title": product_title,
                        "error": result.get("error", "Scrape failed")
                    })
                    job["progress"]["products_processed"] += 1
                    continue
                
                variants_1688 = result.get("variants", [])
                
                if not variants_1688:
                    add_log(f"No variants found on 1688 for {product_title}", "warning")
                    job["progress"]["products_processed"] += 1
                    continue
                
                # Find missing variants
                shopify_combos = set()
                for v in shopify_variants:
                    opt1 = (v.get("option1") or "").lower().strip()
                    opt2 = (v.get("option2") or "").lower().strip()
                    shopify_combos.add(f"{opt1}|{opt2}")
                
                missing_variants = []
                for v in variants_1688:
                    color = (v.get("color") or "").lower().strip()
                    size = (v.get("size") or "").lower().strip()
                    combo = f"{color}|{size}"
                    
                    if combo not in shopify_combos:
                        missing_variants.append({
                            "option1": v.get("color") or "Default",
                            "option2": v.get("size") or "One Size",
                            "price": v.get("price") or product.get("price") or 0,
                            "sku": f"{product_id_1688}-{(v.get('color') or '')[:3]}-{v.get('size') or ''}".upper(),
                            "inventory_quantity": v.get("stock", 0)
                        })
                
                if not missing_variants:
                    add_log(f"All variants synced for {product_title}")
                    job["progress"]["products_processed"] += 1
                    continue
                
                add_log(f"Found {len(missing_variants)} missing variants for {product_title}")
                
                # Get store credentials (cached)
                if store not in stores_cache:
                    store_doc = await db.stores.find_one({"store_name": store}, {"_id": 0})
                    stores_cache[store] = store_doc
                
                store_doc = stores_cache.get(store)
                if not store_doc or not store_doc.get("shopify_domain") or not store_doc.get("shopify_token"):
                    add_log(f"Store {store} not configured with Shopify credentials", "error")
                    job["failed_products"].append({
                        "product_id": product_id,
                        "title": product_title,
                        "error": "Store not configured"
                    })
                    job["progress"]["products_processed"] += 1
                    continue
                
                # Create variants in Shopify
                import shopify
                session = shopify.Session(store_doc['shopify_domain'], '2024-01', store_doc['shopify_token'])
                shopify.ShopifyResource.activate_session(session)
                
                try:
                    shopify_product = shopify.Product.find(int(product_id))
                    if not shopify_product:
                        add_log(f"Product {product_id} not found in Shopify", "error")
                        job["failed_products"].append({
                            "product_id": product_id,
                            "title": product_title,
                            "error": "Not found in Shopify"
                        })
                        continue
                    
                    created_count = 0
                    failed_count = 0
                    
                    for variant_data in missing_variants:
                        try:
                            new_variant = shopify.Variant()
                            new_variant.product_id = int(product_id)
                            new_variant.option1 = variant_data.get("option1", "Default")
                            new_variant.option2 = variant_data.get("option2")
                            new_variant.price = str(variant_data.get("price", 0))
                            new_variant.sku = variant_data.get("sku", "")
                            new_variant.inventory_quantity = variant_data.get("inventory_quantity", 0)
                            new_variant.inventory_management = "shopify"
                            
                            if new_variant.save():
                                created_count += 1
                            else:
                                failed_count += 1
                        except Exception as ve:
                            failed_count += 1
                            add_log(f"Failed to create variant: {str(ve)}", "error")
                    
                    job["progress"]["variants_created"] += created_count
                    job["progress"]["variants_failed"] += failed_count
                    
                    if created_count > 0:
                        add_log(f"Created {created_count} variants for {product_title}", "success")
                        
                        # Update local DB
                        updated_shopify_product = shopify.Product.find(int(product_id))
                        if updated_shopify_product:
                            variants_data = [v.to_dict() for v in updated_shopify_product.variants]
                            await db.shopify_products.update_one(
                                {"shopify_product_id": str(product_id)},
                                {"$set": {"variants": variants_data, "updated_at": datetime.now(timezone.utc).isoformat()}}
                            )
                        
                        job["completed_products"].append({
                            "product_id": product_id,
                            "title": product_title,
                            "variants_created": created_count
                        })
                    
                    if failed_count > 0:
                        add_log(f"Failed to create {failed_count} variants for {product_title}", "warning")
                    
                finally:
                    shopify.ShopifyResource.clear_session()
                
            except Exception as e:
                add_log(f"Error processing {product_title}: {str(e)}", "error")
                job["failed_products"].append({
                    "product_id": product_id,
                    "title": product_title,
                    "error": str(e)
                })
            
            job["progress"]["products_processed"] += 1
        
        job["status"] = "completed"
        job["completed_at"] = datetime.now(timezone.utc).isoformat()
        add_log(f"Bulk creation completed. Created {job['progress']['variants_created']} variants across {len(job['completed_products'])} products.", "success")
        
    except Exception as e:
        job["status"] = "failed"
        job["error"] = str(e)
        add_log(f"Bulk creation failed: {str(e)}", "error")
        logger.error(f"Bulk variant creation failed: {str(e)}")


@router.get("/bulk-variants/status/{job_id}")
async def get_bulk_creation_status(job_id: str):
    """Get the status and logs of a bulk variant creation job"""
    if job_id not in bulk_creation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "success": True,
        "job_id": job_id,
        **bulk_creation_jobs[job_id]
    }


@router.get("/bulk-variants/jobs")
async def list_bulk_creation_jobs():
    """List all bulk creation jobs"""
    jobs = []
    for job_id, job in bulk_creation_jobs.items():
        jobs.append({
            "job_id": job_id,
            "status": job["status"],
            "started_at": job.get("started_at"),
            "completed_at": job.get("completed_at"),
            "progress": job["progress"]
        })
    return {"success": True, "jobs": jobs}


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
