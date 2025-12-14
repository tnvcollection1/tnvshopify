"""
Razorpay Subscription Management for OmniSales SaaS Platform
Handles subscription plans, payments, and user billing
"""

import os
import razorpay
import hmac
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# Initialize Razorpay client
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")

razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    logger.info("Razorpay client initialized")

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "shopifycrm")
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Router
subscriptions_router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

# ==================== Subscription Plans ====================

SUBSCRIPTION_PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "price": 0,
        "currency": "INR",
        "interval": "month",
        "features": [
            "1 Store",
            "100 Orders/month",
            "Basic Dashboard",
            "Email Support"
        ],
        "limits": {
            "stores": 1,
            "orders_per_month": 100,
            "whatsapp_messages": 0,
            "team_members": 1
        }
    },
    "starter": {
        "id": "starter",
        "name": "Starter",
        "price": 999,
        "currency": "INR",
        "interval": "month",
        "features": [
            "3 Stores",
            "1,000 Orders/month",
            "WhatsApp Notifications",
            "Order Tracking",
            "Priority Email Support"
        ],
        "limits": {
            "stores": 3,
            "orders_per_month": 1000,
            "whatsapp_messages": 500,
            "team_members": 3
        }
    },
    "growth": {
        "id": "growth",
        "name": "Growth",
        "price": 2499,
        "currency": "INR",
        "interval": "month",
        "popular": True,
        "features": [
            "10 Stores",
            "5,000 Orders/month",
            "Unlimited WhatsApp Messages",
            "Advanced Analytics",
            "Inventory Management",
            "Multi-user Access",
            "Phone Support"
        ],
        "limits": {
            "stores": 10,
            "orders_per_month": 5000,
            "whatsapp_messages": -1,  # Unlimited
            "team_members": 10
        }
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise",
        "price": 4999,
        "currency": "INR",
        "interval": "month",
        "features": [
            "Unlimited Stores",
            "Unlimited Orders",
            "Unlimited WhatsApp Messages",
            "Custom Integrations",
            "Dedicated Account Manager",
            "SLA Guarantee",
            "24/7 Priority Support"
        ],
        "limits": {
            "stores": -1,  # Unlimited
            "orders_per_month": -1,
            "whatsapp_messages": -1,
            "team_members": -1
        }
    }
}

# Annual plans with discount
ANNUAL_DISCOUNT = 0.20  # 20% discount for annual

# ==================== Pydantic Models ====================

class CreateOrderRequest(BaseModel):
    plan_id: str
    billing_cycle: str = "monthly"  # monthly or annual
    user_id: str
    tenant_id: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str
    user_id: str
    tenant_id: str

class SubscriptionStatus(BaseModel):
    plan_id: str
    plan_name: str
    status: str  # active, expired, cancelled
    current_period_start: Optional[str]
    current_period_end: Optional[str]
    limits: dict

# ==================== Helper Functions ====================

