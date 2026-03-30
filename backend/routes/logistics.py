"""
Shri Maruti Logistics (Innofulfill) Routes
Rate calculator, order booking, tracking, and Shopify auto-push.
"""

import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from pymongo import MongoClient

from services.innofulfill_service import (
    calculate_rate, push_order, cancel_order,
    get_tracking_status, get_tracking_history, get_token,
)

router = APIRouter(prefix="/api/logistics", tags=["Logistics - Shri Maruti"])

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]


# ─── Request Models ──────────────────────────────────────────────

class RateRequest(BaseModel):
    from_pincode: str
    to_pincode: str
    weight: float = Field(description="Weight in grams")
    length: float = 30
    width: float = 20
    height: float = 10
    delivery_type: str = "SURFACE"


class AddressModel(BaseModel):
    name: str
    phone: str
    address1: str
    address2: Optional[str] = ""
    city: str
    state: str
    country: str = "India"
    zip: str
    email: Optional[str] = ""


class LineItemModel(BaseModel):
    name: str
    weight: float
    quantity: int
    unitPrice: float
    price: float
    sku: Optional[str] = ""


class BookingRequest(BaseModel):
    orderId: str
    shippingAddress: AddressModel
    pickupAddress: AddressModel
    amount: float
    weight: float
    length: float = 30
    width: float = 20
    height: float = 10
    currency: str = "INR"
    gstPercentage: int = 0
    paymentType: str = "ONLINE"
    paymentStatus: str = "PAID"
    deliveryPromise: str = "SURFACE"
    lineItems: list[LineItemModel]
    remarks: Optional[str] = ""
    returnableOrder: bool = True


class CancelRequest(BaseModel):
    order_ids: list[str]
    reason: str = "Cancelled by seller"


class ShopifyPushRequest(BaseModel):
    shopify_order_id: str
    delivery_type: str = "SURFACE"
    pickup_name: str = "TNVC Collection"
    pickup_phone: str = "9582639469"
    pickup_address: str = "TNVC Warehouse"
    pickup_city: str = "Delhi"
    pickup_state: str = "Delhi"
    pickup_zip: str = "110001"


# ─── Rate Calculator ─────────────────────────────────────────────

@router.post("/calculate-rate")
async def api_calculate_rate(req: RateRequest):
    """Calculate shipping rate between two pincodes."""
    result = await calculate_rate(
        from_pincode=req.from_pincode,
        to_pincode=req.to_pincode,
        weight=req.weight,
        length=req.length,
        width=req.width,
        height=req.height,
        delivery_type=req.delivery_type,
    )
    if result.get("status") != 200:
        raise HTTPException(status_code=400, detail=result.get("message", "Rate calculation failed"))
    return {
        "status": "success",
        "rate": result["data"],
    }


@router.post("/calculate-rate/compare")
async def api_compare_rates(req: RateRequest):
    """Compare SURFACE vs AIR rates for the same route."""
    surface = await calculate_rate(
        req.from_pincode, req.to_pincode, req.weight,
        req.length, req.width, req.height, "SURFACE"
    )
    air = await calculate_rate(
        req.from_pincode, req.to_pincode, req.weight,
        req.length, req.width, req.height, "AIR"
    )
    rates = {}
    if surface.get("status") == 200:
        rates["surface"] = surface["data"]
    if air.get("status") == 200:
        rates["air"] = air["data"]
    return {"status": "success", "rates": rates}


# ─── Order Booking ────────────────────────────────────────────────

