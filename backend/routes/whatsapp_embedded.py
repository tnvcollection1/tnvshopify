"""
WhatsApp Business Platform - Embedded Signup Integration
Enables customers to connect their WhatsApp Business accounts through the app
"""
from fastapi import APIRouter, HTTPException, Request, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import httpx
import os
import logging
import hashlib
import hmac
import uuid

logger = logging.getLogger(__name__)

whatsapp_embedded_router = APIRouter(prefix="/whatsapp-business", tags=["WhatsApp Business Platform"])

# Database reference (set by server.py)
db = None

def set_database(database):
    global db
    db = database

# ==================== Models ====================

class EmbeddedSignupCallback(BaseModel):
    """Data received after customer completes Embedded Signup"""
    code: str  # Exchangeable token code
    waba_id: str  # WhatsApp Business Account ID
    phone_number_id: str  # Business phone number ID

class WhatsAppCredentials(BaseModel):
    """Stored credentials for a customer's WhatsApp Business"""
    tenant_id: str
    store_id: str  # NEW: Store-specific WhatsApp account
    waba_id: str
    phone_number_id: str
    access_token: str
    display_name: Optional[str] = None
    verified_name: Optional[str] = None
    phone_number: Optional[str] = None
    quality_rating: Optional[str] = None
    connected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class MessageTemplate(BaseModel):
    """WhatsApp message template"""
    name: str
    language: str = "en"
    category: str  # MARKETING, UTILITY, AUTHENTICATION
    components: List[Dict[str, Any]]
    status: Optional[str] = "PENDING"

class SendMarketingMessage(BaseModel):
    """Request to send marketing message"""
    template_name: str
    recipients: List[str]  # List of phone numbers
    template_params: Optional[Dict[str, Any]] = None

class WebhookConfig(BaseModel):
    """Webhook configuration for a WABA"""
    callback_url: str
    verify_token: str
    fields: List[str] = ["messages", "message_template_status_update"]

# ==================== Configuration ====================

def get_meta_config():
    """Get Meta/Facebook app configuration"""
    return {
        "app_id": os.environ.get("META_APP_ID", ""),
        "app_secret": os.environ.get("META_APP_SECRET", ""),
        "graph_api_version": "v21.0",
        "graph_api_url": "https://graph.facebook.com"
    }

# ==================== Token Exchange ====================

