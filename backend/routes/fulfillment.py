"""
Fulfillment Automation Service
Connects 1688 purchases with DWZ56 shipping for end-to-end order fulfillment

Flow:
1. Shopify Order → WaMerce (already synced)
2. WaMerce → Auto-purchase on 1688
3. 1688 → Get tracking number
4. Tracking # → DWZ56 for pick/pack/ship
5. Update order as fulfilled
"""

from fastapi import APIRouter, HTTPException, Body, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import json
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/fulfillment", tags=["Fulfillment Automation"])

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client['shopify_customers_db']
    return _db


# ==================== Pydantic Models ====================

class FulfillmentOrder(BaseModel):
    shopify_order_id: str = Field(..., description="Shopify order ID")
    order_number: Optional[str] = Field(None, description="Shopify order number")
    customer_name: str = Field(..., description="Customer name")
    customer_phone: Optional[str] = Field(None, description="Customer phone")
    shipping_address: dict = Field(..., description="Shipping address")
    line_items: List[dict] = Field(..., description="Order line items")
    status: str = Field("pending", description="Fulfillment status")


class AutoPurchaseRequest(BaseModel):
    shopify_order_id: str = Field(..., description="Shopify order ID to auto-purchase")
    shipping_to_warehouse: bool = Field(True, description="Ship to DWZ56 warehouse")


class LinkFulfillmentRequest(BaseModel):
    shopify_order_id: str = Field(..., description="Shopify order ID")
    alibaba_order_id: str = Field(..., description="1688 order ID")
    alibaba_tracking: Optional[str] = Field(None, description="1688 tracking number")


# ==================== Helper Functions ====================

