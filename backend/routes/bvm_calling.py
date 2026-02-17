"""
BVM Voice Calling API Integration
Auto-call customers for order confirmations, delivery updates, etc.

API: https://bvm.zongbusiness.com/template_api.html
"""

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import httpx
import os
import logging

router = APIRouter(prefix="/api/bvm", tags=["BVM Voice Calling"])

logger = logging.getLogger(__name__)

# BVM API Configuration
BVM_API_URL = "https://bvm.zongbusiness.com/template_api.html"
BVM_USERNAME = os.environ.get("BVM_USERNAME", "")
BVM_PASSWORD = os.environ.get("BVM_PASSWORD", "")
BVM_CLI = os.environ.get("BVM_CLI", "")  # Caller Line Identification (your caller ID)

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "shopify_customers_db")
        client = AsyncIOMotorClient(mongo_url)
        _db = client[db_name]
    return _db


# =============================================================================
# MODELS
# =============================================================================

class MakeCallRequest(BaseModel):
    phone_number: str = Field(..., description="Recipient phone number (MSISDN)")
    message: str = Field(..., description="Text message to be converted to voice call")
    cli: Optional[str] = Field(None, description="Caller ID (optional, uses default if not provided)")


class OrderCallRequest(BaseModel):
    shopify_order_number: str = Field(..., description="Shopify order number")
    call_type: str = Field("order_confirmation", description="Type: order_confirmation, delivery_update, cod_reminder")
    custom_message: Optional[str] = Field(None, description="Custom message (optional)")


class BulkOrderCallRequest(BaseModel):
    order_numbers: List[str] = Field(..., description="List of Shopify order numbers")
    call_type: str = Field("order_confirmation", description="Type of call")


# =============================================================================
# CALL TEMPLATES
# =============================================================================

CALL_TEMPLATES = {
    "order_confirmation": """
        Hello, this is a call from {store_name}. 
        Your order number {order_number} has been confirmed. 
        Total amount is {total_amount}. 
        We will deliver to {city} within 3 to 5 business days. 
        Thank you for shopping with us.
    """,
    
    "delivery_update": """
        Hello, this is {store_name}. 
        Your order number {order_number} has been shipped. 
        Your tracking number is {tracking_number}. 
        Expected delivery in 2 to 3 days. 
        Thank you.
    """,
    
    "cod_reminder": """
        Hello, this is {store_name}. 
        Your order number {order_number} will be delivered today. 
        Please keep {total_amount} ready for cash on delivery. 
        Thank you for your order.
    """,
    
    "out_for_delivery": """
        Hello, this is {store_name}. 
        Good news! Your order number {order_number} is out for delivery. 
        Our delivery partner will reach you shortly. 
        Please be available to receive your package. 
        Thank you.
    """,
    
    "delivery_attempt_failed": """
        Hello, this is {store_name}. 
        We tried to deliver your order number {order_number} but could not reach you. 
        Please call us back or reply to schedule re-delivery. 
        Thank you.
    """,
}


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.get("/config")
async def get_bvm_config():
    """Check BVM configuration status"""
    return {
        "api_url": BVM_API_URL,
        "username_configured": bool(BVM_USERNAME),
        "password_configured": bool(BVM_PASSWORD),
        "cli_configured": bool(BVM_CLI),
        "cli_preview": BVM_CLI[:5] + "***" if BVM_CLI else None,
        "available_templates": list(CALL_TEMPLATES.keys()),
        "note": "Configure BVM_USERNAME, BVM_PASSWORD, BVM_CLI in backend/.env"
    }


