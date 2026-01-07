"""
WhatsApp Routes
Endpoints for WhatsApp messaging, templates, and campaigns
"""
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])

# Database and service references - set from server.py
_db = None
_whatsapp_service = None
_whatsapp_marketing = None

def set_dependencies(db, whatsapp_service=None, whatsapp_marketing=None):
    """Set database and services from server.py"""
    global _db, _whatsapp_service, _whatsapp_marketing
    _db = db
    _whatsapp_service = whatsapp_service
    _whatsapp_marketing = whatsapp_marketing

def get_db():
    if _db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return _db


# Pydantic Models
class WhatsAppMessage(BaseModel):
    phone: str
    message: str

class BulkWhatsAppMessage(BaseModel):
    recipients: List[Dict[str, str]]


@router.get("/conversations")
async def get_conversations():
    """Get all WhatsApp conversations with customers"""
    db = get_db()
    try:
        pipeline = [
            {'$match': {'whatsapp_messages': {'$exists': True, '$ne': []}}},
            {'$project': {
                '_id': 0,
                'phone': '$phone',
                'customer_name': {'$concat': ['$first_name', ' ', '$last_name']},
                'first_name': 1,
                'last_name': 1,
                'last_message': {'$arrayElemAt': ['$whatsapp_messages.message', -1]},
                'last_message_time': {'$arrayElemAt': ['$whatsapp_messages.timestamp', -1]},
                'messages': '$whatsapp_messages'
            }},
            {'$addFields': {'unread_count': 0}},
            {'$sort': {'last_message_time': -1}}
        ]
        
        conversations = await db.customers.aggregate(pipeline).to_list(1000)
        return {'success': True, 'conversations': conversations, 'total': len(conversations)}
    except Exception as e:
        logger.error(f"Error fetching WhatsApp conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send")
async def send_message(data: WhatsAppMessage):
    """Send a WhatsApp message to a customer"""
    if not _whatsapp_service:
        raise HTTPException(status_code=500, detail="WhatsApp service not configured")
    try:
        result = await _whatsapp_service.send_text_message(data.phone, data.message)
        return result
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-bulk")
async def send_bulk(data: BulkWhatsAppMessage):
    """Send WhatsApp messages to multiple recipients"""
    if not _whatsapp_service:
        raise HTTPException(status_code=500, detail="WhatsApp service not configured")
    try:
        result = await _whatsapp_service.send_bulk_messages(data.recipients)
        return result
    except Exception as e:
        logger.error(f"Error sending bulk WhatsApp: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates")
async def get_templates():
    """Get list of approved message templates"""
    if not _whatsapp_service:
        raise HTTPException(status_code=500, detail="WhatsApp service not configured")
    try:
        result = await _whatsapp_service.get_message_templates()
        return result
    except Exception as e:
        logger.error(f"Error fetching templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/{customer_id}")
async def get_customer_messages(customer_id: str):
    """Get WhatsApp message history for a customer"""
    db = get_db()
    try:
        messages = await db.whatsapp_messages.find(
            {"$or": [{"from": customer_id}, {"to": customer_id}]}
        ).sort("timestamp", -1).limit(50).to_list(50)
        
        # Convert ObjectId to string
        for msg in messages:
            if '_id' in msg:
                msg['_id'] = str(msg['_id'])
        
        return {"success": True, "messages": messages}
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages-by-phone/{phone}")
async def get_messages_by_phone(phone: str):
    """Get WhatsApp message history by phone number"""
    db = get_db()
    try:
        phone_clean = phone.replace('+', '').replace(' ', '').replace('-', '')
        
        customer = await db.customers.find_one(
            {'phone': {'$regex': phone_clean}},
            {'_id': 0, 'whatsapp_messages': 1, 'first_name': 1, 'last_name': 1}
        )
        
        if not customer:
            return {'success': True, 'messages': [], 'customer_name': 'Unknown'}
        
        messages = customer.get('whatsapp_messages', [])
        messages.sort(key=lambda x: x.get('timestamp', ''), reverse=False)
        
        return {
            'success': True,
            'messages': messages,
            'customer_name': f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
        }
    except Exception as e:
        logger.error(f"Error fetching messages by phone: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/templates/create")
