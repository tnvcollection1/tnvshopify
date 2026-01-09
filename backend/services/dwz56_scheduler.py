"""
DWZ56 Scheduler Service
Handles automated background tasks for DWZ56 logistics:
1. Auto-sync shipped 1688 orders to DWZ56
2. Track package arrival status updates from DWZ56

Uses APScheduler for periodic task execution.
"""

import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from motor.motor_asyncio import AsyncIOMotorClient
import os
import httpx
import hashlib

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


# DWZ56 API Configuration
DWZ56_API_URL = os.environ.get("DWZ56_API_URL", "https://www.dwz56.com/cgi-bin/EmsData.dll?DoApp")
DWZ56_CLIENT_ID = int(os.environ.get("DWZ56_CLIENT_ID", "1057"))
DWZ56_API_KEY = os.environ.get("DWZ56_API_KEY", "jIrM5UNuZu905q7")

# Tracking status mapping
TRACKING_STATUS = {
    0: {"code": "NOT_SENT", "label": "未发送", "label_en": "Not Sent"},
    1: {"code": "SENT", "label": "已发送", "label_en": "Sent"},
    2: {"code": "IN_TRANSIT", "label": "转运中", "label_en": "In Transit"},
    3: {"code": "DELIVERED", "label": "送达", "label_en": "Delivered"},
    4: {"code": "TIMEOUT", "label": "超时", "label_en": "Timeout"},
    5: {"code": "CUSTOMS_HOLD", "label": "扣关", "label_en": "Customs Hold"},
    6: {"code": "ADDRESS_ERROR", "label": "地址错误", "label_en": "Address Error"},
    7: {"code": "LOST", "label": "快件丢失", "label_en": "Lost"},
    8: {"code": "RETURNED", "label": "退件", "label_en": "Returned"},
    9: {"code": "OTHER_EXCEPTION", "label": "其它异常", "label_en": "Other Exception"},
    10: {"code": "DESTROYED", "label": "销毁", "label_en": "Destroyed"},
}


def generate_timestamp() -> int:
    """Generate timestamp in milliseconds since 1970-01-01 UTC"""
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def generate_md5_signature(client_id: int, timestamp: int, api_key: str) -> str:
    """Generate MD5 signature: MD5(icID + TimeStamp + API_Key)"""
    data = f"{client_id}{timestamp}{api_key}"
    return hashlib.md5(data.encode()).hexdigest()


def build_request_payload(request_name: str, extra_params: dict = None) -> dict:
    """Build a request payload with authentication"""
    timestamp = generate_timestamp()
    md5_sig = generate_md5_signature(DWZ56_CLIENT_ID, timestamp, DWZ56_API_KEY)
    
    payload = {
        "RequestName": request_name,
        "icID": DWZ56_CLIENT_ID,
        "TimeStamp": timestamp,
        "MD5": md5_sig,
    }
    
    if extra_params:
        payload.update(extra_params)
    
    return payload


