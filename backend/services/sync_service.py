"""
Production Data Sync Service
Handles robust, incremental, chunked syncing with auto-retry and scheduling
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import asyncio
import logging
import uuid
import traceback

logger = logging.getLogger(__name__)

# Will be injected from server.py
db = None
shopify_sync_func = None  # Reference to the actual Shopify sync function

def set_dependencies(database, sync_func=None):
    """Set dependencies from server.py"""
    global db, shopify_sync_func
    db = database
    shopify_sync_func = sync_func

router = APIRouter(prefix="/api/sync", tags=["Data Sync"])


# ============ Enums & Models ============

class SyncType(str, Enum):
    ORDERS = "orders"
    PRODUCTS = "products"
    INVENTORY = "inventory"
    CUSTOMERS = "customers"
    ALL = "all"

class SyncStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"

class SyncJobCreate(BaseModel):
    store_name: str
    sync_type: SyncType = SyncType.ORDERS
    incremental: bool = True  # Only sync new data since last sync
    days_back: int = 30  # For non-incremental syncs
    chunk_size: int = 250  # Records per chunk
    max_retries: int = 3

class SyncScheduleCreate(BaseModel):
    store_name: str
    sync_type: SyncType = SyncType.ORDERS
    schedule_type: str = "interval"  # interval, daily, weekly
    interval_hours: int = 6  # For interval type
    daily_time: str = "02:00"  # For daily type (HH:MM)
    enabled: bool = True


# ============ In-Memory Job Tracking ============
# For real-time progress updates (also persisted to DB)
active_jobs: Dict[str, Dict[str, Any]] = {}


# ============ Helper Functions ============

async def get_last_sync_time(store_name: str, sync_type: str) -> Optional[datetime]:
    """Get the last successful sync time for a store/type"""
    record = await db.sync_history.find_one(
        {"store_name": store_name, "sync_type": sync_type, "status": "completed"},
        sort=[("completed_at", -1)]
    )
    if record and record.get("completed_at"):
        completed = record["completed_at"]
        if isinstance(completed, str):
            return datetime.fromisoformat(completed.replace("Z", "+00:00"))
        return completed
    return None

async def create_sync_job(job_data: dict) -> str:
    """Create a new sync job record"""
    job_id = str(uuid.uuid4())
    job_doc = {
        "job_id": job_id,
        "store_name": job_data["store_name"],
        "sync_type": job_data["sync_type"],
        "status": SyncStatus.PENDING.value,
        "incremental": job_data.get("incremental", True),
        "days_back": job_data.get("days_back", 30),
        "chunk_size": job_data.get("chunk_size", 250),
        "max_retries": job_data.get("max_retries", 3),
        "current_retry": 0,
        "progress": {
            "total": 0,
            "processed": 0,
            "failed": 0,
            "percentage": 0
        },
        "chunks": [],
        "errors": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": None,
        "completed_at": None,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    await db.sync_jobs.insert_one(job_doc)
    active_jobs[job_id] = job_doc
    return job_id

async def update_job_progress(job_id: str, updates: dict):
    """Update job progress in both memory and DB"""
    updates["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    if job_id in active_jobs:
        active_jobs[job_id].update(updates)
    
    await db.sync_jobs.update_one(
        {"job_id": job_id},
        {"$set": updates}
    )

async def record_sync_history(job_id: str, store_name: str, sync_type: str, 
                              status: str, records_synced: int, error: str = None):
    """Record sync completion in history"""
    history_doc = {
        "job_id": job_id,
        "store_name": store_name,
        "sync_type": sync_type,
        "status": status,
        "records_synced": records_synced,
        "error": error,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sync_history.insert_one(history_doc)


# ============ Core Sync Logic ============

async def sync_orders_chunked(job_id: str, store_name: str, incremental: bool, 
                               days_back: int, chunk_size: int):
    """Sync orders in chunks with progress tracking"""
    from shopify_sync import ShopifyOrderSync
    
    try:
        # Get store credentials
        store = await db.stores.find_one({"store_name": store_name})
        if not store:
            raise Exception(f"Store {store_name} not found")
        
        shopify_domain = store.get("shopify_domain") or store.get("shop_url")
        shopify_token = store.get("shopify_token")
        
        if not shopify_domain or not shopify_token:
            raise Exception("Store missing Shopify credentials")
        
        sync = ShopifyOrderSync(shopify_domain, shopify_token)
        
        # Determine sync start date
        if incremental:
            last_sync = await get_last_sync_time(store_name, "orders")
            if last_sync:
                created_after = last_sync - timedelta(hours=1)  # Overlap for safety
            else:
                created_after = datetime.now(timezone.utc) - timedelta(days=days_back)
        else:
            created_after = datetime.now(timezone.utc) - timedelta(days=days_back)
        
        await update_job_progress(job_id, {
            "status": SyncStatus.RUNNING.value,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "message": f"Fetching orders since {created_after.isoformat()}"
        })
        
        # Fetch all orders first to get total count
        logger.info(f"[{job_id}] Fetching orders for {store_name} since {created_after}")
        all_orders = sync.fetch_orders(limit=250, status="any", created_after=created_after, fetch_all=True)
        
        # Also fetch cancelled orders
        cancelled_orders = sync.fetch_orders(limit=250, status="cancelled", created_after=created_after, fetch_all=True)
        
        # Combine and dedupe
        order_ids = set()
        orders = []
        for order in all_orders + cancelled_orders:
            if order.get("id") not in order_ids:
                order_ids.add(order.get("id"))
                orders.append(order)
        
        total_orders = len(orders)
        logger.info(f"[{job_id}] Found {total_orders} orders to sync")
        
        await update_job_progress(job_id, {
            "progress.total": total_orders,
            "message": f"Processing {total_orders} orders in chunks of {chunk_size}"
        })
        
        # Process in chunks
        processed = 0
        failed = 0
        chunks_info = []
        
        for i in range(0, total_orders, chunk_size):
            chunk = orders[i:i + chunk_size]
            chunk_num = (i // chunk_size) + 1
            total_chunks = (total_orders + chunk_size - 1) // chunk_size
            
            chunk_info = {
                "chunk_number": chunk_num,
                "start_index": i,
                "count": len(chunk),
                "status": "processing",
                "started_at": datetime.now(timezone.utc).isoformat()
            }
            
            try:
                # Process each order in chunk
                for order in chunk:
                    try:
                        customer = order.get("customer", {}) or {}
                        shipping = order.get("shipping_address", {}) or {}
                        
                        order_data = {
                            "customer_id": f"shopify_{customer.get('id', order['id'])}",
                            "shopify_order_id": str(order.get("id")),
                            "order_id": str(order.get("id")),
                            "order_number": str(order.get("order_number", "")),
                            "store_name": store_name,
                            "first_name": customer.get("first_name") or shipping.get("first_name", ""),
                            "last_name": customer.get("last_name") or shipping.get("last_name", ""),
                            "email": customer.get("email") or order.get("email", ""),
                            "phone": customer.get("phone") or shipping.get("phone") or order.get("phone", ""),
                            "address": shipping.get("address1", ""),
                            "city": shipping.get("city", ""),
                            "province": shipping.get("province", ""),
                            "zip": shipping.get("zip", ""),
                            "country": shipping.get("country", ""),
                            "total_spent": float(order.get("total_price", 0)),
                            "total_price": float(order.get("total_price", 0)),
                            "subtotal_price": float(order.get("subtotal_price", 0)),
                            "fulfillment_status": order.get("fulfillment_status") or "unfulfilled",
                            "financial_status": order.get("financial_status", "pending"),
                            "line_items": order.get("line_items", []),
                            "created_at": order.get("created_at"),
                            "last_order_date": order.get("created_at"),
                            "synced_at": datetime.now(timezone.utc).isoformat()
                        }
                        
                        # Handle cancelled orders
                        if order.get("cancelled_at"):
                            order_data["fulfillment_status"] = "cancelled"
                            order_data["cancelled_at"] = order.get("cancelled_at")
                        
                        # Upsert order
                        await db.customers.update_one(
                            {"shopify_order_id": str(order.get("id"))},
                            {"$set": order_data},
                            upsert=True
                        )
                        processed += 1
                        
                    except Exception as e:
                        logger.error(f"[{job_id}] Error processing order {order.get('id')}: {e}")
                        failed += 1
                
                chunk_info["status"] = "completed"
                chunk_info["processed"] = len(chunk) - (failed - sum(c.get("failed", 0) for c in chunks_info))
                
            except Exception as e:
                chunk_info["status"] = "failed"
                chunk_info["error"] = str(e)
                logger.error(f"[{job_id}] Chunk {chunk_num} failed: {e}")
            
            chunk_info["completed_at"] = datetime.now(timezone.utc).isoformat()
            chunks_info.append(chunk_info)
            
            # Update progress
            percentage = int((processed / total_orders) * 100) if total_orders > 0 else 100
            await update_job_progress(job_id, {
                "progress.processed": processed,
                "progress.failed": failed,
                "progress.percentage": percentage,
                "chunks": chunks_info,
                "message": f"Processed chunk {chunk_num}/{total_chunks} ({processed}/{total_orders} orders)"
            })
            
            # Small delay between chunks to prevent rate limiting
            await asyncio.sleep(0.5)
        
        # Mark job as completed
        final_status = SyncStatus.COMPLETED.value if failed == 0 else SyncStatus.COMPLETED.value
        await update_job_progress(job_id, {
            "status": final_status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "message": f"Sync completed: {processed} synced, {failed} failed"
        })
        
        # Record in history
        await record_sync_history(job_id, store_name, "orders", final_status, processed)
        
        # Update store's last_synced_at
        await db.stores.update_one(
            {"store_name": store_name},
            {"$set": {"last_synced_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Clean up active jobs
        if job_id in active_jobs:
            del active_jobs[job_id]
        
        return {"processed": processed, "failed": failed, "total": total_orders}
        
    except Exception as e:
        logger.error(f"[{job_id}] Sync failed: {e}\n{traceback.format_exc()}")
        await update_job_progress(job_id, {
            "status": SyncStatus.FAILED.value,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "errors": [str(e)],
            "message": f"Sync failed: {str(e)}"
        })
        await record_sync_history(job_id, store_name, "orders", "failed", 0, str(e))
        raise


async def run_sync_with_retry(job_id: str, store_name: str, sync_type: str,
                               incremental: bool, days_back: int, chunk_size: int, max_retries: int):
    """Run sync with automatic retry on failure"""
    current_retry = 0
    last_error = None
    
    while current_retry <= max_retries:
        try:
            if current_retry > 0:
                await update_job_progress(job_id, {
                    "status": SyncStatus.RETRYING.value,
                    "current_retry": current_retry,
                    "message": f"Retry attempt {current_retry}/{max_retries}"
                })
                # Exponential backoff
                await asyncio.sleep(min(60 * (2 ** current_retry), 300))
            
            if sync_type == SyncType.ORDERS.value or sync_type == SyncType.ALL.value:
                result = await sync_orders_chunked(job_id, store_name, incremental, days_back, chunk_size)
                return result
            # Add other sync types here (products, inventory, etc.)
            
        except Exception as e:
            last_error = str(e)
            current_retry += 1
            logger.warning(f"[{job_id}] Sync attempt {current_retry} failed: {e}")
    
    # All retries exhausted
    await update_job_progress(job_id, {
        "status": SyncStatus.FAILED.value,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "errors": [f"Failed after {max_retries} retries: {last_error}"],
        "message": f"Sync failed after {max_retries} retries"
    })
    raise Exception(f"Sync failed after {max_retries} retries: {last_error}")


# ============ API Endpoints ============

@router.post("/start")
async def start_sync(job: SyncJobCreate, background_tasks: BackgroundTasks):
    """Start a new sync job"""
    try:
        # Check if there's already a running sync for this store/type
        existing = await db.sync_jobs.find_one({
            "store_name": job.store_name,
            "sync_type": job.sync_type,
            "status": {"$in": [SyncStatus.PENDING.value, SyncStatus.RUNNING.value, SyncStatus.RETRYING.value]}
        })
        
        if existing:
            return {
                "success": False,
                "message": f"A sync is already running for {job.store_name} ({job.sync_type})",
                "existing_job_id": existing["job_id"]
            }
        
        # Create job
        job_id = await create_sync_job(job.dict())
        
        # Start sync in background
        background_tasks.add_task(
            run_sync_with_retry,
            job_id,
            job.store_name,
            job.sync_type,
            job.incremental,
            job.days_back,
            job.chunk_size,
            job.max_retries
        )
        
        return {
            "success": True,
            "message": "Sync job started",
            "job_id": job_id
        }
        
    except Exception as e:
        logger.error(f"Error starting sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{job_id}")
async def get_sync_status(job_id: str):
    """Get sync job status"""
    # Check in-memory first for real-time updates
    if job_id in active_jobs:
        job = active_jobs[job_id]
        # Remove _id if present
        if "_id" in job:
            del job["_id"]
        return job
    
    # Fall back to database
    job = await db.sync_jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/jobs")
async def list_sync_jobs(
    store_name: str = None,
    sync_type: str = None,
    status: str = None,
    limit: int = 50
):
    """List sync jobs with filters"""
    query = {}
    if store_name:
        query["store_name"] = store_name
    if sync_type:
        query["sync_type"] = sync_type
    if status:
        query["status"] = status
    
    jobs = await db.sync_jobs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"jobs": jobs, "total": len(jobs)}


@router.get("/history")
async def get_sync_history(store_name: str = None, limit: int = 100):
    """Get sync history"""
    query = {}
    if store_name:
        query["store_name"] = store_name
    
    history = await db.sync_history.find(query, {"_id": 0}).sort("completed_at", -1).limit(limit).to_list(limit)
    return {"history": history, "total": len(history)}


@router.post("/cancel/{job_id}")
async def cancel_sync(job_id: str):
    """Cancel a running sync job"""
    job = await db.sync_jobs.find_one({"job_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] not in [SyncStatus.PENDING.value, SyncStatus.RUNNING.value, SyncStatus.RETRYING.value]:
        return {"success": False, "message": "Job is not running"}
    
    await update_job_progress(job_id, {
        "status": SyncStatus.CANCELLED.value,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "message": "Sync cancelled by user"
    })
    
    if job_id in active_jobs:
        del active_jobs[job_id]
    
    return {"success": True, "message": "Sync cancelled"}


@router.get("/overview")
async def get_sync_overview():
    """Get overview of all stores' sync status"""
    stores = await db.stores.find({}, {"_id": 0}).to_list(100)
    
    overview = []
    for store in stores:
        store_name = store.get("store_name")
        
        # Get last successful sync
        last_sync = await db.sync_history.find_one(
            {"store_name": store_name, "status": "completed"},
            sort=[("completed_at", -1)]
        )
        
        # Get any running jobs
        running_job = await db.sync_jobs.find_one({
            "store_name": store_name,
            "status": {"$in": ["pending", "running", "retrying"]}
        }, {"_id": 0})
        
        # Get order count
        order_count = await db.customers.count_documents({"store_name": store_name})
        
        overview.append({
            "store_name": store_name,
            "display_name": store.get("shop_url", store_name),
            "order_count": order_count,
            "last_synced_at": last_sync.get("completed_at") if last_sync else None,
            "last_sync_records": last_sync.get("records_synced") if last_sync else 0,
            "running_job": running_job,
            "connected": bool(store.get("shopify_token"))
        })
    
    return {"stores": overview}


