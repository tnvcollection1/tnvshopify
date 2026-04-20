"""
Abandoned Checkout Recovery — WhatsApp follow-up layer on top of
Shopify's native abandoned-checkout emails.

Flow:
  1. Shopify fires webhook `checkouts/create` / `checkouts/update` whenever a
     customer starts a checkout.
  2. We enqueue a row in `abandoned_checkouts` with status='pending' and
     `send_at = now + DELAY_MINUTES`.
  3. A lightweight asyncio background loop polls every 60s and for any row
     where status=='pending' AND send_at<=now AND checkout is still not
     completed, sends a WhatsApp message via the existing Meta Cloud API
     helper and flips status to 'sent'.
  4. If Shopify fires `orders/create` for the same checkout token/email, we
     flip status to 'recovered' (no WhatsApp sent).
"""
import os
import hmac
import hashlib
import base64
import asyncio
import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Request, Header, HTTPException
from pydantic import BaseModel

from services.whatsapp_notifications import send_whatsapp_message, clean_phone_number

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/abandoned-cart", tags=["abandoned-cart"])

db = None

def set_database(database):
    global db
    db = database


# Config
DELAY_MINUTES = int(os.environ.get("ABANDONED_CART_DELAY_MIN", "60"))
WEBHOOK_SECRET = os.environ.get("SHOPIFY_WEBHOOK_SECRET", "")
SHOPIFY_STORE = os.environ.get("SHOPIFY_SHOP_URL", "").strip('"')
MESSAGE_TEMPLATE = (
    "Hi {first_name} 👋\n\n"
    "You left some lovely picks in your cart at TnV Collection:\n"
    "{items}\n\n"
    "Total: Rs.{total}\n\n"
    "Complete your order now → {checkout_url}\n\n"
    "Need help? Just reply to this message."
)


class AbandonedCheckoutWebhook(BaseModel):
    """Minimal shape we care about from Shopify's abandoned checkout payload."""
    id: Optional[int] = None
    token: Optional[str] = None
    abandoned_checkout_url: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    total_price: Optional[str] = None
    currency: Optional[str] = None


def _verify_signature(body: bytes, hmac_header: Optional[str]) -> bool:
    if not WEBHOOK_SECRET or not hmac_header:
        return True  # If no secret configured, skip verification (dev mode)
    calculated = base64.b64encode(
        hmac.new(WEBHOOK_SECRET.encode("utf-8"), body, hashlib.sha256).digest()
    ).decode("utf-8")
    return hmac.compare_digest(calculated, hmac_header)


def _format_items(line_items: list) -> str:
    lines = []
    for item in (line_items or [])[:5]:
        title = item.get("title", "Item")
        qty = item.get("quantity", 1)
        lines.append(f"• {title} × {qty}")
    if len(line_items or []) > 5:
        lines.append(f"…and {len(line_items) - 5} more")
    return "\n".join(lines) if lines else "• Your selection"


# ---------------- Shopify Webhooks ----------------

@router.post("/webhook/checkouts-create")
async def checkout_created(
    request: Request,
    x_shopify_hmac_sha256: Optional[str] = Header(None),
    x_shopify_shop_domain: Optional[str] = Header(None),
):
    """Shopify webhook: fired when a checkout is started or updated.

    We enqueue a pending abandoned-cart entry; it will be sent later only if
    the order is never completed.
    """
    body = await request.body()
    if not _verify_signature(body, x_shopify_hmac_sha256):
        raise HTTPException(401, "Invalid signature")

    payload = await request.json()
    token = payload.get("token") or str(payload.get("id") or "")
    if not token:
        return {"status": "ok", "reason": "no-token"}

    phone = (
        payload.get("phone")
        or (payload.get("customer") or {}).get("phone")
        or (payload.get("shipping_address") or {}).get("phone")
        or (payload.get("billing_address") or {}).get("phone")
    )
    email = payload.get("email") or (payload.get("customer") or {}).get("email")

    # Skip if we have neither phone nor email — nothing to recover to
    if not phone and not email:
        return {"status": "ok", "reason": "no-contact"}

    now = datetime.now(timezone.utc)
    doc = {
        "token": token,
        "shop_domain": x_shopify_shop_domain,
        "email": email,
        "phone": phone,
        "first_name": (payload.get("customer") or {}).get("first_name")
        or (payload.get("shipping_address") or {}).get("first_name")
        or "there",
        "total_price": payload.get("total_price"),
        "currency": payload.get("currency", "INR"),
        "line_items": [
            {"title": li.get("title"), "quantity": li.get("quantity", 1)}
            for li in (payload.get("line_items") or [])
        ],
        "abandoned_checkout_url": payload.get("abandoned_checkout_url"),
        "status": "pending",  # pending | sent | recovered | skipped
        "send_at": (now + timedelta(minutes=DELAY_MINUTES)).isoformat(),
        "updated_at": now.isoformat(),
    }

    await db.abandoned_checkouts.update_one(
        {"token": token},
        {
            "$set": doc,
            "$setOnInsert": {"created_at": now.isoformat()},
        },
        upsert=True,
    )
    logger.info(f"Abandoned checkout enqueued: token={token} phone={phone} email={email}")
    return {"status": "ok", "token": token}


