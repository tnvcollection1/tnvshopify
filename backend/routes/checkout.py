"""Checkout API - Cart checkout with Razorpay payment and Shopify order creation."""
import os
import hmac
import hashlib
import logging
import razorpay
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/checkout", tags=["checkout"])

db = None

def set_database(database):
    global db
    db = database

# Razorpay
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
rz_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    rz_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Shopify
SHOPIFY_TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "").strip('"')
SHOPIFY_STORE = os.environ.get("SHOPIFY_SHOP_URL", "").strip('"')
SHOPIFY_HEADERS = {"X-Shopify-Access-Token": SHOPIFY_TOKEN, "Content-Type": "application/json"}
SHOPIFY_BASE = f"https://{SHOPIFY_STORE}/admin/api/2024-01"


class CartItem(BaseModel):
    variant_id: int
    product_id: int
    title: str
    variant_title: str = ""
    price: float
    quantity: int = 1
    image: str = ""


class CustomerInfo(BaseModel):
    email: str
    first_name: str
    last_name: str
    phone: str = ""
    address1: str
    address2: str = ""
    city: str
    province: str
    zip: str
    country: str = "IN"


class CheckoutRequest(BaseModel):
    items: List[CartItem]
    customer: CustomerInfo
    payment_method: str = "prepaid"


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    checkout_id: str


@router.post("/create-order")
async def create_checkout_order(req: CheckoutRequest):
    """Create a Razorpay order for the cart, or process COD directly."""
    if not req.items:
        raise HTTPException(400, "Cart is empty")

    total = sum(item.price * item.quantity for item in req.items)
    total_paise = int(round(total * 100))

    checkout_doc = {
        "checkout_id": f"TNV-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "items": [i.dict() for i in req.items],
        "customer": req.customer.dict(),
        "total": total,
        "payment_method": req.payment_method,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if req.payment_method == "cod":
        shopify_order = await _create_shopify_order(checkout_doc, payment_status="pending")
        checkout_doc["status"] = "confirmed"
        checkout_doc["shopify_order_id"] = shopify_order.get("id")
        checkout_doc["shopify_order_number"] = shopify_order.get("order_number")
        if db:
            db.checkouts.insert_one(checkout_doc)
        return {
            "success": True,
            "checkout_id": checkout_doc["checkout_id"],
            "payment_method": "cod",
            "shopify_order_number": shopify_order.get("order_number"),
            "total": total,
        }

    if not rz_client:
        raise HTTPException(500, "Payment gateway not configured")

    rz_order = rz_client.order.create({
        "amount": total_paise,
        "currency": "INR",
        "receipt": checkout_doc["checkout_id"],
        "notes": {
            "customer_email": req.customer.email,
            "customer_name": f"{req.customer.first_name} {req.customer.last_name}",
        }
    })

    checkout_doc["razorpay_order_id"] = rz_order["id"]
    if db:
        db.checkouts.insert_one(checkout_doc)

    return {
        "success": True,
        "checkout_id": checkout_doc["checkout_id"],
        "razorpay_order_id": rz_order["id"],
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "amount": total_paise,
        "currency": "INR",
        "total": total,
    }


@router.post("/verify-payment")
async def verify_payment(req: PaymentVerifyRequest):
    """Verify Razorpay payment signature and create Shopify order."""
    msg = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    generated_sig = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        msg.encode(),
        hashlib.sha256
    ).hexdigest()

    if generated_sig != req.razorpay_signature:
        raise HTTPException(400, "Payment verification failed")

    checkout = None
    if db:
        checkout = db.checkouts.find_one(
            {"checkout_id": req.checkout_id},
            {"_id": 0}
        )

    if not checkout:
        raise HTTPException(404, "Checkout not found")

    shopify_order = await _create_shopify_order(checkout, payment_status="paid")

    if db:
        db.checkouts.update_one(
            {"checkout_id": req.checkout_id},
            {"$set": {
                "status": "paid",
                "razorpay_payment_id": req.razorpay_payment_id,
                "shopify_order_id": shopify_order.get("id"),
                "shopify_order_number": shopify_order.get("order_number"),
                "paid_at": datetime.now(timezone.utc).isoformat(),
            }}
        )

    return {
        "success": True,
        "shopify_order_number": shopify_order.get("order_number"),
        "shopify_order_id": shopify_order.get("id"),
        "checkout_id": req.checkout_id,
    }


async def _create_shopify_order(checkout: dict, payment_status: str = "pending") -> dict:
    """Create an order in Shopify from checkout data."""
    customer = checkout["customer"]
    items = checkout["items"]

    line_items = []
    for item in items:
        line_items.append({"variant_id": item["variant_id"], "quantity": item["quantity"]})

    order_payload = {
        "order": {
            "line_items": line_items,
            "customer": {
                "first_name": customer["first_name"],
                "last_name": customer["last_name"],
                "email": customer["email"],
            },
            "shipping_address": {
                "first_name": customer["first_name"],
                "last_name": customer["last_name"],
                "address1": customer["address1"],
                "address2": customer.get("address2", ""),
                "city": customer["city"],
                "province": customer["province"],
                "zip": customer["zip"],
                "country": customer.get("country", "IN"),
                "phone": customer.get("phone", ""),
            },
            "financial_status": payment_status,
            "send_receipt": True,
            "send_fulfillment_receipt": True,
            "tags": "tnv-storefront,online",
        }
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{SHOPIFY_BASE}/orders.json",
            headers=SHOPIFY_HEADERS,
            json=order_payload
        )
        if resp.status_code in (200, 201):
            order = resp.json().get("order", {})
            logger.info(f"Shopify order created: #{order.get('order_number')}")
            return {"id": order.get("id"), "order_number": order.get("order_number")}
        else:
            logger.error(f"Shopify order failed: {resp.status_code} - {resp.text[:500]}")
            return {"id": None, "order_number": None, "error": resp.text[:200]}


@router.get("/order/{checkout_id}")
async def get_checkout_status(checkout_id: str):
    """Get checkout/order status."""
    if not db:
        raise HTTPException(500, "Database not available")
    checkout = db.checkouts.find_one({"checkout_id": checkout_id}, {"_id": 0})
    if not checkout:
        raise HTTPException(404, "Checkout not found")
    return checkout
