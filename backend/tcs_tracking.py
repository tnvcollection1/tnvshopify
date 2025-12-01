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
    def __init__(self, username: str = None, password: str = None, bearer_token: str = None, token_expiry: str = None, use_production: bool = True):
        """
        Initialize TCS Tracker
        
        Args:
            username: TCS account username (if using username/password auth)
            password: TCS account password (if using username/password auth)
            bearer_token: Pre-authenticated bearer token (preferred method)
            token_expiry: Token expiry date (ISO format or date string)
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
        
        # If bearer token provided, use it directly
        if bearer_token:
            self.access_token = bearer_token
            # Parse expiry date
            if token_expiry:
                try:
                    # Try parsing DD-MM-YYYY format
                    self.token_expiry = datetime.strptime(token_expiry, "%d-%m-%Y").replace(tzinfo=timezone.utc)
                except:
                    try:
                        # Try YYYY-MM-DD format
                        self.token_expiry = datetime.strptime(token_expiry, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    except:
                        try:
                            # Try ISO format
                            self.token_expiry = datetime.fromisoformat(token_expiry.replace('Z', '+00:00'))
                        except:
                            # Default to 1 year from now
                            self.token_expiry = datetime.now(timezone.utc) + timedelta(days=365)
            else:
                # No expiry provided, assume valid for 1 year
                self.token_expiry = datetime.now(timezone.utc) + timedelta(days=365)
            logger.info(f"TCS tracker initialized with bearer token. Expires: {self.token_expiry}")
        else:
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
            # TCS API expects GET with query parameter
            params = {
                "consignee": tracking_number
            }
            
            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }
            
            response = requests.get(self.tracking_url, params=params, headers=headers, timeout=10)
            
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
            Normalized status: DELIVERED, OUT_FOR_DELIVERY, IN_TRANSIT, RETURN_IN_PROCESS, RETURNED, PENDING, UNKNOWN
        """
        status_upper = tcs_status.upper()
        
        # Return statuses (check first as they may contain keywords from other statuses)
        # "Shipment Returned To Shipper" = RETURNED (item received back)
        if 'RETURNED TO SHIPPER' in status_upper or 'RETURN DELIVERED' in status_upper or 'RTO DELIVERED' in status_upper:
            return 'RETURNED'
        # "Shipment Returned To Origin" = RETURN_IN_PROCESS (returning but not yet received)
        elif 'RETURNED TO ORIGIN' in status_upper or 'RETURN TO ORIGIN' in status_upper or 'RETURN IN PROCESS' in status_upper:
            return 'RETURN_IN_PROCESS'
        # General return keyword (fallback)
        elif 'RTO' in status_upper or ('RETURN' in status_upper and 'DELIVERED' not in status_upper):
            return 'RETURN_IN_PROCESS'
        # Normal delivery statuses
        elif 'DELIVERED' in status_upper:
            return 'DELIVERED'
        elif 'OUT FOR DELIVERY' in status_upper:
            return 'OUT_FOR_DELIVERY'
        # Delivery attempt failures (still out for delivery)
        elif ('PREMISES CLOSED' in status_upper or 'CLOSED' in status_upper or 
              'NO ANSWER' in status_upper or 'NOT AVAILABLE' in status_upper or
              'ATTEMPT' in status_upper or 'RECIPIENT' in status_upper):
            return 'OUT_FOR_DELIVERY'
        # "Shipment Picked Up", "Arrived at TCS Facility", "Departed From TCS Facility" = IN_TRANSIT
        elif ('PICKED UP' in status_upper or 'PICKED' in status_upper or 
              'IN TRANSIT' in status_upper or 'ARRIVED' in status_upper or 
              'DEPARTED' in status_upper or 'FACILITY' in status_upper or 
              'ON THE WAY' in status_upper):
            return 'IN_TRANSIT'
        elif 'AWAITING' in status_upper or 'COLLECTION' in status_upper:
            return 'AWAITING_COLLECTION'
        elif 'BOOKED' in status_upper or 'RECEIVED' in status_upper:
            return 'PENDING'
        else:
            return 'UNKNOWN'
    
    def get_payment_status(self, customer_no: str, consignment_no: str) -> Optional[Dict]:
        """
        Get COD payment status for a specific consignment
        
        Args:
            customer_no: TCS customer account number
            consignment_no: TCS consignment/tracking number
            
        Returns:
            Payment status data or None if failed
        """
        if not self.ensure_authenticated():
            logger.error("Cannot get payment status: Authentication failed")
            return None
        
        try:
            # Payment Status API endpoint - uses GET method
            payment_url = self.auth_url.replace('/ecom/api/authentication/token', '/ecom/api/payment/status')
            
            # Correct parameter names: customerno and cnno (not consignmentno)
            params = {
                "customerno": customer_no,
                "cnno": consignment_no  # Use 'cnno' as per TCS API requirements
            }
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            # Use GET method (not POST)
            response = requests.get(payment_url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                # Check if it's a valid response with payment data
                if data.get('message') == 'SUCCESS' and data.get('detail'):
                    return self._parse_payment_response(data, consignment_no)
                elif data.get('message') == 'Invalid CN':
                    # No payment data available for this CN (might be prepaid or not settled)
                    logger.info(f"No COD payment data for {consignment_no} - might be prepaid or not settled")
                    return None
                else:
                    logger.warning(f"TCS payment API response: {data.get('message')}")
                    return None
            else:
                logger.error(f"TCS payment status API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"TCS payment status error for {consignment_no}: {str(e)}")
            return None
    
    def get_payment_details(self, customer_no: str, from_date: str, to_date: str) -> Optional[List[Dict]]:
        """
        Get detailed COD payment information for a date range
        
        Args:
            customer_no: TCS customer account number
            from_date: Start date (format: YYYY-MM-DD or timestamp)
            to_date: End date (format: YYYY-MM-DD or timestamp)
            
        Returns:
            List of payment detail records or None if failed
        """
        if not self.ensure_authenticated():
            logger.error("Cannot get payment details: Authentication failed")
            return None
        
        try:
            # Payment Detail API endpoint - might use GET or POST
            payment_url = self.auth_url.replace('/ecom/api/authentication/token', '/ecom/api/payment/detail')
            
            # Try with GET parameters first (consistent with payment status API)
            params = {
                "customerno": customer_no,
                "fromdate": from_date,
                "todate": to_date
            }
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            # Try GET method first
            response = requests.get(payment_url, params=params, headers=headers, timeout=10)
            
            # If GET doesn't work (405), try POST
            if response.status_code == 405:
                payload = {
                    "accesstoken": self.access_token,
                    "customerno": customer_no,
                    "fromdate": from_date,
                    "todate": to_date
                }
                response = requests.post(payment_url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('message') == 'SUCCESS':
                    return data.get('detail', [])
                else:
                    logger.warning(f"TCS payment details response: {data.get('message')}")
                    return []
            else:
                logger.error(f"TCS payment detail API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"TCS payment details error: {str(e)}")
            return None
    
    def _parse_payment_response(self, data: Dict, consignment_no: str) -> Dict:
        """
        Parse TCS payment status response
        
        Args:
            data: Raw TCS payment API response
            consignment_no: Consignment number
            
        Returns:
            Parsed payment data
        """
        # Parse based on documentation structure
        payment_info = {
            'consignment_no': consignment_no,
            'payment_status': 'UNKNOWN',
            'cod_amount': 0,
            'paid_amount': 0,
            'balance': 0,
            'payment_date': None,
            'raw_data': data
        }
        
        # Extract payment information from response
        if data.get('message') == 'SUCCESS':
            detail = data.get('detail', {})
            payment_info['cod_amount'] = detail.get('codamount', 0)
            payment_info['paid_amount'] = detail.get('paidamount', 0)
            payment_info['balance'] = detail.get('balance', 0)
            payment_info['payment_date'] = detail.get('paymentdate')
            
            # Determine payment status
            if payment_info['balance'] <= 0:
                payment_info['payment_status'] = 'PAID'
            elif payment_info['paid_amount'] > 0:
                payment_info['payment_status'] = 'PARTIAL'
            else:
                payment_info['payment_status'] = 'PENDING'
        
        return payment_info
