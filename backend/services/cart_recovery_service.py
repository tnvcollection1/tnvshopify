"""
Abandoned Cart Recovery Service
Sends automated WhatsApp reminders to customers who abandoned their carts
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import httpx
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cart-recovery", tags=["Cart Recovery"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "wamerce")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# WhatsApp API Configuration
WHATSAPP_API_URL = "https://graph.facebook.com/v18.0"
WHATSAPP_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '')
WHATSAPP_ACCESS_TOKEN = os.environ.get('WHATSAPP_ACCESS_TOKEN', '')


# ==================== Models ====================

class CartRecoverySettings(BaseModel):
    enabled: bool = True
    first_reminder_hours: int = 1  # Send first reminder after 1 hour
    second_reminder_hours: int = 24  # Send second reminder after 24 hours
    third_reminder_hours: int = 72  # Send third reminder after 72 hours (3 days)
    max_reminders: int = 3
    include_discount: bool = True
    discount_code: Optional[str] = "COMEBACK10"
    discount_percent: int = 10
    store: str = "tnvcollection"


class AbandonedCart(BaseModel):
    session_id: str
    customer_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    customer_name: Optional[str] = None
    items: List[dict] = []
    total: float = 0
    currency: str = "INR"
    store: str = "tnvcollection"


class SendReminderRequest(BaseModel):
    session_id: str
    reminder_number: int = 1
    include_discount: bool = True
    custom_message: Optional[str] = None


# ==================== WhatsApp Message Templates ====================

CART_RECOVERY_TEMPLATES = {
    "reminder_1": {
        "en": """🛒 *You left something behind!*

Hi{customer_name}!

You have items waiting in your cart:

{items_list}

💰 *Total: {total}*

Don't miss out! Complete your purchase now.

👉 {checkout_url}

Need help? Reply to this message!""",
        
        "ur": """🛒 *آپ نے کچھ چھوڑ دیا!*

ہیلو{customer_name}!

آپ کی ٹوکری میں آئٹمز موجود ہیں:

{items_list}

💰 *کل: {total}*

مت چھوڑیں! ابھی خریداری مکمل کریں۔

👉 {checkout_url}"""
    },
    
    "reminder_2": {
        "en": """⏰ *Your cart is expiring soon!*

Hi{customer_name}!

Just a friendly reminder - your cart items are still waiting:

{items_list}

💰 Total: {total}

{discount_message}

Complete your order: {checkout_url}

Items may sell out! ⚡""",
        
        "ur": """⏰ *آپ کی ٹوکری جلد ختم ہو رہی ہے!*

ہیلو{customer_name}!

یاد دہانی - آپ کے آئٹمز ابھی بھی منتظر ہیں:

{items_list}

💰 کل: {total}

{discount_message}

آرڈر مکمل کریں: {checkout_url}"""
    },
    
    "reminder_3": {
        "en": """🎁 *Last chance - Special offer just for you!*

Hi{customer_name}!

Your cart is about to expire, but we don't want you to miss out!

{items_list}

{discount_message}

💰 *New Total: {discounted_total}*
(Original: {total})

⏰ Offer expires in 24 hours!

👉 {checkout_url}

Don't let this deal slip away! 🏃""",
        
        "ur": """🎁 *آخری موقع - خاص آفر!*

ہیلو{customer_name}!

آپ کی ٹوکری ختم ہونے والی ہے!

{items_list}

{discount_message}

💰 *نئی قیمت: {discounted_total}*
(اصل: {total})

⏰ آفر 24 گھنٹوں میں ختم!

👉 {checkout_url}"""
    }
}


# ==================== Helper Functions ====================

def format_currency(amount: float, currency: str = "INR") -> str:
    """Format amount with currency symbol"""
    symbols = {"INR": "₹", "PKR": "Rs.", "USD": "$"}
    symbol = symbols.get(currency, currency + " ")
    return f"{symbol}{amount:,.0f}"


