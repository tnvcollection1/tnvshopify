"""
Sales Analytics API
- Revenue metrics
- Order statistics
- Top products
- Customer analytics
"""

from fastapi import APIRouter, Query
from datetime import datetime, timedelta, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import random

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

_db: AsyncIOMotorDatabase = None

def set_database(db: AsyncIOMotorDatabase):
    global _db
    _db = db

# Store configurations
STORE_CONFIG = {
    "tnvcollection": {
        "currency": "INR",
        "currency_symbol": "₹",
        "country": "India",
        "base_revenue": 125000,
    },
    "tnvcollectionpk": {
        "currency": "PKR",
        "currency_symbol": "Rs.",
        "country": "Pakistan",
        "base_revenue": 2500000,  # Higher number for PKR
    }
}

def get_store_config(store: str):
    return STORE_CONFIG.get(store, STORE_CONFIG["tnvcollection"])


@router.get("/overview")
async def get_overview_stats(
    store: str = Query("tnvcollection"),
    period: str = Query("30d")  # 7d, 30d, 90d, 1y
):
    """Get overview statistics for dashboard"""
    
    # Calculate date range
    days = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}.get(period, 30)
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get orders from database
    if _db is not None:
        orders_collection = _db.orders
        
        # Real data from database
        pipeline = [
            {"$match": {"store": store, "created_at": {"$gte": start_date.isoformat()}}},
            {"$group": {
                "_id": None,
                "total_revenue": {"$sum": "$total"},
                "total_orders": {"$sum": 1},
                "avg_order_value": {"$avg": "$total"}
            }}
        ]
        result = await orders_collection.aggregate(pipeline).to_list(1)
        
        if result:
            stats = result[0]
            # Get previous period for comparison
            prev_start = start_date - timedelta(days=days)
            prev_pipeline = [
                {"$match": {"store": store, "created_at": {"$gte": prev_start.isoformat(), "$lt": start_date.isoformat()}}},
                {"$group": {
                    "_id": None,
                    "total_revenue": {"$sum": "$total"},
                    "total_orders": {"$sum": 1}
                }}
            ]
            prev_result = await orders_collection.aggregate(prev_pipeline).to_list(1)
            prev_stats = prev_result[0] if prev_result else {"total_revenue": 0, "total_orders": 0}
            
            # Calculate growth
            revenue_growth = ((stats["total_revenue"] - prev_stats["total_revenue"]) / max(prev_stats["total_revenue"], 1)) * 100
            orders_growth = ((stats["total_orders"] - prev_stats["total_orders"]) / max(prev_stats["total_orders"], 1)) * 100
            
            return {
                "total_revenue": round(stats["total_revenue"], 2),
                "total_orders": stats["total_orders"],
                "avg_order_value": round(stats.get("avg_order_value", 0), 2),
                "revenue_growth": round(revenue_growth, 1),
                "orders_growth": round(orders_growth, 1),
                "total_customers": await _db.customers.count_documents({"store": store}) if _db is not None else 0,
                "period": period,
                "currency": store_config["currency"],
                "currency_symbol": store_config["currency_symbol"]
            }
    
    # Demo data if no real data
    store_config = get_store_config(store)
    base_revenue = store_config["base_revenue"] + random.randint(-5000, 15000)
    base_orders = 342 + random.randint(-20, 50)
    
    return {
        "total_revenue": base_revenue,
        "total_orders": base_orders,
        "avg_order_value": round(base_revenue / base_orders, 2),
        "revenue_growth": round(random.uniform(8, 25), 1),
        "orders_growth": round(random.uniform(5, 20), 1),
        "total_customers": 1247 + random.randint(-50, 100),
        "conversion_rate": round(random.uniform(2.5, 4.5), 2),
        "period": period,
        "currency": store_config["currency"],
        "currency_symbol": store_config["currency_symbol"],
        "store": store
    }


@router.get("/revenue-chart")
async def get_revenue_chart(
    store: str = Query("tnvcollection"),
    period: str = Query("30d")
):
    """Get revenue data for chart"""
    
    days = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}.get(period, 30)
    
    # Generate chart data
    data = []
    base_revenue = 3500
    
    for i in range(days):
        date = datetime.now(timezone.utc) - timedelta(days=days - i - 1)
        
        # Add some realistic variation
        day_of_week = date.weekday()
        multiplier = 1.3 if day_of_week in [4, 5] else (0.8 if day_of_week == 0 else 1.0)
        
        revenue = base_revenue * multiplier + random.randint(-500, 1000)
        orders = int(revenue / 350) + random.randint(-3, 5)
        
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "label": date.strftime("%b %d"),
            "revenue": round(revenue, 2),
            "orders": max(orders, 1)
        })
    
    return {"data": data, "period": period}


