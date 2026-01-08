"""
WhatsApp Notification Preferences & Subscription Service
Manages customer opt-in/opt-out and notification preferences
"""

import os
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["Notification Preferences"])

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client[os.environ.get('DB_NAME', 'shopify_dashboard')]
    return _db

def set_database(database):
    global _db
    _db = database


# ==================== Notification Types ====================

NOTIFICATION_TYPES = {
    "order_confirmed": {
        "name": "Order Confirmation",
        "description": "Receive confirmation when your order is placed",
        "default_enabled": True,
    },
    "order_shipped": {
        "name": "Shipping Updates",
        "description": "Get notified when your order ships with tracking info",
        "default_enabled": True,
    },
    "order_delivered": {
        "name": "Delivery Confirmation",
        "description": "Receive notification when order is delivered",
        "default_enabled": True,
    },
    "order_out_for_delivery": {
        "name": "Out for Delivery",
        "description": "Get notified when order is out for delivery",
        "default_enabled": True,
    },
    "payment_reminder": {
        "name": "Payment Reminders",
        "description": "Receive reminders for pending COD payments",
        "default_enabled": False,
    },
    "promotional": {
        "name": "Promotional Messages",
        "description": "Receive offers, discounts and new arrivals",
        "default_enabled": False,
    },
    "back_in_stock": {
        "name": "Back in Stock Alerts",
        "description": "Get notified when wishlist items are back in stock",
        "default_enabled": False,
    },
    "price_drop": {
        "name": "Price Drop Alerts",
        "description": "Get notified when wishlist items have price drops",
        "default_enabled": False,
    },
    "order_review": {
        "name": "Review Requests",
        "description": "Receive requests to review your purchases",
        "default_enabled": False,
    },
}


# ==================== Pydantic Models ====================

class NotificationPreferences(BaseModel):
    """Customer notification preferences"""
    order_confirmed: bool = True
    order_shipped: bool = True
    order_delivered: bool = True
    order_out_for_delivery: bool = True
    payment_reminder: bool = False
    promotional: bool = False
    back_in_stock: bool = False
    price_drop: bool = False
    order_review: bool = False


class SubscribeRequest(BaseModel):
    """Request to subscribe to WhatsApp notifications"""
    phone_number: str = Field(..., description="Phone number with country code")
    store_name: str = Field(..., description="Store name")
    customer_id: Optional[str] = Field(None, description="Shopify customer ID")
    customer_name: Optional[str] = Field(None, description="Customer name")
    customer_email: Optional[str] = Field(None, description="Customer email")
    preferences: Optional[NotificationPreferences] = None


class UpdatePreferencesRequest(BaseModel):
    """Request to update notification preferences"""
    phone_number: str
    store_name: str
    preferences: NotificationPreferences


class UnsubscribeRequest(BaseModel):
    """Request to unsubscribe from notifications"""
    phone_number: str
    store_name: str
    reason: Optional[str] = None


# ==================== Helper Functions ====================

def normalize_phone(phone: str) -> str:
    """Normalize phone number to international format"""
    phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not phone.startswith("+"):
        if phone.startswith("0"):
            phone = "+91" + phone[1:]
        elif len(phone) == 10:
            phone = "+91" + phone
        else:
            phone = "+" + phone
    return phone


async def get_subscription(phone: str, store_name: str) -> Optional[Dict]:
    """Get customer's notification subscription"""
    db = get_db()
    phone = normalize_phone(phone)
    
    return await db.notification_subscriptions.find_one(
        {"phone": phone, "store_name": store_name},
        {"_id": 0}
    )


async def is_subscribed(phone: str, store_name: str, notification_type: str) -> bool:
    """Check if customer is subscribed to a specific notification type"""
    subscription = await get_subscription(phone, store_name)
    
    if not subscription:
        return False
    
    if not subscription.get("is_active", False):
        return False
    
    if not subscription.get("whatsapp_verified", False):
        return False
    
    preferences = subscription.get("preferences", {})
    return preferences.get(notification_type, NOTIFICATION_TYPES.get(notification_type, {}).get("default_enabled", False))


# ==================== API Endpoints ====================

