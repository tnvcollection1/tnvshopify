"""
Fulfillment Webhook Service
Handles webhook-based fulfillment status sync from 1688 and DWZ
Enhanced with security features: signature verification, rate limiting, IP whitelist
"""

from typing import Optional, Dict, List
from datetime import datetime, timezone
import os
import hmac
import hashlib
import time
from collections import defaultdict
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import APIRouter, HTTPException, Request, Body
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks/fulfillment", tags=["fulfillment-webhooks"])

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client['shopify_customers_db']
    return _db


# ==================== Security Configuration ====================

# Webhook secret for verification
WEBHOOK_SECRET = os.environ.get('FULFILLMENT_WEBHOOK_SECRET', 'wamerce_fulfillment_secret_2024')

# Security settings
REQUIRE_SIGNATURE = os.environ.get('WEBHOOK_REQUIRE_SIGNATURE', 'false').lower() == 'true'
RATE_LIMIT_REQUESTS = int(os.environ.get('WEBHOOK_RATE_LIMIT', '100'))  # requests per minute per IP
RATE_LIMIT_WINDOW = 60  # seconds

# IP whitelist (comma-separated, empty = allow all)
IP_WHITELIST = [ip.strip() for ip in os.environ.get('WEBHOOK_IP_WHITELIST', '').split(',') if ip.strip()]

# Rate limiting storage (in-memory, resets on restart)
_rate_limit_data = defaultdict(list)


def verify_webhook_signature(payload: bytes, signature: str, timestamp: str = None) -> bool:
    """
    Verify webhook signature using HMAC-SHA256.
    Optionally verify timestamp to prevent replay attacks.
    """
    if timestamp:
        # Check if timestamp is within 5 minutes
        try:
            ts = int(timestamp)
            current_ts = int(time.time())
            if abs(current_ts - ts) > 300:  # 5 minutes
                logger.warning(f"Webhook timestamp too old: {timestamp}")
                return False
        except ValueError:
            logger.warning(f"Invalid webhook timestamp: {timestamp}")
            return False
        
        # Include timestamp in signature verification
        sign_data = f"{timestamp}.".encode() + payload
    else:
        sign_data = payload
    
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        sign_data,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)


def check_rate_limit(ip_address: str) -> bool:
    """Check if IP has exceeded rate limit. Returns True if allowed."""
    current_time = time.time()
    window_start = current_time - RATE_LIMIT_WINDOW
    
    # Clean old entries
    _rate_limit_data[ip_address] = [
        t for t in _rate_limit_data[ip_address] if t > window_start
    ]
    
    # Check limit
    if len(_rate_limit_data[ip_address]) >= RATE_LIMIT_REQUESTS:
        return False
    
    # Record this request
    _rate_limit_data[ip_address].append(current_time)
    return True


def check_ip_whitelist(ip_address: str) -> bool:
    """Check if IP is in whitelist. Returns True if allowed."""
    if not IP_WHITELIST:
        return True  # No whitelist = allow all
    
    # Support CIDR notation in future
    return ip_address in IP_WHITELIST


