"""
COD Blocker for tnvcollectionpk
Blocks Cash on Delivery for customers who have returned orders.
Tags customers with "no-cod" in Shopify and injects theme scripts.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import httpx
import os
import logging

router = APIRouter(prefix="/api/cod-blocker", tags=["COD Blocker"])
logger = logging.getLogger(__name__)

SHOP = "tnvcollectionpk.myshopify.com"
TOKEN = os.environ.get("SHOPIFY_TNVCOLLECTIONPK_TOKEN", "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")
HEADERS = {"X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json"}

_db = None

def get_db():
    global _db
    if _db is None:
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "shopify_customers_db")
        client = AsyncIOMotorClient(mongo_url)
        _db = client[db_name]
    return _db


async def fetch_rto_customer_ids():
    """Fetch all customer IDs from RTO orders (cancelled orders that were fulfilled/shipped)."""
    customer_ids = set()
    url = f"https://{SHOP}/admin/api/2024-01/orders.json?status=cancelled&limit=250&fields=id,fulfillment_status,customer"

    async with httpx.AsyncClient(timeout=30) as client:
        page = 0
        while url:
            r = await client.get(url, headers=HEADERS)
            if r.status_code != 200:
                logger.error(f"Shopify API error: {r.status_code}")
                break

            orders = r.json().get("orders", [])
            page += 1
            for order in orders:
                # Only count orders that were fulfilled (shipped) before being cancelled = RTO
                if order.get("fulfillment_status") == "fulfilled":
                    cust = order.get("customer")
                    if cust and cust.get("id"):
                        customer_ids.add(cust["id"])

            link = r.headers.get("Link", "")
            if 'rel="next"' in link:
                for part in link.split(","):
                    if 'rel="next"' in part:
                        url = part.split("<")[1].split(">")[0]
                        break
            else:
                url = None

            if page % 10 == 0:
                logger.info(f"Scanned {page} pages of cancelled orders, found {len(customer_ids)} unique RTO customers")

            import asyncio
            await asyncio.sleep(0.5)

    return customer_ids


async def tag_customer(client, customer_id, existing_tags):
    """Add 'no-cod' tag to a Shopify customer."""
    tags_list = [t.strip() for t in existing_tags.split(",") if t.strip()] if existing_tags else []
    if "no-cod" in tags_list:
        return False

    tags_list.append("no-cod")
    new_tags = ", ".join(tags_list)

    url = f"https://{SHOP}/admin/api/2024-01/customers/{customer_id}.json"
    payload = {"customer": {"id": customer_id, "tags": new_tags}}
    r = await client.put(url, headers=HEADERS, json=payload)
    return r.status_code == 200


async def run_sync_task():
    """Background task: scan RTO orders and tag customers."""
    logger.info("COD Blocker sync started")

    # Step 1: Fetch all RTO customer IDs
    rto_customer_ids = await fetch_rto_customer_ids()
    logger.info(f"Found {len(rto_customer_ids)} unique customers with RTO orders")

    if not rto_customer_ids:
        db = get_db()
        await db.cod_blocker_runs.insert_one({
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "rto_customers_found": 0,
            "customers_tagged": 0,
            "already_tagged": 0,
            "status": "completed"
        })
        return

    # Step 2: Tag each customer
    tagged = 0
    already_tagged = 0
    failed = 0
    db = get_db()

    async with httpx.AsyncClient(timeout=15) as client:
        for i, cid in enumerate(rto_customer_ids):
            try:
                # Fetch current customer tags
                r = await client.get(
                    f"https://{SHOP}/admin/api/2024-01/customers/{cid}.json?fields=id,tags,email",
                    headers=HEADERS
                )
                if r.status_code != 200:
                    failed += 1
                    continue

                cust = r.json().get("customer", {})
                current_tags = cust.get("tags", "")

                if "no-cod" in current_tags:
                    already_tagged += 1
                else:
                    ok = await tag_customer(client, cid, current_tags)
                    if ok:
                        tagged += 1
                        # Store in MongoDB
                        await db.cod_blocked_customers.update_one(
                            {"customer_id": cid},
                            {"$set": {
                                "customer_id": cid,
                                "email": cust.get("email"),
                                "tagged_at": datetime.now(timezone.utc).isoformat(),
                                "reason": "rto_order"
                            }},
                            upsert=True
                        )
                    else:
                        failed += 1

                if (i + 1) % 50 == 0:
                    logger.info(f"Progress: {i+1}/{len(rto_customer_ids)} | Tagged: {tagged}, Already: {already_tagged}")

                # Rate limit: Shopify allows ~2 req/sec
                import asyncio
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.error(f"Error tagging customer {cid}: {e}")
                failed += 1

    # Save run record
    await db.cod_blocker_runs.insert_one({
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "rto_customers_found": len(rto_customer_ids),
        "customers_tagged": tagged,
        "already_tagged": already_tagged,
        "failed": failed,
        "status": "completed"
    })

    logger.info(f"COD Blocker sync complete: {tagged} tagged, {already_tagged} already tagged, {failed} failed")


@router.post("/sync")
async def sync_cod_blocklist(background_tasks: BackgroundTasks):
    """Scan all RTO orders and tag customers with 'no-cod' in Shopify."""
    background_tasks.add_task(run_sync_task)
    return {
        "success": True,
        "message": "COD blocker sync started in background. Check /api/cod-blocker/status for progress."
    }


@router.get("/status")
async def get_sync_status():
    """Get the latest COD blocker sync run status."""
    db = get_db()
    last_run = await db.cod_blocker_runs.find_one(
        {}, {"_id": 0}, sort=[("completed_at", -1)]
    )
    total_blocked = await db.cod_blocked_customers.count_documents({})

    return {
        "success": True,
        "total_blocked_customers": total_blocked,
        "last_run": last_run
    }


@router.get("/check/{customer_email}")
async def check_customer_cod_status(customer_email: str):
    """Check if a specific customer is blocked from COD."""
    db = get_db()
    blocked = await db.cod_blocked_customers.find_one(
        {"email": customer_email.lower()}, {"_id": 0}
    )
    return {
        "success": True,
        "email": customer_email,
        "cod_blocked": blocked is not None,
        "details": blocked
    }


@router.get("/blocked-customers")
async def list_blocked_customers(skip: int = 0, limit: int = 50):
    """List all COD-blocked customers."""
    db = get_db()
    customers = await db.cod_blocked_customers.find(
        {}, {"_id": 0}
    ).sort("tagged_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.cod_blocked_customers.count_documents({})

    return {"success": True, "total": total, "customers": customers}


@router.post("/inject-theme")
async def inject_cod_blocker_theme():
    """Inject the COD blocker script into the tnvcollectionpk Shopify theme."""
    # Get active theme
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"https://{SHOP}/admin/api/2024-01/themes.json", headers=HEADERS)
        themes = r.json().get("themes", [])
        active = next((t for t in themes if t["role"] == "main"), None)
        if not active:
            raise HTTPException(status_code=404, detail="No active theme found")
        theme_id = active["id"]

        # Create the COD blocker snippet
        snippet_code = _get_cod_blocker_snippet()

        # Upload snippet
        r2 = await client.put(
            f"https://{SHOP}/admin/api/2024-01/themes/{theme_id}/assets.json",
            headers=HEADERS,
            json={"asset": {"key": "snippets/cod-blocker.liquid", "value": snippet_code}}
        )
        if r2.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail=f"Failed to create snippet: {r2.text}")

        # Now inject the snippet include into theme.liquid
        r3 = await client.get(
            f"https://{SHOP}/admin/api/2024-01/themes/{theme_id}/assets.json?asset[key]=layout/theme.liquid",
            headers=HEADERS
        )
        theme_liquid = r3.json().get("asset", {}).get("value", "")

        if "cod-blocker" not in theme_liquid:
            # Add before </body>
            theme_liquid = theme_liquid.replace("</body>", "{% render 'cod-blocker' %}\n</body>")

            r4 = await client.put(
                f"https://{SHOP}/admin/api/2024-01/themes/{theme_id}/assets.json",
                headers=HEADERS,
                json={"asset": {"key": "layout/theme.liquid", "value": theme_liquid}}
            )
            if r4.status_code not in [200, 201]:
                raise HTTPException(status_code=500, detail=f"Failed to update theme.liquid: {r4.text}")

    return {
        "success": True,
        "message": "COD blocker script injected into theme",
        "theme_id": theme_id,
        "theme_name": active["name"]
    }


def _get_cod_blocker_snippet():
    """Generate the Liquid/JS snippet for COD blocking on cart page."""
    return '''{% comment %}
  COD Blocker - Hides Cash on Delivery for customers tagged "no-cod"
  Injected by Wamerce COD Blocker system
{% endcomment %}

{% if customer and customer.tags contains 'no-cod' %}
<style>
  .cod-blocked-notice {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    border: 1px solid #f0c36d;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 15px 0;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .cod-blocked-notice .notice-icon {
    font-size: 24px;
    flex-shrink: 0;
  }
  .cod-blocked-notice .notice-text {
    font-size: 14px;
    color: #856404;
    line-height: 1.5;
  }
  .cod-blocked-notice .notice-text strong {
    color: #6d3a00;
  }
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
  var isCartPage = window.location.pathname.indexOf('/cart') !== -1;
  
  if (isCartPage) {
    // Show notice on cart page
    var cartForm = document.querySelector('form[action="/cart"]') || document.querySelector('.cart-form') || document.querySelector('[data-cart-form]') || document.querySelector('.cart__inner');
    if (cartForm) {
      var notice = document.createElement('div');
      notice.className = 'cod-blocked-notice';
      notice.innerHTML = '<span class="notice-icon">&#9888;</span><div class="notice-text"><strong>Cash on Delivery is not available</strong> for your account due to a previous order return. Please use <strong>online payment</strong> (credit/debit card or bank transfer) at checkout.</div>';
      cartForm.parentNode.insertBefore(notice, cartForm);
    }
  }

  // On checkout page - try to hide COD option
  // This runs via ScriptTag or checkout extensibility
  if (window.Shopify && window.Shopify.Checkout) {
    var observer = new MutationObserver(function(mutations) {
      var codOptions = document.querySelectorAll('[data-payment-method], .payment-method-list__item, [data-select-gateway]');
      codOptions.forEach(function(el) {
        var text = el.textContent || el.innerText || '';
        if (text.toLowerCase().indexOf('cash on delivery') !== -1 || text.toLowerCase().indexOf('cod') !== -1) {
          el.style.display = 'none';
        }
      });
    });
    
    var checkoutForm = document.querySelector('[data-payment-form]') || document.querySelector('.section--payment-method');
    if (checkoutForm) {
      observer.observe(checkoutForm, { childList: true, subtree: true });
    }
  }
});
</script>
{% endif %}'''


@router.post("/check-new-order")
async def check_new_order_cod(order_data: dict):
    """
    Webhook endpoint: Check if a new order is COD from a blocked customer.
    If so, auto-cancel the order.
    Called by Shopify webhook on order creation.
    """
    db = get_db()

    customer = order_data.get("customer", {})
    if not customer:
        return {"action": "none", "reason": "no customer data"}

    customer_id = customer.get("id")
    customer_email = (customer.get("email") or "").lower()
    customer_tags = customer.get("tags", "")
    gateway = order_data.get("payment_gateway_names", [])
    order_id = order_data.get("id")
    order_name = order_data.get("name")

    is_cod = any("cod" in g.lower() or "cash" in g.lower() for g in gateway)
    is_blocked = "no-cod" in customer_tags

    if not is_blocked and customer_email:
        blocked = await db.cod_blocked_customers.find_one({"email": customer_email})
        is_blocked = blocked is not None

    if is_cod and is_blocked:
        # Auto-cancel the COD order
        async with httpx.AsyncClient(timeout=15) as client:
            cancel_url = f"https://{SHOP}/admin/api/2024-01/orders/{order_id}/cancel.json"
            r = await client.post(cancel_url, headers=HEADERS, json={
                "reason": "other",
                "note": "COD not available for this customer due to previous returns. Please place order using online payment."
            })

            if r.status_code == 200:
                logger.info(f"Auto-cancelled COD order {order_name} for blocked customer {customer_email}")

                await db.cod_blocker_cancellations.insert_one({
                    "order_id": order_id,
                    "order_name": order_name,
                    "customer_id": customer_id,
                    "customer_email": customer_email,
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "reason": "cod_blocked_customer"
                })

                return {"action": "cancelled", "order": order_name, "reason": "customer_cod_blocked"}
            else:
                logger.error(f"Failed to cancel order {order_name}: {r.text}")
                return {"action": "cancel_failed", "error": r.text[:200]}

    return {"action": "none", "reason": "not a blocked COD order"}
