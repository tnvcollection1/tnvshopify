"""
Storefront Navigation Configuration API
- Configure header promo carousel messages
- Configure navigation menu items with icons
- Configure logo and branding
- Configure mega menu dropdown structure
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import os

router = APIRouter(prefix="/api/storefront/config", tags=["Storefront Config"])

# Get MongoDB connection from server
from server import get_db

# ======================
# PYDANTIC MODELS
# ======================

class PromoMessage(BaseModel):
    id: Optional[str] = None
    text: str  # e.g., "Cash On Delivery"
    icon: Optional[str] = None  # e.g., "💵" or icon name
    link: Optional[str] = None  # optional link
    active: bool = True
    order: int = 0

class MenuIcon(BaseModel):
    type: str  # "emoji", "image", "icon"
    value: str  # emoji character, image URL, or icon name

class SubMenuItem(BaseModel):
    name: str
    path: str
    image: Optional[str] = None  # for mega menu visual

class MenuCategory(BaseModel):
    id: Optional[str] = None
    name: str  # e.g., "WOMEN", "MEN", "KIDS"
    path: str  # e.g., "/women"
    icon: Optional[MenuIcon] = None
    highlight: bool = False  # for SALE etc.
    color: Optional[str] = None  # text color
    bgColor: Optional[str] = None  # background color for icon
    order: int = 0
    active: bool = True
    # Sub navigation items (secondary nav)
    subNav: Optional[List[str]] = None  # e.g., ["CLOTHING", "SHOES", "ACCESSORIES"]
    # Mega menu structure
    megaMenu: Optional[dict] = None  # Full mega menu config

class LogoConfig(BaseModel):
    text: str = "NAMSHI"
    badge: Optional[str] = "FASHION"  # badge text
    badgeColor: Optional[str] = "#FF6B9D"
    image: Optional[str] = None  # logo image URL
    width: Optional[int] = None  # px
    height: Optional[int] = None  # px

class NavigationConfig(BaseModel):
    store: str
    logo: LogoConfig
    promoMessages: List[PromoMessage]
    categories: List[MenuCategory]
    updated_at: Optional[str] = None

class MegaMenuColumn(BaseModel):
    title: str
    items: List[SubMenuItem]

class MegaMenuConfig(BaseModel):
    category: str  # e.g., "WOMEN"
    columns: List[MegaMenuColumn]
    featuredImage: Optional[str] = None
    featuredTitle: Optional[str] = None
    featuredLink: Optional[str] = None

# ======================
# DEFAULT CONFIGURATION
# ======================

DEFAULT_PROMO_MESSAGES = [
    {"text": "Cash On Delivery", "icon": "💵", "order": 0, "active": True},
    {"text": "Free Delivery and Exchange", "icon": "🚚", "order": 1, "active": True},
    {"text": "100% Genuine Products", "icon": "✓", "order": 2, "active": True},
    {"text": "Easy Returns", "icon": "↩️", "order": 3, "active": True},
]

DEFAULT_CATEGORIES = [
    {
        "name": "FASHION",
        "path": "/products",
        "icon": {"type": "emoji", "value": "👗"},
        "color": "#FF6B9D",
        "bgColor": "#FFE8F0",
        "order": 0,
        "active": True,
        "subNav": ["CLOTHING", "SHOES", "ACCESSORIES", "BAGS", "SPORTS", "NEW ARRIVALS", "PREMIUM", "SALE", "BRANDS"]
    },
    {
        "name": "Beauty",
        "path": "/beauty",
        "icon": {"type": "emoji", "value": "💄"},
        "color": "#9B59B6",
        "bgColor": "#F3E5F5",
        "order": 1,
        "active": True
    },
    {
        "name": "Baby & Kids",
        "path": "/kids",
        "icon": {"type": "emoji", "value": "👶"},
        "color": "#3498DB",
        "bgColor": "#E3F2FD",
        "order": 2,
        "active": True
    },
    {
        "name": "Home & More",
        "path": "/home",
        "icon": {"type": "emoji", "value": "🏠"},
        "color": "#27AE60",
        "bgColor": "#E8F5E9",
        "order": 3,
        "active": True
    },
    {
        "name": "PREMIUM",
        "path": "/premium",
        "icon": {"type": "emoji", "value": "✨"},
        "color": "#F39C12",
        "bgColor": "#FFF8E1",
        "order": 4,
        "active": True
    },
]

DEFAULT_MEGA_MENU = {
    "WOMEN": {
        "columns": [
            {
                "title": "CLOTHING",
                "items": [
                    {"name": "Dresses", "path": "/women/dresses"},
                    {"name": "Tops", "path": "/women/tops"},
                    {"name": "T-Shirts", "path": "/women/tshirts"},
                    {"name": "Jeans", "path": "/women/jeans"},
                    {"name": "Pants", "path": "/women/pants"},
                    {"name": "Skirts", "path": "/women/skirts"},
                    {"name": "Activewear", "path": "/women/activewear"},
                ]
            },
            {
                "title": "SHOES",
                "items": [
                    {"name": "Heels", "path": "/women/heels"},
                    {"name": "Flats", "path": "/women/flats"},
                    {"name": "Sneakers", "path": "/women/sneakers"},
                    {"name": "Sandals", "path": "/women/sandals"},
                    {"name": "Boots", "path": "/women/boots"},
                ]
            },
            {
                "title": "ACCESSORIES",
                "items": [
                    {"name": "Bags", "path": "/women/bags"},
                    {"name": "Jewelry", "path": "/women/jewelry"},
                    {"name": "Watches", "path": "/women/watches"},
                    {"name": "Sunglasses", "path": "/women/sunglasses"},
                    {"name": "Belts", "path": "/women/belts"},
                ]
            },
            {
                "title": "BRANDS",
                "items": [
                    {"name": "Nike", "path": "/brand/nike"},
                    {"name": "Adidas", "path": "/brand/adidas"},
                    {"name": "Zara", "path": "/brand/zara"},
                    {"name": "H&M", "path": "/brand/hm"},
                    {"name": "View All Brands", "path": "/brands"},
                ]
            }
        ],
        "featuredImage": "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=500&fit=crop",
        "featuredTitle": "New Arrivals",
        "featuredLink": "/women/new"
    },
    "MEN": {
        "columns": [
            {
                "title": "CLOTHING",
                "items": [
                    {"name": "T-Shirts", "path": "/men/tshirts"},
                    {"name": "Shirts", "path": "/men/shirts"},
                    {"name": "Jeans", "path": "/men/jeans"},
                    {"name": "Pants", "path": "/men/pants"},
                    {"name": "Shorts", "path": "/men/shorts"},
                    {"name": "Jackets", "path": "/men/jackets"},
                ]
            },
            {
                "title": "SHOES",
                "items": [
                    {"name": "Sneakers", "path": "/men/sneakers"},
                    {"name": "Formal Shoes", "path": "/men/formal"},
                    {"name": "Sandals", "path": "/men/sandals"},
                    {"name": "Boots", "path": "/men/boots"},
                    {"name": "Sports Shoes", "path": "/men/sports"},
                ]
            },
            {
                "title": "ACCESSORIES",
                "items": [
                    {"name": "Watches", "path": "/men/watches"},
                    {"name": "Bags", "path": "/men/bags"},
                    {"name": "Sunglasses", "path": "/men/sunglasses"},
                    {"name": "Belts", "path": "/men/belts"},
                    {"name": "Wallets", "path": "/men/wallets"},
                ]
            }
        ],
        "featuredImage": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
        "featuredTitle": "Summer Collection",
        "featuredLink": "/men/summer"
    }
}

# ======================
# API ENDPOINTS
# ======================

@router.get("/navigation/{store}")
async def get_navigation_config(store: str):
    """Get full navigation configuration for a store"""
    db = get_db()
    
    # Try to find existing config
    config = db.storefront_nav_config.find_one({"store": store}, {"_id": 0})
    
    if not config:
        # Return default config
        config = {
            "store": store,
            "logo": {
                "text": "TNV",
                "badge": "COLLECTION",
                "badgeColor": "#FF6B9D"
            },
            "promoMessages": DEFAULT_PROMO_MESSAGES,
            "categories": DEFAULT_CATEGORIES,
            "megaMenu": DEFAULT_MEGA_MENU
        }
    
    return config


@router.post("/navigation/{store}")
async def save_navigation_config(store: str, config: NavigationConfig):
    """Save/update navigation configuration for a store"""
    db = get_db()
    
    config_dict = config.dict()
    config_dict["store"] = store
    config_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    db.storefront_nav_config.update_one(
        {"store": store},
        {"$set": config_dict},
        upsert=True
    )
    
    return {"success": True, "message": "Navigation config saved"}


@router.get("/promo-messages/{store}")
async def get_promo_messages(store: str):
    """Get promo carousel messages for a store"""
    db = get_db()
    
    config = db.storefront_nav_config.find_one({"store": store}, {"promoMessages": 1, "_id": 0})
    
    if config and config.get("promoMessages"):
        return {"messages": config["promoMessages"]}
    
    return {"messages": DEFAULT_PROMO_MESSAGES}


@router.post("/promo-messages/{store}")
async def save_promo_messages(store: str, messages: List[PromoMessage]):
    """Save promo carousel messages for a store"""
    db = get_db()
    
    messages_dict = [m.dict() for m in messages]
    
    db.storefront_nav_config.update_one(
        {"store": store},
        {"$set": {"promoMessages": messages_dict, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Promo messages saved"}


@router.get("/menu/{store}")
async def get_menu_categories(store: str):
    """Get menu categories with icons for a store"""
    db = get_db()
    
    config = db.storefront_nav_config.find_one({"store": store}, {"categories": 1, "_id": 0})
    
    if config and config.get("categories"):
        return {"categories": config["categories"]}
    
    return {"categories": DEFAULT_CATEGORIES}


@router.post("/menu/{store}")
async def save_menu_categories(store: str, categories: List[MenuCategory]):
    """Save menu categories for a store"""
    db = get_db()
    
    categories_dict = [c.dict() for c in categories]
    
    db.storefront_nav_config.update_one(
        {"store": store},
        {"$set": {"categories": categories_dict, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Menu categories saved"}


@router.get("/logo/{store}")
async def get_logo_config(store: str):
    """Get logo configuration for a store"""
    db = get_db()
    
    config = db.storefront_nav_config.find_one({"store": store}, {"logo": 1, "_id": 0})
    
    if config and config.get("logo"):
        return {"logo": config["logo"]}
    
    return {
        "logo": {
            "text": "TNV",
            "badge": "COLLECTION",
            "badgeColor": "#FF6B9D"
        }
    }


@router.post("/logo/{store}")
async def save_logo_config(store: str, logo: LogoConfig):
    """Save logo configuration for a store"""
    db = get_db()
    
    db.storefront_nav_config.update_one(
        {"store": store},
        {"$set": {"logo": logo.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Logo config saved"}


@router.get("/mega-menu/{store}/{category}")
async def get_mega_menu(store: str, category: str):
    """Get mega menu configuration for a specific category"""
    db = get_db()
    
    config = db.storefront_nav_config.find_one({"store": store}, {"megaMenu": 1, "_id": 0})
    
    if config and config.get("megaMenu") and config["megaMenu"].get(category.upper()):
        return {"megaMenu": config["megaMenu"][category.upper()]}
    
    # Return default if available
    if category.upper() in DEFAULT_MEGA_MENU:
        return {"megaMenu": DEFAULT_MEGA_MENU[category.upper()]}
    
    return {"megaMenu": None}


@router.post("/mega-menu/{store}/{category}")
async def save_mega_menu(store: str, category: str, mega_menu: MegaMenuConfig):
    """Save mega menu configuration for a specific category"""
    db = get_db()
    
    db.storefront_nav_config.update_one(
        {"store": store},
        {"$set": {f"megaMenu.{category.upper()}": mega_menu.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": f"Mega menu for {category} saved"}


# ======================
# MEASUREMENTS & DIMENSIONS
# ======================

"""
NAMSHI HEADER MEASUREMENTS (Desktop):