# ============ Sync Scheduling ============

@router.post("/schedule")
async def create_schedule(schedule: SyncScheduleCreate):
    """Create a sync schedule"""
    schedule_doc = {
        "id": str(uuid.uuid4()),
        "store_name": schedule.store_name,
        "sync_type": schedule.sync_type,
        "schedule_type": schedule.schedule_type,
        "interval_hours": schedule.interval_hours,
        "daily_time": schedule.daily_time,
        "enabled": schedule.enabled,
        "last_run": None,
        "next_run": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Calculate next run
    if schedule.schedule_type == "interval":
        schedule_doc["next_run"] = (datetime.now(timezone.utc) + timedelta(hours=schedule.interval_hours)).isoformat()
    
    await db.sync_schedules.update_one(
        {"store_name": schedule.store_name, "sync_type": schedule.sync_type},
        {"$set": schedule_doc},
        upsert=True
    )
    
    return {"success": True, "schedule": schedule_doc}


@router.get("/schedules")
async def list_schedules(store_name: str = None):
    """List sync schedules"""
    query = {}
    if store_name:
        query["store_name"] = store_name
    
    schedules = await db.sync_schedules.find(query, {"_id": 0}).to_list(100)
    return {"schedules": schedules}


@router.delete("/schedule/{store_name}/{sync_type}")
async def delete_schedule(store_name: str, sync_type: str):
    """Delete a sync schedule"""
    result = await db.sync_schedules.delete_one({
        "store_name": store_name,
        "sync_type": sync_type
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return {"success": True, "message": "Schedule deleted"}
