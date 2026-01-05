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
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        # Try customers collection and create pipeline entry
        customer = await db.customers.find_one(
            {"$or": [
                {"shopify_order_id": order_id},
                {"order_number": order_id},
            ]},
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
                {"$or": [
                    {"shopify_order_id": order_id},
                    {"order_number": order_id},
                ]},
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
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
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
):
    """Bulk update multiple orders to a new stage"""
    db = get_db()
    
    if stage not in FULFILLMENT_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage: {stage}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "current_stage": stage,
        "updated_at": now,
        f"stage_dates.{stage}": now,
    }
    
    # Update in fulfillment_pipeline
    result = await db.fulfillment_pipeline.update_many(
        {"$or": [
            {"shopify_order_id": {"$in": order_ids}},
            {"order_number": {"$in": order_ids}},
        ]},
        {"$set": update_data}
    )
    
    # Also update customers collection
    await db.customers.update_many(
        {"$or": [
            {"shopify_order_id": {"$in": order_ids}},
            {"order_number": {"$in": order_ids}},
        ]},
        {"$set": {
            "fulfillment_stage": stage,
            "updated_at": now,
        }}
    )
    
    return {
        "success": True,
        "message": f"Updated {result.modified_count} orders to {stage}",
        "updated_count": result.modified_count,
    }


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


@router.get("/carriers")
async def get_carrier_config():
    """Get carrier configuration for all stores"""
    return {
        "success": True,
        "carriers": STORE_CARRIERS,
        "stages": FULFILLMENT_STAGES,
    }


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
                "store_name": store_name,
                "current_stage": "shopify_order",
                "created_at": order.get("created_at", datetime.now(timezone.utc).isoformat()),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "stage_dates": {
                    "shopify_order": order.get("created_at", datetime.now(timezone.utc).isoformat()),
                },
            }
            
            await db.fulfillment_pipeline.insert_one(pipeline_entry)
            synced += 1
    
    return {
        "success": True,
        "message": f"Synced {synced} orders to pipeline",
        "synced_count": synced,
    }
