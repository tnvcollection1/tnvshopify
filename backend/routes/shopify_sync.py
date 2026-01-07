"""
Shopify Sync Routes
Endpoints for syncing orders, products, and draft orders from Shopify
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Body
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/shopify", tags=["Shopify Sync"])

# Database references - set from server.py
_db = None
_scheduler = None

def set_dependencies(db, scheduler=None):
    """Set database and scheduler from server.py"""
    global _db, _scheduler
    _db = db
    _scheduler = scheduler

def get_db():
    if _db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return _db


# Sync jobs tracking
sync_jobs = {}


class SyncJobStatus(BaseModel):
    job_id: str
    status: str
    progress: int = 0
    total: int = 0
    message: str = ""
    store_name: str = ""
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


@router.get("/sync-status/{job_id}")
async def get_sync_status(job_id: str):
    """Get status of a sync job"""
    if job_id in sync_jobs:
        return sync_jobs[job_id]
    return {"status": "not_found", "job_id": job_id}


@router.post("/sync/{store_name}")
async def sync_shopify_orders(store_name: str, days_back: int = 3650, full_sync: bool = False):
    """
    Synchronous sync of Shopify orders for a store.
    For large syncs, use /sync-background/{store_name} instead.
    """
    db = get_db()
    
    # Get store credentials
    store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail=f"Store not found: {store_name}")
    
    shopify_domain = store.get('shopify_domain', '').replace('https://', '').replace('http://', '')
    access_token = store.get('shopify_token')
    
    if not shopify_domain or not access_token:
        raise HTTPException(status_code=400, detail="Store not configured with Shopify credentials")
    
    # Import sync module
    from shopify_sync_async import ShopifyAsyncSync
    
    syncer = ShopifyAsyncSync(shopify_domain, access_token, store_name, db)
    
    try:
        result = await syncer.sync_orders(days_back=days_back)
        return {
            "success": True,
            "store_name": store_name,
            "synced": result.get('synced', 0),
            "updated": result.get('updated', 0),
            "message": f"Synced {result.get('synced', 0)} orders"
        }
    except Exception as e:
        logger.error(f"Sync error for {store_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-background/{store_name}")
async def start_sync_background(
    store_name: str, 
    days_back: int = 30, 
    background_tasks: BackgroundTasks = None
):
    """Start a background sync job for a store"""
    db = get_db()
    
    # Verify store exists
    store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail=f"Store not found: {store_name}")
    
    # Create job ID
    job_id = str(uuid.uuid4())[:8]
    
    sync_jobs[job_id] = {
        "job_id": job_id,
        "status": "starting",
        "progress": 0,
        "total": 0,
        "message": "Initializing sync...",
        "store_name": store_name,
        "started_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Start background task
    if background_tasks:
        background_tasks.add_task(
            run_background_sync, 
            job_id, 
            store_name, 
            days_back, 
            store
        )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": f"Sync job started for {store_name}"
    }


async def run_background_sync(job_id: str, store_name: str, days_back: int, store: dict):
    """Background task for syncing orders"""
    global sync_jobs
    db = get_db()
    
    try:
        sync_jobs[job_id]["status"] = "running"
        sync_jobs[job_id]["message"] = "Connecting to Shopify..."
        
        shopify_domain = store.get('shopify_domain', '').replace('https://', '').replace('http://', '')
        access_token = store.get('shopify_token')
        
        from shopify_sync_async import ShopifyAsyncSync
        syncer = ShopifyAsyncSync(shopify_domain, access_token, store_name, db)
        
        # Run sync with progress updates
        result = await syncer.sync_orders(days_back=days_back)
        
        sync_jobs[job_id].update({
            "status": "completed",
            "progress": 100,
            "total": result.get('synced', 0) + result.get('updated', 0),
            "message": f"Synced {result.get('synced', 0)} new, updated {result.get('updated', 0)}",
            "completed_at": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Background sync error: {e}")
        sync_jobs[job_id].update({
            "status": "error",
            "message": str(e),
            "completed_at": datetime.now(timezone.utc).isoformat()
        })


@router.post("/sync-products/{store_name}")
async def sync_products(store_name: str, background_tasks: BackgroundTasks):
    """Sync products from Shopify store"""
    db = get_db()
    
    store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail=f"Store not found: {store_name}")
    
    shopify_domain = store.get('shopify_domain', '').replace('https://', '').replace('http://', '')
    access_token = store.get('shopify_token')
    
    if not shopify_domain or not access_token:
        raise HTTPException(status_code=400, detail="Store not configured with Shopify")
    
    job_id = str(uuid.uuid4())[:8]
    
    sync_jobs[job_id] = {
        "job_id": job_id,
        "status": "starting",
        "store_name": store_name,
        "type": "products",
        "started_at": datetime.now(timezone.utc).isoformat()
    }
    
    background_tasks.add_task(
        run_product_sync,
        job_id,
        store_name,
        shopify_domain,
        access_token
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": f"Product sync started for {store_name}"
    }


async def run_product_sync(job_id: str, store_name: str, domain: str, token: str):
    """Background task for syncing products"""
    global sync_jobs
    db = get_db()
    
    import httpx
    
    try:
        sync_jobs[job_id]["status"] = "running"
        
        all_products = []
        url = f"https://{domain}/admin/api/2024-01/products.json?limit=250"
        headers = {"X-Shopify-Access-Token": token}
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            while url:
                response = await client.get(url, headers=headers)
                
                if response.status_code != 200:
                    raise Exception(f"Shopify API error: {response.status_code}")
                
                data = response.json()
                products = data.get('products', [])
                all_products.extend(products)
                
                # Check for pagination
                link_header = response.headers.get('Link', '')
                url = None
                if 'rel="next"' in link_header:
                    for link in link_header.split(','):
                        if 'rel="next"' in link:
                            url = link.split(';')[0].strip('<> ')
                            break
        
        # Save products to database
        synced = 0
        for product in all_products:
            await db.shopify_products.update_one(
                {
                    "shopify_product_id": str(product['id']),
                    "store_name": store_name
                },
                {
                    "$set": {
                        "shopify_product_id": str(product['id']),
                        "store_name": store_name,
                        "title": product.get('title', ''),
                        "handle": product.get('handle', ''),
                        "vendor": product.get('vendor', ''),
                        "product_type": product.get('product_type', ''),
                        "status": product.get('status', 'active'),
                        "tags": product.get('tags', ''),
                        "variants": product.get('variants', []),
                        "image_url": product.get('image', {}).get('src') if product.get('image') else (
                            product.get('images', [{}])[0].get('src') if product.get('images') else None
                        ),
                        "price": float(product.get('variants', [{}])[0].get('price', 0)) if product.get('variants') else 0,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "synced_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            synced += 1
        
        sync_jobs[job_id].update({
            "status": "completed",
            "total": synced,
            "message": f"Synced {synced} products",
            "completed_at": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Product sync error: {e}")
        sync_jobs[job_id].update({
            "status": "error",
            "message": str(e),
            "completed_at": datetime.now(timezone.utc).isoformat()
        })


@router.post("/sync-products-all")
async def sync_all_products(background_tasks: BackgroundTasks):
    """Sync products from all configured stores"""
    db = get_db()
    
    stores = await db.stores.find({}, {"_id": 0}).to_list(100)
    
    jobs = []
    for store in stores:
        if store.get('shopify_domain') and store.get('shopify_token'):
            job_id = str(uuid.uuid4())[:8]
            
            sync_jobs[job_id] = {
                "job_id": job_id,
                "status": "starting",
                "store_name": store['store_name'],
                "type": "products"
            }
            
            background_tasks.add_task(
                run_product_sync,
                job_id,
                store['store_name'],
                store['shopify_domain'].replace('https://', '').replace('http://', ''),
                store['shopify_token']
            )
            
            jobs.append({
                "job_id": job_id,
                "store_name": store['store_name']
            })
    
    return {
        "success": True,
        "stores": len(jobs),
        "jobs": jobs
    }


@router.get("/products")
async def get_products(
    store_name: Optional[str] = None,
    search: Optional[str] = None,
    link_status: Optional[str] = None,
    page: int = 1,
    page_size: int = 24
):
    """Get synced Shopify products with filters"""
    db = get_db()
    
    query = {}
    if store_name and store_name != 'all':
        query["store_name"] = store_name
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"handle": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    if link_status == 'linked':
        query["linked_1688_product_id"] = {"$exists": True, "$ne": None}
    elif link_status == 'unlinked':
        query["$or"] = [
            {"linked_1688_product_id": {"$exists": False}},
            {"linked_1688_product_id": None}
        ]
    
    skip = (page - 1) * page_size
    
    products = await db.shopify_products.find(query, {"_id": 0}) \
        .sort("title", 1) \
        .skip(skip) \
        .limit(page_size) \
        .to_list(page_size)
    
    total = await db.shopify_products.count_documents(query)
    
    return {
        "success": True,
        "products": products,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/products/sync-status")
async def get_products_sync_status(store_name: str = None):
    """Get product sync status for stores"""
    db = get_db()
    
    pipeline = [
        {"$group": {
            "_id": "$store_name",
            "product_count": {"$sum": 1},
            "linked_count": {"$sum": {"$cond": [{"$ifNull": ["$linked_1688_product_id", False]}, 1, 0]}},
            "last_synced": {"$max": "$synced_at"}
        }}
    ]
    
    if store_name:
        pipeline.insert(0, {"$match": {"store_name": store_name}})
    
    stats = await db.shopify_products.aggregate(pipeline).to_list(100)
    
    total_products = sum(s['product_count'] for s in stats)
    
    return {
        "success": True,
        "total_products": total_products,
        "statuses": [
            {
                "store_name": s['_id'],
                "product_count": s['product_count'],
                "linked_count": s['linked_count'],
                "last_synced": s['last_synced'],
                "status": "completed"
            }
            for s in stats
        ]
    }


@router.post("/products/{product_id}/link-1688")
async def link_product(product_id: str, data: dict = Body(...)):
    """Link a Shopify product to a 1688 product"""
    db = get_db()
    
    alibaba_product_id = data.get('alibaba_product_id')
    store_name = data.get('store_name')
    
    if not alibaba_product_id:
        raise HTTPException(status_code=400, detail="alibaba_product_id required")
    
    result = await db.shopify_products.update_one(
        {"shopify_product_id": product_id, "store_name": store_name} if store_name else {"shopify_product_id": product_id},
        {"$set": {
            "linked_1688_product_id": alibaba_product_id,
            "linked_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"success": True, "message": "Product linked successfully"}


@router.post("/products/{product_id}/unlink-1688")
async def unlink_product(product_id: str, data: dict = Body(...)):
    """Remove 1688 link from a Shopify product"""
    db = get_db()
    
    store_name = data.get('store_name')
    
    result = await db.shopify_products.update_one(
        {"shopify_product_id": product_id, "store_name": store_name} if store_name else {"shopify_product_id": product_id},
        {"$unset": {"linked_1688_product_id": "", "linked_at": ""}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"success": True, "message": "Product unlinked successfully"}


@router.post("/products/bulk-auto-link")
async def bulk_auto_link(
    data: dict = Body(...),
    background_tasks: BackgroundTasks = None
):
    """Auto-link unlinked products to 1688 using image search"""
    store_name = data.get('store_name')
    limit = data.get('limit', 100)
    
    if not store_name:
        raise HTTPException(status_code=400, detail="store_name required")
    
    job_id = str(uuid.uuid4())[:8]
    
    sync_jobs[job_id] = {
        "job_id": job_id,
        "status": "starting",
        "store_name": store_name,
        "type": "bulk_auto_link",
        "processed": 0,
        "linked": 0,
        "failed": 0,
        "total": 0
    }
    
    if background_tasks:
        background_tasks.add_task(run_bulk_auto_link, job_id, store_name, limit)
    
    return {"success": True, "job_id": job_id}


async def run_bulk_auto_link(job_id: str, store_name: str, limit: int):
    """Background task for bulk auto-linking products"""
    global sync_jobs
    db = get_db()
    
    try:
        # Get unlinked products
        unlinked = await db.shopify_products.find({
            "store_name": store_name,
            "$or": [
                {"linked_1688_product_id": {"$exists": False}},
                {"linked_1688_product_id": None}
            ],
            "image_url": {"$exists": True, "$ne": None}
        }).limit(limit).to_list(limit)
        
        sync_jobs[job_id]["total"] = len(unlinked)
        sync_jobs[job_id]["status"] = "running"
        
        from services.image_search_service import image_search_service
        
        for product in unlinked:
            try:
                image_url = product.get('image_url')
                if not image_url:
                    continue
                
                # Search 1688 for matching product
                results = await image_search_service.search_by_image(image_url)
                
                if results and len(results) > 0:
                    # Link to first result
                    best_match = results[0]
                    await db.shopify_products.update_one(
                        {"shopify_product_id": product['shopify_product_id'], "store_name": store_name},
                        {"$set": {
                            "linked_1688_product_id": best_match.get('product_id'),
                            "linked_1688_url": best_match.get('url'),
                            "linked_at": datetime.now(timezone.utc).isoformat(),
                            "auto_linked": True
                        }}
                    )
                    sync_jobs[job_id]["linked"] += 1
                else:
                    sync_jobs[job_id]["failed"] += 1
                    
            except Exception as e:
                logger.error(f"Auto-link error for {product.get('shopify_product_id')}: {e}")
                sync_jobs[job_id]["failed"] += 1
            
            sync_jobs[job_id]["processed"] += 1
        
        sync_jobs[job_id].update({
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Bulk auto-link error: {e}")
        sync_jobs[job_id].update({
            "status": "error",
            "message": str(e)
        })


@router.get("/products/bulk-auto-link/status/{job_id}")
async def get_auto_link_status(job_id: str):
    """Get status of bulk auto-link job"""
    if job_id in sync_jobs:
        return {"success": True, "job": sync_jobs[job_id]}
    return {"success": False, "message": "Job not found"}
