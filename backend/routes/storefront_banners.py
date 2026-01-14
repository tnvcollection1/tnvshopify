"""
Storefront Banners & Category Tabs Configuration API
- Hero banners/sliders
- Category tabs with images (FASHION, Beauty, BAGS & KIDS, etc.)
- Promotional banners
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

router = APIRouter(prefix="/api/storefront/banners", tags=["Storefront Banners"])

# Database reference
_db: AsyncIOMotorDatabase = None

def set_database(db: AsyncIOMotorDatabase):
    global _db
    _db = db

# ======================
# PYDANTIC MODELS
# ======================

class HeroBanner(BaseModel):
    id: Optional[str] = None
    title: str  # e.g., "DESIGNER COLLECTION"
    subtitle: Optional[str] = None  # e.g., "Premium Shoes"
    buttonText: Optional[str] = "Shop Now"
    buttonLink: Optional[str] = "/"
    image: str  # Background image URL
    mobileImage: Optional[str] = None  # Mobile-specific image
    textColor: Optional[str] = "#FFFFFF"
    textPosition: Optional[str] = "left"  # left, center, right
    overlay: Optional[bool] = True  # Dark overlay for text readability
    overlayOpacity: Optional[float] = 0.3
    active: bool = True
    order: int = 0
    startDate: Optional[str] = None  # For scheduled banners
    endDate: Optional[str] = None

class CategoryTab(BaseModel):
    id: Optional[str] = None
    name: str  # e.g., "FASHION", "Beauty", "BAGS & KIDS"
    path: str  # e.g., "/fashion", "/beauty"
    image: str  # Category image URL
    bgColor: Optional[str] = "#f5f5f5"  # Background color if image fails
    hasMegaMenu: bool = False  # If true, shows gender selector dropdown
    active: bool = True
    order: int = 0

class SubNavItem(BaseModel):
    id: Optional[str] = None
    name: str  # e.g., "CLOTHING", "SHOES", "ACCESSORIES"
    path: str  # e.g., "/clothing", "/shoes"
    highlight: bool = False  # For SALE etc. (red color)
    active: bool = True
    order: int = 0

class PromoBanner(BaseModel):
    id: Optional[str] = None
    title: str
    subtitle: Optional[str] = None
    image: str
    link: Optional[str] = "/"
    position: str = "homepage"  # homepage, category, product
    width: Optional[str] = "full"  # full, half, third
    active: bool = True
    order: int = 0

class StorefrontLayoutConfig(BaseModel):
    store: str
    heroBanners: List[HeroBanner]
    categoryTabs: List[CategoryTab]
    subNavItems: List[SubNavItem]
    promoBanners: Optional[List[PromoBanner]] = []
    updated_at: Optional[str] = None

# ======================
# DEFAULT CONFIGURATIONS
# ======================

DEFAULT_HERO_BANNERS = [
    {
        "id": "banner-1",
        "title": "DESIGNER COLLECTION",
        "subtitle": "Premium Shoes",
        "buttonText": "Shop Now",
        "buttonLink": "/tnv/women/shoes",
        "image": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1920&h=800&fit=crop",
        "textColor": "#FFFFFF",
        "textPosition": "left",
        "overlay": True,
        "overlayOpacity": 0.3,
        "active": True,
        "order": 0
    },
    {
        "id": "banner-2",
        "title": "SUMMER SALE",
        "subtitle": "Up to 70% Off",
        "buttonText": "Shop Sale",
        "buttonLink": "/tnv/sale",
        "image": "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1920&h=800&fit=crop",
        "textColor": "#FFFFFF",
        "textPosition": "center",
        "overlay": True,
        "overlayOpacity": 0.4,
        "active": True,
        "order": 1
    },
    {
        "id": "banner-3",
        "title": "NEW ARRIVALS",
        "subtitle": "Fresh Styles for Every Season",
        "buttonText": "Explore Now",
        "buttonLink": "/tnv/new-arrivals",
        "image": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&h=800&fit=crop",
        "textColor": "#FFFFFF",
        "textPosition": "right",
        "overlay": True,
        "overlayOpacity": 0.35,
        "active": True,
        "order": 2
    }
]

DEFAULT_CATEGORY_TABS = [
    {
        "id": "cat-fashion",
        "name": "FASHION",
        "path": "/tnv/fashion",
        "image": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100&h=100&fit=crop",
        "bgColor": "#c8e6c9",
        "hasMegaMenu": True,
        "active": True,
        "order": 0
    },
    {
        "id": "cat-beauty",
        "name": "Beauty",
        "path": "/tnv/beauty",
        "image": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100&h=100&fit=crop",
        "bgColor": "#f5f5f5",
        "hasMegaMenu": False,
        "active": True,
        "order": 1
    },
    {
        "id": "cat-bags",
        "name": "BAGS & KIDS",
        "path": "/tnv/bags",
        "image": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=100&h=100&fit=crop",
        "bgColor": "#ffe0b2",
        "hasMegaMenu": False,
        "active": True,
        "order": 2
    },
    {
        "id": "cat-home",
        "name": "HOME & MORE",
        "path": "/tnv/home",
        "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop",
        "bgColor": "#b2dfdb",
        "hasMegaMenu": False,
        "active": True,
        "order": 3
    },
    {
        "id": "cat-premium",
        "name": "PREMIUM",
        "path": "/tnv/premium",
        "image": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=100&h=100&fit=crop",
        "bgColor": "#f5f5f5",
        "hasMegaMenu": False,
        "active": True,
        "order": 4
    }
]

DEFAULT_SUB_NAV_ITEMS = [
    {"id": "sub-clothing", "name": "CLOTHING", "path": "/tnv/clothing", "highlight": False, "active": True, "order": 0},
    {"id": "sub-shoes", "name": "SHOES", "path": "/tnv/shoes", "highlight": False, "active": True, "order": 1},
    {"id": "sub-accessories", "name": "ACCESSORIES", "path": "/tnv/accessories", "highlight": False, "active": True, "order": 2},
    {"id": "sub-bags", "name": "BAGS", "path": "/tnv/bags", "highlight": False, "active": True, "order": 3},
    {"id": "sub-sports", "name": "SPORTS", "path": "/tnv/sports", "highlight": False, "active": True, "order": 4},
    {"id": "sub-new", "name": "NEW ARRIVALS", "path": "/tnv/new-arrivals", "highlight": False, "active": True, "order": 5},
    {"id": "sub-premium", "name": "PREMIUM", "path": "/tnv/premium", "highlight": False, "active": True, "order": 6},
    {"id": "sub-sale", "name": "SALE", "path": "/tnv/sale", "highlight": True, "active": True, "order": 7},
    {"id": "sub-brands", "name": "BRANDS", "path": "/tnv/brands", "highlight": False, "active": True, "order": 8}
]

DEFAULT_PROMO_BANNERS = [
    {
        "id": "promo-1",
        "title": "Free Shipping",
        "subtitle": "On orders over $50",
        "image": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=300&fit=crop",
        "link": "/shipping",
        "position": "homepage",
        "width": "third",
        "active": True,
        "order": 0
    }
]

# ======================
# API ENDPOINTS - HERO BANNERS
# ======================

@router.get("/hero/{store}")
async def get_hero_banners(store: str):
    """Get hero banners/sliders for a store"""
    config = await _db.storefront_banners.find_one({"store": store}, {"_id": 0, "heroBanners": 1})
    
    if config and config.get("heroBanners"):
        # Filter active and sort by order
        banners = [b for b in config["heroBanners"] if b.get("active", True)]
        banners.sort(key=lambda x: x.get("order", 0))
        return {"banners": banners}
    
    return {"banners": DEFAULT_HERO_BANNERS}


@router.post("/hero/{store}")
async def save_hero_banners(store: str, banners: List[HeroBanner]):
    """Save hero banners for a store"""
    banners_dict = []
    for i, b in enumerate(banners):
        b_dict = b.dict()
        if not b_dict.get("id"):
            b_dict["id"] = f"banner-{uuid.uuid4().hex[:8]}"
        b_dict["order"] = i
        banners_dict.append(b_dict)
    
    await _db.storefront_banners.update_one(
        {"store": store},
        {"$set": {"heroBanners": banners_dict, "store": store, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Hero banners saved", "banners": banners_dict}


@router.post("/hero/{store}/add")
async def add_hero_banner(store: str, banner: HeroBanner):
    """Add a single hero banner"""
    banner_dict = banner.dict()
    if not banner_dict.get("id"):
        banner_dict["id"] = f"banner-{uuid.uuid4().hex[:8]}"
    
    # Get current banners to determine order
    config = await _db.storefront_banners.find_one({"store": store}, {"_id": 0, "heroBanners": 1})
    current_count = len(config.get("heroBanners", [])) if config else 0
    banner_dict["order"] = current_count
    
    await _db.storefront_banners.update_one(
        {"store": store},
        {"$push": {"heroBanners": banner_dict}, "$set": {"store": store, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Banner added", "banner": banner_dict}


@router.delete("/hero/{store}/{banner_id}")
async def delete_hero_banner(store: str, banner_id: str):
    """Delete a hero banner"""
    await _db.storefront_banners.update_one(
        {"store": store},
        {"$pull": {"heroBanners": {"id": banner_id}}}
    )
    
    return {"success": True, "message": "Banner deleted"}


@router.put("/hero/{store}/{banner_id}")
async def update_hero_banner(store: str, banner_id: str, banner: HeroBanner):
    """Update a specific hero banner"""
    banner_dict = banner.dict()
    banner_dict["id"] = banner_id
    
    await _db.storefront_banners.update_one(
        {"store": store, "heroBanners.id": banner_id},
        {"$set": {"heroBanners.$": banner_dict, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Banner updated", "banner": banner_dict}


# ======================
# API ENDPOINTS - CATEGORY TABS
# ======================

@router.get("/category-tabs/{store}")
async def get_category_tabs(store: str):
    """Get category tabs (FASHION, Beauty, etc.) for a store"""
    config = await _db.storefront_banners.find_one({"store": store}, {"_id": 0, "categoryTabs": 1})
    
    if config and config.get("categoryTabs"):
        tabs = [t for t in config["categoryTabs"] if t.get("active", True)]
        tabs.sort(key=lambda x: x.get("order", 0))
        return {"categoryTabs": tabs}
    
    return {"categoryTabs": DEFAULT_CATEGORY_TABS}


@router.post("/category-tabs/{store}")
async def save_category_tabs(store: str, tabs: List[CategoryTab]):
    """Save category tabs for a store"""
    tabs_dict = []
    for i, t in enumerate(tabs):
        t_dict = t.dict()
        if not t_dict.get("id"):
            t_dict["id"] = f"cat-{uuid.uuid4().hex[:8]}"
        t_dict["order"] = i
        tabs_dict.append(t_dict)
    
    await _db.storefront_banners.update_one(
        {"store": store},
        {"$set": {"categoryTabs": tabs_dict, "store": store, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Category tabs saved", "categoryTabs": tabs_dict}


@router.post("/category-tabs/{store}/add")
async def add_category_tab(store: str, tab: CategoryTab):
    """Add a single category tab"""
    tab_dict = tab.dict()
    if not tab_dict.get("id"):
        tab_dict["id"] = f"cat-{uuid.uuid4().hex[:8]}"
    
    config = await _db.storefront_banners.find_one({"store": store}, {"_id": 0, "categoryTabs": 1})
    current_count = len(config.get("categoryTabs", [])) if config else 0
    tab_dict["order"] = current_count
    
    await _db.storefront_banners.update_one(
        {"store": store},
        {"$push": {"categoryTabs": tab_dict}, "$set": {"store": store, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Category tab added", "tab": tab_dict}


@router.delete("/category-tabs/{store}/{tab_id}")
async def delete_category_tab(store: str, tab_id: str):
    """Delete a category tab"""
    await _db.storefront_banners.update_one(
        {"store": store},
        {"$pull": {"categoryTabs": {"id": tab_id}}}
    )
    
    return {"success": True, "message": "Category tab deleted"}


@router.put("/category-tabs/{store}/{tab_id}")
async def update_category_tab(store: str, tab_id: str, tab: CategoryTab):
    """Update a specific category tab"""
    tab_dict = tab.dict()
    tab_dict["id"] = tab_id
    
    await _db.storefront_banners.update_one(
        {"store": store, "categoryTabs.id": tab_id},
        {"$set": {"categoryTabs.$": tab_dict, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Category tab updated", "tab": tab_dict}


# ======================
# API ENDPOINTS - SUB NAVIGATION
# ======================

@router.get("/sub-nav/{store}")
async def get_sub_nav_items(store: str):
    """Get sub-navigation items (CLOTHING, SHOES, etc.) for a store"""
    config = await _db.storefront_banners.find_one({"store": store}, {"_id": 0, "subNavItems": 1})
    
    if config and config.get("subNavItems"):
        items = [i for i in config["subNavItems"] if i.get("active", True)]
        items.sort(key=lambda x: x.get("order", 0))
        return {"subNavItems": items}
    
    return {"subNavItems": DEFAULT_SUB_NAV_ITEMS}


@router.post("/sub-nav/{store}")
async def save_sub_nav_items(store: str, items: List[SubNavItem]):
    """Save sub-navigation items for a store"""
    items_dict = []
    for i, item in enumerate(items):
        i_dict = item.dict()
        if not i_dict.get("id"):
            i_dict["id"] = f"sub-{uuid.uuid4().hex[:8]}"
        i_dict["order"] = i
        items_dict.append(i_dict)
    
    await _db.storefront_banners.update_one(
        {"store": store},
        {"$set": {"subNavItems": items_dict, "store": store, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Sub-navigation items saved", "subNavItems": items_dict}


# ======================
# API ENDPOINTS - PROMO BANNERS
# ======================

@router.get("/promo/{store}")
async def get_promo_banners(store: str, position: Optional[str] = None):
    """Get promotional banners for a store"""
    config = await _db.storefront_banners.find_one({"store": store}, {"_id": 0, "promoBanners": 1})
    
    if config and config.get("promoBanners"):
        banners = [b for b in config["promoBanners"] if b.get("active", True)]
        if position:
            banners = [b for b in banners if b.get("position") == position]
        banners.sort(key=lambda x: x.get("order", 0))
        return {"promoBanners": banners}
    
    result = DEFAULT_PROMO_BANNERS
    if position:
        result = [b for b in result if b.get("position") == position]
    return {"promoBanners": result}


@router.post("/promo/{store}")
async def save_promo_banners(store: str, banners: List[PromoBanner]):
    """Save promotional banners for a store"""
    banners_dict = []
    for i, b in enumerate(banners):
        b_dict = b.dict()
        if not b_dict.get("id"):
            b_dict["id"] = f"promo-{uuid.uuid4().hex[:8]}"
        b_dict["order"] = i
        banners_dict.append(b_dict)
    
    await _db.storefront_banners.update_one(
        {"store": store},
        {"$set": {"promoBanners": banners_dict, "store": store, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Promo banners saved", "promoBanners": banners_dict}


# ======================
# API ENDPOINTS - FULL LAYOUT CONFIG
# ======================

@router.get("/layout/{store}")
async def get_full_layout_config(store: str):
    """Get complete layout configuration (banners, tabs, sub-nav, promos)"""
    config = await _db.storefront_banners.find_one({"store": store}, {"_id": 0})
    
    if not config:
        return {
            "store": store,
            "heroBanners": DEFAULT_HERO_BANNERS,
            "categoryTabs": DEFAULT_CATEGORY_TABS,
            "subNavItems": DEFAULT_SUB_NAV_ITEMS,
            "promoBanners": DEFAULT_PROMO_BANNERS,
            "updated_at": None
        }
    
    return {
        "store": store,
        "heroBanners": config.get("heroBanners", DEFAULT_HERO_BANNERS),
        "categoryTabs": config.get("categoryTabs", DEFAULT_CATEGORY_TABS),
        "subNavItems": config.get("subNavItems", DEFAULT_SUB_NAV_ITEMS),
        "promoBanners": config.get("promoBanners", DEFAULT_PROMO_BANNERS),
        "updated_at": config.get("updated_at")
    }


@router.post("/layout/{store}")
async def save_full_layout_config(store: str, config: StorefrontLayoutConfig):
    """Save complete layout configuration"""
    config_dict = config.dict()
    config_dict["store"] = store
    config_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Ensure all items have IDs
    for i, banner in enumerate(config_dict.get("heroBanners", [])):
        if not banner.get("id"):
            banner["id"] = f"banner-{uuid.uuid4().hex[:8]}"
        banner["order"] = i
    
    for i, tab in enumerate(config_dict.get("categoryTabs", [])):
        if not tab.get("id"):
            tab["id"] = f"cat-{uuid.uuid4().hex[:8]}"
        tab["order"] = i
    
    for i, item in enumerate(config_dict.get("subNavItems", [])):
        if not item.get("id"):
            item["id"] = f"sub-{uuid.uuid4().hex[:8]}"
        item["order"] = i
    
    for i, promo in enumerate(config_dict.get("promoBanners", [])):
        if not promo.get("id"):
            promo["id"] = f"promo-{uuid.uuid4().hex[:8]}"
        promo["order"] = i
    
    await _db.storefront_banners.update_one(
        {"store": store},
        {"$set": config_dict},
        upsert=True
    )
    
    return {"success": True, "message": "Layout configuration saved", "config": config_dict}


# ======================
# REORDER ENDPOINTS
# ======================

@router.post("/hero/{store}/reorder")
async def reorder_hero_banners(store: str, banner_ids: List[str]):
    """Reorder hero banners by providing ordered list of IDs"""
    config = await _db.storefront_banners.find_one({"store": store}, {"_id": 0, "heroBanners": 1})
    
    if not config or not config.get("heroBanners"):
        raise HTTPException(status_code=404, detail="No banners found")
    
    # Create a map of id -> banner
    banner_map = {b["id"]: b for b in config["heroBanners"]}
    
    # Reorder based on provided IDs
    reordered = []
    for i, bid in enumerate(banner_ids):
        if bid in banner_map:
            banner_map[bid]["order"] = i
            reordered.append(banner_map[bid])
    
    # Add any banners not in the list at the end
    for bid, banner in banner_map.items():
        if bid not in banner_ids:
            banner["order"] = len(reordered)
            reordered.append(banner)
    
    await _db.storefront_banners.update_one(
        {"store": store},
        {"$set": {"heroBanners": reordered, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Banners reordered", "banners": reordered}


@router.post("/category-tabs/{store}/reorder")
async def reorder_category_tabs(store: str, tab_ids: List[str]):
    """Reorder category tabs by providing ordered list of IDs"""
    config = await _db.storefront_banners.find_one({"store": store}, {"_id": 0, "categoryTabs": 1})
    
    if not config or not config.get("categoryTabs"):
        raise HTTPException(status_code=404, detail="No category tabs found")
    
    tab_map = {t["id"]: t for t in config["categoryTabs"]}
    
    reordered = []
    for i, tid in enumerate(tab_ids):
        if tid in tab_map:
            tab_map[tid]["order"] = i
            reordered.append(tab_map[tid])
    
    for tid, tab in tab_map.items():
        if tid not in tab_ids:
            tab["order"] = len(reordered)
            reordered.append(tab)
    
    await _db.storefront_banners.update_one(
        {"store": store},
        {"$set": {"categoryTabs": reordered, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Category tabs reordered", "categoryTabs": reordered}
