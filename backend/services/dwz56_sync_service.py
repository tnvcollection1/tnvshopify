"""
DWZ56 Auto-Sync Service
Automatically fetches tracking updates from DWZ56 API and syncs to fulfillment pipeline.

Features:
1. Scheduled/manual sync of DWZ tracking numbers
2. Auto-update order stages based on DWZ status
3. Batch notification triggers
4. Order history/timeline tracking
"""

import os
import asyncio
from typing import Dict, Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import APIRouter, HTTPException, Body, Query, BackgroundTasks
from pydantic import BaseModel, Field
import logging
import httpx
import hashlib

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dwz56-sync", tags=["dwz56-sync"])

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

# DWZ Status to Pipeline Stage mapping
DWZ_STATUS_TO_STAGE = {
    0: "dwz56_shipped",      # Not Sent -> Still at DWZ warehouse
    1: "in_transit",         # Sent
    2: "in_transit",         # In Transit
    3: "warehouse_arrived",  # Delivered (to local warehouse)
    4: "in_transit",         # Timeout (still in transit)
    5: "in_transit",         # Customs Hold
    6: "in_transit",         # Address Error (needs attention)
    7: "in_transit",         # Lost
    8: "in_transit",         # Returned
    9: "in_transit",         # Other Exception
    10: "in_transit",        # Destroyed
}

DWZ_STATUS_LABELS = {
    0: "Not Sent",
    1: "Sent",
    2: "In Transit",
    3: "Delivered",
    4: "Timeout",
    5: "Customs Hold",
    6: "Address Error",
    7: "Lost",
    8: "Returned",
    9: "Other Exception",
    10: "Destroyed",
}


def generate_timestamp() -> int:
    """Generate timestamp in milliseconds"""
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def generate_md5_signature(client_id: int, timestamp: int, api_key: str) -> str:
    """Generate MD5 signature for DWZ56 API"""
    data = f"{client_id}{timestamp}{api_key}"
    return hashlib.md5(data.encode()).hexdigest()


def build_request_payload(request_name: str, extra_params: dict = None) -> dict:
    """Build DWZ56 API request payload"""
    timestamp = generate_timestamp()
    signature = generate_md5_signature(DWZ56_CLIENT_ID, timestamp, DWZ56_API_KEY)
    
    payload = {
        "RequestName": request_name,
        "icID": DWZ56_CLIENT_ID,
        "TimeStamp": timestamp,
        "MD5": signature,
    }
    
    if extra_params:
        payload.update(extra_params)
    
    return payload


