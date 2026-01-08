"""
WhatsApp OTP API Routes
Handles OTP-based authentication, order confirmation, and notification verification via WhatsApp.
"""

from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel, Field
from typing import Optional
import logging

from services.whatsapp_otp_service import (
    send_whatsapp_otp,
    verify_otp,
    resend_otp,
    get_otp_status,
    enable_whatsapp_notifications,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp-otp", tags=["WhatsApp OTP"])

# Database reference (set by server.py)
_db = None

def set_database(database):
    global _db
    _db = database


# ==================== Request/Response Models ====================

class SendOTPRequest(BaseModel):
    """Request to send OTP"""
    phone_number: str = Field(..., description="Phone number with country code (e.g., +919876543210)")
    otp_type: str = Field("authentication", description="Type: 'authentication', 'order_confirmation', 'notification_verify'")
    store_name: Optional[str] = Field(None, description="Store name for context")
    order_id: Optional[str] = Field(None, description="Order ID for order confirmations")


class VerifyOTPRequest(BaseModel):
    """Request to verify OTP"""
    phone_number: str = Field(..., description="Phone number used to request OTP")
    otp: str = Field(..., description="6-digit OTP code")
    otp_type: Optional[str] = Field(None, description="Optional: filter by OTP type")


class LoginWithOTPRequest(BaseModel):
    """Request for OTP-based login"""
    phone_number: str = Field(..., description="Phone number for login")


class VerifyLoginOTPRequest(BaseModel):
    """Request to verify login OTP and get session"""
    phone_number: str
    otp: str


class EnableNotificationsRequest(BaseModel):
    """Request to enable WhatsApp notifications after OTP verification"""
    phone_number: str
    otp: str
    customer_id: str
    store_name: str


# ==================== API Endpoints ====================

@router.post("/send")
async def send_otp_endpoint(request: SendOTPRequest):
    """
    Send OTP to a phone number via WhatsApp.
    
    Use cases:
    - `authentication`: User login/registration
    - `order_confirmation`: Confirm order before processing
    - `notification_verify`: Verify phone before enabling notifications
    
    Returns masked phone number and expiration time.
    """
    try:
        result = await send_whatsapp_otp(
            phone_number=request.phone_number,
            otp_type=request.otp_type,
            store_name=request.store_name,
            order_id=request.order_id,
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to send OTP"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify")
async def verify_otp_endpoint(request: VerifyOTPRequest):
    """
    Verify an OTP.
    
    Returns success status and associated data (order_id, store_name, etc.)
    """
    try:
        result = await verify_otp(
            phone_number=request.phone_number,
            otp=request.otp,
            otp_type=request.otp_type,
        )
        
        if not result.get("success"):
            status_code = 400
            if result.get("code") == "OTP_EXPIRED":
                status_code = 410  # Gone
            elif result.get("code") == "MAX_ATTEMPTS":
                status_code = 429  # Too Many Requests
            raise HTTPException(status_code=status_code, detail=result.get("error"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/resend")
async def resend_otp_endpoint(request: SendOTPRequest):
    """
    Resend OTP (invalidates previous OTPs for this phone/type).
    
    Rate limited to 5 OTPs per hour per phone number.
    """
    try:
        result = await resend_otp(
            phone_number=request.phone_number,
            otp_type=request.otp_type,
            store_name=request.store_name,
            order_id=request.order_id,
        )
        
        if not result.get("success"):
            status_code = 400
            if result.get("code") == "RATE_LIMITED":
                status_code = 429
            raise HTTPException(status_code=status_code, detail=result.get("error"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_otp_status_endpoint(phone_number: str = Query(..., description="Phone number to check")):
    """
    Check if there's a pending OTP for a phone number.
    
    Returns expiration time and attempts used.
    """
    try:
        result = await get_otp_status(phone_number)
        return result
    except Exception as e:
        logger.error(f"OTP status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Authentication Flow ====================

@router.post("/login/send")
async def send_login_otp(request: LoginWithOTPRequest):
    """
    Step 1 of WhatsApp login: Send OTP to phone number.
    
    This initiates the passwordless login flow.
    """
    try:
        result = await send_whatsapp_otp(
            phone_number=request.phone_number,
            otp_type="authentication",
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to send login OTP"))
        
        response = {
            "success": True,
            "message": "Login OTP sent to your WhatsApp",
            "phone": result.get("phone"),
            "expires_in_minutes": 10,
        }
        
        # Include debug info if available
        if result.get("debug_otp"):
            response["debug_otp"] = result.get("debug_otp")
        if result.get("debug_whatsapp_error"):
            response["debug_whatsapp_error"] = result.get("debug_whatsapp_error")
        if result.get("whatsapp_delivered") is not None:
            response["whatsapp_delivered"] = result.get("whatsapp_delivered")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login/verify")
async def verify_login_otp(request: VerifyLoginOTPRequest):
    """
    Step 2 of WhatsApp login: Verify OTP and create session.
    
    Returns user data and session token if successful.
    Creates new user if phone number is not registered.
    """
    try:
        # Verify OTP
        verify_result = await verify_otp(
            phone_number=request.phone_number,
            otp=request.otp,
            otp_type="authentication",
        )
        
        if not verify_result.get("success"):
            raise HTTPException(status_code=400, detail=verify_result.get("error"))
        
        # Normalize phone number
        phone = request.phone_number.replace(" ", "").replace("-", "")
        if not phone.startswith("+"):
            if phone.startswith("0"):
                phone = "+91" + phone[1:]
            elif len(phone) == 10:
                phone = "+91" + phone
            else:
                phone = "+" + phone
        
        # Find or create user
        user = await _db.users.find_one({"phone": phone})
        
        if not user:
            # Create new user
            import uuid
            user_id = str(uuid.uuid4())
            user = {
                "user_id": user_id,
                "phone": phone,
                "auth_method": "whatsapp_otp",
                "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
                "last_login": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
                "is_active": True,
            }
            await _db.users.insert_one(user)
            is_new_user = True
        else:
            # Update last login
            await _db.users.update_one(
                {"phone": phone},
                {"$set": {"last_login": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()}}
            )
            is_new_user = False
        
        # Generate session token
        import secrets
        session_token = secrets.token_urlsafe(32)
        
        # Store session
        await _db.user_sessions.insert_one({
            "user_id": user.get("user_id") or str(user.get("_id")),
            "phone": phone,
            "token": session_token,
            "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
            "expires_at": (__import__("datetime").datetime.now(__import__("datetime").timezone.utc) + __import__("datetime").timedelta(days=30)).isoformat(),
        })
        
        return {
            "success": True,
            "message": "Login successful",
            "is_new_user": is_new_user,
            "user": {
                "user_id": user.get("user_id") or str(user.get("_id")),
                "phone": phone[-4:].rjust(len(phone), '*'),
                "name": user.get("name"),
                "email": user.get("email"),
            },
            "token": session_token,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login verify error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Order Confirmation Flow ====================

@router.post("/order/send")
async def send_order_confirmation_otp(
    phone_number: str = Body(...),
    order_id: str = Body(...),
    store_name: str = Body(...),
):
    """
    Send OTP for order confirmation.
    
    Call this before processing high-value orders or COD orders.
    """
    try:
        result = await send_whatsapp_otp(
            phone_number=phone_number,
            otp_type="order_confirmation",
            store_name=store_name,
            order_id=order_id,
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return {
            "success": True,
            "message": f"Order confirmation OTP sent for #{order_id}",
            "phone": result.get("phone"),
            "expires_in_minutes": 10,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Order OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/order/verify")
async def verify_order_confirmation(
    phone_number: str = Body(...),
    otp: str = Body(...),
    order_id: str = Body(...),
):
    """
    Verify order confirmation OTP.
    
    Marks the order as customer-confirmed if successful.
    """
    try:
        verify_result = await verify_otp(
            phone_number=phone_number,
            otp=otp,
            otp_type="order_confirmation",
        )
        
        if not verify_result.get("success"):
            raise HTTPException(status_code=400, detail=verify_result.get("error"))
        
        # Verify order ID matches
        if verify_result.get("order_id") and verify_result.get("order_id") != order_id:
            raise HTTPException(status_code=400, detail="OTP was not generated for this order")
        
        # Mark order as confirmed (update in orders collection)
        update_result = await _db.orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "customer_confirmed": True,
                "customer_confirmed_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
                "customer_confirmed_via": "whatsapp_otp",
            }}
        )
        
        return {
            "success": True,
            "message": "Order confirmed successfully",
            "order_id": order_id,
            "confirmed": True,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Order verify error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Notification Verification Flow ====================

@router.post("/notifications/send")
async def send_notification_verification_otp(
    phone_number: str = Body(...),
    customer_id: str = Body(...),
    store_name: str = Body(...),
):
    """
    Send OTP to verify phone before enabling WhatsApp notifications.
    """
    try:
        result = await send_whatsapp_otp(
            phone_number=phone_number,
            otp_type="notification_verify",
            store_name=store_name,
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return {
            "success": True,
            "message": "Verification OTP sent",
            "phone": result.get("phone"),
            "expires_in_minutes": 10,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Notification OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notifications/verify")
async def verify_and_enable_notifications(request: EnableNotificationsRequest):
    """
    Verify OTP and enable WhatsApp notifications for customer.
    """
    try:
        # Verify OTP
        verify_result = await verify_otp(
            phone_number=request.phone_number,
            otp=request.otp,
            otp_type="notification_verify",
        )
        
        if not verify_result.get("success"):
            raise HTTPException(status_code=400, detail=verify_result.get("error"))
        
        # Enable notifications
        enable_result = await enable_whatsapp_notifications(
            phone_number=request.phone_number,
            customer_id=request.customer_id,
            store_name=request.store_name,
        )
        
        if not enable_result.get("success"):
            raise HTTPException(status_code=400, detail=enable_result.get("error"))
        
        return {
            "success": True,
            "message": "WhatsApp notifications enabled successfully",
            "phone": enable_result.get("phone"),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enable notifications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
