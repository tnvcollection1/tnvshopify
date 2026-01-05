"""
Shopify Fulfillment Auto-Sync Service
Automatically syncs fulfillment status from the pipeline to Shopify.

When an order reaches 'local_shipped' stage:
1. Creates a fulfillment in Shopify with tracking info
2. Updates the Shopify order status to 'fulfilled'
3. Sends notification to customer (via Shopify)

This creates a seamless flow: 1688 → DWZ56 → Local Carrier → Shopify Fulfilled
"""

import os
import httpx
from typing import Dict, Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import APIRouter, HTTPException, Body
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/fulfillment-sync", tags=["fulfillment-sync"])

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client[os.environ.get('DB_NAME', 'shopify_customers_db')]
    return _db


# Carrier mapping by store
STORE_CARRIERS = {
    'tnvcollectionpk': {
        'carrier': 'TCS',
        'tracking_url_template': 'https://www.tcs.com.pk/track?trackno={tracking}',
        'country': 'Pakistan',
    },
    'tnvcollection': {
        'carrier': 'DTDC',
        'tracking_url_template': 'https://www.dtdc.in/tracking.asp?strCnno={tracking}',
        'country': 'India',
    },
}

# Fulfillment stages that trigger Shopify sync
SYNC_TRIGGER_STAGES = ['local_shipped']


async def get_store_credentials(store_name: str) -> Optional[Dict]:
    """Get Shopify credentials for a store"""
    db = get_db()
    
    store = await db.stores.find_one(
        {"store_name": store_name},
        {"_id": 0, "shopify_domain": 1, "shopify_token": 1, "store_name": 1}
    )
    
    return store


