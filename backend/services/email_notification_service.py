"""
Email Notification Service for Fulfillment Pipeline
Sends email notifications alongside WhatsApp for stage changes.

Features:
1. Stage change notifications (shipped, delivered, etc.)
2. Batch email sending by stage
3. Customizable email templates per stage
4. Support for SendGrid and SMTP
"""

import os
import logging
from typing import Dict, Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/email-notifications", tags=["email-notifications"])

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client[os.environ.get('DB_NAME', 'shopify_customers_db')]
    return _db


# SendGrid configuration
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.environ.get("SENDGRID_FROM_EMAIL", "noreply@wamerce.com")
SENDGRID_FROM_NAME = os.environ.get("SENDGRID_FROM_NAME", "WaMerce")

# SMTP fallback
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")


# Email templates per stage
EMAIL_TEMPLATES = {
    "shopify_order": {
        "subject": "Order Confirmed - #{order_number}",
        "body": """
Dear {customer_name},

Thank you for your order! Your order #{order_number} has been confirmed and is being processed.

We'll notify you once your order ships.

Best regards,
{store_name} Team
        """,
    },
    "1688_ordered": {
        "subject": "Order in Production - #{order_number}",
        "body": """
Dear {customer_name},

Great news! Your order #{order_number} has been sent to our supplier and is now in production.

You'll receive another update when it ships.

Best regards,
{store_name} Team
        """,
    },
    "dwz56_shipped": {
        "subject": "Order Shipped - #{order_number}",
        "body": """
Dear {customer_name},

Exciting news! Your order #{order_number} has been shipped from our supplier!

Tracking Number: {dwz_tracking}
Shipping Method: DWZ56 International

You can track your package as it makes its way to our local warehouse.

Best regards,
{store_name} Team
        """,
    },
    "in_transit": {
        "subject": "Order In Transit - #{order_number}",
        "body": """
Dear {customer_name},

Your order #{order_number} is currently in transit and on its way to our local warehouse.

Tracking Number: {dwz_tracking}

We'll update you once it arrives and is processed for local delivery.

Best regards,
{store_name} Team
        """,
    },
    "warehouse_arrived": {
        "subject": "Order Arrived at Warehouse - #{order_number}",
        "body": """
Dear {customer_name},

Your order #{order_number} has arrived at our local warehouse!

We're now processing it for delivery to your address. You'll receive your local tracking number soon.

Best regards,
{store_name} Team
        """,
    },
    "received": {
        "subject": "Order Ready for Dispatch - #{order_number}",
        "body": """
Dear {customer_name},

Your order #{order_number} has been received and is ready for dispatch!

It will be shipped to you shortly via {local_carrier}.

Best regards,
{store_name} Team
        """,
    },
    "local_shipped": {
        "subject": "Order Out for Delivery - #{order_number}",
        "body": """
Dear {customer_name},

Your order #{order_number} is on its way to you!

Tracking Number: {local_tracking}
Carrier: {local_carrier}

You can track your delivery using the tracking number above.

Thank you for shopping with us!

Best regards,
{store_name} Team
        """,
    },
}


def format_email_template(template: Dict, order: Dict) -> Dict:
    """Format email template with order data"""
    
    # Build context for template
    context = {
        "order_number": order.get("order_number") or order.get("shopify_order_id") or "N/A",
        "customer_name": order.get("customer_name") or "Valued Customer",
        "store_name": order.get("store_name", "WaMerce").replace("pk", "").title(),
        "dwz_tracking": order.get("dwz_tracking") or "Not yet assigned",
        "local_tracking": order.get("local_tracking") or "Not yet assigned",
        "local_carrier": order.get("local_carrier") or "Local Courier",
    }
    
    return {
        "subject": template["subject"].format(**context),
        "body": template["body"].format(**context).strip(),
    }


async def send_email_via_sendgrid(
    to_email: str,
    subject: str,
    body: str,
    html_body: str = None,
) -> Dict:
    """Send email using SendGrid API"""
    
    if not SENDGRID_API_KEY:
        return {"success": False, "error": "SendGrid not configured"}
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": SENDGRID_FROM_EMAIL, "name": SENDGRID_FROM_NAME},
                    "subject": subject,
                    "content": [
                        {"type": "text/plain", "value": body},
                        *([{"type": "text/html", "value": html_body}] if html_body else []),
                    ],
                },
            )
            
            if response.status_code in [200, 201, 202]:
                return {"success": True, "provider": "sendgrid"}
            else:
                return {"success": False, "error": f"SendGrid error: {response.status_code} - {response.text}"}
                
    except Exception as e:
        logger.error(f"SendGrid error: {e}")
        return {"success": False, "error": str(e)}


async def send_email_via_smtp(
    to_email: str,
    subject: str,
    body: str,
) -> Dict:
    """Send email using SMTP (fallback)"""
    
    if not SMTP_HOST or not SMTP_USER:
        return {"success": False, "error": "SMTP not configured"}
    
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart()
        msg["From"] = f"{SENDGRID_FROM_NAME} <{SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        
        return {"success": True, "provider": "smtp"}
        
    except Exception as e:
        logger.error(f"SMTP error: {e}")
        return {"success": False, "error": str(e)}


