"""
Fulfillment Pipeline Service
Handles multi-stage fulfillment tracking:
SHOPIFY → 1688 → DWZ56 → TRANSIT → WAREHOUSE → RECEIVED → LOCAL SHIPPING

Carriers by store:
- tnvcollectionpk: TCS (Pakistan)
- tnvcollection: DTDC (India)
"""

import os
from typing import Dict, List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/fulfillment", tags=["fulfillment-pipeline"])

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client[os.environ.get('DB_NAME', 'shopify_customers_db')]
    return _db


# Fulfillment stages in order
FULFILLMENT_STAGES = [
    'shopify_order',      # Order received from Shopify
    '1688_ordered',       # Order placed on 1688
    'dwz56_shipped',      # Shipped via DWZ56
    'in_transit',         # In international transit
    'warehouse_arrived',  # Arrived at local warehouse
    'warehouse_received', # Received and checked at warehouse
    'local_shipped',      # Shipped to customer via local carrier
]

# Store-specific carrier configuration
STORE_CARRIERS = {
    'tnvcollectionpk': {'carrier': 'TCS', 'country': 'Pakistan'},
    'tnvcollection': {'carrier': 'DTDC', 'country': 'India'},
}


class StageUpdateRequest(BaseModel):
    stage: str = Field(..., description="Target stage")
    store_name: str = Field(..., description="Store name")
    dwz_tracking: Optional[str] = None
    local_tracking: Optional[str] = None
    local_carrier: Optional[str] = None
    notes: Optional[str] = None
    send_notification: bool = Field(True, description="Send WhatsApp notification on stage change")


def get_carrier_for_store(store_name: str) -> Dict:
    """Get carrier info for a store"""
    return STORE_CARRIERS.get(store_name, {'carrier': 'Local Carrier', 'country': 'Unknown'})


def get_stage_index(stage: str) -> int:
    """Get the index of a stage in the pipeline"""
    try:
        return FULFILLMENT_STAGES.index(stage)
    except ValueError:
        return -1


