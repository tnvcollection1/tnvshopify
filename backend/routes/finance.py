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


@finance_router.get("/status")
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


@finance_router.post("/upload-purchase-orders")
async def upload_purchase_orders(file: UploadFile = File(...), store_name: str = None):
    """
    Upload Purchase Order Excel file and reconcile with Shopify orders.
    Expected columns: SHOPIFY ID, SKU, AWB (tracking), SELL AMOUNT, COST
    Matches by: Order # (SHOPIFY ID), SKU, AWB (tracking number), SELL AMOUNT
    """
    import pandas as pd
    from io import BytesIO
    from datetime import datetime, timezone
    
    try:
        logger.info(f"📤 Uploading purchase order file: {file.filename}")
        
        # Read file content
        content = await file.read()
        
        # Parse Excel file
        df = pd.read_excel(BytesIO(content))
        
        # Normalize column names (handle variations)
        column_mapping = {
            'SHOPIFY ID': 'shopify_id',
            'Shopify ID': 'shopify_id', 
            'ORDER': 'shopify_id',
            'Order': 'shopify_id',
            'ORDER #': 'shopify_id',
            'Order #': 'shopify_id',
            'ORDER#': 'shopify_id',
            'PURCHASE ORDER': 'shopify_id',
            'SKU': 'sku',
            'Sku': 'sku',
            'AWB': 'awb',
            'Awb': 'awb',
            'TRACKING': 'awb',
            'DTDC': 'awb',
            'DTDC TRACKING': 'awb',
            'DTDC TRACKING NUMBER': 'awb',
            'TRACKING NUMBER': 'awb',
            'SELL AMOUNT': 'sell_amount',
            'SELL': 'sell_amount',
            'AMOUNT': 'sell_amount',
            'SALE': 'sell_amount',
            'SALE AMOUNT': 'sell_amount',
            'COST': 'cost',
            'Cost': 'cost',
            'PURCHASE COST': 'cost'
        }
        
        df.columns = [column_mapping.get(col.strip(), col.strip().lower().replace(' ', '_')) for col in df.columns]
        
        # Convert to records
        records = df.to_dict('records')
        
        # Get all Shopify orders for matching
        query = {}
        if store_name and store_name != 'all':
            query['store_name'] = store_name
            
        shopify_orders = await db.customers.find(
            query,
            {"_id": 0, "name": 1, "tracking_number": 1, "line_items": 1, "total_price": 1, "financial_status": 1}
        ).to_list(100000)
        
        # Build lookup maps
        order_by_name = {}
        order_by_tracking = {}
        for order in shopify_orders:
            name = str(order.get('name', '')).strip()
            if name:
                order_by_name[name] = order
                # Also try without # prefix
                order_by_name[name.replace('#', '')] = order
            tracking = str(order.get('tracking_number', '')).strip()
            if tracking:
                order_by_tracking[tracking.upper()] = order
        
        # Process and reconcile each record
        matched = 0
        unmatched = 0
        reconciled_records = []
        
        for record in records:
            shopify_id = str(record.get('shopify_id', '')).strip()
            sku = str(record.get('sku', '')).strip()
            awb = str(record.get('awb', '')).strip().upper()
            sell_amount = float(record.get('sell_amount', 0) or 0)
            cost = float(record.get('cost', 0) or 0)
            
            if not shopify_id and not awb:
                continue
                
            # Try to match
            matched_order = None
            match_type = None
            
            # Match by Order ID
            if shopify_id and shopify_id in order_by_name:
                matched_order = order_by_name[shopify_id]
                match_type = 'order_id'
            # Match by AWB/Tracking
            elif awb and awb in order_by_tracking:
                matched_order = order_by_tracking[awb]
                match_type = 'tracking'
            
            # Verify amount match
            amount_match = False
            shopify_amount = 0
            if matched_order:
                shopify_amount = float(matched_order.get('total_price', 0) or 0)
                # Allow 5% tolerance
                if sell_amount > 0:
                    diff = abs(shopify_amount - sell_amount) / sell_amount
                    amount_match = diff < 0.05
            
            # Calculate profit
            profit = sell_amount - cost if sell_amount and cost else 0
            
            reconciled_record = {
                'id': str(len(reconciled_records) + 1),
                'shopify_id': shopify_id,
                'sku': sku,
                'awb': awb,
                'sell_amount': sell_amount,
                'cost': cost,
                'profit': profit,
                'matched': matched_order is not None,
                'match_type': match_type,
                'amount_match': amount_match,
                'shopify_order_name': matched_order.get('name') if matched_order else None,
                'shopify_amount': shopify_amount,
                'shopify_payment_status': matched_order.get('financial_status') if matched_order else None,
                'status': 'matched' if matched_order and amount_match else 'partial' if matched_order else 'unmatched',
                'uploaded_at': datetime.now(timezone.utc).isoformat(),
                'store_name': store_name
            }
            
            reconciled_records.append(reconciled_record)
            if matched_order:
                matched += 1
            else:
                unmatched += 1
        
        # Store reconciled records
        if reconciled_records:
            await db.purchase_order_reconciliation.delete_many({'store_name': store_name})
            await db.purchase_order_reconciliation.insert_many(reconciled_records)
        
        return {
            'success': True,
            'message': f'Reconciled {len(reconciled_records)} records',
            'total_records': len(reconciled_records),
            'matched': matched,
            'unmatched': unmatched,
            'match_rate': f"{(matched/len(reconciled_records)*100):.1f}%" if reconciled_records else "0%"
        }
        
    except Exception as e:
        logger.error(f"❌ Error uploading purchase orders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@finance_router.get("/purchase-order-reconciliation")
async def get_purchase_order_reconciliation(store_name: str = None, status: str = None):
    """
    Get purchase order reconciliation results
    """
    try:
        query = {}
        if store_name and store_name != 'all':
            query['store_name'] = store_name
        if status and status != 'all':
            query['status'] = status
            
        records = await db.purchase_order_reconciliation.find(query, {"_id": 0}).to_list(10000)
        
        # Calculate summary
        total = len(records)
        matched = sum(1 for r in records if r.get('matched'))
        unmatched = total - matched
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
                'unmatched': unmatched,
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