@router.get("/top-products")
async def get_top_products(
    store: str = Query("tnvcollection"),
    limit: int = Query(10)
):
    """Get top selling products"""
    
    # Demo top products
    products = [
        {"id": "1", "name": "Nike Air Max 270", "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100", "sales": 156, "revenue": 23400, "growth": 12.5},
        {"id": "2", "name": "Adidas Ultraboost", "image": "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=100", "sales": 134, "revenue": 20100, "growth": 8.3},
        {"id": "3", "name": "Designer Handbag", "image": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=100", "sales": 98, "revenue": 19600, "growth": 15.7},
        {"id": "4", "name": "Summer Dress", "image": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=100", "sales": 112, "revenue": 11200, "growth": -2.1},
        {"id": "5", "name": "Slim Fit Jeans", "image": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=100", "sales": 89, "revenue": 8900, "growth": 5.4},
        {"id": "6", "name": "Sunglasses Premium", "image": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=100", "sales": 76, "revenue": 7600, "growth": 22.1},
        {"id": "7", "name": "Leather Watch", "image": "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=100", "sales": 65, "revenue": 9750, "growth": 18.9},
        {"id": "8", "name": "Cotton T-Shirt Pack", "image": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100", "sales": 203, "revenue": 6090, "growth": 3.2},
    ]
    
    return {"products": products[:limit]}


@router.get("/orders-by-status")
async def get_orders_by_status(store: str = Query("tnvcollection")):
    """Get order count by status"""
    
    # Demo data
    return {
        "statuses": [
            {"status": "pending", "count": 23, "color": "#FFA500"},
            {"status": "processing", "count": 45, "color": "#3B82F6"},
            {"status": "shipped", "count": 67, "color": "#8B5CF6"},
            {"status": "delivered", "count": 189, "color": "#10B981"},
            {"status": "cancelled", "count": 12, "color": "#EF4444"},
        ]
    }


@router.get("/customer-stats")
async def get_customer_stats(store: str = Query("tnvcollection")):
    """Get customer statistics"""
    
    return {
        "total_customers": 1247,
        "new_customers_month": 156,
        "returning_rate": 34.5,
        "avg_lifetime_value": 485.30,
        "top_locations": [
            {"city": "Dubai", "customers": 423, "percentage": 33.9},
            {"city": "Abu Dhabi", "customers": 234, "percentage": 18.8},
            {"city": "Sharjah", "customers": 178, "percentage": 14.3},
            {"city": "Riyadh", "customers": 145, "percentage": 11.6},
            {"city": "Jeddah", "customers": 98, "percentage": 7.9},
        ]
    }


@router.get("/sales-by-category")
async def get_sales_by_category(store: str = Query("tnvcollection")):
    """Get sales breakdown by category"""
    
    return {
        "categories": [
            {"name": "Footwear", "sales": 45600, "percentage": 35, "color": "#3B82F6"},
            {"name": "Clothing", "sales": 38900, "percentage": 30, "color": "#10B981"},
            {"name": "Bags", "sales": 25870, "percentage": 20, "color": "#F59E0B"},
            {"name": "Accessories", "sales": 12935, "percentage": 10, "color": "#8B5CF6"},
            {"name": "Beauty", "sales": 6470, "percentage": 5, "color": "#EC4899"},
        ]
    }


@router.get("/recent-orders")
async def get_recent_orders(
    store: str = Query("tnvcollection"),
    limit: int = Query(10)
):
    """Get recent orders"""
    
    # Demo recent orders
    orders = [
        {"id": "ORD-2026-001", "customer": "Ahmed Khan", "items": 3, "total": 459.00, "status": "delivered", "date": "2026-01-14"},
        {"id": "ORD-2026-002", "customer": "Sara Ali", "items": 2, "total": 289.50, "status": "shipped", "date": "2026-01-14"},
        {"id": "ORD-2026-003", "customer": "Mohammed Hassan", "items": 5, "total": 875.00, "status": "processing", "date": "2026-01-14"},
        {"id": "ORD-2026-004", "customer": "Fatima Noor", "items": 1, "total": 149.00, "status": "pending", "date": "2026-01-13"},
        {"id": "ORD-2026-005", "customer": "Omar Sheikh", "items": 4, "total": 520.00, "status": "delivered", "date": "2026-01-13"},
        {"id": "ORD-2026-006", "customer": "Layla Ahmed", "items": 2, "total": 340.00, "status": "shipped", "date": "2026-01-13"},
        {"id": "ORD-2026-007", "customer": "Yusuf Ibrahim", "items": 3, "total": 425.00, "status": "delivered", "date": "2026-01-12"},
        {"id": "ORD-2026-008", "customer": "Aisha Malik", "items": 1, "total": 199.00, "status": "cancelled", "date": "2026-01-12"},
    ]
    
    return {"orders": orders[:limit]}


@router.get("/hourly-sales")
async def get_hourly_sales(store: str = Query("tnvcollection")):
    """Get sales by hour of day"""
    
    hours = []
    for hour in range(24):
        # Peak hours: 10-12, 15-17, 20-22
        if hour in [10, 11, 15, 16, 20, 21]:
            sales = random.randint(800, 1500)
        elif hour in [9, 12, 14, 17, 19, 22]:
            sales = random.randint(400, 800)
        elif hour >= 6 and hour <= 23:
            sales = random.randint(100, 400)
        else:
            sales = random.randint(10, 100)
        
        hours.append({
            "hour": f"{hour:02d}:00",
            "sales": sales,
            "orders": sales // 150
        })
    
    return {"data": hours}