async def make_dwz_api_request(payload: dict) -> dict:
    """Make request to DWZ56 API"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(DWZ56_API_URL, json=payload)
            return response.json()
    except Exception as e:
        logger.error(f"DWZ56 API error: {e}")
        return {"ReturnValue": -9, "error": str(e)}


async def fetch_dwz_tracking_records(
    page: int = 1,
    page_size: int = 100,
    days_back: int = 30,
    tracking_number: str = None,
) -> List[Dict]:
    """Fetch tracking records from DWZ56 RecList API"""
    
    start_date = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    extra_params = {
        "iPage": page,
        "iPagePer": page_size,
        "dqBDate": start_date,
        "dqEDate": end_date,
    }
    
    if tracking_number:
        extra_params["cqNum"] = tracking_number
    
    payload = build_request_payload("RecList", extra_params)
    response = await make_dwz_api_request(payload)
    
    if response.get("ReturnValue", 0) < 0:
        logger.warning(f"DWZ56 RecList returned error: {response.get('ReturnValue')}")
        return []
    
    return response.get("RecList", [])


async def sync_dwz_tracking_to_pipeline(store_name: str = None, days_back: int = 30) -> Dict:
    """
    Sync DWZ tracking status to fulfillment pipeline.
    
    1. Fetches records from DWZ56 API
    2. Matches with orders in fulfillment_pipeline by tracking number
    3. Updates order stages based on DWZ status
    4. Logs all changes to order_history collection
    """
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    results = {
        "success": True,
        "synced_at": now,
        "total_fetched": 0,
        "matched": 0,
        "updated": 0,
        "stage_changes": [],
        "errors": [],
    }
    
    try:
        # Fetch all pages of DWZ records
        all_records = []
        page = 1
        while True:
            records = await fetch_dwz_tracking_records(page=page, page_size=100, days_back=days_back)
            if not records:
                break
            all_records.extend(records)
            if len(records) < 100:
                break
            page += 1
        
        results["total_fetched"] = len(all_records)
        
        # Build tracking number lookup
        for record in all_records:
            tracking = record.get("cNum") or record.get("cNo")
            if not tracking:
                continue
            
            dwz_status = record.get("nState", 0)
            dwz_status_label = DWZ_STATUS_LABELS.get(dwz_status, f"Unknown ({dwz_status})")
            suggested_stage = DWZ_STATUS_TO_STAGE.get(dwz_status, "in_transit")
            
            # Build query for pipeline
            query = {"dwz_tracking": tracking}
            if store_name:
                query["store_name"] = store_name
            
            # Find matching order in pipeline
            order = await db.fulfillment_pipeline.find_one(query, {"_id": 0})
            
            if not order:
                # Try customers collection
                customer_query = {"dwz_tracking": tracking}
                if store_name:
                    customer_query["store_name"] = store_name
                order = await db.customers.find_one(customer_query, {"_id": 0})
            
            if order:
                results["matched"] += 1
                
                current_stage = order.get("current_stage", "shopify_order")
                order_id = order.get("order_number") or order.get("shopify_order_id")
                
                # Determine if we should update the stage
                should_update = False
                
                # Stage progression rules
                stage_order = ["shopify_order", "1688_ordered", "dwz56_shipped", "in_transit", "warehouse_arrived", "received", "local_shipped"]
                current_idx = stage_order.index(current_stage) if current_stage in stage_order else -1
                suggested_idx = stage_order.index(suggested_stage) if suggested_stage in stage_order else -1
                
                # Only advance forward, never backward
                if suggested_idx > current_idx:
                    should_update = True
                
                update_data = {
                    "dwz_status": dwz_status,
                    "dwz_status_label": dwz_status_label,
                    "dwz_last_sync": now,
                    "dwz_raw_data": {
                        "cNo": record.get("cNo"),
                        "cNum": record.get("cNum"),
                        "dSend": record.get("dSend"),
                        "dRecv": record.get("dRecv"),
                        "cDes": record.get("cDes"),
                        "cEmsKind": record.get("cEmsKind"),
                    },
                }
                
                if should_update:
                    update_data["current_stage"] = suggested_stage
                    update_data[f"stage_dates.{suggested_stage}"] = now
                    
                    results["stage_changes"].append({
                        "order_id": str(order_id),
                        "tracking": tracking,
                        "from_stage": current_stage,
                        "to_stage": suggested_stage,
                        "dwz_status": dwz_status_label,
                    })
                
                # Update pipeline
                await db.fulfillment_pipeline.update_one(
                    {"dwz_tracking": tracking},
                    {"$set": update_data}
                )
                
                # Update customers collection too
                await db.customers.update_one(
                    {"dwz_tracking": tracking},
                    {"$set": {
                        "dwz_status": dwz_status,
                        "dwz_status_label": dwz_status_label,
                        **({"fulfillment_stage": suggested_stage} if should_update else {}),
                    }}
                )
                
                # Log to order history
                await db.order_history.insert_one({
                    "order_id": str(order_id),
                    "tracking_number": tracking,
                    "event_type": "dwz_sync",
                    "dwz_status": dwz_status,
                    "dwz_status_label": dwz_status_label,
                    "stage_before": current_stage,
                    "stage_after": suggested_stage if should_update else current_stage,
                    "stage_changed": should_update,
                    "timestamp": now,
                    "source": "auto_sync",
                })
                
                if should_update:
                    results["updated"] += 1
                    
    except Exception as e:
        logger.error(f"DWZ sync error: {e}")
        results["success"] = False
        results["errors"].append(str(e))
    
    # Log sync run
    await db.dwz_sync_logs.insert_one({
        "synced_at": now,
        "store_name": store_name,
        "days_back": days_back,
        "results": results,
    })
    
    return results


# ==================== API Endpoints ====================

@router.post("/sync")
async def trigger_dwz_sync(
    store_name: str = Body(None),
    days_back: int = Body(30),
    background_tasks: BackgroundTasks = None,
):
    """
    Manually trigger DWZ tracking sync.
    Fetches tracking updates from DWZ56 and updates fulfillment pipeline.
    """
    result = await sync_dwz_tracking_to_pipeline(store_name=store_name, days_back=days_back)
    return result


@router.get("/tracking/{tracking_number}")
async def get_dwz_tracking_status(tracking_number: str):
    """Get current DWZ tracking status for a specific tracking number"""
    
    records = await fetch_dwz_tracking_records(tracking_number=tracking_number, days_back=90)
    
    if not records:
        raise HTTPException(status_code=404, detail=f"Tracking {tracking_number} not found in DWZ56")
    
    record = records[0]
    dwz_status = record.get("nState", 0)
    
    return {
        "success": True,
        "tracking_number": tracking_number,
        "status_code": dwz_status,
        "status_label": DWZ_STATUS_LABELS.get(dwz_status, f"Unknown ({dwz_status})"),
        "suggested_stage": DWZ_STATUS_TO_STAGE.get(dwz_status, "in_transit"),
        "details": {
            "awb_number": record.get("cNo"),
            "destination": record.get("cDes"),
            "courier": record.get("cEmsKind"),
            "sent_date": record.get("dSend"),
            "received_date": record.get("dRecv"),
            "weight_kg": record.get("fWeight"),
        },
    }


@router.get("/sync-logs")
async def get_sync_logs(limit: int = 20):
    """Get recent DWZ sync logs"""
    db = get_db()
    
    logs = await db.dwz_sync_logs.find(
        {},
        {"_id": 0}
    ).sort("synced_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "logs": logs,
        "count": len(logs),
    }


# ==================== Order History Timeline ====================

@router.get("/order-history/{order_id}")
async def get_order_history(order_id: str):
    """
    Get complete history/timeline for an order.
    Shows all events: stage changes, DWZ syncs, notifications, etc.
    """
    db = get_db()
    
    # Handle both string and integer order_id
    query = {"$or": [
        {"order_id": order_id},
        {"order_id": str(order_id)},
    ]}
    try:
        query["$or"].append({"order_id": int(order_id)})
    except (ValueError, TypeError):
        pass
    
    # Get history events
    events = await db.order_history.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    
    # Get current order state
    order_query = {"$or": [
        {"order_number": order_id},
        {"shopify_order_id": order_id},
    ]}
    try:
        order_query["$or"].extend([
            {"order_number": int(order_id)},
            {"shopify_order_id": int(order_id)},
        ])
    except (ValueError, TypeError):
        pass
    
    order = await db.fulfillment_pipeline.find_one(order_query, {"_id": 0})
    
    if not order:
        order = await db.customers.find_one(order_query, {"_id": 0})
    
    # Build timeline
    timeline = []
    
    # Add creation event
    if order:
        created_at = order.get("created_at") or order.get("stage_dates", {}).get("shopify_order")
        if created_at:
            timeline.append({
                "event": "order_created",
                "label": "Order Created",
                "timestamp": created_at,
                "icon": "📦",
                "details": {
                    "order_number": order.get("order_number"),
                    "customer": order.get("customer_name"),
                },
            })
        
        # Add stage date events
        stage_dates = order.get("stage_dates", {})
        stage_labels = {
            "shopify_order": ("Shopify Order Received", "🛒"),
            "1688_ordered": ("1688 Supplier Order Placed", "🏭"),
            "dwz56_shipped": ("Shipped via DWZ56", "✈️"),
            "in_transit": ("In Transit", "🚚"),
            "warehouse_arrived": ("Arrived at Local Warehouse", "🏠"),
            "received": ("Package Received", "📬"),
            "local_shipped": ("Shipped to Customer", "🎁"),
        }
        
        for stage, timestamp in stage_dates.items():
            if stage in stage_labels and timestamp:
                label, icon = stage_labels[stage]
                timeline.append({
                    "event": f"stage_{stage}",
                    "label": label,
                    "timestamp": timestamp,
                    "icon": icon,
                    "stage": stage,
                })
    
    # Add history events
    for event in events:
        event_type = event.get("event_type", "unknown")
        
        if event_type == "dwz_sync":
            timeline.append({
                "event": "dwz_sync",
                "label": f"DWZ Status: {event.get('dwz_status_label', 'Unknown')}",
                "timestamp": event.get("timestamp"),
                "icon": "🔄",
                "details": {
                    "tracking": event.get("tracking_number"),
                    "stage_changed": event.get("stage_changed"),
                    "from": event.get("stage_before"),
                    "to": event.get("stage_after"),
                },
            })
        elif event_type == "notification":
            timeline.append({
                "event": "notification",
                "label": f"Notification Sent: {event.get('notification_type', 'Unknown')}",
                "timestamp": event.get("timestamp"),
                "icon": "💬",
                "details": event.get("details"),
            })
        elif event_type == "stage_change":
            timeline.append({
                "event": "stage_change",
                "label": f"Stage: {event.get('new_stage', 'Unknown')}",
                "timestamp": event.get("timestamp"),
                "icon": "➡️",
                "details": {
                    "from": event.get("old_stage"),
                    "to": event.get("new_stage"),
                    "by": event.get("changed_by", "system"),
                },
            })
    
    # Sort timeline by timestamp (newest first)
    timeline.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    return {
        "success": True,
        "order_id": order_id,
        "current_state": {
            "stage": order.get("current_stage") if order else None,
            "dwz_tracking": order.get("dwz_tracking") if order else None,
            "local_tracking": order.get("local_tracking") if order else None,
            "customer": order.get("customer_name") if order else None,
        } if order else None,
        "timeline": timeline,
        "event_count": len(timeline),
    }


@router.post("/log-event")
async def log_order_event(
    order_id: str = Body(...),
    event_type: str = Body(...),
    details: dict = Body(None),
):
    """
    Log a custom event to order history.
    Used for tracking manual actions, notes, etc.
    """
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    event = {
        "order_id": order_id,
        "event_type": event_type,
        "timestamp": now,
        "details": details or {},
    }
    
    await db.order_history.insert_one(event)
    
    return {
        "success": True,
        "event_logged": event_type,
        "order_id": order_id,
        "timestamp": now,
    }
