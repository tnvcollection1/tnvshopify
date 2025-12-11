"""
Inventory Clearance Routes
Handles clearance analysis, campaigns, and Shopify sync
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

# Will be injected from server.py
db = None
clearance_engine = None

def set_dependencies(database, engine):
    """Set dependencies from server.py"""
    global db, clearance_engine
    db = database
    clearance_engine = engine

clearance_router = APIRouter(prefix="/clearance", tags=["Inventory Clearance"])


class ClearanceItemRequest(BaseModel):
    sku: str
    title: Optional[str] = None
    discount_percent: int = 20
    quantity: Optional[int] = None
    price: Optional[float] = None
    days_without_sale: Optional[int] = None
    store_name: Optional[str] = None


class CreateCampaignRequest(BaseModel):
    name: Optional[str] = None
    items: List[ClearanceItemRequest]


@clearance_router.get("/health")
async def get_inventory_health(store_name: str = None):
    """Analyze inventory health and categorize items"""
    try:
        result = await clearance_engine.analyze_inventory_health(store_name)
        return result
    except Exception as e:
        logger.error(f"Error analyzing inventory health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@clearance_router.get("/stats")
async def get_clearance_stats():
    """Get clearance dashboard statistics"""
    try:
        result = await clearance_engine.get_clearance_stats()
        return result
    except Exception as e:
        logger.error(f"Error getting clearance stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@clearance_router.post("/ai-recommendations")
async def get_ai_recommendations(store_name: str = None, category: str = "dead_stock"):
    """
    Get AI-powered discount recommendations for clearance items
    Category: dead_stock, slow_moving, moderate
    """
    try:
        # Get inventory health first
        health = await clearance_engine.analyze_inventory_health(store_name)
        
        if not health.get('success'):
            return health
        
        # Get items from specified category
        items = health.get('categories', {}).get(category, [])
        
        if not items:
            return {
                'success': False,
                'error': f'No items found in category: {category}'
            }
        
        # Get AI recommendations
        result = await clearance_engine.get_ai_recommendations(items)
        return result
        
    except Exception as e:
        logger.error(f"Error getting AI recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@clearance_router.post("/campaigns/create")
async def create_clearance_campaign(request: CreateCampaignRequest):
    """Create a new clearance campaign"""
    try:
        items = [item.dict() for item in request.items]
        result = await clearance_engine.create_clearance_campaign(items, request.name)
        return result
    except Exception as e:
        logger.error(f"Error creating campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@clearance_router.get("/campaigns")
async def get_clearance_campaigns(status: str = None):
    """Get all clearance campaigns"""
    try:
        result = await clearance_engine.get_clearance_campaigns(status)
        return result
    except Exception as e:
        logger.error(f"Error fetching campaigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@clearance_router.get("/campaigns/{campaign_id}")
async def get_campaign_details(campaign_id: str):
    """Get details of a specific campaign"""
    try:
        campaign = await db.clearance_campaigns.find_one(
            {'campaign_id': campaign_id}, {'_id': 0}
        )
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return {'success': True, 'campaign': campaign}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@clearance_router.post("/campaigns/{campaign_id}/sync")
async def sync_campaign_to_shopify(campaign_id: str, store_name: str):
    """Sync clearance prices to Shopify"""
    try:
        result = await clearance_engine.sync_clearance_to_shopify(campaign_id, store_name)
        return result
    except Exception as e:
        logger.error(f"Error syncing to Shopify: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@clearance_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a clearance campaign"""
    try:
        result = await db.clearance_campaigns.delete_one({'campaign_id': campaign_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return {'success': True, 'message': 'Campaign deleted'}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@clearance_router.post("/quick-clearance")
async def quick_clearance(store_name: str = None, category: str = "dead_stock", auto_discount: bool = True):
    """
    Quick clearance: Analyze inventory, get AI recommendations, and create campaign in one step
    """
    try:
        # Step 1: Analyze inventory
        health = await clearance_engine.analyze_inventory_health(store_name)
        if not health.get('success'):
            return health
        
        items = health.get('categories', {}).get(category, [])
        if not items:
            return {'success': False, 'error': f'No items found in {category}'}
        
        # Step 2: Get AI recommendations if enabled
        if auto_discount:
            ai_result = await clearance_engine.get_ai_recommendations(items)
            if ai_result.get('success') and ai_result.get('recommendations'):
                # Apply AI recommendations to items
                rec_map = {r['sku']: r for r in ai_result.get('recommendations', [])}
                for item in items:
                    if item['sku'] in rec_map:
                        item['discount_percent'] = rec_map[item['sku']].get('discount_percent', 20)
                        item['ai_priority'] = rec_map[item['sku']].get('priority', 'medium')
                        item['ai_reason'] = rec_map[item['sku']].get('reason', '')
        else:
            # Apply default discounts based on category
            for item in items:
                days = item.get('days_without_sale', 0)
                if days >= 360:
                    item['discount_percent'] = 50
                elif days >= 180:
                    item['discount_percent'] = 30
                else:
                    item['discount_percent'] = 20
        
        # Step 3: Create campaign
        campaign_result = await clearance_engine.create_clearance_campaign(
            items[:50],  # Limit to 50 items
            f"Quick Clearance - {category.replace('_', ' ').title()}"
        )
        
        return {
            'success': True,
            'inventory_summary': health.get('summary'),
            'campaign': campaign_result.get('campaign'),
            'ai_recommendations': ai_result.get('overall_strategy') if auto_discount else None
        }
        
    except Exception as e:
        logger.error(f"Error in quick clearance: {e}")
        raise HTTPException(status_code=500, detail=str(e))
