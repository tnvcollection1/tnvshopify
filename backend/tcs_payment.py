"""
TCS Pakistan Payment/COD API Integration
Handles COD payment status tracking and reconciliation
"""
import requests
import logging
from typing import Dict, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class TCSPaymentAPI:
    """TCS Pakistan COD Payment API Client"""
    
    def __init__(self, bearer_token: str):
        """
        Initialize TCS Payment API client
        
        Args:
            bearer_token: TCS API bearer token
        """
        self.base_url = "https://ociconnect.tcscourier.com"
        self.bearer_token = bearer_token
        self.headers = {
            "Authorization": f"Bearer {bearer_token}",
            "Content-Type": "application/json"
        }
    
    def get_payment_status(self, consignment_number: str) -> Dict:
        """
        Get COD payment status for a consignment
        
        Args:
            consignment_number: TCS tracking/consignment number
            
        Returns:
            Dict with payment status information
        """
        try:
            url = f"{self.base_url}/ecom/payment/status"
            
            payload = {
                "consignmentNumber": consignment_number
            }
            
            logger.info(f"Fetching payment status for CN: {consignment_number}")
            
            response = requests.post(url, json=payload, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Parse payment status
                payment_info = self._parse_payment_status(data, consignment_number)
                return payment_info
            else:
                logger.error(f"Payment API error {response.status_code}: {response.text}")
                return {
                    "success": False,
                    "consignment_number": consignment_number,
                    "payment_status": "ERROR",
                    "error": f"API returned {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error fetching payment status for {consignment_number}: {str(e)}")
            return {
                "success": False,
                "consignment_number": consignment_number,
                "payment_status": "ERROR",
                "error": str(e)
            }
    
    def get_payment_detail(self, consignment_number: str) -> Dict:
        """
        Get detailed COD payment information
        
        Args:
            consignment_number: TCS tracking/consignment number
            
        Returns:
            Dict with detailed payment information
        """
        try:
            url = f"{self.base_url}/ecom/payment/detail"
            
            payload = {
                "consignmentNumber": consignment_number
            }
            
            logger.info(f"Fetching payment detail for CN: {consignment_number}")
            
            response = requests.post(url, json=payload, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Parse payment detail
                payment_detail = self._parse_payment_detail(data, consignment_number)
                return payment_detail
            else:
                logger.error(f"Payment Detail API error {response.status_code}: {response.text}")
                return {
                    "success": False,
                    "consignment_number": consignment_number,
                    "error": f"API returned {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Error fetching payment detail for {consignment_number}: {str(e)}")
            return {
                "success": False,
                "consignment_number": consignment_number,
                "error": str(e)
            }
    
    def _parse_payment_status(self, data: Dict, consignment_number: str) -> Dict:
        """Parse payment status response"""
        try:
            # Common TCS COD payment statuses:
            # - PENDING: Payment not yet collected
            # - COLLECTED: Payment collected by TCS
            # - REMITTED: Payment transferred to merchant
            # - HELD: Payment held (dispute/issue)
            # - REVERSED: Payment reversed (return)
            
            payment_status = data.get('paymentStatus', 'UNKNOWN')
            amount_collected = data.get('codAmount', 0.0)
            collection_date = data.get('collectionDate')
            remittance_date = data.get('remittanceDate')
            remittance_amount = data.get('remittanceAmount', 0.0)
            
            return {
                "success": True,
                "consignment_number": consignment_number,
                "payment_status": payment_status.upper(),
                "cod_amount": float(amount_collected) if amount_collected else 0.0,
                "collection_date": collection_date,
                "remittance_date": remittance_date,
                "remittance_amount": float(remittance_amount) if remittance_amount else 0.0,
                "normalized_status": self._normalize_payment_status(payment_status),
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error parsing payment status: {str(e)}")
            return {
                "success": False,
                "consignment_number": consignment_number,
                "payment_status": "ERROR",
                "error": str(e)
            }
    
    def _parse_payment_detail(self, data: Dict, consignment_number: str) -> Dict:
        """Parse payment detail response"""
        try:
            return {
                "success": True,
                "consignment_number": consignment_number,
                "cod_amount": data.get('codAmount', 0.0),
                "payment_status": data.get('paymentStatus', 'UNKNOWN').upper(),
                "collection_date": data.get('collectionDate'),
                "remittance_date": data.get('remittanceDate'),
                "remittance_amount": data.get('remittanceAmount', 0.0),
                "bank_account": data.get('bankAccount'),
                "cheque_number": data.get('chequeNumber'),
                "transaction_id": data.get('transactionId'),
                "remarks": data.get('remarks'),
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error parsing payment detail: {str(e)}")
            return {
                "success": False,
                "consignment_number": consignment_number,
                "error": str(e)
            }
    
    def _normalize_payment_status(self, status: str) -> str:
        """
        Normalize payment status to standard values
        
        Returns:
            PENDING, COLLECTED, REMITTED, HELD, REVERSED, UNKNOWN
        """
        status_upper = status.upper()
        
        if status_upper in ["PENDING", "NOT_COLLECTED", "AWAITING"]:
            return "PENDING"
        elif status_upper in ["COLLECTED", "RECEIVED"]:
            return "COLLECTED"
        elif status_upper in ["REMITTED", "PAID", "TRANSFERRED"]:
            return "REMITTED"
        elif status_upper in ["HELD", "ON_HOLD", "DISPUTED"]:
            return "HELD"
        elif status_upper in ["REVERSED", "REFUNDED", "RETURNED"]:
            return "REVERSED"
        else:
            return "UNKNOWN"
    
    def bulk_payment_status(self, consignment_numbers: List[str]) -> List[Dict]:
        """
        Get payment status for multiple consignments
        
        Args:
            consignment_numbers: List of tracking numbers
            
        Returns:
            List of payment status dictionaries
        """
        results = []
        
        for cn in consignment_numbers:
            try:
                status = self.get_payment_status(cn)
                results.append(status)
            except Exception as e:
                logger.error(f"Error processing {cn}: {str(e)}")
                results.append({
                    "success": False,
                    "consignment_number": cn,
                    "error": str(e)
                })
        
        return results
