"""
Storefront API Routes
Public endpoints for the customer-facing storefront
Handles checkout, order creation, and payment processing
"""

from fastapi import APIRouter, HTTPException, Body, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import os
import httpx
import hashlib
import hmac
import razorpay
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/storefront", tags=["Storefront"])

# Email service - lazy import
_email_service = None

def get_email_service():
    global _email_service
    if _email_service is None:
        try:
            from services.email_service import email_service
            _email_service = email_service
        except Exception as e:
            logger.warning(f"Email service not available: {e}")
            _email_service = False
    return _email_service if _email_service else None

# Get database reference - will be set by server.py
_db = None

def set_database(db):
    global _db
    _db = db

def get_db():
    if _db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return _db

# Razorpay configuration
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')

razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


# Pydantic Models
class CustomerInfo(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str

class ShippingAddress(BaseModel):
    first_name: str
    last_name: str
    address1: str
    address2: Optional[str] = ""
    city: str
    province: str
    zip: str
    country: str = "IN"
    phone: str

class LineItem(BaseModel):
    variant_id: Any
    quantity: int
    price: float
    title: str
    variant_title: Optional[str] = ""

class OrderCreate(BaseModel):
    store_name: str
    customer: CustomerInfo
    shipping_address: ShippingAddress
    line_items: List[LineItem]
    payment_method: str = "cod"
    subtotal: float
    shipping: float
    total: float

class RazorpayOrderCreate(BaseModel):
    amount: float
    currency: str = "INR"
    order_data: Dict[str, Any]

class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_data: Dict[str, Any]


def generate_order_number() -> str:
    """Generate a unique order number"""
    import random
    import string
    timestamp = datetime.now(timezone.utc).strftime("%y%m%d%H%M")
    random_suffix = ''.join(random.choices(string.digits, k=4))
    return f"SF{timestamp}{random_suffix}"


async def get_store_config(store_name: str) -> dict:
    """Get store configuration including Shopify credentials"""
    db = get_db()
    store = await db.stores.find_one({"store_name": store_name}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail=f"Store not found: {store_name}")
    return store


# ==================== Product Endpoints ====================

@router.get("/products")
async def get_storefront_products(
    store: str = "tnvcollection",
    limit: int = 48,
    page: int = 1,
    category: Optional[str] = None,
    collection: Optional[str] = None,
    search: Optional[str] = None
):
    """
    Get products for the public storefront
    Filters by store and returns only active products
    """
    db = get_db()
    
    # Build query
    query = {
        "store_name": store,
        "$or": [
            {"status": "active"},
            {"status": {"$exists": False}}  # Include products without status field
        ]
    }
    
    # Add category filter if provided
    if category:
        query["product_type"] = {"$regex": category, "$options": "i"}
    
    # Add search filter if provided
    if search:
        query["$and"] = [
            query.get("$or", []),
            {"$or": [
                {"title": {"$regex": search, "$options": "i"}},
                {"tags": {"$regex": search, "$options": "i"}}
            ]}
        ]
        del query["$or"]
    
    # Calculate skip for pagination
    skip = (page - 1) * limit
    
    # Fetch products
    cursor = db.shopify_products.find(
        query,
        {"_id": 0}
    ).skip(skip).limit(limit).sort("updated_at", -1)
    
    products = await cursor.to_list(length=limit)
    
    # Get total count
    total = await db.shopify_products.count_documents(query)
    
    return {
        "success": True,
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": (page * limit) < total
    }


@router.get("/products/{product_id}")
async def get_storefront_product(
    product_id: str,
    store: str = "tnvcollection"
):
    """
    Get a single product by ID for the storefront
    """
    db = get_db()
    
    # Try to find by shopify_product_id first, then by id
    product = await db.shopify_products.find_one(
        {
            "store_name": store,
            "$or": [
                {"shopify_product_id": product_id},
                {"shopify_product_id": int(product_id) if product_id.isdigit() else product_id},
                {"id": product_id}
            ]
        },
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {
        "success": True,
        "product": product
    }


# ==================== Order Endpoints ====================


async def create_shopify_order(store_name: str, order_data: dict) -> dict:
    """Create order in Shopify"""
    store = await get_store_config(store_name)
    
    shopify_domain = store.get('shopify_domain') or store.get('shop_url', '').replace('https://', '').replace('http://', '')
    access_token = store.get('shopify_token')
    
    if not shopify_domain or not access_token:
        # Return mock order if Shopify not configured
        return {"id": generate_order_number(), "order_number": generate_order_number()}
    
    # Build Shopify order payload
    shopify_order = {
        "order": {
            "email": order_data['customer']['email'],
            "phone": order_data['customer']['phone'],
            "fulfillment_status": None,
            "send_receipt": True,
            "send_fulfillment_receipt": True,
            "line_items": [
                {
                    "variant_id": int(item['variant_id']) if str(item['variant_id']).isdigit() else None,
                    "quantity": item['quantity'],
                    "price": str(item['price']),
                    "title": item['title'],
                }
                for item in order_data['line_items']
            ],
            "customer": {
                "first_name": order_data['customer']['first_name'],
                "last_name": order_data['customer']['last_name'],
                "email": order_data['customer']['email'],
            },
            "shipping_address": {
                "first_name": order_data['shipping_address']['first_name'],
                "last_name": order_data['shipping_address']['last_name'],
                "address1": order_data['shipping_address']['address1'],
                "address2": order_data['shipping_address'].get('address2', ''),
                "city": order_data['shipping_address']['city'],
                "province": order_data['shipping_address']['province'],
                "zip": order_data['shipping_address']['zip'],
                "country": order_data['shipping_address']['country'],
                "phone": order_data['shipping_address']['phone'],
            },
            "billing_address": {
                "first_name": order_data['shipping_address']['first_name'],
                "last_name": order_data['shipping_address']['last_name'],
                "address1": order_data['shipping_address']['address1'],
                "address2": order_data['shipping_address'].get('address2', ''),
                "city": order_data['shipping_address']['city'],
                "province": order_data['shipping_address']['province'],
                "zip": order_data['shipping_address']['zip'],
                "country": order_data['shipping_address']['country'],
                "phone": order_data['shipping_address']['phone'],
            },
            "financial_status": "paid" if order_data.get('payment_method') != 'cod' else "pending",
            "tags": f"storefront,{order_data.get('payment_method', 'cod')}",
            "note": f"Order placed via storefront. Payment: {order_data.get('payment_method', 'cod').upper()}",
        }
    }
    
    # If no variant_id, use title-based line items
    for i, item in enumerate(shopify_order["order"]["line_items"]):
        if item.get("variant_id") is None:
            del shopify_order["order"]["line_items"][i]["variant_id"]
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://{shopify_domain}/admin/api/2024-01/orders.json",
                headers={
                    "X-Shopify-Access-Token": access_token,
                    "Content-Type": "application/json"
                },
                json=shopify_order
            )
            
            if response.status_code in [200, 201]:
                return response.json().get("order", {})
            else:
                print(f"Shopify order creation failed: {response.status_code} - {response.text}")
                # Return local order on Shopify failure
                return {"id": generate_order_number(), "order_number": generate_order_number()}
    except Exception as e:
        print(f"Error creating Shopify order: {e}")
        return {"id": generate_order_number(), "order_number": generate_order_number()}


@router.post("/orders")
async def create_order(order: OrderCreate, background_tasks: BackgroundTasks):
    """Create a new order (COD or after payment verification)"""
    db = get_db()
    
    try:
        order_number = generate_order_number()
        now = datetime.now(timezone.utc).isoformat()
        
        # Calculate estimated delivery (5-7 business days)
        from datetime import timedelta
        estimated_delivery = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        # Save order to database
        order_doc = {
            "order_id": order_number,
            "store_name": order.store_name,
            "customer": order.customer.dict(),
            "shipping_address": order.shipping_address.dict(),
            "line_items": [item.dict() for item in order.line_items],
            "payment_method": order.payment_method,
            "payment_status": "pending" if order.payment_method == "cod" else "paid",
            "subtotal": order.subtotal,
            "shipping": order.shipping,
            "total": order.total,
            "status": "pending",
            "status_history": [
                {"status": "pending", "timestamp": now, "note": "Order placed"}
            ],
            "estimated_delivery": estimated_delivery,
            "created_at": now,
            "updated_at": now,
            "source": "storefront"
        }
        
        await db.storefront_orders.insert_one(order_doc)
        
        # Try to create order in Shopify
        try:
            shopify_result = await create_shopify_order(order.store_name, order_doc)
            if shopify_result.get("id"):
                await db.storefront_orders.update_one(
                    {"order_id": order_number},
                    {"$set": {
                        "shopify_order_id": shopify_result.get("id"),
                        "shopify_order_number": shopify_result.get("order_number")
                    }}
                )
        except Exception as e:
            print(f"Warning: Could not create Shopify order: {e}")
        
        # Send order confirmation email in background
        email_svc = get_email_service()
        if email_svc:
            # Build email order data
            customer_info = order.customer.dict()
            email_order = {
                "order_id": order_number,
                "customer": {
                    "name": f"{customer_info['first_name']} {customer_info['last_name']}",
                    "email": customer_info['email'],
                    "phone": customer_info['phone']
                },
                "items": [
                    {
                        "title": item.title,
                        "quantity": item.quantity,
                        "price": item.price,
                        "size": item.variant_title if item.variant_title else None,
                        "image": ""  # Add image URL if available
                    }
                    for item in order.line_items
                ],
                "shipping_address": order.shipping_address.dict(),
                "subtotal": order.subtotal,
                "shipping": order.shipping,
                "total": order.total,
                "payment_method": order.payment_method,
                "payment_status": "paid" if order.payment_method != "cod" else "pending",
                "tracking_url": f"/order/{order_number}"
            }
            background_tasks.add_task(email_svc.send_order_confirmation, email_order)
            logger.info(f"Order confirmation email queued for {customer_info['email']}")
        
        return {
            "success": True,
            "order_id": order_number,
            "message": "Order created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    """Get order details by order ID"""
    db = get_db()
    
    order = await db.storefront_orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "success": True,
        "order": order
    }


@router.post("/create-razorpay-order")
async def create_razorpay_order(data: RazorpayOrderCreate):
    """Create Razorpay order for payment"""
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    try:
        # Amount in paise (INR smallest unit)
        amount_paise = int(data.amount * 100)
        
        razorpay_order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": data.currency,
            "payment_capture": 1,  # Auto-capture
            "notes": {
                "store_name": data.order_data.get("store_name", ""),
                "source": "storefront"
            }
        })
        
        return {
            "success": True,
            "razorpay_order_id": razorpay_order["id"],
            "amount": amount_paise,
            "currency": data.currency,
            "key": RAZORPAY_KEY_ID
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-payment")
async def verify_payment(data: PaymentVerify):
    """Verify Razorpay payment and create order"""
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    try:
        # Verify signature
        message = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
        generated_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != data.razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Create order
        db = get_db()
        order_number = generate_order_number()
        order_data = data.order_data
        
        order_doc = {
            "order_id": order_number,
            "store_name": order_data.get("store_name"),
            "customer": order_data.get("customer"),
            "shipping_address": order_data.get("shipping_address"),
            "line_items": order_data.get("line_items"),
            "payment_method": "razorpay",
            "payment_status": "paid",
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "subtotal": order_data.get("subtotal"),
            "shipping": order_data.get("shipping"),
            "total": order_data.get("total"),
            "status": "confirmed",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "storefront"
        }
        
        await db.storefront_orders.insert_one(order_doc)
        
        # Try to create in Shopify
        try:
            shopify_result = await create_shopify_order(order_data.get("store_name"), order_doc)
            if shopify_result.get("id"):
                await db.storefront_orders.update_one(
                    {"order_id": order_number},
                    {"$set": {
                        "shopify_order_id": shopify_result.get("id"),
                        "shopify_order_number": shopify_result.get("order_number")
                    }}
                )
        except Exception as e:
            print(f"Warning: Could not create Shopify order: {e}")
        
        return {
            "success": True,
            "order_id": order_number,
            "message": "Payment verified and order created"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "razorpay_configured": razorpay_client is not None,
        "razorpay_key": RAZORPAY_KEY_ID[:10] + "..." if RAZORPAY_KEY_ID else None
    }


@router.get("/orders/{order_id}/track")
async def track_order(order_id: str, email: Optional[str] = None):
    """Track order status - public endpoint for customers"""
    db = get_db()
    
    # Build query
    query = {"order_id": order_id}
    
    # Optional email verification for additional security
    if email:
        query["customer.email"] = email.lower()
    
    order = await db.storefront_orders.find_one(query, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Return order with tracking info
    return {
        "success": True,
        "order": order
    }


class StatusUpdate(BaseModel):
    status: str
    note: Optional[str] = ""
    tracking_number: Optional[str] = None
    courier: Optional[str] = None


@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, update: StatusUpdate, background_tasks: BackgroundTasks):
    """Update order status - admin endpoint"""
    db = get_db()
    
    # Valid statuses
    valid_statuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']
    
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    # Check if order exists
    order = await db.storefront_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Build update
    update_doc = {
        "status": update.status,
        "updated_at": now
    }
    
    # Add tracking number if provided
    if update.tracking_number:
        update_doc["tracking_number"] = update.tracking_number
    if update.courier:
        update_doc["courier"] = update.courier
    
    # Add to status history
    status_entry = {
        "status": update.status,
        "timestamp": now,
        "note": update.note or f"Status updated to {update.status}"
    }
    
    await db.storefront_orders.update_one(
        {"order_id": order_id},
        {
            "$set": update_doc,
            "$push": {"status_history": status_entry}
        }
    )
    
    # Send email notifications based on status
    email_svc = get_email_service()
    if email_svc:
        customer = order.get('customer', {})
        email_order = {
            "order_id": order_id,
            "customer": {
                "name": f"{customer.get('first_name', '')} {customer.get('last_name', '')}",
                "email": customer.get('email'),
                "phone": customer.get('phone')
            },
            "items": [
                {
                    "title": item.get('title', 'Product'),
                    "quantity": item.get('quantity', 1),
                    "price": item.get('price', 0),
                    "image": item.get('image', '')
                }
                for item in order.get('line_items', [])
            ],
            "total": order.get('total', 0)
        }
        
        if update.status == 'shipped' and update.tracking_number:
            # Send shipment notification
            background_tasks.add_task(
                email_svc.send_shipment_notification,
                email_order,
                update.tracking_number,
                update.courier or "DWZ56"
            )
            logger.info(f"Shipment email queued for order {order_id}")
        
        elif update.status == 'delivered':
            # Send delivery confirmation
            background_tasks.add_task(email_svc.send_delivery_confirmation, email_order)
            logger.info(f"Delivery confirmation email queued for order {order_id}")
    
    return {
        "success": True,
        "order_id": order_id,
        "new_status": update.status,
        "message": f"Order status updated to {update.status}"
    }


@router.get("/orders")
async def list_storefront_orders(
    store_name: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """List storefront orders - admin endpoint"""
    db = get_db()
    
    query = {"source": "storefront"}
    if store_name:
        query["store_name"] = store_name
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    
    orders = await db.storefront_orders.find(query, {"_id": 0}) \
        .sort("created_at", -1) \
        .skip(skip) \
        .limit(limit) \
        .to_list(limit)
    
    total = await db.storefront_orders.count_documents(query)
    
    return {
        "success": True,
        "orders": orders,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

