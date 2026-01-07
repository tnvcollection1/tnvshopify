"""
Scheduled Competitor Price Check Service
Runs automated price checks on products at configured intervals
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import random

logger = logging.getLogger(__name__)


class ScheduledPriceCheckService:
    """Service for scheduling and running automated competitor price checks"""
    
    def __init__(self):
        self._db = None
        self._running = False
        self._task = None
        self.settings_collection = "price_check_schedules"
        self.history_collection = "price_check_history"
    
    def set_database(self, db: AsyncIOMotorDatabase):
        self._db = db
    
    @property
    def db(self):
        if self._db is None:
            raise RuntimeError("Database not initialized")
        return self._db
    
    async def get_schedule_settings(self, store_name: str = None) -> Dict[str, Any]:
        """Get current schedule settings"""
        query = {}
        if store_name:
            query["store_name"] = store_name
        else:
            query["store_name"] = {"$exists": False}  # Global settings
        
        settings = await self.db[self.settings_collection].find_one(query, {"_id": 0})
        
        if not settings:
            return {
                "enabled": False,
                "frequency": "daily",  # daily, weekly, manual
                "hour": 2,  # Run at 2 AM
                "day_of_week": 0,  # Monday (for weekly)
                "products_per_run": 50,  # How many products to check per run
                "priority_mode": "not_analyzed",  # not_analyzed, oldest, random
                "auto_alert": True,  # Create alerts for price drops
                "last_run": None,
                "next_run": None,
                "store_name": store_name
            }
        
        return settings
    
    async def update_schedule_settings(
        self,
        enabled: bool = False,
        frequency: str = "daily",
        hour: int = 2,
        day_of_week: int = 0,
        products_per_run: int = 50,
        priority_mode: str = "not_analyzed",
        auto_alert: bool = True,
        store_name: str = None
    ) -> Dict[str, Any]:
        """Update schedule settings"""
        settings = {
            "enabled": enabled,
            "frequency": frequency,
            "hour": hour,
            "day_of_week": day_of_week,
            "products_per_run": products_per_run,
            "priority_mode": priority_mode,
            "auto_alert": auto_alert,
            "store_name": store_name,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Calculate next run time
        if enabled:
            settings["next_run"] = self._calculate_next_run(frequency, hour, day_of_week)
        
        query = {"store_name": store_name} if store_name else {"store_name": {"$exists": False}}
        
        await self.db[self.settings_collection].update_one(
            query,
            {"$set": settings},
            upsert=True
        )
        
        return settings
    
    def _calculate_next_run(self, frequency: str, hour: int, day_of_week: int = 0) -> str:
        """Calculate the next scheduled run time"""
        now = datetime.now(timezone.utc)
        
        if frequency == "hourly":
            # Next hour
            next_run = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        elif frequency == "daily":
            # Today or tomorrow at specified hour
            next_run = now.replace(hour=hour, minute=0, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
        elif frequency == "weekly":
            # Next occurrence of day_of_week at specified hour
            days_ahead = day_of_week - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            next_run = now + timedelta(days=days_ahead)
            next_run = next_run.replace(hour=hour, minute=0, second=0, microsecond=0)
        else:
            next_run = None
        
        return next_run.isoformat() if next_run else None
    
    async def get_products_to_check(
        self, 
        store_name: str,
        limit: int = 50,
        priority_mode: str = "not_analyzed"
    ) -> List[Dict[str, Any]]:
        """Get list of products to check based on priority mode"""
        
        # Base query for products with images
        base_query = {
            "store_name": store_name,
            "image_url": {"$exists": True, "$ne": None, "$ne": ""}
        }
        
        if priority_mode == "not_analyzed":
            # Get products that have never been analyzed
            analyzed_ids = await self.db.competitor_analyses.distinct(
                "product_id",
                {"store_name": store_name}
            )
            
            products = await self.db.shopify_products.find(
                {**base_query, "shopify_product_id": {"$nin": analyzed_ids}},
                {"_id": 0, "shopify_product_id": 1, "title": 1, "price": 1, "image_url": 1, "product_type": 1}
            ).limit(limit).to_list(limit)
            
        elif priority_mode == "oldest":
            # Get products with oldest analysis
            pipeline = [
                {"$match": {"store_name": store_name}},
                {"$sort": {"created_at": 1}},
                {"$group": {"_id": "$product_id", "last_checked": {"$max": "$created_at"}}},
                {"$sort": {"last_checked": 1}},
                {"$limit": limit}
            ]
            
            oldest = await self.db.competitor_analyses.aggregate(pipeline).to_list(limit)
            product_ids = [o["_id"] for o in oldest]
            
            products = await self.db.shopify_products.find(
                {**base_query, "shopify_product_id": {"$in": product_ids}},
                {"_id": 0, "shopify_product_id": 1, "title": 1, "price": 1, "image_url": 1, "product_type": 1}
            ).to_list(limit)
            
        else:  # random
            # Get random products
            pipeline = [
                {"$match": base_query},
                {"$sample": {"size": limit}},
                {"$project": {"_id": 0, "shopify_product_id": 1, "title": 1, "price": 1, "image_url": 1, "product_type": 1}}
            ]
            products = await self.db.shopify_products.aggregate(pipeline).to_list(limit)
        
        return products
    
    async def run_scheduled_check(self, store_name: str = None) -> Dict[str, Any]:
        """Run a scheduled price check"""
        from services.web_search_service import web_search_service
        from services.price_alert_service import price_alert_service
        
        start_time = datetime.now(timezone.utc)
        
        # Get settings
        settings = await self.get_schedule_settings(store_name)
        
        if not settings.get("enabled") and store_name:
            return {
                "success": False,
                "message": "Scheduled checks are disabled",
                "store_name": store_name
            }
        
        # Get stores to check
        if store_name:
            stores = [{"store_name": store_name}]
        else:
            stores = await self.db.stores.find({}, {"store_name": 1}).to_list(100)
        
        total_analyzed = 0
        total_alerts = 0
        results_by_store = {}
        
        for store in stores:
            sname = store.get("store_name")
            if not sname:
                continue
            
            # Get products to check
            products = await self.get_products_to_check(
                sname,
                settings.get("products_per_run", 50),
                settings.get("priority_mode", "not_analyzed")
            )
            
            store_results = {
                "products_checked": 0,
                "competitors_found": 0,
                "alerts_triggered": 0,
                "errors": 0
            }
            
            for product in products:
                try:
                    # Run title-based search (more reliable than image search for automation)
                    search_result = await web_search_service.search_by_title(
                        product_title=product.get("title", ""),
                        category=product.get("product_type", "general"),
                        max_results=10
                    )
                    
                    competitor_pages = search_result.get("pages_with_matching_products", [])
                    
                    # Save analysis
                    import uuid
                    analysis_id = str(uuid.uuid4())[:12]
                    
                    analysis_record = {
                        "analysis_id": analysis_id,
                        "product_id": product.get("shopify_product_id"),
                        "product_name": product.get("title"),
                        "your_price": product.get("price", 0),
                        "store_name": sname,
                        "image_url": product.get("image_url"),
                        "search_method": "scheduled_title_search",
                        "competitor_pages": competitor_pages,
                        "competitor_prices": [],
                        "status": "completed" if competitor_pages else "no_results",
                        "source": "scheduled_check",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    await self.db.competitor_analyses.insert_one(analysis_record)
                    
                    store_results["products_checked"] += 1
                    store_results["competitors_found"] += len(competitor_pages)
                    total_analyzed += 1
                    
                    # Check for price alerts if enabled
                    if settings.get("auto_alert") and competitor_pages:
                        price_alert_service.set_database(self.db)
                        alerts = await price_alert_service.check_price_alerts(
                            product_id=product.get("shopify_product_id"),
                            product_name=product.get("title"),
                            your_price=product.get("price", 0),
                            competitor_prices=[{"prices": [10], "domain": "test"}],  # Simplified
                            store_name=sname
                        )
                        store_results["alerts_triggered"] += len(alerts)
                        total_alerts += len(alerts)
                    
                    # Rate limiting
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Error checking product {product.get('title')}: {e}")
                    store_results["errors"] += 1
            
            results_by_store[sname] = store_results
        
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()
        
        # Record history
        history_record = {
            "run_id": f"run_{start_time.strftime('%Y%m%d%H%M%S')}",
            "started_at": start_time.isoformat(),
            "completed_at": end_time.isoformat(),
            "duration_seconds": duration,
            "total_products_checked": total_analyzed,
            "total_alerts_triggered": total_alerts,
            "results_by_store": results_by_store,
            "settings_used": settings
        }
        
        await self.db[self.history_collection].insert_one(history_record)
        
        # Update last run and next run
        if settings.get("enabled"):
            next_run = self._calculate_next_run(
                settings.get("frequency", "daily"),
                settings.get("hour", 2),
                settings.get("day_of_week", 0)
            )
            
            query = {"store_name": store_name} if store_name else {"store_name": {"$exists": False}}
            await self.db[self.settings_collection].update_one(
                query,
                {"$set": {
                    "last_run": end_time.isoformat(),
                    "next_run": next_run
                }}
            )
        
        return {
            "success": True,
            "run_id": history_record["run_id"],
            "duration_seconds": duration,
            "total_products_checked": total_analyzed,
            "total_alerts_triggered": total_alerts,
            "results_by_store": results_by_store,
            "next_run": settings.get("next_run")
        }
    
    async def get_run_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get history of scheduled runs"""
        history = await self.db[self.history_collection].find(
            {},
            {"_id": 0}
        ).sort("started_at", -1).limit(limit).to_list(limit)
        
        return history
    
    async def start_background_scheduler(self):
        """Start the background scheduler loop"""
        if self._running:
            logger.warning("Scheduler already running")
            return
        
        self._running = True
        logger.info("Starting background price check scheduler")
        
        while self._running:
            try:
                # Check all schedules
                schedules = await self.db[self.settings_collection].find(
                    {"enabled": True},
                    {"_id": 0}
                ).to_list(100)
                
                now = datetime.now(timezone.utc)
                
                for schedule in schedules:
                    next_run_str = schedule.get("next_run")
                    if not next_run_str:
                        continue
                    
                    next_run = datetime.fromisoformat(next_run_str.replace('Z', '+00:00'))
                    
                    if now >= next_run:
                        store_name = schedule.get("store_name")
                        logger.info(f"Running scheduled price check for {store_name or 'all stores'}")
                        
                        try:
                            await self.run_scheduled_check(store_name)
                        except Exception as e:
                            logger.error(f"Scheduled check failed: {e}")
                
                # Sleep for 5 minutes before next check
                await asyncio.sleep(300)
                
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(60)
    
    def stop_scheduler(self):
        """Stop the background scheduler"""
        self._running = False
        if self._task:
            self._task.cancel()


# Singleton instance
scheduled_price_check_service = ScheduledPriceCheckService()