async def get_1688_order_tracking(order_id: str) -> dict:
    """Get tracking info from 1688 order"""
    from routes.alibaba_1688 import make_api_request, ALIBABA_ACCESS_TOKEN
    
    try:
        params = {"orderId": order_id}
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.getLogisticsInfos.buyerView",
            params,
            access_token=ALIBABA_ACCESS_TOKEN
        )
        return {
            "success": True,
            "logistics": result.get("result") or result,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


async def create_dwz56_shipment(order_data: dict, tracking_ref: str = None) -> dict:
    """Create a shipment in DWZ56 system"""
    from routes.dwz56 import build_request_payload, make_api_request
    
    try:
        # Build shipping record
        record = {
            "cOrdNo": order_data.get("order_number") or order_data.get("shopify_order_id"),
            "cName": order_data.get("customer_name", ""),
            "cTel": order_data.get("customer_phone", ""),
            "cMob": order_data.get("customer_phone", ""),
            "cAddr": order_data.get("shipping_address", {}).get("address", ""),
            "cCity": order_data.get("shipping_address", {}).get("city", ""),
            "cProv": order_data.get("shipping_address", {}).get("province", ""),
            "cCountry": order_data.get("shipping_address", {}).get("country", "PK"),
            "cZip": order_data.get("shipping_address", {}).get("zip", ""),
            "cMemo": f"1688 Ref: {tracking_ref}" if tracking_ref else "",
            "nGoodsNum": len(order_data.get("line_items", [])),
            "cGoodsName": ", ".join([item.get("title", "")[:30] for item in order_data.get("line_items", [])[:3]]),
        }
        
        payload = build_request_payload("PreInputSet", {"RecList": [record]})
        result = await make_api_request(payload)
        
        return {
            "success": result.get("nResult") == 1,
            "dwz56_response": result,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


# ==================== API Endpoints ====================

@router.get("/status/{shopify_order_id}")
async def get_fulfillment_status(shopify_order_id: str):
    """
    Get the current fulfillment status of an order
    Shows: Shopify → 1688 → DWZ56 pipeline status
    """
    db = get_db()
    
    # Get fulfillment record
    fulfillment = await db.fulfillment_pipeline.find_one(
        {"shopify_order_id": shopify_order_id},
        {"_id": 0}
    )
    
    if not fulfillment:
        # Try to find in customers collection (Shopify orders)
        order = await db.customers.find_one(
            {"order_id": shopify_order_id},
            {"_id": 0}
        )
        
        if order:
            return {
                "shopify_order_id": shopify_order_id,
                "order_number": order.get("order_number"),
                "status": "pending",
                "stages": {
                    "shopify_received": True,
                    "alibaba_purchased": False,
                    "alibaba_shipped": False,
                    "dwz56_received": False,
                    "dwz56_shipped": False,
                    "delivered": False,
                },
                "order_data": order,
            }
        else:
            raise HTTPException(status_code=404, detail="Order not found")
    
    return fulfillment


@router.post("/link-1688-order")
async def link_1688_order(request: LinkFulfillmentRequest):
    """
    Link a 1688 purchase order to a Shopify order
    This creates the fulfillment pipeline record
    """
    db = get_db()
    
    # Get Shopify order
    shopify_order = await db.customers.find_one(
        {"order_id": request.shopify_order_id},
        {"_id": 0}
    )
    
    if not shopify_order:
        raise HTTPException(status_code=404, detail="Shopify order not found")
    
    # Create or update fulfillment record
    fulfillment = {
        "shopify_order_id": request.shopify_order_id,
        "order_number": shopify_order.get("order_number"),
        "alibaba_order_id": request.alibaba_order_id,
        "alibaba_tracking": request.alibaba_tracking,
        "status": "purchased",
        "stages": {
            "shopify_received": True,
            "alibaba_purchased": True,
            "alibaba_shipped": bool(request.alibaba_tracking),
            "dwz56_received": False,
            "dwz56_shipped": False,
            "delivered": False,
        },
        "customer": {
            "name": f"{shopify_order.get('first_name', '')} {shopify_order.get('last_name', '')}".strip(),
            "phone": shopify_order.get("phone"),
            "email": shopify_order.get("email"),
        },
        "shipping_address": {
            "address": shopify_order.get("address"),
            "city": shopify_order.get("city"),
            "province": shopify_order.get("province"),
            "country": shopify_order.get("country"),
            "zip": shopify_order.get("zip"),
        },
        "line_items": shopify_order.get("line_items", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.fulfillment_pipeline.update_one(
        {"shopify_order_id": request.shopify_order_id},
        {"$set": fulfillment},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "1688 order linked to fulfillment pipeline",
        "fulfillment": fulfillment,
    }


@router.post("/sync-1688-tracking/{shopify_order_id}")
async def sync_1688_tracking(shopify_order_id: str):
    """
    Sync tracking information from 1688 order
    Updates the fulfillment pipeline with latest tracking
    """
    db = get_db()
    
    # Get fulfillment record
    fulfillment = await db.fulfillment_pipeline.find_one(
        {"shopify_order_id": shopify_order_id},
        {"_id": 0}
    )
    
    if not fulfillment:
        raise HTTPException(status_code=404, detail="Fulfillment record not found. Link 1688 order first.")
    
    alibaba_order_id = fulfillment.get("alibaba_order_id")
    if not alibaba_order_id:
        raise HTTPException(status_code=400, detail="No 1688 order linked")
    
    # Get tracking from 1688
    tracking_result = await get_1688_order_tracking(alibaba_order_id)
    
    if tracking_result.get("success"):
        logistics = tracking_result.get("logistics", {})
        
        # Extract tracking info
        tracking_info = {
            "logistics_company": logistics.get("logisticsCompanyName"),
            "tracking_number": logistics.get("logisticsBillNo"),
            "status": logistics.get("status"),
            "details": logistics,
        }
        
        # Update fulfillment record
        update_data = {
            "alibaba_tracking": tracking_info.get("tracking_number"),
            "alibaba_logistics": tracking_info,
            "stages.alibaba_shipped": bool(tracking_info.get("tracking_number")),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await db.fulfillment_pipeline.update_one(
            {"shopify_order_id": shopify_order_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "tracking": tracking_info,
        }
    
    return {
        "success": False,
        "error": tracking_result.get("error"),
    }


@router.post("/send-to-dwz56/{shopify_order_id}")
async def send_to_dwz56(shopify_order_id: str):
    """
    Send order to DWZ56 for pick/pack/ship
    Uses 1688 tracking number as reference
    """
    db = get_db()
    
    # Get fulfillment record
    fulfillment = await db.fulfillment_pipeline.find_one(
        {"shopify_order_id": shopify_order_id},
        {"_id": 0}
    )
    
    if not fulfillment:
        raise HTTPException(status_code=404, detail="Fulfillment record not found")
    
    # Prepare order data for DWZ56
    order_data = {
        "shopify_order_id": shopify_order_id,
        "order_number": fulfillment.get("order_number"),
        "customer_name": fulfillment.get("customer", {}).get("name"),
        "customer_phone": fulfillment.get("customer", {}).get("phone"),
        "shipping_address": fulfillment.get("shipping_address"),
        "line_items": fulfillment.get("line_items", []),
    }
    
    # Create shipment in DWZ56
    tracking_ref = fulfillment.get("alibaba_tracking") or fulfillment.get("alibaba_order_id")
    dwz_result = await create_dwz56_shipment(order_data, tracking_ref)
    
    if dwz_result.get("success"):
        # Update fulfillment record
        await db.fulfillment_pipeline.update_one(
            {"shopify_order_id": shopify_order_id},
            {"$set": {
                "status": "sent_to_dwz56",
                "stages.dwz56_received": True,
                "dwz56_response": dwz_result.get("dwz56_response"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        return {
            "success": True,
            "message": "Order sent to DWZ56 for fulfillment",
            "dwz56_response": dwz_result.get("dwz56_response"),
        }
    
    return {
        "success": False,
        "error": dwz_result.get("error"),
    }


@router.post("/mark-fulfilled/{shopify_order_id}")
async def mark_order_fulfilled(
    shopify_order_id: str,
    tracking_number: str = Body(None, embed=True),
):
    """
    Mark an order as fulfilled
    Optionally provide DWZ56 tracking number
    """
    db = get_db()
    
    update_data = {
        "status": "fulfilled",
        "stages.dwz56_shipped": True,
        "fulfilled_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    if tracking_number:
        update_data["dwz56_tracking"] = tracking_number
    
    result = await db.fulfillment_pipeline.update_one(
        {"shopify_order_id": shopify_order_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fulfillment record not found")
    
    # Also update in customers collection
    await db.customers.update_one(
        {"order_id": shopify_order_id},
        {"$set": {
            "fulfillment_status": "fulfilled",
            "fulfillment_tracking": tracking_number,
            "fulfilled_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    
    return {
        "success": True,
        "message": "Order marked as fulfilled",
    }


@router.get("/pipeline")
async def list_fulfillment_pipeline(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    List all orders in the fulfillment pipeline
    """
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    skip = (page - 1) * page_size
    
    orders = await db.fulfillment_pipeline.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    total = await db.fulfillment_pipeline.count_documents(query)
    
    return {
        "success": True,
        "page": page,
        "page_size": page_size,
        "total": total,
        "orders": orders,
    }


@router.get("/pending-purchase")
async def list_pending_purchase():
    """
    List Shopify orders that need to be purchased on 1688
    """
    db = get_db()
    
    # Get orders that are not yet in fulfillment pipeline
    pipeline_order_ids = await db.fulfillment_pipeline.distinct("shopify_order_id")
    
    # Find Shopify orders not in pipeline
    pending_orders = await db.customers.find(
        {
            "order_id": {"$nin": pipeline_order_ids},
            "financial_status": "paid",  # Only paid orders
        },
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return {
        "success": True,
        "total": len(pending_orders),
        "orders": pending_orders,
    }


@router.post("/auto-purchase")
async def auto_purchase_order(request: AutoPurchaseRequest, background_tasks: BackgroundTasks):
    """
    Automatically purchase items from 1688 for a Shopify order
    """
    db = get_db()
    
    # Get Shopify order
    shopify_order = await db.customers.find_one(
        {"order_id": request.shopify_order_id},
        {"_id": 0}
    )
    
    if not shopify_order:
        raise HTTPException(status_code=404, detail="Shopify order not found")
    
    # Get matching products from 1688 catalog
    line_items = shopify_order.get("line_items", [])
    matched_products = []
    
    for item in line_items:
        # Try to find matching product in 1688 catalog
        product_title = item.get("title", "")
        sku = item.get("sku", "")
        
        catalog_match = await db.product_catalog_1688.find_one({
            "$or": [
                {"title": {"$regex": product_title[:30], "$options": "i"}},
                {"sku": sku} if sku else {},
            ]
        }, {"_id": 0})
        
        if catalog_match:
            matched_products.append({
                "shopify_item": item,
                "catalog_item": catalog_match,
            })
    
    if not matched_products:
        return {
            "success": False,
            "message": "No matching 1688 products found. Add products to catalog first.",
            "shopify_order_id": request.shopify_order_id,
        }
    
    # For now, return the matched products - actual 1688 order creation would go here
    return {
        "success": True,
        "message": f"Found {len(matched_products)} matching products",
        "matched_products": matched_products,
        "next_step": "Create 1688 purchase order with these products",
        "note": "Auto-purchase will use alibaba.trade.fastCreateOrder API",
    }
