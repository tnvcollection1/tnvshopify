"""
TCS Pakistan Courier Tracking Integration
Handles authentication and real-time delivery status tracking
"""
import requests
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class TCSTracker:
    def __init__(self, username: str, password: str, use_production: bool = True):
        """
        Initialize TCS Tracker
        
        Args:
            username: TCS account username
            password: TCS account password
            use_production: Use production API (True) or sandbox (False)
        """
        self.username = username
        self.password = password
        
        if use_production:
            self.auth_url = "https://ociconnect.tcscourier.com/ecom/api/authentication/token"
            self.tracking_url = "https://ociconnect.tcscourier.com/tracking/api/Tracking/GetDynamicTrackDetail"
        else:
            self.auth_url = "https://devconnect.tcscourier.com/ecom/api/authentication/token"
            self.tracking_url = "https://devconnect.tcscourier.com/tracking/api/Tracking/GetDynamicTrackDetail"
        
        self.access_token = None
        self.token_expiry = None
    
    def authenticate(self) -> bool:
        """
        Authenticate with TCS API and get access token
        
        Returns:
            True if authentication successful, False otherwise
        """
        try:
            payload = {
                "username": self.username,
                "password": self.password
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            
            response = requests.post(self.auth_url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get('accesstoken')
                expiry_str = data.get('expiry')
                
                if self.access_token:
                    # Parse expiry date
                    if expiry_str:
                        try:
                            self.token_expiry = datetime.fromisoformat(expiry_str.replace('Z', '+00:00'))
                        except:
                            # Token valid for 24 hours by default
                            self.token_expiry = datetime.now(timezone.utc) + timedelta(hours=24)
                    else:
                        self.token_expiry = datetime.now(timezone.utc) + timedelta(hours=24)
                    
                    logger.info(f"TCS authentication successful. Token expires at {self.token_expiry}")
                    return True
                else:
                    logger.error("TCS authentication failed: No access token in response")
                    return False
            else:
                logger.error(f"TCS authentication failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"TCS authentication error: {str(e)}")
            return False
    
    def is_token_valid(self) -> bool:
        """Check if current token is still valid"""
        if not self.access_token or not self.token_expiry:
            return False
        
        # Consider token expired 5 minutes before actual expiry
        return datetime.now(timezone.utc) < (self.token_expiry - timedelta(minutes=5))
    
    def ensure_authenticated(self) -> bool:
        """Ensure we have a valid token, refresh if needed"""
        if not self.is_token_valid():
            return self.authenticate()
        return True
    
    def track_consignment(self, tracking_number: str) -> Optional[Dict]:
        """
        Track a single consignment by tracking number
        
        Args:
            tracking_number: TCS consignment/tracking number
            
        Returns:
            Tracking data dictionary or None if failed
        """
        if not self.ensure_authenticated():
            logger.error("Cannot track: Authentication failed")
            return None
        
        try:
            payload = {
                "consignee": [tracking_number]
            }
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(self.tracking_url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('message') == 'SUCCESS':
                    return self._parse_tracking_response(data, tracking_number)
                else:
                    logger.warning(f"TCS tracking failed for {tracking_number}: {data.get('shipmentsummary')}")
                    return {
                        'tracking_number': tracking_number,
                        'status': 'NOT_FOUND',
                        'message': data.get('shipmentsummary', 'No data found')
                    }
            else:
                logger.error(f"TCS tracking API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"TCS tracking error for {tracking_number}: {str(e)}")
            return None
    
    def track_multiple(self, tracking_numbers: List[str]) -> Dict[str, Dict]:
        """
        Track multiple consignments
        
        Args:
            tracking_numbers: List of tracking numbers
            
        Returns:
            Dictionary mapping tracking number to tracking data
        """
        results = {}
        
        for tracking_number in tracking_numbers:
            result = self.track_consignment(tracking_number)
            if result:
                results[tracking_number] = result
        
        return results
    
    def _parse_tracking_response(self, data: Dict, tracking_number: str) -> Dict:
        """
        Parse TCS tracking response into standardized format
        
        Args:
            data: Raw TCS API response
            tracking_number: Tracking number
            
        Returns:
            Parsed tracking data
        """
        delivery_info = data.get('deliveryinfo', [])
        checkpoints = data.get('checkpoints', [])
        summary = data.get('shipmentsummary', '')
        
        # Get current status from latest delivery info
        current_status = 'UNKNOWN'
        status_code = None
        last_update = None
        receiver = None
        location = None
        
        if delivery_info and len(delivery_info) > 0:
            latest = delivery_info[0]
            current_status = latest.get('status', 'UNKNOWN')
            status_code = latest.get('code')
            last_update = latest.get('datetime')
            receiver = latest.get('recievedby')
            location = latest.get('station')
        
        # Map TCS status to our system status
        normalized_status = self._normalize_status(current_status)
        
        return {
            'tracking_number': tracking_number,
            'status': current_status,
            'normalized_status': normalized_status,
            'status_code': status_code,
            'last_update': last_update,
            'current_location': location,
            'receiver': receiver,
            'summary': summary,
            'checkpoints': checkpoints,
            'delivery_info': delivery_info,
            'is_delivered': normalized_status == 'DELIVERED'
        }
    
    def _normalize_status(self, tcs_status: str) -> str:
        """
        Normalize TCS status to standard status codes
        
        Args:
            tcs_status: Raw TCS status string
            
        Returns:
            Normalized status: DELIVERED, OUT_FOR_DELIVERY, IN_TRANSIT, PENDING, UNKNOWN
        """
        status_upper = tcs_status.upper()
        
        if 'DELIVERED' in status_upper:
            return 'DELIVERED'
        elif 'OUT FOR DELIVERY' in status_upper:
            return 'OUT_FOR_DELIVERY'
        elif 'ARRIVED' in status_upper or 'FACILITY' in status_upper:
            return 'IN_TRANSIT'
        elif 'AWAITING' in status_upper or 'COLLECTION' in status_upper:
            return 'AWAITING_COLLECTION'
        elif 'BOOKED' in status_upper or 'RECEIVED' in status_upper:
            return 'PENDING'
        else:
            return 'UNKNOWN'
