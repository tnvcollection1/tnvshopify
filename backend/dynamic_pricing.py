"""
Dynamic Pricing Engine
Handles tiered pricing based on stock levels and velocity-based surge pricing
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import shopify

logger = logging.getLogger(__name__)


class DynamicPricingEngine:
    """Engine for calculating dynamic prices based on demand and stock levels"""
    
    # Default configuration (can be overridden per product)
    DEFAULT_CONFIG = {
        "enabled": True,
        
        # Category A - High Velocity (10+ orders in history)
        "category_a": {
            "threshold": 10,  # Historical orders needed
            "tiers": [
                {"orders": 0, "multiplier": 1.0},     # Base price
                {"orders": 2, "multiplier": 1.5},     # +50%
                {"orders": 5, "multiplier": 2.0},     # +100%
                {"orders": 10, "multiplier": 2.5},    # +150%
                {"orders": 20, "multiplier": 3.0},    # +200% MAX
            ]
        },
        
        # Category B - Medium Velocity (3-9 orders in history)
        "category_b": {
            "threshold_min": 3,
            "threshold_max": 9,
            "tiers": [
                {"orders": 0, "multiplier": 1.0},     # Base price
                {"orders": 2, "multiplier": 1.05},    # +5%
                {"orders": 5, "multiplier": 1.12},    # +12%
                {"orders": 10, "multiplier": 1.20},   # +20%
            ]
        },
        
        # Category C - Low Velocity (0-2 orders in history)
        "category_c": {
            "threshold": 2,
            "tiers": [
                {"orders": 0, "multiplier": 0.80},    # -20% discount (SALE)
                {"orders": 2, "multiplier": 1.0},     # Revert to base
                {"orders": 5, "multiplier": 1.10},    # +10% (promoted to hot!)
                {"orders": 10, "multiplier": 1.20},   # +20%
            ]
        },
        
        # Global limits
        "max_multiplier": 3.0,   # Max +200% above base
        "min_multiplier": 0.70,  # Min -30% below base
        
        # Time window for order counting
        "rolling_window_days": 7,
        "reset_day": 0,  # Monday (0=Monday, 6=Sunday)
        
        # Historical lookback for classification
        "classification_lookback_days": 5000,  # All historical data
    }
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.config = self.DEFAULT_CONFIG.copy()
    
    async def initialize_pricing_collection(self):
        """Initialize pricing rules collection if not exists"""
        try:
            # Create indexes
            await self.db.pricing_rules.create_index("sku", unique=True)
            await self.db.pricing_rules.create_index("category")
            await self.db.pricing_rules.create_index("last_updated")
            
            # Create order tracking collection indexes
            await self.db.pricing_order_tracking.create_index("sku")
            await self.db.pricing_order_tracking.create_index("order_date")
            await self.db.pricing_order_tracking.create_index([("sku", 1), ("order_date", -1)])
            
            logger.info("✅ Dynamic pricing collections initialized")
            return True
        except Exception as e:
            logger.error(f"Error initializing pricing collections: {e}")
            return False
    
    async def classify_sku(self, sku: str, store_name: Optional[str] = None) -> Dict:
        """
        Classify a SKU into Category A, B, or C based on historical orders
        
        Returns:
            Dict with category, base_price, historical_orders, etc.
        """
        try:
            # Count historical orders for this SKU
            lookback_date = datetime.now(timezone.utc) - timedelta(
                days=self.config["classification_lookback_days"]
            )
            
            # Query customers collection for orders containing this SKU
            query = {
                "order_skus": {"$in": [sku.upper()]},
                "last_order_date": {"$gte": lookback_date.isoformat()}
            }
            if store_name:
                query["store_name"] = store_name
            
            historical_count = await self.db.customers.count_documents(query)
            
            # Get base price from inventory_v2 (try both exact and case-insensitive match)
            inventory_item = await self.db.inventory_v2.find_one(
                {"sku": {"$regex": f"^{sku}$", "$options": "i"}},
                {"_id": 0, "cost": 1, "sale_price": 1, "product_name": 1}
            )
            
            base_price = 0
            if inventory_item:
                # Use sale_price as base, fallback to cost * 2 (standard retail markup)
                sale_price = inventory_item.get("sale_price", 0)
                cost = inventory_item.get("cost", 0)
                base_price = sale_price if sale_price > 0 else (cost * 2)
            
            # Classify
            category = "C"  # Default: Low velocity
            if historical_count >= self.config["category_a"]["threshold"]:
                category = "A"
            elif historical_count >= self.config["category_b"]["threshold_min"]:
                category = "B"
            
            return {
                "sku": sku.upper(),
                "category": category,
                "historical_orders": historical_count,
                "base_price": float(base_price),
                "product_name": inventory_item.get("product_name", "") if inventory_item else "",
                "classified_at": datetime.now(timezone.utc).isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error classifying SKU {sku}: {e}")
            return {
                "sku": sku.upper(),
                "category": "C",
                "historical_orders": 0,
                "base_price": 0,
                "error": str(e)
            }
    
    async def get_rolling_window_orders(self, sku: str, days: int = 7) -> int:
        """Get number of orders for a SKU in the rolling window"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            count = await self.db.pricing_order_tracking.count_documents({
                "sku": sku.upper(),
                "order_date": {"$gte": cutoff_date.isoformat()}
            })
            
            return count
        except Exception as e:
            logger.error(f"Error getting rolling window orders for {sku}: {e}")
            return 0
    
    async def calculate_dynamic_price(self, sku: str, store_name: Optional[str] = None) -> Dict:
        """
        Calculate the current dynamic price for a SKU
        
        Returns:
            Dict with current_price, base_price, multiplier, category, etc.
        """
        try:
            # Get or create pricing rule for this SKU
            pricing_rule = await self.db.pricing_rules.find_one(
                {"sku": sku.upper()},
                {"_id": 0}
            )
            
            # If not exists, classify and create
            if not pricing_rule:
                classification = await self.classify_sku(sku, store_name)
                pricing_rule = {
                    **classification,
                    "enabled": True,
                    "manual_override": False,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
                await self.db.pricing_rules.insert_one(pricing_rule)
                pricing_rule.pop("_id", None)
            
            # If pricing disabled for this SKU, return base price
            if not pricing_rule.get("enabled", True):
                return {
                    "sku": sku.upper(),
                    "current_price": pricing_rule["base_price"],
                    "base_price": pricing_rule["base_price"],
                    "compare_at_price": None,
                    "multiplier": 1.0,
                    "category": pricing_rule["category"],
                    "rolling_orders": 0,
                    "pricing_enabled": False,
                    "is_on_sale": False
                }
            
            # Get rolling window order count
            rolling_orders = await self.get_rolling_window_orders(
                sku, 
                self.config["rolling_window_days"]
            )
            
            # Get tier config based on category
            category = pricing_rule["category"]
            if category == "A":
                tier_config = self.config["category_a"]["tiers"]
            elif category == "B":
                tier_config = self.config["category_b"]["tiers"]
            else:  # Category C
                tier_config = self.config["category_c"]["tiers"]
            
            # Find applicable tier (highest tier where orders >= threshold)
            multiplier = 1.0
            for tier in sorted(tier_config, key=lambda x: x["orders"], reverse=True):
                if rolling_orders >= tier["orders"]:
                    multiplier = tier["multiplier"]
                    break
            
            # Apply manual override multiplier if set
            if pricing_rule.get("manual_override") and pricing_rule.get("override_multiplier"):
                multiplier = pricing_rule["override_multiplier"]
            
            # Apply global limits
            multiplier = max(self.config["min_multiplier"], min(multiplier, self.config["max_multiplier"]))
            
            # Calculate prices
            base_price = float(pricing_rule["base_price"])
            current_price = round(base_price * multiplier, 2)
            
            # Compare at price (for display)
            compare_at_price = None
            is_on_sale = False
            if multiplier < 1.0:
                # Discounted: show original price as compare_at_price
                compare_at_price = base_price
                is_on_sale = True
            elif multiplier > 1.0:
                # Surged: show how much increase from base
                compare_at_price = base_price
            
            return {
                "sku": sku.upper(),
                "current_price": current_price,
                "base_price": base_price,
                "compare_at_price": compare_at_price,
                "multiplier": round(multiplier, 2),
                "percentage_change": round((multiplier - 1.0) * 100, 1),
                "category": category,
                "rolling_orders": rolling_orders,
                "historical_orders": pricing_rule.get("historical_orders", 0),
                "pricing_enabled": True,
                "is_on_sale": is_on_sale,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error calculating dynamic price for {sku}: {e}")
            return {
                "sku": sku.upper(),
                "current_price": 0,
                "base_price": 0,
                "error": str(e)
            }
    
    async def track_new_order(self, order_data: Dict):
        """
        Track a new order for pricing calculation
        Should be called when a new order comes in from Shopify
        """
        try:
            order_number = order_data.get("order_number")
            line_items = order_data.get("line_items", [])
            order_date = order_data.get("order_date") or datetime.now(timezone.utc).isoformat()
            
            for item in line_items:
                sku = item.get("sku", "").upper()
                if not sku:
                    continue
                
                # Track this order
                tracking_entry = {
                    "sku": sku,
                    "order_number": order_number,
                    "order_date": order_date,
                    "quantity": item.get("quantity", 1),
                    "price_at_time": item.get("price", 0),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await self.db.pricing_order_tracking.insert_one(tracking_entry)
                logger.info(f"✅ Tracked order for SKU: {sku}, Order: {order_number}")
            
            return True
        except Exception as e:
            logger.error(f"Error tracking new order: {e}")
            return False
    
    async def reset_weekly_counters(self):
        """Reset order counters every Monday (or configured day)"""
        try:
            today = datetime.now(timezone.utc)
            if today.weekday() != self.config["reset_day"]:
                return {"message": "Not reset day", "reset_day": self.config["reset_day"]}
            
            # Delete old tracking entries outside the rolling window
            cutoff_date = today - timedelta(days=self.config["rolling_window_days"])
            
            result = await self.db.pricing_order_tracking.delete_many({
                "order_date": {"$lt": cutoff_date.isoformat()}
            })
            
            logger.info(f"🔄 Weekly reset: Deleted {result.deleted_count} old tracking entries")
            
            return {
                "success": True,
                "deleted_count": result.deleted_count,
                "reset_date": today.isoformat()
            }
        except Exception as e:
            logger.error(f"Error resetting weekly counters: {e}")
            return {"success": False, "error": str(e)}
    
    async def sync_price_to_shopify(
        self,
        sku: str,
        current_price: float,
        compare_at_price: Optional[float],
        shop_url: str,
        access_token: str
    ) -> Dict:
        """
        Sync calculated price to Shopify store
        
        Args:
            sku: Product SKU
            current_price: New dynamic price
            compare_at_price: Original/compare price (for strikethrough display)
            shop_url: Shopify store URL
            access_token: Store access token
        """
        try:
            # Connect to Shopify
            session = shopify.Session(shop_url, "2024-01", access_token)
            shopify.ShopifyResource.activate_session(session)
            
            # Find product variant by SKU
            variants = shopify.Variant.find(sku=sku)
            
            if not variants or len(variants) == 0:
                logger.warning(f"No Shopify variant found for SKU: {sku}")
                return {"success": False, "error": "Variant not found"}
            
            variant = variants[0]
            
            # Update price
            variant.price = str(current_price)
            if compare_at_price:
                variant.compare_at_price = str(compare_at_price)
            else:
                variant.compare_at_price = None
            
            # Save to Shopify
            success = variant.save()
            
            shopify.ShopifyResource.clear_session()
            
            if success:
                logger.info(f"✅ Synced price to Shopify: {sku} = ${current_price}")
                return {
                    "success": True,
                    "sku": sku,
                    "new_price": current_price,
                    "compare_at_price": compare_at_price,
                    "variant_id": variant.id
                }
            else:
                return {"success": False, "error": "Failed to save variant"}
        
        except Exception as e:
            logger.error(f"Error syncing price to Shopify for {sku}: {e}")
            return {"success": False, "error": str(e)}
    
    async def bulk_sync_to_shopify(self, store_name: str, limit: int = 100) -> Dict:
        """
        Bulk sync all active pricing rules to Shopify
        """
        try:
            # Get store credentials
            store = await self.db.stores.find_one(
                {"name": store_name},
                {"_id": 0, "shopify_domain": 1, "shopify_token": 1}
            )
            
            if not store:
                return {"success": False, "error": "Store not found"}
            
            # Get all enabled pricing rules
            pricing_rules = await self.db.pricing_rules.find(
                {"enabled": True},
                {"_id": 0, "sku": 1}
            ).limit(limit).to_list(limit)
            
            results = []
            success_count = 0
            failed_count = 0
            
            for rule in pricing_rules:
                sku = rule["sku"]
                
                # Calculate current price
                price_data = await self.calculate_dynamic_price(sku, store_name)
                
                # Sync to Shopify
                sync_result = await self.sync_price_to_shopify(
                    sku,
                    price_data["current_price"],
                    price_data.get("compare_at_price"),
                    store["shopify_domain"],
                    store["shopify_token"]
                )
                
                if sync_result["success"]:
                    success_count += 1
                else:
                    failed_count += 1
                
                results.append({
                    "sku": sku,
                    "success": sync_result["success"],
                    "price": price_data["current_price"]
                })
            
            return {
                "success": True,
                "total_processed": len(results),
                "success_count": success_count,
                "failed_count": failed_count,
                "results": results
            }
        
        except Exception as e:
            logger.error(f"Error in bulk sync: {e}")
            return {"success": False, "error": str(e)}
