"""
Zong VPBX API Integration for tnvcollectionpk
Voice calling for order confirmations, delivery updates, etc.

API: https://cap.zong.com.pk:8444/vpbx-apis/customApi/vpbx-custom-apis
"""

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import httpx
import os
import logging

router = APIRouter(prefix="/api/zong-vpbx", tags=["Zong VPBX Voice Calling"])

logger = logging.getLogger(__name__)

# Zong VPBX API Configuration
VPBX_API_URL = os.environ.get("ZONG_VPBX_API_URL", "https://cap.zong.com.pk:8444/vpbx-apis/customApi/vpbx-custom-apis")
VPBX_ID = os.environ.get("ZONG_VPBX_ID", "65f841fd3ac8c")
VPBX_TOKEN = os.environ.get("ZONG_VPBX_TOKEN", "ca897158-a1f1-451e-a7c7-6c0a49fdc6a5")

# Store configuration - this integration is for tnvcollectionpk
TARGET_STORE = "tnvcollectionpk"

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

class VPBXCallRequest(BaseModel):
    phone_number: str = Field(..., description="Recipient phone number")
    message: str = Field(..., description="Text message for the call")
    caller_id: Optional[str] = Field(None, description="Caller ID to display")


class OrderCallRequest(BaseModel):
    shopify_order_number: str = Field(..., description="Shopify order number")
    call_type: str = Field("order_confirmation", description="Type: order_confirmation, delivery_update, cod_reminder, out_for_delivery")
    custom_message: Optional[str] = Field(None, description="Custom message (optional)")


class BulkOrderCallRequest(BaseModel):
    order_numbers: List[str] = Field(..., description="List of Shopify order numbers")
    call_type: str = Field("order_confirmation", description="Type of call")


class CallLogsRequest(BaseModel):
    call_type: Optional[str] = Field(None, description="Filter by call type: inbound, outbound")
    start_date: Optional[str] = Field(None, description="Start date YYYY-MM-DD")
    end_date: Optional[str] = Field(None, description="End date YYYY-MM-DD")


# =============================================================================
# CALL TEMPLATES (Urdu/English for Pakistan)
# =============================================================================

CALL_TEMPLATES = {
    "order_confirmation": """
        Assalam o Alaikum, yeh call TNV Collection Pakistan ki taraf se hai.
        Apka order number {order_number} confirm ho gaya hai.
        Total amount {total_amount} rupees hai.
        Hum {city} mein 3 se 5 din mein deliver kar dein ge.
        Shukriya.
    """,
    
    "order_confirmation_english": """
        Hello, this is a call from TNV Collection Pakistan.
        Your order number {order_number} has been confirmed.
        Total amount is {total_amount} rupees.
        We will deliver to {city} within 3 to 5 business days.
        Thank you for shopping with us.
    """,
    
    "delivery_update": """
        Assalam o Alaikum, TNV Collection Pakistan.
        Apka order number {order_number} ship ho gaya hai.
        Tracking number hai {tracking_number}.
        2 se 3 din mein delivery ho jaye gi.
        Shukriya.
    """,
    
    "cod_reminder": """
        Assalam o Alaikum, TNV Collection Pakistan se call hai.
        Apka order number {order_number} aaj deliver hoga.
        Cash on Delivery ke liye {total_amount} rupees ready rakhein.
        Shukriya.
    """,
    
    "out_for_delivery": """
        Assalam o Alaikum, TNV Collection Pakistan.
        Apka order number {order_number} delivery ke liye nikal chuka hai.
        Rider jald apke paas pahunch jaye ga.
        Meherbani kar ke available rahein.
        Shukriya.
    """,
    
    "delivery_failed": """
        Assalam o Alaikum, TNV Collection Pakistan.
        Hum ne apka order number {order_number} deliver karne ki koshish ki lekin ap available nahi thay.
        Please hum se contact karein re-delivery schedule karne ke liye.
        Shukriya.
    """,
    
    "feedback_request": """
        Assalam o Alaikum, TNV Collection Pakistan.
        Apka order number {order_number} deliver ho chuka hai.
        Umeed hai apko product pasand aya.
        Agar koi masla ho toh hum se zaroor contact karein.
        Shukriya.
    """,
}


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.get("/config")
async def get_vpbx_config():
    """Check Zong VPBX configuration status"""
    return {
        "api_url": VPBX_API_URL,
        "vpbx_id": VPBX_ID[:8] + "***" if VPBX_ID else None,
        "token_configured": bool(VPBX_TOKEN),
        "target_store": TARGET_STORE,
        "available_templates": list(CALL_TEMPLATES.keys()),
        "status": "configured" if VPBX_ID and VPBX_TOKEN else "not_configured"
    }