@router.post("/make-call")
async def make_voice_call(request: MakeCallRequest):
    """
    Make a single voice call using BVM API.
    
    The message text will be converted to voice and delivered as a call.
    """
    if not BVM_USERNAME or not BVM_PASSWORD:
        raise HTTPException(status_code=400, detail="BVM credentials not configured. Set BVM_USERNAME and BVM_PASSWORD in .env")
    
    cli = request.cli or BVM_CLI
    if not cli:
        raise HTTPException(status_code=400, detail="Caller ID (CLI) not configured. Set BVM_CLI in .env or provide in request")
    
    # Clean phone number (remove spaces, dashes)
    phone = request.phone_number.replace(" ", "").replace("-", "")
    
    # Prepare API request
    data = {
        "username": BVM_USERNAME,
        "password": BVM_PASSWORD,
        "prompt": request.message.strip(),
        "CLI": cli,
        "MSISDN": phone,
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                BVM_API_URL,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            # Try to parse JSON response
            try:
                result = response.json()
            except:
                result = {"raw_response": response.text}
        
        # Log the call
        db = get_db()
        await db.call_logs.insert_one({
            "phone_number": phone,
            "message": request.message[:100],
            "cli": cli,
            "status": result.get("status", "UNKNOWN"),
            "response": result,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {
            "success": result.get("status") == "SUCCESS",
            "status": result.get("status"),
            "message": result.get("message"),
            "phone_number": phone,
            "prompt_sent": request.message[:50] + "..." if len(request.message) > 50 else request.message,
            "raw_response": result
        }
        
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="BVM API timeout")
    except Exception as e:
        logger.error(f"BVM API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to make call: {str(e)}")


@router.post("/call-order")
async def call_order_customer(request: OrderCallRequest):
    """
    Make an automated call to a customer for a specific order.
    
    Uses predefined templates based on call_type:
    - order_confirmation: Confirm order placement
    - delivery_update: Notify about shipment
    - cod_reminder: Remind COD payment
    - out_for_delivery: Notify delivery today
    - delivery_attempt_failed: Failed delivery attempt
    """
    db = get_db()
    
    # Find the order
    order = await db.orders.find_one({
        "$or": [
            {"order_number": request.shopify_order_number},
            {"order_number": int(request.shopify_order_number) if request.shopify_order_number.isdigit() else request.shopify_order_number},
            {"name": f"#{request.shopify_order_number}"}
        ]
    })
    
    if not order:
        # Try purchase_orders_1688
        order = await db.purchase_orders_1688.find_one({
            "shopify_order_number": request.shopify_order_number
        })
    
    if not order:
        raise HTTPException(status_code=404, detail=f"Order #{request.shopify_order_number} not found")
    
    # Get phone number
    shipping_address = order.get("shipping_address", {})
    phone = shipping_address.get("phone") or order.get("phone") or order.get("customer_phone")
    
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number found for this order")
    
    # Get order details
    order_number = order.get("order_number") or order.get("name", "").replace("#", "") or request.shopify_order_number
    total_amount = order.get("total_price") or order.get("total") or "N/A"
    city = shipping_address.get("city") or "your location"
    tracking_number = order.get("tracking_number") or order.get("dwz_tracking") or "will be shared soon"
    store_name = order.get("store_name") or "our store"
    
    # Get or build message
    if request.custom_message:
        message = request.custom_message
    else:
        template = CALL_TEMPLATES.get(request.call_type)
        if not template:
            raise HTTPException(status_code=400, detail=f"Unknown call type: {request.call_type}. Available: {list(CALL_TEMPLATES.keys())}")
        
        message = template.format(
            store_name=store_name,
            order_number=order_number,
            total_amount=total_amount,
            city=city,
            tracking_number=tracking_number,
        )
    
    # Clean up message (remove extra whitespace)
    message = " ".join(message.split())
    
    # Make the call
    call_request = MakeCallRequest(
        phone_number=phone,
        message=message
    )
    
    result = await make_voice_call(call_request)
    
    # Update order with call status
    await db.orders.update_one(
        {"_id": order.get("_id")},
        {"$push": {
            "call_history": {
                "call_type": request.call_type,
                "status": result.get("status"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        }}
    )
    
    return {
        "success": result.get("success"),
        "order_number": order_number,
        "phone_number": phone,
        "call_type": request.call_type,
        "message_sent": message[:100] + "..." if len(message) > 100 else message,
        "bvm_response": result
    }


@router.post("/bulk-call-orders")
async def bulk_call_orders(request: BulkOrderCallRequest):
    """
    Make calls to multiple orders at once.
    
    Useful for batch notifications like delivery updates.
    """
    import asyncio
    
    results = {
        "total": len(request.order_numbers),
        "success": 0,
        "failed": 0,
        "details": []
    }
    
    for order_number in request.order_numbers:
        try:
            order_request = OrderCallRequest(
                shopify_order_number=order_number,
                call_type=request.call_type
            )
            result = await call_order_customer(order_request)
            
            if result.get("success"):
                results["success"] += 1
            else:
                results["failed"] += 1
            
            results["details"].append({
                "order_number": order_number,
                "status": "success" if result.get("success") else "failed",
                "phone": result.get("phone_number")
            })
            
        except Exception as e:
            results["failed"] += 1
            results["details"].append({
                "order_number": order_number,
                "status": "error",
                "error": str(e)[:50]
            })
        
        # Rate limiting - wait between calls
        await asyncio.sleep(1)
    
    return {
        "success": True,
        "message": f"Completed {results['success']}/{results['total']} calls",
        **results
    }


@router.get("/call-logs")
async def get_call_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    order_number: Optional[str] = Query(None),
    phone: Optional[str] = Query(None)
):
    """Get call history logs"""
    db = get_db()
    
    query = {}
    if order_number:
        query["order_number"] = order_number
    if phone:
        query["phone_number"] = {"$regex": phone}
    
    skip = (page - 1) * limit
    
    logs = await db.call_logs.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.call_logs.count_documents(query)
    
    # Convert ObjectId to string
    for log in logs:
        log["_id"] = str(log["_id"])
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/templates")
async def get_call_templates():
    """Get all available call templates"""
    return {
        "templates": {
            name: " ".join(template.split()) 
            for name, template in CALL_TEMPLATES.items()
        }
    }


@router.post("/test-call")
async def test_call(
    phone: str = Query(..., description="Phone number to test"),
    message: str = Query("This is a test call from your e-commerce platform. Thank you.", description="Test message")
):
    """
    Make a test call to verify BVM integration is working.
    """
    request = MakeCallRequest(
        phone_number=phone,
        message=message
    )
    return await make_voice_call(request)
