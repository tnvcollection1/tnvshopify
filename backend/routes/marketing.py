"""
Marketing & Campaign Routes
Endpoints for marketing dashboard, campaigns, and promotions
"""
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/marketing", tags=["Marketing"])

# Database reference - set from server.py
_db = None

def set_database(db):
    """Set database from server.py"""
    global _db
    _db = db

def get_db():
    if _db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return _db


# Pydantic Models
class CampaignCreate(BaseModel):
    name: str
    type: str = "discount"
    target: str = "all"
    discount_percentage: float = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "draft"


class CampaignStatusUpdate(BaseModel):
    status: str


@router.get("/stats")
async def get_marketing_stats():
    """Get marketing dashboard statistics"""
    db = get_db()
    try:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Get all customers
        all_customers = await db.customers.find({}, {"_id": 0}).to_list(100000)
        
        # Calculate revenues
        today_revenue = sum(
            c.get('total_spent', 0) 
            for c in all_customers 
            if c.get('created_at') and c.get('created_at') >= today_start.isoformat()
        )
        
        week_revenue = sum(
            c.get('total_spent', 0)
            for c in all_customers
            if c.get('created_at') and c.get('created_at') >= week_start.isoformat()
        )
        
        month_revenue = sum(
            c.get('total_spent', 0)
            for c in all_customers
            if c.get('created_at') and c.get('created_at') >= month_start.isoformat()
        )
        
        # Count orders
        total_orders = len(all_customers)
        pending_orders = len([c for c in all_customers if c.get('fulfillment_status', '').lower() in ['unfulfilled', 'pending']])
        
        # WhatsApp sent count
        whatsapp_sent = len([c for c in all_customers if c.get('messaged') == True])
        
        # Get inventory value
        inventory_items = await db.inventory_v2.find({}, {"_id": 0, "sale_price": 1, "cost": 1}).to_list(10000)
        inventory_value = sum(item.get('sale_price', item.get('cost', 0)) for item in inventory_items)
        
        # Calculate conversion rate
        conversion_rate = round((total_orders / max(total_orders * 3, 1)) * 100, 1) if total_orders > 0 else 0
        
        return {
            "success": True,
            "stats": {
                "todayRevenue": round(today_revenue, 2),
                "weekRevenue": round(week_revenue, 2),
                "monthRevenue": round(month_revenue, 2),
                "totalRevenue": round(sum(c.get('total_spent', 0) for c in all_customers), 2),
                "totalOrders": total_orders,
                "pendingOrders": pending_orders,
                "inventoryValue": round(inventory_value, 2),
                "whatsappSent": whatsapp_sent,
                "conversionRate": conversion_rate
            }
        }
    except Exception as e:
        logger.error(f"Error fetching marketing stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns")
