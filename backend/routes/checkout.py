"""Checkout API - Shopify Storefront Cart (hosted checkout).

The customer is redirected to Shopify's native checkout via cart.checkoutUrl.
Shopify handles payment (Razorpay configured inside Shopify Payments) and
order creation, and fires abandoned-checkout emails natively.
"""
import os
import logging
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/checkout", tags=["checkout"])

db = None


def set_database(database):
    global db
    db = database


SHOPIFY_STORE = os.environ.get("SHOPIFY_SHOP_URL", "").strip('"')
SHOPIFY_STOREFRONT_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN", "").strip('"')
SHOPIFY_STOREFRONT_GQL = f"https://{SHOPIFY_STORE}/api/2024-10/graphql.json"
SHOPIFY_STOREFRONT_HEADERS = {
    "Content-Type": "application/json",
    "Shopify-Storefront-Private-Token": SHOPIFY_STOREFRONT_TOKEN,
}


# ---------------- Shopify Storefront Cart (hosted checkout) ----------------

class ShopifyCartLine(BaseModel):
    variant_id: int
    quantity: int = 1


class ShopifyCartRequest(BaseModel):
    lines: List[ShopifyCartLine]
    email: Optional[str] = None
    note: Optional[str] = None


CART_CREATE_MUTATION = """
mutation cartCreate($input: CartInput!) {
  cartCreate(input: $input) {
    cart { id checkoutUrl totalQuantity }
    userErrors { field message }
  }
}
"""


@router.post("/shopify-cart")
async def create_shopify_cart(req: ShopifyCartRequest):
    """Create a Shopify Storefront Cart and return its hosted checkoutUrl."""
    if not SHOPIFY_STOREFRONT_TOKEN:
        raise HTTPException(500, "Storefront API token not configured")
    if not req.lines:
        raise HTTPException(400, "Cart has no items")

    lines = [
        {
            "merchandiseId": f"gid://shopify/ProductVariant/{line.variant_id}",
            "quantity": line.quantity,
        }
        for line in req.lines
    ]
    cart_input = {"lines": lines}
    if req.email:
        cart_input["buyerIdentity"] = {"email": req.email}
    if req.note:
        cart_input["note"] = req.note

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            SHOPIFY_STOREFRONT_GQL,
            headers=SHOPIFY_STOREFRONT_HEADERS,
            json={"query": CART_CREATE_MUTATION, "variables": {"input": cart_input}},
        )

    if resp.status_code != 200:
        logger.error(f"Shopify Storefront API error {resp.status_code}: {resp.text[:500]}")
        raise HTTPException(502, f"Shopify Storefront API error: {resp.status_code}")

    payload = resp.json()
    if "errors" in payload:
        logger.error(f"Shopify GraphQL errors: {payload['errors']}")
        raise HTTPException(502, f"Shopify GraphQL error: {payload['errors']}")

    result = payload.get("data", {}).get("cartCreate", {})
    user_errors = result.get("userErrors", [])
    if user_errors:
        logger.error(f"Shopify cartCreate userErrors: {user_errors}")
        raise HTTPException(400, f"Cart creation failed: {user_errors[0].get('message', 'unknown')}")

    cart = result.get("cart") or {}
    if not cart.get("checkoutUrl"):
        raise HTTPException(502, "Shopify did not return a checkout URL")

    return {
        "success": True,
        "cart_id": cart.get("id"),
        "checkout_url": cart.get("checkoutUrl"),
        "total_quantity": cart.get("totalQuantity"),
    }
