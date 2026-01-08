"""
WhatsApp OTP Service
Handles OTP generation, sending via WhatsApp, and verification
for customer authentication, order confirmation, and notifications.
"""

import os
import random
import string
import hashlib
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv
import logging

# Load environment
load_dotenv(Path(__file__).parent.parent / '.env')

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


def get_whatsapp_config():
    """Get WhatsApp Business API configuration"""
    return {
        "phone_number_id": os.environ.get("WHATSAPP_PHONE_NUMBER_ID", ""),
        "business_account_id": os.environ.get("WHATSAPP_BUSINESS_ACCOUNT_ID", ""),
        "access_token": os.environ.get("WHATSAPP_ACCESS_TOKEN", ""),
        "api_version": "v21.0",
        "api_url": "https://graph.facebook.com"
    }


def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP"""
    return ''.join(random.choices(string.digits, k=length))


def hash_otp(otp: str, phone: str) -> str:
    """Hash OTP for secure storage"""
    salt = os.environ.get("OTP_SALT", "wamerce_otp_salt_2024")
    return hashlib.sha256(f"{otp}{phone}{salt}".encode()).hexdigest()


async def send_whatsapp_otp(
    phone_number: str,
    otp_type: str = "authentication",
    store_name: Optional[str] = None,
    order_id: Optional[str] = None,
    custom_message: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate and send OTP via WhatsApp.
    
    Args:
        phone_number: Customer's phone number (with country code)
        otp_type: Type of OTP - 'authentication', 'order_confirmation', 'notification_verify'
        store_name: Optional store name for context
        order_id: Optional order ID for order confirmations
        custom_message: Optional custom message
    
    Returns:
        Dict with success status, OTP details (for verification), and message ID
    """
    db = get_db()
    config = get_whatsapp_config()
    
    if not config["access_token"] or not config["phone_number_id"]:
        return {"success": False, "error": "WhatsApp not configured"}
    
    # Normalize phone number (remove spaces, dashes)
    phone = phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not phone.startswith("+"):
        # Assume Indian number if no country code
        if phone.startswith("0"):
            phone = "+91" + phone[1:]
        elif len(phone) == 10:
            phone = "+91" + phone
        else:
            phone = "+" + phone
    
    # Generate OTP
    otp = generate_otp(6)
    otp_hash = hash_otp(otp, phone)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTP in database
    otp_record = {
        "phone": phone,
        "otp_hash": otp_hash,
        "otp_type": otp_type,
        "store_name": store_name,
        "order_id": order_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat(),
        "verified": False,
        "attempts": 0,
        "max_attempts": 3,
    }
    
    await db.whatsapp_otps.insert_one(otp_record)
    
    # Build message based on OTP type
    if otp_type == "authentication":
        message_body = f"Your Wamerce login code is: *{otp}*\n\nThis code expires in 10 minutes. Do not share this code with anyone."
        template_name = "authentication_otp"
    elif otp_type == "order_confirmation":
        order_text = f" for order #{order_id}" if order_id else ""
        store_text = f" from {store_name}" if store_name else ""
        message_body = f"Your order confirmation code{order_text}{store_text} is: *{otp}*\n\nEnter this code to confirm your order. Valid for 10 minutes."
        template_name = "order_confirmation_otp"
    elif otp_type == "notification_verify":
        message_body = f"Your verification code is: *{otp}*\n\nEnter this code to enable WhatsApp notifications for your orders. Valid for 10 minutes."
        template_name = "notification_verify_otp"
    else:
        message_body = custom_message or f"Your verification code is: *{otp}*\n\nValid for 10 minutes."
        template_name = "generic_otp"
    
    # Try to send using template first, fall back to text message
    whatsapp_sent = False
    whatsapp_error = None
    
    try:
        # First try with authentication template (pre-approved by Meta)
        result = await send_otp_template_message(phone, otp, otp_type, config)
        
        if not result.get("success"):
            # Fall back to regular text message
            result = await send_text_message(phone, message_body, config)
        
        if result.get("success"):
            # Update OTP record with message ID
            await db.whatsapp_otps.update_one(
                {"phone": phone, "otp_hash": otp_hash},
                {"$set": {"message_id": result.get("message_id")}}
            )
            whatsapp_sent = True
            logger.info(f"OTP sent successfully to {phone[-4:].rjust(len(phone), '*')}")
        else:
            whatsapp_error = result.get("error", "Failed to send OTP")
            logger.warning(f"WhatsApp send failed: {whatsapp_error}")
            
    except Exception as e:
        whatsapp_error = str(e)
        logger.error(f"Error sending OTP to {phone}: {e}")
    
    # In debug mode OR if WhatsApp failed, still return success with OTP visible
    # This allows testing the verification flow even without WhatsApp delivery
    is_debug = os.environ.get("DEBUG_MODE") == "true"
    
    if whatsapp_sent or is_debug:
        response = {
            "success": True,
            "message": "OTP sent successfully" if whatsapp_sent else "OTP generated (WhatsApp delivery pending)",
            "phone": phone[-4:].rjust(len(phone), '*'),  # Masked phone
            "expires_in_minutes": 10,
            "otp_type": otp_type,
            "whatsapp_delivered": whatsapp_sent,
        }
        
        # Include OTP in debug mode for testing
        if is_debug:
            response["debug_otp"] = otp
            if whatsapp_error:
                response["debug_whatsapp_error"] = whatsapp_error
        
        return response
    else:
        return {
            "success": False,
            "error": whatsapp_error or "Failed to send OTP",
        }


