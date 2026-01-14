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
        "id": "fashion-section",
        "categoryId": "cat-fashion",
        "categoryName": "FASHION",
        "enabled": True,
        "layout": "columns",
        "columns": [
            {
                "id": "col-women",
                "title": "WOMEN",
                "titleLink": "/women",
                "width": 1,
                "items": [
                    {"id": "fw1", "name": "Dresses", "path": "/women/dresses"},
                    {"id": "fw2", "name": "Tops & Blouses", "path": "/women/tops"},
                    {"id": "fw3", "name": "T-Shirts", "path": "/women/tshirts"},
                    {"id": "fw4", "name": "Jeans", "path": "/women/jeans"},
                    {"id": "fw5", "name": "Skirts", "path": "/women/skirts"},
                    {"id": "fw6", "name": "Activewear", "path": "/women/activewear"},
                    {"id": "fw7", "name": "View All Women", "path": "/women", "badge": "→"}
                ]
            },
            {
                "id": "col-men",
                "title": "MEN",
                "titleLink": "/men",
                "width": 1,
                "items": [
                    {"id": "fm1", "name": "T-Shirts", "path": "/men/tshirts"},
                    {"id": "fm2", "name": "Shirts", "path": "/men/shirts"},
                    {"id": "fm3", "name": "Jeans", "path": "/men/jeans"},
                    {"id": "fm4", "name": "Pants", "path": "/men/pants"},
                    {"id": "fm5", "name": "Jackets", "path": "/men/jackets"},
                    {"id": "fm6", "name": "Suits", "path": "/men/suits"},
                    {"id": "fm7", "name": "View All Men", "path": "/men", "badge": "→"}
                ]
            },
            {
                "id": "col-shoes",
                "title": "SHOES",
                "titleLink": "/shoes",
                "width": 1,
                "items": [
                    {"id": "fs1", "name": "Women's Heels", "path": "/women/heels"},
                    {"id": "fs2", "name": "Women's Flats", "path": "/women/flats"},
                    {"id": "fs3", "name": "Men's Sneakers", "path": "/men/sneakers"},
                    {"id": "fs4", "name": "Men's Formal", "path": "/men/formal"},
                    {"id": "fs5", "name": "Sports Shoes", "path": "/shoes/sports"},
                    {"id": "fs6", "name": "View All Shoes", "path": "/shoes", "badge": "→"}
                ]
            },
            {
                "id": "col-brands",
                "title": "TOP BRANDS",
                "titleLink": "/brands",
                "width": 1,
                "items": [
                    {"id": "fb1", "name": "Nike", "path": "/brand/nike"},
                    {"id": "fb2", "name": "Adidas", "path": "/brand/adidas"},
                    {"id": "fb3", "name": "Zara", "path": "/brand/zara"},
                    {"id": "fb4", "name": "H&M", "path": "/brand/hm"},
                    {"id": "fb5", "name": "Tommy Hilfiger", "path": "/brand/tommy"},
                    {"id": "fb6", "name": "View All Brands", "path": "/brands", "badge": "500+"}
                ]
            }
        ],
        "promoBanners": [
            {
                "id": "promo-fashion-1",
                "image": "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=500&fit=crop",
                "title": "New Season",
                "subtitle": "Up to 50% Off",
                "link": "/sale",
                "buttonText": "Shop Now",
                "position": "right"
            }
        ],
        "quickLinks": [
            {"id": "fql1", "name": "New Arrivals", "path": "/new-arrivals", "highlight": True},
            {"id": "fql2", "name": "Sale", "path": "/sale", "highlight": True},
            {"id": "fql3", "name": "Best Sellers", "path": "/bestsellers"}
        ]
    },
    {
        "id": "women-section",
        "categoryId": "cat-women",
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


# ======================
# MEGA MENU TEMPLATES
# ======================

MEGA_MENU_TEMPLATES = {
    "fashion_store": {
        "id": "template-fashion",
        "name": "Fashion Store",
        "description": "Perfect for clothing, shoes, and accessories stores",
        "preview": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=200&fit=crop",
        "sections": [
            {
                "id": "tpl-fashion",
                "categoryId": "cat-fashion",
                "categoryName": "FASHION",
                "enabled": True,
                "layout": "columns",
                "columns": [
                    {
                        "id": "tpl-women",
                        "title": "WOMEN",
                        "titleLink": "/women",
                        "width": 1,
                        "items": [
                            {"id": "tf1", "name": "Dresses", "path": "/women/dresses"},
                            {"id": "tf2", "name": "Tops", "path": "/women/tops"},
                            {"id": "tf3", "name": "Jeans", "path": "/women/jeans"},
                            {"id": "tf4", "name": "Skirts", "path": "/women/skirts"},
                            {"id": "tf5", "name": "Activewear", "path": "/women/activewear"},
                            {"id": "tf6", "name": "View All", "path": "/women", "badge": "→"}
                        ]
                    },
                    {
                        "id": "tpl-men",
                        "title": "MEN",
                        "titleLink": "/men",
                        "width": 1,
                        "items": [
                            {"id": "tm1", "name": "T-Shirts", "path": "/men/tshirts"},
                            {"id": "tm2", "name": "Shirts", "path": "/men/shirts"},
                            {"id": "tm3", "name": "Jeans", "path": "/men/jeans"},
                            {"id": "tm4", "name": "Jackets", "path": "/men/jackets"},
                            {"id": "tm5", "name": "Suits", "path": "/men/suits"},
                            {"id": "tm6", "name": "View All", "path": "/men", "badge": "→"}
                        ]
                    },
                    {
                        "id": "tpl-shoes",
                        "title": "SHOES",
                        "titleLink": "/shoes",
                        "width": 1,
                        "items": [
                            {"id": "ts1", "name": "Sneakers", "path": "/shoes/sneakers"},
                            {"id": "ts2", "name": "Heels", "path": "/shoes/heels"},
                            {"id": "ts3", "name": "Boots", "path": "/shoes/boots"},
                            {"id": "ts4", "name": "Sandals", "path": "/shoes/sandals"},
                            {"id": "ts5", "name": "Sports", "path": "/shoes/sports"}
                        ]
                    },
                    {
                        "id": "tpl-brands",
                        "title": "BRANDS",
                        "titleLink": "/brands",
                        "width": 1,
                        "items": [
                            {"id": "tb1", "name": "Nike", "path": "/brand/nike"},
                            {"id": "tb2", "name": "Adidas", "path": "/brand/adidas"},
                            {"id": "tb3", "name": "Zara", "path": "/brand/zara"},
                            {"id": "tb4", "name": "H&M", "path": "/brand/hm"},
                            {"id": "tb5", "name": "All Brands", "path": "/brands", "badge": "500+"}
                        ]
                    }
                ],
                "promoBanners": [
                    {
                        "id": "tpl-promo-1",
                        "image": "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=500&fit=crop",
                        "title": "New Season",
                        "subtitle": "Up to 50% Off",
                        "link": "/sale",
                        "buttonText": "Shop Now",
                        "position": "right"
                    }
                ],
                "quickLinks": [
                    {"id": "tql1", "name": "New Arrivals", "path": "/new", "highlight": True},
                    {"id": "tql2", "name": "Sale", "path": "/sale", "highlight": True},
                    {"id": "tql3", "name": "Best Sellers", "path": "/bestsellers"}
                ]
            }
        ]
    },
    "electronics": {
        "id": "template-electronics",
        "name": "Electronics Store",
        "description": "Great for tech, gadgets, and electronics stores",
        "preview": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=200&fit=crop",
        "sections": [
            {
                "id": "tpl-electronics",
                "categoryId": "cat-electronics",
                "categoryName": "ELECTRONICS",
                "enabled": True,
                "layout": "columns",
                "columns": [
                    {
                        "id": "tpl-phones",
                        "title": "PHONES & TABLETS",
                        "titleLink": "/phones",
                        "width": 1,
                        "items": [
                            {"id": "te1", "name": "Smartphones", "path": "/phones/smartphones"},
                            {"id": "te2", "name": "Tablets", "path": "/phones/tablets"},
                            {"id": "te3", "name": "Cases & Covers", "path": "/phones/cases"},
                            {"id": "te4", "name": "Chargers", "path": "/phones/chargers"},
                            {"id": "te5", "name": "Screen Protectors", "path": "/phones/screen-protectors"}
                        ]
                    },
                    {
                        "id": "tpl-computers",
                        "title": "COMPUTERS",
                        "titleLink": "/computers",
                        "width": 1,
                        "items": [
                            {"id": "tc1", "name": "Laptops", "path": "/computers/laptops"},
                            {"id": "tc2", "name": "Desktops", "path": "/computers/desktops"},
                            {"id": "tc3", "name": "Monitors", "path": "/computers/monitors"},
                            {"id": "tc4", "name": "Keyboards", "path": "/computers/keyboards"},
                            {"id": "tc5", "name": "Mouse", "path": "/computers/mouse"}
                        ]
                    },
                    {
                        "id": "tpl-audio",
                        "title": "AUDIO",
                        "titleLink": "/audio",
                        "width": 1,
                        "items": [
                            {"id": "ta1", "name": "Headphones", "path": "/audio/headphones"},
                            {"id": "ta2", "name": "Earbuds", "path": "/audio/earbuds"},
                            {"id": "ta3", "name": "Speakers", "path": "/audio/speakers"},
                            {"id": "ta4", "name": "Soundbars", "path": "/audio/soundbars"}
                        ]
                    },
                    {
                        "id": "tpl-gaming",
                        "title": "GAMING",
                        "titleLink": "/gaming",
                        "width": 1,
                        "items": [
                            {"id": "tg1", "name": "Consoles", "path": "/gaming/consoles"},
                            {"id": "tg2", "name": "Controllers", "path": "/gaming/controllers"},
                            {"id": "tg3", "name": "Gaming Chairs", "path": "/gaming/chairs"},
                            {"id": "tg4", "name": "VR Headsets", "path": "/gaming/vr"}
                        ]
                    }
                ],
                "promoBanners": [
                    {
                        "id": "tpl-tech-promo",
                        "image": "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=500&fit=crop",
                        "title": "Tech Deals",
                        "subtitle": "Save Big",
                        "link": "/deals",
                        "buttonText": "Shop Deals",
                        "position": "right"
                    }
                ],
                "quickLinks": [
                    {"id": "teql1", "name": "New Releases", "path": "/new", "highlight": True},
                    {"id": "teql2", "name": "Deals", "path": "/deals", "highlight": True},
                    {"id": "teql3", "name": "Best Sellers", "path": "/bestsellers"}
                ]
            }
        ]
    },
    "beauty": {
        "id": "template-beauty",
        "name": "Beauty & Cosmetics",
        "description": "Ideal for beauty, skincare, and cosmetics stores",
        "preview": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=200&fit=crop",
        "sections": [
            {
                "id": "tpl-beauty",
                "categoryId": "cat-beauty",
                "categoryName": "BEAUTY",
                "enabled": True,
                "layout": "columns",
                "columns": [
                    {
                        "id": "tpl-makeup",
                        "title": "MAKEUP",
                        "titleLink": "/makeup",
                        "width": 1,
                        "items": [
                            {"id": "tbm1", "name": "Face", "path": "/makeup/face"},
                            {"id": "tbm2", "name": "Eyes", "path": "/makeup/eyes"},
                            {"id": "tbm3", "name": "Lips", "path": "/makeup/lips"},
                            {"id": "tbm4", "name": "Nails", "path": "/makeup/nails"},
                            {"id": "tbm5", "name": "Brushes & Tools", "path": "/makeup/tools"}
                        ]
                    },
                    {
                        "id": "tpl-skincare",
                        "title": "SKINCARE",
                        "titleLink": "/skincare",
                        "width": 1,
                        "items": [
                            {"id": "tbs1", "name": "Cleansers", "path": "/skincare/cleansers"},
                            {"id": "tbs2", "name": "Moisturizers", "path": "/skincare/moisturizers"},
                            {"id": "tbs3", "name": "Serums", "path": "/skincare/serums"},
                            {"id": "tbs4", "name": "Sunscreen", "path": "/skincare/sunscreen"},
                            {"id": "tbs5", "name": "Masks", "path": "/skincare/masks"}
                        ]
                    },
                    {
                        "id": "tpl-hair",
                        "title": "HAIR CARE",
                        "titleLink": "/haircare",
                        "width": 1,
                        "items": [
                            {"id": "tbh1", "name": "Shampoo", "path": "/haircare/shampoo"},
                            {"id": "tbh2", "name": "Conditioner", "path": "/haircare/conditioner"},
                            {"id": "tbh3", "name": "Treatments", "path": "/haircare/treatments"},
                            {"id": "tbh4", "name": "Styling", "path": "/haircare/styling"}
                        ]
                    },
                    {
                        "id": "tpl-fragrance",
                        "title": "FRAGRANCE",
                        "titleLink": "/fragrance",
                        "width": 1,
                        "items": [
                            {"id": "tbf1", "name": "Women's Perfume", "path": "/fragrance/women"},
                            {"id": "tbf2", "name": "Men's Cologne", "path": "/fragrance/men"},
                            {"id": "tbf3", "name": "Gift Sets", "path": "/fragrance/gifts"},
                            {"id": "tbf4", "name": "Body Mists", "path": "/fragrance/mists"}
                        ]
                    }
                ],
                "promoBanners": [
                    {
                        "id": "tpl-beauty-promo",
                        "image": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=500&fit=crop",
                        "title": "Glow Up",
                        "subtitle": "New Collections",
                        "link": "/new",
                        "buttonText": "Explore",
                        "position": "right"
                    }
                ],
                "quickLinks": [
                    {"id": "tbql1", "name": "New In", "path": "/new", "highlight": True},
                    {"id": "tbql2", "name": "Sale", "path": "/sale", "highlight": True},
                    {"id": "tbql3", "name": "Gift Sets", "path": "/gifts"}
                ]
            }
        ]
    },
    "home_living": {
        "id": "template-home",
        "name": "Home & Living",
        "description": "Perfect for furniture, decor, and home goods stores",
        "preview": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=200&fit=crop",
        "sections": [
            {
                "id": "tpl-home",
                "categoryId": "cat-home",
                "categoryName": "HOME",
                "enabled": True,
                "layout": "columns",
                "columns": [
                    {
                        "id": "tpl-furniture",
                        "title": "FURNITURE",
                        "titleLink": "/furniture",
                        "width": 1,
                        "items": [
                            {"id": "thf1", "name": "Sofas", "path": "/furniture/sofas"},
                            {"id": "thf2", "name": "Beds", "path": "/furniture/beds"},
                            {"id": "thf3", "name": "Tables", "path": "/furniture/tables"},
                            {"id": "thf4", "name": "Chairs", "path": "/furniture/chairs"},
                            {"id": "thf5", "name": "Storage", "path": "/furniture/storage"}
                        ]
                    },
                    {
                        "id": "tpl-decor",
                        "title": "DECOR",
                        "titleLink": "/decor",
                        "width": 1,
                        "items": [
                            {"id": "thd1", "name": "Wall Art", "path": "/decor/wall-art"},
                            {"id": "thd2", "name": "Mirrors", "path": "/decor/mirrors"},
                            {"id": "thd3", "name": "Vases", "path": "/decor/vases"},
                            {"id": "thd4", "name": "Candles", "path": "/decor/candles"},
                            {"id": "thd5", "name": "Plants", "path": "/decor/plants"}
                        ]
                    },
                    {
                        "id": "tpl-kitchen",
                        "title": "KITCHEN",
                        "titleLink": "/kitchen",
                        "width": 1,
                        "items": [
                            {"id": "thk1", "name": "Cookware", "path": "/kitchen/cookware"},
                            {"id": "thk2", "name": "Dinnerware", "path": "/kitchen/dinnerware"},
                            {"id": "thk3", "name": "Appliances", "path": "/kitchen/appliances"},
                            {"id": "thk4", "name": "Storage", "path": "/kitchen/storage"}
                        ]
                    },
                    {
                        "id": "tpl-bedding",
                        "title": "BEDDING",
                        "titleLink": "/bedding",
                        "width": 1,
                        "items": [
                            {"id": "thb1", "name": "Bed Sheets", "path": "/bedding/sheets"},
                            {"id": "thb2", "name": "Pillows", "path": "/bedding/pillows"},
                            {"id": "thb3", "name": "Duvets", "path": "/bedding/duvets"},
                            {"id": "thb4", "name": "Blankets", "path": "/bedding/blankets"}
                        ]
                    }
                ],
                "promoBanners": [
                    {
                        "id": "tpl-home-promo",
                        "image": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=500&fit=crop",
                        "title": "Home Refresh",
                        "subtitle": "New Arrivals",
                        "link": "/new",
                        "buttonText": "Shop Now",
                        "position": "right"
                    }
                ],
                "quickLinks": [
                    {"id": "thql1", "name": "New Arrivals", "path": "/new", "highlight": True},
                    {"id": "thql2", "name": "Sale", "path": "/sale", "highlight": True},
                    {"id": "thql3", "name": "Room Ideas", "path": "/inspiration"}
                ]
            }
        ]
    },
    "grocery": {
        "id": "template-grocery",
        "name": "Grocery & Food",
        "description": "For grocery, food delivery, and supermarket stores",
        "preview": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=200&fit=crop",
        "sections": [
            {
                "id": "tpl-grocery",
                "categoryId": "cat-grocery",
                "categoryName": "GROCERY",
                "enabled": True,
                "layout": "columns",
                "columns": [
                    {
                        "id": "tpl-fresh",
                        "title": "FRESH",
                        "titleLink": "/fresh",
                        "width": 1,
                        "items": [
                            {"id": "tgf1", "name": "Fruits", "path": "/fresh/fruits"},
                            {"id": "tgf2", "name": "Vegetables", "path": "/fresh/vegetables"},
                            {"id": "tgf3", "name": "Dairy", "path": "/fresh/dairy"},
                            {"id": "tgf4", "name": "Meat & Seafood", "path": "/fresh/meat"},
                            {"id": "tgf5", "name": "Bakery", "path": "/fresh/bakery"}
                        ]
                    },
                    {
                        "id": "tpl-pantry",
                        "title": "PANTRY",
                        "titleLink": "/pantry",
                        "width": 1,
                        "items": [
                            {"id": "tgp1", "name": "Rice & Grains", "path": "/pantry/rice"},
                            {"id": "tgp2", "name": "Pasta", "path": "/pantry/pasta"},
                            {"id": "tgp3", "name": "Canned Goods", "path": "/pantry/canned"},
                            {"id": "tgp4", "name": "Spices", "path": "/pantry/spices"},
                            {"id": "tgp5", "name": "Sauces", "path": "/pantry/sauces"}
                        ]
                    },
                    {
                        "id": "tpl-beverages",
                        "title": "BEVERAGES",
                        "titleLink": "/beverages",
                        "width": 1,
                        "items": [
                            {"id": "tgb1", "name": "Water", "path": "/beverages/water"},
                            {"id": "tgb2", "name": "Juice", "path": "/beverages/juice"},
                            {"id": "tgb3", "name": "Soft Drinks", "path": "/beverages/soft-drinks"},
                            {"id": "tgb4", "name": "Coffee & Tea", "path": "/beverages/coffee"}
                        ]
                    },
                    {
                        "id": "tpl-snacks",
                        "title": "SNACKS",
                        "titleLink": "/snacks",
                        "width": 1,
                        "items": [
                            {"id": "tgs1", "name": "Chips", "path": "/snacks/chips"},
                            {"id": "tgs2", "name": "Cookies", "path": "/snacks/cookies"},
                            {"id": "tgs3", "name": "Chocolate", "path": "/snacks/chocolate"},
                            {"id": "tgs4", "name": "Nuts", "path": "/snacks/nuts"}
                        ]
                    }
                ],
                "promoBanners": [
                    {
                        "id": "tpl-grocery-promo",
                        "image": "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=400&h=500&fit=crop",
                        "title": "Fresh Deals",
                        "subtitle": "Daily Savings",
                        "link": "/deals",
                        "buttonText": "Shop Now",
                        "position": "right"
                    }
                ],
                "quickLinks": [
                    {"id": "tgql1", "name": "Today's Deals", "path": "/deals", "highlight": True},
                    {"id": "tgql2", "name": "Weekly Specials", "path": "/specials", "highlight": True},
                    {"id": "tgql3", "name": "Recipes", "path": "/recipes"}
                ]
            }
        ]
    }
}


@router.get("/templates")
async def get_templates():
    """Get all available mega menu templates"""
    templates = []
    for key, template in MEGA_MENU_TEMPLATES.items():
        templates.append({
            "id": template["id"],
            "key": key,
            "name": template["name"],
            "description": template["description"],
            "preview": template["preview"],
            "sectionsCount": len(template["sections"])
        })
    return {"templates": templates}


@router.get("/templates/{template_key}")
async def get_template(template_key: str):
    """Get a specific mega menu template"""
    if template_key not in MEGA_MENU_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    return MEGA_MENU_TEMPLATES[template_key]


@router.post("/templates/{template_key}/apply/{store}")
async def apply_template(template_key: str, store: str, merge: bool = False):
    """Apply a mega menu template to a store
    
    Args:
        template_key: The template to apply
        store: The store to apply it to
        merge: If True, merge with existing sections. If False, replace all sections.
    """
    if template_key not in MEGA_MENU_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = MEGA_MENU_TEMPLATES[template_key]
    
    if merge:
        # Get existing config and merge
        existing = await _db.mega_menu_configs.find_one({"store": store})
        if existing:
            existing_sections = existing.get("sections", [])
            existing_names = {s.get("categoryName") for s in existing_sections}
            
            # Add only new sections from template
            new_sections = [s for s in template["sections"] if s.get("categoryName") not in existing_names]
            all_sections = existing_sections + new_sections
        else:
            all_sections = template["sections"]
    else:
        all_sections = template["sections"]
    
    config = {
        "store": store,
        "sections": all_sections,
        "globalSettings": {
            "hoverDelay": 150,
            "animationType": "fade",
            "maxWidth": "1200px",
            "showOnMobile": True
        },
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "applied_template": template_key
    }
    
    await _db.mega_menu_configs.update_one(
        {"store": store},
        {"$set": config},
        upsert=True
    )
    
    return {
        "success": True, 
        "message": f"Template '{template['name']}' applied to {store}",
        "template": template_key,
        "sectionsAdded": len(all_sections)
    }

