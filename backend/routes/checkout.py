"""
Checkout & Razorpay Payment Integration
- Cart management
- Order creation
- Razorpay payment processing
- Order status management
"""

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import razorpay
import os
import hmac
import hashlib
import uuid

router = APIRouter(prefix="/api/checkout", tags=["Checkout"])

_db: AsyncIOMotorDatabase = None

# Razorpay client - initialized with env variables
_razorpay_client = None

# Store configurations with currency
STORE_CONFIG = {
    "tnvcollection": {
        "currency": "INR",
        "currency_symbol": "₹",
        "country": "India",
        "razorpay_currency": "INR",
        "free_shipping_threshold": 2000,
        "shipping_cost": 150,
    },
    "tnvcollectionpk": {
        "currency": "PKR",
        "currency_symbol": "Rs.",
        "country": "Pakistan",
        "razorpay_currency": "INR",  # Razorpay uses INR, we convert
        "pkr_to_inr_rate": 0.32,  # 1 PKR = 0.32 INR (approx)
        "free_shipping_threshold": 5000,
        "shipping_cost": 300,
    }
}

def get_store_config(store: str):
    return STORE_CONFIG.get(store, STORE_CONFIG["tnvcollection"])

def set_database(db: AsyncIOMotorDatabase):
    global _db
    _db = db

def get_razorpay_client():
    global _razorpay_client
    if _razorpay_client is None:
        key_id = os.environ.get('RAZORPAY_KEY_ID', '')
        key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
        if key_id and key_secret:
            _razorpay_client = razorpay.Client(auth=(key_id, key_secret))
    return _razorpay_client


# ======================
# PYDANTIC MODELS
# ======================

class CartItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    image: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None

class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "UAE"

class CreateOrderRequest(BaseModel):
    items: List[CartItem]
    shipping_address: ShippingAddress
    payment_method: str = "razorpay"  # razorpay, cod
    coupon_code: Optional[str] = None
    notes: Optional[str] = None

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ======================
# CART ENDPOINTS
# ======================

