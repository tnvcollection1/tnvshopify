"""
Finance Reconciliation Module
Handles reconciliation of Shopify orders with purchase records and bank transactions
"""
import logging
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime, timezone
import io
import uuid

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
    
    async def upload_ledger_data(self, ledger_data: Dict, file_name: str = 'ledger.xlsx') -> Dict:
        """
        Upload parsed ledger data to MongoDB
        """
        try:
            # Save snapshot before clearing
            snapshot_id = await self.save_upload_snapshot('ledger', file_name, len(ledger_data))
            
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
                'uploaded_count': len(records),
                'snapshot_id': snapshot_id
            }
            
        except Exception as e:
            logger.error(f"❌ Error uploading ledger data: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def upload_transaction_data(self, transactions: List[Dict], file_name: str = 'transactions.xlsx') -> Dict:
        """
        Upload parsed transaction data to MongoDB
        """
        try:
            # Save snapshot before clearing
            snapshot_id = await self.save_upload_snapshot('transactions', file_name, len(transactions))
            
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
                'uploaded_count': len(transactions),
                'snapshot_id': snapshot_id
            }
            
        except Exception as e:
            logger.error(f"❌ Error uploading transactions: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def match_transactions_to_orders(self, store_name: str = 'ashmiaa') -> Dict:
        """
        Automatically match bank transactions to orders based on amount and date proximity
        ONLY for the specified store (ashmia)
        """
        try:
            logger.info(f"🔗 Starting automatic transaction matching for {store_name}...")
            
            # Get Shopify orders for this store to validate order numbers
            shopify_orders = await self.db.customers.find(
                {'store_name': store_name},
                {'_id': 0, 'order_number': 1}
            ).to_list(10000)
            
            valid_order_numbers = set(order.get('order_number') for order in shopify_orders)
            
            # Get ledger records ONLY for orders that exist in Shopify for this store
            ledger_records = await self.db.finance_ledger.find(
                {'sale_price': {'$gt': 0}},
                {'_id': 0}
            ).to_list(10000)
            
            # Filter to only valid order numbers for this store
            ledger_records = [l for l in ledger_records if l.get('order_number') in valid_order_numbers]
            
            # Get all transactions
            transactions = await self.db.finance_transactions.find(
                {},
                {'_id': 0}
            ).to_list(10000)
            
            matched_count = 0
            
            for ledger in ledger_records:
                order_num = ledger.get('order_number')
                amount = ledger.get('sale_price', 0)
                ledger_date = ledger.get('date', '')
                
                # Find matching transactions (within 10% of amount)
                matches = []
                for trans in transactions:
                    trans_amount = trans.get('credit', 0) or trans.get('debit', 0)
                    if trans_amount == 0:
                        continue
                    
                    # Check if amounts are close (within 10%)
                    diff = abs(amount - trans_amount) / amount if amount > 0 else 1
                    if diff <= 0.1:  # Within 10%
                        matches.append({
                            'transaction': trans,
                            'difference': diff,
                            'amount': trans_amount
                        })
                
                # Update ledger with matched transactions
                if matches:
                    best_match = min(matches, key=lambda x: x['difference'])
                    await self.db.finance_ledger.update_one(
                        {'order_number': order_num},
                        {'$set': {
                            'matched_transaction': best_match['transaction'],
                            'transaction_amount': best_match['amount'],
                            'match_confidence': 1 - best_match['difference']
                        }}
                    )
                    matched_count += 1
            
            logger.info(f"✅ Matched {matched_count} {store_name} orders to transactions")
            
            return {
                'success': True,
                'matched_count': matched_count,
                'total_ledger_records': len(ledger_records),
                'store_name': store_name
            }
            
        except Exception as e:
            logger.error(f"❌ Error matching transactions: {str(e)}")
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
            
            # Get verification status
            verifications = await self.db.finance_verifications.find(
                {}, {'_id': 0}
            ).to_list(10000)
            verification_lookup = {v['order_number']: v for v in verifications}
            
            # Create lookup dict
            ledger_lookup = {rec['order_number']: rec for rec in ledger_records}
            
            # Reconcile each order
            reconciled = []
            
            for order in shopify_orders:
                order_num = order.get('order_number', '')
                
                # Get ledger data
                ledger_data = ledger_lookup.get(order_num, {})
                
                # Get verification status
                verification = verification_lookup.get(order_num, {})
                
                # Strict validation: Check Order#, SKU, and Tracking number match
                validation_errors = []
                
                # 1. Order number already matched (ledger_data exists)
                
                # 2. Check SKU match (if available)
                shopify_skus = order.get('order_skus', [])  # List of SKUs from Shopify
                ledger_sku = ledger_data.get('sku', '') if ledger_data else ''
                sku_match = False
                
                if ledger_data and ledger_sku:
                    # Check if ledger SKU exists in Shopify order SKUs
                    sku_match = ledger_sku in shopify_skus if shopify_skus else False
                    if not sku_match and shopify_skus:
                        validation_errors.append(f"SKU mismatch: Excel has '{ledger_sku}', Shopify has {shopify_skus}")
                
                # 3. Check tracking number match (MANDATORY)
                shopify_tracking = order.get('tracking_number', '')
                ledger_tracking = ledger_data.get('tracking_number', '') if ledger_data else ''
                tracking_match = False
                
                if ledger_data:
                    if shopify_tracking and ledger_tracking:
                        # Both have tracking - compare (remove spaces, case insensitive)
                        tracking_match = shopify_tracking.replace(' ', '').upper() == ledger_tracking.replace(' ', '').upper()
                        if not tracking_match:
                            validation_errors.append(f"Tracking mismatch: Shopify '{shopify_tracking}' ≠ Excel '{ledger_tracking}'")
                    elif not ledger_tracking:
                        validation_errors.append(f"Tracking missing in Excel")
                    elif not shopify_tracking:
                        validation_errors.append(f"Tracking missing in Shopify")
                
                # Get matched transaction details
                matched_transaction = ledger_data.get('matched_transaction', {})
                
                # Determine reconciliation status with validation errors
                status = self._determine_status(order, ledger_data, verification, validation_errors)
                
                reconciled.append({
                    'order_number': order_num,
                    'customer_name': f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                    'shopify_status': order.get('fulfillment_status', 'N/A'),
                    'delivery_status': order.get('delivery_status', 'N/A'),
                    'tracking_number': order.get('tracking_number', 'N/A'),
                    'shopify_skus': shopify_skus,
                    'ledger_sku': ledger_sku,
                    'sku_match': sku_match,
                    'ledger_status': ledger_data.get('order_status', 'Not Found'),
                    'payment_status': ledger_data.get('payment_status', 'Not Found'),
                    'amount': order.get('total_spent', 0),
                    'received_from_dtdc': ledger_data.get('received_from_dtdc', 0),
                    'received_in_bank': ledger_data.get('received_in_bank', 0),
                    'purchase_status': ledger_data.get('purchase_vendor', 'Not Found'),
                    'transaction_matched': bool(matched_transaction),
                    'transaction_amount': ledger_data.get('transaction_amount', 0),
                    'match_confidence': ledger_data.get('match_confidence', 0),
                    'matched_transaction_details': {
                        'date': matched_transaction.get('date', '') if matched_transaction else '',
                        'description': matched_transaction.get('description', '') if matched_transaction else '',
                        'payment_mode': matched_transaction.get('payment_mode', '') if matched_transaction else '',
                        'debit': matched_transaction.get('debit', 0) if matched_transaction else 0,
                        'credit': matched_transaction.get('credit', 0) if matched_transaction else 0,
                    },
                    'tracking_match': tracking_match,
                    'ledger_tracking': ledger_tracking,
                    'validation_errors': validation_errors,
                    'has_errors': len(validation_errors) > 0,
                    'reconciliation_status': status,
                    'ledger_exists': bool(ledger_data),
                    'verified': verification.get('verified', False),
                    'verified_by': verification.get('verified_by', ''),
                    'verified_at': verification.get('verified_at', ''),
                    'notes': verification.get('notes', ''),
                })
            
            logger.info(f"✅ Reconciled {len(reconciled)} orders")
            
            # Calculate summary
            summary = {
                'total_orders': len(reconciled),
                'fully_reconciled': sum(1 for r in reconciled if r['reconciliation_status'] == 'Complete'),
                'partial_reconciled': sum(1 for r in reconciled if r['reconciliation_status'] == 'Partial'),
                'not_reconciled': sum(1 for r in reconciled if r['reconciliation_status'] == 'Missing Data'),
                'errors': sum(1 for r in reconciled if r['reconciliation_status'] == 'Error'),
                'verified': sum(1 for r in reconciled if r['verified']),
                'transaction_matched': sum(1 for r in reconciled if r['transaction_matched']),
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
    
    async def mark_order_verified(self, order_number: str, verified_by: str, notes: str = '') -> Dict:
        """
        Mark an order as verified after manual review
        """
        try:
            verification = {
                'order_number': order_number,
                'verified': True,
                'verified_by': verified_by,
                'verified_at': datetime.now(timezone.utc).isoformat(),
                'notes': notes
            }
            
            await self.db.finance_verifications.update_one(
                {'order_number': order_number},
                {'$set': verification},
                upsert=True
            )
            
            logger.info(f"✅ Marked order {order_number} as verified by {verified_by}")
            
            return {
                'success': True,
                'message': f'Order {order_number} marked as verified'
            }
            
        except Exception as e:
            logger.error(f"❌ Error marking order verified: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def save_upload_snapshot(self, upload_type: str, file_name: str, record_count: int) -> str:
        """
        Save a snapshot of uploaded data for rollback capability
        """
        try:
            snapshot_id = str(uuid.uuid4())
            
            # Get current data
            if upload_type == 'ledger':
                data = await self.db.finance_ledger.find({}, {'_id': 0}).to_list(10000)
                collection = 'finance_ledger'
            else:
                data = await self.db.finance_transactions.find({}, {'_id': 0}).to_list(10000)
                collection = 'finance_transactions'
            
            # Save snapshot
            snapshot = {
                'snapshot_id': snapshot_id,
                'upload_type': upload_type,
                'file_name': file_name,
                'collection': collection,
                'record_count': record_count,
                'data': data,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.finance_upload_history.insert_one(snapshot)
            
            logger.info(f"✅ Saved snapshot {snapshot_id} for {upload_type}")
            
            return snapshot_id
            
        except Exception as e:
            logger.error(f"❌ Error saving snapshot: {str(e)}")
            return None
    
    async def get_upload_history(self) -> Dict:
        """
        Get upload history
        """
        try:
            history = await self.db.finance_upload_history.find(
                {},
                {'_id': 0, 'data': 0}  # Exclude large data field
            ).sort('created_at', -1).to_list(50)
            
            return {
                'success': True,
                'history': history
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting upload history: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_unmatched_records(self, store_name: str = 'ashmiaa') -> Dict:
        """
        Get records from uploaded files that are NOT matched to Shopify orders
        """
        try:
            logger.info(f"🔍 Finding unmatched records for store: {store_name}")
            
            # Get all Shopify order numbers
            shopify_orders = await self.db.customers.find(
                {'store_name': store_name},
                {'_id': 0, 'order_number': 1}
            ).to_list(10000)
            
            shopify_order_numbers = set(order.get('order_number') for order in shopify_orders)
            
            # Get all ledger records
            ledger_records = await self.db.finance_ledger.find(
                {},
                {'_id': 0}
            ).to_list(10000)
            
            # Get all transactions
            transactions = await self.db.finance_transactions.find(
                {},
                {'_id': 0}
            ).to_list(10000)
            
            # Find unmatched ledger records (order numbers not in Shopify)
            unmatched_ledger = []
            for record in ledger_records:
                order_num = record.get('order_number')
                if order_num not in shopify_order_numbers:
                    unmatched_ledger.append({
                        'order_number': order_num,
                        'date': record.get('date', ''),
                        'sale_price': record.get('sale_price', 0),
                        'order_status': record.get('order_status', ''),
                        'payment_status': record.get('payment_status', ''),
                        'tracking_number': record.get('tracking_number', ''),
                        'description': record.get('description', ''),
                        'reason': 'Order number not found in Shopify'
                    })
            
            # Find unmatched transactions (not linked to any ledger record)
            matched_transactions = set()
            for record in ledger_records:
                if record.get('matched_transaction'):
                    # Create a unique identifier for the transaction
                    trans = record.get('matched_transaction', {})
                    trans_id = f"{trans.get('date')}_{trans.get('description')}_{trans.get('debit', 0)}_{trans.get('credit', 0)}"
                    matched_transactions.add(trans_id)
            
            unmatched_transactions = []
            for trans in transactions:
                trans_id = f"{trans.get('date')}_{trans.get('description')}_{trans.get('debit', 0)}_{trans.get('credit', 0)}"
                if trans_id not in matched_transactions:
                    amount = trans.get('credit', 0) or trans.get('debit', 0)
                    if amount > 0:  # Only include transactions with amounts
                        unmatched_transactions.append({
                            'date': trans.get('date', ''),
                            'description': trans.get('description', ''),
                            'payment_mode': trans.get('payment_mode', ''),
                            'debit': trans.get('debit', 0),
                            'credit': trans.get('credit', 0),
                            'amount': amount,
                            'reason': 'No matching order found'
                        })
            
            logger.info(f"✅ Found {len(unmatched_ledger)} unmatched ledger records and {len(unmatched_transactions)} unmatched transactions")
            
            return {
                'success': True,
                'unmatched_ledger': unmatched_ledger,
                'unmatched_transactions': unmatched_transactions,
                'summary': {
                    'total_ledger_records': len(ledger_records),
                    'unmatched_ledger_count': len(unmatched_ledger),
                    'total_transactions': len(transactions),
                    'unmatched_transactions_count': len(unmatched_transactions)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting unmatched records: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def rollback_to_snapshot(self, snapshot_id: str) -> Dict:
        """
        Rollback to a previous snapshot
        """
        try:
            # Get snapshot
            snapshot = await self.db.finance_upload_history.find_one(
                {'snapshot_id': snapshot_id},
                {'_id': 0}
            )
            
            if not snapshot:
                return {
                    'success': False,
                    'error': 'Snapshot not found'
                }
            
            collection_name = snapshot['collection']
            data = snapshot['data']
            
            # Clear current data and restore snapshot
            if collection_name == 'finance_ledger':
                await self.db.finance_ledger.delete_many({})
                if data:
                    await self.db.finance_ledger.insert_many(data)
            else:
                await self.db.finance_transactions.delete_many({})
                if data:
                    await self.db.finance_transactions.insert_many(data)
            
            logger.info(f"✅ Rolled back to snapshot {snapshot_id}")
            
            return {
                'success': True,
                'message': f'Rolled back to {snapshot["file_name"]} ({snapshot["created_at"]})',
                'record_count': len(data)
            }
            
        except Exception as e:
            logger.error(f"❌ Error rolling back: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _determine_status(self, shopify_order: Dict, ledger_data: Dict, verification: Dict = None, validation_errors: list = None) -> str:
        """
        Determine reconciliation status with strict validation
        ERROR status if Order#/SKU/Tracking don't match
        """
        # Priority 1: If manually verified, override everything
        if verification and verification.get('verified'):
            return 'Verified'
        
        # Priority 2: If no ledger data at all
        if not ledger_data:
            return 'Missing Data'
        
        # Priority 3: If there are validation errors (Order#, SKU, or Tracking mismatch)
        if validation_errors and len(validation_errors) > 0:
            return 'Error'
        
        # Check if all key fields are present
        has_delivery = shopify_order.get('delivery_status') not in [None, '', 'N/A']
        has_ledger = bool(ledger_data.get('order_status'))
        has_payment = bool(ledger_data.get('payment_status'))
        has_transaction = bool(ledger_data.get('matched_transaction'))
        
        # Check tracking number match for delivery verification
        shopify_tracking = shopify_order.get('tracking_number', '')
        ledger_tracking = ledger_data.get('tracking_number', '')
        tracking_verified = False
        if shopify_tracking and ledger_tracking:
            tracking_verified = shopify_tracking.replace(' ', '').upper() == ledger_tracking.replace(' ', '').upper()
        
        # Complete status requires all data points + tracking verification
        if has_ledger and has_payment and has_transaction and tracking_verified:
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
