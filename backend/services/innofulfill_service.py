"""
Innofulfill (Shri Maruti Logistics / Delcaper) Integration Service
Handles authentication, rate calculation, order booking, and tracking.
"""

import os
import time
import httpx
from datetime import datetime, timezone

BASE_URL = os.environ.get("INNOFULFILL_BASE_URL")
EMAIL = os.environ.get("INNOFULFILL_EMAIL")
PASSWORD = os.environ.get("INNOFULFILL_PASSWORD")
VENDOR_CODE = os.environ.get("INNOFULFILL_VENDOR_CODE")

# Token cache
_token_cache = {
    "access_token": None,
    "refresh_token": None,
    "expires_at": 0,
}


async def _login():
    """Authenticate and cache tokens."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": EMAIL, "password": PASSWORD, "vendorType": "SELLER"},
        )
        data = resp.json()
        if data.get("status") != 200:
            raise Exception(f"Innofulfill login failed: {data.get('message', data)}")
        token_data = data["data"]
        _token_cache["access_token"] = token_data["accessToken"]
        _token_cache["refresh_token"] = token_data["refreshToken"]
        # Token expires in 1 day; refresh 1 hour early
        _token_cache["expires_at"] = time.time() + 82800
        return token_data["accessToken"]


async def _refresh():
    """Refresh access token using refresh token."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/auth/refresh-token",
            headers={"Authorization": f"Bearer {_token_cache['refresh_token']}"},
        )
        data = resp.json()
        if data.get("status") == 200:
            _token_cache["access_token"] = data["data"]["accessToken"]
            _token_cache["expires_at"] = time.time() + 82800
            return _token_cache["access_token"]
    # Refresh failed, do full login
    return await _login()


async def get_token():
    """Get a valid access token, refreshing/re-logging as needed."""
    if _token_cache["access_token"] and time.time() < _token_cache["expires_at"]:
        return _token_cache["access_token"]
    if _token_cache["refresh_token"]:
        return await _refresh()
    return await _login()


async def _request(method, path, json_body=None, params=None, retry=True):
    """Make an authenticated API request with auto-retry on 401."""
    token = await get_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        if method == "GET":
            resp = await client.get(f"{BASE_URL}{path}", headers=headers, params=params)
        else:
            resp = await client.post(f"{BASE_URL}{path}", headers=headers, json=json_body)

        data = resp.json()

        # Auto-retry on 401
        if resp.status_code == 401 and retry:
            _token_cache["access_token"] = None
            _token_cache["expires_at"] = 0
            return await _request(method, path, json_body, params, retry=False)

        return data


# ─── Rate Calculator ──────────────────────────────────────────────

async def calculate_rate(from_pincode: str, to_pincode: str, weight: float,
                         length: float = 30, width: float = 20, height: float = 10,
                         delivery_type: str = "SURFACE"):
    """
    Calculate shipping rate.
    weight: in grams
    dimensions: in cm
    delivery_type: SURFACE or AIR
    """
    payload = {
        "deliveryPromise": delivery_type,
        "fromPincode": str(from_pincode),
        "toPincode": str(to_pincode),
        "weight": weight,
        "length": length,
        "width": width,
        "height": height,
    }
    return await _request("POST", "/fulfillment/rate-card/calculate-rate/ecomm", payload)


# ─── Order Booking (Ecomm Push Order) ────────────────────────────

async def push_order(order_data: dict):
    """
    Push an ecomm order to Shri Maruti Logistics.
    
    Required fields in order_data:
    - orderId: str (unique)
    - shippingAddress: {name, phone, address1, city, state, country, zip}
    - pickupAddress: {name, phone, address1, city, state, country, zip}
    - amount: float
    - weight: float (grams)
    - length, width, height: float (cm)
    - currency: str (INR)
    - paymentType: ONLINE | COD
    - paymentStatus: PAID | UNPAID
    - deliveryPromise: SURFACE | AIR
    - lineItems: [{name, weight, quantity, unitPrice, price, sku}]
    """
    return await _request(
        "POST",
        "/fulfillment/public/seller/order/ecomm/push-order",
        order_data,
    )


# ─── Order Cancellation ──────────────────────────────────────────

async def cancel_order(order_ids: list, reason: str = "Cancelled by seller"):
    """Cancel one or more orders."""
    payload = {"orderId": order_ids, "reason": reason}
    return await _request("POST", "/booking/order/cancel", payload)


# ─── Tracking ─────────────────────────────────────────────────────

async def get_tracking_status(tracking_id: str, status_type: str = "customer"):
    """Get current tracking status for a shipment."""
    return await _request(
        "GET",
        f"/tracking/status/{tracking_id}",
        params={"type": status_type},
    )


async def get_tracking_history(tracking_id: str, status_type: str = "customer"):
    """Get full tracking history for a shipment."""
    return await _request(
        "GET",
        f"/tracking/{tracking_id}/statuses",
        params={"type": status_type},
    )
