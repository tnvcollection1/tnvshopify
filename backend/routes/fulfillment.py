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
    purchase_status: Optional[str] = Query(None, description="Filter by 1688 purchase status: 'purchased', 'not_purchased', 'all'"),
    dwz_status: Optional[str] = Query(None, description="Filter by DWZ status: 'created', 'not_created', 'all'"),
    search: Optional[str] = Query(None, description="Search by order number"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    List all orders in the fulfillment pipeline with filters for 1688 purchase and DWZ status
    """
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    if store_name:
        query["store_name"] = store_name
    
    # Filter by 1688 purchase status
    if purchase_status == "purchased":
        query["alibaba_order_id"] = {"$exists": True, "$ne": None, "$ne": ""}
    elif purchase_status == "not_purchased":
        query["$or"] = [
            {"alibaba_order_id": {"$exists": False}},
            {"alibaba_order_id": None},
            {"alibaba_order_id": ""}
        ]
    
    # Filter by DWZ status
    if dwz_status == "created":
        if "$or" in query:
            existing_or = query.pop("$or")
            query["$and"] = [
                {"$or": existing_or},
                {"dwz_waybill": {"$exists": True, "$ne": None, "$ne": ""}}
            ]
        else:
            query["dwz_waybill"] = {"$exists": True, "$ne": None, "$ne": ""}
    elif dwz_status == "not_created":
        dwz_or = [
            {"dwz_waybill": {"$exists": False}},
            {"dwz_waybill": None},
            {"dwz_waybill": ""}
        ]
        if "$or" in query:
            existing_or = query.pop("$or")
            query["$and"] = [
                {"$or": existing_or},
                {"$or": dwz_or}
            ]
        elif "$and" in query:
            query["$and"].append({"$or": dwz_or})
        else:
            query["$or"] = dwz_or
    
    # Search by order number
    if search:
        search_or = [
            {"order_number": {"$regex": search, "$options": "i"}},
            {"shopify_order_id": {"$regex": search, "$options": "i"}},
        ]
        if "$and" in query:
            query["$and"].append({"$or": search_or})
        elif "$or" in query:
            existing_or = query.pop("$or")
            query["$and"] = [
                {"$or": existing_or},
                {"$or": search_or}
            ]
        else:
            query["$or"] = search_or
    
    skip = (page - 1) * page_size
    
    orders = await db.fulfillment_pipeline.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    total = await db.fulfillment_pipeline.count_documents(query)
    
    # Get status counts
    status_counts = {}
    for s in ["pending", "purchased", "shipped_from_supplier", "sent_to_dwz56", "fulfilled", "error"]:
        count_query = {"store_name": store_name} if store_name else {}
        count_query["status"] = s
        status_counts[s] = await db.fulfillment_pipeline.count_documents(count_query)
    
    # Calculate purchase and DWZ stats
    base_query = {"store_name": store_name} if store_name else {}
    
    purchased_query = {**base_query, "alibaba_order_id": {"$exists": True, "$ne": None, "$ne": ""}}
    purchased_count = await db.fulfillment_pipeline.count_documents(purchased_query)
    
    not_purchased_query = {**base_query, "$or": [
        {"alibaba_order_id": {"$exists": False}},
        {"alibaba_order_id": None},
        {"alibaba_order_id": ""}
    ]}
    not_purchased_count = await db.fulfillment_pipeline.count_documents(not_purchased_query)
    
    dwz_created_query = {**base_query, "dwz_waybill": {"$exists": True, "$ne": None, "$ne": ""}}
    dwz_created_count = await db.fulfillment_pipeline.count_documents(dwz_created_query)
    
    dwz_not_created_query = {**base_query, "$or": [
        {"dwz_waybill": {"$exists": False}},
        {"dwz_waybill": None},
        {"dwz_waybill": ""}
    ]}
    dwz_not_created_count = await db.fulfillment_pipeline.count_documents(dwz_not_created_query)
    
    # Enrich orders with 1688 purchase data
    for order in orders:
        alibaba_id = order.get("alibaba_order_id")
        if alibaba_id:
            po = await db.purchase_orders_1688.find_one(
                {"alibaba_order_id": alibaba_id},
                {"_id": 0, "color": 1, "size": 1, "product_name": 1}
            )
            if po:
                order["purchase_1688"] = {
                    "color": po.get("color"),
                    "size": po.get("size"),
                    "product_name": po.get("product_name"),
                }
    
    return {
        "success": True,
        "page": page,
        "page_size": page_size,
        "total": total,
        "status_counts": status_counts,
        "purchase_stats": {
            "purchased": purchased_count,
            "not_purchased": not_purchased_count,
        },
        "dwz_stats": {
            "created": dwz_created_count,
            "not_created": dwz_not_created_count,
        },
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



class OrderFulfillmentData(BaseModel):
    shopify_order_id: str = Field(..., description="Shopify order ID or number")
    store_name: Optional[str] = Field(None, description="Store name")
    order_1688_id: Optional[str] = Field(None, description="1688 order ID")
    fulfillment_1688_id: Optional[str] = Field(None, description="1688 fulfillment/tracking ID")
    dwz_fulfillment_id: Optional[str] = Field(None, description="DWZ fulfillment/tracking ID")
    line_items: Optional[List[dict]] = Field(None, description="Line items with 1688 links")


@router.get("/order/{order_id}")
async def get_order_fulfillment(order_id: str):
    """
    Get fulfillment data for a specific order
    """
    db = get_db()
    
    # Try to find by order_number or shopify_order_id
    fulfillment = await db.order_fulfillment.find_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"_id": 0}
    )
    
    if fulfillment:
        return {
            "success": True,
            "fulfillment": fulfillment,
        }
    
    return {
        "success": False,
        "message": "No fulfillment data found",
        "fulfillment": None,
    }


@router.put("/order/{order_id}")
async def save_order_fulfillment(order_id: str, data: OrderFulfillmentData):
    """
    Save or update fulfillment data for an order
    """
    db = get_db()
    
    # Prepare the document
    doc = {
        "shopify_order_id": data.shopify_order_id,
        "order_number": order_id,
        "store_name": data.store_name,
        "order_1688_id": data.order_1688_id,
        "fulfillment_1688_id": data.fulfillment_1688_id,
        "dwz_fulfillment_id": data.dwz_fulfillment_id,
        "line_items": data.line_items or [],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Upsert the fulfillment data
    result = await db.order_fulfillment.update_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {
            "$set": doc,
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Fulfillment data saved",
        "upserted": result.upserted_id is not None,
        "modified": result.modified_count > 0,
    }


@router.get("/orders-with-tracking")
async def get_orders_with_tracking(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    store_name: Optional[str] = None,
):
    """
    Get orders that have fulfillment tracking data
    """
    db = get_db()
    
    query = {}
    if store_name:
        query["store_name"] = store_name
    
    skip = (page - 1) * limit
    
    orders = await db.order_fulfillment.find(
        query,
        {"_id": 0}
    ).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.order_fulfillment.count_documents(query)
    
    return {
        "success": True,
        "orders": orders,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }



@router.post("/sync-to-shopify/{order_id}")
async def sync_fulfillment_to_shopify(order_id: str):
    """
    Sync 1688 fulfillment info to Shopify order (adds note and tag)
    """
    from shopify_sync import ShopifyOrderSync
    
    db = get_db()
    
    # Get fulfillment data
    fulfillment = await db.order_fulfillment.find_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"_id": 0}
    )
    
    if not fulfillment:
        raise HTTPException(status_code=404, detail="No fulfillment data found for this order")
    
    # Get store credentials
    store_name = fulfillment.get("store_name")
    if not store_name:
        raise HTTPException(status_code=400, detail="Store name not set in fulfillment data")
    
    store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
    if not store or not store.get("shopify_domain") or not store.get("shopify_token"):
        raise HTTPException(status_code=400, detail=f"Shopify not configured for store: {store_name}")
    
    # Find the Shopify order ID
    customer = await db.customers.find_one(
        {"$or": [
            {"order_number": int(order_id), "store_name": store_name},
            {"order_number": str(order_id), "store_name": store_name},
        ]},
        {"_id": 0, "order_id": 1, "shopify_order_id": 1}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail=f"Shopify order #{order_id} not found in store {store_name}")
    
    shopify_order_id = customer.get("shopify_order_id") or customer.get("order_id")
    if not shopify_order_id:
        raise HTTPException(status_code=400, detail="Shopify order ID not found")
    
    # Build the note
    note_parts = []
    if fulfillment.get("order_1688_id"):
        note_parts.append(f"1688 Order: {fulfillment['order_1688_id']}")
    if fulfillment.get("fulfillment_1688_id"):
        note_parts.append(f"1688 Fulfillment: {fulfillment['fulfillment_1688_id']}")
    if fulfillment.get("dwz_fulfillment_id"):
        note_parts.append(f"DWZ Tracking: {fulfillment['dwz_fulfillment_id']}")
    
    if not note_parts:
        return {
            "success": False,
            "message": "No fulfillment info to sync"
        }
    
    note = " | ".join(note_parts)
    
    # Connect to Shopify and update
    sync = ShopifyOrderSync(store["shopify_domain"], store["shopify_token"])
    
    try:
        # Update note
        note_updated = sync.update_order_note(int(shopify_order_id), note)
        
        # Add tag
        tag_updated = sync.add_order_tag(int(shopify_order_id), "1688-ordered")
        
        sync.disconnect()
        
        return {
            "success": True,
            "message": "Fulfillment info synced to Shopify",
            "shopify_order_id": shopify_order_id,
            "note_added": note,
            "tag_added": "1688-ordered" if tag_updated else None,
        }
        
    except Exception as e:
        sync.disconnect()
        raise HTTPException(status_code=500, detail=f"Failed to sync to Shopify: {str(e)}")


# ==================== Auto-Sync 1688 Fulfillment Status ====================

class FulfillmentSyncOptions(BaseModel):
    """Options for fulfillment sync"""
    fulfillment_method: str = Field("dwz", description="dwz or warehouse")
    tracking_number: Optional[str] = Field(None, description="Tracking number to sync")
    carrier: Optional[str] = Field("DWZ56", description="Carrier name for Shopify")
    notify_customer: bool = Field(True, description="Send notification to customer")


@router.post("/auto-sync-to-shopify/{order_id}")
async def auto_sync_1688_fulfillment_to_shopify(
    order_id: str,
    options: FulfillmentSyncOptions = Body(...)
):
    """
    Auto-sync 1688 fulfillment status to Shopify.
    This marks the Shopify order as fulfilled with tracking info.
    
    fulfillment_method:
    - "dwz": Fulfill via DWZ56 shipping (gets tracking from DWZ56)
    - "warehouse": Fulfill after arrival at your warehouse (manual tracking)
    """
    from shopify_sync import ShopifyOrderSync
    
    db = get_db()
    
    # Get fulfillment data from multiple sources
    fulfillment = await db.order_fulfillment.find_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"_id": 0}
    )
    
    # Also check fulfillment_pipeline
    pipeline_order = await db.fulfillment_pipeline.find_one(
        {"shopify_order_id": order_id},
        {"_id": 0}
    )
    
    # Get customer/order info
    customer = await db.customers.find_one(
        {"$or": [
            {"order_number": int(order_id) if order_id.isdigit() else order_id},
            {"shopify_order_id": order_id},
            {"customer_id": order_id},
        ]},
        {"_id": 0}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail=f"Order #{order_id} not found")
    
    store_name = customer.get("store_name") or (fulfillment or {}).get("store_name")
    shopify_order_id = customer.get("shopify_order_id") or customer.get("order_id")
    
    if not store_name:
        raise HTTPException(status_code=400, detail="Store name not found for this order")
    
    # Get store credentials
    store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
    if not store or not store.get("shopify_domain") or not store.get("shopify_token"):
        raise HTTPException(status_code=400, detail=f"Shopify not configured for store: {store_name}")
    
    # Determine tracking number based on fulfillment method
    tracking_number = options.tracking_number
    tracking_source = "manual"
    
    if options.fulfillment_method == "dwz":
        # Try to get DWZ tracking
        if pipeline_order and pipeline_order.get("dwz56_tracking"):
            tracking_number = tracking_number or pipeline_order["dwz56_tracking"]
            tracking_source = "dwz56_pipeline"
        elif fulfillment and fulfillment.get("dwz_fulfillment_id"):
            tracking_number = tracking_number or fulfillment["dwz_fulfillment_id"]
            tracking_source = "dwz_fulfillment"
        
        # Try to fetch from DWZ56 API if not found
        if not tracking_number:
            try:
                from routes.dwz56 import get_recent_shipments_internal
                # Search DWZ56 for this order's shipments
                dwz_shipments = await get_recent_shipments_internal(order_number=str(order_id))
                if dwz_shipments:
                    tracking_number = dwz_shipments[0].get("cNo") or dwz_shipments[0].get("cNum")
                    tracking_source = "dwz56_api"
            except Exception as e:
                logger.warning(f"Could not fetch DWZ56 tracking for order {order_id}: {e}")
    
    elif options.fulfillment_method == "warehouse":
        # For warehouse fulfillment, use 1688 tracking or provided tracking
        if pipeline_order and pipeline_order.get("alibaba_tracking"):
            tracking_number = tracking_number or pipeline_order["alibaba_tracking"]
            tracking_source = "1688_tracking"
        elif fulfillment and fulfillment.get("fulfillment_1688_id"):
            tracking_number = tracking_number or fulfillment["fulfillment_1688_id"]
            tracking_source = "1688_fulfillment"
    
    # Connect to Shopify
    sync = ShopifyOrderSync(store["shopify_domain"], store["shopify_token"])
    
    try:
        result = {
            "success": True,
            "order_id": order_id,
            "shopify_order_id": shopify_order_id,
            "fulfillment_method": options.fulfillment_method,
            "tracking_number": tracking_number,
            "tracking_source": tracking_source,
            "actions": [],
        }
        
        # Create fulfillment on Shopify
        if tracking_number:
            try:
                # Use Shopify REST API to create fulfillment
                fulfillment_created = sync.create_fulfillment(
                    int(shopify_order_id),
                    tracking_number=tracking_number,
                    tracking_company=options.carrier,
                    notify_customer=options.notify_customer
                )
                result["actions"].append(f"Created Shopify fulfillment with tracking: {tracking_number}")
                result["shopify_fulfillment_created"] = fulfillment_created
            except Exception as e:
                # Try alternative method - just add note and tag
                logger.warning(f"Could not create Shopify fulfillment: {e}")
                result["actions"].append(f"Warning: Could not create fulfillment - {str(e)}")
        
        # Add note with fulfillment details
        note_parts = [f"Fulfilled via {options.fulfillment_method.upper()}"]
        if tracking_number:
            note_parts.append(f"Tracking: {tracking_number}")
        if pipeline_order and pipeline_order.get("alibaba_order_id"):
            note_parts.append(f"1688 Order: {pipeline_order['alibaba_order_id']}")
        
        note = " | ".join(note_parts)
        note_updated = sync.update_order_note(int(shopify_order_id), note)
        if note_updated:
            result["actions"].append(f"Added order note: {note}")
        
        # Add fulfillment tag
        tag = f"{options.fulfillment_method}-fulfilled"
        tag_updated = sync.add_order_tag(int(shopify_order_id), tag)
        if tag_updated:
            result["actions"].append(f"Added tag: {tag}")
        
        sync.disconnect()
        
        # Update local fulfillment records
        await db.order_fulfillment.update_one(
            {"shopify_order_id": str(shopify_order_id)},
            {"$set": {
                "synced_to_shopify": True,
                "synced_at": datetime.now(timezone.utc).isoformat(),
                "fulfillment_method": options.fulfillment_method,
                "tracking_number": tracking_number,
                "carrier": options.carrier,
            }},
            upsert=True
        )
        
        # Update pipeline status
        await db.fulfillment_pipeline.update_one(
            {"shopify_order_id": order_id},
            {"$set": {
                "status": "fulfilled",
                "stages.shopify_synced": True,
                "fulfilled_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        # Update customer record
        await db.customers.update_one(
            {"$or": [
                {"shopify_order_id": str(shopify_order_id)},
                {"order_number": int(order_id) if order_id.isdigit() else order_id},
            ]},
            {"$set": {
                "fulfillment_status": "fulfilled",
                "fulfillment_tracking": tracking_number,
                "fulfillment_method": options.fulfillment_method,
                "fulfilled_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        return result
        
    except Exception as e:
        try:
            sync.disconnect()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to sync fulfillment: {str(e)}")


@router.post("/fulfill-via-dwz/{order_id}")
async def fulfill_order_via_dwz(
    order_id: str,
    notify_customer: bool = Body(True, embed=True)
):
    """
    Fulfill an order via DWZ56 shipping.
    Fetches tracking from DWZ56 and syncs to Shopify.
    """
    return await auto_sync_1688_fulfillment_to_shopify(
        order_id,
        FulfillmentSyncOptions(
            fulfillment_method="dwz",
            carrier="DWZ56",
            notify_customer=notify_customer
        )
    )


@router.post("/fulfill-via-warehouse/{order_id}")
async def fulfill_order_via_warehouse(
    order_id: str,
    tracking_number: str = Body(None, embed=True),
    carrier: str = Body("Local Courier", embed=True),
    notify_customer: bool = Body(True, embed=True)
):
    """
    Fulfill an order after arrival at warehouse.
    Use this when product has arrived at your warehouse and you're shipping locally.
    """
    return await auto_sync_1688_fulfillment_to_shopify(
        order_id,
        FulfillmentSyncOptions(
            fulfillment_method="warehouse",
            tracking_number=tracking_number,
            carrier=carrier,
            notify_customer=notify_customer
        )
    )


@router.get("/pending-sync")
async def get_orders_pending_shopify_sync(
    store_name: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Get orders that have 1688 fulfillment but haven't been synced to Shopify yet.
    These are ready to be fulfilled via DWZ or warehouse.
    """
    db = get_db()
    
    # Find orders in pipeline that are shipped from supplier but not yet fulfilled
    query = {
        "status": {"$in": ["shipped_from_supplier", "sent_to_dwz56"]},
        "$or": [
            {"stages.shopify_synced": {"$ne": True}},
            {"stages.shopify_synced": {"$exists": False}},
        ]
    }
    
    if store_name:
        query["store_name"] = store_name
    
    skip = (page - 1) * page_size
    
    orders = await db.fulfillment_pipeline.find(
        query,
        {"_id": 0}
    ).sort("updated_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    total = await db.fulfillment_pipeline.count_documents(query)
    
    # Enrich with DWZ tracking info
    for order in orders:
        # Check if we have DWZ tracking
        dwz_tracking = order.get("dwz56_tracking") or order.get("dwz_tracking")
        alibaba_tracking = order.get("alibaba_tracking")
        
        order["ready_for_dwz_fulfillment"] = bool(dwz_tracking)
        order["ready_for_warehouse_fulfillment"] = bool(alibaba_tracking) or order.get("status") == "shipped_from_supplier"
        order["suggested_method"] = "dwz" if dwz_tracking else "warehouse"
    
    return {
        "success": True,
        "orders": orders,
        "total": total,
        "page": page,
        "page_size": page_size,
        "message": f"Found {total} orders pending Shopify sync",
    }


@router.post("/bulk-sync-to-shopify")
async def bulk_sync_fulfillments_to_shopify(
    order_ids: List[str] = Body(..., description="List of order IDs to sync"),
    fulfillment_method: str = Body("dwz", description="dwz or warehouse"),
    background_tasks: BackgroundTasks = None,
):
    """
    Bulk sync multiple orders' fulfillment status to Shopify.
    Runs in background for large batches.
    """
    if len(order_ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 orders per batch")
    
    results = {
        "success": True,
        "total": len(order_ids),
        "synced": 0,
        "failed": 0,
        "errors": [],
        "synced_orders": [],
    }
    
    for order_id in order_ids:
        try:
            sync_result = await auto_sync_1688_fulfillment_to_shopify(
                order_id,
                FulfillmentSyncOptions(
                    fulfillment_method=fulfillment_method,
                    notify_customer=True
                )
            )
            if sync_result.get("success"):
                results["synced"] += 1
                results["synced_orders"].append(order_id)
            else:
                results["failed"] += 1
                results["errors"].append({"order_id": order_id, "error": "Sync returned failure"})
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({"order_id": order_id, "error": str(e)})
    
    return results


@router.get("/sync-status-summary")
async def get_fulfillment_sync_status_summary(
    store_name: Optional[str] = Query(None),
):
    """
    Get summary of fulfillment sync statuses.
    Shows how many orders are at each stage.
    """
    db = get_db()
    
    match_stage = {}
    if store_name:
        match_stage["store_name"] = store_name
    
    # Pipeline aggregation for status summary
    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "with_1688_tracking": {"$sum": {"$cond": [{"$ne": ["$alibaba_tracking", None]}, 1, 0]}},
            "with_dwz_tracking": {"$sum": {"$cond": [{"$ne": ["$dwz56_tracking", None]}, 1, 0]}},
            "synced_to_shopify": {"$sum": {"$cond": [{"$eq": ["$stages.shopify_synced", True]}, 1, 0]}},
        }},
        {"$sort": {"_id": 1}},
    ]
    
    results = await db.fulfillment_pipeline.aggregate(pipeline).to_list(100)
    
    # Build summary
    summary = {
        "total_orders": 0,
        "by_status": {},
        "ready_for_sync": {
            "dwz": 0,
            "warehouse": 0,
            "total": 0,
        },
        "already_synced": 0,
    }
    
    for r in results:
        status = r["_id"] or "unknown"
        count = r["count"]
        summary["total_orders"] += count
        summary["by_status"][status] = {
            "count": count,
            "with_1688_tracking": r["with_1688_tracking"],
            "with_dwz_tracking": r["with_dwz_tracking"],
            "synced_to_shopify": r["synced_to_shopify"],
        }
        summary["already_synced"] += r["synced_to_shopify"]
        
        # Count orders ready for sync
        if status in ["shipped_from_supplier", "sent_to_dwz56"]:
            summary["ready_for_sync"]["dwz"] += r["with_dwz_tracking"]
            summary["ready_for_sync"]["warehouse"] += r["with_1688_tracking"]
            summary["ready_for_sync"]["total"] += count - r["synced_to_shopify"]
    
    return {
        "success": True,
        "summary": summary,
    }