async def send_otp_template_message(
    phone: str,
    otp: str,
    otp_type: str,
    config: Dict
) -> Dict:
    """
    Send OTP using WhatsApp authentication template.
    Uses Meta's pre-approved authentication template format.
    """
    url = f"{config['api_url']}/{config['api_version']}/{config['phone_number_id']}/messages"
    
    headers = {
        "Authorization": f"Bearer {config['access_token']}",
        "Content-Type": "application/json"
    }
    
    # WhatsApp authentication template format
    # Note: You need to create this template in Meta Business Manager
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone.replace("+", ""),
        "type": "template",
        "template": {
            "name": "wamerce_otp",  # Template must be created in Meta Business Manager
            "language": {"code": "en"},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": otp}
                    ]
                },
                {
                    "type": "button",
                    "sub_type": "url",
                    "index": "0",
                    "parameters": [
                        {"type": "text", "text": otp}
                    ]
                }
            ]
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            result = response.json()
            
            if response.status_code == 200 and result.get("messages"):
                return {
                    "success": True,
                    "message_id": result["messages"][0].get("id"),
                    "method": "template"
                }
            else:
                logger.warning(f"Template message failed: {result}")
                return {
                    "success": False,
                    "error": result.get("error", {}).get("message", "Template failed")
                }
    except Exception as e:
        logger.error(f"Template message error: {e}")
        return {"success": False, "error": str(e)}


async def send_text_message(phone: str, message: str, config: Dict) -> Dict:
    """
    Send OTP as a regular text message (fallback).
    Note: This may have delivery limitations for new conversations.
    """
    url = f"{config['api_url']}/{config['api_version']}/{config['phone_number_id']}/messages"
    
    headers = {
        "Authorization": f"Bearer {config['access_token']}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone.replace("+", ""),
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
                    "message_id": result["messages"][0].get("id"),
                    "method": "text"
                }
            else:
                logger.error(f"Text message failed: {result}")
                return {
                    "success": False,
                    "error": result.get("error", {}).get("message", "Message failed")
                }
    except Exception as e:
        logger.error(f"Text message error: {e}")
        return {"success": False, "error": str(e)}


