"""
Mega Menu Configuration API
- Full CRUD for mega menu structure per store
- Support for columns, categories, promotional banners, featured items
- Store-specific configurations
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

router = APIRouter(prefix="/api/mega-menu", tags=["Mega Menu"])

# Database reference
_db: AsyncIOMotorDatabase = None

def set_database(db: AsyncIOMotorDatabase):
    global _db
    _db = db

# ======================
# PYDANTIC MODELS
# ======================

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    path: str
    image: Optional[str] = None
    badge: Optional[str] = None  # "NEW", "SALE", "HOT"
    badgeColor: Optional[str] = None

class MenuColumn(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str
    titleLink: Optional[str] = None
    items: List[MenuItem] = []
    width: int = 1  # Column span (1-4)

class PromoBanner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    image: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    link: str
    buttonText: Optional[str] = None
    position: str = "right"  # "left", "right", "bottom"

class FeaturedProduct(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    productId: str
    name: str
    image: str
    price: float
    originalPrice: Optional[float] = None
    link: str

class QuickLink(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    path: str
    icon: Optional[str] = None
    highlight: bool = False

class MegaMenuSection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    categoryId: str  # Which main category this belongs to
    categoryName: str
    enabled: bool = True
    layout: str = "columns"  # "columns", "grid", "featured"
    columns: List[MenuColumn] = []
    promoBanners: List[PromoBanner] = []
    featuredProducts: List[FeaturedProduct] = []
    quickLinks: List[QuickLink] = []
    backgroundColor: Optional[str] = None
    customCss: Optional[str] = None

class MegaMenuConfig(BaseModel):
    store: str
    sections: List[MegaMenuSection] = []
    globalSettings: Dict[str, Any] = {
        "hoverDelay": 150,
        "animationType": "fade",
        "maxWidth": "1200px",
        "showOnMobile": True
    }
    updated_at: Optional[str] = None
    created_at: Optional[str] = None

# ======================
# DEFAULT CONFIGURATIONS
# ======================

DEFAULT_MEGA_MENU_SECTIONS = [
    {
        "id": "women-section",
        "categoryId": "cat-fashion",
        "categoryName": "WOMEN",
        "enabled": True,
        "layout": "columns",
        "columns": [
            {
                "id": "col-clothing",
                "title": "CLOTHING",
                "titleLink": "/women/clothing",
                "width": 1,
                "items": [
                    {"id": "w1", "name": "Dresses", "path": "/women/dresses"},
                    {"id": "w2", "name": "Tops & Blouses", "path": "/women/tops"},
                    {"id": "w3", "name": "T-Shirts", "path": "/women/tshirts"},
                    {"id": "w4", "name": "Jeans", "path": "/women/jeans"},
                    {"id": "w5", "name": "Pants & Trousers", "path": "/women/pants"},
                    {"id": "w6", "name": "Skirts", "path": "/women/skirts"},
                    {"id": "w7", "name": "Activewear", "path": "/women/activewear"},
                    {"id": "w8", "name": "View All", "path": "/women/clothing", "badge": "→"}
                ]
            },
            {
                "id": "col-shoes",
                "title": "SHOES",
                "titleLink": "/women/shoes",
                "width": 1,
                "items": [
                    {"id": "ws1", "name": "Heels", "path": "/women/heels"},
                    {"id": "ws2", "name": "Flats", "path": "/women/flats"},
                    {"id": "ws3", "name": "Sneakers", "path": "/women/sneakers"},
                    {"id": "ws4", "name": "Sandals", "path": "/women/sandals"},
                    {"id": "ws5", "name": "Boots", "path": "/women/boots"},
                    {"id": "ws6", "name": "Sports Shoes", "path": "/women/sports-shoes"}
                ]
            },
            {
                "id": "col-accessories",
                "title": "ACCESSORIES",
                "titleLink": "/women/accessories",
                "width": 1,
                "items": [
                    {"id": "wa1", "name": "Bags & Handbags", "path": "/women/bags"},
                    {"id": "wa2", "name": "Jewelry", "path": "/women/jewelry"},
                    {"id": "wa3", "name": "Watches", "path": "/women/watches"},
                    {"id": "wa4", "name": "Sunglasses", "path": "/women/sunglasses"},
                    {"id": "wa5", "name": "Belts", "path": "/women/belts"},
                    {"id": "wa6", "name": "Scarves", "path": "/women/scarves"}
                ]
            },
            {
                "id": "col-brands",
                "title": "TOP BRANDS",
                "titleLink": "/brands",
                "width": 1,
                "items": [
                    {"id": "wb1", "name": "Nike", "path": "/brand/nike"},
                    {"id": "wb2", "name": "Adidas", "path": "/brand/adidas"},
                    {"id": "wb3", "name": "Zara", "path": "/brand/zara"},
                    {"id": "wb4", "name": "H&M", "path": "/brand/hm"},
                    {"id": "wb5", "name": "Mango", "path": "/brand/mango"},
                    {"id": "wb6", "name": "View All Brands", "path": "/brands", "badge": "500+"}
                ]
            }
        ],
        "promoBanners": [
            {
                "id": "promo-women-1",
                "image": "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=500&fit=crop",
                "title": "New Arrivals",
                "subtitle": "Up to 50% Off",
                "link": "/women/new-arrivals",
                "buttonText": "Shop Now",
                "position": "right"
            }
        ],
        "quickLinks": [
            {"id": "ql1", "name": "New Arrivals", "path": "/women/new", "highlight": True},
            {"id": "ql2", "name": "Sale", "path": "/women/sale", "highlight": True},
            {"id": "ql3", "name": "Trending", "path": "/women/trending"}
        ]
    },
    {
        "id": "men-section",
        "categoryId": "cat-fashion",
        "categoryName": "MEN",
        "enabled": True,
        "layout": "columns",
        "columns": [
            {
                "id": "col-men-clothing",
                "title": "CLOTHING",
                "titleLink": "/men/clothing",
                "width": 1,
                "items": [
                    {"id": "m1", "name": "T-Shirts", "path": "/men/tshirts"},
                    {"id": "m2", "name": "Shirts", "path": "/men/shirts"},
                    {"id": "m3", "name": "Jeans", "path": "/men/jeans"},
                    {"id": "m4", "name": "Pants", "path": "/men/pants"},
                    {"id": "m5", "name": "Shorts", "path": "/men/shorts"},
                    {"id": "m6", "name": "Jackets & Coats", "path": "/men/jackets"},
                    {"id": "m7", "name": "Suits", "path": "/men/suits"},
                    {"id": "m8", "name": "View All", "path": "/men/clothing", "badge": "→"}
                ]
            },
            {
                "id": "col-men-shoes",
                "title": "SHOES",
                "titleLink": "/men/shoes",
                "width": 1,
                "items": [
                    {"id": "ms1", "name": "Sneakers", "path": "/men/sneakers"},
                    {"id": "ms2", "name": "Formal Shoes", "path": "/men/formal"},
                    {"id": "ms3", "name": "Sandals", "path": "/men/sandals"},
                    {"id": "ms4", "name": "Boots", "path": "/men/boots"},
                    {"id": "ms5", "name": "Sports Shoes", "path": "/men/sports"},
                    {"id": "ms6", "name": "Loafers", "path": "/men/loafers"}
                ]
            },
            {
                "id": "col-men-accessories",
                "title": "ACCESSORIES",
                "titleLink": "/men/accessories",
                "width": 1,
                "items": [
                    {"id": "ma1", "name": "Watches", "path": "/men/watches"},
                    {"id": "ma2", "name": "Bags & Backpacks", "path": "/men/bags"},
                    {"id": "ma3", "name": "Sunglasses", "path": "/men/sunglasses"},
                    {"id": "ma4", "name": "Belts", "path": "/men/belts"},
                    {"id": "ma5", "name": "Wallets", "path": "/men/wallets"},
                    {"id": "ma6", "name": "Ties & Bowties", "path": "/men/ties"}
                ]
            },
            {
                "id": "col-men-brands",
                "title": "TOP BRANDS",
                "titleLink": "/brands",
                "width": 1,
                "items": [
                    {"id": "mb1", "name": "Nike", "path": "/brand/nike"},
                    {"id": "mb2", "name": "Adidas", "path": "/brand/adidas"},
                    {"id": "mb3", "name": "Tommy Hilfiger", "path": "/brand/tommy"},
                    {"id": "mb4", "name": "Calvin Klein", "path": "/brand/ck"},
                    {"id": "mb5", "name": "Polo Ralph Lauren", "path": "/brand/polo"},
                    {"id": "mb6", "name": "View All Brands", "path": "/brands", "badge": "500+"}
                ]
            }
        ],
        "promoBanners": [
            {
                "id": "promo-men-1",
                "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
                "title": "Summer Collection",
                "subtitle": "Fresh Styles",
                "link": "/men/summer",
                "buttonText": "Explore",
                "position": "right"
            }
        ],
        "quickLinks": [
            {"id": "mql1", "name": "New In", "path": "/men/new", "highlight": True},
            {"id": "mql2", "name": "Sale", "path": "/men/sale", "highlight": True},
            {"id": "mql3", "name": "Best Sellers", "path": "/men/bestsellers"}
        ]
    },
    {
        "id": "beauty-section",
        "categoryId": "cat-beauty",
        "categoryName": "BEAUTY",
        "enabled": True,
        "layout": "columns",
        "columns": [
            {
                "id": "col-makeup",
                "title": "MAKEUP",
                "titleLink": "/beauty/makeup",
                "width": 1,
                "items": [
                    {"id": "b1", "name": "Face", "path": "/beauty/face"},
                    {"id": "b2", "name": "Eyes", "path": "/beauty/eyes"},
                    {"id": "b3", "name": "Lips", "path": "/beauty/lips"},
                    {"id": "b4", "name": "Nails", "path": "/beauty/nails"},
                    {"id": "b5", "name": "Brushes & Tools", "path": "/beauty/tools"}
                ]
            },
            {
                "id": "col-skincare",
                "title": "SKINCARE",
                "titleLink": "/beauty/skincare",
                "width": 1,
                "items": [
                    {"id": "sk1", "name": "Cleansers", "path": "/beauty/cleansers"},
                    {"id": "sk2", "name": "Moisturizers", "path": "/beauty/moisturizers"},
                    {"id": "sk3", "name": "Serums", "path": "/beauty/serums"},
                    {"id": "sk4", "name": "Sunscreen", "path": "/beauty/sunscreen"},
                    {"id": "sk5", "name": "Masks", "path": "/beauty/masks"}
                ]
            },
            {
                "id": "col-fragrance",
                "title": "FRAGRANCE",
                "titleLink": "/beauty/fragrance",
                "width": 1,
                "items": [
                    {"id": "f1", "name": "Women's Perfume", "path": "/beauty/perfume-women"},
                    {"id": "f2", "name": "Men's Cologne", "path": "/beauty/cologne-men"},
                    {"id": "f3", "name": "Gift Sets", "path": "/beauty/gift-sets"},
                    {"id": "f4", "name": "Body Mists", "path": "/beauty/body-mists"}
                ]
            }
        ],
        "promoBanners": [
            {
                "id": "promo-beauty-1",
                "image": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",
                "title": "Beauty Favorites",
                "subtitle": "Best Sellers",
                "link": "/beauty/bestsellers",
                "buttonText": "Shop",
                "position": "right"
            }
        ],
        "quickLinks": []
    }
]

# ======================
# API ENDPOINTS
# ======================

@router.get("/config/{store}")
async def get_mega_menu_config(store: str):
    """Get full mega menu configuration for a store"""
    config = await _db.mega_menu_configs.find_one({"store": store}, {"_id": 0})
    
    if not config:
        # Return default config
        return {
            "store": store,
            "sections": DEFAULT_MEGA_MENU_SECTIONS,
            "globalSettings": {
                "hoverDelay": 150,
                "animationType": "fade",
                "maxWidth": "1200px",
                "showOnMobile": True
            },
            "isDefault": True
        }
    
    return config


@router.get("/section/{store}/{category_name}")
async def get_mega_menu_section(store: str, category_name: str):
    """Get mega menu section for a specific category"""
    config = await _db.mega_menu_configs.find_one({"store": store}, {"_id": 0})
    
    sections = config.get("sections", DEFAULT_MEGA_MENU_SECTIONS) if config else DEFAULT_MEGA_MENU_SECTIONS
    
    for section in sections:
        if section.get("categoryName", "").upper() == category_name.upper():
            return section
    
    raise HTTPException(status_code=404, detail=f"Section not found for category: {category_name}")


@router.post("/config/{store}")
async def save_mega_menu_config(store: str, config: MegaMenuConfig):
    """Save full mega menu configuration for a store"""
    config_dict = config.dict()
    config_dict["store"] = store
    config_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if not config_dict.get("created_at"):
        config_dict["created_at"] = config_dict["updated_at"]
    
    await _db.mega_menu_configs.update_one(
        {"store": store},
        {"$set": config_dict},
        upsert=True
    )
    
    return {"success": True, "message": "Mega menu configuration saved", "store": store}


@router.put("/section/{store}/{section_id}")
async def update_mega_menu_section(store: str, section_id: str, section: MegaMenuSection):
    """Update a specific mega menu section"""
    config = await _db.mega_menu_configs.find_one({"store": store})
    
    if not config:
        # Create new config with this section
        config = {
            "store": store,
            "sections": [section.dict()],
            "globalSettings": {"hoverDelay": 150, "animationType": "fade", "maxWidth": "1200px", "showOnMobile": True},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await _db.mega_menu_configs.insert_one(config)
    else:
        # Update existing section or add new one
        sections = config.get("sections", [])
        updated = False
        
        for i, s in enumerate(sections):
            if s.get("id") == section_id:
                sections[i] = section.dict()
                updated = True
                break
        
        if not updated:
            sections.append(section.dict())
        
        await _db.mega_menu_configs.update_one(
            {"store": store},
            {
                "$set": {
                    "sections": sections,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    return {"success": True, "message": "Section updated", "section_id": section_id}


@router.delete("/section/{store}/{section_id}")
async def delete_mega_menu_section(store: str, section_id: str):
    """Delete a mega menu section"""
    result = await _db.mega_menu_configs.update_one(
        {"store": store},
        {
            "$pull": {"sections": {"id": section_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Section not found")
    
    return {"success": True, "message": "Section deleted"}


@router.post("/section/{store}/{section_id}/column")
async def add_column_to_section(store: str, section_id: str, column: MenuColumn):
    """Add a new column to a mega menu section"""
    column_dict = column.dict()
    
    result = await _db.mega_menu_configs.update_one(
        {"store": store, "sections.id": section_id},
        {
            "$push": {"sections.$.columns": column_dict},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Section not found")
    
    return {"success": True, "message": "Column added", "column": column_dict}


@router.put("/section/{store}/{section_id}/column/{column_id}")
async def update_column(store: str, section_id: str, column_id: str, column: MenuColumn):
    """Update a column in a mega menu section"""
    config = await _db.mega_menu_configs.find_one({"store": store})
    
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    sections = config.get("sections", [])
    for section in sections:
        if section.get("id") == section_id:
            columns = section.get("columns", [])
            for i, col in enumerate(columns):
                if col.get("id") == column_id:
                    columns[i] = column.dict()
                    break
            section["columns"] = columns
            break
    
    await _db.mega_menu_configs.update_one(
        {"store": store},
        {
            "$set": {
                "sections": sections,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": "Column updated"}


@router.delete("/section/{store}/{section_id}/column/{column_id}")
async def delete_column(store: str, section_id: str, column_id: str):
    """Delete a column from a mega menu section"""
    result = await _db.mega_menu_configs.update_one(
        {"store": store, "sections.id": section_id},
        {
            "$pull": {"sections.$.columns": {"id": column_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Column not found")
    
    return {"success": True, "message": "Column deleted"}


@router.post("/section/{store}/{section_id}/promo")
async def add_promo_banner(store: str, section_id: str, promo: PromoBanner):
    """Add a promotional banner to a section"""
    promo_dict = promo.dict()
    
    result = await _db.mega_menu_configs.update_one(
        {"store": store, "sections.id": section_id},
        {
            "$push": {"sections.$.promoBanners": promo_dict},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Section not found")
    
    return {"success": True, "message": "Promo banner added", "promo": promo_dict}


@router.put("/settings/{store}")
async def update_global_settings(store: str, settings: dict):
    """Update global mega menu settings"""
    await _db.mega_menu_configs.update_one(
        {"store": store},
        {
            "$set": {
                "globalSettings": settings,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Settings updated"}


@router.post("/clone/{source_store}/{target_store}")
async def clone_mega_menu(source_store: str, target_store: str):
    """Clone mega menu configuration from one store to another"""
    source_config = await _db.mega_menu_configs.find_one({"store": source_store}, {"_id": 0})
    
    if not source_config:
        raise HTTPException(status_code=404, detail="Source store config not found")
    
    source_config["store"] = target_store
    source_config["created_at"] = datetime.now(timezone.utc).isoformat()
    source_config["updated_at"] = source_config["created_at"]
    
    await _db.mega_menu_configs.update_one(
        {"store": target_store},
        {"$set": source_config},
        upsert=True
    )
    
    return {"success": True, "message": f"Menu cloned from {source_store} to {target_store}"}