@whatsapp_embedded_router.post("/exchange-token")
async def exchange_token(callback: EmbeddedSignupCallback, tenant_id: str = Query(...), store_id: str = Query(...)):
    """
    Exchange the code from Embedded Signup for a long-lived access token.
    This is called after a customer completes the signup flow.
    Now store-specific: each store can have its own WhatsApp number.
    """
    config = get_meta_config()
    
    if not config["app_id"] or not config["app_secret"]:
        raise HTTPException(
            status_code=400,
            detail="Meta App credentials not configured. Please set META_APP_ID and META_APP_SECRET in environment variables."
        )
    
    if not store_id or store_id == 'all':
        raise HTTPException(
            status_code=400,
            detail="Please select a specific store before connecting WhatsApp"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for access token
            token_url = f"{config['graph_api_url']}/{config['graph_api_version']}/oauth/access_token"
            response = await client.get(token_url, params={
                "client_id": config["app_id"],
                "client_secret": config["app_secret"],
                "code": callback.code
            })
            
            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.text}")
                raise HTTPException(status_code=400, detail="Failed to exchange token")
            
            token_data = response.json()
            access_token = token_data.get("access_token")
            
            # Get phone number details
            phone_url = f"{config['graph_api_url']}/{config['graph_api_version']}/{callback.phone_number_id}"
            phone_response = await client.get(phone_url, params={
                "access_token": access_token,
                "fields": "display_phone_number,verified_name,quality_rating"
            })
            
            phone_data = {}
            if phone_response.status_code == 200:
                phone_data = phone_response.json()
            
            # Store credentials in database - NOW STORE-SPECIFIC
            credentials = {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "store_id": store_id,  # NEW: Link to specific store
                "waba_id": callback.waba_id,
                "phone_number_id": callback.phone_number_id,
                "access_token": access_token,
                "phone_number": phone_data.get("display_phone_number"),
                "verified_name": phone_data.get("verified_name"),
                "quality_rating": phone_data.get("quality_rating"),
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True
            }
            
            # Upsert credentials - unique by store_id + waba_id
            await db.whatsapp_business_accounts.update_one(
                {"store_id": store_id, "waba_id": callback.waba_id},
                {"$set": credentials},
                upsert=True
            )
            
            # Subscribe app to webhooks
            await subscribe_to_webhooks(callback.waba_id, access_token)
            
            # Register phone number for Cloud API
            await register_phone_number(callback.phone_number_id, access_token)
            
            return {
                "success": True,
                "message": "WhatsApp Business account connected successfully",
                "waba_id": callback.waba_id,
                "phone_number": phone_data.get("display_phone_number"),
                "verified_name": phone_data.get("verified_name")
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exchanging token: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def subscribe_to_webhooks(waba_id: str, access_token: str):
    """Subscribe app to webhooks on the WABA"""
    config = get_meta_config()
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"{config['graph_api_url']}/{config['graph_api_version']}/{waba_id}/subscribed_apps"
            response = await client.post(url, params={"access_token": access_token})
            
            if response.status_code != 200:
                logger.warning(f"Failed to subscribe to webhooks: {response.text}")
            else:
                logger.info(f"Successfully subscribed to webhooks for WABA {waba_id}")
                
    except Exception as e:
        logger.error(f"Error subscribing to webhooks: {str(e)}")

async def register_phone_number(phone_number_id: str, access_token: str):
    """Register phone number for Cloud API use"""
    config = get_meta_config()
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"{config['graph_api_url']}/{config['graph_api_version']}/{phone_number_id}/register"
            response = await client.post(url, 
                params={"access_token": access_token},
                json={"messaging_product": "whatsapp", "pin": "123456"}
            )
            
            if response.status_code != 200:
                logger.warning(f"Phone registration response: {response.text}")
            else:
                logger.info(f"Successfully registered phone number {phone_number_id}")
                
    except Exception as e:
        logger.error(f"Error registering phone number: {str(e)}")

# ==================== Account Management ====================

@whatsapp_embedded_router.get("/accounts/{tenant_id}")
async def get_connected_accounts(tenant_id: str, store_id: str = Query(None)):
    """Get all WhatsApp Business accounts connected by a tenant, filtered by store"""
    try:
        # Build query filter
        query = {"tenant_id": tenant_id, "is_active": True}
        
        # Filter by store_id if provided (not 'all')
        if store_id and store_id != 'all':
            query["store_id"] = store_id
        
        accounts = await db.whatsapp_business_accounts.find(
            query,
            {"_id": 0, "access_token": 0}  # Don't return sensitive token
        ).to_list(100)
        
        return {
            "success": True,
            "accounts": accounts,
            "count": len(accounts),
            "store_id": store_id
        }
    except Exception as e:
        logger.error(f"Error fetching accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@whatsapp_embedded_router.delete("/accounts/{tenant_id}/{waba_id}")
async def disconnect_account(tenant_id: str, waba_id: str, store_id: str = Query(None)):
    """Disconnect a WhatsApp Business account from a specific store"""
    try:
        # Build query - if store_id provided, disconnect only for that store
        query = {"tenant_id": tenant_id, "waba_id": waba_id}
        if store_id and store_id != 'all':
            query["store_id"] = store_id
        
        result = await db.whatsapp_business_accounts.update_one(
            query,
            {"$set": {"is_active": False, "disconnected_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Account not found")
        
        return {"success": True, "message": "Account disconnected"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Message Templates ====================

@whatsapp_embedded_router.get("/templates/{waba_id}")
async def get_message_templates(waba_id: str, tenant_id: str = Query(...)):
    """Get all message templates for a WABA"""
    try:
        # Get credentials
        creds = await db.whatsapp_business_accounts.find_one(
            {"tenant_id": tenant_id, "waba_id": waba_id, "is_active": True}
        )
        
        if not creds:
            raise HTTPException(status_code=404, detail="Account not found")
        
        config = get_meta_config()
        
        async with httpx.AsyncClient() as client:
            url = f"{config['graph_api_url']}/{config['graph_api_version']}/{waba_id}/message_templates"
            response = await client.get(url, params={
                "access_token": creds["access_token"],
                "fields": "name,status,category,language,components"
            })
            
            if response.status_code != 200:
                logger.error(f"Failed to get templates: {response.text}")
                raise HTTPException(status_code=400, detail="Failed to fetch templates")
            
            data = response.json()
            return {
                "success": True,
                "templates": data.get("data", [])
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@whatsapp_embedded_router.post("/templates/{waba_id}")
async def create_message_template(waba_id: str, template: MessageTemplate, tenant_id: str = Query(...)):
    """Create a new message template"""
    try:
        creds = await db.whatsapp_business_accounts.find_one(
            {"tenant_id": tenant_id, "waba_id": waba_id, "is_active": True}
        )
        
        if not creds:
            raise HTTPException(status_code=404, detail="Account not found")
        
        config = get_meta_config()
        
        async with httpx.AsyncClient() as client:
            url = f"{config['graph_api_url']}/{config['graph_api_version']}/{waba_id}/message_templates"
            response = await client.post(url, 
                params={"access_token": creds["access_token"]},
                json={
                    "name": template.name,
                    "language": template.language,
                    "category": template.category,
                    "components": template.components
                }
            )
            
            if response.status_code not in [200, 201]:
                logger.error(f"Failed to create template: {response.text}")
                error_data = response.json()
                raise HTTPException(
                    status_code=400, 
                    detail=error_data.get("error", {}).get("message", "Failed to create template")
                )
            
            data = response.json()
            return {
                "success": True,
                "template_id": data.get("id"),
                "status": "PENDING"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Send Messages ====================

@whatsapp_embedded_router.post("/send-marketing/{waba_id}")
async def send_marketing_messages(
    waba_id: str, 
    request: SendMarketingMessage, 
    tenant_id: str = Query(...),
    background_tasks: BackgroundTasks = None
):
    """Send marketing messages using a template"""
    try:
        creds = await db.whatsapp_business_accounts.find_one(
            {"tenant_id": tenant_id, "waba_id": waba_id, "is_active": True}
        )
        
        if not creds:
            raise HTTPException(status_code=404, detail="Account not found")
        
        phone_number_id = creds["phone_number_id"]
        access_token = creds["access_token"]
        config = get_meta_config()
        
        results = []
        
        async with httpx.AsyncClient() as client:
            for recipient in request.recipients:
                # Clean phone number
                clean_phone = recipient.replace("+", "").replace(" ", "").replace("-", "")
                
                # Build template message
                message_data = {
                    "messaging_product": "whatsapp",
                    "to": clean_phone,
                    "type": "template",
                    "template": {
                        "name": request.template_name,
                        "language": {"code": "en"}
                    }
                }
                
                # Add template parameters if provided
                if request.template_params:
                    components = []
                    if "body" in request.template_params:
                        components.append({
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": param} 
                                for param in request.template_params["body"]
                            ]
                        })
                    if components:
                        message_data["template"]["components"] = components
                
                url = f"{config['graph_api_url']}/{config['graph_api_version']}/{phone_number_id}/messages"
                response = await client.post(url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    json=message_data
                )
                
                result = {
                    "recipient": recipient,
                    "success": response.status_code == 200,
                    "message_id": None,
                    "error": None
                }
                
                if response.status_code == 200:
                    data = response.json()
                    result["message_id"] = data.get("messages", [{}])[0].get("id")
                else:
                    error_data = response.json()
                    result["error"] = error_data.get("error", {}).get("message", "Unknown error")
                
                results.append(result)
        
        # Log campaign
        campaign_log = {
            "tenant_id": tenant_id,
            "waba_id": waba_id,
            "template_name": request.template_name,
            "recipients_count": len(request.recipients),
            "successful": len([r for r in results if r["success"]]),
            "failed": len([r for r in results if not r["success"]]),
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
        await db.whatsapp_campaigns.insert_one(campaign_log)
        
        return {
            "success": True,
            "results": results,
            "summary": {
                "total": len(results),
                "successful": campaign_log["successful"],
                "failed": campaign_log["failed"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@whatsapp_embedded_router.post("/send-text/{waba_id}")
async def send_text_message(
    waba_id: str,
    recipient: str = Query(..., description="Phone number with country code"),
    message: str = Query(..., description="Text message to send"),
    tenant_id: str = Query(...)
):
    """Send a simple text message (only works within 24hr customer service window)"""
    try:
        creds = await db.whatsapp_business_accounts.find_one(
            {"tenant_id": tenant_id, "waba_id": waba_id, "is_active": True}
        )
        
        if not creds:
            raise HTTPException(status_code=404, detail="Account not found")
        
        phone_number_id = creds["phone_number_id"]
        access_token = creds["access_token"]
        config = get_meta_config()
        
        clean_phone = recipient.replace("+", "").replace(" ", "").replace("-", "")
        
        async with httpx.AsyncClient() as client:
            url = f"{config['graph_api_url']}/{config['graph_api_version']}/{phone_number_id}/messages"
            response = await client.post(url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "messaging_product": "whatsapp",
                    "to": clean_phone,
                    "type": "text",
                    "text": {"body": message}
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=400,
                    detail=error_data.get("error", {}).get("message", "Failed to send message")
                )
            
            data = response.json()
            return {
                "success": True,
                "message_id": data.get("messages", [{}])[0].get("id")
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending text message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Webhooks ====================

@whatsapp_embedded_router.get("/webhook")
async def verify_webhook(request: Request):
    """Webhook verification endpoint for Meta"""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    # Accept multiple verify tokens
    valid_tokens = [
        "omnisales_whatsapp_webhook",
        "omnisales123",
        os.environ.get("META_WEBHOOK_VERIFY_TOKEN", "")
    ]
    
    logger.info(f"Webhook verification: mode={mode}, token={token}")
    
    if mode == "subscribe" and token in valid_tokens:
        logger.info("Webhook verified successfully")
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=challenge)
    
    logger.warning(f"Webhook verification failed: token mismatch")
    raise HTTPException(status_code=403, detail="Verification failed")

@whatsapp_embedded_router.post("/webhook")
async def handle_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle incoming webhook events from WhatsApp"""
    try:
        # Verify signature if app secret is configured
        app_secret = os.environ.get("META_APP_SECRET")
        if app_secret:
            signature = request.headers.get("X-Hub-Signature-256", "")
            body = await request.body()
            
            expected_signature = "sha256=" + hmac.new(
                app_secret.encode(),
                body,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                logger.warning("Invalid webhook signature")
                raise HTTPException(status_code=403, detail="Invalid signature")
        
        data = await request.json()
        logger.info(f"Received webhook: {data}")
        
        # Process webhook in background
        background_tasks.add_task(process_webhook_event, data)
        
        return {"status": "ok"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

async def process_webhook_event(data: dict):
    """Process webhook event asynchronously"""
    try:
        entry = data.get("entry", [])
        
        for item in entry:
            changes = item.get("changes", [])
            
            for change in changes:
                field = change.get("field")
                value = change.get("value", {})
                
                if field == "messages":
                    # Handle incoming messages
                    messages = value.get("messages", [])
                    for msg in messages:
                        await handle_incoming_message(value, msg)
                        
                elif field == "message_template_status_update":
                    # Handle template status updates
                    await handle_template_status_update(value)
                    
                elif field == "account_review_update":
                    # Handle account review updates
                    await handle_account_review_update(value)
                    
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")

async def handle_incoming_message(value: dict, message: dict):
    """Handle incoming WhatsApp message"""
    try:
        phone_number_id = value.get("metadata", {}).get("phone_number_id")
        from_number = message.get("from")
        msg_type = message.get("type")
        timestamp = message.get("timestamp")
        
        # Extract message content
        content = None
        if msg_type == "text":
            content = message.get("text", {}).get("body")
        elif msg_type == "button":
            content = message.get("button", {}).get("text")
        elif msg_type == "interactive":
            interactive = message.get("interactive", {})
            if "button_reply" in interactive:
                content = interactive["button_reply"].get("title")
            elif "list_reply" in interactive:
                content = interactive["list_reply"].get("title")
        
        # Store message in database
        await db.whatsapp_messages.insert_one({
            "phone_number_id": phone_number_id,
            "from": from_number,
            "type": msg_type,
            "content": content,
            "raw_message": message,
            "direction": "inbound",
            "received_at": datetime.now(timezone.utc).isoformat(),
            "timestamp": timestamp
        })
        
        logger.info(f"Stored incoming message from {from_number}")
        
    except Exception as e:
        logger.error(f"Error handling incoming message: {str(e)}")

async def handle_template_status_update(value: dict):
    """Handle template status update"""
    try:
        template_id = value.get("message_template_id")
        template_name = value.get("message_template_name")
        event = value.get("event")
        
        logger.info(f"Template {template_name} ({template_id}) status: {event}")
        
        # Store template status update
        await db.whatsapp_template_updates.insert_one({
            "template_id": template_id,
            "template_name": template_name,
            "event": event,
            "value": value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error handling template status: {str(e)}")

async def handle_account_review_update(value: dict):
    """Handle account review status update"""
    try:
        logger.info(f"Account review update: {value}")
        
        await db.whatsapp_account_updates.insert_one({
            "value": value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error handling account review: {str(e)}")

# ==================== Analytics ====================

@whatsapp_embedded_router.get("/analytics/{tenant_id}")
async def get_analytics(tenant_id: str, days: int = Query(30, ge=1, le=90)):
    """Get WhatsApp messaging analytics for a tenant"""
    try:
        from datetime import timedelta
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get campaigns
        campaigns = await db.whatsapp_campaigns.find(
            {"tenant_id": tenant_id, "sent_at": {"$gte": start_date.isoformat()}}
        ).to_list(1000)
        
        # Calculate stats
        total_sent = sum(c.get("successful", 0) for c in campaigns)
        total_failed = sum(c.get("failed", 0) for c in campaigns)
        
        # Get inbound messages count
        accounts = await db.whatsapp_business_accounts.find(
            {"tenant_id": tenant_id}
        ).to_list(100)
        
        phone_ids = [a.get("phone_number_id") for a in accounts]
        inbound_count = await db.whatsapp_messages.count_documents({
            "phone_number_id": {"$in": phone_ids},
            "direction": "inbound",
            "received_at": {"$gte": start_date.isoformat()}
        })
        
        return {
            "success": True,
            "period_days": days,
            "campaigns": len(campaigns),
            "messages_sent": total_sent,
            "messages_failed": total_failed,
            "delivery_rate": round(total_sent / (total_sent + total_failed) * 100, 2) if (total_sent + total_failed) > 0 else 0,
            "inbound_messages": inbound_count
        }
        
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Configuration Endpoint ====================

# Production domain for WhatsApp Business callbacks
PRODUCTION_DOMAIN = "https://importbaba.com"

@whatsapp_embedded_router.get("/config")
async def get_embedded_signup_config():
    """Get configuration for Embedded Signup (frontend)"""
    config = get_meta_config()
    
    # Always use production domain for webhooks/callbacks
    base_url = PRODUCTION_DOMAIN
    
    # Only return non-sensitive config
    return {
        "app_id": config["app_id"],
        "graph_api_version": config["graph_api_version"],
        "is_configured": bool(config["app_id"] and config["app_secret"]),
        "webhook_url": f"{base_url}/api/whatsapp-business/webhook",
        "callback_url": f"{base_url}/api/whatsapp-business/callback",
        "permissions": [
            "whatsapp_business_management",
            "whatsapp_business_messaging"
        ]
    }
