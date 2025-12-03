"""
TCS COD Payment Status API Integration
Handles COD payment tracking and status updates
"""
import requests
import logging
from typing import Dict, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class TCSPaymentAPI:
    """TCS COD Payment Status API handler"""
    
    def __init__(self, bearer_token: str, customer_no: str = None):
        """
        Initialize TCS Payment API
        
        Args:
            bearer_token: TCS API bearer token
            customer_no: TCS customer account number
        """
        self.bearer_token = bearer_token
        self.customer_no = customer_no
        self.payment_url = "https://ociconnect.tcscourier.com/ecom/api/payment/status"
        
    def get_payment_status(self, consignment_no: str, shopify_total: float = 0, shopify_payment_status: str = 'pending', customer_no: str = None) -> Dict:
        """
        Get COD payment status for a consignment
        
        Args:
            consignment_no: TCS tracking/consignment number
            shopify_total: Order total from Shopify
            shopify_payment_status: Shopify payment status (pending/paid)
            customer_no: TCS customer number (optional, uses instance default)
            
        Returns:
            Payment status data with success flag
        """
        try:
            # Use provided customer_no or instance default
            cust_no = customer_no or self.customer_no
            if not cust_no:
                return {
                    'success': False,
                    'message': 'No customer number provided',
                    'consignment_no': consignment_no
                }
            
            # Call TCS payment status API for delivery charges
            params = {
                'customerno': cust_no,
                'cnno': consignment_no
            }
            
            headers = {
                'Authorization': f'Bearer {self.bearer_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(self.payment_url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('message') == 'SUCCESS' and data.get('detail'):
                    # Parse TCS data for delivery charges only
                    return self._parse_payment_data_new(data, consignment_no, shopify_total, shopify_payment_status)
                elif data.get('message') == 'Invalid CN':
                    # TCS doesn't have this CN - use Shopify data only
                    return self._create_shopify_based_payment(consignment_no, shopify_total, shopify_payment_status)
                else:
                    return {
                        'success': False,
                        'message': data.get('message', 'Unknown error'),
                        'consignment_no': consignment_no
                    }
            else:
                logger.error(f"TCS payment API error: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'message': f'HTTP {response.status_code}',
                    'consignment_no': consignment_no
                }
                
        except Exception as e:
            logger.error(f"TCS payment API exception for {consignment_no}: {str(e)}")
            return {
                'success': False,
                'message': str(e),
                'consignment_no': consignment_no
            }
    
    def _parse_payment_data_new(self, data: Dict, consignment_no: str, shopify_total: float, shopify_payment_status: str) -> Dict:
        """
        Parse TCS payment response with Shopify-first approach
        Updated to handle TCS payment reconciliation logic
        
        Args:
            data: Raw TCS payment API response
            consignment_no: Consignment number
            shopify_total: Order total from Shopify
            shopify_payment_status: Shopify payment status
            
        Returns:
            Parsed payment information based on Shopify + TCS delivery charges + reconciliation
        """
        detail = data.get('detail', {})
        
        # Handle both list and dict formats
        if isinstance(detail, list) and len(detail) > 0:
            detail = detail[0]
        elif not isinstance(detail, dict):
            detail = {}
        
        # Get delivery charges and TCS payment info
        delivery_charges = float(detail.get('delivery charges', 0))
        parcel_weight = detail.get('parcel weight', 0)
        booking_date = detail.get('booking date')
        delivery_date = detail.get('delivery date')
        payment_date = detail.get('payment date')
        city = detail.get('city')
        
        # TCS payment status (if available in API response)
        tcs_payment_status = detail.get('payment status', 'N')  # N = Not paid, Y = Paid
        
        # Use Shopify payment status as primary source for COD logic
        if shopify_payment_status == 'paid':
            # Customer already paid online - no COD collection
            normalized_status = 'PAID'
            cod_amount = 0.0
            paid_amount = shopify_total
            balance = 0.0
            remittance_amount = shopify_total  # Already received
            
        elif shopify_payment_status == 'pending':
            # Customer needs to pay (COD)
            if tcs_payment_status == 'Y' or payment_date:
                # TCS has collected payment - calculate net remittance
                normalized_status = 'COLLECTED'
                cod_amount = shopify_total
                paid_amount = shopify_total
                # Balance after TCS deducts delivery charges
                balance = max(0, shopify_total - delivery_charges)
                remittance_amount = balance  # Net amount to merchant
            else:
                # Payment still pending collection
                normalized_status = 'PENDING'
                cod_amount = shopify_total
                paid_amount = 0.0
                balance = shopify_total
                remittance_amount = 0.0
        else:
            # Unknown Shopify status
            normalized_status = 'UNKNOWN'
            cod_amount = shopify_total
            paid_amount = 0.0
            balance = shopify_total
            remittance_amount = 0.0
        
        return {
            'success': True,
            'consignment_no': consignment_no,
            'cod_amount': cod_amount,
            'paid_amount': paid_amount,
            'balance': balance,
            'delivery_charges': delivery_charges,
            'remittance_amount': remittance_amount,  # Net amount after TCS deducts charges
            'payment_date': payment_date,
            'booking_date': booking_date,
            'delivery_date': delivery_date,
            'collection_date': payment_date,
            'remittance_date': payment_date,
            'normalized_status': normalized_status,
            'payment_status': normalized_status,
            'city': city,
            'parcel_weight': parcel_weight,
            'tcs_payment_status': tcs_payment_status,
            'source': 'shopify_primary_tcs_reconciliation'
        }
    
    def _create_shopify_based_payment(self, consignment_no: str, shopify_total: float, shopify_payment_status: str) -> Dict:
        """
        Create payment data based purely on Shopify status (when TCS API doesn't have CN)
        
        Args:
            consignment_no: Consignment number
            shopify_total: Order total from Shopify
            shopify_payment_status: Shopify payment status
            
        Returns:
            Payment information based only on Shopify data
        """
        # Use Shopify payment status as primary source
        if shopify_payment_status == 'paid':
            normalized_status = 'PAID'
            cod_amount = 0.0
            paid_amount = shopify_total
            balance = 0.0
        elif shopify_payment_status == 'pending':
            normalized_status = 'PENDING'
            cod_amount = shopify_total
            paid_amount = 0.0
            balance = shopify_total
        else:
            normalized_status = 'UNKNOWN'
            cod_amount = shopify_total
            paid_amount = 0.0
            balance = shopify_total
        
        return {
            'success': True,
            'consignment_no': consignment_no,
            'cod_amount': cod_amount,
            'paid_amount': paid_amount,
            'balance': balance,
            'delivery_charges': 0.0,  # Unknown without TCS API
            'payment_date': None,
            'booking_date': None,
            'delivery_date': None,
            'collection_date': None,
            'remittance_date': None,
            'remittance_amount': paid_amount,
            'normalized_status': normalized_status,
            'payment_status': normalized_status,
            'city': None,
            'parcel_weight': 0,
            'source': 'shopify_only'
        }
        """
        Parse TCS payment response data
        
        Args:
            data: Raw TCS payment API response
            consignment_no: Consignment number
            
        Returns:
            Parsed payment information
        """
        detail = data.get('detail', {})
        
        # Handle both list and dict formats
        if isinstance(detail, list) and len(detail) > 0:
            detail = detail[0]
        elif not isinstance(detail, dict):
            detail = {}
        
        # Extract payment amounts
        cod_amount = float(detail.get('codamount', 0))
        paid_amount = float(detail.get('paidamount', detail.get('amount paid', 0)))
        balance = float(detail.get('balance', 0))
        delivery_charges = float(detail.get('delivery charges', 0))
        
        # Parse dates
        payment_date = detail.get('payment date', detail.get('paymentdate'))
        booking_date = detail.get('booking date')
        delivery_date = detail.get('delivery date')
        
        # Determine payment status
        if balance <= 0 and cod_amount > 0:
            normalized_status = 'PAID'
        elif paid_amount > 0:
            normalized_status = 'PARTIAL'
        elif cod_amount > 0:
            normalized_status = 'PENDING'
        else:
            normalized_status = 'N/A'
        
        return {
            'success': True,
            'consignment_no': consignment_no,
            'cod_amount': cod_amount,
            'paid_amount': paid_amount,
            'balance': balance,
            'delivery_charges': delivery_charges,
            'payment_date': payment_date,
            'booking_date': booking_date,
            'delivery_date': delivery_date,
            'collection_date': payment_date,  # Alias for compatibility
            'remittance_date': payment_date,  # TCS remits immediately after collection
            'remittance_amount': paid_amount,
            'normalized_status': normalized_status,
            'payment_status': normalized_status,
            'city': detail.get('city'),
            'order_no': detail.get('order no'),
            'parcel_weight': detail.get('parcel weight'),
            'raw_data': data
        }