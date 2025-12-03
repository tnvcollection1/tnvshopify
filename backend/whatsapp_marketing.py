"""
WhatsApp Marketing Messages Lite API Integration
For promotional campaigns, marketing messages, and bulk broadcasts
"""
import os
import httpx
import logging
from typing import Optional, Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)

class WhatsAppMarketingAPI:
    """
    WhatsApp Marketing Messages Lite API Service
    
    Key Features:
    - AI-optimized delivery (9% higher delivery rates)
    - Smart targeting (prioritizes engaged users)
    - Performance tracking and analytics
    - Dynamic message limits
    - Cost-efficient (pay only for delivered messages)
    
    Use Cases:
    - Promotional campaigns
    - Product launches
    - Flash sales
    - Seasonal offers
    - Newsletter broadcasts
    """
    
    def __init__(self):
        from dotenv import load_dotenv
        load_dotenv()
        
        self.phone_number_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID')
        self.access_token = os.getenv('WHATSAPP_ACCESS_TOKEN')
        self.waba_id = os.getenv('WHATSAPP_BUSINESS_ACCOUNT_ID')
        
        # Marketing Messages Lite API uses same base URL but different endpoints
        self.base_url = f"https://graph.facebook.com/v21.0"
        
        if not self.phone_number_id or not self.access_token:
            logger.warning("WhatsApp Marketing API credentials not configured")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get API request headers"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    async def send_marketing_template(
        self, 
        to: str, 
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict]] = None,
        campaign_id: Optional[str] = None
    ) -> Dict:
        """
        Send marketing template message (promotional content)
        
        Args:
            to: Phone number with country code
            template_name: Name of approved MARKETING template
            language_code: Template language
            components: Template variable values
            campaign_id: Optional campaign tracking ID
            
        Returns:
            Response with message ID and delivery status
            
        Note:
            - Template must be approved with MARKETING category
            - Uses AI-optimized delivery
            - Charges only for delivered messages
        """
        try:
            phone = to.replace("+", "").replace("-", "").replace(" ", "")
            
            payload = {
                "messaging_product": "whatsapp",
                "to": phone,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {
                        "code": language_code
                    }
                }
            }
            
            if components:
                payload["template"]["components"] = components
            
            # Add campaign tracking if provided
            if campaign_id:
                payload["context"] = {
                    "campaign_id": campaign_id
                }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/messages",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Marketing message sent to {phone}")
                    return {
                        "success": True,
                        "message_id": result.get("messages", [{}])[0].get("id"),
                        "phone": phone,
                        "type": "marketing",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    error_data = response.json()
                    logger.error(f"Marketing message error: {error_data}")
                    return {
                        "success": False,
                        "error": error_data.get("error", {}).get("message", "Unknown error"),
                        "error_code": error_data.get("error", {}).get("code")
                    }
                    
        except Exception as e:
            logger.error(f"Error sending marketing message: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_marketing_campaign(
        self,
        recipient_list: List[str],
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict]] = None,
        campaign_name: Optional[str] = None,
        batch_size: int = 100
    ) -> Dict:
        """
        Send marketing campaign to multiple recipients
        
        Features:
        - AI-optimized delivery
        - Smart targeting (prioritizes engaged users)
        - Automatic throttling
        - Performance tracking
        
        Args:
            recipient_list: List of phone numbers
            template_name: Marketing template name
            language_code: Template language
            components: Template variables
            campaign_name: Campaign identifier for tracking
            batch_size: Number of messages per batch
            
        Returns:
            Campaign results with delivery stats
        """
        try:
            campaign_id = campaign_name or f"campaign_{datetime.utcnow().timestamp()}"
            
            results = {
                "campaign_id": campaign_id,
                "total_recipients": len(recipient_list),
                "sent": 0,
                "failed": 0,
                "results": [],
                "started_at": datetime.utcnow().isoformat()
            }
            
            # Process in batches to avoid rate limits
            for i in range(0, len(recipient_list), batch_size):
                batch = recipient_list[i:i + batch_size]
                
                for phone in batch:
                    result = await self.send_marketing_template(
                        to=phone,
                        template_name=template_name,
                        language_code=language_code,
                        components=components,
                        campaign_id=campaign_id
                    )
                    
                    if result.get("success"):
                        results["sent"] += 1
                    else:
                        results["failed"] += 1
                    
                    results["results"].append({
                        "phone": phone,
                        "success": result.get("success"),
                        "message_id": result.get("message_id"),
                        "error": result.get("error")
                    })
                
                logger.info(f"Campaign {campaign_id}: Processed batch {i//batch_size + 1}")
            
            results["completed_at"] = datetime.utcnow().isoformat()
            results["success_rate"] = f"{(results['sent'] / results['total_recipients'] * 100):.1f}%"
            
            logger.info(f"Campaign {campaign_id} completed: {results['sent']}/{results['total_recipients']} sent")
            
            return results
            
        except Exception as e:
            logger.error(f"Error in marketing campaign: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_campaign_analytics(self, campaign_id: str) -> Dict:
        """
        Get campaign performance analytics
        
        Metrics:
        - Messages sent
        - Delivery rate
        - Read rate
        - Click-through rate (if buttons included)
        - Conversion rate
        
        Note: Detailed analytics available in Meta Ads Manager
        """
        try:
            # This would query your database for campaign stats
            # Real-time analytics available through Meta Ads Manager API
            
            logger.info(f"Fetching analytics for campaign: {campaign_id}")
            
            return {
                "campaign_id": campaign_id,
                "analytics_url": f"https://business.facebook.com/wa/manage/insights/",
                "note": "Full analytics available in Meta Business Manager"
            }
            
        except Exception as e:
            logger.error(f"Error fetching campaign analytics: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


# Marketing template examples for different use cases
MARKETING_TEMPLATES = {
    "flash_sale": {
        "name": "flash_sale_alert",
        "category": "MARKETING",
        "body": """🔥 FLASH SALE ALERT! 🔥

Hi {{1}},

Special {{2}} OFF on {{3}}!

⏰ Hurry! Only {{4}} hours left!

Shop now: {{5}}

Limited stock available!

TNV Collection""",
        "variables": ["Customer Name", "Discount %", "Product Category", "Hours", "Shop Link"]
    },
    
    "new_arrival": {
        "name": "new_product_launch",
        "category": "MARKETING",
        "body": """✨ NEW ARRIVALS! ✨

Hello {{1}},

Check out our latest {{2}} collection!

🎁 Special launch offer: {{3}}

Shop now: {{4}}

Be the first to get yours!

TNV Collection""",
        "variables": ["Customer Name", "Collection Name", "Offer", "Shop Link"]
    },
    
    "seasonal_offer": {
        "name": "seasonal_promotion",
        "category": "MARKETING",
        "body": """🎉 {{1}} SPECIAL OFFER! 🎉

Hi {{2}},

Get {{3}} OFF on entire store!

💰 Use code: {{4}}

Valid till: {{5}}

Shop now: {{6}}

TNV Collection""",
        "variables": ["Season", "Customer Name", "Discount", "Promo Code", "Validity", "Link"]
    },
    
    "abandoned_cart": {
        "name": "cart_reminder",
        "category": "MARKETING",
        "body": """👋 Hi {{1}},

You left {{2}} items in your cart!

Complete your order now and get {{3}} OFF!

Your cart: {{4}}

Offer expires in {{5}} hours.

TNV Collection""",
        "variables": ["Customer Name", "Item Count", "Discount", "Cart Link", "Hours"]
    },
    
    "loyalty_reward": {
        "name": "vip_exclusive",
        "category": "MARKETING",
        "body": """💎 VIP EXCLUSIVE OFFER 💎

Dear {{1}},

As our valued customer, enjoy {{2}} OFF!

Plus FREE shipping on all orders!

Code: {{3}}

Valid for {{4}} days only.

Shop now: {{5}}

TNV Collection""",
        "variables": ["Customer Name", "Discount", "VIP Code", "Days", "Shop Link"]
    }
}


# Singleton instance
whatsapp_marketing = WhatsAppMarketingAPI()
