"""
Improved CSV Import for Shopify Orders
Handles complete order data including fulfillment status, tracking, cancellations
"""

import csv
import io
from typing import List, Dict
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


def parse_shopify_orders_csv_full(csv_content: str, store_name: str) -> List[Dict]:
    """
    Parse Shopify orders CSV and extract complete order data
    
    Expected CSV columns from Shopify export:
    - Name (Order number like #1001)
    - Email
    - Financial Status (paid, pending, refunded, etc.)
    - Fulfillment Status (fulfilled, unfulfilled, partial)
    - Cancelled at
    - Created at
    - Total
    - Lineitem name
    - Lineitem sku
    - Shipping Name, Shipping Phone
    - Billing Name, Billing Phone
    - Phone
    - Tracking Number (if available)
    - Tags
    """
    
    orders_data = {}
    
    # Parse CSV
    csv_file = io.StringIO(csv_content)
    reader = csv.DictReader(csv_file)
    
    for row in reader:
        # Extract order number (remove # symbol)
        order_number = (row.get('Name') or '').strip().replace('#', '')
        
        if not order_number:
            continue  # Skip rows without order number
        
        # Check if this order already exists in our processing
        if order_number not in orders_data:
            # Extract customer info
            full_name = (row.get('Shipping Name') or 
                        row.get('Billing Name') or 
                        row.get('Name') or '').strip()
            
            # Split name
            name_parts = full_name.split(' ', 1) if full_name else ['', '']
            first_name = name_parts[0] if len(name_parts) > 0 else ''
            last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            # Extract contact info
            email = (row.get('Email') or '').strip()
            phone = (row.get('Shipping Phone') or 
                    row.get('Billing Phone') or 
                    row.get('Phone') or '').strip()
            
            # Extract order details
            created_at = row.get('Created at', '')
            cancelled_at = row.get('Cancelled at', '')
            
            # Extract fulfillment status
            fulfillment_raw = (row.get('Fulfillment Status') or 'unfulfilled').strip().lower()
            if fulfillment_raw in ['fulfilled', 'partial']:
                fulfillment_status = 'fulfilled'
            else:
                fulfillment_status = 'unfulfilled'
            
            # Extract payment status
            financial_status = (row.get('Financial Status') or 'pending').strip().lower()
            
            # Extract total amount
            try:
                total_spent = float(row.get('Total', 0) or 0)
            except:
                total_spent = 0.0
            
            # Extract tracking number (if column exists)
            tracking_number = (row.get('Tracking Number') or 
                             row.get('Tracking Code') or '').strip()
            
            # Extract country
            country_code = (row.get('Shipping Country') or 
                          row.get('Billing Country') or '').strip()
            
            # Create customer_id
            customer_id = f"csv_{store_name}_{order_number}"
            
            orders_data[order_number] = {
                'customer_id': customer_id,
                'order_number': order_number,
                'first_name': first_name,
                'last_name': last_name,
                'email': email if email else None,
                'phone': phone if phone else None,
                'country_code': country_code if country_code else None,
                'last_order_date': created_at if created_at else None,
                'total_spent': total_spent,
                'fulfillment_status': fulfillment_status,
                'payment_status': financial_status,
                'tracking_number': tracking_number if tracking_number else None,
                'cancelled_at': cancelled_at if cancelled_at else None,
                'store_name': store_name,
                'order_count': 1,
                'shoe_sizes': set(),
                'order_skus': set()
            }
        
        # Add line items data
        lineitem_sku = row.get('Lineitem sku', '').strip()
        if lineitem_sku:
            orders_data[order_number]['order_skus'].add(lineitem_sku.upper())
        
        # Extract size from lineitem name
        lineitem_name = row.get('Lineitem name', '')
        if lineitem_name:
            for separator in [' - ', ' / ', ' | ']:
                if separator in lineitem_name:
                    parts = lineitem_name.split(separator)
                    potential_size = parts[-1].strip()
                    if potential_size:
                        orders_data[order_number]['shoe_sizes'].add(potential_size)
                    break
    
    # Convert to list
    orders_list = []
    for order in orders_data.values():
        order['shoe_sizes'] = list(order['shoe_sizes']) if order['shoe_sizes'] else ['Unknown']
        order['order_skus'] = list(order['order_skus'])
        orders_list.append(order)
    
    logger.info(f"Parsed {len(orders_list)} orders from CSV")
    
    # Log cancelled orders
    cancelled_count = sum(1 for o in orders_list if o.get('cancelled_at'))
    fulfilled_count = sum(1 for o in orders_list if o.get('fulfillment_status') == 'fulfilled')
    logger.info(f"  - Fulfilled: {fulfilled_count}")
    logger.info(f"  - Cancelled: {cancelled_count}")
    
    return orders_list
