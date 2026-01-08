"""
Auto Order Notifications Service
Automatically sends WhatsApp notifications for order events
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
import httpx

logger = logging.getLogger(__name__)

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


def get_whatsapp_config():
    """Get WhatsApp Business API configuration"""
    return {
        "phone_number_id": os.environ.get("WHATSAPP_PHONE_NUMBER_ID", ""),
        "access_token": os.environ.get("WHATSAPP_ACCESS_TOKEN", ""),
        "api_version": "v22.0",
        "api_url": "https://graph.facebook.com"
    }


def normalize_phone(phone: str) -> str:
    """Normalize phone number to international format"""
    if not phone:
        return ""
    phone = str(phone).replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not phone.startswith("+"):
        if phone.startswith("0"):
            phone = "+91" + phone[1:]
        elif len(phone) == 10:
            phone = "+91" + phone
        else:
            phone = "+" + phone
    return phone


async def is_notification_allowed(phone: str, store_name: str, notification_type: str) -> bool:
    """Check if customer has opted in for this notification type"""
    db = get_db()
    phone = normalize_phone(phone)
    
    subscription = await db.notification_subscriptions.find_one({
        "phone": phone,
        "store_name": store_name,
        "is_active": True,
        "whatsapp_verified": True,
    })
    
    if not subscription:
        return False
    
    preferences = subscription.get("preferences", {})
    return preferences.get(notification_type, False)


async def send_whatsapp_message(phone: str, message: str, store_name: str = None) -> Dict:
    """Send WhatsApp text message"""
    config = get_whatsapp_config()
    
    if not config["access_token"] or not config["phone_number_id"]:
        logger.warning("WhatsApp not configured")
        return {"success": False, "error": "WhatsApp not configured"}
    
    phone = normalize_phone(phone).replace("+", "")
    
    url = f"{config['api_url']}/{config['api_version']}/{config['phone_number_id']}/messages"
    headers = {
        "Authorization": f"Bearer {config['access_token']}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone,
        "type": "text",
        "text": {"body": message}
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            result = response.json()
            
            if response.status_code == 200 and result.get("messages"):
                return {
                    "success": True,
                    "message_id": result["messages"][0].get("id")
                }
            else:
                error_msg = result.get("error", {}).get("message", "Unknown error")
                logger.error(f"WhatsApp send failed: {error_msg}")
                return {"success": False, "error": error_msg}
    except Exception as e:
        logger.error(f"WhatsApp send error: {e}")
        return {"success": False, "error": str(e)}


async def log_notification(
    phone: str,
    store_name: str,
    notification_type: str,
    order_id: str,
    success: bool,
    message_id: str = None,
    error: str = None
):
    """Log notification for analytics"""
    db = get_db()
    
    await db.notification_logs.insert_one({
        "phone": normalize_phone(phone),
        "store_name": store_name,
        "notification_type": notification_type,
        "order_id": order_id,
        "success": success,
        "message_id": message_id,
        "error": error,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    })


# ==================== Order Event Handlers ====================

async def send_order_confirmed_notification(
    phone: str,
    store_name: str,
    order_id: str,
    order_number: str,
    total_amount: str,
    currency: str = "INR",
    customer_name: str = None,
    items_count: int = None,
) -> Dict:
    """
    Send order confirmation notification.
    Called when a new order is placed.
    """
    # Check if notification is allowed
    if not await is_notification_allowed(phone, store_name, "order_confirmed"):
        logger.info(f"Order confirmation notification not allowed for {phone[-4:]}")
        return {"success": False, "reason": "notification_not_allowed"}
    
    # Build message
    greeting = f"Hi {customer_name}! " if customer_name else ""
    items_text = f" ({items_count} items)" if items_count else ""
    
    message = f"""🛍️ *Order Confirmed!*

{greeting}Thank you for your order!

📦 *Order #:* {order_number}
💰 *Total:* {currency} {total_amount}{items_text}

We're preparing your order and will notify you when it ships.

Thank you for shopping with us! 🙏"""

    result = await send_whatsapp_message(phone, message, store_name)
    
    await log_notification(
        phone=phone,
        store_name=store_name,
        notification_type="order_confirmed",
        order_id=order_id,
        success=result.get("success", False),
        message_id=result.get("message_id"),
        error=result.get("error"),
    )
    
    return result


async def send_order_shipped_notification(
    phone: str,
    store_name: str,
    order_id: str,
    order_number: str,
    tracking_number: str = None,
    tracking_url: str = None,
    courier_name: str = None,
    estimated_delivery: str = None,
    customer_name: str = None,
) -> Dict:
    """
    Send shipping notification with tracking details.
    Called when order is marked as shipped/fulfilled.
    """
    if not await is_notification_allowed(phone, store_name, "order_shipped"):
        logger.info(f"Shipping notification not allowed for {phone[-4:]}")
        return {"success": False, "reason": "notification_not_allowed"}
    
    greeting = f"Hi {customer_name}! " if customer_name else ""
    
    message = f"""📦 *Order Shipped!*