@router.post("/webhook/order-created")
async def order_created(
    request: Request,
    x_shopify_hmac_sha256: Optional[str] = Header(None),
):
    """Shopify webhook: orders/create. If the checkout_token matches a pending
    abandoned cart, mark it as recovered and skip the WhatsApp send.
    """
    body = await request.body()
    if not _verify_signature(body, x_shopify_hmac_sha256):
        raise HTTPException(401, "Invalid signature")

    payload = await request.json()
    token = payload.get("checkout_token") or payload.get("cart_token")
    if not token:
        return {"status": "ok", "reason": "no-token"}

    result = await db.abandoned_checkouts.update_one(
        {"token": token, "status": "pending"},
        {"$set": {"status": "recovered", "recovered_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"status": "ok", "recovered": result.modified_count > 0}


# ---------------- Processor (called by background loop) ----------------

async def process_due_abandoned_carts(limit: int = 20) -> int:
    """Pick up to `limit` pending items whose send_at is in the past and send
    a WhatsApp message. Returns the count sent.
    """
    if db is None:
        return 0

    now_iso = datetime.now(timezone.utc).isoformat()
    cursor = db.abandoned_checkouts.find(
        {"status": "pending", "send_at": {"$lte": now_iso}},
        {"_id": 0},
    ).limit(limit)
    due = await cursor.to_list(length=limit)
    if not due:
        return 0

    sent = 0
    for item in due:
        token = item.get("token")
        phone = item.get("phone")
        if not phone:
            await db.abandoned_checkouts.update_one(
                {"token": token},
                {"$set": {"status": "skipped", "skip_reason": "no-phone"}},
            )
            continue

        try:
            message = MESSAGE_TEMPLATE.format(
                first_name=item.get("first_name") or "there",
                items=_format_items(item.get("line_items") or []),
                total=item.get("total_price") or "—",
                checkout_url=item.get("abandoned_checkout_url") or "",
            )
            result = await send_whatsapp_message(phone, message)
            await db.abandoned_checkouts.update_one(
                {"token": token},
                {
                    "$set": {
                        "status": "sent",
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                        "wa_result": {
                            "method": result.get("method"),
                            "message_id": result.get("message_id"),
                        },
                    }
                },
            )
            sent += 1
        except Exception as e:
            logger.exception(f"Failed to send abandoned cart WhatsApp for token={token}: {e}")
            await db.abandoned_checkouts.update_one(
                {"token": token},
                {"$set": {"status": "error", "error": str(e)[:200]}},
            )

    return sent


# ---------------- Admin / debug endpoints ----------------

@router.post("/process-now")
async def process_now(limit: int = 50):
    """Manual trigger for the processor. Useful for ops testing."""
    count = await process_due_abandoned_carts(limit=limit)
    return {"processed": count}


@router.get("/list")
async def list_abandoned(status: Optional[str] = None, limit: int = 50):
    """List recent abandoned checkouts (admin view)."""
    q = {}
    if status:
        q["status"] = status
    cursor = db.abandoned_checkouts.find(q, {"_id": 0}).sort("updated_at", -1).limit(limit)
    rows = await cursor.to_list(length=limit)
    return {"count": len(rows), "items": rows}


@router.post("/test-send")
async def test_send(phone: str, first_name: str = "there"):
    """Fire a test abandoned-cart WhatsApp to a phone number immediately."""
    msg = MESSAGE_TEMPLATE.format(
        first_name=first_name,
        items="• Test Item × 1",
        total="1,999",
        checkout_url=f"https://{SHOPIFY_STORE.replace('.myshopify.com','.com') if SHOPIFY_STORE else 'tnvcollection.com'}/",
    )
    result = await send_whatsapp_message(phone, msg)
    return result


# ---------------- Background loop ----------------

_loop_task: Optional[asyncio.Task] = None


async def _background_loop(interval_seconds: int = 60):
    logger.info(
        f"[abandoned-cart] background loop started (interval={interval_seconds}s, delay={DELAY_MINUTES}min)"
    )
    while True:
        try:
            await process_due_abandoned_carts()
        except Exception as e:
            logger.exception(f"[abandoned-cart] loop error: {e}")
        await asyncio.sleep(interval_seconds)


def start_background_loop():
    """Start the background loop task. Call once at app startup."""
    global _loop_task
    if _loop_task is None or _loop_task.done():
        _loop_task = asyncio.create_task(_background_loop())


def stop_background_loop():
    global _loop_task
    if _loop_task and not _loop_task.done():
        _loop_task.cancel()