def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature"""
    if not RAZORPAY_KEY_SECRET:
        return False
    
    message = f"{order_id}|{payment_id}"
    generated_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(generated_signature, signature)

def calculate_plan_price(plan_id: str, billing_cycle: str) -> int:
    """Calculate price in paise based on plan and billing cycle"""
    plan = SUBSCRIPTION_PLANS.get(plan_id)
    if not plan:
        return 0
    
    monthly_price = plan["price"]
    
    if billing_cycle == "annual":
        # 12 months with discount
        annual_price = monthly_price * 12 * (1 - ANNUAL_DISCOUNT)
        return int(annual_price * 100)  # Convert to paise
    
    return monthly_price * 100  # Convert to paise

# ==================== API Endpoints ====================

@subscriptions_router.get("/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    plans = []
    for plan_id, plan in SUBSCRIPTION_PLANS.items():
        plan_data = {
            **plan,
            "monthly_price": plan["price"],
            "annual_price": int(plan["price"] * 12 * (1 - ANNUAL_DISCOUNT)),
            "annual_monthly_price": int(plan["price"] * (1 - ANNUAL_DISCOUNT))
        }
        plans.append(plan_data)
    
    return {
        "success": True,
        "plans": plans,
        "annual_discount_percent": int(ANNUAL_DISCOUNT * 100)
    }

@subscriptions_router.get("/status/{user_id}")
async def get_subscription_status(user_id: str):
    """Get current subscription status for a user"""
    try:
        subscription = await db.subscriptions.find_one(
            {"user_id": user_id, "status": "active"},
            {"_id": 0}
        )
        
        if not subscription:
            # Return free plan as default
            return {
                "success": True,
                "subscription": {
                    "plan_id": "free",
                    "plan_name": "Free",
                    "status": "active",
                    "limits": SUBSCRIPTION_PLANS["free"]["limits"],
                    "is_free": True
                }
            }
        
        plan = SUBSCRIPTION_PLANS.get(subscription.get("plan_id", "free"))
        
        return {
            "success": True,
            "subscription": {
                **subscription,
                "plan_name": plan["name"] if plan else "Unknown",
                "limits": plan["limits"] if plan else {},
                "is_free": subscription.get("plan_id") == "free"
            }
        }
    except Exception as e:
        logger.error(f"Error getting subscription status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@subscriptions_router.post("/create-order")
async def create_subscription_order(request: CreateOrderRequest):
    """Create a Razorpay order for subscription payment"""
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    plan = SUBSCRIPTION_PLANS.get(request.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    if request.plan_id == "free":
        raise HTTPException(status_code=400, detail="Free plan doesn't require payment")
    
    amount = calculate_plan_price(request.plan_id, request.billing_cycle)
    
    try:
        # Create Razorpay order
        order_data = {
            "amount": amount,
            "currency": "INR",
            "receipt": f"sub_{request.user_id}_{uuid4().hex[:8]}",
            "notes": {
                "plan_id": request.plan_id,
                "billing_cycle": request.billing_cycle,
                "user_id": request.user_id,
                "tenant_id": request.tenant_id
            }
        }
        
        razorpay_order = razorpay_client.order.create(data=order_data)
        
        # Store order in database
        order_record = {
            "id": str(uuid4()),
            "razorpay_order_id": razorpay_order["id"],
            "user_id": request.user_id,
            "tenant_id": request.tenant_id,
            "plan_id": request.plan_id,
            "billing_cycle": request.billing_cycle,
            "amount": amount,
            "currency": "INR",
            "status": "created",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.subscription_orders.insert_one(order_record)
        
        return {
            "success": True,
            "order_id": razorpay_order["id"],
            "amount": amount,
            "currency": "INR",
            "key_id": RAZORPAY_KEY_ID,
            "plan": plan
        }
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@subscriptions_router.post("/verify-payment")
async def verify_subscription_payment(request: VerifyPaymentRequest):
    """Verify payment and activate subscription"""
    
    # Verify signature
    is_valid = verify_razorpay_signature(
        request.razorpay_order_id,
        request.razorpay_payment_id,
        request.razorpay_signature
    )
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    
    try:
        # Get order from database
        order = await db.subscription_orders.find_one(
            {"razorpay_order_id": request.razorpay_order_id}
        )
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Calculate subscription period
        now = datetime.now(timezone.utc)
        if order.get("billing_cycle") == "annual":
            from dateutil.relativedelta import relativedelta
            period_end = now + relativedelta(years=1)
        else:
            from dateutil.relativedelta import relativedelta
            period_end = now + relativedelta(months=1)
        
        # Deactivate any existing subscription
        await db.subscriptions.update_many(
            {"user_id": request.user_id, "status": "active"},
            {"$set": {"status": "superseded", "superseded_at": now.isoformat()}}
        )
        
        # Create new subscription record
        subscription = {
            "id": str(uuid4()),
            "user_id": request.user_id,
            "tenant_id": request.tenant_id,
            "plan_id": request.plan_id,
            "billing_cycle": order.get("billing_cycle", "monthly"),
            "status": "active",
            "razorpay_order_id": request.razorpay_order_id,
            "razorpay_payment_id": request.razorpay_payment_id,
            "amount_paid": order.get("amount", 0),
            "currency": "INR",
            "current_period_start": now.isoformat(),
            "current_period_end": period_end.isoformat(),
            "created_at": now.isoformat()
        }
        
        await db.subscriptions.insert_one(subscription)
        
        # Update order status
        await db.subscription_orders.update_one(
            {"razorpay_order_id": request.razorpay_order_id},
            {"$set": {
                "status": "paid",
                "razorpay_payment_id": request.razorpay_payment_id,
                "paid_at": now.isoformat()
            }}
        )
        
        # Update user's subscription in users collection
        await db.users.update_one(
            {"id": request.user_id},
            {"$set": {
                "subscription_plan": request.plan_id,
                "subscription_status": "active",
                "subscription_expires": period_end.isoformat()
            }}
        )
        
        plan = SUBSCRIPTION_PLANS.get(request.plan_id, {})
        
        return {
            "success": True,
            "message": f"Successfully subscribed to {plan.get('name', 'Unknown')} plan!",
            "subscription": {
                "plan_id": request.plan_id,
                "plan_name": plan.get("name"),
                "status": "active",
                "current_period_end": period_end.isoformat(),
                "limits": plan.get("limits", {})
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@subscriptions_router.post("/webhook")
async def handle_razorpay_webhook(request: Request):
    """Handle Razorpay webhook events"""
    try:
        payload = await request.json()
        event = payload.get("event")
        
        logger.info(f"Received Razorpay webhook: {event}")
        
        # Handle different webhook events
        if event == "payment.captured":
            payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
            logger.info(f"Payment captured: {payment.get('id')}")
            
        elif event == "payment.failed":
            payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment.get("order_id")
            
            # Update order status
            await db.subscription_orders.update_one(
                {"razorpay_order_id": order_id},
                {"$set": {"status": "failed", "failed_at": datetime.now(timezone.utc).isoformat()}}
            )
            logger.warning(f"Payment failed: {payment.get('id')}")
            
        elif event == "subscription.charged":
            # Handle recurring payment
            subscription_data = payload.get("payload", {}).get("subscription", {}).get("entity", {})
            logger.info(f"Subscription charged: {subscription_data.get('id')}")
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@subscriptions_router.get("/history/{user_id}")
async def get_payment_history(user_id: str):
    """Get payment history for a user"""
    try:
        orders = await db.subscription_orders.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        
        return {
            "success": True,
            "payments": orders
        }
    except Exception as e:
        logger.error(f"Error fetching payment history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@subscriptions_router.post("/cancel/{user_id}")
async def cancel_subscription(user_id: str):
    """Cancel active subscription (will remain active until period ends)"""
    try:
        result = await db.subscriptions.update_one(
            {"user_id": user_id, "status": "active"},
            {"$set": {
                "status": "cancelled",
                "cancelled_at": datetime.now(timezone.utc).isoformat(),
                "cancel_at_period_end": True
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        return {
            "success": True,
            "message": "Subscription cancelled. You can continue using the service until the end of your billing period."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@subscriptions_router.get("/usage/{tenant_id}")
async def get_usage_stats(tenant_id: str):
    """Get current usage statistics for a tenant"""
    try:
        # Get current month's usage
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Count orders this month
        orders_count = await db.orders.count_documents({
            "tenant_id": tenant_id,
            "created_at": {"$gte": month_start.isoformat()}
        })
        
        # Count stores
        stores_count = await db.stores.count_documents({"tenant_id": tenant_id})
        
        # Count WhatsApp messages
        whatsapp_count = await db.whatsapp_messages.count_documents({
            "tenant_id": tenant_id,
            "sent_at": {"$gte": month_start.isoformat()}
        })
        
        # Count team members
        team_count = await db.users.count_documents({"tenant_id": tenant_id})
        
        return {
            "success": True,
            "usage": {
                "orders_this_month": orders_count,
                "stores": stores_count,
                "whatsapp_messages": whatsapp_count,
                "team_members": team_count
            },
            "period": {
                "start": month_start.isoformat(),
                "end": now.isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error fetching usage stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
