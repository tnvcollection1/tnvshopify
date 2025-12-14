"""
Shopify Order Webhook Handler
Receives order events from Shopify and triggers WhatsApp notifications
"""

import os
import hmac
import hashlib
import base64
import httpx
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request, Header, BackgroundTasks
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "shopifycrm")
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# WhatsApp Cloud API settings
WHATSAPP_API_VERSION = "v21.0"
WHATSAPP_API_URL = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}"

# Router
shopify_webhooks_router = APIRouter(prefix="/shopify", tags=["Shopify Webhooks"])

# ==================== Pydantic Models ====================

class ShopifyAddress(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address1: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    country: Optional[str] = None
    zip: Optional[str] = None

class ShopifyLineItem(BaseModel):
    title: str
    quantity: int
    price: str
    sku: Optional[str] = None

class ShopifyOrder(BaseModel):
    id: int
    order_number: int
    name: str  # e.g., "#1001"
    email: Optional[str] = None
    phone: Optional[str] = None
    total_price: str
    currency: str = "INR"
    financial_status: Optional[str] = None
    fulfillment_status: Optional[str] = None
    created_at: str
    customer: Optional[Dict] = None
    billing_address: Optional[ShopifyAddress] = None
    shipping_address: Optional[ShopifyAddress] = None
    line_items: List[ShopifyLineItem] = []

class NotificationSettings(BaseModel):
    enabled: bool = True
    on_order_created: bool = True
    on_order_paid: bool = True
    on_order_fulfilled: bool = True
    on_order_cancelled: bool = False
    template_order_created: str = "order_confirmation"
    template_order_paid: str = "payment_received"
    template_order_fulfilled: str = "order_shipped"
    template_order_cancelled: str = "order_cancelled"

# ==================== Helper Functions ====================

def verify_shopify_webhook(data: bytes, hmac_header: str, secret: str) -> bool:
    """Verify Shopify webhook signature"""
    if not secret or not hmac_header:
        return False
    
    calculated_hmac = base64.b64encode(
        hmac.new(secret.encode('utf-8'), data, hashlib.sha256).digest()
    ).decode('utf-8')
    
    return hmac.compare_digest(calculated_hmac, hmac_header)

def normalize_phone_number(phone: str, country_code: str = "91") -> Optional[str]:
    """Normalize phone number to WhatsApp format (with country code, no +)"""
    if not phone:
        return None
    
    # Remove all non-numeric characters
    phone = ''.join(filter(str.isdigit, phone))
    
    # If starts with 0, remove it
    if phone.startswith('0'):
        phone = phone[1:]
    
    # If doesn't have country code, add it
    if len(phone) == 10:
        phone = country_code + phone
    
    # Remove leading + if present
    if phone.startswith('+'):
        phone = phone[1:]
    
    return phone if len(phone) >= 10 else None

async def get_store_whatsapp_account(store_id: str) -> Optional[Dict]:
    """Get the WhatsApp account linked to a store"""
    account = await db.whatsapp_business_accounts.find_one(
        {"store_id": store_id, "is_active": True},
        {"_id": 0}
    )
    return account

async def get_notification_settings(store_id: str) -> NotificationSettings:
    """Get notification settings for a store"""
    settings = await db.notification_settings.find_one(
        {"store_id": store_id},
        {"_id": 0}
    )
    if settings:
        return NotificationSettings(**settings)
    return NotificationSettings()  # Default settings

async def get_message_template(store_id: str, template_name: str) -> Optional[Dict]:
    """Get a message template for a store"""
    # First check store-specific template
    template = await db.whatsapp_templates.find_one(
        {"store_id": store_id, "name": template_name, "status": "APPROVED"},
        {"_id": 0}
    )
    
    # If not found, check default templates
    if not template:
        template = await db.whatsapp_templates.find_one(
            {"is_default": True, "name": template_name, "status": "APPROVED"},
            {"_id": 0}
        )
    
    return template

async def send_whatsapp_message(
    phone_number_id: str,
    access_token: str,
    to_phone: str,
    template_name: str,
    template_params: List[str] = None,
    language_code: str = "en"
) -> Dict:
    """Send a WhatsApp template message"""
    url = f"{WHATSAPP_API_URL}/{phone_number_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Build template components
    components = []
    if template_params:
        body_params = [{"type": "text", "text": str(param)} for param in template_params]
        components.append({
            "type": "body",
            "parameters": body_params
        })
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
            "components": components if components else []
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        return response.json()

async def log_notification(
    store_id: str,
    order_id: str,
    order_number: str,
    customer_phone: str,
    template_name: str,
    status: str,
    response_data: Dict = None,
    error: str = None
):
    """Log notification attempt to database"""
    log_entry = {
        "id": str(uuid4()),
        "store_id": store_id,
        "order_id": order_id,
        "order_number": order_number,
        "customer_phone": customer_phone,
        "template_name": template_name,
        "status": status,  # sent, failed, skipped
        "response": response_data,
        "error": error,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notification_logs.insert_one(log_entry)

# ==================== Background Task ====================

async def process_order_notification(
    store_id: str,
    order: ShopifyOrder,
    event_type: str  # order_created, order_paid, order_fulfilled, order_cancelled
):
    """Process and send order notification (runs in background)"""
    try:
        # Get notification settings
        settings = await get_notification_settings(store_id)
        
        if not settings.enabled:
            logger.info(f"Notifications disabled for store {store_id}")
            return
        
        # Check if this event type is enabled
        event_enabled = {
            "order_created": settings.on_order_created,
            "order_paid": settings.on_order_paid,
            "order_fulfilled": settings.on_order_fulfilled,
            "order_cancelled": settings.on_order_cancelled
        }
        
        if not event_enabled.get(event_type, False):
            logger.info(f"Event {event_type} notifications disabled for store {store_id}")
            return
        
        # Get customer phone number
        customer_phone = order.phone
        if not customer_phone and order.shipping_address:
            customer_phone = order.shipping_address.phone
        if not customer_phone and order.billing_address:
            customer_phone = order.billing_address.phone
        if not customer_phone and order.customer:
            customer_phone = order.customer.get("phone")
        
        if not customer_phone:
            logger.warning(f"No phone number for order {order.name}")
            await log_notification(
                store_id=store_id,
                order_id=str(order.id),
                order_number=order.name,
                customer_phone="",
                template_name="",
                status="skipped",
                error="No customer phone number"
            )
            return
        
        # Normalize phone number
        normalized_phone = normalize_phone_number(customer_phone)
        if not normalized_phone:
            logger.warning(f"Invalid phone number: {customer_phone}")
            await log_notification(
                store_id=store_id,
                order_id=str(order.id),
                order_number=order.name,
                customer_phone=customer_phone,
                template_name="",
                status="skipped",
                error="Invalid phone number format"
            )
            return
        
        # Get WhatsApp account for this store
        wa_account = await get_store_whatsapp_account(store_id)
        if not wa_account:
            logger.warning(f"No WhatsApp account for store {store_id}")
            await log_notification(
                store_id=store_id,
                order_id=str(order.id),
                order_number=order.name,
                customer_phone=normalized_phone,
                template_name="",
                status="skipped",
                error="No WhatsApp account linked to store"
            )
            return
        
        # Get template name for this event
        template_mapping = {
            "order_created": settings.template_order_created,
            "order_paid": settings.template_order_paid,
            "order_fulfilled": settings.template_order_fulfilled,
            "order_cancelled": settings.template_order_cancelled
        }
        template_name = template_mapping.get(event_type, "order_confirmation")
        
        # Get customer name
        customer_name = "Customer"
        if order.shipping_address:
            customer_name = f"{order.shipping_address.first_name or ''} {order.shipping_address.last_name or ''}".strip()
        elif order.billing_address:
            customer_name = f"{order.billing_address.first_name or ''} {order.billing_address.last_name or ''}".strip()
        elif order.customer:
            customer_name = f"{order.customer.get('first_name', '')} {order.customer.get('last_name', '')}".strip()
        
        if not customer_name:
            customer_name = "Customer"
        
        # Build template parameters based on event type
        if event_type == "order_created":
            template_params = [
                customer_name,
                order.name,  # Order number
                f"{order.currency} {order.total_price}"
            ]
        elif event_type == "order_paid":
            template_params = [
                customer_name,
                order.name,
                f"{order.currency} {order.total_price}"
            ]
        elif event_type == "order_fulfilled":
            template_params = [
                customer_name,
                order.name
            ]
        elif event_type == "order_cancelled":
            template_params = [
                customer_name,
                order.name
            ]
        else:
            template_params = [customer_name, order.name]
        
        # Send WhatsApp message
        response = await send_whatsapp_message(
            phone_number_id=wa_account["phone_number_id"],
            access_token=wa_account["access_token"],
            to_phone=normalized_phone,
            template_name=template_name,
            template_params=template_params
        )
        
        # Log the notification
        if "error" in response:
            logger.error(f"WhatsApp API error: {response}")
            await log_notification(
                store_id=store_id,
                order_id=str(order.id),
                order_number=order.name,
                customer_phone=normalized_phone,
                template_name=template_name,
                status="failed",
                response_data=response,
                error=response.get("error", {}).get("message", "Unknown error")
            )
        else:
            logger.info(f"Notification sent for order {order.name} to {normalized_phone}")
            await log_notification(
                store_id=store_id,
                order_id=str(order.id),
                order_number=order.name,
                customer_phone=normalized_phone,
                template_name=template_name,
                status="sent",
                response_data=response
            )
            
            # Update WhatsApp message count
            await db.whatsapp_messages.insert_one({
                "id": str(uuid4()),
                "store_id": store_id,
                "tenant_id": wa_account.get("tenant_id"),
                "type": "outbound",
                "template_name": template_name,
                "to_phone": normalized_phone,
                "order_id": str(order.id),
                "order_number": order.name,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "message_id": response.get("messages", [{}])[0].get("id")
            })
    
    except Exception as e:
        logger.error(f"Error processing notification: {str(e)}")
        await log_notification(
            store_id=store_id,
            order_id=str(order.id),
            order_number=order.name,
            customer_phone="",
            template_name="",
            status="failed",
            error=str(e)
        )

# ==================== Webhook Endpoints ====================

@shopify_webhooks_router.post("/webhook/orders/create")
async def handle_order_created(
    request: Request,
    background_tasks: BackgroundTasks,
    x_shopify_hmac_sha256: str = Header(None),
    x_shopify_shop_domain: str = Header(None)
):
    """Handle Shopify order created webhook"""
    body = await request.body()
    
    # Find store by shop domain
    store = await db.stores.find_one(
        {"shopify_domain": x_shopify_shop_domain},
        {"_id": 0}
    )
    
    if not store:
        logger.warning(f"Store not found for domain: {x_shopify_shop_domain}")
        # Still return 200 to prevent Shopify from retrying
        return {"status": "ok", "message": "Store not found"}
    
    # Verify webhook signature if secret is configured
    webhook_secret = store.get("shopify_webhook_secret")
    if webhook_secret and x_shopify_hmac_sha256:
        if not verify_shopify_webhook(body, x_shopify_hmac_sha256, webhook_secret):
            logger.warning("Invalid webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    try:
        order_data = await request.json()
        order = ShopifyOrder(**order_data)
        
        # Store order in database
        await db.orders.update_one(
            {"shopify_id": order.id, "store_id": store["id"]},
            {"$set": {
                "shopify_id": order.id,
                "store_id": store["id"],
                "order_number": order.name,
                "email": order.email,
                "phone": order.phone,
                "total_price": order.total_price,
                "currency": order.currency,
                "financial_status": order.financial_status,
                "fulfillment_status": order.fulfillment_status,
                "customer": order.customer,
                "shipping_address": order.shipping_address.dict() if order.shipping_address else None,
                "line_items": [item.dict() for item in order.line_items],
                "created_at": order.created_at,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        # Send notification in background
        background_tasks.add_task(
            process_order_notification,
            store["id"],
            order,
            "order_created"
        )
        
        return {"status": "ok", "order_id": order.id}
    
    except Exception as e:
        logger.error(f"Error processing order webhook: {str(e)}")
        return {"status": "error", "message": str(e)}

@shopify_webhooks_router.post("/webhook/orders/paid")
async def handle_order_paid(
    request: Request,
    background_tasks: BackgroundTasks,
    x_shopify_hmac_sha256: str = Header(None),
    x_shopify_shop_domain: str = Header(None)
):
    """Handle Shopify order paid webhook"""
    body = await request.body()
    
    store = await db.stores.find_one(
        {"shopify_domain": x_shopify_shop_domain},
        {"_id": 0}
    )
    
    if not store:
        return {"status": "ok", "message": "Store not found"}
    
    try:
        order_data = await request.json()
        order = ShopifyOrder(**order_data)
        
        # Update order status
        await db.orders.update_one(
            {"shopify_id": order.id, "store_id": store["id"]},
            {"$set": {
                "financial_status": "paid",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Send notification in background
        background_tasks.add_task(
            process_order_notification,
            store["id"],
            order,
            "order_paid"
        )
        
        return {"status": "ok", "order_id": order.id}
    
    except Exception as e:
        logger.error(f"Error processing paid webhook: {str(e)}")
        return {"status": "error", "message": str(e)}

@shopify_webhooks_router.post("/webhook/orders/fulfilled")
async def handle_order_fulfilled(
    request: Request,
    background_tasks: BackgroundTasks,
    x_shopify_hmac_sha256: str = Header(None),
    x_shopify_shop_domain: str = Header(None)
):
    """Handle Shopify order fulfilled webhook"""
    body = await request.body()
    
    store = await db.stores.find_one(
        {"shopify_domain": x_shopify_shop_domain},
        {"_id": 0}
    )
    
    if not store:
        return {"status": "ok", "message": "Store not found"}
    
    try:
        order_data = await request.json()
        order = ShopifyOrder(**order_data)
        
        # Update order status
        await db.orders.update_one(
            {"shopify_id": order.id, "store_id": store["id"]},
            {"$set": {
                "fulfillment_status": "fulfilled",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Send notification in background
        background_tasks.add_task(
            process_order_notification,
            store["id"],
            order,
            "order_fulfilled"
        )
        
        return {"status": "ok", "order_id": order.id}
    
    except Exception as e:
        logger.error(f"Error processing fulfilled webhook: {str(e)}")
        return {"status": "error", "message": str(e)}

@shopify_webhooks_router.post("/webhook/orders/cancelled")
async def handle_order_cancelled(
    request: Request,
    background_tasks: BackgroundTasks,
    x_shopify_hmac_sha256: str = Header(None),
    x_shopify_shop_domain: str = Header(None)
):
    """Handle Shopify order cancelled webhook"""
    body = await request.body()
    
    store = await db.stores.find_one(
        {"shopify_domain": x_shopify_shop_domain},
        {"_id": 0}
    )
    
    if not store:
        return {"status": "ok", "message": "Store not found"}
    
    try:
        order_data = await request.json()
        order = ShopifyOrder(**order_data)
        
        # Update order status
        await db.orders.update_one(
            {"shopify_id": order.id, "store_id": store["id"]},
            {"$set": {
                "cancelled_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Send notification in background
        background_tasks.add_task(
            process_order_notification,
            store["id"],
            order,
            "order_cancelled"
        )
        
        return {"status": "ok", "order_id": order.id}
    
    except Exception as e:
        logger.error(f"Error processing cancelled webhook: {str(e)}")
        return {"status": "error", "message": str(e)}

# ==================== Settings & Logs Endpoints ====================

@shopify_webhooks_router.get("/notification-settings/{store_id}")
async def get_store_notification_settings(store_id: str):
    """Get notification settings for a store"""
    settings = await db.notification_settings.find_one(
        {"store_id": store_id},
        {"_id": 0}
    )
    
    if not settings:
        # Return default settings
        settings = NotificationSettings().dict()
        settings["store_id"] = store_id
    
    return {"success": True, "settings": settings}

@shopify_webhooks_router.post("/notification-settings/{store_id}")
async def update_notification_settings(store_id: str, settings: NotificationSettings):
    """Update notification settings for a store"""
    await db.notification_settings.update_one(
        {"store_id": store_id},
        {"$set": {**settings.dict(), "store_id": store_id, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Settings updated"}

@shopify_webhooks_router.get("/notification-logs/{store_id}")
async def get_notification_logs(store_id: str, limit: int = 50, status: str = None):
    """Get notification logs for a store"""
    query = {"store_id": store_id}
    if status:
        query["status"] = status
    
    logs = await db.notification_logs.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "logs": logs,
        "count": len(logs)
    }

@shopify_webhooks_router.post("/test-notification/{store_id}")
async def send_test_notification(
    store_id: str,
    phone: str,
    template_name: str = "order_confirmation",
    background_tasks: BackgroundTasks = None
):
    """Send a test notification to verify setup"""
    # Get WhatsApp account
    wa_account = await get_store_whatsapp_account(store_id)
    if not wa_account:
        raise HTTPException(status_code=400, detail="No WhatsApp account linked to this store")
    
    # Normalize phone
    normalized_phone = normalize_phone_number(phone)
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Send test message
    try:
        response = await send_whatsapp_message(
            phone_number_id=wa_account["phone_number_id"],
            access_token=wa_account["access_token"],
            to_phone=normalized_phone,
            template_name=template_name,
            template_params=["Test Customer", "#TEST-001", "INR 999"]
        )
        
        if "error" in response:
            return {
                "success": False,
                "error": response.get("error", {}).get("message", "Unknown error"),
                "response": response
            }
        
        return {
            "success": True,
            "message": f"Test notification sent to {normalized_phone}",
            "response": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Webhook URLs Info ====================

@shopify_webhooks_router.get("/webhook-urls")
async def get_webhook_urls():
    """Get webhook URLs to configure in Shopify"""
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://importbaba.com")
    
    return {
        "success": True,
        "webhooks": {
            "orders/create": f"{base_url}/api/shopify/webhook/orders/create",
            "orders/paid": f"{base_url}/api/shopify/webhook/orders/paid",
            "orders/fulfilled": f"{base_url}/api/shopify/webhook/orders/fulfilled",
            "orders/cancelled": f"{base_url}/api/shopify/webhook/orders/cancelled"
        },
        "instructions": [
            "1. Go to Shopify Admin → Settings → Notifications",
            "2. Click 'Create webhook' for each event",
            "3. Set format to 'JSON'",
            "4. Paste the corresponding webhook URL",
            "5. Save the webhook"
        ]
    }
