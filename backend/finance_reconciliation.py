"""
Finance Reconciliation Module
Handles reconciliation of Shopify orders with purchase records and bank transactions
"""
import logging
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime, timezone
import io

logger = logging.getLogger(__name__)


class FinanceReconciliation:
    """Handle finance reconciliation for orders"""
    
    def __init__(self, db):
        self.db = db
    
    async def parse_general_ledger(self, file_content: bytes) -> Dict:
        """
        Parse the general ledger Excel file (ASMIA GERNAL ENTRY SHEET.xlsx)
        Returns dict with order_number as key
        """
        try:
            # Read Excel file - header is at row 3 (index 3)
            df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl', header=3)
            
            logger.info(f"📊 Loaded general ledger with {len(df)} rows")
            logger.info(f"Columns: {list(df.columns)}")
            
            # Map to standardized structure
            ledger_data = {}
            
            for idx, row in df.iterrows():
                # Extract Shopify order number (might be in different columns)
                order_number = None
                for col in ['Shopify Order Number', 'shopify order number', 'Order Number', 'order number']:
                    if col in df.columns:
                        order_number = str(row.get(col, '')).strip()
                        if order_number and order_number != 'nan':
                            break
                
                if not order_number or order_number == 'nan':
                    continue
                
                # Extract relevant fields
                ledger_data[order_number] = {
                    'order_number': order_number,
                    'date': str(row.get('Date', '')),
                    'description': str(row.get('Description', '')),
                    'debit': self._safe_float(row.get('Debit', 0)),
                    'credit': self._safe_float(row.get('Credit', 0)),
                    'sale_price': self._safe_float(row.get('Sale Price INR', 0)),
                    'order_status': str(row.get('Order status', row.get('order status', ''))),
                    'payment_status': str(row.get('payment stauts', row.get('payment status', ''))),
                    'payment_mode': str(row.get('payment mode', '')),
                    'tracking_number': str(row.get('Dtdc Tracking Number', row.get('tracking number', ''))),
                    'delivered': str(row.get('Delivered', '')),
                    'received_from_dtdc': self._safe_float(row.get('RECEIVED AMONT FROM DTDC', 0)),
                    'received_in_bank': self._safe_float(row.get('RECEIVED AMOUNT IN BANK', 0)),
                    'purchase_vendor': str(row.get('Purchase - Vanguard Textile Pvt', '')),
                    'in_stock': str(row.get('In stock', '')),
                    'pending': str(row.get('Pending', '')),
                }
            
            logger.info(f"✅ Parsed {len(ledger_data)} orders from general ledger")
            return {
                'success': True,
                'data': ledger_data,
                'total_records': len(ledger_data)
            }
            
        except Exception as e:
            logger.error(f"❌ Error parsing general ledger: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def parse_bank_transactions(self, file_content: bytes) -> Dict:
        """
        Parse bank transaction Excel file (Asmia and TNV Collection - Imran Abbas account check H.xlsx)
        Returns list of transactions
        """
        try:
            # Read Excel file
            df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
            
            logger.info(f"📊 Loaded bank transactions with {len(df)} rows")
            logger.info(f"Columns: {list(df.columns)}")
            
            transactions = []
            
            for idx, row in df.iterrows():
                transaction = {
                    'date': str(row.get('Date', '')),
                    'description': str(row.get('Description', '')),
                    'payment_mode': str(row.get('Mode', row.get('Mode Of Payment', ''))),
                    'debit': self._safe_float(row.get('Debit', 0)),
                    'credit': self._safe_float(row.get('Credit', row.get('Unnamed: 5', 0))),
                    'correction': str(row.get('CORRECTION', '')),
                    'check': str(row.get('Check', row.get('Unnamed: 7', ''))),
                }
                
                # Only include rows with meaningful data
                if transaction['debit'] > 0 or transaction['credit'] > 0 or transaction['description'] not in ['', 'nan']:
                    transactions.append(transaction)
            
            logger.info(f"✅ Parsed {len(transactions)} bank transactions")
            return {
                'success': True,
                'data': transactions,
                'total_records': len(transactions)
            }
            
        except Exception as e:
            logger.error(f"❌ Error parsing bank transactions: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def upload_ledger_data(self, ledger_data: Dict) -> Dict:
        """
        Upload parsed ledger data to MongoDB
        """
        try:
            records = []
            for order_num, data in ledger_data.items():
                record = {
                    **data,
                    'uploaded_at': datetime.now(timezone.utc).isoformat()
                }
                records.append(record)
            
            if records:
                # Clear existing data
                await self.db.finance_ledger.delete_many({})
                
                # Insert new data
                await self.db.finance_ledger.insert_many(records)
                
                logger.info(f"✅ Uploaded {len(records)} ledger records to database")
            
            return {
                'success': True,
                'uploaded_count': len(records)
            }
            
        except Exception as e:
            logger.error(f"❌ Error uploading ledger data: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def upload_transaction_data(self, transactions: List[Dict]) -> Dict:
        """
        Upload parsed transaction data to MongoDB
        """
        try:
            if transactions:
                # Clear existing data
                await self.db.finance_transactions.delete_many({})
                
                # Add metadata
                for trans in transactions:
                    trans['uploaded_at'] = datetime.now(timezone.utc).isoformat()
                
                # Insert new data
                await self.db.finance_transactions.insert_many(transactions)
                
                logger.info(f"✅ Uploaded {len(transactions)} bank transactions to database")
            
            return {
                'success': True,
                'uploaded_count': len(transactions)
            }
            
        except Exception as e:
            logger.error(f"❌ Error uploading transactions: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def reconcile_orders(self, store_name: str = 'ashmiaa') -> Dict:
        """
        Reconcile Shopify orders with ledger and transactions
        Returns reconciliation report
        """
        try:
            logger.info(f"🔍 Starting reconciliation for store: {store_name}")
            
            # Get Shopify orders from customers collection
            shopify_orders = await self.db.customers.find(
                {'store_name': store_name},
                {'_id': 0, 'order_number': 1, 'fulfillment_status': 1, 
                 'delivery_status': 1, 'tracking_number': 1, 'payment_status': 1,
                 'total_spent': 1, 'first_name': 1, 'last_name': 1}
            ).to_list(10000)
            
            # Get ledger data
            ledger_records = await self.db.finance_ledger.find(
                {}, {'_id': 0}
            ).to_list(10000)
            
            # Create lookup dict
            ledger_lookup = {rec['order_number']: rec for rec in ledger_records}
            
            # Reconcile each order
            reconciled = []
            
            for order in shopify_orders:
                order_num = order.get('order_number', '')
                
                # Get ledger data
                ledger_data = ledger_lookup.get(order_num, {})
                
                # Determine reconciliation status
                status = self._determine_status(order, ledger_data)
                
                reconciled.append({
                    'order_number': order_num,
                    'customer_name': f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                    'shopify_status': order.get('fulfillment_status', 'N/A'),
                    'delivery_status': order.get('delivery_status', 'N/A'),
                    'tracking_number': order.get('tracking_number', 'N/A'),
                    'ledger_status': ledger_data.get('order_status', 'Not Found'),
                    'payment_status': ledger_data.get('payment_status', 'Not Found'),
                    'amount': order.get('total_spent', 0),
                    'received_from_dtdc': ledger_data.get('received_from_dtdc', 0),
                    'received_in_bank': ledger_data.get('received_in_bank', 0),
                    'purchase_status': ledger_data.get('purchase_vendor', 'Not Found'),
                    'reconciliation_status': status,
                    'ledger_exists': bool(ledger_data),
                })
            
            logger.info(f"✅ Reconciled {len(reconciled)} orders")
            
            # Calculate summary
            summary = {
                'total_orders': len(reconciled),
                'fully_reconciled': sum(1 for r in reconciled if r['reconciliation_status'] == 'Complete'),
                'partial_reconciled': sum(1 for r in reconciled if r['reconciliation_status'] == 'Partial'),
                'not_reconciled': sum(1 for r in reconciled if r['reconciliation_status'] == 'Missing Data'),
            }
            
            return {
                'success': True,
                'orders': reconciled,
                'summary': summary
            }
            
        except Exception as e:
            logger.error(f"❌ Error reconciling orders: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _determine_status(self, shopify_order: Dict, ledger_data: Dict) -> str:
        """Determine reconciliation status"""
        if not ledger_data:
            return 'Missing Data'
        
        # Check if all key fields are present
        has_delivery = shopify_order.get('delivery_status') not in [None, '', 'N/A']
        has_ledger = bool(ledger_data.get('order_status'))
        has_payment = bool(ledger_data.get('payment_status'))
        
        if has_delivery and has_ledger and has_payment:
            return 'Complete'
        elif has_ledger:
            return 'Partial'
        else:
            return 'Missing Data'
    
    def _safe_float(self, value) -> float:
        """Safely convert value to float"""
        try:
            if pd.isna(value):
                return 0.0
            return float(value)
        except (ValueError, TypeError):
            return 0.0


# Global instance
finance_reconciliation = None

def get_finance_reconciliation(db):
    """Get or create finance reconciliation instance"""
    global finance_reconciliation
    if finance_reconciliation is None:
        finance_reconciliation = FinanceReconciliation(db)
    return finance_reconciliation