{greeting}Great news! Your order is on the way!

🔢 *Order #:* {order_number}"""

    if courier_name:
        message += f"\n🚚 *Courier:* {courier_name}"
    
    if tracking_number:
        message += f"\n📍 *Tracking #:* {tracking_number}"
    
    if tracking_url:
        message += f"\n🔗 *Track here:* {tracking_url}"
    
    if estimated_delivery:
        message += f"\n📅 *Expected:* {estimated_delivery}"
    
    message += "\n\nWe'll notify you when it's out for delivery! 🚀"

    result = await send_whatsapp_message(phone, message, store_name)
    
    await log_notification(
        phone=phone,
        store_name=store_name,
        notification_type="order_shipped",
        order_id=order_id,
        success=result.get("success", False),
        message_id=result.get("message_id"),
        error=result.get("error"),
    )
    
    return result


async def send_out_for_delivery_notification(
    phone: str,
    store_name: str,
    order_id: str,
    order_number: str,
    customer_name: str = None,
    delivery_agent: str = None,
    delivery_agent_phone: str = None,
) -> Dict:
    """
    Send out for delivery notification.
    Called when order is out for delivery.
    """
    if not await is_notification_allowed(phone, store_name, "order_out_for_delivery"):
        logger.info(f"Out for delivery notification not allowed for {phone[-4:]}")
        return {"success": False, "reason": "notification_not_allowed"}
    
    greeting = f"Hi {customer_name}! " if customer_name else ""
    
    message = f"""🚚 *Out for Delivery!*

{greeting}Your order is out for delivery today!

📦 *Order #:* {order_number}"""

    if delivery_agent:
        message += f"\n👤 *Delivery Partner:* {delivery_agent}"
    
    if delivery_agent_phone:
        message += f"\n📞 *Contact:* {delivery_agent_phone}"
    
    message += "\n\nPlease ensure someone is available to receive the package. 📬"

    result = await send_whatsapp_message(phone, message, store_name)
    
    await log_notification(
        phone=phone,
        store_name=store_name,
        notification_type="order_out_for_delivery",
        order_id=order_id,
        success=result.get("success", False),
        message_id=result.get("message_id"),
        error=result.get("error"),
    )
    
    return result


async def send_order_delivered_notification(
    phone: str,
    store_name: str,
    order_id: str,
    order_number: str,
    customer_name: str = None,
    review_url: str = None,
) -> Dict:
    """
    Send delivery confirmation notification.
    Called when order is marked as delivered.
    """
    if not await is_notification_allowed(phone, store_name, "order_delivered"):
        logger.info(f"Delivery notification not allowed for {phone[-4:]}")
        return {"success": False, "reason": "notification_not_allowed"}
    
    greeting = f"Hi {customer_name}! " if customer_name else ""
    
    message = f"""✅ *Order Delivered!*

{greeting}Your order has been delivered successfully!

📦 *Order #:* {order_number}

We hope you love your purchase! 💝"""

    if review_url:
        message += f"\n\n⭐ Share your feedback: {review_url}"
    
    message += "\n\nThank you for shopping with us! 🙏"

    result = await send_whatsapp_message(phone, message, store_name)
    
    await log_notification(
        phone=phone,
        store_name=store_name,
        notification_type="order_delivered",
        order_id=order_id,
        success=result.get("success", False),
        message_id=result.get("message_id"),
        error=result.get("error"),
    )
    
    return result


async def send_payment_reminder_notification(
    phone: str,
    store_name: str,
    order_id: str,
    order_number: str,
    amount_due: str,
    currency: str = "INR",
    customer_name: str = None,
    due_date: str = None,
) -> Dict:
    """
    Send payment reminder for COD orders.
    """
    if not await is_notification_allowed(phone, store_name, "payment_reminder"):
        logger.info(f"Payment reminder not allowed for {phone[-4:]}")
        return {"success": False, "reason": "notification_not_allowed"}
    
    greeting = f"Hi {customer_name}! " if customer_name else ""
    
    message = f"""💳 *Payment Reminder*

{greeting}Just a friendly reminder about your pending payment.

📦 *Order #:* {order_number}
💰 *Amount Due:* {currency} {amount_due}"""

    if due_date:
        message += f"\n📅 *Due Date:* {due_date}"
    
    message += "\n\nPlease keep the exact amount ready for a smooth delivery. 🙏"

    result = await send_whatsapp_message(phone, message, store_name)
    
    await log_notification(
        phone=phone,
        store_name=store_name,
        notification_type="payment_reminder",
        order_id=order_id,
        success=result.get("success", False),
        message_id=result.get("message_id"),
        error=result.get("error"),
    )
    
    return result