def format_items_list(items: List[dict], currency: str = "INR") -> str:
    """Format cart items for WhatsApp message"""
    lines = []
    for item in items[:5]:  # Limit to 5 items
        name = item.get("name", item.get("title", "Product"))[:30]
        qty = item.get("quantity", 1)
        price = item.get("price", 0)
        lines.append(f"• {name} x{qty} - {format_currency(price * qty, currency)}")
    
    if len(items) > 5:
        lines.append(f"... and {len(items) - 5} more items")
    
    return "\n".join(lines)


async def send_whatsapp_message(phone: str, message: str) -> dict:
    """Send WhatsApp message via Meta Cloud API"""
    
    if not WHATSAPP_PHONE_NUMBER_ID or not WHATSAPP_ACCESS_TOKEN:
        logger.warning("WhatsApp API credentials not configured")
        return {"success": False, "error": "WhatsApp not configured"}
    
    # Clean phone number
    clean_phone = "".join(filter(str.isdigit, phone))
    if not clean_phone.startswith("91") and not clean_phone.startswith("92"):
        # Default to India if no country code
        if len(clean_phone) == 10:
            clean_phone = "91" + clean_phone
    
    url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "to": clean_phone,
        "type": "text",
        "text": {"body": message}
    }
    
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return {"success": True, "response": response.json()}
            else:
                logger.error(f"WhatsApp API error: {response.status_code} - {response.text}")
                return {"success": False, "error": response.text}
    except Exception as e:
        logger.error(f"WhatsApp send error: {str(e)}")
        return {"success": False, "error": str(e)}


def get_checkout_url(session_id: str, store: str = "tnvcollection") -> str:
    """Generate checkout URL for the cart"""
    base_url = os.environ.get("FRONTEND_URL", "https://tnvcollection.com")
    store_path = "/tnv" if store == "tnvcollection" else "/tnv-pk"
    return f"{base_url}{store_path}/checkout?cart={session_id}"


# ==================== API Endpoints ====================

@router.get("/settings/{store}")
async def get_recovery_settings(store: str = "tnvcollection"):
    """Get cart recovery settings for a store"""
    
    settings = await db.cart_recovery_settings.find_one({"store": store})
    
    if not settings:
        # Return defaults
        return CartRecoverySettings(store=store).dict()
    
    settings.pop("_id", None)
    return settings


@router.put("/settings/{store}")
async def update_recovery_settings(store: str, settings: CartRecoverySettings):
    """Update cart recovery settings for a store"""
    
    settings_dict = settings.dict()
    settings_dict["store"] = store
    settings_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.cart_recovery_settings.update_one(
        {"store": store},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"success": True, "message": "Settings updated"}


@router.get("/abandoned-carts")
async def get_abandoned_carts(
    store: str = "tnvcollection",
    min_hours: int = 1,
    max_hours: int = 168,  # 7 days
    limit: int = 50
):
    """Get list of abandoned carts for a store"""
    
    now = datetime.now(timezone.utc)
    min_time = now - timedelta(hours=max_hours)
    max_time = now - timedelta(hours=min_hours)
    
    # Find carts that:
    # 1. Have items
    # 2. Were updated within the time window
    # 3. Haven't been converted to orders
    # 4. Have contact info (phone or email)
    
    pipeline = [
        {
            "$match": {
                "store": store,
                "items": {"$exists": True, "$ne": []},
                "updated_at": {"$gte": min_time, "$lte": max_time},
                "converted_to_order": {"$ne": True},
                "$or": [
                    {"phone": {"$exists": True, "$ne": None, "$ne": ""}},
                    {"email": {"$exists": True, "$ne": None, "$ne": ""}}
                ]
            }
        },
        {"$sort": {"updated_at": -1}},
        {"$limit": limit},
        {
            "$project": {
                "_id": 0,
                "session_id": 1,
                "customer_id": 1,
                "customer_name": 1,
                "phone": 1,
                "email": 1,
                "items": 1,
                "total": 1,
                "currency": 1,
                "store": 1,
                "updated_at": 1,
                "reminders_sent": 1,
                "last_reminder_at": 1
            }
        }
    ]
    
    carts = await db.checkout_carts.aggregate(pipeline).to_list(limit)
    
    # Calculate hours since abandonment
    for cart in carts:
        if cart.get("updated_at"):
            hours_abandoned = (now - cart["updated_at"]).total_seconds() / 3600
            cart["hours_abandoned"] = round(hours_abandoned, 1)
    
    return {
        "carts": carts,
        "count": len(carts),
        "store": store
    }


