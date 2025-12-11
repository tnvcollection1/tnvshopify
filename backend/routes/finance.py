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