async def log_security_event(db, event_type: str, ip_address: str, details: dict):
    """Log security-related events for auditing"""
    await db.security_logs.insert_one({
        "event_type": event_type,
        "ip_address": ip_address,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def verify_webhook_security(request: Request):
    """
    Comprehensive webhook security verification.
    Raises HTTPException if security check fails.
    """
    db = get_db()
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    # Check IP whitelist
    if not check_ip_whitelist(client_ip):
        await log_security_event(db, "webhook_ip_blocked", client_ip, {
            "reason": "IP not in whitelist",
            "path": str(request.url.path),
        })
        logger.warning(f"Webhook blocked - IP not in whitelist: {client_ip}")
        raise HTTPException(status_code=403, detail="IP not authorized")
    
    # Check rate limit
    if not check_rate_limit(client_ip):
        await log_security_event(db, "webhook_rate_limited", client_ip, {
            "reason": "Rate limit exceeded",
            "path": str(request.url.path),
        })
        logger.warning(f"Webhook rate limited: {client_ip}")
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # Verify signature
    signature = request.headers.get("X-Webhook-Signature")
    timestamp = request.headers.get("X-Webhook-Timestamp")
    
    if REQUIRE_SIGNATURE and not signature:
        await log_security_event(db, "webhook_signature_missing", client_ip, {
            "reason": "Signature required but not provided",
            "path": str(request.url.path),
        })
        logger.warning(f"Webhook missing signature from: {client_ip}")
        raise HTTPException(status_code=401, detail="Webhook signature required")
    
    if signature:
        body = await request.body()
        if not verify_webhook_signature(body, signature, timestamp):
            await log_security_event(db, "webhook_signature_invalid", client_ip, {
                "reason": "Invalid signature",
                "path": str(request.url.path),
            })
            logger.warning(f"Webhook invalid signature from: {client_ip}")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
    
    return client_ip


# ==================== Webhook Payloads ====================

class FulfillmentStatusUpdate(BaseModel):
    """Payload for fulfillment status webhook"""
    order_id: str = Field(..., description="1688 or Shopify order ID")
    order_type: str = Field("1688", description="Order type: 1688, shopify, dwz")
    status: str = Field(..., description="New status")
    tracking_number: Optional[str] = Field(None, description="Tracking number")
    tracking_company: Optional[str] = Field(None, description="Carrier name")
    shipped_at: Optional[str] = Field(None, description="Ship date ISO format")
    delivered_at: Optional[str] = Field(None, description="Delivery date ISO format")
    notes: Optional[str] = Field(None, description="Additional notes")


class DWZ56WebhookPayload(BaseModel):
    """Payload from DWZ56 shipping webhook"""
    cNo: str = Field(..., description="DWZ tracking number")
    orderNo: Optional[str] = Field(None, description="Original order number")
    status: str = Field(..., description="Shipment status code")
    statusDesc: Optional[str] = Field(None, description="Status description")
    trackingInfo: Optional[List[Dict]] = Field(None, description="Tracking events")
    deliveredAt: Optional[str] = Field(None, description="Delivery timestamp")


class Alibaba1688WebhookPayload(BaseModel):
    """Payload from 1688 order webhook (simulated)"""
    orderId: str = Field(..., description="1688 order ID")
    orderStatus: str = Field(..., description="Order status")
    logisticsStatus: Optional[str] = Field(None, description="Logistics status")
    trackingNumber: Optional[str] = Field(None, description="Tracking number")
    trackingCompany: Optional[str] = Field(None, description="Logistics company")
    shippedTime: Optional[str] = Field(None, description="Ship timestamp")


# ==================== Webhook Endpoints ====================

@router.post("/status-update")
async def receive_fulfillment_status_update(
    request: Request,
    payload: FulfillmentStatusUpdate = Body(...),
):
    """
    Generic webhook endpoint for fulfillment status updates.
    Can be called by any system (1688, DWZ, manual triggers).
    
    Security: Verifies signature, rate limits, and IP whitelist.
    
    Headers:
    - X-Webhook-Signature: HMAC-SHA256 signature (required if WEBHOOK_REQUIRE_SIGNATURE=true)
    - X-Webhook-Timestamp: Unix timestamp (optional, prevents replay attacks)
    """
    db = get_db()
    
    # Security verification
    client_ip = await verify_webhook_security(request)
    
    try:
        # Log the webhook
        await db.webhook_logs.insert_one({
            "type": "fulfillment_status",
            "order_id": payload.order_id,
            "order_type": payload.order_type,
            "status": payload.status,
            "payload": payload.dict(),
            "source_ip": client_ip,
            "received_at": datetime.now(timezone.utc).isoformat(),
            "processed": False,
        })
        
        # Process based on order type
        result = await process_fulfillment_update(payload)
        
        # Mark as processed
        await db.webhook_logs.update_one(
            {"order_id": payload.order_id, "processed": False},
            {"$set": {"processed": True, "result": result}}
        )
        
        return {
            "success": True,
            "message": "Webhook processed",
            "order_id": payload.order_id,
            "new_status": payload.status,
            "actions": result.get("actions", []),
        }
        
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dwz56")
async def receive_dwz56_webhook(
    request: Request,
    payload: DWZ56WebhookPayload = Body(...),
):
    """
    Webhook endpoint for DWZ56 shipping status updates.
    Called when DWZ56 shipment status changes.
    """
    db = get_db()
    
    try:
        # Log the webhook
        await db.webhook_logs.insert_one({
            "type": "dwz56",
            "tracking_number": payload.cNo,
            "order_number": payload.orderNo,
            "status": payload.status,
            "payload": payload.dict(),
            "received_at": datetime.now(timezone.utc).isoformat(),
        })
        
        # Map DWZ status to our status
        status_map = {
            "PICKED_UP": "picked_up_by_dwz",
            "IN_TRANSIT": "in_transit",
            "OUT_FOR_DELIVERY": "out_for_delivery",
            "DELIVERED": "delivered",
            "EXCEPTION": "delivery_exception",
        }
        
        mapped_status = status_map.get(payload.status, payload.status.lower())
        
        # Update fulfillment pipeline
        update_result = await db.fulfillment_pipeline.update_one(
            {"$or": [
                {"dwz56_tracking": payload.cNo},
                {"order_number": payload.orderNo},
            ]},
            {"$set": {
                "dwz_status": mapped_status,
                "dwz_status_desc": payload.statusDesc,
                "dwz_tracking_info": payload.trackingInfo,
                "dwz_updated_at": datetime.now(timezone.utc).isoformat(),
                "stages.dwz_picked_up": payload.status in ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
                "stages.delivered": payload.status == "DELIVERED",
            }}
        )
        
        # If delivered, trigger Shopify sync
        if payload.status == "DELIVERED":
            await trigger_shopify_fulfillment_sync(payload.cNo, payload.orderNo)
        
        return {
            "success": True,
            "tracking_number": payload.cNo,
            "status": mapped_status,
            "updated": update_result.modified_count > 0,
        }
        
    except Exception as e:
        logger.error(f"DWZ56 webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/1688")
async def receive_1688_webhook(
    request: Request,
    payload: Alibaba1688WebhookPayload = Body(...),
):
    """
    Webhook endpoint for 1688 order status updates.
    Note: 1688 doesn't have native webhooks, so this is for
    simulated/polled updates or manual triggers.
    """
    db = get_db()
    
    try:
        # Log the webhook
        await db.webhook_logs.insert_one({
            "type": "1688",
            "order_id": payload.orderId,
            "status": payload.orderStatus,
            "payload": payload.dict(),
            "received_at": datetime.now(timezone.utc).isoformat(),
        })
        
        # Map 1688 status
        status_map = {
            "waitbuyerpay": "pending_payment",
            "waitsellersend": "paid_waiting_ship",
            "waitbuyerreceive": "shipped",
            "confirm_goods": "received",
            "success": "completed",
            "cancel": "cancelled",
        }
        
        mapped_status = status_map.get(payload.orderStatus, payload.orderStatus)
        
        # Update fulfillment pipeline
        update_data = {
            "alibaba_status": mapped_status,
            "alibaba_status_raw": payload.orderStatus,
            "alibaba_updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        if payload.trackingNumber:
            update_data["alibaba_tracking"] = payload.trackingNumber
            update_data["alibaba_carrier"] = payload.trackingCompany
            update_data["stages.alibaba_shipped"] = True
        
        if mapped_status == "shipped":
            update_data["status"] = "shipped_from_supplier"
            update_data["stages.shipped_from_supplier"] = True
        
        update_result = await db.fulfillment_pipeline.update_one(
            {"alibaba_order_id": payload.orderId},
            {"$set": update_data}
        )
        
        # Also update purchase_orders_1688
        await db.purchase_orders_1688.update_one(
            {"alibaba_order_id": payload.orderId},
            {"$set": {
                "status": mapped_status,
                "tracking_number": payload.trackingNumber,
                "tracking_company": payload.trackingCompany,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        return {
            "success": True,
            "order_id": payload.orderId,
            "status": mapped_status,
            "tracking": payload.trackingNumber,
            "updated": update_result.modified_count > 0,
        }
        
    except Exception as e:
        logger.error(f"1688 webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Helper Functions ====================

async def process_fulfillment_update(payload: FulfillmentStatusUpdate) -> Dict:
    """Process a generic fulfillment status update"""
    db = get_db()
    actions = []
    
    # Find the order in various collections
    order_found = False
    
    # Check fulfillment_pipeline
    pipeline_order = await db.fulfillment_pipeline.find_one(
        {"$or": [
            {"shopify_order_id": payload.order_id},
            {"alibaba_order_id": payload.order_id},
            {"order_number": payload.order_id},
        ]}
    )
    
    if pipeline_order:
        order_found = True
        update_data = {
            "status": payload.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        if payload.tracking_number:
            if payload.order_type == "dwz":
                update_data["dwz56_tracking"] = payload.tracking_number
            else:
                update_data["alibaba_tracking"] = payload.tracking_number
        
        if payload.status in ["shipped", "shipped_from_supplier"]:
            update_data["stages.shipped_from_supplier"] = True
        elif payload.status in ["delivered", "completed"]:
            update_data["stages.delivered"] = True
        
        await db.fulfillment_pipeline.update_one(
            {"_id": pipeline_order["_id"]},
            {"$set": update_data}
        )
        actions.append(f"Updated fulfillment_pipeline: {payload.status}")
    
    # Check customers collection
    customer = await db.customers.find_one(
        {"$or": [
            {"shopify_order_id": payload.order_id},
            {"order_number": int(payload.order_id) if payload.order_id.isdigit() else payload.order_id},
        ]}
    )
    
    if customer:
        order_found = True
        await db.customers.update_one(
            {"_id": customer["_id"]},
            {"$set": {
                "fulfillment_status": payload.status,
                "fulfillment_tracking": payload.tracking_number,
                "fulfillment_updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        actions.append(f"Updated customer record: {payload.status}")
    
    return {
        "success": order_found,
        "actions": actions,
        "order_found": order_found,
    }


async def trigger_shopify_fulfillment_sync(
    tracking_number: str,
    order_number: str = None,
):
    """
    Trigger Shopify fulfillment when DWZ delivery is confirmed.
    This is called automatically when DWZ webhook reports DELIVERED.
    """
    db = get_db()
    
    # Find the order
    query = {"dwz56_tracking": tracking_number}
    if order_number:
        query = {"$or": [query, {"order_number": order_number}]}
    
    order = await db.fulfillment_pipeline.find_one(query)
    
    if not order:
        logger.warning(f"No order found for tracking: {tracking_number}")
        return
    
    # Check if already synced
    if order.get("stages", {}).get("shopify_synced"):
        logger.info(f"Order already synced to Shopify: {order.get('shopify_order_id')}")
        return
    
    # Queue for Shopify sync
    await db.shopify_sync_queue.insert_one({
        "shopify_order_id": order.get("shopify_order_id"),
        "tracking_number": tracking_number,
        "carrier": "DWZ56",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "dwz_webhook",
    })
    
    logger.info(f"Queued Shopify sync for order: {order.get('shopify_order_id')}")


@router.get("/logs")
async def get_webhook_logs(
    type: str = None,
    limit: int = 50,
):
    """Get recent webhook logs for debugging"""
    db = get_db()
    
    query = {}
    if type:
        query["type"] = type
    
    logs = await db.webhook_logs.find(
        query,
        {"_id": 0}
    ).sort("received_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "logs": logs,
        "count": len(logs),
    }


@router.post("/test")
async def test_webhook_endpoint(
    test_type: str = Body("fulfillment", embed=True),
):
    """
    Test webhook endpoint - creates a sample webhook payload.
    Useful for testing webhook processing without actual events.
    """
    db = get_db()
    
    test_payloads = {
        "fulfillment": {
            "order_id": "TEST123",
            "order_type": "1688",
            "status": "shipped",
            "tracking_number": "TEST-TRACK-001",
        },
        "dwz56": {
            "cNo": "DWZ-TEST-001",
            "orderNo": "TEST123",
            "status": "IN_TRANSIT",
            "statusDesc": "Package in transit",
        },
        "1688": {
            "orderId": "TEST1688ORDER",
            "orderStatus": "waitsellersend",
            "trackingNumber": None,
        },
    }
    
    payload = test_payloads.get(test_type, test_payloads["fulfillment"])
    
    # Log test webhook
    await db.webhook_logs.insert_one({
        "type": f"test_{test_type}",
        "payload": payload,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "is_test": True,
    })
    
    return {
        "success": True,
        "message": f"Test {test_type} webhook logged",
        "payload": payload,
    }