async def verify_otp(
    phone_number: str,
    otp: str,
    otp_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Verify an OTP.
    
    Args:
        phone_number: Customer's phone number
        otp: The OTP to verify
        otp_type: Optional filter by OTP type
    
    Returns:
        Dict with verification result
    """
    db = get_db()
    
    # Normalize phone number
    phone = phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not phone.startswith("+"):
        if phone.startswith("0"):
            phone = "+91" + phone[1:]
        elif len(phone) == 10:
            phone = "+91" + phone
        else:
            phone = "+" + phone
    
    # Find OTP record
    query = {
        "phone": phone,
        "verified": False,
    }
    if otp_type:
        query["otp_type"] = otp_type
    
    # Get most recent OTP for this phone
    otp_record = await db.whatsapp_otps.find_one(
        query,
        sort=[("created_at", -1)]
    )
    
    if not otp_record:
        return {
            "success": False,
            "error": "No pending OTP found for this number",
            "code": "OTP_NOT_FOUND"
        }
    
    # Check expiration
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        return {
            "success": False,
            "error": "OTP has expired. Please request a new one.",
            "code": "OTP_EXPIRED"
        }
    
    # Check attempts
    if otp_record.get("attempts", 0) >= otp_record.get("max_attempts", 3):
        return {
            "success": False,
            "error": "Maximum verification attempts exceeded. Please request a new OTP.",
            "code": "MAX_ATTEMPTS"
        }
    
    # Increment attempts
    await db.whatsapp_otps.update_one(
        {"_id": otp_record["_id"]},
        {"$inc": {"attempts": 1}}
    )
    
    # Verify OTP
    otp_hash = hash_otp(otp, phone)
    if otp_hash != otp_record["otp_hash"]:
        remaining_attempts = otp_record.get("max_attempts", 3) - otp_record.get("attempts", 0) - 1
        return {
            "success": False,
            "error": f"Invalid OTP. {remaining_attempts} attempts remaining.",
            "code": "INVALID_OTP",
            "remaining_attempts": remaining_attempts
        }
    
    # Mark as verified
    await db.whatsapp_otps.update_one(
        {"_id": otp_record["_id"]},
        {"$set": {
            "verified": True,
            "verified_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"OTP verified successfully for {phone[-4:].rjust(len(phone), '*')}")
    
    return {
        "success": True,
        "message": "OTP verified successfully",
        "otp_type": otp_record.get("otp_type"),
        "store_name": otp_record.get("store_name"),
        "order_id": otp_record.get("order_id"),
    }


async def resend_otp(
    phone_number: str,
    otp_type: str = "authentication",
    store_name: Optional[str] = None,
    order_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Resend OTP (invalidates previous OTPs for this phone/type).
    """
    db = get_db()
    
    # Normalize phone
    phone = phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not phone.startswith("+"):
        if phone.startswith("0"):
            phone = "+91" + phone[1:]
        elif len(phone) == 10:
            phone = "+91" + phone
        else:
            phone = "+" + phone
    
    # Check rate limiting (max 5 OTPs per hour)
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_count = await db.whatsapp_otps.count_documents({
        "phone": phone,
        "created_at": {"$gte": one_hour_ago.isoformat()}
    })
    
    if recent_count >= 5:
        return {
            "success": False,
            "error": "Too many OTP requests. Please wait before requesting again.",
            "code": "RATE_LIMITED"
        }
    
    # Invalidate previous OTPs
    await db.whatsapp_otps.update_many(
        {"phone": phone, "otp_type": otp_type, "verified": False},
        {"$set": {"verified": True, "invalidated": True}}
    )
    
    # Send new OTP
    return await send_whatsapp_otp(
        phone_number=phone,
        otp_type=otp_type,
        store_name=store_name,
        order_id=order_id
    )


async def get_otp_status(phone_number: str) -> Dict[str, Any]:
    """Get status of pending OTPs for a phone number."""
    db = get_db()
    
    phone = phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not phone.startswith("+"):
        if phone.startswith("0"):
            phone = "+91" + phone[1:]
        elif len(phone) == 10:
            phone = "+91" + phone
        else:
            phone = "+" + phone
    
    otp_record = await db.whatsapp_otps.find_one(
        {"phone": phone, "verified": False},
        sort=[("created_at", -1)]
    )
    
    if not otp_record:
        return {"has_pending_otp": False}
    
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
    is_expired = datetime.now(timezone.utc) > expires_at
    
    return {
        "has_pending_otp": not is_expired,
        "otp_type": otp_record.get("otp_type"),
        "expires_at": otp_record.get("expires_at"),
        "is_expired": is_expired,
        "attempts_used": otp_record.get("attempts", 0),
        "max_attempts": otp_record.get("max_attempts", 3),
    }


async def enable_whatsapp_notifications(phone_number: str, customer_id: str, store_name: str) -> Dict:
    """
    Enable WhatsApp notifications for a customer after OTP verification.
    """
    db = get_db()
    
    phone = phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not phone.startswith("+"):
        if phone.startswith("0"):
            phone = "+91" + phone[1:]
        elif len(phone) == 10:
            phone = "+91" + phone
        else:
            phone = "+" + phone
    
    # Update customer record
    result = await db.customers.update_one(
        {"customer_id": customer_id, "store_name": store_name},
        {"$set": {
            "whatsapp_phone": phone,
            "whatsapp_notifications_enabled": True,
            "whatsapp_verified_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    
    if result.modified_count > 0:
        return {
            "success": True,
            "message": "WhatsApp notifications enabled",
            "phone": phone[-4:].rjust(len(phone), '*'),
        }
    else:
        return {
            "success": False,
            "error": "Customer not found or already enabled"
        }