async def create_template(data: dict = Body(...)):
    """Create a new WhatsApp message template"""
    if not _whatsapp_service:
        raise HTTPException(status_code=500, detail="WhatsApp service not configured")
    
    db = get_db()
    try:
        name = data.get("name")
        category = data.get("category")
        language = data.get("language", "en")
        body_text = data.get("body")
        header_text = data.get("header")
        footer_text = data.get("footer")
        buttons = data.get("buttons")
        
        if not name or not category or not body_text:
            raise HTTPException(status_code=400, detail="Name, category, and body are required")
        
        if not name.replace("_", "").isalnum() or name != name.lower():
            raise HTTPException(status_code=400, detail="Template name must be lowercase with underscores only")
        
        result = await _whatsapp_service.create_message_template(
            name=name, category=category, language=language,
            body_text=body_text, header_text=header_text,
            footer_text=footer_text, buttons=buttons
        )
        
        if result.get("success"):
            await db.whatsapp_template_submissions.insert_one({
                "template_id": result.get("template_id"),
                "name": name, "category": category, "language": language,
                "status": result.get("status", "PENDING"),
                "body": body_text, "header": header_text, "footer": footer_text,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "submitted_by": "dashboard"
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/templates/{template_name}")
async def delete_template(template_name: str):
    """Delete a WhatsApp message template"""
    if not _whatsapp_service:
        raise HTTPException(status_code=500, detail="WhatsApp service not configured")
    try:
        result = await _whatsapp_service.delete_message_template(template_name)
        return result
    except Exception as e:
        logger.error(f"Error deleting template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/all")
async def get_all_messages(limit: int = 100):
    """Get all WhatsApp message history"""
    db = get_db()
    try:
        messages = await db.whatsapp_messages.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        return {"success": True, "messages": messages}
    except Exception as e:
        logger.error(f"Error fetching all messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-template")
async def send_template(data: dict = Body(...)):
    """Send a WhatsApp template message"""
    if not _whatsapp_service:
        raise HTTPException(status_code=500, detail="WhatsApp service not configured")
    try:
        phone = data.get("phone")
        template_name = data.get("template_name")
        language = data.get("language", "en")
        variables = data.get("variables", [])
        
        components = []
        if variables:
            components.append({
                "type": "body",
                "parameters": [{"type": "text", "text": str(var)} for var in variables]
            })
        
        result = await _whatsapp_service.send_template_message(
            to=phone, template_name=template_name,
            language_code=language,
            components=components if components else None
        )
        return result
    except Exception as e:
        logger.error(f"Error sending template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notify-order-status")
async def notify_order_status(data: dict = Body(...)):
    """Send automatic WhatsApp notification when order status changes"""
    db = get_db()
    if not _whatsapp_service:
        return {"success": False, "error": "WhatsApp service not configured"}
    
    try:
        customer_id = data.get("customer_id")
        store_name = data.get("store_name")
        new_status = data.get("new_status")
        
        customer = await db.customers.find_one(
            {"customer_id": customer_id, "store_name": store_name},
            {"_id": 0}
        )
        
        if not customer or not customer.get("phone"):
            return {"success": False, "error": "Customer not found or no phone number"}
        
        # Generate status message
        status_messages = {
            "processing": f"Hi {customer.get('first_name', 'there')}! Your order is being processed.",
            "shipped": f"Great news! Your order has been shipped!",
            "delivered": f"Your order has been delivered. Thank you for shopping with us!",
            "cancelled": f"Your order has been cancelled. Please contact support for details."
        }
        
        message = status_messages.get(new_status, f"Your order status has been updated to: {new_status}")
        
        result = await _whatsapp_service.send_text_message(customer['phone'], message)
        return result
    except Exception as e:
        logger.error(f"Error notifying order status: {e}")
        return {"success": False, "error": str(e)}


@router.post("/marketing/send")
async def send_marketing(data: dict = Body(...)):
    """Send a marketing WhatsApp message"""
    db = get_db()
    if not _whatsapp_service:
        raise HTTPException(status_code=500, detail="WhatsApp service not configured")
    
    try:
        phone = data.get("phone")
        template_type = data.get("template_type", "promotion")
        product_name = data.get("product_name", "")
        discount = data.get("discount", "")
        
        # Get template from marketing templates
        if _whatsapp_marketing:
            template = _whatsapp_marketing.get(template_type, {}).get("template", "")
            message = template.format(product_name=product_name, discount=discount)
        else:
            message = f"Special offer: {product_name} at {discount}% off!"
        
        result = await _whatsapp_service.send_text_message(phone, message)
        
        # Log campaign message
        await db.whatsapp_campaigns_log.insert_one({
            "phone": phone,
            "template_type": template_type,
            "message": message,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "result": result
        })
        
        return result
    except Exception as e:
        logger.error(f"Error sending marketing message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/marketing/campaign")
async def send_campaign(data: dict = Body(...)):
    """Send a marketing campaign to multiple recipients"""
    db = get_db()
    if not _whatsapp_service:
        raise HTTPException(status_code=500, detail="WhatsApp service not configured")
    
    try:
        campaign_name = data.get("campaign_name", "Untitled Campaign")
        template_type = data.get("template_type", "promotion")
        recipients = data.get("recipients", [])
        message_template = data.get("message", "")
        
        if not recipients:
            raise HTTPException(status_code=400, detail="No recipients provided")
        
        # Create campaign record
        campaign_id = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
        campaign = {
            "campaign_id": campaign_id,
            "name": campaign_name,
            "template_type": template_type,
            "total_recipients": len(recipients),
            "sent": 0,
            "failed": 0,
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat()
        }
        await db.whatsapp_campaigns.insert_one(campaign)
        
        # Send to each recipient
        sent = 0
        failed = 0
        for recipient in recipients:
            try:
                phone = recipient.get("phone")
                name = recipient.get("name", "Customer")
                message = message_template.replace("{name}", name)
                
                await _whatsapp_service.send_text_message(phone, message)
                sent += 1
            except Exception:
                failed += 1
        
        # Update campaign
        await db.whatsapp_campaigns.update_one(
            {"campaign_id": campaign_id},
            {"$set": {
                "sent": sent,
                "failed": failed,
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "sent": sent,
            "failed": failed
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/marketing/templates")
async def get_marketing_templates():
    """Get available marketing message templates"""
    if _whatsapp_marketing:
        return {"success": True, "templates": _whatsapp_marketing}
    return {"success": True, "templates": {}}


@router.get("/campaigns")
async def get_campaigns(limit: int = 50):
    """Get list of WhatsApp campaigns"""
    db = get_db()
    try:
        campaigns = await db.whatsapp_campaigns.find({}, {"_id": 0}) \
            .sort("started_at", -1).limit(limit).to_list(limit)
        return {"success": True, "campaigns": campaigns}
    except Exception as e:
        logger.error(f"Error fetching campaigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}/analytics")
async def get_campaign_analytics(campaign_id: str):
    """Get analytics for a specific campaign"""
    db = get_db()
    try:
        campaign = await db.whatsapp_campaigns.find_one(
            {"campaign_id": campaign_id},
            {"_id": 0}
        )
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get message logs for this campaign
        logs = await db.whatsapp_campaigns_log.find(
            {"campaign_id": campaign_id},
            {"_id": 0}
        ).to_list(1000)
        
        return {
            "success": True,
            "campaign": campaign,
            "message_logs": logs
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaign analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
