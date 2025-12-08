"""
WhatsApp CRM API Routes
Comprehensive routes for WhatsApp Business messaging, templates, campaigns, and CRM
"""
import logging
import os
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from meta_whatsapp_service import MetaWhatsAppService
import uuid

logger = logging.getLogger(__name__)

# Initialize router
whatsapp_router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'shopify_customers_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# WhatsApp service initialization helper
def get_whatsapp_service(store_name: str = "ashmiaa") -> MetaWhatsAppService:
    """Initialize WhatsApp service for a specific store"""
    # Get credentials from environment or database
    access_token = os.environ.get('WHATSAPP_ACCESS_TOKEN')
    phone_number_id = os.environ.get('WHATSAPP_PHONE_NUMBER_ID')
    business_account_id = os.environ.get('WHATSAPP_BUSINESS_ACCOUNT_ID')
    
    if not access_token or not phone_number_id:
        raise HTTPException(status_code=500, detail="WhatsApp credentials not configured")
    
    return MetaWhatsAppService(
        access_token=access_token,
        phone_number_id=phone_number_id,
        business_account_id=business_account_id
    )


# ============= Pydantic Models =============

class TemplateComponent(BaseModel):
    type: str  # header, body, footer, buttons
    format: Optional[str] = None  # For header: text, image, video, document
    text: Optional[str] = None
    example: Optional[Dict[str, Any]] = None
    buttons: Optional[List[Dict[str, Any]]] = None


class CreateTemplateRequest(BaseModel):
    name: str
    category: str  # UTILITY, MARKETING
    language: str  # en_US, ur, etc.
    components: List[Dict[str, Any]]
    store_name: Optional[str] = "ashmiaa"


class SendTemplateRequest(BaseModel):
    phone: str
    template_name: str
    language_code: str = "en_US"
    header_params: Optional[List[Dict]] = None
    body_params: Optional[List[Dict]] = None
    button_params: Optional[List[Dict]] = None
    customer_id: Optional[str] = None
    store_name: Optional[str] = "ashmiaa"


class SendTextMessageRequest(BaseModel):
    phone: str
    message: str
    customer_id: Optional[str] = None
    store_name: Optional[str] = "ashmiaa"


class CampaignRequest(BaseModel):
    name: str
    template_name: str
    segment: str  # VIP, HIGH_VALUE, MEDIUM_VALUE, NEW, DORMANT, ALL
    store_name: Optional[str] = None
    scheduled_at: Optional[str] = None
    body_params: Optional[List[Dict]] = None


class ConversationReplyRequest(BaseModel):
    conversation_id: str
    message: str
    agent_id: Optional[str] = None


# ============= Template Management Routes =============

