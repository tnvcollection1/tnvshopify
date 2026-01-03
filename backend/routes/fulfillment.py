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
import logging
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/fulfillment", tags=["Fulfillment Automation"])
logger = logging.getLogger(__name__)

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


class ProcessNewOrderRequest(BaseModel):
    customer_id: str = Field(..., description="Customer ID from WaMerce")
    auto_purchase: bool = Field(False, description="Automatically create 1688 order")


# ==================== Helper Functions ====================

async def get_1688_credentials():
    """Get 1688 API credentials from environment"""
    return {
        "app_key": os.environ.get("ALIBABA_1688_APP_KEY", "8585237"),
        "app_secret": os.environ.get("ALIBABA_1688_APP_SECRET", "Gin6sv4MkP"),
        "access_token": os.environ.get("ALIBABA_1688_ACCESS_TOKEN", "650153f3-8596-4f08-9d17-20d3cb5f19b9"),
    }


async def get_1688_order_tracking(order_id: str) -> dict:
    """Get tracking info from 1688 order"""
    from routes.alibaba_1688 import make_api_request
    
    creds = await get_1688_credentials()
    
    try:
        params = {"orderId": order_id}
        result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.getLogisticsInfos.buyerView",
            params,
            access_token=creds["access_token"]
        )
        
        logistics = result.get("result") or result
        tracking_number = None
        logistics_company = None
        
        # Extract tracking details from response
        if isinstance(logistics, list) and len(logistics) > 0:
            first_logistics = logistics[0]
            tracking_number = first_logistics.get("logisticsBillNo")
            logistics_company = first_logistics.get("logisticsCompanyName")
        elif isinstance(logistics, dict):
            tracking_number = logistics.get("logisticsBillNo")
            logistics_company = logistics.get("logisticsCompanyName")
        
        return {
            "success": True,
            "tracking_number": tracking_number,
            "logistics_company": logistics_company,
            "logistics": logistics,
        }
    except Exception as e:
        logger.error(f"Error getting 1688 tracking for order {order_id}: {e}")
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
        logger.error(f"Error creating DWZ56 shipment: {e}")
        return {
            "success": False,
            "error": str(e),
        }


