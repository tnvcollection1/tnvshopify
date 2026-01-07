"""
Price Alert Service
Monitors competitor prices and sends notifications when prices drop
"""
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class PriceAlertService:
    """Service for monitoring competitor prices and sending alerts"""
    
    def __init__(self, db: AsyncIOMotorDatabase = None):
        self._db = db
        self.alert_collection = "price_alerts"
        self.notification_collection = "notifications"
    
    def set_database(self, db: AsyncIOMotorDatabase):
        self._db = db
    
    @property
    def db(self):
        if self._db is None:
            raise RuntimeError("Database not initialized for PriceAlertService")
        return self._db
    
    async def check_price_alerts(
        self, 
        product_id: str,
        product_name: str,
        your_price: float,
        competitor_prices: List[Dict[str, Any]],
        store_name: str = None
    ) -> List[Dict[str, Any]]:
        """
        Check if any competitor prices trigger an alert.
        
        Args:
            product_id: Product identifier
            product_name: Product name for notifications
            your_price: Your product's price
            competitor_prices: List of competitor price data
            store_name: Store name for filtering
        
        Returns:
            List of triggered alerts
        """
        triggered_alerts = []
        
        if not competitor_prices or your_price <= 0:
            return triggered_alerts
        
        # Get alert settings for this product
        alert_settings = await self.get_alert_settings(product_id)
        
        # Default: alert when any competitor is cheaper
        threshold_percent = alert_settings.get("threshold_percent", 0)  # 0 = any lower price
        enabled = alert_settings.get("enabled", True)
        
        if not enabled:
            return triggered_alerts
        
        for cp in competitor_prices:
            prices = cp.get("prices", [])
            if not prices:
                continue
            
            min_competitor_price = min(prices)
            domain = cp.get("domain", "Unknown")
            
            # Calculate price difference
            price_diff = your_price - min_competitor_price
            price_diff_percent = (price_diff / your_price) * 100 if your_price > 0 else 0
            
            # Check if alert should trigger
            # Alert if competitor is cheaper by more than threshold
            if min_competitor_price < your_price and price_diff_percent >= threshold_percent:
                alert = {
                    "product_id": product_id,
                    "product_name": product_name,
                    "your_price": your_price,
                    "competitor_price": min_competitor_price,
                    "competitor_domain": domain,
                    "competitor_url": cp.get("url"),
                    "price_difference": round(price_diff, 2),
                    "price_difference_percent": round(price_diff_percent, 1),
                    "currency": cp.get("base_currency", "INR"),
                    "store_name": store_name,
                    "triggered_at": datetime.now(timezone.utc).isoformat(),
                    "alert_type": "competitor_cheaper"
                }
                triggered_alerts.append(alert)
                
                # Create notification
                await self.create_notification(alert)
        
        return triggered_alerts
    
    async def get_alert_settings(self, product_id: str) -> Dict[str, Any]:
        """Get alert settings for a product"""
        settings = await self.db[self.alert_collection].find_one(
            {"product_id": product_id},
            {"_id": 0}
        )
        
        if not settings:
            # Return default settings
            return {
                "enabled": True,
                "threshold_percent": 0,  # Alert on any lower price
                "notify_email": True,
                "notify_in_app": True
            }
        
        return settings
    
    async def update_alert_settings(
        self,
        product_id: str,
        enabled: bool = True,
        threshold_percent: float = 0,
        notify_email: bool = True,
        notify_in_app: bool = True,
        email_recipients: List[str] = None
    ) -> Dict[str, Any]:
        """Update alert settings for a product"""
        settings = {
            "product_id": product_id,
            "enabled": enabled,
            "threshold_percent": threshold_percent,
            "notify_email": notify_email,
            "notify_in_app": notify_in_app,
            "email_recipients": email_recipients or [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db[self.alert_collection].update_one(
            {"product_id": product_id},
            {"$set": settings},
            upsert=True
        )
        
        return settings
    
    async def create_notification(self, alert: Dict[str, Any]) -> str:
        """Create an in-app notification for a price alert"""
        notification = {
            "notification_id": f"price_alert_{alert['product_id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "type": "price_alert",
            "title": "🔔 Competitor Price Alert",
            "message": f"{alert['competitor_domain']} is selling '{alert['product_name']}' for ₹{alert['competitor_price']:,.0f} (₹{alert['price_difference']:,.0f} cheaper than your price of ₹{alert['your_price']:,.0f})",
            "data": alert,
            "read": False,
            "store_name": alert.get("store_name"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db[self.notification_collection].insert_one(notification)
        logger.info(f"Created price alert notification for {alert['product_name']}")
        
        return notification["notification_id"]
    
    async def get_notifications(
        self,
        store_name: str = None,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get notifications for a store"""
        query = {}
        if store_name:
            query["store_name"] = store_name
        if unread_only:
            query["read"] = False
        
        notifications = await self.db[self.notification_collection].find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return notifications
    
    async def mark_notification_read(self, notification_id: str) -> bool:
        """Mark a notification as read"""
        result = await self.db[self.notification_collection].update_one(
            {"notification_id": notification_id},
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        return result.modified_count > 0
    
    async def mark_all_read(self, store_name: str = None) -> int:
        """Mark all notifications as read"""
        query = {"read": False}
        if store_name:
            query["store_name"] = store_name
        
        result = await self.db[self.notification_collection].update_many(
            query,
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        return result.modified_count
    
    async def get_unread_count(self, store_name: str = None) -> int:
        """Get count of unread notifications"""
        query = {"read": False}
        if store_name:
            query["store_name"] = store_name
        
        return await self.db[self.notification_collection].count_documents(query)
    
    async def send_email_alert(self, alert: Dict[str, Any], recipients: List[str]) -> bool:
        """Send email notification for price alert"""
        try:
            from services.email_service import email_service
            
            subject = f"🔔 Price Alert: {alert['product_name']}"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #e53e3e;">⚠️ Competitor Price Alert</h2>
                
                <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0;">{alert['product_name']}</h3>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #718096;">Your Price:</td>
                            <td style="padding: 8px 0; font-weight: bold;">₹{alert['your_price']:,.0f}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #718096;">Competitor Price:</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #e53e3e;">₹{alert['competitor_price']:,.0f}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #718096;">Difference:</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #e53e3e;">
                                ₹{alert['price_difference']:,.0f} ({alert['price_difference_percent']}% cheaper)
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #718096;">Competitor:</td>
                            <td style="padding: 8px 0;">
                                <a href="{alert.get('competitor_url', '#')}" style="color: #3182ce;">
                                    {alert['competitor_domain']}
                                </a>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <p style="color: #718096; font-size: 14px;">
                    Consider adjusting your pricing to stay competitive.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="color: #a0aec0; font-size: 12px;">
                    This alert was triggered at {alert['triggered_at'][:19].replace('T', ' ')} UTC
                </p>
            </div>
            """
            
            for recipient in recipients:
                await email_service.send_email(
                    to_email=recipient,
                    subject=subject,
                    html_content=html_content
                )
            
            logger.info(f"Sent price alert email to {len(recipients)} recipients")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send price alert email: {e}")
            return False


# Singleton instance
price_alert_service = PriceAlertService()