@router.get("/pipeline")
async def get_fulfillment_pipeline(
    store_name: str = Query(...),
    stage: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Get all orders in the fulfillment pipeline with their current stage.
    """
    db = get_db()
    
    # Build query
    query = {"store_name": store_name}
    if stage:
        query["current_stage"] = stage
    
    # Get orders from fulfillment_pipeline collection
    orders = await db.fulfillment_pipeline.find(
        query,
        {"_id": 0}
    ).sort("updated_at", -1).limit(limit).to_list(limit)
    
    # If no pipeline data, try to get from customers/orders
    if not orders:
        # Fetch from customers collection and initialize pipeline
        customer_query = {"store_name": store_name}
        if stage:
            customer_query["fulfillment_stage"] = stage
        
        customers = await db.customers.find(
            customer_query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Convert to pipeline format
        orders = []
        for c in customers:
            orders.append({
                "shopify_order_id": c.get("shopify_order_id"),
                "order_number": c.get("order_number"),
                "customer_name": c.get("customer_name") or f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
                "current_stage": c.get("fulfillment_stage", "shopify_order"),
                "alibaba_order_id": c.get("alibaba_order_id"),
                "dwz_tracking": c.get("dwz_tracking"),
                "local_tracking": c.get("tracking_number"),
                "local_carrier": c.get("tracking_company"),
                "store_name": store_name,
                "created_at": c.get("created_at"),
                "updated_at": c.get("updated_at"),
                "stage_dates": c.get("stage_dates", {}),
            })
    
    # Calculate stats by stage
    stats = {}
    for stage_name in FULFILLMENT_STAGES:
        count = len([o for o in orders if o.get("current_stage") == stage_name])
        stats[stage_name] = count
    
    return {
        "success": True,
        "orders": orders,
        "stats": stats,
        "total": len(orders),
        "carrier": get_carrier_for_store(store_name),
    }


@router.get("/pipeline/stats")
async def get_pipeline_stats(store_name: str = Query(...)):
    """Get statistics for the fulfillment pipeline by stage"""
    db = get_db()
    
    pipeline = [
        {"$match": {"store_name": store_name}},
        {"$group": {
            "_id": "$current_stage",
            "count": {"$sum": 1}
        }}
    ]
    
    results = await db.fulfillment_pipeline.aggregate(pipeline).to_list(None)
    
    stats = {stage: 0 for stage in FULFILLMENT_STAGES}
    for r in results:
        if r["_id"] in stats:
            stats[r["_id"]] = r["count"]
    
    # Also count from customers collection if pipeline is empty
    if sum(stats.values()) == 0:
        for stage in FULFILLMENT_STAGES:
            count = await db.customers.count_documents({
                "store_name": store_name,
                "fulfillment_stage": stage
            })
            stats[stage] = count
    
    return {
        "success": True,
        "stats": stats,
        "total": sum(stats.values()),
        "carrier": get_carrier_for_store(store_name),
    }


@router.post("/pipeline/{order_id}/update-stage")
async def update_order_stage(
    order_id: str,
    request: StageUpdateRequest,
):
    """
    Update an order's stage in the fulfillment pipeline.
    Also updates tracking information if provided.
    """
    db = get_db()
    
    # Validate stage
    if request.stage not in FULFILLMENT_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage: {request.stage}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Handle both string and integer order_id
    order_id_int = None
    try:
        order_id_int = int(order_id)
    except (ValueError, TypeError):
        pass
    
    # Build query to match both string and integer versions
    order_query = {"$or": [
        {"shopify_order_id": order_id},
        {"order_number": order_id},
    ]}
    if order_id_int is not None:
        order_query["$or"].extend([
            {"shopify_order_id": order_id_int},
            {"order_number": order_id_int},
        ])
    
    # Build update data
    update_data = {
        "current_stage": request.stage,
        "updated_at": now,
        f"stage_dates.{request.stage}": now,
    }
    
    # Add tracking info if provided
    if request.dwz_tracking:
        update_data["dwz_tracking"] = request.dwz_tracking
    if request.local_tracking:
        update_data["local_tracking"] = request.local_tracking
    if request.local_carrier:
        update_data["local_carrier"] = request.local_carrier
    if request.notes:
        update_data["notes"] = request.notes
    
    # Try to find and update in fulfillment_pipeline collection
    result = await db.fulfillment_pipeline.find_one_and_update(
        order_query,
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        # Try customers collection and create pipeline entry
        customer = await db.customers.find_one(
            order_query,
            {"_id": 0}
        )
        
        if customer:
            # Create new pipeline entry
            pipeline_entry = {
                "shopify_order_id": customer.get("shopify_order_id"),
                "order_number": customer.get("order_number"),
                "customer_name": customer.get("customer_name") or f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
                "store_name": request.store_name,
                "alibaba_order_id": customer.get("alibaba_order_id"),
                "created_at": customer.get("created_at", now),
                **update_data,
            }
            
            await db.fulfillment_pipeline.insert_one(pipeline_entry)
            
            # Also update customers collection
            await db.customers.update_one(
                order_query,
                {"$set": {
                    "fulfillment_stage": request.stage,
                    "updated_at": now,
                    **({k: v for k, v in update_data.items() if k not in ["current_stage", "updated_at"]}),
                }}
            )
            
            return {
                "success": True,
                "message": f"Order moved to {request.stage}",
                "order_id": order_id,
                "stage": request.stage,
            }
        else:
            raise HTTPException(status_code=404, detail="Order not found")
    
    # Also sync to customers collection
    await db.customers.update_one(
        order_query,
        {"$set": {
            "fulfillment_stage": request.stage,
            "updated_at": now,
            **({k: v for k, v in update_data.items() if k not in ["current_stage", "updated_at"]}),
        }}
    )
    
    # Send WhatsApp notification if enabled
    notification_sent = False
    if request.send_notification:
        # Get the updated order for notification
        updated_order = await db.fulfillment_pipeline.find_one(
            {"$or": [
                {"shopify_order_id": order_id},
                {"order_number": order_id},
            ]},
            {"_id": 0}
        )
        if updated_order:
            notification_sent = await send_whatsapp_stage_notification(updated_order, request.stage)
    
    # Auto-sync to Shopify if order reached 'local_shipped' stage
    shopify_synced = False
    if request.stage == 'local_shipped':
        try:
            from services.shopify_fulfillment_sync import sync_order_to_shopify
            updated_order = await db.fulfillment_pipeline.find_one(
                {"$or": [
                    {"shopify_order_id": order_id},
                    {"order_number": order_id},
                ]},
                {"_id": 0}
            )
            if updated_order and updated_order.get("local_tracking"):
                sync_result = await sync_order_to_shopify(updated_order)
                shopify_synced = sync_result.get("success", False)
                if shopify_synced:
                    logger.info(f"Auto-synced order {order_id} to Shopify")
        except Exception as e:
            logger.warning(f"Auto-sync to Shopify failed for {order_id}: {e}")
    
    return {
        "success": True,
        "message": f"Order moved to {request.stage}",
        "order_id": order_id,
        "stage": request.stage,
        "notification_sent": notification_sent,
        "shopify_synced": shopify_synced,
    }


@router.post("/pipeline/{order_id}/add-tracking")
async def add_tracking_number(
    order_id: str,
    tracking_type: str = Body(..., embed=True),  # 'dwz' or 'local'
    tracking_number: str = Body(..., embed=True),
    store_name: str = Body(..., embed=True),
):
    """Add or update tracking number for an order"""
    db = get_db()
    
    now = datetime.now(timezone.utc).isoformat()
    carrier_info = get_carrier_for_store(store_name)
    
    if tracking_type == 'dwz':
        update_data = {
            "dwz_tracking": tracking_number,
            "updated_at": now,
        }
    elif tracking_type == 'local':
        update_data = {
            "local_tracking": tracking_number,
            "local_carrier": carrier_info['carrier'],
            "updated_at": now,
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid tracking type")
    
    # Update in fulfillment_pipeline
    await db.fulfillment_pipeline.update_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"$set": update_data},
        upsert=True
    )
    
    # Also update customers collection
    customer_update = {"updated_at": now}
    if tracking_type == 'dwz':
        customer_update["dwz_tracking"] = tracking_number
    else:
        customer_update["tracking_number"] = tracking_number
        customer_update["tracking_company"] = carrier_info['carrier']
    
    await db.customers.update_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"$set": customer_update}
    )
    
    return {
        "success": True,
        "message": f"Tracking number added: {tracking_number}",
        "tracking_type": tracking_type,
        "carrier": carrier_info['carrier'] if tracking_type == 'local' else 'DWZ56',
    }


@router.post("/pipeline/bulk-update-stage")
async def bulk_update_stage(
    order_ids: List[str] = Body(...),
    stage: str = Body(...),
    store_name: str = Body(...),
    dwz_tracking: Optional[str] = Body(None),
    local_tracking: Optional[str] = Body(None),
    local_carrier: Optional[str] = Body(None),
):
    """Bulk update multiple orders to a new stage with optional tracking"""
    db = get_db()
    
    if stage not in FULFILLMENT_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage: {stage}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Convert order_ids to handle both string and integer
    order_ids_str = [str(oid) for oid in order_ids]
    order_ids_int = []
    for oid in order_ids:
        try:
            order_ids_int.append(int(oid))
        except (ValueError, TypeError):
            pass
    
    update_data = {
        "current_stage": stage,
        "updated_at": now,
        f"stage_dates.{stage}": now,
    }
    
    # Add tracking if provided
    if dwz_tracking:
        update_data["dwz_tracking"] = dwz_tracking
    if local_tracking:
        update_data["local_tracking"] = local_tracking
    if local_carrier:
        update_data["local_carrier"] = local_carrier
    
    # Build query to match both string and integer versions
    order_query = {"$or": [
        {"shopify_order_id": {"$in": order_ids_str}},
        {"order_number": {"$in": order_ids_str}},
    ]}
    if order_ids_int:
        order_query["$or"].extend([
            {"shopify_order_id": {"$in": order_ids_int}},
            {"order_number": {"$in": order_ids_int}},
        ])
    
    # Update in fulfillment_pipeline
    result = await db.fulfillment_pipeline.update_many(
        order_query,
        {"$set": update_data}
    )
    
    # Also update customers collection
    await db.customers.update_many(
        order_query,
        {"$set": {
            "fulfillment_stage": stage,
            "updated_at": now,
            **({k: v for k, v in update_data.items() if k not in ["current_stage", "updated_at", f"stage_dates.{stage}"]}),
        }}
    )
    
    return {
        "success": True,
        "message": f"Updated {result.modified_count} orders to {stage}",
        "updated_count": result.modified_count,
        "stage": stage,
    }


@router.get("/carriers")
async def get_carrier_config():
    """Get carrier configuration for all stores"""
    return {
        "success": True,
        "carriers": STORE_CARRIERS,
        "stages": FULFILLMENT_STAGES,
    }


# ==================== DWZ Tracking Import ====================

class DWZTrackingItem(BaseModel):
    """Single DWZ tracking entry"""
    order_id: str = Field(..., description="Shopify order ID or order number")
    dwz_tracking: str = Field(..., description="DWZ56 tracking number")
    auto_advance: bool = Field(True, description="Auto-advance to dwz56_shipped stage")


class DWZTrackingImportRequest(BaseModel):
    """Bulk DWZ tracking import request"""
    store_name: str
    tracking_data: List[DWZTrackingItem]


@router.post("/pipeline/import-dwz-tracking")
async def import_dwz_tracking(request: DWZTrackingImportRequest):
    """
    Bulk import DWZ tracking numbers for multiple orders.
    Optionally auto-advances orders to 'dwz56_shipped' stage.
    
    Accepts CSV-like data format:
    - order_id: Shopify order ID or order number
    - dwz_tracking: DWZ56 tracking number
    - auto_advance: Whether to move order to dwz56_shipped stage (default: true)
    
    Example:
    {
        "store_name": "tnvcollectionpk",
        "tracking_data": [
            {"order_id": "99001", "dwz_tracking": "DWZ123456", "auto_advance": true},
            {"order_id": "99002", "dwz_tracking": "DWZ789012", "auto_advance": true}
        ]
    }
    """
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    results = {
        "success": True,
        "total": len(request.tracking_data),
        "updated": 0,
        "not_found": 0,
        "errors": [],
    }
    
    for item in request.tracking_data:
        try:
            # Handle both string and integer order_id
            order_id = item.order_id
            order_id_int = None
            try:
                order_id_int = int(order_id)
            except (ValueError, TypeError):
                pass
            
            # Build query
            order_query = {"$or": [
                {"shopify_order_id": order_id},
                {"order_number": order_id},
            ]}
            if order_id_int is not None:
                order_query["$or"].extend([
                    {"shopify_order_id": order_id_int},
                    {"order_number": order_id_int},
                ])
            
            # Build update data
            update_data = {
                "dwz_tracking": item.dwz_tracking,
                "updated_at": now,
            }
            
            # Auto-advance to dwz56_shipped if requested
            if item.auto_advance:
                update_data["current_stage"] = "dwz56_shipped"
                update_data["stage_dates.dwz56_shipped"] = now
            
            # Update in fulfillment_pipeline
            result = await db.fulfillment_pipeline.update_one(
                order_query,
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                results["updated"] += 1
                
                # Also update customers collection
                await db.customers.update_one(
                    order_query,
                    {"$set": {
                        "dwz_tracking": item.dwz_tracking,
                        "updated_at": now,
                        **({"fulfillment_stage": "dwz56_shipped"} if item.auto_advance else {}),
                    }}
                )
            else:
                # Try to find in customers and create pipeline entry
                customer = await db.customers.find_one(order_query, {"_id": 0})
                if customer:
                    pipeline_entry = {
                        "shopify_order_id": customer.get("shopify_order_id"),
                        "order_number": customer.get("order_number"),
                        "customer_name": customer.get("customer_name"),
                        "store_name": request.store_name,
                        "dwz_tracking": item.dwz_tracking,
                        "current_stage": "dwz56_shipped" if item.auto_advance else "1688_ordered",
                        "created_at": customer.get("created_at", now),
                        "updated_at": now,
                        "stage_dates": {
                            "shopify_order": customer.get("created_at", now),
                            **({
                                "1688_ordered": now,
                                "dwz56_shipped": now,
                            } if item.auto_advance else {"1688_ordered": now}),
                        },
                    }
                    await db.fulfillment_pipeline.insert_one(pipeline_entry)
                    results["updated"] += 1
                else:
                    results["not_found"] += 1
                    results["errors"].append(f"Order {order_id} not found")
                    
        except Exception as e:
            results["errors"].append(f"Error updating {item.order_id}: {str(e)}")
    
    return results


@router.post("/pipeline/import-dwz-csv")
async def import_dwz_tracking_csv(
    store_name: str = Body(...),
    csv_data: str = Body(..., description="CSV format: order_id,dwz_tracking (one per line)"),
    auto_advance: bool = Body(True, description="Auto-advance all orders to dwz56_shipped"),
):
    """
    Import DWZ tracking from CSV-formatted text.
    
    CSV format (no header required):
    99001,DWZ123456
    99002,DWZ789012
    """
    tracking_data = []
    
    lines = csv_data.strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
            
        parts = line.split(',')
        if len(parts) >= 2:
            tracking_data.append(DWZTrackingItem(
                order_id=parts[0].strip(),
                dwz_tracking=parts[1].strip(),
                auto_advance=auto_advance,
            ))
    
    if not tracking_data:
        raise HTTPException(status_code=400, detail="No valid tracking data found in CSV")
    
    # Use the main import function
    request = DWZTrackingImportRequest(
        store_name=store_name,
        tracking_data=tracking_data,
    )
    
    return await import_dwz_tracking(request)


@router.post("/pipeline/sync-from-shopify")
async def sync_orders_from_shopify(store_name: str = Body(..., embed=True)):
    """Sync unfulfilled orders from Shopify to the pipeline"""
    db = get_db()
    
    # Get unfulfilled orders from customers collection
    unfulfilled = await db.customers.find({
        "store_name": store_name,
        "fulfillment_status": {"$in": ["unfulfilled", None, ""]},
        "financial_status": "paid",
    }, {"_id": 0}).to_list(500)
    
    synced = 0
    for order in unfulfilled:
        # Check if already in pipeline
        existing = await db.fulfillment_pipeline.find_one({
            "shopify_order_id": order.get("shopify_order_id")
        })
        
        if not existing:
            # Create pipeline entry
            pipeline_entry = {
                "shopify_order_id": order.get("shopify_order_id"),
                "order_number": order.get("order_number"),
                "customer_name": order.get("customer_name") or f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                "customer_phone": order.get("phone") or order.get("customer_phone"),
                "store_name": store_name,
                "current_stage": "shopify_order",
                "created_at": order.get("created_at", datetime.now(timezone.utc).isoformat()),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "stage_dates": {
                    "shopify_order": order.get("created_at", datetime.now(timezone.utc).isoformat()),
                },
                "line_items": order.get("line_items", []),
                "total_price": order.get("total_price"),
            }
            
            await db.fulfillment_pipeline.insert_one(pipeline_entry)
            synced += 1
    
    return {
        "success": True,
        "message": f"Synced {synced} orders to pipeline",
        "synced_count": synced,
    }


# ==================== WhatsApp Notifications ====================

STAGE_MESSAGES = {
    '1688_ordered': "Your order #{order_number} has been placed with our supplier. We'll update you when it ships!",
    'dwz56_shipped': "Great news! Order #{order_number} has shipped internationally. Tracking: {dwz_tracking}",
    'in_transit': "Order #{order_number} is in transit and on its way to our warehouse.",
    'warehouse_arrived': "Order #{order_number} has arrived at our local warehouse! Final delivery coming soon.",
    'warehouse_received': "Order #{order_number} has been received and checked. Preparing for final delivery.",
    'local_shipped': "Order #{order_number} is out for delivery via {carrier}! Tracking: {local_tracking}",
}


async def send_whatsapp_stage_notification(order: Dict, stage: str):
    """Send WhatsApp notification for stage change"""
    try:
        from services.whatsapp_notifications import send_whatsapp_message
        
        phone = order.get("customer_phone") or order.get("phone")
        if not phone:
            logger.warning(f"No phone number for order {order.get('order_number')}")
            return False
        
        message_template = STAGE_MESSAGES.get(stage)
        if not message_template:
            return False
        
        # Format message
        carrier_info = get_carrier_for_store(order.get("store_name", ""))
        message = message_template.format(
            order_number=order.get("order_number", order.get("shopify_order_id", "")),
            dwz_tracking=order.get("dwz_tracking", "N/A"),
            local_tracking=order.get("local_tracking", "N/A"),
            carrier=carrier_info.get("carrier", "Local Carrier"),
        )
        
        # Send via WhatsApp service
        result = await send_whatsapp_message(phone, message)
        
        # Log notification
        db = get_db()
        await db.notification_logs.insert_one({
            "type": "whatsapp_stage",
            "order_id": order.get("shopify_order_id"),
            "order_number": order.get("order_number"),
            "stage": stage,
            "phone": phone,
            "message": message,
            "success": result.get("success", False),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        
        return result.get("success", False)
        
    except Exception as e:
        logger.error(f"WhatsApp notification error: {e}")
        return False


@router.post("/pipeline/{order_id}/notify-whatsapp")
async def send_stage_notification(
    order_id: str,
    stage: str = Body(None, embed=True),
    custom_message: str = Body(None, embed=True),
):
    """Send WhatsApp notification for an order"""
    db = get_db()
    
    order = await db.fulfillment_pipeline.find_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    stage = stage or order.get("current_stage")
    
    if custom_message:
        from services.whatsapp_notifications import send_whatsapp_message
        phone = order.get("customer_phone") or order.get("phone")
        if phone:
            result = await send_whatsapp_message(phone, custom_message)
            return {"success": result.get("success", False), "message": "Custom message sent"}
    
    success = await send_whatsapp_stage_notification(order, stage)
    
    return {
        "success": success,
        "message": "Notification sent" if success else "Failed to send notification",
        "stage": stage,
    }


@router.post("/pipeline/bulk-notify")
async def bulk_send_notifications(
    order_ids: List[str] = Body(...),
    stage: str = Body(None),
):
    """Send WhatsApp notifications to multiple orders"""
    db = get_db()
    
    sent = 0
    failed = 0
    
    for order_id in order_ids:
        order = await db.fulfillment_pipeline.find_one(
            {"$or": [
                {"shopify_order_id": order_id},
                {"order_number": order_id},
            ]},
            {"_id": 0}
        )
        
        if order:
            target_stage = stage or order.get("current_stage")
            success = await send_whatsapp_stage_notification(order, target_stage)
            if success:
                sent += 1
            else:
                failed += 1
        else:
            failed += 1
    
    return {
        "success": True,
        "sent": sent,
        "failed": failed,
        "total": len(order_ids),
    }


# ==================== Export & Reporting ====================

@router.get("/pipeline/export")
async def export_pipeline_data(
    store_name: str = Query(...),
    stage: Optional[str] = Query(None),
    format: str = Query("json"),  # json or csv
):
    """Export pipeline data for reporting"""
    db = get_db()
    
    query = {"store_name": store_name}
    if stage:
        query["current_stage"] = stage
    
    orders = await db.fulfillment_pipeline.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(10000)
    
    if format == "csv":
        # Generate CSV format
        import io
        import csv
        
        output = io.StringIO()
        if orders:
            writer = csv.DictWriter(output, fieldnames=[
                "order_number", "shopify_order_id", "customer_name", "customer_phone",
                "current_stage", "alibaba_order_id", "dwz_tracking", "local_tracking",
                "local_carrier", "created_at", "updated_at", "total_price"
            ])
            writer.writeheader()
            for order in orders:
                writer.writerow({
                    "order_number": order.get("order_number", ""),
                    "shopify_order_id": order.get("shopify_order_id", ""),
                    "customer_name": order.get("customer_name", ""),
                    "customer_phone": order.get("customer_phone", ""),
                    "current_stage": order.get("current_stage", ""),
                    "alibaba_order_id": order.get("alibaba_order_id", ""),
                    "dwz_tracking": order.get("dwz_tracking", ""),
                    "local_tracking": order.get("local_tracking", ""),
                    "local_carrier": order.get("local_carrier", ""),
                    "created_at": order.get("created_at", ""),
                    "updated_at": order.get("updated_at", ""),
                    "total_price": order.get("total_price", ""),
                })
        
        return {
            "success": True,
            "format": "csv",
            "data": output.getvalue(),
            "count": len(orders),
        }
    
    return {
        "success": True,
        "format": "json",
        "orders": orders,
        "count": len(orders),
    }


@router.get("/pipeline/analytics")
async def get_pipeline_analytics(
    store_name: str = Query(...),
    days: int = Query(30, ge=1, le=365),
):
    """Get pipeline analytics and reporting data"""
    db = get_db()
    from datetime import timedelta
    
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Stage distribution
    stage_pipeline = [
        {"$match": {"store_name": store_name}},
        {"$group": {"_id": "$current_stage", "count": {"$sum": 1}}}
    ]
    stage_results = await db.fulfillment_pipeline.aggregate(stage_pipeline).to_list(None)
    stage_stats = {r["_id"]: r["count"] for r in stage_results}
    
    # Orders by day (recent)
    daily_pipeline = [
        {"$match": {
            "store_name": store_name,
            "created_at": {"$gte": cutoff.isoformat()}
        }},
        {"$addFields": {
            "date": {"$substr": ["$created_at", 0, 10]}
        }},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    daily_results = await db.fulfillment_pipeline.aggregate(daily_pipeline).to_list(None)
    daily_stats = {r["_id"]: r["count"] for r in daily_results}
    
    # Average time in each stage
    # (Simplified - would need stage_dates tracking for accurate calculation)
    
    # Total orders
    total = await db.fulfillment_pipeline.count_documents({"store_name": store_name})
    
    # Completed (local_shipped)
    completed = await db.fulfillment_pipeline.count_documents({
        "store_name": store_name,
        "current_stage": "local_shipped"
    })
    
    # Stuck orders (in same stage for > 3 days)
    three_days_ago = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    stuck = await db.fulfillment_pipeline.count_documents({
        "store_name": store_name,
        "current_stage": {"$nin": ["local_shipped", "shopify_order"]},
        "updated_at": {"$lt": three_days_ago}
    })
    
    return {
        "success": True,
        "period_days": days,
        "total_orders": total,
        "completed_orders": completed,
        "stuck_orders": stuck,
        "completion_rate": f"{(completed/total*100):.1f}%" if total > 0 else "0%",
        "stage_distribution": stage_stats,
        "daily_orders": daily_stats,
        "carrier": get_carrier_for_store(store_name),
    }


# ==================== Product Image Search Linking ====================

@router.post("/pipeline/{order_id}/link-product-by-image")
async def link_product_by_image_search(
    order_id: str,
    image_url: str = Body(..., embed=True),
):
    """Search 1688 for product by image and suggest links"""
    db = get_db()
    
    # Get the order
    order = await db.fulfillment_pipeline.find_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Use image search service
    from services.image_search_service import search_products_by_image
    
    results = await search_products_by_image(image_url)
    
    if not results.get("success"):
        return {"success": False, "error": results.get("error", "Image search failed")}
    
    return {
        "success": True,
        "order_id": order_id,
        "suggestions": results.get("products", [])[:10],
        "total_found": results.get("total", 0),
    }


@router.post("/pipeline/{order_id}/link-to-1688")
async def link_order_to_1688_product(
    order_id: str,
    product_1688_id: str = Body(..., embed=True),
):
    """Link an order to a 1688 product"""
    db = get_db()
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update the order with 1688 product link
    result = await db.fulfillment_pipeline.update_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"$set": {
            "linked_1688_product_id": product_1688_id,
            "linked_1688_url": f"https://detail.1688.com/offer/{product_1688_id}.html",
            "updated_at": now,
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "success": True,
        "message": f"Order linked to 1688 product {product_1688_id}",
        "product_url": f"https://detail.1688.com/offer/{product_1688_id}.html",
    }


# ==================== Order Details (Must be LAST due to {order_id} catch-all) ====================

@router.get("/pipeline/{order_id}")
async def get_order_pipeline_details(order_id: str):
    """Get detailed pipeline information for a specific order"""
    db = get_db()
    
    # Try fulfillment_pipeline first
    order = await db.fulfillment_pipeline.find_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"_id": 0}
    )
    
    if not order:
        # Try customers collection
        customer = await db.customers.find_one(
            {"$or": [
                {"shopify_order_id": order_id},
                {"order_number": order_id},
            ]},
            {"_id": 0}
        )
        
        if not customer:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = {
            "shopify_order_id": customer.get("shopify_order_id"),
            "order_number": customer.get("order_number"),
            "customer_name": customer.get("customer_name"),
            "current_stage": customer.get("fulfillment_stage", "shopify_order"),
            "alibaba_order_id": customer.get("alibaba_order_id"),
            "dwz_tracking": customer.get("dwz_tracking"),
            "local_tracking": customer.get("tracking_number"),
            "local_carrier": customer.get("tracking_company"),
            "store_name": customer.get("store_name"),
            "stage_dates": customer.get("stage_dates", {}),
        }
    
    # Get 1688 purchase order info
    purchase_order = await db.purchase_orders_1688.find_one(
        {"shopify_order_id": order.get("order_number") or order.get("shopify_order_id")},
        {"_id": 0}
    )
    
    if purchase_order:
        order["alibaba_order_id"] = purchase_order.get("alibaba_order_id")
        order["alibaba_status"] = purchase_order.get("status")
        order["alibaba_product_id"] = purchase_order.get("product_id")
    
    return {
        "success": True,
        "order": order,
        "stages": FULFILLMENT_STAGES,
        "carrier": get_carrier_for_store(order.get("store_name", "")),
    }
