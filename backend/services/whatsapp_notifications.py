"""
WhatsApp Order Notifications Service
Sends automated WhatsApp messages for order status updates
"""

from typing import Optional, Dict, List
from datetime import datetime, timezone
import os
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
import logging
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications/whatsapp", tags=["whatsapp-notifications"])

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client['shopify_customers_db']
    return _db


# WhatsApp Business API Configuration
WHATSAPP_API_URL = "https://graph.facebook.com/v18.0"
WHATSAPP_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '')
WHATSAPP_ACCESS_TOKEN = os.environ.get('WHATSAPP_ACCESS_TOKEN', '')


# ==================== Message Templates ====================

ORDER_TEMPLATES = {
    "order_confirmed": {
        "en": "🎉 *Order Confirmed!*\n\nHi {customer_name}!\n\nYour order #{order_number} has been confirmed.\n\n📦 Items: {items_summary}\n💰 Total: {total}\n\nWe'll notify you when it ships!\n\nThank you for shopping with us! 🙏",
        "ur": "🎉 *آرڈر کی تصدیق!*\n\nہیلو {customer_name}!\n\nآپ کے آرڈر #{order_number} کی تصدیق ہو گئی۔\n\n📦 آئٹمز: {items_summary}\n💰 کل: {total}\n\nجب یہ شپ ہوگا تو ہم آپ کو بتائیں گے!\n\nخریداری کا شکریہ! 🙏",
    },
    "order_shipped": {
        "en": "🚚 *Your Order is Shipped!*\n\nHi {customer_name}!\n\nGreat news! Order #{order_number} is on its way.\n\n📍 Tracking: {tracking_number}\n🚛 Carrier: {carrier}\n\nTrack your package: {tracking_url}\n\nExpected delivery: {estimated_delivery}",
        "ur": "🚚 *آپ کا آرڈر شپ ہو گیا!*\n\nہیلو {customer_name}!\n\nخوشخبری! آرڈر #{order_number} راستے میں ہے۔\n\n📍 ٹریکنگ: {tracking_number}\n🚛 کیریئر: {carrier}\n\nپیکج ٹریک کریں: {tracking_url}",
    },
    "order_delivered": {
        "en": "✅ *Order Delivered!*\n\nHi {customer_name}!\n\nYour order #{order_number} has been delivered! 🎁\n\nWe hope you love your purchase!\n\n⭐ Please rate your experience.\n\nThank you for choosing us!",
        "ur": "✅ *آرڈر پہنچ گیا!*\n\nہیلو {customer_name}!\n\nآپ کا آرڈر #{order_number} پہنچ گیا! 🎁\n\nہم امید کرتے ہیں آپ کو پسند آئے!\n\n⭐ براہ کرم اپنا تجربہ ریٹ کریں۔\n\nہمیں منتخب کرنے کا شکریہ!",
    },
    "order_1688_placed": {
        "en": "📦 *Sourcing Update*\n\nHi {customer_name}!\n\nWe've placed the order with our supplier for order #{order_number}.\n\n🏭 Supplier Order: {supplier_order_id}\n⏳ Processing time: 2-5 days\n\nWe'll update you when it ships from China!",
        "ur": "📦 *سورسنگ اپڈیٹ*\n\nہیلو {customer_name}!\n\nہم نے آرڈر #{order_number} کے لیے سپلائر سے آرڈر دے دیا۔\n\n🏭 سپلائر آرڈر: {supplier_order_id}\n⏳ پروسیسنگ: 2-5 دن\n\nجب چین سے شپ ہوگا تو بتائیں گے!",
    },
    "order_in_transit": {
        "en": "✈️ *Shipment Update*\n\nHi {customer_name}!\n\nYour order #{order_number} is in transit!\n\n📍 Current Status: {status}\n🚚 Tracking: {tracking_number}\n\nTrack here: {tracking_url}",
        "ur": "✈️ *شپمنٹ اپڈیٹ*\n\nہیلو {customer_name}!\n\nآپ کا آرڈر #{order_number} راستے میں ہے!\n\n📍 موجودہ سٹیٹس: {status}\n🚚 ٹریکنگ: {tracking_number}",
    },
}


# ==================== Pydantic Models ====================

