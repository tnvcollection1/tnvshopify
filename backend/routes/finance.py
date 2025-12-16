"""
Finance Reconciliation Routes
Handles ledger uploads, bank transactions, and order reconciliation
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
import logging

from finance_reconciliation import get_finance_reconciliation

logger = logging.getLogger(__name__)

# Database will be injected from server.py
db = None

def set_database(database):
    """Set the database connection from server.py"""
    global db
    db = database

# Create router with prefix
finance_router = APIRouter(prefix="/finance", tags=["Finance Reconciliation"])


# ==================== FILE UPLOAD ENDPOINTS ====================

@finance_router.post("/upload-ledger")
async def upload_general_ledger(file: UploadFile = File(...)):
    """
    Upload general ledger Excel file (ASMIA GERNAL ENTRY SHEET.xlsx)
    """
    try:
        logger.info(f"📤 Uploading general ledger file: {file.filename}")
        
        # Read file content
        content = await file.read()
        
        # Parse the file
        finance_rec = get_finance_reconciliation(db)
        result = await finance_rec.parse_general_ledger(content)
        
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        # Upload to database
        upload_result = await finance_rec.upload_ledger_data(result['data'], file.filename)
        
        if not upload_result.get('success'):
            raise HTTPException(status_code=500, detail=upload_result.get('error'))
        
        return {
            'success': True,
            'message': 'General ledger uploaded successfully',
            'total_records': result['total_records'],
            'uploaded_count': upload_result['uploaded_count'],
            'snapshot_id': upload_result.get('snapshot_id')
        }
        
    except Exception as e:
        logger.error(f"❌ Error uploading ledger: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.post("/upload-transactions")
async def upload_bank_transactions(file: UploadFile = File(...)):
    """
    Upload bank transactions Excel file (Asmia and TNV Collection - Imran Abbas account check H.xlsx)
    """
    try:
        logger.info(f"📤 Uploading bank transactions file: {file.filename}")
        
        # Read file content
        content = await file.read()
        
        # Parse the file
        finance_rec = get_finance_reconciliation(db)
        result = await finance_rec.parse_bank_transactions(content)
        
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        # Upload to database
        upload_result = await finance_rec.upload_transaction_data(result['data'], file.filename)
        
        if not upload_result.get('success'):
            raise HTTPException(status_code=500, detail=upload_result.get('error'))
        
        return {
            'success': True,
            'message': 'Bank transactions uploaded successfully',
            'total_records': result['total_records'],
            'uploaded_count': upload_result['uploaded_count'],
            'snapshot_id': upload_result.get('snapshot_id')
        }
        
    except Exception as e:
        logger.error(f"❌ Error uploading transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== RECONCILIATION ENDPOINTS ====================

@finance_router.get("/reconciliation")
async def get_reconciliation(store_name: str = 'ashmiaa'):
    """
    Get reconciliation report for orders
    Matches Shopify orders with ledger and bank transactions
    """
    try:
        logger.info(f"🔍 Fetching reconciliation for store: {store_name}")
        
        finance_rec = get_finance_reconciliation(db)
        result = await finance_rec.reconcile_orders(store_name)
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error getting reconciliation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DTDC PAYMENT RECONCILIATION ====================

@finance_router.post("/upload-dtdc-payments")
async def upload_dtdc_payments(file: UploadFile = File(...), store_name: str = None):
    """
    Upload DTDC Payment Report (COD collections).
    
    Expected columns (flexible naming):
    - AWB/Tracking Number
    - COD Amount (amount collected by DTDC)
    - Payment Date (when DTDC collected)
    - Order Reference (optional)
    - Remittance Status (optional)
    """
    import pandas as pd
    from io import BytesIO
    from datetime import datetime, timezone
    
    try:
        if not store_name or store_name == 'all':
            raise HTTPException(status_code=400, detail="Please select a specific store")
        
        logger.info(f"📤 Uploading DTDC payment report for store: {store_name}")
        
        content = await file.read()
        
        # Parse file
        filename = file.filename.lower() if file.filename else ""
        if filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(content))
        else:
            try:
                df = pd.read_excel(BytesIO(content))
            except:
                df = pd.read_csv(BytesIO(content))
        
        # Flexible column mapping for DTDC reports
        column_mapping = {
            'AWB': 'awb',
            'AWB NO': 'awb',
            'AWB NO.': 'awb',
            'TRACKING': 'awb',
            'TRACKING NO': 'awb',
            'TRACKING NUMBER': 'awb',
            'CONSIGNMENT NO': 'awb',
            'CN NO': 'awb',
            'COD': 'cod_amount',
            'COD AMOUNT': 'cod_amount',
            'COD AMT': 'cod_amount',
            'AMOUNT': 'cod_amount',
            'COLLECTED AMOUNT': 'cod_amount',
            'COLLECTION': 'cod_amount',
            'REMITTANCE': 'cod_amount',
            'REMITTANCE AMOUNT': 'cod_amount',
            'DATE': 'payment_date',
            'PAYMENT DATE': 'payment_date',
            'COLLECTION DATE': 'payment_date',
            'DELIVERY DATE': 'payment_date',
            'REMITTANCE DATE': 'payment_date',
            'ORDER': 'order_ref',
            'ORDER NO': 'order_ref',
            'ORDER REF': 'order_ref',
            'REFERENCE': 'order_ref',
            'STATUS': 'status',
            'REMITTANCE STATUS': 'status',
            'PAYMENT STATUS': 'status'
        }
        
        df.columns = [column_mapping.get(col.strip().upper(), col.strip().lower().replace(' ', '_')) for col in df.columns]
        
        records = df.to_dict('records')
        
        # Get orders with tracking numbers for matching
        orders = await db.customers.find(
            {'store_name': store_name, 'tracking_number': {'$exists': True, '$ne': None}},
            {'_id': 0, 'order_number': 1, 'name': 1, 'tracking_number': 1, 'total_spent': 1, 'total_price': 1}
        ).to_list(100000)
        
        # Build lookup by tracking number
        order_by_tracking = {}
        for order in orders:
            tracking = str(order.get('tracking_number', '')).strip().upper()
            if tracking:
                order_by_tracking[tracking] = order
        
        # Process records
        dtdc_records = []
        matched_count = 0
        total_cod = 0
        
        for record in records:
            awb = str(record.get('awb', '')).strip().upper()
            if not awb:
                continue
            
            cod_amount = 0
            try:
                cod_amount = float(record.get('cod_amount', 0) or 0)
            except:
                pass
            
            payment_date = record.get('payment_date')
            order_ref = record.get('order_ref', '')
            status = record.get('status', '')
            
            # Match with order
            matched_order = order_by_tracking.get(awb)
            is_matched = matched_order is not None
            
            dtdc_record = {
                'awb': awb,
                'cod_amount': cod_amount,
                'payment_date': str(payment_date) if payment_date else None,
                'order_ref': order_ref,
                'dtdc_status': status,
                'matched': is_matched,
                'matched_order_number': matched_order.get('order_number') or matched_order.get('name') if matched_order else None,
                'order_total': matched_order.get('total_spent') or matched_order.get('total_price') if matched_order else None,
                'store_name': store_name,
                'uploaded_at': datetime.now(timezone.utc).isoformat(),
                'bank_matched': False,  # Will be updated when bank statement is uploaded
                'bank_amount': None,
                'bank_date': None
            }
            
            dtdc_records.append(dtdc_record)
            total_cod += cod_amount
            if is_matched:
                matched_count += 1
                
                # Update order with DTDC payment info
                update_query = {'store_name': store_name}
                if matched_order.get('name'):
                    update_query['name'] = matched_order.get('name')
                else:
                    update_query['order_number'] = str(matched_order.get('order_number'))
                
                await db.customers.update_one(
                    update_query,
                    {'$set': {
                        'dtdc_cod_amount': cod_amount,
                        'dtdc_payment_date': str(payment_date) if payment_date else None,
                        'dtdc_payment_status': status or 'COLLECTED',
                        'dtdc_updated_at': datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        # Store DTDC payment records
        await db.dtdc_payments.delete_many({'store_name': store_name})
        if dtdc_records:
            await db.dtdc_payments.insert_many(dtdc_records)
        
        logger.info(f"✅ Uploaded {len(dtdc_records)} DTDC payment records, {matched_count} matched with orders")
        
        return {
            'success': True,
            'message': f'Uploaded {len(dtdc_records)} DTDC payment records',
            'total_records': len(dtdc_records),
            'matched': matched_count,
            'not_matched': len(dtdc_records) - matched_count,
            'total_cod_amount': total_cod,
            'match_rate': f"{(matched_count/len(dtdc_records)*100):.1f}%" if dtdc_records else "0%"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading DTDC payments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.post("/upload-bank-statement")
async def upload_bank_statement(file: UploadFile = File(...), store_name: str = None):
    """
    Upload Bank Statement to reconcile with DTDC payments.
    
    Expected columns (flexible naming):
    - Date / Transaction Date
    - Amount / Credit / Deposit
    - Description / Narration / Reference
    - UTR / Reference Number (optional)
    """
    import pandas as pd
    from io import BytesIO
    from datetime import datetime, timezone
    import re
    
    try:
        if not store_name or store_name == 'all':
            raise HTTPException(status_code=400, detail="Please select a specific store")
        
        logger.info(f"📤 Uploading bank statement for store: {store_name}")
        
        content = await file.read()
        
        # Parse file
        filename = file.filename.lower() if file.filename else ""
        if filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(content))
        else:
            try:
                df = pd.read_excel(BytesIO(content))
            except:
                df = pd.read_csv(BytesIO(content))
        
        # Flexible column mapping
        column_mapping = {
            'DATE': 'date',
            'TXN DATE': 'date',
            'TRANSACTION DATE': 'date',
            'VALUE DATE': 'date',
            'AMOUNT': 'amount',
            'CREDIT': 'amount',
            'DEPOSIT': 'amount',
            'CR': 'amount',
            'DESCRIPTION': 'description',
            'NARRATION': 'description',
            'PARTICULARS': 'description',
            'REMARKS': 'description',
            'UTR': 'utr',
            'UTR NO': 'utr',
            'REFERENCE': 'utr',
            'REF NO': 'utr',
            'REFERENCE NO': 'utr',
            'TRANSACTION ID': 'utr'
        }
        
        df.columns = [column_mapping.get(col.strip().upper(), col.strip().lower().replace(' ', '_')) for col in df.columns]
        
        records = df.to_dict('records')
        
        # Get DTDC payments for matching
        dtdc_payments = await db.dtdc_payments.find(
            {'store_name': store_name, 'bank_matched': False},
            {'_id': 0}
        ).to_list(100000)
        
        # Build lookup by COD amount (for approximate matching)
        dtdc_by_amount = {}
        for payment in dtdc_payments:
            amt = payment.get('cod_amount', 0)
            if amt > 0:
                # Round to nearest 10 for fuzzy matching
                key = round(amt / 10) * 10
                if key not in dtdc_by_amount:
                    dtdc_by_amount[key] = []
                dtdc_by_amount[key].append(payment)
        
        # Process bank records
        bank_records = []
        matched_count = 0
        total_credits = 0
        
        for record in records:
            amount = 0
            try:
                amount = float(record.get('amount', 0) or 0)
            except:
                pass
            
            # Skip debits (negative amounts) and zero amounts
            if amount <= 0:
                continue
            
            date = record.get('date')
            description = str(record.get('description', '')).upper()
            utr = record.get('utr', '')
            
            # Check if this looks like a DTDC remittance
            is_dtdc_payment = any(kw in description for kw in ['DTDC', 'COD', 'REMIT', 'COURIER', 'DELIVERY'])
            
            # Try to match with DTDC payment
            matched_dtdc = None
            if is_dtdc_payment:
                # Try exact amount match first
                key = round(amount / 10) * 10
                if key in dtdc_by_amount and dtdc_by_amount[key]:
                    # Find closest match
                    for dtdc in dtdc_by_amount[key]:
                        if abs(dtdc['cod_amount'] - amount) < 50:  # Within Rs.50 tolerance
                            matched_dtdc = dtdc
                            dtdc_by_amount[key].remove(dtdc)
                            break
            
            bank_record = {
                'date': str(date) if date else None,
                'amount': amount,
                'description': description,
                'utr': utr,
                'is_dtdc_payment': is_dtdc_payment,
                'matched_awb': matched_dtdc.get('awb') if matched_dtdc else None,
                'matched_order': matched_dtdc.get('matched_order_number') if matched_dtdc else None,
                'store_name': store_name,
                'uploaded_at': datetime.now(timezone.utc).isoformat()
            }
            
            bank_records.append(bank_record)
            total_credits += amount
            
            if matched_dtdc:
                matched_count += 1
                # Update DTDC payment record
                await db.dtdc_payments.update_one(
                    {'awb': matched_dtdc['awb'], 'store_name': store_name},
                    {'$set': {
                        'bank_matched': True,
                        'bank_amount': amount,
                        'bank_date': str(date) if date else None,
                        'bank_utr': utr
                    }}
                )
        
        # Store bank records
        await db.bank_statements.delete_many({'store_name': store_name})
        if bank_records:
            await db.bank_statements.insert_many(bank_records)
        
        logger.info(f"✅ Uploaded {len(bank_records)} bank transactions, {matched_count} matched with DTDC")
        
        return {
            'success': True,
            'message': f'Uploaded {len(bank_records)} bank transactions',
            'total_records': len(bank_records),
            'credit_transactions': len([r for r in bank_records if r['amount'] > 0]),
            'dtdc_payments_detected': len([r for r in bank_records if r['is_dtdc_payment']]),
            'matched_with_dtdc': matched_count,
            'total_credits': total_credits
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading bank statement: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.get("/dtdc-payment-reconciliation")
async def get_dtdc_payment_reconciliation(store_name: str = None, status: str = None):
    """
    Get DTDC Payment Reconciliation status.
    Shows COD collections from DTDC and their bank deposit status.
    
    Filters:
    - store_name: Filter by store
    - status: 'pending' (not deposited), 'received' (bank matched), 'all'
    """
    try:
        query = {}
        if store_name and store_name != 'all':
            query['store_name'] = store_name
        
        if status == 'pending':
            query['bank_matched'] = False
        elif status == 'received':
            query['bank_matched'] = True
        
        records = await db.dtdc_payments.find(query, {'_id': 0}).to_list(10000)
        
        # Calculate summary
        total = len(records)
        pending = sum(1 for r in records if not r.get('bank_matched'))
        received = sum(1 for r in records if r.get('bank_matched'))
        total_cod = sum(r.get('cod_amount', 0) for r in records)
        total_received = sum(r.get('bank_amount', 0) or r.get('cod_amount', 0) for r in records if r.get('bank_matched'))
        total_pending = sum(r.get('cod_amount', 0) for r in records if not r.get('bank_matched'))
        
        return {
            'success': True,
            'records': records,
            'summary': {
                'total_records': total,
                'pending_deposit': pending,
                'received_in_bank': received,
                'total_cod_collected': total_cod,
                'total_received_in_bank': total_received,
                'total_pending_amount': total_pending
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting DTDC reconciliation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.delete("/clear-dtdc-reconciliation")
async def clear_dtdc_reconciliation(store_name: str = None):
    """Clear DTDC payment reconciliation data for a store"""
    try:
        if not store_name or store_name == 'all':
            raise HTTPException(status_code=400, detail="Please select a specific store")
        
        await db.dtdc_payments.delete_many({'store_name': store_name})
        await db.bank_statements.delete_many({'store_name': store_name})
        
        return {'success': True, 'message': f'Cleared DTDC reconciliation data for {store_name}'}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error clearing DTDC reconciliation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))@finance_router.get("/status")
async def get_finance_status():
    """
    Get status of uploaded finance data
    """
    try:
        ledger_count = await db.finance_ledger.count_documents({})
        transaction_count = await db.finance_transactions.count_documents({})
        
        # Get last upload time
        last_ledger = await db.finance_ledger.find_one({}, {'uploaded_at': 1}, sort=[('uploaded_at', -1)])
        last_transaction = await db.finance_transactions.find_one({}, {'uploaded_at': 1}, sort=[('uploaded_at', -1)])
        
        return {
            'success': True,
            'ledger_records': ledger_count,
            'transaction_records': transaction_count,
            'last_ledger_upload': last_ledger.get('uploaded_at') if last_ledger else None,
            'last_transaction_upload': last_transaction.get('uploaded_at') if last_transaction else None
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting finance status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.post("/match-transactions")
async def match_transactions(store_name: str = 'ashmiaa'):
    """
    Automatically match bank transactions to orders
    ONLY for the specified store (ashmia by default)
    """
    try:
        logger.info(f"🔗 Starting automatic transaction matching for {store_name}...")
        
        finance_rec = get_finance_reconciliation(db)
        result = await finance_rec.match_transactions(store_name)
        
        return {
            "success": True,
            "matched_count": result.get("matched_count", 0),
            "message": result.get("message", "Matching complete")
        }
    except Exception as e:
        logger.error(f"❌ Error matching transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.get("/missing-orders")
async def get_missing_orders(store_name: str = 'ashmiaa'):
    """
    Get orders that exist in Shopify but NOT in uploaded Excel ledger
    Returns list ready for Excel export
    """
    try:
        finance_rec = get_finance_reconciliation(db)
        result = await finance_rec.reconcile_orders(store_name)
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        # Filter only missing data orders
        missing_orders = [
            order for order in result.get('orders', [])
            if order.get('reconciliation_status') == 'Missing Data'
        ]
        
        # Format for easy Excel import
        excel_ready = []
        for order in missing_orders:
            excel_ready.append({
                'order_number': order['order_number'],
                'customer_name': order['customer_name'],
                'delivery_status': order['delivery_status'],
                'amount': order['amount'],
                'tracking_number': order['tracking_number'] if order['tracking_number'] != 'N/A' else '',
                'order_status': order['shopify_status'],
                'payment_status': 'PENDING',  # Default value to fill
                'store_name': store_name
            })
        
        return {
            'success': True,
            'missing_orders': excel_ready,
            'total': len(excel_ready)
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting missing orders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.post("/verify-order")
async def verify_order(order_number: str, verified_by: str, notes: str = ''):
    """
    Mark an order as verified after manual review
    """
    try:
        logger.info(f"✅ Verifying order {order_number}")
        
        finance_rec = get_finance_reconciliation(db)
        result = await finance_rec.mark_order_verified(order_number, verified_by, notes)
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error verifying order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.get("/upload-history")
async def get_upload_history():
    """
    Get upload history for rollback capability
    """
    try:
        finance_rec = get_finance_reconciliation(db)
        result = await finance_rec.get_upload_history()
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error getting upload history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.post("/rollback/{snapshot_id}")
async def rollback_snapshot(snapshot_id: str):
    """
    Rollback to a previous snapshot
    """
    try:
        logger.info(f"🔄 Rolling back to snapshot {snapshot_id}")
        
        finance_rec = get_finance_reconciliation(db)
        result = await finance_rec.rollback_to_snapshot(snapshot_id)
        
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error rolling back: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.get("/unmatched-records")
async def get_unmatched_records(store_name: str = 'ashmiaa'):
    """
    Get records from uploaded files that are NOT matched to Shopify orders
    Shows which ledger records and transactions couldn't be matched
    """
    try:
        logger.info(f"🔍 Fetching unmatched records for store: {store_name}")
        
        finance_rec = get_finance_reconciliation(db)
        result = await finance_rec.get_unmatched_records(store_name)
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error getting unmatched records: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.delete("/clear-reconciliation")
async def clear_reconciliation(store_name: str = None):
    """
    Clear all reconciliation data for a specific store or all stores
    """
    try:
        query = {}
        if store_name and store_name != 'all':
            query['store_name'] = store_name
        
        result = await db.purchase_order_reconciliation.delete_many(query)
        
        return {
            'success': True,
            'message': f'Cleared {result.deleted_count} records',
            'deleted_count': result.deleted_count
        }
    except Exception as e:
        logger.error(f"❌ Error clearing reconciliation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.post("/upload-purchase-orders")
async def upload_purchase_orders(file: UploadFile = File(...), store_name: str = None):
    """
    Upload Purchase Order Excel file and reconcile with Shopify orders.
    Store-specific upload - each store has its own data.
    
    Expected columns:
    - SHOPIFY ID: Order # in Shopify (e.g., #29461)
    - SKU: SKU in Shopify order line items
    - AWB: Tracking ID / DTDC fulfillment number
    - SELL AMOUNT: Total Sale price
    - COST: Purchase cost (optional)
    
    Matching Logic:
    1. Match by Order # (SHOPIFY ID) - primary match
    2. Match by AWB/Tracking Number - secondary match  
    3. Verify SKU exists in order line items
    4. Verify Sell Amount matches total_price (5% tolerance)
    """
    import pandas as pd
    from io import BytesIO
    from datetime import datetime, timezone
    
    try:
        # Store name is required
        if not store_name or store_name == 'all':
            raise HTTPException(status_code=400, detail="Please select a specific store. Each store has its own reconciliation data.")
        
        logger.info(f"📤 Uploading purchase order file for store: {store_name}, file: {file.filename}")
        
        # Read file content
        content = await file.read()
        
        # Parse file based on extension
        filename = file.filename.lower() if file.filename else ""
        if filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(content))
        else:
            # Try Excel first, fallback to CSV
            try:
                df = pd.read_excel(BytesIO(content))
            except Exception as excel_error:
                logger.warning(f"Excel parse failed, trying CSV: {excel_error}")
                try:
                    df = pd.read_csv(BytesIO(content))
                except Exception as csv_error:
                    raise HTTPException(status_code=400, detail=f"Could not parse file. Excel error: {excel_error}, CSV error: {csv_error}")
        
        # Normalize column names (handle variations)
        column_mapping = {
            'SHOPIFY ID': 'shopify_id',
            'Shopify ID': 'shopify_id', 
            'ORDER': 'shopify_id',
            'Order': 'shopify_id',
            'ORDER #': 'shopify_id',
            'Order #': 'shopify_id',
            'ORDER#': 'shopify_id',
            'Order#': 'shopify_id',
            'PURCHASE ORDER': 'shopify_id',
            'SKU': 'sku',
            'Sku': 'sku',
            'sku': 'sku',
            'AWB': 'awb',
            'Awb': 'awb',
            'awb': 'awb',
            'TRACKING': 'awb',
            'Tracking': 'awb',
            'DTDC': 'awb',
            'DTDC TRACKING': 'awb',
            'DTDC TRACKING NUMBER': 'awb',
            'TRACKING NUMBER': 'awb',
            'Tracking Number': 'awb',
            'TRACKING ID': 'awb',
            'SELL AMOUNT': 'sell_amount',
            'Sell Amount': 'sell_amount',
            'SELL': 'sell_amount',
            'AMOUNT': 'sell_amount',
            'Amount': 'sell_amount',
            'SALE': 'sell_amount',
            'SALE AMOUNT': 'sell_amount',
            'Sale Amount': 'sell_amount',
            'TOTAL': 'sell_amount',
            'Total': 'sell_amount',
            'TOTAL PRICE': 'sell_amount',
            'Total Price': 'sell_amount',
            'COST': 'cost',
            'Cost': 'cost',
            'cost': 'cost',
            'PURCHASE COST': 'cost',
            'ADVANCE': 'advance_payment',
            'ADVANCE PAYMENT': 'advance_payment',
            'Advance Payment': 'advance_payment',
            'ADVANCE AMT': 'advance_payment',
            'ADV': 'advance_payment',
            'PREPAID': 'advance_payment',
            'COD': 'cod_amount',
            'COD AMOUNT': 'cod_amount',
            'Cod Amount': 'cod_amount',
            'COD AMT': 'cod_amount',
            'CASH ON DELIVERY': 'cod_amount'
        }
        
        # PKR to INR conversion rate (approximate - can be made configurable)
        PKR_TO_INR_RATE = 0.30  # 1 PKR ≈ 0.30 INR (or 3.33 PKR = 1 INR)
        
        df.columns = [column_mapping.get(col.strip(), col.strip().lower().replace(' ', '_')) for col in df.columns]
        
        # Convert to records
        records = df.to_dict('records')
        
        # Get Shopify orders for this specific store
        shopify_orders = await db.customers.find(
            {'store_name': store_name},
            {"_id": 0, "name": 1, "order_number": 1, "tracking_number": 1, "line_items": 1, "total_price": 1, "total_spent": 1, "financial_status": 1, "fulfillment_status": 1}
        ).to_list(100000)
        
        logger.info(f"Found {len(shopify_orders)} Shopify orders for store: {store_name}")
        
        # Build lookup maps for faster matching
        order_by_name = {}
        order_by_tracking = {}
        order_by_sku = {}
        
        for order in shopify_orders:
            # Index by order name (e.g., #29461)
            name = str(order.get('name', '')).strip()
            if name:
                order_by_name[name] = order
                order_by_name[name.replace('#', '')] = order
                # Also index with just the number
                name_num = ''.join(filter(str.isdigit, name))
                if name_num:
                    order_by_name[name_num] = order
            
            # Also index by order_number field (for stores like ashmiaa that don't have name)
            order_number = str(order.get('order_number', '')).strip()
            if order_number:
                order_by_name[order_number] = order
                order_by_name[f"#{order_number}"] = order
            
            # Index by tracking number
            tracking = str(order.get('tracking_number', '')).strip()
            if tracking:
                order_by_tracking[tracking.upper()] = order
                order_by_tracking[tracking] = order
            
            # Index by SKU from line items
            line_items = order.get('line_items', [])
            if line_items:
                for item in line_items:
                    item_sku = str(item.get('sku', '')).strip().upper()
                    if item_sku:
                        if item_sku not in order_by_sku:
                            order_by_sku[item_sku] = []
                        order_by_sku[item_sku].append(order)
        
        logger.info(f"Built lookup maps: {len(order_by_name)} by name/number, {len(order_by_tracking)} by tracking")
        
        # Process and reconcile each record
        matched_count = 0
        not_matched_count = 0
        reconciled_records = []
        
        for record in records:
            shopify_id = str(record.get('shopify_id', '')).strip()
            sku = str(record.get('sku', '')).strip().upper()
            awb = str(record.get('awb', '')).strip().upper()
            sell_amount = 0
            cost = 0
            advance_payment = 0
            cod_amount = 0
            
            try:
                sell_amount = float(record.get('sell_amount', 0) or 0)
            except:
                pass
            try:
                cost = float(record.get('cost', 0) or 0)
            except:
                pass
            try:
                advance_payment = float(record.get('advance_payment', 0) or 0)
            except:
                pass
            try:
                cod_amount = float(record.get('cod_amount', 0) or 0)
            except:
                pass
            
            # Convert cost from PKR to INR
            cost_inr = cost * PKR_TO_INR_RATE
            
            # Skip empty rows
            if not shopify_id and not awb and not sku:
                continue
            
            # Try to match order
            matched_order = None
            match_type = None
            sku_matched = False
            
            # Priority 1: Match by Order # (SHOPIFY ID)
            if shopify_id:
                # Try exact match
                if shopify_id in order_by_name:
                    matched_order = order_by_name[shopify_id]
                    match_type = 'order_id'
                # Try with # prefix
                elif f"#{shopify_id}" in order_by_name:
                    matched_order = order_by_name[f"#{shopify_id}"]
                    match_type = 'order_id'
                # Try just numbers
                else:
                    shopify_num = ''.join(filter(str.isdigit, shopify_id))
                    if shopify_num and shopify_num in order_by_name:
                        matched_order = order_by_name[shopify_num]
                        match_type = 'order_id'
            
            # Priority 2: Match by AWB/Tracking Number
            if not matched_order and awb:
                if awb in order_by_tracking:
                    matched_order = order_by_tracking[awb]
                    match_type = 'tracking'
            
            # Verify SKU match if we have an order
            if matched_order and sku:
                line_items = matched_order.get('line_items', [])
                for item in line_items:
                    item_sku = str(item.get('sku', '')).strip().upper()
                    if item_sku == sku:
                        sku_matched = True
                        break
            
            # Verify amount match
            # Amount Match Logic: If COD = 0, then Advance Payment should match Shopify Order Amount
            amount_match = False
            shopify_amount = 0
            
            if matched_order:
                try:
                    shopify_amount = float(matched_order.get('total_price', 0) or matched_order.get('total_spent', 0) or 0)
                except:
                    shopify_amount = 0
                
                # Amount match logic:
                # If COD = 0, then Advance Payment should match Shopify Amount
                if cod_amount == 0 and advance_payment > 0 and shopify_amount > 0:
                    diff = abs(shopify_amount - advance_payment)
                    # Allow Rs.10 tolerance for rounding differences
                    amount_match = diff <= 10
            
            # Calculate profit using cost converted to INR
            # Profit = Sale Amount (INR) - Cost (converted to INR)
            profit = sell_amount - cost_inr if sell_amount and cost_inr else 0
            
            # Determine final status
            # Matched = order found (we match by order # or tracking, not by amount since currencies differ)
            is_matched = matched_order is not None
            status = 'matched' if is_matched else 'not_matched'
            
            # If matched, update the actual order with cost data
            if is_matched and cost > 0:
                # Build query - use order_number or name depending on what's available
                order_name = matched_order.get('name')
                order_num = matched_order.get('order_number')
                
                update_query = {'store_name': store_name}
                if order_name:
                    update_query['name'] = order_name
                elif order_num:
                    update_query['order_number'] = str(order_num)
                
                if len(update_query) > 1:  # Has more than just store_name
                    await db.customers.update_one(
                        update_query,
                        {'$set': {
                            'order_cost': cost,
                            'order_cost_inr': cost_inr,
                            'cost_currency': 'PKR',  # Original cost is in PKR
                            'advance_payment': advance_payment,
                            'cod_amount': cod_amount,
                            'cost_from_reconciliation': True,
                            'reconciliation_awb': awb,
                            'cost_updated_at': datetime.now(timezone.utc).isoformat()
                        }}
                    )
            
            reconciled_record = {
                'id': str(len(reconciled_records) + 1),
                'shopify_id': shopify_id,
                'sku': sku.upper() if sku else '',
                'awb': awb,
                'sell_amount': sell_amount,
                'sell_currency': 'INR',
                'cost_pkr': cost,  # Original cost in PKR
                'cost_inr': round(cost_inr, 2),  # Converted cost in INR
                'advance_payment': advance_payment,
                'cod_amount': cod_amount,
                'profit': round(profit, 2),  # Profit in INR
                'matched': is_matched,
                'match_type': match_type,
                'sku_matched': sku_matched,
                'amount_match': amount_match,
                'shopify_order_name': matched_order.get('name') or matched_order.get('order_number') if matched_order else None,
                'shopify_amount': shopify_amount,
                'shopify_payment_status': matched_order.get('financial_status') if matched_order else None,
                'shopify_fulfillment_status': matched_order.get('fulfillment_status') if matched_order else None,
                'status': status,
                'uploaded_at': datetime.now(timezone.utc).isoformat(),
                'store_name': store_name
            }
            
            reconciled_records.append(reconciled_record)
            if is_matched:
                matched_count += 1
            else:
                not_matched_count += 1
        
        # Clear existing reconciliation data for this store and insert new records
        await db.purchase_order_reconciliation.delete_many({'store_name': store_name})
        if reconciled_records:
            await db.purchase_order_reconciliation.insert_many(reconciled_records)
        
        # Log summary of order updates
        logger.info(f"✅ Updated {matched_count} orders with cost data for store: {store_name}")
        
        return {
            'success': True,
            'message': f'Reconciled {len(reconciled_records)} records for {store_name}',
            'total_records': len(reconciled_records),
            'matched': matched_count,
            'not_matched': not_matched_count,
            'match_rate': f"{(matched_count/len(reconciled_records)*100):.1f}%" if reconciled_records else "0%"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading purchase orders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.get("/purchase-order-reconciliation")
async def get_purchase_order_reconciliation(store_name: str = None, status: str = None):
    """
    Get purchase order reconciliation results.
    Filters:
    - store_name: Filter by specific store (required for meaningful results)
    - status: 'matched' or 'not_matched'
    """
    try:
        query = {}
        if store_name and store_name != 'all':
            query['store_name'] = store_name
        if status and status != 'all':
            # Support both old and new status values
            if status in ['matched', 'not_matched']:
                query['status'] = status
            elif status == 'unmatched':
                query['status'] = 'not_matched'
            
        records = await db.purchase_order_reconciliation.find(query, {"_id": 0}).to_list(10000)
        
        # Calculate summary
        total = len(records)
        matched = sum(1 for r in records if r.get('status') == 'matched')
        not_matched = sum(1 for r in records if r.get('status') == 'not_matched')
        sku_matched = sum(1 for r in records if r.get('sku_matched'))
        amount_matched = sum(1 for r in records if r.get('amount_match'))
        total_sell = sum(r.get('sell_amount', 0) for r in records)
        total_cost = sum(r.get('cost', 0) for r in records)
        total_profit = sum(r.get('profit', 0) for r in records)
        
        return {
            'success': True,
            'records': records,
            'summary': {
                'total': total,
                'matched': matched,
                'not_matched': not_matched,
                'sku_matched': sku_matched,
                'amount_matched': amount_matched,
                'total_sell': total_sell,
                'total_cost': total_cost,
                'total_profit': total_profit,
                'match_rate': f"{(matched/total*100):.1f}%" if total > 0 else "0%"
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting reconciliation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

