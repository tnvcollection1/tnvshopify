"""
CSV Upload Handler for Shopify Orders
Processes exported CSV from Shopify Admin
"""

import csv
import io
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


def parse_shopify_orders_csv(csv_content: str) -> List[Dict]:
    """
    Parse Shopify orders CSV and extract customer data with sizes
    
    Expected CSV columns from Shopify export:
    - Name, Email, Financial Status, Paid at, Fulfillment Status, Fulfilled at,
    - Accepts Marketing, Currency, Subtotal, Shipping, Taxes, Total, 
    - Discount Code, Discount Amount, Shipping Method, Created at, 
    - Lineitem quantity, Lineitem name, Lineitem price, Lineitem compare at price,
    - Lineitem sku, Lineitem requires shipping, Lineitem taxable, Lineitem fulfillment status,
    - Billing Name, Billing Street, Billing Address1, Billing Address2, 
    - Billing Company, Billing City, Billing Zip, Billing Province, Billing Country,
    - Billing Phone, Shipping Name, Shipping Street, Shipping Address1, 
    - Shipping Address2, Shipping Company, Shipping City, Shipping Zip, 
    - Shipping Province, Shipping Country, Shipping Phone, Notes, Note Attributes,
    - Cancelled at, Payment Method, Payment Reference, Refunded Amount, 
    - Vendor, Id, Tags, Risk Level, Source, Lineitem discount, Tax 1 Name, 
    - Tax 1 Value, Tax 2 Name, Tax 2 Value, Phone, Receipt Number, Duties,
    - Billing Province Name, Shipping Province Name
    """
    
    customer_data = {}
    
    # Parse CSV
    csv_file = io.StringIO(csv_content)
    reader = csv.DictReader(csv_file)
    
    for row in reader:
        # Extract customer phone (prioritize Shipping Phone, then Billing Phone, then Phone)
        phone = (row.get('Shipping Phone') or 
                 row.get('Billing Phone') or 
                 row.get('Phone') or '').strip()
        
        # Extract customer name (prioritize Shipping Name, then Billing Name, then Name)
        full_name = (row.get('Shipping Name') or 
                     row.get('Billing Name') or 
                     row.get('Name') or '').strip()
        
        # Split name into first and last
        name_parts = full_name.split(' ', 1) if full_name else ['', '']
        first_name = name_parts[0] if len(name_parts) > 0 else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Extract email
        email = (row.get('Email') or '').strip()
        
        # Extract country
        country_code = (row.get('Shipping Country') or 
                       row.get('Billing Country') or '').strip()
        
        # Use phone as unique identifier (if no phone, use email, if no email, use name)
        customer_key = phone or email or full_name
        
        if not customer_key:
            continue  # Skip if no identifier
        
        # Initialize customer if new
        if customer_key not in customer_data:
            customer_data[customer_key] = {
                'customer_id': customer_key,
                'first_name': first_name,
                'last_name': last_name,
                'email': email if email else None,
                'phone': phone if phone else None,
                'country_code': country_code if country_code else None,
                'shoe_sizes': set(),
                'order_skus': set(),  # Track SKUs from orders
                'order_count': 0,
                'last_order_date': None,
                'total_spent': 0.0
            }
        
        # Update order count
        customer_data[customer_key]['order_count'] += 1
        
        # Extract SKU from Lineitem sku column
        lineitem_sku = row.get('Lineitem sku', '').strip()
        if lineitem_sku:
            customer_data[customer_key]['order_skus'].add(lineitem_sku.upper())  # Normalize to uppercase
        
        # Extract size from lineitem name
        lineitem_name = row.get('Lineitem name', '')
        if lineitem_name:
            # Try to extract size from the lineitem name
            # Common patterns: "Product Name - Size X", "Product Name / Size X"
            for separator in [' - ', ' / ', ' | ']:
                if separator in lineitem_name:
                    parts = lineitem_name.split(separator)
                    # Last part might be the size
                    potential_size = parts[-1].strip()
                    if potential_size:
                        customer_data[customer_key]['shoe_sizes'].add(potential_size)
                    break
            else:
                # If no separator, mark as Unknown
                customer_data[customer_key]['shoe_sizes'].add('Unknown')
        
        # Update total spent
        try:
            total = float(row.get('Total', 0) or 0)
            customer_data[customer_key]['total_spent'] += total
        except:
            pass
        
        # Update last order date
        created_at = row.get('Created at', '')
        if created_at:
            if not customer_data[customer_key]['last_order_date'] or created_at > customer_data[customer_key]['last_order_date']:
                customer_data[customer_key]['last_order_date'] = created_at
    
    # Convert to list and sets to lists
    customers_list = []
    for customer in customer_data.values():
        customer['shoe_sizes'] = list(customer['shoe_sizes'])
        if not customer['shoe_sizes']:
            customer['shoe_sizes'] = ['Unknown']
        customer['order_skus'] = list(customer['order_skus'])
        customers_list.append(customer)
    
    logger.info(f"Parsed {len(customers_list)} unique customers from CSV")
    return customers_list