@router.get("/types")
async def get_notification_types():
    """
    Get all available notification types and their descriptions.
    """
    return {
        "success": True,
        "notification_types": NOTIFICATION_TYPES,
    }


@router.post("/subscribe")
async def subscribe_to_notifications(request: SubscribeRequest):
    """
    Subscribe a customer to WhatsApp notifications.
    
    Note: Customer must verify their phone via OTP before notifications are sent.
    Use /api/whatsapp-otp/notifications/send to initiate verification.
    """
    db = get_db()
    phone = normalize_phone(request.phone_number)
    
    # Check if already subscribed
    existing = await db.notification_subscriptions.find_one({
        "phone": phone,
        "store_name": request.store_name
    })
    
    # Set default preferences
    preferences = request.preferences.dict() if request.preferences else {
        k: v["default_enabled"] for k, v in NOTIFICATION_TYPES.items()
    }
    
    subscription = {
        "phone": phone,
        "store_name": request.store_name,
        "customer_id": request.customer_id,
        "customer_name": request.customer_name,
        "customer_email": request.customer_email,
        "preferences": preferences,
        "is_active": True,
        "whatsapp_verified": False,  # Must verify via OTP
        "subscribed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    if existing:
        # Update existing subscription
        await db.notification_subscriptions.update_one(
            {"phone": phone, "store_name": request.store_name},
            {"$set": {
                "is_active": True,
                "preferences": preferences,
                "customer_id": request.customer_id or existing.get("customer_id"),
                "customer_name": request.customer_name or existing.get("customer_name"),
                "customer_email": request.customer_email or existing.get("customer_email"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "resubscribed_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        action = "resubscribed"
        is_verified = existing.get("whatsapp_verified", False)
    else:
        # Create new subscription
        await db.notification_subscriptions.insert_one(subscription)
        action = "subscribed"
        is_verified = False
    
    return {
        "success": True,
        "message": f"Successfully {action} to notifications",
        "phone": phone[-4:].rjust(len(phone), '*'),
        "store_name": request.store_name,
        "whatsapp_verified": is_verified,
        "needs_verification": not is_verified,
        "verification_endpoint": "/api/whatsapp-otp/notifications/send" if not is_verified else None,
    }


@router.post("/verify-subscription")
async def verify_subscription(
    phone_number: str = Body(...),
    store_name: str = Body(...),
):
    """
    Mark a subscription as verified (called after OTP verification).
    
    This is typically called internally after /api/whatsapp-otp/notifications/verify succeeds.
    """
    db = get_db()
    phone = normalize_phone(phone_number)
    
    result = await db.notification_subscriptions.update_one(
        {"phone": phone, "store_name": store_name},
        {"$set": {
            "whatsapp_verified": True,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    
    if result.modified_count == 0:
        # Create new verified subscription with default preferences
        await db.notification_subscriptions.insert_one({
            "phone": phone,
            "store_name": store_name,
            "preferences": {k: v["default_enabled"] for k, v in NOTIFICATION_TYPES.items()},
            "is_active": True,
            "whatsapp_verified": True,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "subscribed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
    
    return {
        "success": True,
        "message": "Subscription verified",
        "phone": phone[-4:].rjust(len(phone), '*'),
    }


@router.get("/preferences")
async def get_preferences(
    phone_number: str = Query(..., description="Phone number"),
    store_name: str = Query(..., description="Store name"),
):
    """
    Get customer's notification preferences.
    """
    phone = normalize_phone(phone_number)
    subscription = await get_subscription(phone, store_name)
    
    if not subscription:
        return {
            "success": True,
            "subscribed": False,
            "message": "Not subscribed to notifications",
        }
    
    return {
        "success": True,
        "subscribed": True,
        "is_active": subscription.get("is_active", False),
        "whatsapp_verified": subscription.get("whatsapp_verified", False),
        "preferences": subscription.get("preferences", {}),
        "subscribed_at": subscription.get("subscribed_at"),
    }


@router.put("/preferences")
async def update_preferences(request: UpdatePreferencesRequest):
    """
    Update customer's notification preferences.
    """
    db = get_db()
    phone = normalize_phone(request.phone_number)
    
    subscription = await get_subscription(phone, request.store_name)
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    await db.notification_subscriptions.update_one(
        {"phone": phone, "store_name": request.store_name},
        {"$set": {
            "preferences": request.preferences.dict(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    
    return {
        "success": True,
        "message": "Preferences updated",
        "preferences": request.preferences.dict(),
    }


@router.post("/unsubscribe")
async def unsubscribe(request: UnsubscribeRequest):
    """
    Unsubscribe from WhatsApp notifications.
    """
    db = get_db()
    phone = normalize_phone(request.phone_number)
    
    result = await db.notification_subscriptions.update_one(
        {"phone": phone, "store_name": request.store_name},
        {"$set": {
            "is_active": False,
            "unsubscribed_at": datetime.now(timezone.utc).isoformat(),
            "unsubscribe_reason": request.reason,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    
    if result.modified_count == 0:
        return {
            "success": True,
            "message": "No active subscription found",
        }
    
    return {
        "success": True,
        "message": "Successfully unsubscribed from notifications",
    }


@router.get("/check")
async def check_notification_permission(
    phone_number: str = Query(...),
    store_name: str = Query(...),
    notification_type: str = Query(...),
):
    """
    Check if a customer can receive a specific notification type.
    
    Use this before sending any notification to ensure compliance.
    """
    phone = normalize_phone(phone_number)
    is_allowed = await is_subscribed(phone, store_name, notification_type)
    
    return {
        "phone": phone[-4:].rjust(len(phone), '*'),
        "notification_type": notification_type,
        "is_allowed": is_allowed,
    }


# ==================== Store Settings ====================

@router.get("/store-settings/{store_name}")
async def get_store_notification_settings(store_name: str):
    """
    Get store's notification settings.
    """
    db = get_db()
    
    settings = await db.store_notification_settings.find_one(
        {"store_name": store_name},
        {"_id": 0}
    )
    
    if not settings:
        # Return defaults
        settings = {
            "store_name": store_name,
            "auto_send_order_confirmed": True,
            "auto_send_order_shipped": True,
            "auto_send_order_delivered": True,
            "require_otp_verification": True,
            "default_language": "en",
        }
    
    return {"success": True, "settings": settings}


@router.put("/store-settings/{store_name}")
async def update_store_notification_settings(
    store_name: str,
    auto_send_order_confirmed: bool = Body(True),
    auto_send_order_shipped: bool = Body(True),
    auto_send_order_delivered: bool = Body(True),
    require_otp_verification: bool = Body(True),
    default_language: str = Body("en"),
):
    """
    Update store's notification settings.
    """
    db = get_db()
    
    settings = {
        "store_name": store_name,
        "auto_send_order_confirmed": auto_send_order_confirmed,
        "auto_send_order_shipped": auto_send_order_shipped,
        "auto_send_order_delivered": auto_send_order_delivered,
        "require_otp_verification": require_otp_verification,
        "default_language": default_language,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.store_notification_settings.update_one(
        {"store_name": store_name},
        {"$set": settings},
        upsert=True
    )
    
    return {"success": True, "settings": settings}


# ==================== Statistics ====================

@router.get("/stats/{store_name}")
async def get_notification_stats(store_name: str):
    """
    Get notification statistics for a store.
    """
    db = get_db()
    
    # Count subscriptions
    total_subscriptions = await db.notification_subscriptions.count_documents({
        "store_name": store_name
    })
    
    active_subscriptions = await db.notification_subscriptions.count_documents({
        "store_name": store_name,
        "is_active": True
    })
    
    verified_subscriptions = await db.notification_subscriptions.count_documents({
        "store_name": store_name,
        "is_active": True,
        "whatsapp_verified": True
    })
    
    # Count notifications sent (from logs)
    notifications_sent = await db.notification_logs.count_documents({
        "store_name": store_name
    })
    
    return {
        "success": True,
        "store_name": store_name,
        "stats": {
            "total_subscriptions": total_subscriptions,
            "active_subscriptions": active_subscriptions,
            "verified_subscriptions": verified_subscriptions,
            "unverified_subscriptions": active_subscriptions - verified_subscriptions,
            "notifications_sent": notifications_sent,
        }
    }