@router.post("/send-reminder")
async def send_cart_reminder(request: SendReminderRequest, background_tasks: BackgroundTasks):
    """Send a cart recovery reminder via WhatsApp"""
    
    # Get cart
    cart = await db.checkout_carts.find_one({"session_id": request.session_id})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    phone = cart.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number for this cart")
    
    # Get settings
    store = cart.get("store", "tnvcollection")
    settings = await db.cart_recovery_settings.find_one({"store": store})
    if not settings:
        settings = CartRecoverySettings(store=store).dict()
    
    # Check if already sent max reminders
    reminders_sent = cart.get("reminders_sent", 0)
    if reminders_sent >= settings.get("max_reminders", 3):
        return {"success": False, "message": "Max reminders already sent"}
    
    # Get template
    template_key = f"reminder_{min(request.reminder_number, 3)}"
    template = CART_RECOVERY_TEMPLATES.get(template_key, CART_RECOVERY_TEMPLATES["reminder_1"])
    
    # Determine language (default to English, use Urdu for Pakistan)
    language = "ur" if store == "tnvcollectionpk" else "en"
    message_template = template.get(language, template["en"])
    
    # Format items
    items = cart.get("items", [])
    currency = cart.get("currency", "INR")
    total = cart.get("total", 0)
    
    items_list = format_items_list(items, currency)
    formatted_total = format_currency(total, currency)
    
    # Discount message
    discount_message = ""
    discounted_total = formatted_total
    if request.include_discount and settings.get("include_discount"):
        discount_code = settings.get("discount_code", "COMEBACK10")
        discount_percent = settings.get("discount_percent", 10)
        discount_message = f"🎉 Use code *{discount_code}* for {discount_percent}% off!"
        discounted = total * (1 - discount_percent / 100)
        discounted_total = format_currency(discounted, currency)
    
    # Build message
    customer_name = cart.get("customer_name", "")
    if customer_name:
        customer_name = f" {customer_name}"
    
    checkout_url = get_checkout_url(request.session_id, store)
    
    message = message_template.format(
        customer_name=customer_name,
        items_list=items_list,
        total=formatted_total,
        discounted_total=discounted_total,
        discount_message=discount_message,
        checkout_url=checkout_url
    )
    
    if request.custom_message:
        message = request.custom_message
    
    # Send WhatsApp message
    result = await send_whatsapp_message(phone, message)
    
    # Update cart with reminder info
    await db.checkout_carts.update_one(
        {"session_id": request.session_id},
        {
            "$set": {
                "last_reminder_at": datetime.now(timezone.utc),
                "last_reminder_type": template_key
            },
            "$inc": {"reminders_sent": 1}
        }
    )
    
    # Log the reminder
    await db.cart_recovery_logs.insert_one({
        "session_id": request.session_id,
        "phone": phone,
        "reminder_number": request.reminder_number,
        "message": message,
        "result": result,
        "store": store,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "success": result.get("success", False),
        "session_id": request.session_id,
        "reminder_number": request.reminder_number,
        "phone": phone[:4] + "****" + phone[-4:] if len(phone) > 8 else "****",
        "result": result
    }


@router.post("/send-bulk-reminders")
async def send_bulk_reminders(
    store: str = "tnvcollection",
    reminder_hours: int = 1,
    limit: int = 50,
    background_tasks: BackgroundTasks = None
):
    """Send reminders to all eligible abandoned carts"""
    
    now = datetime.now(timezone.utc)
    
    # Get settings
    settings = await db.cart_recovery_settings.find_one({"store": store})
    if not settings:
        settings = CartRecoverySettings(store=store).dict()
    
    if not settings.get("enabled", True):
        return {"success": False, "message": "Cart recovery is disabled for this store"}
    
    # Find eligible carts
    min_time = now - timedelta(hours=reminder_hours + 1)
    max_time = now - timedelta(hours=reminder_hours)
    
    carts = await db.checkout_carts.find({
        "store": store,
        "items": {"$exists": True, "$ne": []},
        "updated_at": {"$gte": min_time, "$lte": max_time},
        "converted_to_order": {"$ne": True},
        "phone": {"$exists": True, "$ne": None, "$ne": ""},
        "$or": [
            {"reminders_sent": {"$exists": False}},
            {"reminders_sent": {"$lt": settings.get("max_reminders", 3)}}
        ]
    }).limit(limit).to_list(limit)
    
    results = []
    for cart in carts:
        reminders_sent = cart.get("reminders_sent", 0)
        reminder_number = reminders_sent + 1
        
        try:
            request = SendReminderRequest(
                session_id=cart["session_id"],
                reminder_number=reminder_number,
                include_discount=reminder_number >= 2  # Include discount from 2nd reminder
            )
            
            result = await send_cart_reminder(request, background_tasks)
            results.append({
                "session_id": cart["session_id"],
                "success": result.get("success", False)
            })
        except Exception as e:
            logger.error(f"Failed to send reminder for {cart['session_id']}: {str(e)}")
            results.append({
                "session_id": cart["session_id"],
                "success": False,
                "error": str(e)
            })
    
    return {
        "success": True,
        "total_carts": len(carts),
        "reminders_sent": len([r for r in results if r.get("success")]),
        "results": results
    }


@router.get("/stats")
async def get_recovery_stats(store: str = "tnvcollection", days: int = 30):
    """Get cart recovery statistics"""
    
    since = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Count abandoned carts
    abandoned_count = await db.checkout_carts.count_documents({
        "store": store,
        "items": {"$exists": True, "$ne": []},
        "updated_at": {"$gte": since},
        "converted_to_order": {"$ne": True}
    })
    
    # Count reminders sent
    reminders_sent = await db.cart_recovery_logs.count_documents({
        "store": store,
        "created_at": {"$gte": since}
    })
    
    # Count recovered carts (carts that converted after receiving a reminder)
    recovered_pipeline = [
        {
            "$match": {
                "store": store,
                "reminders_sent": {"$gt": 0},
                "converted_to_order": True,
                "updated_at": {"$gte": since}
            }
        },
        {"$count": "total"}
    ]
    
    recovered_result = await db.checkout_carts.aggregate(recovered_pipeline).to_list(1)
    recovered_count = recovered_result[0]["total"] if recovered_result else 0
    
    # Calculate recovery rate
    total_reminded = await db.checkout_carts.count_documents({
        "store": store,
        "reminders_sent": {"$gt": 0},
        "updated_at": {"$gte": since}
    })
    
    recovery_rate = (recovered_count / total_reminded * 100) if total_reminded > 0 else 0
    
    # Get revenue recovered (from recovered orders)
    revenue_pipeline = [
        {
            "$match": {
                "store": store,
                "reminders_sent": {"$gt": 0},
                "converted_to_order": True,
                "updated_at": {"$gte": since}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_revenue": {"$sum": "$total"}
            }
        }
    ]
    
    revenue_result = await db.checkout_carts.aggregate(revenue_pipeline).to_list(1)
    revenue_recovered = revenue_result[0]["total_revenue"] if revenue_result else 0
    
    return {
        "store": store,
        "period_days": days,
        "abandoned_carts": abandoned_count,
        "reminders_sent": reminders_sent,
        "recovered_carts": recovered_count,
        "recovery_rate": round(recovery_rate, 1),
        "revenue_recovered": revenue_recovered
    }


@router.get("/logs")
async def get_recovery_logs(
    store: str = "tnvcollection",
    limit: int = 50,
    skip: int = 0
):
    """Get cart recovery log history"""
    
    logs = await db.cart_recovery_logs.find(
        {"store": store},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.cart_recovery_logs.count_documents({"store": store})
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.post("/mark-converted/{session_id}")
async def mark_cart_converted(session_id: str, order_id: str = None):
    """Mark a cart as converted to order (for tracking recovery success)"""
    
    result = await db.checkout_carts.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "converted_to_order": True,
                "order_id": order_id,
                "converted_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    return {"success": True, "message": "Cart marked as converted"}