@router.post("/get-call-logs")
async def get_vpbx_call_logs(request: CallLogsRequest):
    """
    Get call logs from Zong VPBX Dashboard API.
    
    Fetches inbound/outbound call records for analytics.
    """
    if not VPBX_ID or not VPBX_TOKEN:
        raise HTTPException(status_code=400, detail="VPBX credentials not configured")
    
    # Build request payload
    payload = {
        "vpbx_id": VPBX_ID,
        "token": VPBX_TOKEN,
    }
    
    if request.call_type:
        payload["call_type"] = request.call_type
    if request.start_date:
        payload["start_date"] = request.start_date
    if request.end_date:
        payload["end_date"] = request.end_date
    
    try:
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            response = await client.post(
                VPBX_API_URL,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            try:
                result = response.json()
            except:
                result = {"raw_response": response.text}
        
        return {
            "success": response.status_code == 200,
            "status_code": response.status_code,
            "data": result
        }
        
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="VPBX API timeout")
    except Exception as e:
        logger.error(f"VPBX API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get call logs: {str(e)}")


@router.post("/make-call")
async def make_voice_call(request: VPBXCallRequest):
    """
    Make a voice call using Zong VPBX.
    
    Note: This endpoint requires the VPBX to support outbound calling.
    Check with Zong for outbound API availability.
    """
    if not VPBX_ID or not VPBX_TOKEN:
        raise HTTPException(status_code=400, detail="VPBX credentials not configured")
    
    # Clean phone number
    phone = request.phone_number.replace(" ", "").replace("-", "")
    if not phone.startswith("92") and not phone.startswith("+92"):
        if phone.startswith("0"):
            phone = "92" + phone[1:]
        else:
            phone = "92" + phone
    phone = phone.replace("+", "")
    
    # Prepare payload for outbound call
    payload = {
        "vpbx_id": VPBX_ID,
        "token": VPBX_TOKEN,
        "action": "make_call",
        "destination": phone,
        "message": request.message.strip(),
    }
    
    if request.caller_id:
        payload["caller_id"] = request.caller_id
    
    try:
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            response = await client.post(
                VPBX_API_URL,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            try:
                result = response.json()
            except:
                result = {"raw_response": response.text}
        
        # Log the call attempt
        db = get_db()
        await db.vpbx_call_logs.insert_one({
            "phone_number": phone,
            "message": request.message[:200],
            "store": TARGET_STORE,
            "status_code": response.status_code,
            "response": result,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {
            "success": response.status_code == 200,
            "phone_number": phone,
            "message_preview": request.message[:100] + "..." if len(request.message) > 100 else request.message,
            "api_response": result
        }
        
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="VPBX API timeout")
    except Exception as e:
        logger.error(f"VPBX call error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to make call: {str(e)}")


@router.post("/call-order")
async def call_order_customer(request: OrderCallRequest):
    """
    Make an automated call to a customer for a specific order.
    
    Templates available:
    - order_confirmation / order_confirmation_english
    - delivery_update
    - cod_reminder
    - out_for_delivery
    - delivery_failed
    - feedback_request
    """
    db = get_db()
    
    # First try customers collection (where Shopify sync stores data)
    customer = await db.customers.find_one({
        "$and": [
            {"store_name": TARGET_STORE},
            {"$or": [
                {"order_number": request.shopify_order_number},
                {"order_number": str(request.shopify_order_number)},
            ]}
        ]
    })
    
    if customer:
        # Found in customers collection
        phone = customer.get("phone")
        order_number = customer.get("order_number")
        total_amount = customer.get("total_spent") or "N/A"
        city = "apke sheher"  # Not stored in customers
        tracking_number = customer.get("tracking_number") or "jald share hoga"
    else:
        # Try orders collection as fallback
        order = await db.orders.find_one({
            "$and": [
                {"store_name": TARGET_STORE},
                {"$or": [
                    {"order_number": request.shopify_order_number},
                    {"order_number": int(request.shopify_order_number) if request.shopify_order_number.isdigit() else request.shopify_order_number},
                    {"name": f"#{request.shopify_order_number}"}
                ]}
            ]
        })
        
        if not order:
            # Try without store filter
            order = await db.orders.find_one({
                "$or": [
                    {"order_number": request.shopify_order_number},
                    {"name": f"#{request.shopify_order_number}"}
                ]
            })
        
        if not order:
            raise HTTPException(status_code=404, detail=f"Order #{request.shopify_order_number} not found for {TARGET_STORE}")
        
        # Get phone number from order
        shipping_address = order.get("shipping_address", {})
        phone = shipping_address.get("phone") or order.get("phone") or order.get("customer", {}).get("phone")
        order_number = order.get("order_number") or order.get("name", "").replace("#", "") or request.shopify_order_number
        total_amount = order.get("total_price") or order.get("current_total_price") or "N/A"
        city = shipping_address.get("city") or "apke sheher"
        tracking_number = order.get("tracking_number") or "jald share hoga"
    
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number found for this order")
    
    # Get or build message
    if request.custom_message:
        message = request.custom_message
    else:
        template = CALL_TEMPLATES.get(request.call_type)
        if not template:
            raise HTTPException(
                status_code=400, 
                detail=f"Unknown call type: {request.call_type}. Available: {list(CALL_TEMPLATES.keys())}"
            )
        
        message = template.format(
            order_number=order_number,
            total_amount=total_amount,
            city=city,
            tracking_number=tracking_number,
        )
    
    # Clean up message
    message = " ".join(message.split())
    
    # Make the call
    call_request = VPBXCallRequest(
        phone_number=phone,
        message=message
    )
    
    result = await make_voice_call(call_request)
    
    # Update order with call history
    await db.orders.update_one(
        {"_id": order.get("_id")},
        {"$push": {
            "vpbx_call_history": {
                "call_type": request.call_type,
                "status": "sent",
                "phone": phone,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        }}
    )
    
    return {
        "success": result.get("success"),
        "order_number": order_number,
        "phone_number": phone,
        "call_type": request.call_type,
        "message_sent": message[:150] + "..." if len(message) > 150 else message,
        "store": TARGET_STORE,
        "api_response": result.get("api_response")
    }


@router.post("/bulk-call")
async def bulk_call_orders(request: BulkOrderCallRequest):
    """
    Make calls to multiple orders at once.
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
                status = "success"
            else:
                results["failed"] += 1
                status = "failed"
            
            results["details"].append({
                "order_number": order_number,
                "status": status,
                "phone": result.get("phone_number")
            })
            
        except HTTPException as e:
            results["failed"] += 1
            results["details"].append({
                "order_number": order_number,
                "status": "error",
                "error": e.detail[:100] if hasattr(e, 'detail') else str(e)[:100]
            })
        except Exception as e:
            results["failed"] += 1
            results["details"].append({
                "order_number": order_number,
                "status": "error",
                "error": str(e)[:100]
            })
        
        # Rate limiting
        await asyncio.sleep(1)
    
    return {
        "success": True,
        "store": TARGET_STORE,
        "message": f"Completed {results['success']}/{results['total']} calls",
        **results
    }


@router.get("/call-history")
async def get_local_call_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    order_number: Optional[str] = Query(None),
    phone: Optional[str] = Query(None)
):
    """Get local call history logs"""
    db = get_db()
    
    query = {"store": TARGET_STORE}
    if order_number:
        query["order_number"] = order_number
    if phone:
        query["phone_number"] = {"$regex": phone}
    
    skip = (page - 1) * limit
    
    logs = await db.vpbx_call_logs.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vpbx_call_logs.count_documents(query)
    
    # Convert ObjectId
    for log in logs:
        log["_id"] = str(log["_id"])
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "store": TARGET_STORE
    }


@router.get("/templates")
async def get_call_templates():
    """Get all available call templates"""
    return {
        "store": TARGET_STORE,
        "templates": {
            name: " ".join(template.split()) 
            for name, template in CALL_TEMPLATES.items()
        }
    }


@router.post("/test")
async def test_vpbx_connection():
    """Test VPBX API connection by fetching recent call logs"""
    today = datetime.now().strftime("%Y-%m-%d")
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    
    request = CallLogsRequest(
        start_date=week_ago,
        end_date=today
    )
    
    try:
        result = await get_vpbx_call_logs(request)
        return {
            "success": True,
            "message": "VPBX connection successful",
            "test_result": result
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"VPBX connection failed: {str(e)}",
            "error": str(e)
        }
