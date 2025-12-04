"""
DTDC India Tracking Integration
Similar to TCS tracking for Pakistan
"""

import aiohttp
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class DTDCTracking:
    """DTDC India courier tracking integration"""
    
    def __init__(self, username: str, password: str, api_url: str = "https://customer.dtdc.in/api"):
        self.username = username
        self.password = password
        self.api_url = api_url.rstrip('/')
        self.session_token = None
    
    async def login(self) -> bool:
        """Authenticate with DTDC API"""
        try:
            async with aiohttp.ClientSession() as session:
                login_url = f"{self.api_url}/login"
                
                payload = {
                    "username": self.username,
                    "password": self.password
                }
                
                async with session.post(login_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.session_token = data.get('token') or data.get('access_token')
                        logger.info("✅ DTDC authentication successful")
                        return True
                    else:
                        logger.error(f"DTDC login failed: {response.status}")
                        return False
        
        except Exception as e:
            logger.error(f"DTDC login error: {str(e)}")
            return False
    
    async def track_shipment(self, tracking_number: str) -> Optional[Dict]:
        """
        Track a single shipment by tracking number
        Returns delivery status info
        """
        if not self.session_token:
            await self.login()
        
        if not self.session_token:
            return None
        
        try:
            async with aiohttp.ClientSession() as session:
                track_url = f"{self.api_url}/track"
                
                headers = {
                    "Authorization": f"Bearer {self.session_token}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "tracking_number": tracking_number
                }
                
                async with session.post(track_url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_tracking_response(data)
                    elif response.status == 401:
                        # Token expired, re-login
                        await self.login()
                        return await self.track_shipment(tracking_number)
                    else:
                        logger.warning(f"DTDC tracking failed for {tracking_number}: {response.status}")
                        return None
        
        except Exception as e:
            logger.error(f"DTDC tracking error for {tracking_number}: {str(e)}")
            return None
    
    def _parse_tracking_response(self, data: Dict) -> Dict:
        """Parse DTDC API response to standard format"""
        # Map DTDC statuses to our standard statuses
        status_map = {
            'delivered': 'DELIVERED',
            'in_transit': 'IN_TRANSIT',
            'out_for_delivery': 'OUT_FOR_DELIVERY',
            'picked_up': 'IN_TRANSIT',
            'pending': 'PENDING',
            'returned': 'RETURNED',
            'cancelled': 'CANCELLED'
        }
        
        dtdc_status = data.get('status', '').lower()
        delivery_status = status_map.get(dtdc_status, 'UNKNOWN')
        
        return {
            'tracking_number': data.get('tracking_number') or data.get('awb_number'),
            'delivery_status': delivery_status,
            'current_location': data.get('current_location') or data.get('location'),
            'delivery_date': data.get('delivery_date') or data.get('delivered_date'),
            'remarks': data.get('remarks') or data.get('status_message'),
            'raw_data': data
        }
    
    async def track_multiple(self, tracking_numbers: List[str]) -> Dict[str, Dict]:
        """
        Track multiple shipments at once
        Returns dict with tracking_number as key
        """
        results = {}
        
        for tracking_num in tracking_numbers:
            tracking_info = await self.track_shipment(tracking_num)
            if tracking_info:
                results[tracking_num] = tracking_info
        
        return results


async def get_dtdc_credentials(db, store_name: str = "ashmiaa") -> Optional[Dict]:
    """Get DTDC credentials from database"""
    config = await db.courier_config.find_one({
        "service": "dtdc_india",
        "store_name": store_name
    })
    
    if config:
        return {
            "username": config.get("username"),
            "password": config.get("password"),
            "api_url": config.get("api_url", "https://customer.dtdc.in/api")
        }
    
    return None
