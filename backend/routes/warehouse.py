"""
Warehouse Scanning & Receiving API
Handles fulfillment scanning, receiving, and shipping updates for DWZ56 warehouse
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Will be injected from server.py
db = None

def set_database(database):
    """Set database from server.py"""
    global db
    db = database

router = APIRouter(prefix="/api/warehouse", tags=["Warehouse"])


# ============ Models ============

class ReceiveShipmentRequest(BaseModel):
    fulfillment_number: str
    received_by: Optional[str] = None
    notes: Optional[str] = None
    condition: str = "good"  # good, damaged, partial

class ShipToCustomerRequest(BaseModel):
    fulfillment_number: str
    tracking_number: str
    carrier: str = "DWZ56"
    shipped_by: Optional[str] = None
    notes: Optional[str] = None

class WarehouseAuthRequest(BaseModel):
    pin: str


# ============ Helper Functions ============

async def find_order_by_fulfillment(fulfillment_number: str):
    """Find order by fulfillment number, 1688 order ID, or tracking number"""
    # Try multiple fields to find the order
    order = await db.customers.find_one({
        "$or": [
            {"fulfillment_number": fulfillment_number},
            {"alibaba_order_id": fulfillment_number},
            {"tracking_number": fulfillment_number},
            {"dwz56_tracking": fulfillment_number},
            {"order_number": fulfillment_number},
            {"shopify_order_id": fulfillment_number}
        ]
    }, {"_id": 0})
    
    if not order:
        # Also check purchase orders
        purchase_order = await db.purchase_orders_1688.find_one({
            "$or": [
                {"order_id": fulfillment_number},
                {"alibaba_order_id": fulfillment_number},
                {"tracking_number": fulfillment_number}
            ]
        }, {"_id": 0})
        
        if purchase_order:
            # Get linked Shopify order
            shopify_order_id = purchase_order.get("shopify_order_id")
            if shopify_order_id:
                order = await db.customers.find_one(
                    {"shopify_order_id": str(shopify_order_id)},
                    {"_id": 0}
                )
                if order:
                    order["purchase_order"] = purchase_order
    
    return order


async def get_product_details(order):
    """Extract product details from order including images"""
    products = []
    line_items = order.get("line_items", [])
    
    for item in line_items:
        product = {
            "title": item.get("title", item.get("name", "Unknown Product")),
            "sku": item.get("sku", "N/A"),
            "variant_title": item.get("variant_title", ""),
            "quantity": item.get("quantity", 1),
            "price": item.get("price", 0),
            "image": None
        }
        
        # Try to get image from various sources
        if item.get("image"):
            product["image"] = item["image"]
        elif item.get("product_image"):
            product["image"] = item["product_image"]
        
        # Try to get from Shopify products collection
        if not product["image"] and item.get("product_id"):
            shopify_product = await db.shopify_products.find_one(
                {"product_id": str(item["product_id"])},
                {"_id": 0, "image": 1, "images": 1}
            )
            if shopify_product:
                if shopify_product.get("image"):
                    product["image"] = shopify_product["image"]
                elif shopify_product.get("images") and len(shopify_product["images"]) > 0:
                    product["image"] = shopify_product["images"][0].get("src")
        
        # Try linked 1688 product
        if not product["image"] and item.get("sku"):
            linked_product = await db.products_1688.find_one(
                {"sku": item["sku"]},
                {"_id": 0, "image": 1, "images": 1}
            )
            if linked_product:
                product["image"] = linked_product.get("image") or (linked_product.get("images", [{}])[0] if linked_product.get("images") else None)
        
        # Extract color/size from variant title
        variant = item.get("variant_title", "")
        if variant:
            parts = variant.split(" / ")
            if len(parts) >= 1:
                product["color"] = parts[0]
            if len(parts) >= 2:
                product["size"] = parts[1]
        
        products.append(product)
    
    return products


# ============ API Endpoints ============

@router.get("/scan/{fulfillment_number}")
async def scan_shipment(fulfillment_number: str):
    """
    Scan a shipment by fulfillment number and return all details
    Used by warehouse staff when receiving packages
    """
    try:
        order = await find_order_by_fulfillment(fulfillment_number)
        
        if not order:
            raise HTTPException(status_code=404, detail="Shipment not found. Please check the number and try again.")
        
        # Get product details with images
        products = await get_product_details(order)
        
        # Build customer details
        customer = {
            "name": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip() or order.get('customer_name', 'N/A'),
            "phone": order.get("phone", "N/A"),
            "email": order.get("email", ""),
            "address": order.get("address", ""),
            "city": order.get("city", ""),
            "province": order.get("province", ""),
            "zip": order.get("zip", ""),
            "country": order.get("country", ""),
        }
        
        # Build full address string
        address_parts = [customer["address"], customer["city"], customer["province"], customer["zip"], customer["country"]]
        customer["full_address"] = ", ".join([p for p in address_parts if p])
        
        # Get warehouse status
        warehouse_status = order.get("warehouse_status", "pending")
        warehouse_history = order.get("warehouse_history", [])
        
        # Get 1688/purchase order details
        purchase_order = order.get("purchase_order", {})
        alibaba_order_id = purchase_order.get("alibaba_order_id") or order.get("alibaba_order_id")
        
        return {
            "success": True,
            "shipment": {
                "fulfillment_number": fulfillment_number,
                "order_number": order.get("order_number", "N/A"),
                "shopify_order_id": order.get("shopify_order_id"),
                "alibaba_order_id": alibaba_order_id,
                "store_name": order.get("store_name", "N/A"),
                "created_at": order.get("created_at"),
                "total_price": order.get("total_price", 0),
                "fulfillment_status": order.get("fulfillment_status", "unfulfilled"),
                "warehouse_status": warehouse_status,
                "warehouse_history": warehouse_history,
                "special_instructions": order.get("note") or order.get("special_instructions", ""),
            },
            "customer": customer,
            "products": products,
            "tracking": {
                "dwz56_tracking": order.get("dwz56_tracking"),
                "carrier": order.get("carrier", "DWZ56"),
                "tracking_number": order.get("tracking_number")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scanning shipment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/receive")
async def receive_shipment(request: ReceiveShipmentRequest):
    """
    Mark a shipment as received at warehouse
    """
    try:
        order = await find_order_by_fulfillment(request.fulfillment_number)
        
        if not order:
            raise HTTPException(status_code=404, detail="Shipment not found")
        
        # Create history entry
        history_entry = {
            "status": "received",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "received_by": request.received_by,
            "condition": request.condition,
            "notes": request.notes
        }
        
        # Update order
        update_data = {
            "warehouse_status": "received",
            "warehouse_received_at": datetime.now(timezone.utc).isoformat(),
            "warehouse_received_by": request.received_by,
            "warehouse_condition": request.condition
        }
        
        await db.customers.update_one(
            {"shopify_order_id": order.get("shopify_order_id")},
            {
                "$set": update_data,
                "$push": {"warehouse_history": history_entry}
            }
        )
        
        return {
            "success": True,
            "message": "Shipment marked as received",
            "status": "received",
            "received_at": update_data["warehouse_received_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error receiving shipment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ship")
async def ship_to_customer(request: ShipToCustomerRequest):
    """
    Mark shipment as shipped to customer with tracking number
    """
    try:
        order = await find_order_by_fulfillment(request.fulfillment_number)
        
        if not order:
            raise HTTPException(status_code=404, detail="Shipment not found")
        
        # Create history entry
        history_entry = {
            "status": "shipped",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "shipped_by": request.shipped_by,
            "tracking_number": request.tracking_number,
            "carrier": request.carrier,
            "notes": request.notes
        }
        
        # Update order
        update_data = {
            "warehouse_status": "shipped",
            "warehouse_shipped_at": datetime.now(timezone.utc).isoformat(),
            "warehouse_shipped_by": request.shipped_by,
            "tracking_number": request.tracking_number,
            "carrier": request.carrier,
            "fulfillment_status": "fulfilled"
        }
        
        await db.customers.update_one(
            {"shopify_order_id": order.get("shopify_order_id")},
            {
                "$set": update_data,
                "$push": {"warehouse_history": history_entry}
            }
        )
        
        return {
            "success": True,
            "message": "Shipment marked as shipped to customer",
            "status": "shipped",
            "tracking_number": request.tracking_number,
            "shipped_at": update_data["warehouse_shipped_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error shipping: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/label/{fulfillment_number}")
async def get_shipping_label(fulfillment_number: str):
    """
    Get shipping label data for printing
    """
    try:
        order = await find_order_by_fulfillment(fulfillment_number)
        
        if not order:
            raise HTTPException(status_code=404, detail="Shipment not found")
        
        # Build label data
        label_data = {
            "order_number": order.get("order_number", "N/A"),
            "fulfillment_number": fulfillment_number,
            "from": {
                "name": "DWZ56 Warehouse",
                "address": "Warehouse Address",
                "city": "Shenzhen",
                "country": "China"
            },
            "to": {
                "name": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                "phone": order.get("phone", ""),
                "address": order.get("address", ""),
                "city": order.get("city", ""),
                "province": order.get("province", ""),
                "zip": order.get("zip", ""),
                "country": order.get("country", "")
            },
            "items_count": len(order.get("line_items", [])),
            "total_quantity": sum(item.get("quantity", 1) for item in order.get("line_items", [])),
            "tracking_number": order.get("tracking_number", ""),
            "carrier": order.get("carrier", "DWZ56"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        return {"success": True, "label": label_data}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting label: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending")
async def get_pending_shipments(
    store_name: Optional[str] = None,
    status: str = "pending",
    limit: int = 50
):
    """
    Get list of pending shipments at warehouse
    """
    try:
        query = {"warehouse_status": {"$in": ["pending", "received"] if status == "all" else [status]}}
        if store_name:
            query["store_name"] = store_name
        
        shipments = await db.customers.find(
            query,
            {
                "_id": 0,
                "order_number": 1,
                "shopify_order_id": 1,
                "fulfillment_number": 1,
                "alibaba_order_id": 1,
                "first_name": 1,
                "last_name": 1,
                "city": 1,
                "country": 1,
                "warehouse_status": 1,
                "warehouse_received_at": 1,
                "created_at": 1,
                "line_items": 1
            }
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {"shipments": shipments, "total": len(shipments)}
        
    except Exception as e:
        logger.error(f"Error getting pending shipments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Simple PIN authentication for warehouse access
WAREHOUSE_PIN = "1688"  # Default PIN - should be configurable

@router.post("/auth")
async def warehouse_auth(request: WarehouseAuthRequest):
    """Simple PIN authentication for warehouse staff"""
    if request.pin == WAREHOUSE_PIN:
        return {"success": True, "message": "Authenticated"}
    raise HTTPException(status_code=401, detail="Invalid PIN")
