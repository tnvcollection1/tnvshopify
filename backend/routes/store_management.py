"""
Wamerce Store Management API
Multi-tenant store management like Shopify
Handles store creation, configuration, and merchant onboarding
"""

from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import re
import secrets

router = APIRouter(prefix="/api/stores", tags=["Store Management"])

# Database connection (imported from main server)
def get_db():
    from server import db
    return db


# ===================== MODELS =====================

class StoreContact(BaseModel):
    email: str
    phone: Optional[str] = ""
    whatsapp: Optional[str] = ""
    support_hours: Optional[str] = "10 AM - 7 PM"

class StoreSocial(BaseModel):
    instagram: Optional[str] = ""
    facebook: Optional[str] = ""
    twitter: Optional[str] = ""
    youtube: Optional[str] = ""

class StoreTheme(BaseModel):
    primary: str = "#000000"
    accent: str = "#c9a050"
    background: str = "#ffffff"
    logo_url: Optional[str] = ""
    favicon_url: Optional[str] = ""

class StoreCurrency(BaseModel):
    code: str = "USD"
    symbol: str = "$"
    name: str = "US Dollar"

class StoreCreate(BaseModel):
    # Basic Info
    name: str = Field(..., min_length=2, max_length=100)
    subdomain: str = Field(..., min_length=3, max_length=50)
    tagline: Optional[str] = "Your Store"
    description: Optional[str] = ""
    
    # Location & Currency
    country: str = "United States"
    locale: str = "en-US"
    currency: StoreCurrency = StoreCurrency()
    
    # Contact
    contact: StoreContact
    
    # Social
    social: Optional[StoreSocial] = StoreSocial()
    
    # Theme
    theme: Optional[StoreTheme] = StoreTheme()
    
    # Shipping
    shipping_message: Optional[str] = "Free shipping on orders over $50"
    free_shipping_threshold: Optional[float] = 50
    shipping_cost: Optional[float] = 5.99
    
    # Promo
    promo_code: Optional[str] = ""
    
    # Custom Domain (optional - merchants can add later)
    custom_domain: Optional[str] = None
    
    @validator('subdomain')
    def validate_subdomain(cls, v):
        # Only lowercase letters, numbers, and hyphens
        if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$', v):
            raise ValueError('Subdomain must contain only lowercase letters, numbers, and hyphens')
        # Reserved subdomains
        reserved = ['www', 'api', 'admin', 'app', 'mail', 'smtp', 'ftp', 'dashboard', 'help', 'support', 'billing']
        if v in reserved:
            raise ValueError(f'Subdomain "{v}" is reserved')
        return v.lower()


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    country: Optional[str] = None
    locale: Optional[str] = None
    currency: Optional[StoreCurrency] = None
    contact: Optional[StoreContact] = None
    social: Optional[StoreSocial] = None
    theme: Optional[StoreTheme] = None
    shipping_message: Optional[str] = None
    free_shipping_threshold: Optional[float] = None
    shipping_cost: Optional[float] = None
    promo_code: Optional[str] = None
    custom_domain: Optional[str] = None
    is_active: Optional[bool] = None


class MerchantRegister(BaseModel):
    # Merchant Info
    merchant_name: str
    merchant_email: str
    merchant_phone: Optional[str] = ""
    password: str = Field(..., min_length=8)
    
    # Store Info
    store_name: str
    subdomain: str
    country: str = "Pakistan"
    currency_code: str = "PKR"
    
    @validator('subdomain')
    def validate_subdomain(cls, v):
        if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$', v):
            raise ValueError('Subdomain must contain only lowercase letters, numbers, and hyphens')
        reserved = ['www', 'api', 'admin', 'app', 'mail', 'smtp', 'ftp', 'dashboard', 'help', 'support', 'billing', 'wamerce']
        if v.lower() in reserved:
            raise ValueError(f'Subdomain "{v}" is reserved')
        return v.lower()


# ===================== CURRENCY PRESETS =====================

