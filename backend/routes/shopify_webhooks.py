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
    """Handle Shopify order paid webhook — also auto-pushes to InnoFulfill if enabled"""
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
        
        # Auto-push to InnoFulfill in background
        background_tasks.add_task(
            auto_push_to_innofulfill,
            order_data
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
        
        # Update order status with fulfilled_at timestamp
        fulfilled_at = datetime.now(timezone.utc).isoformat()
        await db.orders.update_one(
            {"shopify_id": order.id, "store_id": store["id"]},
            {"$set": {
                "fulfillment_status": "fulfilled",
                "fulfilled_at": fulfilled_at,
                "updated_at": fulfilled_at
            }}
        )
        
        # Also update in customers collection
        await db.customers.update_one(
            {"order_number": str(order.order_number)},
            {"$set": {
                "fulfillment_status": "fulfilled",
                "fulfilled_at": fulfilled_at
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

# ==================== Auto Webhook Registration ====================

SHOPIFY_API_VERSION = "2024-01"

async def register_shopify_webhook(
    shop_domain: str,
    access_token: str,
    topic: str,
    address: str
) -> Dict:
    """Register a single webhook with Shopify"""
    url = f"https://{shop_domain}/admin/api/{SHOPIFY_API_VERSION}/webhooks.json"
    
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json"
    }
    
    payload = {
        "webhook": {
            "topic": topic,
            "address": address,
            "format": "json"
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        return {
            "status_code": response.status_code,
            "data": response.json() if response.status_code < 500 else {"error": response.text}
        }

async def get_existing_webhooks(shop_domain: str, access_token: str) -> List[Dict]:
    """Get existing webhooks from Shopify"""
    url = f"https://{shop_domain}/admin/api/{SHOPIFY_API_VERSION}/webhooks.json"
    
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return response.json().get("webhooks", [])
        return []

async def delete_shopify_webhook(shop_domain: str, access_token: str, webhook_id: int) -> bool:
    """Delete a webhook from Shopify"""
    url = f"https://{shop_domain}/admin/api/{SHOPIFY_API_VERSION}/webhooks/{webhook_id}.json"
    
    headers = {
        "X-Shopify-Access-Token": access_token
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.delete(url, headers=headers)
        return response.status_code == 200

@shopify_webhooks_router.post("/register-webhooks/{store_id}")
async def register_webhooks_for_store(store_id: str):
    """Register all order webhooks for a specific store"""
    
    # Get store details
    store = await db.stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    shop_domain = store.get("shopify_domain")
    access_token = store.get("shopify_access_token")
    
    if not shop_domain or not access_token:
        raise HTTPException(
            status_code=400, 
            detail="Store missing Shopify domain or access token. Please configure Shopify API credentials first."
        )
    
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://importbaba.com")
    
    # Webhook topics and their addresses
    webhooks_to_register = {
        "orders/create": f"{base_url}/api/shopify/webhook/orders/create",
        "orders/paid": f"{base_url}/api/shopify/webhook/orders/paid",
        "orders/fulfilled": f"{base_url}/api/shopify/webhook/orders/fulfilled",
        "orders/cancelled": f"{base_url}/api/shopify/webhook/orders/cancelled"
    }
    
    results = []
    
    # Get existing webhooks to avoid duplicates
    existing_webhooks = await get_existing_webhooks(shop_domain, access_token)
    existing_topics = {wh.get("topic"): wh.get("id") for wh in existing_webhooks}
    
    for topic, address in webhooks_to_register.items():
        try:
            # Check if webhook already exists
            if topic in existing_topics:
                # Delete existing and re-register to update URL
                await delete_shopify_webhook(shop_domain, access_token, existing_topics[topic])
                logger.info(f"Deleted existing webhook for {topic}")
            
            # Register webhook
            result = await register_shopify_webhook(shop_domain, access_token, topic, address)
            
            if result["status_code"] == 201:
                results.append({
                    "topic": topic,
                    "status": "registered",
                    "webhook_id": result["data"].get("webhook", {}).get("id")
                })
            elif result["status_code"] == 422:
                # Already exists
                results.append({
                    "topic": topic,
                    "status": "already_exists",
                    "message": result["data"].get("errors", "Webhook already exists")
                })
            else:
                results.append({
                    "topic": topic,
                    "status": "failed",
                    "error": result["data"]
                })
        except Exception as e:
            results.append({
                "topic": topic,
                "status": "error",
                "error": str(e)
            })
    
    # Update store with webhook status
    await db.stores.update_one(
        {"id": store_id},
        {"$set": {
            "webhooks_configured": True,
            "webhooks_configured_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    success_count = sum(1 for r in results if r["status"] in ["registered", "already_exists"])
    
    return {
        "success": True,
        "store_id": store_id,
        "shop_domain": shop_domain,
        "results": results,
        "summary": {
            "total": len(webhooks_to_register),
            "successful": success_count,
            "failed": len(webhooks_to_register) - success_count
        }
    }

@shopify_webhooks_router.post("/register-webhooks-all")
async def register_webhooks_for_all_stores():
    """Register webhooks for ALL stores that have Shopify credentials"""
    
    # Get all stores with Shopify credentials
    stores = await db.stores.find(
        {
            "shopify_domain": {"$exists": True, "$ne": None},
            "shopify_access_token": {"$exists": True, "$ne": None}
        },
        {"_id": 0}
    ).to_list(100)
    
    if not stores:
        return {
            "success": False,
            "message": "No stores found with Shopify credentials configured"
        }
    
    results = []
    
    for store in stores:
        try:
            store_result = await register_webhooks_for_store(store["id"])
            results.append({
                "store_id": store["id"],
                "store_name": store.get("name", "Unknown"),
                "shop_domain": store.get("shopify_domain"),
                "status": "success",
                "details": store_result
            })
        except HTTPException as e:
            results.append({
                "store_id": store["id"],
                "store_name": store.get("name", "Unknown"),
                "shop_domain": store.get("shopify_domain"),
                "status": "failed",
                "error": e.detail
            })
        except Exception as e:
            results.append({
                "store_id": store["id"],
                "store_name": store.get("name", "Unknown"),
                "shop_domain": store.get("shopify_domain"),
                "status": "error",
                "error": str(e)
            })
    
    success_count = sum(1 for r in results if r["status"] == "success")
    
    return {
        "success": True,
        "total_stores": len(stores),
        "successful": success_count,
        "failed": len(stores) - success_count,
        "results": results
    }

@shopify_webhooks_router.get("/webhook-status/{store_id}")
async def get_webhook_status(store_id: str):
    """Get webhook registration status for a store"""
    
    store = await db.stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    shop_domain = store.get("shopify_domain")
    access_token = store.get("shopify_access_token")
    
    if not shop_domain or not access_token:
        return {
            "success": True,
            "configured": False,
            "message": "Shopify credentials not configured",
            "webhooks": []
        }
    
    try:
        existing_webhooks = await get_existing_webhooks(shop_domain, access_token)
        
        # Filter to only our webhooks
        base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://importbaba.com")
        our_webhooks = [
            wh for wh in existing_webhooks 
            if base_url in wh.get("address", "")
        ]
        
        return {
            "success": True,
            "configured": len(our_webhooks) > 0,
            "store_id": store_id,
            "shop_domain": shop_domain,
            "webhooks": [
                {
                    "id": wh.get("id"),
                    "topic": wh.get("topic"),
                    "address": wh.get("address"),
                    "created_at": wh.get("created_at")
                }
                for wh in our_webhooks
            ],
            "total_webhooks": len(our_webhooks)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@shopify_webhooks_router.delete("/webhooks/{store_id}")
async def remove_all_webhooks(store_id: str):
    """Remove all our webhooks from a store"""
    
    store = await db.stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    shop_domain = store.get("shopify_domain")
    access_token = store.get("shopify_access_token")
    
    if not shop_domain or not access_token:
        raise HTTPException(status_code=400, detail="Shopify credentials not configured")
    
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://importbaba.com")
    existing_webhooks = await get_existing_webhooks(shop_domain, access_token)
    
    removed = []
    for wh in existing_webhooks:
        if base_url in wh.get("address", ""):
            success = await delete_shopify_webhook(shop_domain, access_token, wh["id"])
            removed.append({
                "id": wh["id"],
                "topic": wh["topic"],
                "removed": success
            })
    
    # Update store
    await db.stores.update_one(
        {"id": store_id},
        {"$set": {"webhooks_configured": False}}
    )
    
    return {
        "success": True,
        "removed_count": len(removed),
        "details": removed
    }



# ==================== InnoFulfill Auto-Push ====================

from pymongo import MongoClient as SyncMongoClient

_sync_db = None
def _get_sync_db():
    global _sync_db
    if _sync_db is None:
        _sync_db = SyncMongoClient(MONGO_URL)[DB_NAME]
    return _sync_db


async def auto_push_to_innofulfill(order_data: dict):
    """
    Background task: auto-push a paid Shopify order to InnoFulfill.
    Checks settings to see if auto-push is enabled.
    """
    try:
        from services.innofulfill_service import push_order
        
        sync_db = _get_sync_db()
        
        # Check if auto-push is enabled
        settings = sync_db.logistics_settings.find_one({"key": "auto_push"}, {"_id": 0})
        if not settings or not settings.get("enabled", False):
            logger.info("InnoFulfill auto-push is disabled, skipping")
            return
        
        order_number = order_data.get("order_number", order_data.get("id"))
        order_id_str = str(order_number)
        
        # Check if already booked
        existing = sync_db.logistics_bookings.find_one({"order_id": order_id_str}, {"_id": 0})
        if existing:
            logger.info(f"Order #{order_number} already booked, skipping auto-push")
            return
        
        # Build shipping address
        shipping = order_data.get("shipping_address", {}) or {}
        ship_addr = {
            "name": f"{shipping.get('first_name', '')} {shipping.get('last_name', '')}".strip() or "Customer",
            "phone": (order_data.get("phone") or shipping.get("phone") or "").replace(" ", "").replace("+91", ""),
            "address1": shipping.get("address1", "N/A"),
            "city": shipping.get("city", ""),
            "state": shipping.get("province", shipping.get("state", "")),
            "country": "India",
            "zip": shipping.get("zip", "000000"),
        }
        
        # Build line items
        items = order_data.get("line_items", []) or []
        total_weight = 0
        line_items = []
        total_price = 0
        for item in items:
            qty = item.get("quantity", 1)
            price = float(item.get("price", 0))
            weight = item.get("grams", 500)
            total_weight += weight * qty
            total_price += price * qty
            line_items.append({
                "name": item.get("title", item.get("name", "Product")),
                "weight": weight,
                "quantity": qty,
                "unitPrice": price,
                "price": price * qty,
                "sku": item.get("sku", ""),
            })
        
        if not line_items:
            total_price = float(order_data.get("total_price", 0))
            line_items = [{"name": "Product", "weight": 500, "quantity": 1, "unitPrice": total_price, "price": total_price, "sku": ""}]
            total_weight = 500
        
        # Get pickup defaults from settings
        pickup = settings.get("pickup", {})
        delivery_type = settings.get("delivery_type", "SURFACE")
        
        financial = order_data.get("financial_status", "")
        is_paid = financial.lower() in ["paid", "authorized"] if financial else False
        
        payload = {
            "orderId": order_id_str,
            "shippingAddress": ship_addr,
            "pickupAddress": {
                "name": pickup.get("name", "TNVC Collection"),
                "phone": pickup.get("phone", "9582639469"),
                "address1": pickup.get("address", "TNVC Warehouse"),
                "city": pickup.get("city", "Delhi"),
                "state": pickup.get("state", "Delhi"),
                "country": "India",
                "zip": pickup.get("zip", "110001"),
            },
            "amount": total_price or float(order_data.get("total_price", 0)),
            "weight": total_weight or 500,
            "length": 30, "width": 20, "height": 10,
            "currency": "INR",
            "gstPercentage": 0,
            "paymentType": "ONLINE" if is_paid else "COD",
            "paymentStatus": "PAID" if is_paid else "UNPAID",
            "deliveryPromise": delivery_type,
            "lineItems": line_items,
            "remarks": f"Auto-push Order #{order_number}",
            "returnableOrder": True,
        }
        
        result = await push_order(payload)
        
        if result.get("status") == 200:
            sync_db.logistics_bookings.insert_one({
                "order_id": order_id_str,
                "shopify_order_id": str(order_data.get("id", "")),
                "awb_number": result["data"].get("awbNumber"),
                "shipper_order_id": result["data"].get("shipperOrderId"),
                "delivery_type": delivery_type,
                "status": "booked",
                "source": "auto_push",
                "shipping_address": ship_addr,
                "amount": payload["amount"],
                "weight": total_weight,
                "customer_name": ship_addr["name"],
                "destination_pincode": ship_addr["zip"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"Auto-pushed order #{order_number} -> AWB: {result['data'].get('awbNumber')}")
        else:
            # Log the failure
            sync_db.logistics_push_failures.insert_one({
                "order_id": order_id_str,
                "error": str(result.get("message", "Unknown error")),
                "payload": payload,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.error(f"Auto-push failed for order #{order_number}: {result.get('message')}")
            
    except Exception as e:
        logger.error(f"InnoFulfill auto-push error: {str(e)}")