class SendNotificationRequest(BaseModel):
    """Request to send a WhatsApp notification"""
    order_id: str = Field(..., description="Order ID or order number")
    notification_type: str = Field(..., description="Type: order_confirmed, order_shipped, etc.")
    phone_override: Optional[str] = Field(None, description="Override customer phone")
    language: str = Field("en", description="Language: en, ur")
    custom_message: Optional[str] = Field(None, description="Custom message override")


class BulkNotificationRequest(BaseModel):
    """Request to send bulk notifications"""
    order_ids: List[str] = Field(..., description="List of order IDs")
    notification_type: str = Field(..., description="Notification type")
    language: str = Field("en", description="Language")


# ==================== Helper Functions ====================

def clean_phone_number(phone: str) -> str:
    """Clean and format phone number for WhatsApp"""
    if not phone:
        return ""
    
    # Remove all non-digits
    phone = re.sub(r'\D', '', phone)
    
    # Handle Pakistan numbers
    if phone.startswith('0'):
        phone = '92' + phone[1:]
    elif phone.startswith('3') and len(phone) == 10:
        phone = '92' + phone
    elif not phone.startswith('92') and len(phone) == 10:
        phone = '92' + phone
    
    return phone


def format_template(template: str, data: Dict) -> str:
    """Format a message template with data"""
    try:
        return template.format(**data)
    except KeyError as e:
        logger.warning(f"Missing template key: {e}")
        # Return template with unfilled placeholders
        return template


async def get_order_data(order_id: str) -> Optional[Dict]:
    """Get order data from various collections"""
    db = get_db()
    
    # Build query - try multiple fields
    query_options = [
        {"shopify_order_id": order_id},
        {"customer_id": order_id},
    ]
    
    # Try as integer for order_number
    try:
        order_num = int(order_id)
        query_options.append({"order_number": order_num})
    except (ValueError, TypeError):
        query_options.append({"order_number": order_id})
    
    # Try customers collection first
    customer = await db.customers.find_one(
        {"$or": query_options},
        {"_id": 0}
    )
    
    if customer:
        return {
            "order_number": customer.get("order_number"),
            "customer_name": customer.get("customer_name") or customer.get("name") or "Customer",
            "phone": customer.get("phone") or customer.get("customer_phone"),
            "total": customer.get("total_price_formatted") or f"{customer.get('currency', 'PKR')} {customer.get('total_price', 0)}",
            "items_summary": ", ".join([
                item.get("name", "Product")[:30] 
                for item in customer.get("line_items", [])[:3]
            ]) or "Your items",
            "store_name": customer.get("store_name"),
        }
    
    return None


async def get_fulfillment_data(order_id: str) -> Optional[Dict]:
    """Get fulfillment/tracking data"""
    db = get_db()
    
    fulfillment = await db.fulfillment_pipeline.find_one(
        {"$or": [
            {"shopify_order_id": order_id},
            {"order_number": order_id},
        ]},
        {"_id": 0}
    )
    
    if fulfillment:
        tracking = fulfillment.get("dwz56_tracking") or fulfillment.get("alibaba_tracking")
        return {
            "tracking_number": tracking or "N/A",
            "carrier": "DWZ56" if fulfillment.get("dwz56_tracking") else "1688 Logistics",
            "status": fulfillment.get("status", "Processing"),
            "supplier_order_id": fulfillment.get("alibaba_order_id", "N/A"),
            "tracking_url": f"https://track.dwz56.com/{tracking}" if tracking else "",
            "estimated_delivery": "7-15 days",
        }
    
    return None


async def send_whatsapp_message(phone: str, message: str) -> Dict:
    """Send a WhatsApp message via Meta Business API"""
    if not WHATSAPP_PHONE_NUMBER_ID or not WHATSAPP_ACCESS_TOKEN:
        # Fallback: return wa.me link
        clean_phone = clean_phone_number(phone)
        wa_url = f"https://wa.me/{clean_phone}?text={message[:500]}"
        return {
            "success": True,
            "method": "wa_link",
            "wa_url": wa_url,
            "message": "WhatsApp API not configured, using wa.me link",
        }
    
    try:
        url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone_number(phone),
            "type": "text",
            "text": {"body": message},
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            result = response.json()
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "method": "api",
                    "message_id": result.get("messages", [{}])[0].get("id"),
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", {}).get("message", "Unknown error"),
                    "code": response.status_code,
                }
                
    except Exception as e:
        logger.error(f"WhatsApp API error: {e}")
        return {"success": False, "error": str(e)}


# ==================== API Endpoints ====================