@router.post("/cart/add")
async def add_to_cart(item: CartItem, session_id: str):
    """Add item to cart"""
    cart = await _db.carts.find_one({"session_id": session_id})
    
    if cart:
        # Check if item already exists
        existing_item = next((i for i in cart.get("items", []) if i["product_id"] == item.product_id and i.get("size") == item.size), None)
        if existing_item:
            # Update quantity
            await _db.carts.update_one(
                {"session_id": session_id, "items.product_id": item.product_id},
                {"$inc": {"items.$.quantity": item.quantity}}
            )
        else:
            # Add new item
            await _db.carts.update_one(
                {"session_id": session_id},
                {"$push": {"items": item.dict()}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    else:
        # Create new cart
        await _db.carts.insert_one({
            "session_id": session_id,
            "items": [item.dict()],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"success": True, "message": "Item added to cart"}


@router.get("/cart/{session_id}")
async def get_cart(session_id: str, store: str = Query("tnvcollection")):
    """Get cart contents"""
    cart = await _db.carts.find_one({"session_id": session_id}, {"_id": 0})
    store_config = get_store_config(store)
    free_threshold = store_config.get("free_shipping_threshold", 2000)
    
    if not cart:
        return {
            "items": [], 
            "subtotal": 0, 
            "shipping": 0,
            "discount": 0,
            "total": 0,
            "item_count": 0,
            "currency": store_config["currency"],
            "currency_symbol": store_config["currency_symbol"],
            "free_shipping_threshold": free_threshold
        }
    
    items = cart.get("items", [])
    subtotal = sum(item["price"] * item["quantity"] for item in items)
    
    # Use store-specific shipping thresholds
    shipping_cost = store_config.get("shipping_cost", 150)
    shipping = 0 if subtotal >= free_threshold else shipping_cost
    
    return {
        "items": items,
        "subtotal": round(subtotal, 2),
        "shipping": shipping,
        "discount": 0,
        "total": round(subtotal + shipping, 2),
        "item_count": sum(item["quantity"] for item in items),
        "currency": store_config["currency"],
        "currency_symbol": store_config["currency_symbol"],
        "free_shipping_threshold": free_threshold
    }


@router.post("/cart/update")
async def update_cart_item(session_id: str, product_id: str, quantity: int, size: Optional[str] = None):
    """Update cart item quantity"""
    if quantity <= 0:
        # Remove item
        await _db.carts.update_one(
            {"session_id": session_id},
            {"$pull": {"items": {"product_id": product_id}}}
        )
    else:
        await _db.carts.update_one(
            {"session_id": session_id, "items.product_id": product_id},
            {"$set": {"items.$.quantity": quantity, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"success": True}


@router.delete("/cart/{session_id}/item/{product_id}")
async def remove_from_cart(session_id: str, product_id: str):
    """Remove item from cart"""
    await _db.carts.update_one(
        {"session_id": session_id},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"success": True, "message": "Item removed"}


@router.delete("/cart/{session_id}")
async def clear_cart(session_id: str):
    """Clear entire cart"""
    await _db.carts.delete_one({"session_id": session_id})
    return {"success": True, "message": "Cart cleared"}


# ======================
# ORDER ENDPOINTS
# ======================

@router.post("/order/create")
async def create_order(request: CreateOrderRequest, session_id: str, store: str = Query("tnvcollection")):
    """Create order and initiate payment"""
    
    # Get store configuration
    store_config = get_store_config(store)
    
    # Validate cart
    cart = await _db.carts.find_one({"session_id": session_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    items = request.items if request.items else cart.get("items", [])
    
    # Calculate totals
    subtotal = sum(item.price * item.quantity for item in items) if request.items else sum(item["price"] * item["quantity"] for item in items)
    
    # Use store-specific shipping
    free_threshold = store_config.get("free_shipping_threshold", 2000)
    shipping_cost = store_config.get("shipping_cost", 150)
    shipping = 0 if subtotal >= free_threshold else shipping_cost
    discount = 0
    
    # Apply coupon if provided
    if request.coupon_code:
        coupon = await _db.coupons.find_one({"code": request.coupon_code.upper(), "active": True})
        if coupon:
            if coupon.get("type") == "percentage":
                discount = subtotal * (coupon["value"] / 100)
            else:
                discount = coupon["value"]
    
    total = subtotal + shipping - discount
    
    # Generate order ID
    store_prefix = "PK" if store == "tnvcollectionpk" else "IN"
    order_id = f"ORD-{store_prefix}-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    # Create order document
    order_doc = {
        "order_id": order_id,
        "store": store,
        "session_id": session_id,
        "items": [item.dict() if hasattr(item, 'dict') else item for item in items],
        "shipping_address": request.shipping_address.dict(),
        "subtotal": round(subtotal, 2),
        "shipping": shipping,
        "discount": round(discount, 2),
        "total": round(total, 2),
        "currency": store_config["currency"],
        "payment_method": request.payment_method,
        "payment_status": "pending",
        "order_status": "pending",
        "notes": request.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # For COD orders
    if request.payment_method == "cod":
        order_doc["payment_status"] = "cod_pending"
        order_doc["order_status"] = "confirmed"
        await _db.orders.insert_one(order_doc)
        
        # Clear cart
        await _db.carts.delete_one({"session_id": session_id})
        
        return {
            "success": True,
            "order_id": order_id,
            "payment_method": "cod",
            "total": order_doc["total"],
            "currency": store_config["currency"],
            "currency_symbol": store_config["currency_symbol"],
            "message": "Order placed successfully. Pay on delivery."
        }
    
    # For Razorpay payment
    client = get_razorpay_client()
    if not client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    # Convert to INR for Razorpay
    if store_config["currency"] == "INR":
        amount_inr = int(total * 100)  # Already INR, convert to paise
    elif store_config["currency"] == "PKR":
        # Convert PKR to INR
        pkr_to_inr_rate = store_config.get("pkr_to_inr_rate", 0.32)
        amount_inr = int(total * pkr_to_inr_rate * 100)  # Convert to paise
    else:
        # Default conversion for other currencies
        amount_inr = int(total * 22 * 100)
    
    try:
        razorpay_order = client.order.create({
            "amount": amount_inr,
            "currency": "INR",
            "receipt": order_id,
            "payment_capture": 1,
            "notes": {
                "order_id": order_id,
                "store": store,
                "original_currency": store_config["currency"],
                "original_amount": total,
                "customer_name": request.shipping_address.full_name
            }
        })
        
        order_doc["razorpay_order_id"] = razorpay_order["id"]
        order_doc["amount_inr"] = amount_inr
        
        await _db.orders.insert_one(order_doc)
        
        return {
            "success": True,
            "order_id": order_id,
            "razorpay_order_id": razorpay_order["id"],
            "razorpay_key": os.environ.get('RAZORPAY_KEY_ID', ''),
            "amount": amount_inr,
            "razorpay_currency": "INR",
            "total": order_doc["total"],
            "currency": store_config["currency"],
            "currency_symbol": store_config["currency_symbol"],
            "customer": {
                "name": request.shipping_address.full_name,
                "email": request.shipping_address.email,
                "phone": request.shipping_address.phone
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create payment order: {str(e)}")


@router.post("/order/verify-payment")
async def verify_payment(request: VerifyPaymentRequest):
    """Verify Razorpay payment signature"""
    
    client = get_razorpay_client()
    if not client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    # Verify signature
    key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
    
    message = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
    generated_signature = hmac.new(
        key_secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if generated_signature != request.razorpay_signature:
        # Update order as failed
        await _db.orders.update_one(
            {"razorpay_order_id": request.razorpay_order_id},
            {"$set": {"payment_status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    # Update order as paid
    result = await _db.orders.find_one_and_update(
        {"razorpay_order_id": request.razorpay_order_id},
        {"$set": {
            "payment_status": "paid",
            "order_status": "confirmed",
            "razorpay_payment_id": request.razorpay_payment_id,
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        return_document=True
    )
    
    if result:
        # Clear cart
        await _db.carts.delete_one({"session_id": result.get("session_id")})
        
        return {
            "success": True,
            "order_id": result.get("order_id"),
            "message": "Payment successful! Order confirmed.",
            "order_status": "confirmed"
        }
    
    raise HTTPException(status_code=404, detail="Order not found")


@router.get("/order/{order_id}")
async def get_order(order_id: str):
    """Get order details"""
    order = await _db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order


@router.get("/orders")
async def get_orders(session_id: Optional[str] = None, limit: int = 20):
    """Get orders list"""
    query = {}
    if session_id:
        query["session_id"] = session_id
    
    orders = await _db.orders.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"orders": orders}


# ======================
# WEBHOOK ENDPOINT
# ======================

@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhook events"""
    
    payload = await request.body()
    signature = request.headers.get('X-Razorpay-Signature', '')
    webhook_secret = os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')
    
    if webhook_secret:
        # Verify webhook signature
        expected_signature = hmac.new(
            webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        if signature != expected_signature:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    
    try:
        import json
        data = json.loads(payload)
        event = data.get("event")
        
        if event == "payment.captured":
            payment = data["payload"]["payment"]["entity"]
            await _db.orders.update_one(
                {"razorpay_order_id": payment["order_id"]},
                {"$set": {
                    "payment_status": "captured",
                    "razorpay_payment_id": payment["id"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        elif event == "payment.failed":
            payment = data["payload"]["payment"]["entity"]
            await _db.orders.update_one(
                {"razorpay_order_id": payment["order_id"]},
                {"$set": {
                    "payment_status": "failed",
                    "failure_reason": payment.get("error_description"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {"status": "processed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ======================
# COUPON ENDPOINTS
# ======================

@router.post("/coupon/validate")
async def validate_coupon(code: str, subtotal: float):
    """Validate a coupon code"""
    coupon = await _db.coupons.find_one({"code": code.upper(), "active": True}, {"_id": 0})
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    # Check minimum order
    if subtotal < coupon.get("min_order", 0):
        raise HTTPException(status_code=400, detail=f"Minimum order amount is {coupon['min_order']} AED")
    
    # Calculate discount
    if coupon["type"] == "percentage":
        discount = subtotal * (coupon["value"] / 100)
        max_discount = coupon.get("max_discount")
        if max_discount and discount > max_discount:
            discount = max_discount
    else:
        discount = coupon["value"]
    
    return {
        "valid": True,
        "code": coupon["code"],
        "type": coupon["type"],
        "value": coupon["value"],
        "discount": round(discount, 2),
        "description": coupon.get("description", "")
    }
