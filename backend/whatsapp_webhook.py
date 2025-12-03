"""
WhatsApp Webhook Handler for receiving messages and status updates
"""
import os
import logging
from fastapi import APIRouter, Request, HTTPException, Query
from typing import Dict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp/webhook", tags=["whatsapp_webhook"])

VERIFY_TOKEN = os.getenv('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'tnv_whatsapp_webhook_2024')


@router.get("")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge")
):
    """
    Webhook verification endpoint
    Facebook will call this to verify the webhook URL
    """
    logger.info(f"Webhook verification request: mode={hub_mode}, token={hub_verify_token}")
    
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        logger.info("Webhook verified successfully")
        return int(hub_challenge)
    else:
        logger.error("Webhook verification failed")
        raise HTTPException(status_code=403, detail="Verification failed")


@router.post("")
async def webhook_handler(request: Request):
    """
    Receive incoming messages and status updates from WhatsApp
    """
    try:
        body = await request.json()
        logger.info(f"Webhook received: {body}")
        
        # Process webhook data
        if body.get("object") == "whatsapp_business_account":
            entries = body.get("entry", [])
            
            for entry in entries:
                changes = entry.get("changes", [])
                
                for change in changes:
                    value = change.get("value", {})
                    
                    # Handle incoming messages
                    if "messages" in value:
                        messages = value.get("messages", [])
                        for message in messages:
                            await process_incoming_message(message, value)
                    
                    # Handle message status updates
                    if "statuses" in value:
                        statuses = value.get("statuses", [])
                        for status in statuses:
                            await process_status_update(status)
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


async def process_incoming_message(message: Dict, value: Dict):
    """Process incoming WhatsApp message"""
    try:
        message_id = message.get("id")
        from_number = message.get("from")
        timestamp = message.get("timestamp")
        message_type = message.get("type")
        
        # Extract message content based on type
        text_content = ""
        if message_type == "text":
            text_content = message.get("text", {}).get("body", "")
        
        logger.info(f"Incoming message from {from_number}: {text_content}")
        
        # Here you can add logic to:
        # 1. Store message in database
        # 2. Auto-respond to customer
        # 3. Notify agents
        # 4. Update customer records
        
        # Example: Store in database
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.getenv('MONGO_URL')
        db_name = os.getenv('DB_NAME')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        await db.whatsapp_messages.insert_one({
            "message_id": message_id,
            "from": from_number,
            "timestamp": timestamp,
            "type": message_type,
            "content": text_content,
            "direction": "incoming",
            "received_at": timestamp
        })
        
        client.close()
        
    except Exception as e:
        logger.error(f"Error processing incoming message: {str(e)}")


async def process_status_update(status: Dict):
    """Process message status update (sent, delivered, read)"""
    try:
        message_id = status.get("id")
        recipient = status.get("recipient_id")
        status_type = status.get("status")  # sent, delivered, read, failed
        timestamp = status.get("timestamp")
        
        logger.info(f"Status update: {message_id} - {status_type}")
        
        # Update message status in database
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.getenv('MONGO_URL')
        db_name = os.getenv('DB_NAME')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        await db.whatsapp_messages.update_one(
            {"message_id": message_id},
            {
                "$set": {
                    "status": status_type,
                    "status_timestamp": timestamp
                }
            }
        )
        
        client.close()
        
    except Exception as e:
        logger.error(f"Error processing status update: {str(e)}")