async def make_api_request(payload: dict) -> dict:
    """Make HTTP POST request to DWZ56 API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                DWZ56_API_URL,
                json=payload,
                headers={"Content-Type": "application/json; charset=utf-8"}
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"DWZ56 API error: {e}")
        return {"error": str(e)}


# Global scheduler instance
scheduler: Optional[AsyncIOScheduler] = None


async def auto_sync_shipped_orders():
    """
    Background job: Auto-sync shipped 1688 orders to DWZ56.
    Runs periodically to process any orders that were shipped but not yet synced.
    """
    logger.info("🔄 [DWZ56 Scheduler] Starting auto-sync of shipped orders...")
    
    db = get_db()
    
    try:
        # Find orders that need DWZ56 shipments
        stores = ["tnvcollection", "tnvcollectionpk"]
        total_synced = 0
        total_errors = 0
        
        for store_name in stores:
            # Find orders in fulfillment_pipeline with alibaba_order_id but no dwz_waybill
            pending_orders = await db.fulfillment_pipeline.find({
                "store_name": store_name,
                "alibaba_order_id": {"$exists": True, "$ne": None},
                "fulfillment_number_1688": {"$exists": True, "$ne": None},
                "$or": [
                    {"dwz_waybill": {"$exists": False}},
                    {"dwz_waybill": None},
                    {"dwz_waybill": ""},
                ]
            }).to_list(50)
            
            if pending_orders:
                logger.info(f"  Found {len(pending_orders)} pending orders for {store_name}")
                
                # Import the mark_shipped function dynamically to avoid circular imports
                from routes.alibaba_1688 import Mark1688ShippedRequest, mark_1688_order_shipped
                
                for order in pending_orders:
                    try:
                        shopify_order_num = order.get("shopify_order_number") or order.get("order_number")
                        alibaba_order_id = order.get("alibaba_order_id")
                        fulfillment_num = order.get("fulfillment_number_1688")
                        
                        if not shopify_order_num or not alibaba_order_id:
                            continue
                        
                        mark_request = Mark1688ShippedRequest(
                            shopify_order_number=str(shopify_order_num),
                            alibaba_order_id=str(alibaba_order_id),
                            fulfillment_number_1688=fulfillment_num,
                            store_name=store_name,
                            auto_create_dwz=True,
                        )
                        result = await mark_1688_order_shipped(mark_request)
                        
                        if result.get("dwz_result", {}).get("success"):
                            total_synced += 1
                            logger.info(f"  ✅ Synced order {shopify_order_num} -> waybill {result.get('waybill')}")
                        else:
                            total_errors += 1
                            
                    except Exception as e:
                        total_errors += 1
                        logger.error(f"  ❌ Error syncing order {order.get('shopify_order_number')}: {e}")
        
        # Log job completion
        await db.scheduler_logs.insert_one({
            "job": "auto_sync_shipped_orders",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "synced_count": total_synced,
            "error_count": total_errors,
            "status": "completed"
        })
        
        logger.info(f"✅ [DWZ56 Scheduler] Auto-sync completed: {total_synced} synced, {total_errors} errors")
        
    except Exception as e:
        logger.error(f"❌ [DWZ56 Scheduler] Auto-sync failed: {e}")
        await db.scheduler_logs.insert_one({
            "job": "auto_sync_shipped_orders",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e),
            "status": "failed"
        })


async def track_package_arrivals():
    """
    Background job: Poll DWZ56 API for package status updates.
    Updates local database with latest tracking status.
    """
    logger.info("📦 [DWZ56 Scheduler] Starting package arrival tracking...")
    
    db = get_db()
    
    try:
        # Find orders with dwz_waybill that haven't been delivered yet
        pending_shipments = await db.fulfillment_pipeline.find({
            "dwz_waybill": {"$exists": True, "$ne": None, "$ne": ""},
            "$or": [
                {"dwz_status": {"$exists": False}},
                {"dwz_status": {"$nin": ["DELIVERED", "RETURNED", "DESTROYED"]}},
            ]
        }).to_list(100)
        
        if not pending_shipments:
            logger.info("  No pending shipments to track")
            return
        
        logger.info(f"  Found {len(pending_shipments)} shipments to track")
        
        updated_count = 0
        arrived_count = 0
        
        # Collect all waybill numbers
        waybill_numbers = [s.get("dwz_waybill") for s in pending_shipments if s.get("dwz_waybill")]
        
        if not waybill_numbers:
            return
        
        # Query DWZ56 RecList API for tracking status
        # Query in batches of 50
        for i in range(0, len(waybill_numbers), 50):
            batch = waybill_numbers[i:i+50]
            
            payload = build_request_payload("RecList", {
                "cqNum": ",".join(batch),
                "iPage": 1,
                "iPagePer": 100,
            })
            
            response = await make_api_request(payload)
            
            if "error" in response:
                logger.error(f"  DWZ56 API error: {response['error']}")
                continue
            
            records = response.get("RecList", [])
            
            for rec in records:
                waybill = rec.get("cNum")
                if not waybill:
                    continue
                
                state = rec.get("nState", 0)
                status_info = TRACKING_STATUS.get(state, {"code": "UNKNOWN", "label_en": "Unknown"})
                status_code = status_info["code"]
                status_label = status_info["label_en"]
                
                # Additional tracking info
                tracking_update = {
                    "dwz_status": status_code,
                    "dwz_status_label": status_label,
                    "dwz_last_update": datetime.now(timezone.utc).isoformat(),
                    "dwz_tracking_info": {
                        "state": state,
                        "awb_number": rec.get("cNo"),
                        "destination": rec.get("cDes"),
                        "weight": rec.get("fWeight"),
                        "receiver": rec.get("cReceiver"),
                        "receiver_city": rec.get("cRCity"),
                        "receiver_country": rec.get("cRCountry"),
                        "sent_date": rec.get("dSend"),
                        "delivered_date": rec.get("dReceive"),
                    }
                }
                
                # Check if arrived at warehouse (state 2 = In Transit means arrived at DWZ56 warehouse)
                if state == 2:
                    tracking_update["dwz_arrived_at_warehouse"] = True
                    tracking_update["dwz_arrived_date"] = datetime.now(timezone.utc).isoformat()
                    arrived_count += 1
                    logger.info(f"  📦 Package {waybill} arrived at DWZ56 warehouse!")
                
                # Check if delivered
                if state == 3:
                    tracking_update["dwz_delivered"] = True
                    tracking_update["dwz_delivered_date"] = rec.get("dReceive") or datetime.now(timezone.utc).isoformat()
                    logger.info(f"  ✅ Package {waybill} delivered!")
                
                # Update fulfillment_pipeline
                result = await db.fulfillment_pipeline.update_one(
                    {"dwz_waybill": waybill},
                    {"$set": tracking_update}
                )
                
                # Also update orders collection if exists
                await db.orders.update_one(
                    {"dwz_waybill": waybill},
                    {"$set": tracking_update}
                )
                
                if result.modified_count > 0:
                    updated_count += 1
        
        # Log job completion
        await db.scheduler_logs.insert_one({
            "job": "track_package_arrivals",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tracked_count": len(pending_shipments),
            "updated_count": updated_count,
            "arrived_count": arrived_count,
            "status": "completed"
        })
        
        logger.info(f"✅ [DWZ56 Scheduler] Tracking completed: {updated_count} updated, {arrived_count} arrived at warehouse")
        
    except Exception as e:
        logger.error(f"❌ [DWZ56 Scheduler] Tracking failed: {e}")
        import traceback
        traceback.print_exc()
        await db.scheduler_logs.insert_one({
            "job": "track_package_arrivals",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e),
            "status": "failed"
        })


def start_scheduler():
    """Start the background scheduler with configured jobs"""
    global scheduler
    
    if scheduler and scheduler.running:
        logger.info("Scheduler already running")
        return scheduler
    
    scheduler = AsyncIOScheduler(timezone="UTC")
    
    # Job 1: Auto-sync shipped orders to DWZ56 every 30 minutes
    scheduler.add_job(
        auto_sync_shipped_orders,
        trigger=IntervalTrigger(minutes=30),
        id="auto_sync_dwz56",
        name="Auto-sync shipped orders to DWZ56",
        replace_existing=True,
        max_instances=1,
    )
    
    # Job 2: Track package arrivals every 15 minutes
    scheduler.add_job(
        track_package_arrivals,
        trigger=IntervalTrigger(minutes=15),
        id="track_dwz56_arrivals",
        name="Track DWZ56 package arrivals",
        replace_existing=True,
        max_instances=1,
    )
    
    scheduler.start()
    logger.info("🚀 [DWZ56 Scheduler] Started with jobs: auto_sync_dwz56 (30min), track_dwz56_arrivals (15min)")
    
    return scheduler


def stop_scheduler():
    """Stop the background scheduler"""
    global scheduler
    
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("🛑 [DWZ56 Scheduler] Stopped")
        scheduler = None


def get_scheduler_status():
    """Get current scheduler status and job info"""
    global scheduler
    
    if not scheduler:
        return {
            "running": False,
            "jobs": []
        }
    
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger),
        })
    
    return {
        "running": scheduler.running,
        "jobs": jobs
    }


async def run_job_now(job_id: str):
    """Manually trigger a job to run immediately"""
    global scheduler
    
    if not scheduler or not scheduler.running:
        return {"success": False, "error": "Scheduler not running"}
    
    job = scheduler.get_job(job_id)
    if not job:
        return {"success": False, "error": f"Job '{job_id}' not found"}
    
    # Run the job function directly
    if job_id == "auto_sync_dwz56":
        await auto_sync_shipped_orders()
    elif job_id == "track_dwz56_arrivals":
        await track_package_arrivals()
    else:
        return {"success": False, "error": f"Unknown job: {job_id}"}
    
    return {"success": True, "message": f"Job '{job_id}' executed"}