@router.post("/send")
async def send_order_notification(request: SendNotificationRequest):
    """
    Send a WhatsApp notification for an order.
    
    Notification types:
    - order_confirmed: When order is confirmed
    - order_shipped: When order ships
    - order_delivered: When order is delivered
    - order_1688_placed: When 1688 supplier order is placed
    - order_in_transit: Transit status update
    """
    db = get_db()
    
    # Get order data
    order_data = await get_order_data(request.order_id)
    if not order_data:
        raise HTTPException(status_code=404, detail=f"Order {request.order_id} not found")
    
    # Get fulfillment data if needed
    fulfillment_data = await get_fulfillment_data(request.order_id)
    
    # Merge data
    template_data = {**order_data, **(fulfillment_data or {})}
    
    # Get phone number
    phone = request.phone_override or order_data.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number for this order")
    
    # Get message template
    if request.custom_message:
        message = request.custom_message
    else:
        templates = ORDER_TEMPLATES.get(request.notification_type)
        if not templates:
            raise HTTPException(status_code=400, detail=f"Unknown notification type: {request.notification_type}")
        
        template = templates.get(request.language, templates.get("en"))
        message = format_template(template, template_data)
    
    # Send message
    result = await send_whatsapp_message(phone, message)
    
    # Log notification
    await db.notification_logs.insert_one({
        "order_id": request.order_id,
        "notification_type": request.notification_type,
        "phone": clean_phone_number(phone),
        "message": message[:500],
        "language": request.language,
        "result": result,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {
        "success": result.get("success"),
        "order_id": request.order_id,
        "notification_type": request.notification_type,
        "phone": clean_phone_number(phone),
        "method": result.get("method"),
        "wa_url": result.get("wa_url"),
        "message_preview": message[:100] + "...",
    }


@router.post("/send-bulk")
async def send_bulk_notifications(request: BulkNotificationRequest):
    """Send notifications to multiple orders"""
    results = {
        "success": True,
        "total": len(request.order_ids),
        "sent": 0,
        "failed": 0,
        "results": [],
    }
    
    for order_id in request.order_ids:
        try:
            result = await send_order_notification(SendNotificationRequest(
                order_id=order_id,
                notification_type=request.notification_type,
                language=request.language,
            ))
            
            if result.get("success"):
                results["sent"] += 1
            else:
                results["failed"] += 1
            
            results["results"].append({
                "order_id": order_id,
                "success": result.get("success"),
            })
        except Exception as e:
            results["failed"] += 1
            results["results"].append({
                "order_id": order_id,
                "success": False,
                "error": str(e),
            })
    
    return results


@router.get("/templates")
async def get_notification_templates():
    """Get all available notification templates"""
    return {
        "success": True,
        "templates": ORDER_TEMPLATES,
        "available_types": list(ORDER_TEMPLATES.keys()),
        "languages": ["en", "ur"],
    }


@router.get("/logs")
async def get_notification_logs(
    order_id: str = None,
    notification_type: str = None,
    limit: int = 50,
):
    """Get notification logs"""
    db = get_db()
    
    query = {}
    if order_id:
        query["order_id"] = order_id
    if notification_type:
        query["notification_type"] = notification_type
    
    logs = await db.notification_logs.find(
        query,
        {"_id": 0}
    ).sort("sent_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "logs": logs,
        "count": len(logs),
    }


@router.post("/test")
async def test_notification(
    phone: str = Body(..., embed=True),
    message: str = Body("🧪 Test message from WaMerce!", embed=True),
):
    """Send a test WhatsApp message"""
    result = await send_whatsapp_message(phone, message)
    
    return {
        "success": result.get("success"),
        "phone": clean_phone_number(phone),
        "method": result.get("method"),
        "wa_url": result.get("wa_url"),
        "result": result,
    }


# ==================== Auto-Notification Triggers ====================

async def trigger_order_notification(
    order_id: str,
    notification_type: str,
    language: str = "en",
):
    """
    Trigger a notification automatically.
    Call this from webhooks or order status changes.
    """
    try:
        result = await send_order_notification(SendNotificationRequest(
            order_id=order_id,
            notification_type=notification_type,
            language=language,
        ))
        logger.info(f"Auto-notification sent: {order_id} - {notification_type}")
        return result
    except Exception as e:
        logger.error(f"Auto-notification failed: {order_id} - {e}")
        return {"success": False, "error": str(e)}