async def match_products_to_catalog(line_items: List[dict]) -> tuple:
    """Match Shopify line items to 1688 catalog products"""
    db = get_db()
    matched = []
    unmatched = []
    
    for item in line_items:
        product_title = item.get("name") or item.get("title", "")
        sku = item.get("sku", "")
        
        # Build search query
        query_conditions = []
        if product_title and len(product_title) > 5:
            # Search by first 30 chars of title
            query_conditions.append({"title": {"$regex": product_title[:30], "$options": "i"}})
        if sku:
            query_conditions.append({"sku_id": sku})
            query_conditions.append({"sku_info": {"$regex": sku, "$options": "i"}})
        
        if not query_conditions:
            unmatched.append(item)
            continue
        
        # Find matching product in catalog
        catalog_match = await db.product_catalog_1688.find_one(
            {"$or": query_conditions},
            {"_id": 0}
        )
        
        if catalog_match:
            matched.append({
                "shopify_item": item,
                "catalog_item": catalog_match,
                "product_id": catalog_match.get("source_id"),
                "sku_id": catalog_match.get("sku_id"),
                "quantity": item.get("quantity", 1),
                "unit_price": catalog_match.get("price"),
            })
        else:
            unmatched.append(item)
    
    return matched, unmatched


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
        # Try to find in customers collection using shopify_order_id
        order = await db.customers.find_one(
            {"shopify_order_id": shopify_order_id},
            {"_id": 0}
        )
        
        if not order:
            # Also try customer_id field
            order = await db.customers.find_one(
                {"customer_id": shopify_order_id},
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


@router.post("/process-new-order")
async def process_new_shopify_order(request: ProcessNewOrderRequest, background_tasks: BackgroundTasks):
    """
    Process a newly synced Shopify order for fulfillment
    - Matches products to 1688 catalog
    - Optionally creates auto-purchase on 1688
    - Adds to fulfillment pipeline
    """
    db = get_db()
    
    # Get the order from customers collection
    order = await db.customers.find_one(
        {"customer_id": request.customer_id},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if already in pipeline
    existing = await db.fulfillment_pipeline.find_one(
        {"shopify_order_id": order.get("shopify_order_id") or request.customer_id}
    )
    
    if existing:
        return {
            "success": True,
            "message": "Order already in fulfillment pipeline",
            "fulfillment": existing,
        }
    
    # Match products to 1688 catalog
    line_items = order.get("line_items", [])
    matched, unmatched = await match_products_to_catalog(line_items)
    
    # Create fulfillment record
    shopify_order_id = order.get("shopify_order_id") or request.customer_id
    fulfillment = {
        "shopify_order_id": shopify_order_id,
        "customer_id": request.customer_id,
        "order_number": order.get("order_number"),
        "store_name": order.get("store_name"),
        "status": "pending",
        "stages": {
            "shopify_received": True,
            "products_matched": len(matched) > 0,
            "alibaba_purchased": False,
            "alibaba_shipped": False,
            "dwz56_received": False,
            "dwz56_shipped": False,
            "delivered": False,
        },
        "customer": {
            "name": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
            "phone": order.get("phone"),
            "email": order.get("email"),
        },
        "shipping_address": {
            "address": order.get("address"),
            "city": order.get("city"),
            "province": order.get("province"),
            "country": order.get("country") or order.get("country_code"),
            "zip": order.get("zip"),
        },
        "line_items": line_items,
        "matched_products": matched,
        "unmatched_products": [{"name": u.get("name"), "sku": u.get("sku")} for u in unmatched],
        "total_price": order.get("total_spent") or order.get("total_price"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.fulfillment_pipeline.insert_one(fulfillment)
    
    # If auto_purchase is requested and we have matched products
    if request.auto_purchase and matched:
        background_tasks.add_task(
            auto_create_1688_order,
            shopify_order_id,
            matched,
            fulfillment
        )
        fulfillment["auto_purchase_queued"] = True
    
    return {
        "success": True,
        "message": f"Order added to fulfillment pipeline",
        "matched_products": len(matched),
        "unmatched_products": len(unmatched),
        "fulfillment": {k: v for k, v in fulfillment.items() if k != "_id"},
    }


async def auto_create_1688_order(shopify_order_id: str, matched_products: List[dict], fulfillment: dict):
    """Background task to create 1688 order"""
    from routes.alibaba_1688 import make_api_request
    
    db = get_db()
    creds = await get_1688_credentials()
    
    try:
        # Get shipping addresses from 1688
        address_result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.receiveAddress.get",
            {},
            access_token=creds["access_token"]
        )
        addresses = address_result.get("result", {}).get("receiveAddressItems", [])
        default_address = addresses[0] if addresses else None
        
        if not default_address:
            logger.error(f"No shipping address configured for 1688 order {shopify_order_id}")
            await db.fulfillment_pipeline.update_one(
                {"shopify_order_id": shopify_order_id},
                {"$set": {
                    "status": "error",
                    "error": "No 1688 shipping address configured",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            return
        
        # Build cargo list
        cargo_list = []
        for match in matched_products:
            cargo = {
                "offerId": int(match["product_id"]),
                "quantity": float(match["quantity"]),
            }
            if match.get("sku_id"):
                cargo["specId"] = match["sku_id"]
            cargo_list.append(cargo)
        
        # Create order params
        create_params = {
            "addressParam": json.dumps({"addressId": default_address.get("addressId")}),
            "cargoParamList": json.dumps(cargo_list),
            "flow": "general",
            "message": f"Shopify Order: {fulfillment.get('order_number', shopify_order_id)}",
        }
        
        # Create the order
        create_result = await make_api_request(
            "com.alibaba.trade/alibaba.trade.fastCreateOrder",
            create_params,
            access_token=creds["access_token"]
        )
        
        alibaba_order_id = create_result.get("result", {}).get("orderId") or create_result.get("orderId")
        
        if alibaba_order_id:
            # Update fulfillment record
            await db.fulfillment_pipeline.update_one(
                {"shopify_order_id": shopify_order_id},
                {"$set": {
                    "status": "purchased",
                    "alibaba_order_id": str(alibaba_order_id),
                    "alibaba_order_response": create_result,
                    "stages.alibaba_purchased": True,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            logger.info(f"✅ Created 1688 order {alibaba_order_id} for Shopify {shopify_order_id}")
        else:
            error_msg = create_result.get("error_message") or create_result.get("errorMessage") or "Unknown error"
            await db.fulfillment_pipeline.update_one(
                {"shopify_order_id": shopify_order_id},
                {"$set": {
                    "status": "error",
                    "error": f"1688 order creation failed: {error_msg}",
                    "alibaba_order_response": create_result,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            logger.error(f"❌ Failed to create 1688 order for {shopify_order_id}: {error_msg}")
            
    except Exception as e:
        logger.error(f"❌ Error in auto_create_1688_order for {shopify_order_id}: {e}")
        await db.fulfillment_pipeline.update_one(
            {"shopify_order_id": shopify_order_id},
            {"$set": {
                "status": "error",
                "error": str(e),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )


@router.post("/link-1688-order")
async def link_1688_order(request: LinkFulfillmentRequest):
    """
    Link a 1688 purchase order to a Shopify order
    This creates or updates the fulfillment pipeline record
    """
    db = get_db()
    
    # Get Shopify order
    shopify_order = await db.customers.find_one(
        {"$or": [
            {"shopify_order_id": request.shopify_order_id},
            {"customer_id": request.shopify_order_id},
        ]},
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
        tracking_number = tracking_result.get("tracking_number")
        logistics_company = tracking_result.get("logistics_company")
        
        # Update fulfillment record
        update_data = {
            "alibaba_tracking": tracking_number,
            "alibaba_logistics_company": logistics_company,
            "alibaba_logistics_details": tracking_result.get("logistics"),
            "stages.alibaba_shipped": bool(tracking_number),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        if tracking_number:
            update_data["status"] = "shipped_from_supplier"
        
        await db.fulfillment_pipeline.update_one(
            {"shopify_order_id": shopify_order_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "tracking_number": tracking_number,
            "logistics_company": logistics_company,
            "message": "Tracking synced successfully" if tracking_number else "No tracking available yet",
        }
    
    return {
        "success": False,
        "error": tracking_result.get("error"),
    }


@router.post("/sync-all-tracking")
async def sync_all_pending_tracking():
    """
    Sync tracking for all orders waiting for 1688 shipment
    """
    db = get_db()
    
    # Find all orders that have alibaba_order_id but no tracking yet
    pending_orders = await db.fulfillment_pipeline.find(
        {
            "alibaba_order_id": {"$exists": True, "$ne": None},
            "$or": [
                {"alibaba_tracking": {"$exists": False}},
                {"alibaba_tracking": None},
            ],
            "status": {"$in": ["purchased", "awaiting_shipment"]},
        },
        {"_id": 0, "shopify_order_id": 1, "alibaba_order_id": 1}
    ).to_list(100)
    
    results = {
        "total": len(pending_orders),
        "updated": 0,
        "no_tracking": 0,
        "errors": 0,
    }
    
    for order in pending_orders:
        try:
            tracking_result = await get_1688_order_tracking(order["alibaba_order_id"])
            
            if tracking_result.get("success") and tracking_result.get("tracking_number"):
                await db.fulfillment_pipeline.update_one(
                    {"shopify_order_id": order["shopify_order_id"]},
                    {"$set": {
                        "alibaba_tracking": tracking_result["tracking_number"],
                        "alibaba_logistics_company": tracking_result.get("logistics_company"),
                        "alibaba_logistics_details": tracking_result.get("logistics"),
                        "stages.alibaba_shipped": True,
                        "status": "shipped_from_supplier",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                results["updated"] += 1
            else:
                results["no_tracking"] += 1
        except Exception as e:
            logger.error(f"Error syncing tracking for {order['shopify_order_id']}: {e}")
            results["errors"] += 1
    
    return {
        "success": True,
        "message": f"Synced tracking for {results['updated']} orders",
        "results": results,
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
    
    # Check if we have tracking from 1688
    if not fulfillment.get("alibaba_tracking") and not fulfillment.get("alibaba_order_id"):
        raise HTTPException(status_code=400, detail="No 1688 tracking available. Sync tracking first.")
    
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
                "dwz56_sent_at": datetime.now(timezone.utc).isoformat(),
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
        {"$or": [
            {"shopify_order_id": shopify_order_id},
            {"customer_id": shopify_order_id},
        ]},
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
    store_name: Optional[str] = Query(None, description="Filter by store"),
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
    if store_name:
        query["store_name"] = store_name
    
    skip = (page - 1) * page_size
    
    orders = await db.fulfillment_pipeline.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    total = await db.fulfillment_pipeline.count_documents(query)
    
    # Get status counts
    status_counts = {}
    for s in ["pending", "purchased", "shipped_from_supplier", "sent_to_dwz56", "fulfilled", "error"]:
        count_query = dict(query)
        count_query["status"] = s
        status_counts[s] = await db.fulfillment_pipeline.count_documents(count_query)
    
    return {
        "success": True,
        "page": page,
        "page_size": page_size,
        "total": total,
        "status_counts": status_counts,
        "orders": orders,
    }


@router.get("/pending-purchase")
async def list_pending_purchase(store_name: Optional[str] = Query(None)):
    """
    List Shopify orders that are unfulfilled and could be auto-purchased on 1688
    """
    db = get_db()
    
    # Get orders already in pipeline
    pipeline_customer_ids = await db.fulfillment_pipeline.distinct("customer_id")
    pipeline_shopify_ids = await db.fulfillment_pipeline.distinct("shopify_order_id")
    
    # Find unfulfilled Shopify orders not in pipeline
    query = {
        "customer_id": {"$nin": pipeline_customer_ids + pipeline_shopify_ids},
        "fulfillment_status": {"$in": ["unfulfilled", None]},
        "payment_status": {"$in": ["paid", None]},  # Only paid orders
    }
    
    if store_name:
        query["store_name"] = store_name
    
    pending_orders = await db.customers.find(
        query,
        {"_id": 0, "customer_id": 1, "order_number": 1, "first_name": 1, "last_name": 1, 
         "total_spent": 1, "store_name": 1, "line_items": 1, "created_at": 1}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return {
        "success": True,
        "total": len(pending_orders),
        "orders": pending_orders,
    }


@router.post("/auto-purchase/{customer_id}")
async def auto_purchase_order(customer_id: str, background_tasks: BackgroundTasks):
    """
    Automatically purchase items from 1688 for a Shopify order
    """
    db = get_db()
    
    # Get Shopify order
    shopify_order = await db.customers.find_one(
        {"customer_id": customer_id},
        {"_id": 0}
    )
    
    if not shopify_order:
        raise HTTPException(status_code=404, detail="Shopify order not found")
    
    # Match products
    line_items = shopify_order.get("line_items", [])
    matched, unmatched = await match_products_to_catalog(line_items)
    
    if not matched:
        return {
            "success": False,
            "message": "No matching 1688 products found in catalog",
            "unmatched_items": [{"name": u.get("name"), "sku": u.get("sku")} for u in unmatched],
            "suggestion": "Sync products from your 1688 orders first using /api/1688/sync-products-from-orders",
        }
    
    # Create fulfillment record
    shopify_order_id = shopify_order.get("shopify_order_id") or customer_id
    fulfillment = {
        "shopify_order_id": shopify_order_id,
        "customer_id": customer_id,
        "order_number": shopify_order.get("order_number"),
        "store_name": shopify_order.get("store_name"),
        "status": "processing",
        "stages": {
            "shopify_received": True,
            "products_matched": True,
            "alibaba_purchased": False,
            "alibaba_shipped": False,
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
            "country": shopify_order.get("country") or shopify_order.get("country_code"),
            "zip": shopify_order.get("zip"),
        },
        "line_items": line_items,
        "matched_products": matched,
        "unmatched_products": [{"name": u.get("name"), "sku": u.get("sku")} for u in unmatched],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.fulfillment_pipeline.update_one(
        {"shopify_order_id": shopify_order_id},
        {"$set": fulfillment},
        upsert=True
    )
    
    # Queue background task to create 1688 order
    background_tasks.add_task(auto_create_1688_order, shopify_order_id, matched, fulfillment)
    
    return {
        "success": True,
        "message": f"Auto-purchase queued for {len(matched)} matched products",
        "matched_products": len(matched),
        "unmatched_products": len(unmatched),
        "matched_details": [{
            "name": m["shopify_item"].get("name"),
            "quantity": m["quantity"],
            "1688_product_id": m["product_id"],
        } for m in matched],
    }


@router.get("/stats")
async def get_fulfillment_stats():
    """
    Get fulfillment pipeline statistics
    """
    db = get_db()
    
    total = await db.fulfillment_pipeline.count_documents({})
    
    stats = {
        "total_orders": total,
        "by_status": {},
        "by_store": {},
    }
    
    # Count by status
    for status in ["pending", "processing", "purchased", "shipped_from_supplier", "sent_to_dwz56", "fulfilled", "error"]:
        stats["by_status"][status] = await db.fulfillment_pipeline.count_documents({"status": status})
    
    # Count by store
    stores = await db.fulfillment_pipeline.distinct("store_name")
    for store in stores:
        if store:
            stats["by_store"][store] = await db.fulfillment_pipeline.count_documents({"store_name": store})
    
    # Recent activity
    recent = await db.fulfillment_pipeline.find(
        {},
        {"_id": 0, "order_number": 1, "status": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(5).to_list(5)
    
    stats["recent_activity"] = recent
    
    return {
        "success": True,
        "stats": stats,
    }