CURRENCY_PRESETS = {
    "USD": {"code": "USD", "symbol": "$", "name": "US Dollar"},
    "EUR": {"code": "EUR", "symbol": "€", "name": "Euro"},
    "GBP": {"code": "GBP", "symbol": "£", "name": "British Pound"},
    "INR": {"code": "INR", "symbol": "₹", "name": "Indian Rupee"},
    "PKR": {"code": "PKR", "symbol": "Rs", "name": "Pakistani Rupee"},
    "AED": {"code": "AED", "symbol": "د.إ", "name": "UAE Dirham"},
    "SAR": {"code": "SAR", "symbol": "ر.س", "name": "Saudi Riyal"},
    "BDT": {"code": "BDT", "symbol": "৳", "name": "Bangladeshi Taka"},
    "MYR": {"code": "MYR", "symbol": "RM", "name": "Malaysian Ringgit"},
    "SGD": {"code": "SGD", "symbol": "S$", "name": "Singapore Dollar"},
    "AUD": {"code": "AUD", "symbol": "A$", "name": "Australian Dollar"},
    "CAD": {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar"},
}


# ===================== ENDPOINTS =====================

@router.get("/currencies")
async def get_currencies():
    """Get available currency presets"""
    return {
        "success": True,
        "currencies": CURRENCY_PRESETS
    }


@router.get("")
async def list_stores(
    skip: int = 0,
    limit: int = 50,
    is_active: bool = None,
    search: str = None
):
    """List all stores (admin only)"""
    db = get_db()
    
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"subdomain": {"$regex": search, "$options": "i"}},
            {"contact.email": {"$regex": search, "$options": "i"}}
        ]
    
    stores = await db.wamerce_stores.find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    total = await db.wamerce_stores.count_documents(query)
    
    for store in stores:
        store["id"] = str(store["_id"])
        del store["_id"]
    
    return {
        "success": True,
        "stores": stores,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/by-subdomain/{subdomain}")
async def get_store_by_subdomain(subdomain: str):
    """Get store config by subdomain (public - used by storefront)"""
    db = get_db()
    
    store = await db.wamerce_stores.find_one({
        "subdomain": subdomain.lower(),
        "is_active": True
    })
    
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    store["id"] = str(store["_id"])
    del store["_id"]
    # Remove sensitive merchant info
    store.pop("merchant_id", None)
    store.pop("api_key", None)
    
    return {
        "success": True,
        "store": store
    }


@router.get("/by-domain/{domain}")
async def get_store_by_domain(domain: str):
    """Get store config by custom domain (public - used by storefront)"""
    db = get_db()
    
    store = await db.wamerce_stores.find_one({
        "custom_domain": domain.lower(),
        "is_active": True
    })
    
    if not store:
        raise HTTPException(status_code=404, detail="Store not found for this domain")
    
    store["id"] = str(store["_id"])
    del store["_id"]
    store.pop("merchant_id", None)
    store.pop("api_key", None)
    
    return {
        "success": True,
        "store": store
    }


@router.get("/check-subdomain/{subdomain}")
async def check_subdomain_availability(subdomain: str):
    """Check if a subdomain is available"""
    db = get_db()
    
    # Validate format
    if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$', subdomain.lower()):
        return {
            "available": False,
            "reason": "Invalid format. Use only lowercase letters, numbers, and hyphens."
        }
    
    # Check reserved
    reserved = ['www', 'api', 'admin', 'app', 'mail', 'smtp', 'ftp', 'dashboard', 'help', 'support', 'billing', 'wamerce']
    if subdomain.lower() in reserved:
        return {
            "available": False,
            "reason": "This subdomain is reserved."
        }
    
    # Check if exists
    existing = await db.wamerce_stores.find_one({"subdomain": subdomain.lower()})
    if existing:
        return {
            "available": False,
            "reason": "This subdomain is already taken."
        }
    
    return {
        "available": True,
        "subdomain": subdomain.lower(),
        "url": f"https://{subdomain.lower()}.wamerce.com"
    }


@router.post("")
async def create_store(store: StoreCreate):
    """Create a new store (admin only)"""
    db = get_db()
    
    # Check subdomain availability
    existing = await db.wamerce_stores.find_one({"subdomain": store.subdomain.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Subdomain already taken")
    
    # Check custom domain if provided
    if store.custom_domain:
        existing_domain = await db.wamerce_stores.find_one({"custom_domain": store.custom_domain.lower()})
        if existing_domain:
            raise HTTPException(status_code=400, detail="Custom domain already in use")
    
    now = datetime.now(timezone.utc).isoformat()
    
    store_doc = {
        **store.dict(),
        "subdomain": store.subdomain.lower(),
        "custom_domain": store.custom_domain.lower() if store.custom_domain else None,
        "is_active": True,
        "api_key": secrets.token_urlsafe(32),
        "created_at": now,
        "updated_at": now,
        # Stats
        "total_products": 0,
        "total_orders": 0,
        "total_revenue": 0
    }
    
    result = await db.wamerce_stores.insert_one(store_doc)
    store_doc["id"] = str(result.inserted_id)
    del store_doc["_id"]
    
    return {
        "success": True,
        "store": store_doc,
        "store_url": f"https://{store.subdomain}.wamerce.com",
        "message": f"Store created successfully! Your store URL is: {store.subdomain}.wamerce.com"
    }


@router.put("/{store_id}")
async def update_store(store_id: str, update: StoreUpdate):
    """Update a store"""
    db = get_db()
    
    # Build update document
    update_doc = {k: v for k, v in update.dict().items() if v is not None}
    
    if not update_doc:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Check custom domain uniqueness if being updated
    if "custom_domain" in update_doc and update_doc["custom_domain"]:
        existing = await db.wamerce_stores.find_one({
            "custom_domain": update_doc["custom_domain"].lower(),
            "_id": {"$ne": ObjectId(store_id)}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Custom domain already in use")
        update_doc["custom_domain"] = update_doc["custom_domain"].lower()
    
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.wamerce_stores.update_one(
        {"_id": ObjectId(store_id)},
        {"$set": update_doc}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Store not found")
    
    return {
        "success": True,
        "message": "Store updated successfully"
    }


@router.delete("/{store_id}")
async def delete_store(store_id: str):
    """Delete a store (soft delete - sets is_active to False)"""
    db = get_db()
    
    result = await db.wamerce_stores.update_one(
        {"_id": ObjectId(store_id)},
        {"$set": {
            "is_active": False,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Store not found")
    
    return {
        "success": True,
        "message": "Store deactivated successfully"
    }


@router.post("/{store_id}/activate")
async def activate_store(store_id: str):
    """Reactivate a deactivated store"""
    db = get_db()
    
    result = await db.wamerce_stores.update_one(
        {"_id": ObjectId(store_id)},
        {"$set": {"is_active": True}, "$unset": {"deleted_at": ""}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Store not found")
    
    return {
        "success": True,
        "message": "Store activated successfully"
    }


# ===================== MERCHANT ONBOARDING =====================

@router.post("/register")
async def register_merchant(data: MerchantRegister):
    """
    Merchant onboarding - creates merchant account and their store
    Like Shopify's signup flow
    """
    db = get_db()
    
    # Check if email already exists
    existing_merchant = await db.wamerce_merchants.find_one({"email": data.merchant_email.lower()})
    if existing_merchant:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    
    # Check subdomain availability
    existing_store = await db.wamerce_stores.find_one({"subdomain": data.subdomain.lower()})
    if existing_store:
        raise HTTPException(status_code=400, detail="This subdomain is already taken. Please choose another.")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Get currency preset
    currency = CURRENCY_PRESETS.get(data.currency_code, CURRENCY_PRESETS["USD"])
    
    # Create merchant account
    import hashlib
    password_hash = hashlib.sha256(data.password.encode()).hexdigest()
    
    merchant_doc = {
        "name": data.merchant_name,
        "email": data.merchant_email.lower(),
        "phone": data.merchant_phone,
        "password_hash": password_hash,
        "is_active": True,
        "is_verified": False,
        "created_at": now,
        "updated_at": now
    }
    
    merchant_result = await db.wamerce_merchants.insert_one(merchant_doc)
    merchant_id = str(merchant_result.inserted_id)
    
    # Create store for merchant
    store_doc = {
        "merchant_id": merchant_id,
        "name": data.store_name,
        "subdomain": data.subdomain.lower(),
        "tagline": "Welcome to my store",
        "description": "",
        "country": data.country,
        "locale": "en-PK" if data.country == "Pakistan" else "en-US",
        "currency": currency,
        "contact": {
            "email": data.merchant_email,
            "phone": data.merchant_phone or "",
            "whatsapp": data.merchant_phone or "",
            "support_hours": "10 AM - 7 PM"
        },
        "social": {
            "instagram": "",
            "facebook": "",
            "twitter": "",
            "youtube": ""
        },
        "theme": {
            "primary": "#000000",
            "accent": "#c9a050",
            "background": "#ffffff",
            "logo_url": "",
            "favicon_url": ""
        },
        "shipping_message": f"Free shipping on orders over {currency['symbol']}5000",
        "free_shipping_threshold": 5000,
        "shipping_cost": 250,
        "promo_code": "WELCOME10",
        "custom_domain": None,
        "is_active": True,
        "api_key": secrets.token_urlsafe(32),
        "created_at": now,
        "updated_at": now,
        "total_products": 0,
        "total_orders": 0,
        "total_revenue": 0
    }
    
    store_result = await db.wamerce_stores.insert_one(store_doc)
    store_id = str(store_result.inserted_id)
    
    # Update merchant with store_id
    await db.wamerce_merchants.update_one(
        {"_id": merchant_result.inserted_id},
        {"$set": {"store_id": store_id}}
    )
    
    return {
        "success": True,
        "message": "Welcome to Wamerce! Your store has been created.",
        "merchant": {
            "id": merchant_id,
            "name": data.merchant_name,
            "email": data.merchant_email
        },
        "store": {
            "id": store_id,
            "name": data.store_name,
            "subdomain": data.subdomain.lower(),
            "url": f"https://{data.subdomain.lower()}.wamerce.com",
            "admin_url": f"https://wamerce.com/admin/{data.subdomain.lower()}"
        }
    }


@router.get("/{store_id}")
async def get_store(store_id: str):
    """Get store details by ID"""
    db = get_db()
    
    store = await db.wamerce_stores.find_one({"_id": ObjectId(store_id)})
    
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    store["id"] = str(store["_id"])
    del store["_id"]
    
    return {
        "success": True,
        "store": store
    }


@router.get("/{store_id}/stats")
async def get_store_stats(store_id: str):
    """Get store statistics"""
    db = get_db()
    
    store = await db.wamerce_stores.find_one({"_id": ObjectId(store_id)})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    subdomain = store["subdomain"]
    
    # Get product count
    products_count = await db.shopify_products.count_documents({"store_name": subdomain})
    
    # Get order stats
    orders = await db.storefront_orders.find({"store_name": subdomain}).to_list(10000)
    total_orders = len(orders)
    total_revenue = sum(float(o.get("total_amount", 0)) for o in orders)
    
    return {
        "success": True,
        "stats": {
            "total_products": products_count,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "currency": store.get("currency", {}).get("symbol", "$")
        }
    }