# ==================== Batch Processing ====================

async def process_order_event(
    event_type: str,
    order_data: Dict,
    store_name: str,
) -> Dict:
    """
    Process an order event and send appropriate notification.
    
    Args:
        event_type: 'confirmed', 'shipped', 'out_for_delivery', 'delivered'
        order_data: Order details dict
        store_name: Store name
    
    Returns:
        Result dict
    """
    # Extract customer phone
    customer = order_data.get("customer", {})
    phone = customer.get("phone") or order_data.get("phone") or order_data.get("shipping_address", {}).get("phone")
    
    if not phone:
        logger.warning(f"No phone number for order {order_data.get('order_number')}")
        return {"success": False, "error": "No phone number"}
    
    order_id = str(order_data.get("id") or order_data.get("order_id") or "")
    order_number = str(order_data.get("order_number") or order_data.get("name", "").replace("#", "") or order_id)
    customer_name = customer.get("first_name") or order_data.get("customer_name")
    
    if event_type == "confirmed":
        return await send_order_confirmed_notification(
            phone=phone,
            store_name=store_name,
            order_id=order_id,
            order_number=order_number,
            total_amount=str(order_data.get("total_price", "0")),
            currency=order_data.get("currency", "INR"),
            customer_name=customer_name,
            items_count=len(order_data.get("line_items", [])),
        )
    
    elif event_type == "shipped":
        # Get tracking info from fulfillment
        fulfillments = order_data.get("fulfillments", [])
        tracking_number = None
        tracking_url = None
        courier_name = None
        
        if fulfillments:
            latest = fulfillments[-1]
            tracking_number = latest.get("tracking_number")
            tracking_url = latest.get("tracking_url")
            courier_name = latest.get("tracking_company")
        
        return await send_order_shipped_notification(
            phone=phone,
            store_name=store_name,
            order_id=order_id,
            order_number=order_number,
            tracking_number=tracking_number,
            tracking_url=tracking_url,
            courier_name=courier_name,
            customer_name=customer_name,
        )
    
    elif event_type == "out_for_delivery":
        return await send_out_for_delivery_notification(
            phone=phone,
            store_name=store_name,
            order_id=order_id,
            order_number=order_number,
            customer_name=customer_name,
        )
    
    elif event_type == "delivered":
        return await send_order_delivered_notification(
            phone=phone,
            store_name=store_name,
            order_id=order_id,
            order_number=order_number,
            customer_name=customer_name,
        )
    
    else:
        return {"success": False, "error": f"Unknown event type: {event_type}"}


# ==================== Webhook Handler ====================

async def handle_shopify_order_webhook(
    event_type: str,
    order_data: Dict,
    store_name: str,
) -> Dict:
    """
    Handle Shopify order webhook and trigger notifications.
    
    This should be called from your Shopify webhook handler.
    
    Args:
        event_type: Shopify event like 'orders/create', 'orders/fulfilled'
        order_data: Webhook payload
        store_name: Store name
    """
    db = get_db()
    
    # Check store settings
    settings = await db.store_notification_settings.find_one({"store_name": store_name})
    
    if event_type == "orders/create":
        if settings and not settings.get("auto_send_order_confirmed", True):
            return {"success": False, "reason": "auto_notifications_disabled"}
        return await process_order_event("confirmed", order_data, store_name)
    
    elif event_type == "orders/fulfilled":
        if settings and not settings.get("auto_send_order_shipped", True):
            return {"success": False, "reason": "auto_notifications_disabled"}
        return await process_order_event("shipped", order_data, store_name)
    
    elif event_type == "fulfillments/update":
        # Check fulfillment status
        status = order_data.get("status", "").lower()
        if status == "delivered":
            if settings and not settings.get("auto_send_order_delivered", True):
                return {"success": False, "reason": "auto_notifications_disabled"}
            return await process_order_event("delivered", order_data, store_name)
    
    return {"success": False, "reason": "unhandled_event"}