1. TOP BAR (Promo Carousel)
   - Height: 36px
   - Background: #1a1a1a (dark)
   - Font: 13px, white
   - Padding: 0 16px
   
2. MAIN HEADER
   - Height: 64px
   - Background: white
   - Border-bottom: 1px solid #e5e5e5
   
   Logo:
   - Font: 24px, bold
   - Badge: 12px, pill shape, gradient bg
   
   Category Tabs:
   - Icon container: 32x32px, rounded full
   - Icon: 16px
   - Text: 13px, medium weight
   - Gap between icon and text: 8px
   - Gap between tabs: 4px
   
   Search Bar:
   - Width: 280px
   - Height: 40px
   - Border-radius: 20px (pill)
   - Icon: 16px
   - Font: 14px
   - Background: #f5f5f5
   
   Action Icons:
   - Size: 40x40px clickable area
   - Icon: 20px
   - Badge: 16x16px, rounded full

3. SECONDARY NAV (Sub-categories)
   - Height: 48px
   - Background: white
   - Border-bottom: 1px solid #e5e5e5
   - Font: 13px
   - Text: uppercase, medium weight
   - Gap: 24px between items

4. MEGA MENU DROPDOWN
   - Max-width: 1200px
   - Padding: 32px
   - Background: white
   - Shadow: 0 4px 24px rgba(0,0,0,0.12)
   - Column width: ~200px
   - Column gap: 48px
   - Title font: 14px, bold, uppercase
   - Item font: 14px, regular
   - Item padding: 8px 0
   - Featured image: 280x350px
"""