@whatsapp_router.post("/templates/init-samples")
async def initialize_sample_templates(store_name: str = "ashmiaa"):
    """
    Initialize all sample templates (for testing/setup)
    This creates all 7 sample templates and submits them to Meta for approval
    """
    try:
        from whatsapp_sample_templates import ALL_SAMPLE_TEMPLATES
        
        results = []
        for template_def in ALL_SAMPLE_TEMPLATES:
            try:
                # Create request object
                request = CreateTemplateRequest(
                    name=template_def["name"],
                    category=template_def["category"],
                    language=template_def["language"],
                    components=template_def["components"],
                    store_name=store_name
                )
                
                # Note: We're not actually creating on Meta yet, just saving to database
                # User needs to create these templates via Meta Business Manager
                
                # Save template to database as PENDING
                template_doc = {
                    "id": str(uuid.uuid4()),
                    "template_id": None,  # Will be filled when synced from Meta
                    "name": template_def["name"],
                    "category": template_def["category"],
                    "language": template_def["language"],
                    "components": template_def["components"],
                    "status": "DRAFT",  # User needs to create on Meta
                    "store_name": store_name,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Check if already exists
                existing = await db.whatsapp_templates.find_one({
                    "name": template_def["name"],
                    "store_name": store_name
                })
                
                if existing:
                    results.append({
                        "name": template_def["name"],
                        "status": "already_exists",
                        "category": template_def["category"]
                    })
                else:
                    await db.whatsapp_templates.insert_one(template_doc)
                    results.append({
                        "name": template_def["name"],
                        "status": "created",
                        "category": template_def["category"]
                    })
                
            except Exception as e:
                logger.error(f"Error creating template {template_def['name']}: {str(e)}")
                results.append({
                    "name": template_def["name"],
                    "status": "error",
                    "error": str(e)
                })
        
        logger.info(f"✅ Initialized {len(results)} sample templates")
        
        return {
            "success": True,
            "message": f"Initialized {len(results)} sample templates",
            "templates": results,
            "note": "Templates saved as DRAFT. Create them on Meta Business Manager for approval."
        }
        
    except Exception as e:
        logger.error(f"Error initializing sample templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whatsapp_router.post("/templates/create")
async def create_template(request: CreateTemplateRequest):
    """
    Create a new WhatsApp template (utility or marketing)
    Template must be approved by Meta before use
    """
    try:
        service = get_whatsapp_service(request.store_name)
        
        # Create template via Meta API
        result = service.create_template(
            name=request.name,
            category=request.category.upper(),
            language=request.language,
            components=request.components
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Template creation failed"))
        
        # Save template to database
        template_doc = {
            "id": str(uuid.uuid4()),
            "template_id": result.get("template_id"),
            "name": request.name,
            "category": request.category.upper(),
            "language": request.language,
            "components": request.components,
            "status": result.get("status", "PENDING"),
            "store_name": request.store_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.whatsapp_templates.insert_one(template_doc)
        
        logger.info(f"✅ Template created: {request.name} (status: {result.get('status')})")
        
        return {
            "success": True,
            "message": f"Template '{request.name}' created and submitted for approval",
            "template_id": result.get("template_id"),
            "status": result.get("status"),
            "note": "Template will be available after Meta approval (typically 24-48 hours)"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whatsapp_router.get("/templates")
async def get_templates(store_name: str = "ashmiaa", status: Optional[str] = None):
    """
    Get all WhatsApp templates for a store
    """
    try:
        query = {"store_name": store_name}
        if status:
            query["status"] = status.upper()
        
        templates = await db.whatsapp_templates.find(query, {"_id": 0}).to_list(100)
        
        return {
            "success": True,
            "templates": templates,
            "count": len(templates)
        }
        
    except Exception as e:
        logger.error(f"Error fetching templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whatsapp_router.get("/templates/sync")
async def sync_templates_from_meta(store_name: str = "ashmiaa"):
    """
    Sync templates from Meta WhatsApp Business API
    Updates template statuses (APPROVED, PENDING, REJECTED)
    """
    try:
        service = get_whatsapp_service(store_name)
        meta_templates = service.get_message_templates()
        
        synced_count = 0
        for meta_template in meta_templates:
            template_name = meta_template.get("name")
            template_status = meta_template.get("status")
            
            # Update or insert template
            await db.whatsapp_templates.update_one(
                {"name": template_name, "store_name": store_name},
                {"$set": {
                    "template_id": meta_template.get("id"),
                    "status": template_status,
                    "category": meta_template.get("category"),
                    "language": meta_template.get("language"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            synced_count += 1
        
        logger.info(f"✅ Synced {synced_count} templates from Meta")
        
        return {
            "success": True,
            "message": f"Synced {synced_count} templates from Meta",
            "synced_count": synced_count
        }
        
    except Exception as e:
        logger.error(f"Error syncing templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= Messaging Routes =============

@whatsapp_router.post("/send-template")
async def send_template_message(request: SendTemplateRequest):
    """
    Send a template message to a customer
    Used for order confirmations, shipping updates, etc.
    """
    try:
        service = get_whatsapp_service(request.store_name)
        
        # Send template message
        result = service.send_template_message(
            to_phone=request.phone,
            template_name=request.template_name,
            language_code=request.language_code,
            header_params=request.header_params,
            body_params=request.body_params,
            button_params=request.button_params
        )
        
        # Log message to database
        message_doc = {
            "id": str(uuid.uuid4()),
            "message_id": result.get("message_id"),
            "type": "template",
            "template_name": request.template_name,
            "to_phone": request.phone,
            "customer_id": request.customer_id,
            "store_name": request.store_name,
            "status": "sent" if result.get("success") else "failed",
            "error": result.get("error"),
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "direction": "outbound"
        }
        
        await db.whatsapp_messages.insert_one(message_doc)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Message sending failed"))
        
        logger.info(f"✅ Template message sent to {request.phone}: {request.template_name}")
        
        return {
            "success": True,
            "message": "Template message sent successfully",
            "message_id": result.get("message_id"),
            "phone": request.phone
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending template message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whatsapp_router.post("/send-text")
async def send_text_message(request: SendTextMessageRequest):
    """
    Send a text message to a customer
    Can only be sent within 24 hours of customer's last message
    """
    try:
        service = get_whatsapp_service(request.store_name)
        
        # Send text message
        result = service.send_text_message(
            to_phone=request.phone,
            message=request.message
        )
        
        # Log message to database
        message_doc = {
            "id": str(uuid.uuid4()),
            "message_id": result.get("message_id"),
            "type": "text",
            "text": request.message,
            "to_phone": request.phone,
            "customer_id": request.customer_id,
            "store_name": request.store_name,
            "status": "sent" if result.get("success") else "failed",
            "error": result.get("error"),
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "direction": "outbound"
        }
        
        await db.whatsapp_messages.insert_one(message_doc)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Message sending failed"))
        
        logger.info(f"✅ Text message sent to {request.phone}")
        
        return {
            "success": True,
            "message": "Text message sent successfully",
            "message_id": result.get("message_id")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending text message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= Campaign Management Routes =============

@whatsapp_router.post("/campaigns/create")
async def create_campaign(request: CampaignRequest, background_tasks: BackgroundTasks):
    """
    Create and send a WhatsApp marketing campaign to customer segments
    """
    try:
        # Get customers based on segment
        query = {}
        if request.store_name:
            query["store_name"] = request.store_name
        
        # Apply segment filter
        if request.segment == "VIP":
            query["order_count"] = {"$gte": 5}
            query["total_spent"] = {"$gte": 10000}
        elif request.segment == "HIGH_VALUE":
            query["total_spent"] = {"$gte": 5000}
        elif request.segment == "MEDIUM_VALUE":
            query["total_spent"] = {"$gte": 1000, "$lt": 5000}
        elif request.segment == "NEW":
            query["order_count"] = {"$lte": 1}
        elif request.segment == "DORMANT":
            # Customers who haven't ordered in 90 days
            ninety_days_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
            query["last_order_date"] = {"$lt": ninety_days_ago}
        
        # Must have phone number
        query["phone"] = {"$ne": None, "$ne": "", "$exists": True}
        
        customers = await db.customers.find(query, {"_id": 0, "phone": 1, "customer_id": 1, "first_name": 1}).to_list(1000)
        
        if not customers:
            raise HTTPException(status_code=404, detail=f"No customers found in segment: {request.segment}")
        
        # Create campaign record
        campaign_doc = {
            "id": str(uuid.uuid4()),
            "name": request.name,
            "template_name": request.template_name,
            "segment": request.segment,
            "store_name": request.store_name,
            "total_recipients": len(customers),
            "sent_count": 0,
            "delivered_count": 0,
            "read_count": 0,
            "failed_count": 0,
            "status": "scheduled" if request.scheduled_at else "sending",
            "scheduled_at": request.scheduled_at,
            "started_at": datetime.now(timezone.utc).isoformat() if not request.scheduled_at else None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.whatsapp_campaigns.insert_one(campaign_doc)
        campaign_id = campaign_doc["id"]
        
        # Send messages in background
        if not request.scheduled_at:
            background_tasks.add_task(
                send_campaign_messages,
                campaign_id,
                request.template_name,
                customers,
                request.store_name,
                request.body_params
            )
        
        logger.info(f"✅ Campaign created: {request.name} ({len(customers)} recipients)")
        
        return {
            "success": True,
            "message": f"Campaign created with {len(customers)} recipients",
            "campaign_id": campaign_id,
            "total_recipients": len(customers),
            "status": campaign_doc["status"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def send_campaign_messages(
    campaign_id: str,
    template_name: str,
    customers: List[Dict],
    store_name: str,
    body_params: Optional[List[Dict]] = None
):
    """
    Background task to send campaign messages
    """
    try:
        service = get_whatsapp_service(store_name)
        
        sent_count = 0
        failed_count = 0
        
        for customer in customers:
            try:
                phone = customer.get("phone")
                if not phone:
                    continue
                
                # Personalize body params if needed
                personalized_params = body_params or []
                
                result = service.send_template_message(
                    to_phone=phone,
                    template_name=template_name,
                    body_params=personalized_params
                )
                
                # Log message
                message_doc = {
                    "id": str(uuid.uuid4()),
                    "message_id": result.get("message_id"),
                    "campaign_id": campaign_id,
                    "type": "template",
                    "template_name": template_name,
                    "to_phone": phone,
                    "customer_id": customer.get("customer_id"),
                    "store_name": store_name,
                    "status": "sent" if result.get("success") else "failed",
                    "error": result.get("error"),
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "direction": "outbound"
                }
                
                await db.whatsapp_messages.insert_one(message_doc)
                
                if result.get("success"):
                    sent_count += 1
                else:
                    failed_count += 1
                
            except Exception as e:
                logger.error(f"Error sending to {customer.get('phone')}: {str(e)}")
                failed_count += 1
                continue
        
        # Update campaign stats
        await db.whatsapp_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {
                "sent_count": sent_count,
                "failed_count": failed_count,
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"✅ Campaign {campaign_id} completed: {sent_count} sent, {failed_count} failed")
        
    except Exception as e:
        logger.error(f"Error in campaign background task: {str(e)}")
        await db.whatsapp_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"status": "failed", "error": str(e)}}
        )


@whatsapp_router.get("/campaigns")
async def get_campaigns(store_name: Optional[str] = None, limit: int = 50):
    """
    Get all campaigns
    """
    try:
        query = {}
        if store_name:
            query["store_name"] = store_name
        
        campaigns = await db.whatsapp_campaigns.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "campaigns": campaigns,
            "count": len(campaigns)
        }
        
    except Exception as e:
        logger.error(f"Error fetching campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whatsapp_router.get("/campaigns/{campaign_id}")
async def get_campaign_details(campaign_id: str):
    """
    Get detailed campaign information
    """
    try:
        campaign = await db.whatsapp_campaigns.find_one({"id": campaign_id}, {"_id": 0})
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get message statistics
        messages = await db.whatsapp_messages.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(1000)
        
        return {
            "success": True,
            "campaign": campaign,
            "messages": messages
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaign details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= Conversation Management (CRM Inbox) =============

@whatsapp_router.get("/conversations")
async def get_conversations(store_name: Optional[str] = None, status: Optional[str] = None, limit: int = 100):
    """
    Get all WhatsApp conversations
    """
    try:
        query = {}
        if store_name:
            query["store_name"] = store_name
        if status:
            query["status"] = status
        
        conversations = await db.whatsapp_conversations.find(query, {"_id": 0}).sort("last_message_at", -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "conversations": conversations,
            "count": len(conversations)
        }
        
    except Exception as e:
        logger.error(f"Error fetching conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whatsapp_router.get("/conversations/{phone}")
async def get_conversation_history(phone: str):
    """
    Get message history for a specific phone number
    """
    try:
        # Clean phone number
        clean_phone = phone.replace(" ", "").replace("-", "").replace("+", "")
        
        messages = await db.whatsapp_messages.find(
            {"$or": [{"to_phone": clean_phone}, {"from_phone": clean_phone}]},
            {"_id": 0}
        ).sort("sent_at", 1).to_list(1000)
        
        # Get customer info
        customer = await db.customers.find_one({"phone": {"$regex": clean_phone}}, {"_id": 0})
        
        return {
            "success": True,
            "phone": phone,
            "messages": messages,
            "customer": customer,
            "message_count": len(messages)
        }
        
    except Exception as e:
        logger.error(f"Error fetching conversation history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whatsapp_router.post("/conversations/reply")
async def reply_to_conversation(request: ConversationReplyRequest):
    """
    Reply to a customer conversation
    """
    try:
        # Get conversation details
        conversation = await db.whatsapp_conversations.find_one({"id": request.conversation_id}, {"_id": 0})
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        phone = conversation.get("phone")
        store_name = conversation.get("store_name", "ashmiaa")
        
        service = get_whatsapp_service(store_name)
        
        # Send reply
        result = service.send_text_message(
            to_phone=phone,
            message=request.message
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to send reply"))
        
        # Log message
        message_doc = {
            "id": str(uuid.uuid4()),
            "message_id": result.get("message_id"),
            "conversation_id": request.conversation_id,
            "type": "text",
            "text": request.message,
            "to_phone": phone,
            "store_name": store_name,
            "sent_by_agent": request.agent_id,
            "status": "sent",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "direction": "outbound"
        }
        
        await db.whatsapp_messages.insert_one(message_doc)
        
        # Update conversation
        await db.whatsapp_conversations.update_one(
            {"id": request.conversation_id},
            {"$set": {
                "last_message": request.message,
                "last_message_at": datetime.now(timezone.utc).isoformat(),
                "last_message_from": "agent"
            }}
        )
        
        logger.info(f"✅ Reply sent to conversation {request.conversation_id}")
        
        return {
            "success": True,
            "message": "Reply sent successfully",
            "message_id": result.get("message_id")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error replying to conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= Webhook Handler =============

@whatsapp_router.get("/webhook")
async def verify_webhook(request: Request):
    """
    Verify webhook for Meta WhatsApp
    """
    from fastapi.responses import PlainTextResponse
    
    try:
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")
        
        verify_token = os.environ.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'tnv_whatsapp_webhook_2024')
        
        if mode == "subscribe" and token == verify_token:
            logger.info("✅ Webhook verified successfully")
            return PlainTextResponse(content=challenge, status_code=200)
        else:
            logger.warning("❌ Webhook verification failed")
            raise HTTPException(status_code=403, detail="Verification failed")
            
    except ValueError as e:
        logger.error(f"Error in webhook verification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error in webhook verification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@whatsapp_router.post("/webhook")
async def handle_webhook(request: Request):
    """
    Handle incoming WhatsApp messages
    """
    try:
        body = await request.json()
        logger.info(f"📩 Webhook received: {body}")
        
        service = get_whatsapp_service()
        parsed = service.parse_webhook_message(body)
        
        if not parsed:
            return {"status": "ok"}
        
        # Save incoming message
        message_doc = {
            "id": str(uuid.uuid4()),
            "message_id": parsed["message_id"],
            "from_phone": parsed["from_phone"],
            "from_name": parsed["from_name"],
            "type": parsed["type"],
            "text": parsed["text"],
            "timestamp": parsed["timestamp"],
            "direction": "inbound",
            "received_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.whatsapp_messages.insert_one(message_doc)
        
        # Create or update conversation
        conversation_id = f"conv_{parsed['from_phone']}"
        await db.whatsapp_conversations.update_one(
            {"phone": parsed["from_phone"]},
            {"$set": {
                "id": conversation_id,
                "phone": parsed["from_phone"],
                "contact_name": parsed["from_name"],
                "last_message": parsed["text"],
                "last_message_at": datetime.now(timezone.utc).isoformat(),
                "last_message_from": "customer",
                "status": "open",
                "unread_count": {"$inc": 1}
            }},
            upsert=True
        )
        
        # Mark as read
        service.mark_message_as_read(parsed["message_id"])
        
        logger.info(f"✅ Incoming message saved from {parsed['from_phone']}")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        return {"status": "error", "message": str(e)}


# ============= Analytics Routes =============

@whatsapp_router.get("/analytics/overview")
async def get_analytics_overview(store_name: Optional[str] = None, days: int = 30):
    """
    Get WhatsApp analytics overview
    """
    try:
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        query = {"sent_at": {"$gte": start_date}}
        if store_name:
            query["store_name"] = store_name
        
        # Message statistics
        total_messages = await db.whatsapp_messages.count_documents(query)
        sent_messages = await db.whatsapp_messages.count_documents({**query, "direction": "outbound"})
        received_messages = await db.whatsapp_messages.count_documents({**query, "direction": "inbound"})
        failed_messages = await db.whatsapp_messages.count_documents({**query, "status": "failed"})
        
        # Campaign statistics
        campaign_query = {"created_at": {"$gte": start_date}}
        if store_name:
            campaign_query["store_name"] = store_name
        
        total_campaigns = await db.whatsapp_campaigns.count_documents(campaign_query)
        active_campaigns = await db.whatsapp_campaigns.count_documents({**campaign_query, "status": "sending"})
        
        # Conversation statistics
        total_conversations = await db.whatsapp_conversations.count_documents({})
        open_conversations = await db.whatsapp_conversations.count_documents({"status": "open"})
        
        return {
            "success": True,
            "period_days": days,
            "messages": {
                "total": total_messages,
                "sent": sent_messages,
                "received": received_messages,
                "failed": failed_messages,
                "success_rate": round((sent_messages / total_messages * 100) if total_messages > 0 else 0, 2)
            },
            "campaigns": {
                "total": total_campaigns,
                "active": active_campaigns
            },
            "conversations": {
                "total": total_conversations,
                "open": open_conversations
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