async def create_shopify_fulfillment(
    shopify_domain: str,
    shopify_token: str,
    order_id: str,
    tracking_number: str,
    tracking_company: str,
    tracking_url: Optional[str] = None,
    notify_customer: bool = True,
) -> Dict:
    """
    Create a fulfillment in Shopify for an order.
    
    Uses Shopify Admin REST API 2024-01.
    """
    try:
        # First, get the order to find the fulfillment_orders
        headers = {
            "X-Shopify-Access-Token": shopify_token,
            "Content-Type": "application/json",
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get the order
            order_url = f"https://{shopify_domain}/admin/api/2024-01/orders/{order_id}.json"
            order_response = await client.get(order_url, headers=headers)
            
            if order_response.status_code != 200:
                logger.error(f"Failed to get Shopify order {order_id}: {order_response.text}")
                return {"success": False, "error": f"Order not found: {order_response.status_code}"}
            
            order_data = order_response.json().get("order", {})
            
            # Get fulfillment orders for this order
            fulfillment_orders_url = f"https://{shopify_domain}/admin/api/2024-01/orders/{order_id}/fulfillment_orders.json"
            fo_response = await client.get(fulfillment_orders_url, headers=headers)
            
            if fo_response.status_code != 200:
                logger.error(f"Failed to get fulfillment orders: {fo_response.text}")
                return {"success": False, "error": "Could not get fulfillment orders"}
            
            fulfillment_orders = fo_response.json().get("fulfillment_orders", [])
            
            if not fulfillment_orders:
                return {"success": False, "error": "No fulfillment orders found"}
            
            # Find an open fulfillment order
            open_fo = None
            for fo in fulfillment_orders:
                if fo.get("status") in ["open", "in_progress"]:
                    open_fo = fo
                    break
            
            if not open_fo:
                # Check if already fulfilled
                if any(fo.get("status") == "closed" for fo in fulfillment_orders):
                    return {"success": True, "message": "Order already fulfilled", "already_fulfilled": True}
                return {"success": False, "error": "No open fulfillment order"}
            
            # Create fulfillment
            fulfillment_url = f"https://{shopify_domain}/admin/api/2024-01/fulfillments.json"
            
            fulfillment_payload = {
                "fulfillment": {
                    "line_items_by_fulfillment_order": [
                        {
                            "fulfillment_order_id": open_fo["id"],
                        }
                    ],
                    "tracking_info": {
                        "number": tracking_number,
                        "company": tracking_company,
                    },
                    "notify_customer": notify_customer,
                }
            }
            
            if tracking_url:
                fulfillment_payload["fulfillment"]["tracking_info"]["url"] = tracking_url
            
            fulfill_response = await client.post(
                fulfillment_url,
                headers=headers,
                json=fulfillment_payload
            )
            
            if fulfill_response.status_code in [200, 201]:
                fulfillment = fulfill_response.json().get("fulfillment", {})
                logger.info(f"✅ Created Shopify fulfillment for order {order_id}: {fulfillment.get('id')}")
                return {
                    "success": True,
                    "fulfillment_id": fulfillment.get("id"),
                    "tracking_number": tracking_number,
                    "tracking_company": tracking_company,
                    "notify_customer": notify_customer,
                }
            else:
                error_msg = fulfill_response.text
                logger.error(f"Failed to create fulfillment: {error_msg}")
                return {"success": False, "error": error_msg}
                
    except Exception as e:
        logger.error(f"Shopify fulfillment error: {e}")
        return {"success": False, "error": str(e)}


async def sync_order_to_shopify(order: Dict) -> Dict:
    """
    Sync an order's fulfillment status to Shopify.
    Called when order reaches 'local_shipped' stage.
    """
    db = get_db()
    store_name = order.get("store_name")
    
    if not store_name:
        return {"success": False, "error": "No store name"}
    
    # Get store credentials
    store = await get_store_credentials(store_name)
    if not store:
        return {"success": False, "error": f"Store not found: {store_name}"}
    
    shopify_domain = store.get("shopify_domain")
    shopify_token = store.get("shopify_token")
    
    if not shopify_domain or not shopify_token:
        return {"success": False, "error": "Missing Shopify credentials"}
    
    # Get tracking info
    tracking_number = order.get("local_tracking") or order.get("tracking_number")
    carrier_info = STORE_CARRIERS.get(store_name, {"carrier": "Local Carrier"})
    tracking_company = order.get("local_carrier") or carrier_info.get("carrier")
    
    if not tracking_number:
        return {"success": False, "error": "No tracking number"}
    
    # Generate tracking URL
    tracking_url = None
    if carrier_info.get("tracking_url_template"):
        tracking_url = carrier_info["tracking_url_template"].format(tracking=tracking_number)
    
    # Get Shopify order ID
    shopify_order_id = order.get("shopify_order_id")
    if not shopify_order_id:
        # Try to find from customers collection
        customer = await db.customers.find_one(
            {"order_number": order.get("order_number")},
            {"_id": 0, "shopify_order_id": 1}
        )
        if customer:
            shopify_order_id = customer.get("shopify_order_id")
    
    if not shopify_order_id:
        return {"success": False, "error": "No Shopify order ID"}
    
    # Create fulfillment in Shopify
    result = await create_shopify_fulfillment(
        shopify_domain=shopify_domain,
        shopify_token=shopify_token,
        order_id=shopify_order_id,
        tracking_number=tracking_number,
        tracking_company=tracking_company,
        tracking_url=tracking_url,
        notify_customer=True,
    )
    
    # Log the sync
    await db.fulfillment_sync_logs.insert_one({
        "order_id": order.get("order_number") or shopify_order_id,
        "shopify_order_id": shopify_order_id,
        "store_name": store_name,
        "tracking_number": tracking_number,
        "tracking_company": tracking_company,
        "sync_result": result,
        "synced_at": datetime.now(timezone.utc).isoformat(),
    })
    
    # Update the pipeline entry
    if result.get("success"):
        await db.fulfillment_pipeline.update_one(
            {"shopify_order_id": shopify_order_id},
            {"$set": {
                "shopify_synced": True,
                "shopify_fulfillment_id": result.get("fulfillment_id"),
                "shopify_synced_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        # Also update customers collection
        await db.customers.update_one(
            {"shopify_order_id": shopify_order_id},
            {"$set": {
                "fulfillment_status": "fulfilled",
                "tracking_number": tracking_number,
                "tracking_company": tracking_company,
            }}
        )
    
    return result


# ==================== API Endpoints ====================

@router.post("/sync-order/{order_id}")
async def sync_single_order_to_shopify(order_id: str):
    """
    Manually trigger Shopify fulfillment sync for a specific order.
    """
    db = get_db()
    
    # Find the order in pipeline
    order = await db.fulfillment_pipeline.find_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"_id": 0}
    )
    
    if not order:
        # Try customers collection
        order = await db.customers.find_one(
            {"$or": [
                {"shopify_order_id": order_id},
                {"order_number": order_id},
            ]},
            {"_id": 0}
        )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Sync to Shopify
    result = await sync_order_to_shopify(order)
    
    return {
        "success": result.get("success", False),
        "order_id": order_id,
        "result": result,
    }


@router.post("/sync-stage/{stage}")
async def sync_all_orders_in_stage(
    stage: str,
    store_name: str = Body(..., embed=True),
):
    """
    Sync all orders in a specific stage to Shopify.
    Typically used for 'local_shipped' stage.
    """
    if stage not in SYNC_TRIGGER_STAGES:
        raise HTTPException(
            status_code=400, 
            detail=f"Stage '{stage}' is not configured for auto-sync. Allowed: {SYNC_TRIGGER_STAGES}"
        )
    
    db = get_db()
    
    # Get all orders in the stage that haven't been synced
    orders = await db.fulfillment_pipeline.find(
        {
            "store_name": store_name,
            "current_stage": stage,
            "shopify_synced": {"$ne": True},
            "local_tracking": {"$exists": True, "$ne": None, "$ne": ""},
        },
        {"_id": 0}
    ).to_list(100)
    
    results = {
        "total": len(orders),
        "synced": 0,
        "failed": 0,
        "already_synced": 0,
        "errors": [],
    }
    
    for order in orders:
        try:
            result = await sync_order_to_shopify(order)
            if result.get("success"):
                if result.get("already_fulfilled"):
                    results["already_synced"] += 1
                else:
                    results["synced"] += 1
            else:
                results["failed"] += 1
                results["errors"].append({
                    "order": order.get("order_number"),
                    "error": result.get("error"),
                })
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({
                "order": order.get("order_number"),
                "error": str(e),
            })
    
    return {
        "success": True,
        "stage": stage,
        "store_name": store_name,
        "results": results,
    }


@router.get("/sync-logs")
async def get_sync_logs(
    store_name: str = None,
    limit: int = 50,
):
    """Get recent fulfillment sync logs"""
    db = get_db()
    
    query = {}
    if store_name:
        query["store_name"] = store_name
    
    logs = await db.fulfillment_sync_logs.find(
        query,
        {"_id": 0}
    ).sort("synced_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "logs": logs,
        "count": len(logs),
    }


@router.get("/pending-sync")
async def get_pending_sync_orders(store_name: str = None):
    """Get orders that are ready for Shopify sync (local_shipped with tracking but not synced)"""
    db = get_db()
    
    query = {
        "current_stage": "local_shipped",
        "shopify_synced": {"$ne": True},
        "local_tracking": {"$exists": True, "$ne": None, "$ne": ""},
    }
    
    if store_name:
        query["store_name"] = store_name
    
    orders = await db.fulfillment_pipeline.find(
        query,
        {"_id": 0, "shopify_order_id": 1, "order_number": 1, "store_name": 1, 
         "local_tracking": 1, "local_carrier": 1, "current_stage": 1}
    ).to_list(100)
    
    return {
        "success": True,
        "pending_orders": orders,
        "count": len(orders),
    }


@router.post("/auto-sync-on-stage-change")
async def handle_stage_change_sync(
    order_id: str = Body(...),
    new_stage: str = Body(...),
    store_name: str = Body(...),
):
    """
    Webhook-style endpoint to be called when an order's stage changes.
    Automatically syncs to Shopify if the new stage is in SYNC_TRIGGER_STAGES.
    
    This should be called from fulfillment_pipeline_service.py when stage is updated.
    """
    if new_stage not in SYNC_TRIGGER_STAGES:
        return {
            "success": True,
            "message": f"Stage '{new_stage}' does not trigger auto-sync",
            "auto_synced": False,
        }
    
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
        return {
            "success": False,
            "error": "Order not found",
            "auto_synced": False,
        }
    
    # Check if already synced
    if order.get("shopify_synced"):
        return {
            "success": True,
            "message": "Already synced to Shopify",
            "auto_synced": False,
        }
    
    # Check if has tracking
    if not order.get("local_tracking"):
        return {
            "success": True,
            "message": "No tracking number, skipping auto-sync",
            "auto_synced": False,
        }
    
    # Sync to Shopify
    result = await sync_order_to_shopify(order)
    
    return {
        "success": result.get("success", False),
        "message": "Auto-synced to Shopify" if result.get("success") else result.get("error"),
        "auto_synced": result.get("success", False),
        "result": result,
    }
