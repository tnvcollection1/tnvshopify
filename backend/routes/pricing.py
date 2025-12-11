"""Dynamic Pricing Routes
Handles all pricing-related endpoints
"""
from fastapi import APIRouter, HTTPException
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Will be injected from server.py
db = None
pricing_engine = None

def set_dependencies(database, engine):
    """Set database and pricing engine from server.py"""
    global db, pricing_engine
    db = database
    pricing_engine = engine

pricing_router = APIRouter(prefix="/pricing", tags=["Dynamic Pricing"])


@pricing_router.post("/initialize")
async def initialize_pricing_system():
    """Initialize dynamic pricing collections and indexes"""
    try:
        result = await pricing_engine.initialize_pricing_collection()
        if result:
            return {"success": True, "message": "Dynamic pricing system initialized"}
        else:
            raise HTTPException(status_code=500, detail="Failed to initialize pricing")
    except Exception as e:
        logger.error(f"Error initializing pricing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.get("/config")
async def get_pricing_config():
    """Get current pricing configuration"""
    try:
        return {"success": True, "config": pricing_engine.config}
    except Exception as e:
        logger.error(f"Error getting pricing config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.put("/config")
async def update_pricing_config(config_update: dict):
    """Update pricing configuration"""
    try:
        pricing_engine.config.update(config_update)
        return {"success": True, "message": "Pricing configuration updated", "config": pricing_engine.config}
    except Exception as e:
        logger.error(f"Error updating pricing config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.post("/classify-all")
async def classify_all_skus(store_name: str = None):
    """Classify all SKUs in inventory into pricing categories"""
    try:
        result = await pricing_engine.classify_all_inventory(db, store_name)
        return result
    except Exception as e:
        logger.error(f"Error classifying SKUs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.get("/rules")
async def get_pricing_rules():
    """Get all pricing rules/SKU classifications"""
    try:
        rules = await db.pricing_rules.find({}, {"_id": 0}).to_list(1000)
        return {"success": True, "rules": rules, "count": len(rules)}
    except Exception as e:
        logger.error(f"Error getting pricing rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.get("/calculate/{sku}")
async def calculate_price(sku: str):
    """Calculate dynamic price for a specific SKU"""
    try:
        result = await pricing_engine.calculate_price(db, sku)
        return result
    except Exception as e:
        logger.error(f"Error calculating price for {sku}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.post("/calculate-all")
async def calculate_all_prices(store_name: str = None):
    """Calculate prices for all SKUs"""
    try:
        result = await pricing_engine.calculate_all_prices(db, store_name)
        return result
    except Exception as e:
        logger.error(f"Error calculating all prices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.post("/track-order")
async def track_order_for_pricing(order_id: str, sku: str, quantity: int = 1):
    """Track an order for dynamic pricing calculations"""
    try:
        result = await pricing_engine.track_order(db, order_id, sku, quantity)
        return result
    except Exception as e:
        logger.error(f"Error tracking order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.post("/sync-to-shopify/{sku}")
async def sync_price_to_shopify(sku: str, store_name: str = "tnvcollectionpk"):
    """Sync calculated price to Shopify for a specific SKU"""
    try:
        result = await pricing_engine.sync_to_shopify(db, sku, store_name)
        return result
    except Exception as e:
        logger.error(f"Error syncing to Shopify: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.post("/sync-all-to-shopify")
async def sync_all_prices_to_shopify(store_name: str = "tnvcollectionpk"):
    """Sync all calculated prices to Shopify"""
    try:
        result = await pricing_engine.sync_all_to_shopify(db, store_name)
        return result
    except Exception as e:
        logger.error(f"Error syncing all to Shopify: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.post("/reset-weekly")
async def reset_weekly_counters():
    """Reset weekly sales counters (run weekly)"""
    try:
        result = await pricing_engine.reset_weekly_counters(db)
        return result
    except Exception as e:
        logger.error(f"Error resetting weekly counters: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.put("/rule/{sku}")
async def update_pricing_rule(sku: str, rule_update: dict):
    """Update pricing rule for a specific SKU"""
    try:
        await db.pricing_rules.update_one({"sku": sku}, {"$set": rule_update}, upsert=True)
        return {"success": True, "message": f"Pricing rule updated for {sku}"}
    except Exception as e:
        logger.error(f"Error updating pricing rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.post("/bulk-enable")
async def bulk_enable_pricing(skus: list = None, store_name: str = None, enable: bool = True):
    """Enable/disable dynamic pricing for multiple SKUs"""
    try:
        query = {}
        if skus:
            query["sku"] = {"$in": skus}
        if store_name:
            query["store_name"] = store_name
        
        result = await db.pricing_rules.update_many(query, {"$set": {"enabled": enable}})
        return {"success": True, "modified": result.modified_count, "enabled": enable}
    except Exception as e:
        logger.error(f"Error bulk enabling pricing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@pricing_router.get("/dashboard-stats")
async def get_pricing_dashboard_stats():
    """Get pricing dashboard statistics"""
    try:
        total_rules = await db.pricing_rules.count_documents({})
        enabled_rules = await db.pricing_rules.count_documents({"enabled": True})
        
        # Get category breakdown
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        categories = await db.pricing_rules.aggregate(pipeline).to_list(100)
        
        return {
            "success": True,
            "total_rules": total_rules,
            "enabled_rules": enabled_rules,
            "categories": {c["_id"]: c["count"] for c in categories if c["_id"]}
        }
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
