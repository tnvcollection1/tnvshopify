"""Merchant Store Creation Routes
Handles new merchant onboarding, store creation, and configuration
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

# Will be injected from server.py
db = None

def set_dependencies(database):
    """Set dependencies from server.py"""
    global db
    db = database

merchants_router = APIRouter(prefix="/merchants", tags=["Merchant Management"])


# Pydantic Models
class BusinessInfo(BaseModel):
    business_name: str
    business_category: str
    business_email: Optional[str] = None
    business_phone: Optional[str] = None


class StoreInfo(BaseModel):
    store_name: str
    subdomain: str
    currency: str = "INR"
    custom_domain: Optional[str] = None


class Platforms(BaseModel):
    web_store: bool = True
    mobile_app: bool = True


class Customization(BaseModel):
    primary_color: str = "#FF3366"
    accent_color: str = "#FF6B8A"
    logo_url: Optional[str] = None
    dark_mode_enabled: bool = True


class CreateStoreRequest(BaseModel):
    business: BusinessInfo
    store: StoreInfo
    platforms: Platforms
    theme: str = "fashion-forward"
    customization: Customization
    integrations: Optional[Dict] = {}


# Pre-configured theme settings
THEMES = {
    "modern-minimal": {
        "name": "Modern Minimal",
        "primary_color": "#000000",
        "accent_color": "#10B981",
        "background_color": "#FFFFFF",
        "text_color": "#1F2937",
        "header_style": "minimal",
        "card_style": "flat",
        "button_style": "rounded"
    },
    "fashion-forward": {
        "name": "Fashion Forward",
        "primary_color": "#FF3366",
        "accent_color": "#FF6B8A",
        "background_color": "#FFFFFF",
        "text_color": "#1A1A1A",
        "header_style": "bold",
        "card_style": "shadow",
        "button_style": "pill"
    },
    "luxury": {
        "name": "Luxury",
        "primary_color": "#D4AF37",
        "accent_color": "#F5E6D3",
        "background_color": "#0A0A0A",
        "text_color": "#FFFFFF",
        "header_style": "elegant",
        "card_style": "glass",
        "button_style": "sharp"
    },
    "vibrant": {
        "name": "Vibrant",
        "primary_color": "#8B5CF6",
        "accent_color": "#EC4899",
        "background_color": "#FAFAFA",
        "text_color": "#374151",
        "header_style": "gradient",
        "card_style": "rounded",
        "button_style": "gradient"
    },
    "classic": {
        "name": "Classic E-commerce",
        "primary_color": "#2563EB",
        "accent_color": "#3B82F6",
        "background_color": "#FFFFFF",
        "text_color": "#111827",
        "header_style": "standard",
        "card_style": "border",
        "button_style": "default"
    }
}


@merchants_router.get("/check-subdomain")
async def check_subdomain(subdomain: str):
    """Check if a subdomain is available"""
    try:
        if not subdomain:
            return {"available": False, "reason": "Subdomain is required"}
        
        # Normalize subdomain
        subdomain = subdomain.lower().strip()
        
        # Check length
        if len(subdomain) < 3:
            return {"available": False, "reason": "Subdomain must be at least 3 characters"}
        
        if len(subdomain) > 30:
            return {"available": False, "reason": "Subdomain must be less than 30 characters"}
        
        # Check for reserved subdomains
        reserved = ["admin", "api", "www", "app", "mail", "ftp", "shop", "store", "wamerce", "test", "demo"]
        if subdomain in reserved:
            return {"available": False, "reason": "This subdomain is reserved"}
        
        # Check if already taken
        existing = await db.merchant_stores.find_one({"subdomain": subdomain})
        if existing:
            return {"available": False, "reason": "This subdomain is already taken"}
        
        return {"available": True, "subdomain": subdomain}
    except Exception as e:
        logger.error(f"Error checking subdomain: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@merchants_router.post("/create-store")
async def create_merchant_store(request: CreateStoreRequest):
    """Create a new merchant store with all configurations"""
    try:
        # Validate subdomain one more time
        existing = await db.merchant_stores.find_one({"subdomain": request.store.subdomain})
        if existing:
            raise HTTPException(status_code=400, detail="Subdomain is already taken")
        
        # Generate IDs
        store_id = str(uuid.uuid4())
        merchant_id = str(uuid.uuid4())
        
        # Get theme settings
        theme_settings = THEMES.get(request.theme, THEMES["fashion-forward"])
        
        # Override theme colors with customization
        theme_settings["primary_color"] = request.customization.primary_color
        theme_settings["accent_color"] = request.customization.accent_color
        
        # Create merchant record
        merchant = {
            "id": merchant_id,
            "business_name": request.business.business_name,
            "business_category": request.business.business_category,
            "business_email": request.business.business_email,
            "business_phone": request.business.business_phone,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Create store record
        store = {
            "id": store_id,
            "merchant_id": merchant_id,
            "store_name": request.store.store_name,
            "subdomain": request.store.subdomain.lower(),
            "domain": f"{request.store.subdomain.lower()}.wamerce.com",
            "custom_domain": request.store.custom_domain,
            "currency": request.store.currency,
            "platforms": {
                "web_store": request.platforms.web_store,
                "mobile_app": request.platforms.mobile_app
            },
            "theme": request.theme,
            "theme_settings": theme_settings,
            "customization": {
                "primary_color": request.customization.primary_color,
                "accent_color": request.customization.accent_color,
                "logo_url": request.customization.logo_url,
                "dark_mode_enabled": request.customization.dark_mode_enabled
            },
            "integrations": request.integrations,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Create mobile app config if enabled
        mobile_app_config = None
        if request.platforms.mobile_app:
            mobile_app_config = {
                "id": str(uuid.uuid4()),
                "store_id": store_id,
                "merchant_id": merchant_id,
                "app_name": request.store.store_name,
                "app_tagline": f"Shop at {request.store.store_name}",
                "bundle_id": f"com.wamerce.{request.store.subdomain.lower()}",
                "version": "1.0.0",
                "theme": {
                    "primary_color": request.customization.primary_color,
                    "accent_color": request.customization.accent_color,
                    "dark_mode_enabled": request.customization.dark_mode_enabled
                },
                "features": {
                    "push_notifications": True,
                    "haptic_feedback": True,
                    "offline_mode": True,
                    "biometric_auth": False
                },
                "status": "pending_build",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        
        # Create web store config if enabled
        web_store_config = None
        if request.platforms.web_store:
            web_store_config = {
                "id": str(uuid.uuid4()),
                "store_id": store_id,
                "merchant_id": merchant_id,
                "domain": f"{request.store.subdomain.lower()}.wamerce.com",
                "custom_domain": request.store.custom_domain,
                "theme": request.theme,
                "theme_settings": theme_settings,
                "seo": {
                    "title": request.store.store_name,
                    "description": f"Shop at {request.store.store_name}",
                    "keywords": [request.business.business_category, "online store", "shop"]
                },
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        
        # Save to database
        await db.merchants.insert_one(merchant)
        await db.merchant_stores.insert_one(store)
        
        if mobile_app_config:
            await db.mobile_app_configs.insert_one(mobile_app_config)
        
        if web_store_config:
            await db.web_store_configs.insert_one(web_store_config)
        
        # Save integrations if provided
        if request.integrations:
            integrations_doc = {
                "store_id": store_id,
                "merchant_id": merchant_id,
                **request.integrations,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.merchant_integrations.insert_one(integrations_doc)
        
        logger.info(f"Created new merchant store: {request.store.store_name} ({store_id})")
        
        return {
            "success": True,
            "message": "Store created successfully",
            "store": {
                "id": store_id,
                "merchant_id": merchant_id,
                "store_name": request.store.store_name,
                "domain": f"{request.store.subdomain}.wamerce.com",
                "web_store_enabled": request.platforms.web_store,
                "mobile_app_enabled": request.platforms.mobile_app,
                "theme": request.theme
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating merchant store: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@merchants_router.get("/stores")
async def get_merchant_stores(merchant_id: Optional[str] = None):
    """Get all stores or stores for a specific merchant"""
    try:
        query = {}
        if merchant_id:
            query["merchant_id"] = merchant_id
        
        stores = await db.merchant_stores.find(query, {"_id": 0}).to_list(100)
        return {"success": True, "stores": stores}
    except Exception as e:
        logger.error(f"Error fetching stores: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@merchants_router.get("/stores/{store_id}")
async def get_store(store_id: str):
    """Get a specific store by ID"""
    try:
        store = await db.merchant_stores.find_one({"id": store_id}, {"_id": 0})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        return {"success": True, "store": store}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching store: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@merchants_router.get("/themes")
async def get_available_themes():
    """Get all available pre-configured themes"""
    try:
        themes = []
        for theme_id, theme_data in THEMES.items():
            themes.append({
                "id": theme_id,
                **theme_data
            })
        
        return {"success": True, "themes": themes}
    except Exception as e:
        logger.error(f"Error fetching themes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@merchants_router.put("/stores/{store_id}/theme")
async def update_store_theme(store_id: str, theme: str, customization: Optional[Dict] = None):
    """Update store theme"""
    try:
        store = await db.merchant_stores.find_one({"id": store_id})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        theme_settings = THEMES.get(theme, THEMES["fashion-forward"])
        
        # Apply customization if provided
        if customization:
            theme_settings["primary_color"] = customization.get("primary_color", theme_settings["primary_color"])
            theme_settings["accent_color"] = customization.get("accent_color", theme_settings["accent_color"])
        
        await db.merchant_stores.update_one(
            {"id": store_id},
            {
                "$set": {
                    "theme": theme,
                    "theme_settings": theme_settings,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"success": True, "message": "Theme updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating theme: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@merchants_router.put("/stores/{store_id}/integrations")
async def update_store_integrations(store_id: str, integrations: Dict):
    """Update store integrations"""
    try:
        store = await db.merchant_stores.find_one({"id": store_id})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        await db.merchant_stores.update_one(
            {"id": store_id},
            {
                "$set": {
                    "integrations": integrations,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Also update merchant_integrations collection
        await db.merchant_integrations.update_one(
            {"store_id": store_id},
            {
                "$set": {
                    **integrations,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {"success": True, "message": "Integrations updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating integrations: {e}")
        raise HTTPException(status_code=500, detail=str(e))
