"""
DTDC Tracking Service
Fetches real-time tracking data from DTDC API
"""
import logging
import requests
from typing import Dict, Optional
import os

logger = logging.getLogger(__name__)


class DTDCTrackingService:
    """Service for DTDC tracking API integration"""
    
    def __init__(self):
        # DTDC API configuration
        self.api_url = os.environ.get('DTDC_API_URL', 'https://shipsy.in/api/customer/integration/consignment/track')
        self.api_key = os.environ.get('DTDC_API_KEY', '8cea6c356df78fb8940a328ef6b6abad')
        
    def get_tracking_data(self, tracking_number: str) -> Dict:
        """
        Fetch tracking data from DTDC API
        
        Args:
            tracking_number: DTDC tracking/shipment number
            
        Returns:
            Dict with tracking data or error
        """
        try:
            # Make API call to DTDC (Shipsy API)
            headers = {
                'Content-Type': 'application/json',
                'api-key': self.api_key
            }
            
            payload = {
                'reference_number': tracking_number
            }
            
            response = requests.post(
                self.api_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('status') == 'OK':
                    return {
                        'success': True,
                        'tracking_data': self._parse_tracking_response(data)
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Tracking number not found'
                    }
            else:
                logger.error(f"DTDC API error: {response.status_code}")
                return {
                    'success': False,
                    'error': 'Unable to fetch tracking data'
                }
                
        except Exception as e:
            logger.error(f"Error fetching DTDC tracking: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _parse_tracking_response(self, data: Dict) -> Dict:
        """Parse DTDC API response into clean format"""
        try:
            tracking_data = data.get('data', {})
            header = tracking_data.get('header', {})
            milestones = tracking_data.get('milestones', [])
            statuses = tracking_data.get('statuses', [])
            
            # Parse current status
            current_status = {
                'code': header.get('currentStatusCode'),
                'description': header.get('currentStatusDescription'),
                'date': header.get('currentStatusDate'),
                'time': header.get('currentStatusTime'),
                'location': header.get('currentLocationCityName')
            }
            
            # Parse shipment details
            shipment_details = {
                'tracking_number': header.get('shipmentNo'),
                'reference_number': header.get('referenceNo'),
                'origin': {
                    'city': header.get('originCity'),
                    'pincode': header.get('originPincode')
                },
                'destination': {
                    'city': header.get('destinationCity'),
                    'pincode': header.get('destinationPincode')
                },
                'service_name': header.get('serviceName'),
                'booking_date': header.get('bookingDate'),
                'booking_time': header.get('bookingTime'),
                'receiver_name': header.get('receiverName'),
                'delivered_by': header.get('deliveredByName'),
                'expected_delivery': header.get('opsEdd'),
                'pieces': header.get('noOfPieces'),
                'shipment_type': header.get('shipmentType')
            }
            
            # Parse milestones (high-level tracking points)
            parsed_milestones = []
            for milestone in milestones:
                if milestone.get('mileStatus') == 'A':  # Active milestone
                    parsed_milestones.append({
                        'name': milestone.get('mileName'),
                        'location': milestone.get('mileLocationName'),
                        'datetime': milestone.get('mileStatusDateTime'),
                        'branch': milestone.get('branchName'),
                        'completed': True
                    })
            
            # Parse detailed statuses (all tracking events)
            parsed_statuses = []
            for status in statuses[:10]:  # Limit to last 10 events
                parsed_statuses.append({
                    'code': status.get('statusCode'),
                    'description': status.get('statusDescription'),
                    'timestamp': status.get('statusTimestamp'),
                    'location': status.get('actCityName'),
                    'branch': status.get('actBranchName'),
                    'remarks': status.get('remarks', '').replace('<a', '<span').replace('</a>', '</span>')  # Sanitize HTML
                })
            
            return {
                'current_status': current_status,
                'shipment_details': shipment_details,
                'milestones': parsed_milestones,
                'detailed_tracking': parsed_statuses,
                'is_delivered': current_status['code'] == 'DLV'
            }
            
        except Exception as e:
            logger.error(f"Error parsing DTDC response: {str(e)}")
            return {}


# Global instance
dtdc_service = DTDCTrackingService()