@router.post("/book-order")
async def api_book_order(req: BookingRequest):
    """Book an order with Shri Maruti Logistics."""
    payload = {
        "orderId": req.orderId,
        "shippingAddress": req.shippingAddress.model_dump(),
        "pickupAddress": req.pickupAddress.model_dump(),
        "amount": req.amount,
        "weight": req.weight,
        "length": req.length,
        "width": req.width,
        "height": req.height,
        "currency": req.currency,
        "gstPercentage": req.gstPercentage,
        "paymentType": req.paymentType,
        "paymentStatus": req.paymentStatus,
        "deliveryPromise": req.deliveryPromise,
        "lineItems": [item.model_dump() for item in req.lineItems],
        "remarks": req.remarks,
        "returnableOrder": req.returnableOrder,
    }
    result = await push_order(payload)
    if result.get("status") != 200:
        raise HTTPException(status_code=400, detail=result.get("message", "Booking failed"))

    # Save to DB
    booking_record = {
        "order_id": req.orderId,
        "awb_number": result["data"].get("awbNumber"),
        "shipper_order_id": result["data"].get("shipperOrderId"),
        "delivery_type": req.deliveryPromise,
        "status": "booked",
        "shipping_address": req.shippingAddress.model_dump(),
        "amount": req.amount,
        "weight": req.weight,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db.logistics_bookings.insert_one(booking_record)

    return {
        "status": "success",
        "booking": {
            "orderId": result["data"].get("orderId"),
            "awbNumber": result["data"].get("awbNumber"),
            "shipperOrderId": result["data"].get("shipperOrderId"),
        },
    }


# ─── Cancel Order ────────────────────────────────────────────────

@router.post("/cancel-order")
async def api_cancel_order(req: CancelRequest):
    """Cancel booked orders."""
    result = await cancel_order(req.order_ids, req.reason)
    # Update DB
    db.logistics_bookings.update_many(
        {"order_id": {"$in": req.order_ids}},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"status": "success", "result": result}


# ─── Tracking ─────────────────────────────────────────────────────

@router.get("/track/{tracking_id}")
async def api_track_order(tracking_id: str):
    """Get current tracking status."""
    result = await get_tracking_status(tracking_id)
    return {"status": "success", "tracking": result}


@router.get("/track/{tracking_id}/history")
async def api_track_history(tracking_id: str):
    """Get full tracking history."""
    result = await get_tracking_history(tracking_id)
    return {"status": "success", "history": result}


# ─── Shopify Order Push ──────────────────────────────────────────

@router.post("/push-shopify-order")
async def api_push_shopify_order(req: ShopifyPushRequest):
    """
    Fetch a Shopify order and push it to Shri Maruti Logistics.
    Pulls order details from the Shopify API automatically.
    """
    shopify_token = os.environ.get("SHOPIFY_ACCESS_TOKEN")
    shopify_store = os.environ.get("SHOPIFY_STORE_URL", "tnvcollection.myshopify.com")

    if not shopify_token:
        raise HTTPException(status_code=500, detail="Shopify access token not configured")

    import httpx
    headers = {
        "X-Shopify-Access-Token": shopify_token,
        "Content-Type": "application/json",
    }

    # Fetch Shopify order
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"https://{shopify_store}/admin/api/2024-01/orders/{req.shopify_order_id}.json",
            headers=headers,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="Shopify order not found")
        order = resp.json().get("order", {})

    # Build shipping address from Shopify
    shipping = order.get("shipping_address", {})
    ship_addr = {
        "name": f"{shipping.get('first_name', '')} {shipping.get('last_name', '')}".strip(),
        "phone": shipping.get("phone", ""),
        "address1": shipping.get("address1", ""),
        "address2": shipping.get("address2", ""),
        "city": shipping.get("city", ""),
        "state": shipping.get("province", ""),
        "country": shipping.get("country", "India"),
        "zip": shipping.get("zip", ""),
    }

    # Build line items
    line_items = []
    total_weight = 0
    for item in order.get("line_items", []):
        weight = item.get("grams", 500)
        total_weight += weight * item.get("quantity", 1)
        line_items.append({
            "name": item.get("title", "Product"),
            "weight": weight,
            "quantity": item.get("quantity", 1),
            "unitPrice": float(item.get("price", 0)),
            "price": float(item.get("price", 0)) * item.get("quantity", 1),
            "sku": item.get("sku", ""),
        })

    if not line_items:
        raise HTTPException(status_code=400, detail="Order has no line items")

    # Build pickup address
    pickup_addr = {
        "name": req.pickup_name,
        "phone": req.pickup_phone,
        "address1": req.pickup_address,
        "city": req.pickup_city,
        "state": req.pickup_state,
        "country": "India",
        "zip": req.pickup_zip,
    }

    # Payment info
    payment_type = "COD" if order.get("financial_status") != "paid" else "ONLINE"
    payment_status = "PAID" if order.get("financial_status") == "paid" else "UNPAID"

    # Push to Shri Maruti
    payload = {
        "orderId": str(order.get("order_number", req.shopify_order_id)),
        "shippingAddress": ship_addr,
        "pickupAddress": pickup_addr,
        "amount": float(order.get("total_price", 0)),
        "weight": total_weight or 500,
        "length": 30,
        "width": 20,
        "height": 10,
        "currency": "INR",
        "gstPercentage": 0,
        "paymentType": payment_type,
        "paymentStatus": payment_status,
        "deliveryPromise": req.delivery_type,
        "lineItems": line_items,
        "remarks": f"Shopify Order #{order.get('order_number', '')}",
        "returnableOrder": True,
    }

    result = await push_order(payload)
    if result.get("status") != 200:
        raise HTTPException(status_code=400, detail=result.get("message", "Push order failed"))

    # Save mapping
    db.logistics_bookings.insert_one({
        "order_id": payload["orderId"],
        "shopify_order_id": req.shopify_order_id,
        "shopify_order_number": order.get("order_number"),
        "awb_number": result["data"].get("awbNumber"),
        "shipper_order_id": result["data"].get("shipperOrderId"),
        "delivery_type": req.delivery_type,
        "status": "booked",
        "amount": payload["amount"],
        "weight": payload["weight"],
        "customer_name": ship_addr["name"],
        "customer_phone": ship_addr["phone"],
        "destination_pincode": ship_addr["zip"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "status": "success",
        "booking": {
            "orderId": result["data"].get("orderId"),
            "awbNumber": result["data"].get("awbNumber"),
            "shipperOrderId": result["data"].get("shipperOrderId"),
            "shopifyOrderNumber": order.get("order_number"),
        },
    }


# ─── Bookings List ────────────────────────────────────────────────

@router.get("/bookings")
async def api_list_bookings(page: int = 1, limit: int = 20, status: str = None):
    """List all logistics bookings."""
    query = {}
    if status:
        query["status"] = status

    total = db.logistics_bookings.count_documents(query)
    bookings = list(
        db.logistics_bookings.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    return {
        "status": "success",
        "total": total,
        "page": page,
        "bookings": bookings,
    }


# ─── Auth Test ────────────────────────────────────────────────────

@router.get("/auth-status")
async def api_auth_status():
    """Test Innofulfill authentication."""
    try:
        token = await get_token()
        return {
            "status": "success",
            "message": "Innofulfill authentication active",
            "token_preview": f"{token[:20]}...",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
