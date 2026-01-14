from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
import httpx

router = APIRouter(prefix="/api/push-notifications", tags=["Push Notifications"])

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "wamerce")

from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ==================== Models ====================
class DeviceRegistration(BaseModel):
    customer_id: str
    push_token: str
    platform: str  # 'ios' or 'android'
    device_name: Optional[str] = None
    store: str = "tnvcollection"


class PushNotification(BaseModel):
    title: str
    body: str
    data: Optional[dict] = {}
    badge: Optional[int] = None
    sound: Optional[str] = "default"


class BulkNotification(BaseModel):
    customer_ids: List[str]
    notification: PushNotification
    store: Optional[str] = None


class NotificationCampaign(BaseModel):
    name: str
    notification: PushNotification
    target: str  # 'all', 'store', 'segment'
    store: Optional[str] = None
    segment: Optional[str] = None  # e.g., 'cart_abandoners', 'high_value'
    scheduled_at: Optional[datetime] = None


# ==================== Device Registration ====================
@router.post("/register")
async def register_device(data: DeviceRegistration):
    """Register a device for push notifications"""
    
    # Check if token already registered
    existing = await db.push_devices.find_one({
        "push_token": data.push_token
    })
    
    if existing:
        # Update existing registration
        await db.push_devices.update_one(
            {"push_token": data.push_token},
            {
                "$set": {
                    "customer_id": data.customer_id,
                    "platform": data.platform,
                    "device_name": data.device_name,
                    "store": data.store,
                    "updated_at": datetime.now(timezone.utc),
                    "is_active": True
                }
            }
        )
        return {"success": True, "message": "Device registration updated"}
    
    # Create new registration
    device = {
        "customer_id": data.customer_id,
        "push_token": data.push_token,
        "platform": data.platform,
        "device_name": data.device_name,
        "store": data.store,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.push_devices.insert_one(device)
    return {"success": True, "message": "Device registered successfully"}


@router.delete("/unregister/{push_token}")
async def unregister_device(push_token: str):
    """Unregister a device from push notifications"""
    
    result = await db.push_devices.update_one(
        {"push_token": push_token},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    
    return {"success": True, "message": "Device unregistered"}


# ==================== Send Notifications ====================
async def send_expo_notification(push_token: str, notification: PushNotification):
    """Send a notification via Expo Push API"""
    
    message = {
        "to": push_token,
        "title": notification.title,
        "body": notification.body,
        "data": notification.data or {},
        "sound": notification.sound,
    }
    
    if notification.badge is not None:
        message["badge"] = notification.badge
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=message,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                timeout=30
            )
            
            result = response.json()
            
            # Log notification attempt
            await db.push_notification_logs.insert_one({
                "push_token": push_token,
                "notification": notification.dict(),
                "response": result,
                "status": "sent" if response.status_code == 200 else "failed",
                "created_at": datetime.now(timezone.utc)
            })
            
            return result
        except Exception as e:
            await db.push_notification_logs.insert_one({
                "push_token": push_token,
                "notification": notification.dict(),
                "error": str(e),
                "status": "error",
                "created_at": datetime.now(timezone.utc)
            })
            return {"error": str(e)}


@router.post("/send/{customer_id}")
async def send_notification_to_customer(
    customer_id: str, 
    notification: PushNotification,
    background_tasks: BackgroundTasks
):
    """Send a push notification to a specific customer"""
    
    # Get all active devices for customer
    devices = await db.push_devices.find({
        "customer_id": customer_id,
        "is_active": True
    }).to_list(10)
    
    if not devices:
        raise HTTPException(status_code=404, detail="No registered devices for customer")
    
    # Send to all devices in background
    results = []
    for device in devices:
        result = await send_expo_notification(device["push_token"], notification)
        results.append({
            "device": device["device_name"],
            "platform": device["platform"],
            "result": result
        })
    
    return {
        "success": True,
        "devices_notified": len(results),
        "results": results
    }


@router.post("/send-bulk")
async def send_bulk_notification(data: BulkNotification, background_tasks: BackgroundTasks):
    """Send notifications to multiple customers"""
    
    query = {"is_active": True}
    
    if data.customer_ids:
        query["customer_id"] = {"$in": data.customer_ids}
    
    if data.store:
        query["store"] = data.store
    
    devices = await db.push_devices.find(query).to_list(1000)
    
    if not devices:
        return {"success": True, "devices_notified": 0}
    
    # Send in background
    for device in devices:
        background_tasks.add_task(
            send_expo_notification,
            device["push_token"],
            data.notification
        )
    
    return {
        "success": True,
        "devices_queued": len(devices)
    }


# ==================== Notification Templates ====================
NOTIFICATION_TEMPLATES = {
    "order_confirmed": {
        "title": "Order Confirmed! 🎉",
        "body": "Your order #{order_id} has been confirmed. We're preparing it for shipment."
    },
    "order_shipped": {
        "title": "Your Order is on the Way! 📦",
        "body": "Great news! Your order #{order_id} has been shipped. Track it now."
    },
    "order_delivered": {
        "title": "Order Delivered! ✅",
        "body": "Your order #{order_id} has been delivered. Enjoy your purchase!"
    },
    "back_in_stock": {
        "title": "Back in Stock! 🔔",
        "body": "{product_name} is now available. Get it before it's gone!"
    },
    "price_drop": {
        "title": "Price Drop Alert! 💰",
        "body": "{product_name} is now {price}. Save on your wishlist item!"
    },
    "cart_reminder": {
        "title": "Don't Forget Your Cart! 🛒",
        "body": "You have items waiting in your cart. Complete your purchase now!"
    },
    "promotion": {
        "title": "{promo_title}",
        "body": "{promo_body}"
    }
}


@router.post("/send-template/{template_name}/{customer_id}")
async def send_template_notification(
    template_name: str,
    customer_id: str,
    variables: dict = {}
):
    """Send a templated notification"""
    
    template = NOTIFICATION_TEMPLATES.get(template_name)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Format template with variables
    title = template["title"].format(**variables) if variables else template["title"]
    body = template["body"].format(**variables) if variables else template["body"]
    
    notification = PushNotification(
        title=title,
        body=body,
        data={
            "type": template_name,
            **variables
        }
    )
    
    # Get customer devices
    devices = await db.push_devices.find({
        "customer_id": customer_id,
        "is_active": True
    }).to_list(10)
    
    if not devices:
        return {"success": True, "devices_notified": 0, "message": "No devices registered"}
    
    results = []
    for device in devices:
        result = await send_expo_notification(device["push_token"], notification)
        results.append(result)
    
    return {
        "success": True,
        "devices_notified": len(results),
        "template": template_name
    }


# ==================== Order Status Notifications ====================
@router.post("/notify-order-status/{order_id}")
async def notify_order_status(order_id: str, status: str, customer_id: str):
    """Send notification for order status change"""
    
    template_map = {
        "confirmed": "order_confirmed",
        "processing": "order_confirmed",
        "shipped": "order_shipped",
        "delivered": "order_delivered"
    }
    
    template_name = template_map.get(status)
    if not template_name:
        return {"success": True, "message": f"No notification template for status: {status}"}
    
    return await send_template_notification(
        template_name,
        customer_id,
        {"order_id": order_id}
    )


# ==================== Analytics ====================
@router.get("/stats")
async def get_notification_stats(store: str = None, days: int = 30):
    """Get push notification statistics"""
    
    from datetime import timedelta
    
    since = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Count active devices
    device_query = {"is_active": True}
    if store:
        device_query["store"] = store
    
    active_devices = await db.push_devices.count_documents(device_query)
    
    # Count by platform
    platform_pipeline = [
        {"$match": device_query},
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}}
    ]
    platform_stats = {doc["_id"]: doc["count"] async for doc in db.push_devices.aggregate(platform_pipeline)}
    
    # Notification stats
    log_query = {"created_at": {"$gte": since}}
    if store:
        # Would need to join with devices collection
        pass
    
    total_sent = await db.push_notification_logs.count_documents({
        **log_query,
        "status": "sent"
    })
    total_failed = await db.push_notification_logs.count_documents({
        **log_query,
        "status": {"$in": ["failed", "error"]}
    })
    
    return {
        "active_devices": active_devices,
        "by_platform": platform_stats,
        "notifications_sent": total_sent,
        "notifications_failed": total_failed,
        "period_days": days
    }


@router.get("/devices/{customer_id}")
async def get_customer_devices(customer_id: str):
    """Get registered devices for a customer"""
    
    devices = await db.push_devices.find(
        {"customer_id": customer_id},
        {"_id": 0, "push_token": 0}  # Don't expose tokens
    ).to_list(10)
    
    return {
        "customer_id": customer_id,
        "devices": devices
    }