async def send_stage_email(order: Dict, stage: str) -> Dict:
    """Send email notification for a stage change"""
    
    # Get customer email
    email = order.get("email") or order.get("customer_email")
    if not email:
        return {"success": False, "error": "No email address"}
    
    # Get template
    template = EMAIL_TEMPLATES.get(stage)
    if not template:
        return {"success": False, "error": f"No template for stage: {stage}"}
    
    # Format template
    formatted = format_email_template(template, order)
    
    # Try SendGrid first, then SMTP
    result = await send_email_via_sendgrid(email, formatted["subject"], formatted["body"])
    
    if not result["success"] and SMTP_HOST:
        result = await send_email_via_smtp(email, formatted["subject"], formatted["body"])
    
    # Log the notification
    db = get_db()
    await db.email_notification_logs.insert_one({
        "order_id": str(order.get("order_number") or order.get("shopify_order_id")),
        "email": email,
        "stage": stage,
        "subject": formatted["subject"],
        "result": result,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return result


# ==================== API Endpoints ====================

@router.post("/send/{order_id}")
async def send_email_to_order(
    order_id: str,
    stage: str = Body(None, embed=True),
):
    """Send email notification to a specific order"""
    db = get_db()
    
    # Handle both string and integer order_id
    order_query = {"$or": [
        {"shopify_order_id": order_id},
        {"order_number": order_id},
    ]}
    try:
        order_query["$or"].extend([
            {"shopify_order_id": int(order_id)},
            {"order_number": int(order_id)},
        ])
    except (ValueError, TypeError):
        pass
    
    # Get order
    order = await db.fulfillment_pipeline.find_one(order_query, {"_id": 0})
    if not order:
        order = await db.customers.find_one(order_query, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    target_stage = stage or order.get("current_stage", "shopify_order")
    result = await send_stage_email(order, target_stage)
    
    return {
        "success": result.get("success", False),
        "order_id": order_id,
        "stage": target_stage,
        "result": result,
    }


@router.post("/send-by-stage")
async def send_batch_emails_by_stage(
    store_name: str = Body(...),
    stage: str = Body(...),
):
    """Send email notifications to all orders in a specific stage"""
    db = get_db()
    
    # Get all orders in the specified stage
    orders = await db.fulfillment_pipeline.find(
        {
            "store_name": store_name,
            "current_stage": stage,
        },
        {"_id": 0}
    ).to_list(500)
    
    results = {
        "success": True,
        "stage": stage,
        "total_orders": len(orders),
        "emails_sent": 0,
        "emails_failed": 0,
        "skipped_no_email": 0,
        "details": [],
    }
    
    for order in orders:
        email = order.get("email") or order.get("customer_email")
        order_id = order.get("order_number") or order.get("shopify_order_id")
        
        if not email:
            results["skipped_no_email"] += 1
            continue
        
        try:
            result = await send_stage_email(order, stage)
            if result.get("success"):
                results["emails_sent"] += 1
                results["details"].append({
                    "order_id": str(order_id),
                    "status": "sent",
                })
            else:
                results["emails_failed"] += 1
                results["details"].append({
                    "order_id": str(order_id),
                    "status": "failed",
                    "error": result.get("error"),
                })
        except Exception as e:
            results["emails_failed"] += 1
            results["details"].append({
                "order_id": str(order_id),
                "status": "error",
                "error": str(e),
            })
    
    return results


@router.get("/templates")
async def get_email_templates():
    """Get all available email templates"""
    return {
        "success": True,
        "templates": {
            stage: {
                "subject": template["subject"],
                "body_preview": template["body"][:200] + "...",
            }
            for stage, template in EMAIL_TEMPLATES.items()
        },
    }


@router.put("/templates/{stage}")
async def update_email_template(
    stage: str,
    subject: str = Body(...),
    body: str = Body(...),
):
    """Update email template for a stage (stored in database)"""
    db = get_db()
    
    if stage not in EMAIL_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Invalid stage: {stage}")
    
    await db.email_templates.update_one(
        {"stage": stage},
        {"$set": {
            "subject": subject,
            "body": body,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    
    return {
        "success": True,
        "stage": stage,
        "message": "Template updated",
    }


@router.get("/logs")
async def get_email_logs(
    store_name: str = None,
    limit: int = 50,
):
    """Get recent email notification logs"""
    db = get_db()
    
    query = {}
    if store_name:
        query["store_name"] = store_name
    
    logs = await db.email_notification_logs.find(
        query,
        {"_id": 0}
    ).sort("sent_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "logs": logs,
        "count": len(logs),
    }


@router.get("/config")
async def get_email_config():
    """Get current email configuration status"""
    return {
        "success": True,
        "sendgrid_configured": bool(SENDGRID_API_KEY),
        "smtp_configured": bool(SMTP_HOST and SMTP_USER),
        "from_email": SENDGRID_FROM_EMAIL,
        "from_name": SENDGRID_FROM_NAME,
    }