async def get_marketing_campaigns():
    """Get active marketing campaigns"""
    db = get_db()
    try:
        campaigns = await db.campaigns.find(
            {"status": {"$in": ["active", "scheduled"]}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return {"success": True, "campaigns": campaigns}
    except Exception as e:
        logger.error(f"Error fetching marketing campaigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/all")
async def get_all_campaigns():
    """Get all campaigns"""
    db = get_db()
    try:
        campaigns = await db.campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return {"success": True, "campaigns": campaigns}
    except Exception as e:
        logger.error(f"Error fetching campaigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns")
async def create_campaign(campaign_data: CampaignCreate):
    """Create a new marketing campaign"""
    db = get_db()
    try:
        campaign = {
            "id": str(uuid.uuid4()),
            "name": campaign_data.name,
            "type": campaign_data.type,
            "target": campaign_data.target,
            "discount_percentage": campaign_data.discount_percentage,
            "start_date": campaign_data.start_date,
            "end_date": campaign_data.end_date,
            "status": campaign_data.status,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.campaigns.insert_one(campaign)
        
        return {
            "success": True,
            "message": "Campaign created successfully",
            "campaign_id": campaign["id"]
        }
    except Exception as e:
        logger.error(f"Error creating campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/campaigns/{campaign_id}/status")
async def update_campaign_status(campaign_id: str, status_data: CampaignStatusUpdate):
    """Update campaign status"""
    db = get_db()
    try:
        result = await db.campaigns.update_one(
            {"id": campaign_id},
            {"$set": {
                "status": status_data.status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return {"success": True, "message": "Campaign status updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating campaign status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign"""
    db = get_db()
    try:
        result = await db.campaigns.delete_one({"id": campaign_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return {"success": True, "message": "Campaign deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    """Get a specific campaign by ID"""
    db = get_db()
    try:
        campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return {"success": True, "campaign": campaign}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, campaign_data: dict = Body(...)):
    """Update a campaign"""
    db = get_db()
    try:
        update_data = {k: v for k, v in campaign_data.items() if k != 'id'}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.campaigns.update_one(
            {"id": campaign_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return {"success": True, "message": "Campaign updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics")
async def get_marketing_analytics(days: int = 30):
    """Get marketing analytics for the specified period"""
    db = get_db()
    try:
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)
        
        # Get orders in period
        orders = await db.customers.find({
            "created_at": {"$gte": start_date.isoformat()}
        }, {"_id": 0, "total_spent": 1, "created_at": 1, "store_name": 1}).to_list(100000)
        
        # Calculate daily revenue
        daily_revenue = {}
        for order in orders:
            date = order.get('created_at', '')[:10]  # Extract date
            if date:
                daily_revenue[date] = daily_revenue.get(date, 0) + order.get('total_spent', 0)
        
        # Convert to list
        revenue_data = [
            {"date": date, "revenue": amount}
            for date, amount in sorted(daily_revenue.items())
        ]
        
        # Get campaign performance
        campaigns = await db.campaigns.find({
            "status": "active"
        }, {"_id": 0}).to_list(100)
        
        return {
            "success": True,
            "analytics": {
                "period_days": days,
                "total_orders": len(orders),
                "total_revenue": sum(o.get('total_spent', 0) for o in orders),
                "average_order_value": round(sum(o.get('total_spent', 0) for o in orders) / max(len(orders), 1), 2),
                "daily_revenue": revenue_data,
                "active_campaigns": len(campaigns)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching marketing analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/segments")
async def get_customer_segments():
    """Get customer segmentation data"""
    db = get_db()
    try:
        # Get all customers
        customers = await db.customers.find({}, {
            "_id": 0,
            "total_spent": 1,
            "orders_count": 1,
            "last_order_date": 1
        }).to_list(100000)
        
        # Segment customers
        segments = {
            "vip": [],      # High spenders (top 10%)
            "regular": [],  # Regular customers
            "at_risk": [],  # Haven't ordered in 60+ days
            "new": [],      # Single order customers
            "dormant": []   # Haven't ordered in 90+ days
        }
        
        now = datetime.now(timezone.utc)
        
        # Calculate thresholds
        all_spent = [c.get('total_spent', 0) for c in customers if c.get('total_spent', 0) > 0]
        vip_threshold = sorted(all_spent, reverse=True)[int(len(all_spent) * 0.1)] if len(all_spent) > 10 else float('inf')
        
        for customer in customers:
            total_spent = customer.get('total_spent', 0)
            orders_count = customer.get('orders_count', 0)
            last_order = customer.get('last_order_date', '')
            
            # Calculate days since last order
            days_since_order = 999
            if last_order:
                try:
                    last_order_date = datetime.fromisoformat(last_order.replace('Z', '+00:00'))
                    days_since_order = (now - last_order_date).days
                except:
                    pass
            
            # Categorize
            if total_spent >= vip_threshold:
                segments['vip'].append(customer)
            elif days_since_order > 90:
                segments['dormant'].append(customer)
            elif days_since_order > 60:
                segments['at_risk'].append(customer)
            elif orders_count == 1:
                segments['new'].append(customer)
            else:
                segments['regular'].append(customer)
        
        return {
            "success": True,
            "segments": {
                "vip": {"count": len(segments['vip']), "label": "VIP Customers"},
                "regular": {"count": len(segments['regular']), "label": "Regular Customers"},
                "at_risk": {"count": len(segments['at_risk']), "label": "At Risk"},
                "new": {"count": len(segments['new']), "label": "New Customers"},
                "dormant": {"count": len(segments['dormant']), "label": "Dormant"}
            },
            "total_customers": len(customers)
        }
    except Exception as e:
        logger.error(f"Error fetching customer segments: {e}")
        raise HTTPException(status_code=500, detail=str(e))
