"""
Shopify Order Synchronization Module
Fetches orders from Shopify stores and syncs to database
"""
import shopify
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class ShopifyOrderSync:
    def __init__(self, shop_url: str, access_token: str, api_version: str = "2024-01"):
        """
        Initialize Shopify session
        
        Args:
            shop_url: Shopify store URL (e.g., tnvcollectonpk.myshopify.com)
            access_token: Store access token
            api_version: Shopify API version
        """
        self.shop_url = shop_url.replace('http://', '').replace('https://', '').strip('/')
        self.access_token = access_token
        self.api_version = api_version
        self.session = None
        
    def connect(self):
        """Establish connection to Shopify store"""
        try:
            self.session = shopify.Session(self.shop_url, self.api_version, self.access_token)
            shopify.ShopifyResource.activate_session(self.session)
            logger.info(f"Connected to Shopify store: {self.shop_url}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Shopify: {str(e)}")
            return False
    
    def disconnect(self):
        """Close Shopify connection"""
        if self.session:
            shopify.ShopifyResource.clear_session()
            logger.info(f"Disconnected from Shopify store: {self.shop_url}")
    
    def fetch_orders(self, limit: int = 250, status: str = "any", created_after: Optional[str] = None, fetch_all: bool = False) -> List[Dict]:
        """
        Fetch orders from Shopify with since_id pagination support
        
        Args:
            limit: Number of orders to fetch per page (max 250)
            status: Order status filter (any, open, closed, cancelled)
            created_after: Fetch orders created after this date (ISO format)
            fetch_all: If True, fetches ALL orders using pagination (ignores limit)
            
        Returns:
            List of parsed order dictionaries
        """
        if not self.connect():
            return []
        
        try:
            all_parsed_orders = []
            per_page = 250  # Shopify max limit
            batch_count = 0
            last_id = None
            
            while True:
                batch_count += 1
                
                # Build parameters
                params = {
                    'limit': per_page,
                    'status': status,
                    'order': 'id asc'  # Important: order by ID ascending for since_id pagination
                }
                
                if created_after:
                    params['created_at_min'] = created_after
                
                if last_id:
                    params['since_id'] = last_id
                
                logger.info(f"Fetching batch {batch_count} (limit: {per_page}, since_id: {last_id})...")
                orders = shopify.Order.find(**params)
                
                if not orders or len(orders) == 0:
                    logger.info(f"No more orders found. Total fetched: {len(all_parsed_orders)}")
                    break
                
                # Parse orders from this batch
                parsed_count = 0
                for order in orders:
                    parsed_order = self._parse_order(order)
                    if parsed_order:
                        all_parsed_orders.append(parsed_order)
                        parsed_count += 1
                    last_id = order.id  # Update last_id for next iteration
                
                logger.info(f"Batch {batch_count}: Fetched {len(orders)} orders, parsed {parsed_count}. Total: {len(all_parsed_orders)}")
                
                # If not fetching all, stop after first batch
                if not fetch_all:
                    break
                
                # If we got fewer orders than the limit, we've reached the end
                if len(orders) < per_page:
                    logger.info(f"Reached end (batch had {len(orders)} < {per_page} orders). Total: {len(all_parsed_orders)}")
                    break
                
                # Safety limit: stop after 200 batches (50,000 orders) to prevent infinite loops
                if batch_count >= 200:
                    logger.warning(f"Reached safety limit of 200 batches. Total orders fetched: {len(all_parsed_orders)}")
                    break
            
            logger.info(f"✅ Sync completed: Fetched {len(all_parsed_orders)} total orders from Shopify in {batch_count} batches")
            return all_parsed_orders
            
        except Exception as e:
            logger.error(f"❌ Error fetching orders: {str(e)}")
            return []
        finally:
            self.disconnect()
    
    def _parse_order(self, order) -> Optional[Dict]:
        """
        Parse Shopify order object into our database format
        
        Returns:
            Dictionary with customer and order data
        """
        try:
            customer = order.customer
            
            # Handle orders without customer data - create a fallback customer_id from order
            customer_id = f"order_{order.id}"
            first_name = ''
            last_name = ''
            email = getattr(order, 'email', '') or ''
            phone = getattr(order, 'phone', '') or ''
            
            if customer:
                customer_id = f"shopify_{getattr(customer, 'id', order.id)}" if getattr(customer, 'id', None) else f"order_{order.id}"
                first_name = getattr(customer, 'first_name', '') or ''
                last_name = getattr(customer, 'last_name', '') or ''
                email = getattr(customer, 'email', '') or email
                phone = getattr(customer, 'phone', '') or phone
                # Try to get phone from default address if not on customer
                if not phone and getattr(customer, 'default_address', None):
                    phone = getattr(customer.default_address, 'phone', '') or ''
            
            # IMPORTANT: Try to get phone from shipping_address if still not found
            if not phone and getattr(order, 'shipping_address', None):
                phone = getattr(order.shipping_address, 'phone', '') or ''
            
            # Try billing_address as last resort
            if not phone and getattr(order, 'billing_address', None):
                phone = getattr(order.billing_address, 'phone', '') or ''
            
            # Get name from shipping address if customer name is empty
            if not first_name and getattr(order, 'shipping_address', None):
                first_name = getattr(order.shipping_address, 'first_name', '') or ''
                last_name = getattr(order.shipping_address, 'last_name', '') or ''
            
            # Get country code from shipping address
            country_code = ''
            if getattr(order, 'shipping_address', None):
                country_code = getattr(order.shipping_address, 'country_code', '') or ''
            
            # Extract customer info
            customer_data = {
                'shopify_order_id': str(order.id),
                'order_number': order.order_number,
                'order_number_int': int(order.order_number) if order.order_number and str(order.order_number).isdigit() else 0,
                'customer_id': customer_id,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'phone': phone,
                'country_code': country_code,
                'order_date': order.created_at,
                'total_price': float(order.total_price) if order.total_price else 0.0,
                'financial_status': order.financial_status,
                'payment_status': order.financial_status,  # paid, pending, refunded, partially_refunded, voided, authorized
                'payment_method': getattr(order, 'gateway', None),
                'fulfillment_status': order.fulfillment_status or 'unfulfilled',
                'line_items': [],
                'fulfillments': [],
                'tracking_info': None,
                'refunds': [],
                'return_status': None,  # New field for return tracking
                'cancelled_at': getattr(order, 'cancelled_at', None),
                'cancel_reason': getattr(order, 'cancel_reason', None),
            }
            
            # Extract line items with SKUs
            line_items = getattr(order, 'line_items', []) or []
            for item in line_items:
                customer_data['line_items'].append({
                    'product_id': getattr(item, 'product_id', None),
                    'variant_id': getattr(item, 'variant_id', None),
                    'sku': getattr(item, 'sku', '') or '',
                    'name': getattr(item, 'name', ''),
                    'quantity': getattr(item, 'quantity', 1),
                    'price': float(getattr(item, 'price', 0) or 0)
                })
            
            # Extract fulfillment and tracking info
            fulfillments = getattr(order, 'fulfillments', []) or []
            for fulfillment in fulfillments:
                tracking_number = getattr(fulfillment, 'tracking_number', '') or ''
                tracking_company = getattr(fulfillment, 'tracking_company', '') or 'TCS Pakistan'
                tracking_url = getattr(fulfillment, 'tracking_url', '') or ''
                
                fulfillment_data = {
                    'id': getattr(fulfillment, 'id', None),
                    'status': getattr(fulfillment, 'status', ''),
                    'tracking_company': tracking_company,
                    'tracking_number': tracking_number,
                    'tracking_url': tracking_url,
                    'created_at': getattr(fulfillment, 'created_at', None)
                }
                customer_data['fulfillments'].append(fulfillment_data)
                
                # Set fulfilled_at from first fulfillment
                if not customer_data.get('fulfilled_at') and fulfillment_data['created_at']:
                    customer_data['fulfilled_at'] = fulfillment_data['created_at']
                
                # Set primary tracking info from first fulfillment
                if not customer_data['tracking_info'] and tracking_number:
                    customer_data['tracking_info'] = {
                        'tracking_number': tracking_number,
                        'tracking_company': tracking_company,
                        'tracking_url': tracking_url or self._generate_tcs_tracking_url(tracking_number)
                    }
            
            # Extract refund and return information
            refunds = getattr(order, 'refunds', []) or []
            for refund in refunds:
                refund_data = {
                    'id': getattr(refund, 'id', None),
                    'created_at': getattr(refund, 'created_at', None),
                    'note': getattr(refund, 'note', ''),
                    'restock': getattr(refund, 'restock', False),
                    'transactions': [],
                    'refund_line_items': [],
                }
                
                # Get refund transactions
                transactions = getattr(refund, 'transactions', []) or []
                for txn in transactions:
                    refund_data['transactions'].append({
                        'amount': float(getattr(txn, 'amount', 0) or 0),
                        'kind': getattr(txn, 'kind', ''),
                        'gateway': getattr(txn, 'gateway', ''),
                    })
                
                # Get refund line items (for partial refunds)
                refund_line_items = getattr(refund, 'refund_line_items', []) or []
                for rli in refund_line_items:
                    refund_data['refund_line_items'].append({
                        'line_item_id': getattr(rli, 'line_item_id', None),
                        'quantity': getattr(rli, 'quantity', 0),
                        'restock_type': getattr(rli, 'restock_type', ''),  # 'return', 'cancel', 'no_restock'
                    })
                    
                    # Check if this is a return (restock_type == 'return')
                    if getattr(rli, 'restock_type', '') == 'return':
                        customer_data['return_status'] = 'return_in_process'
                
                customer_data['refunds'].append(refund_data)
            
            # Determine return status based on refunds and financial status
            if refunds:
                total_refunded = sum(
                    sum(float(getattr(txn, 'amount', 0) or 0) for txn in getattr(r, 'transactions', []) or [])
                    for r in refunds
                )
                if total_refunded > 0:
                    if total_refunded >= customer_data['total_price']:
                        customer_data['return_status'] = 'fully_refunded'
                    else:
                        customer_data['return_status'] = customer_data['return_status'] or 'partially_refunded'
            
            # Also check financial_status for return indicators
            if order.financial_status in ['refunded', 'partially_refunded']:
                if not customer_data['return_status']:
                    customer_data['return_status'] = order.financial_status
            
            return customer_data
            
        except Exception as e:
            logger.error(f"Error parsing order {order.id if hasattr(order, 'id') else 'unknown'}: {str(e)}")
            return None
    
    def _generate_tcs_tracking_url(self, tracking_number: str) -> str:
        """Generate TCS Pakistan tracking URL"""
        if tracking_number:
            # TCS Pakistan tracking URL format
            return f"https://www.tcsexpress.com/track-shipment?tracking_id={tracking_number}"
        return ""
    
    def get_shop_info(self) -> Optional[Dict]:
        """Get basic shop information"""
        if not self.connect():
            return None
        
        try:
            shop = shopify.Shop.current()
            info = {
                'name': shop.name,
                'domain': shop.domain,
                'email': shop.email,
                'currency': shop.currency,
                'timezone': shop.timezone
            }
            return info
        except Exception as e:
            logger.error(f"Error fetching shop info: {str(e)}")
            return None
        finally:
            self.disconnect()
    
    def fetch_products(self, limit: int = 250, fetch_all: bool = True) -> List[Dict]:
        """
        Fetch products from Shopify store
        
        Args:
            limit: Number of products to fetch per page (max 250)
            fetch_all: If True, fetches ALL products using pagination
            
        Returns:
            List of parsed product dictionaries
        """
        if not self.connect():
            return []
        
        try:
            all_products = []
            per_page = min(limit, 250)
            batch_count = 0
            last_id = None
            
            while True:
                batch_count += 1
                
                params = {
                    'limit': per_page,
                }
                
                if last_id:
                    params['since_id'] = last_id
                
                logger.info(f"Fetching products batch {batch_count} (since_id: {last_id})...")
                products = shopify.Product.find(**params)
                
                if not products or len(products) == 0:
                    logger.info(f"No more products. Total fetched: {len(all_products)}")
                    break
                
                for product in products:
                    parsed = self._parse_product(product)
                    if parsed:
                        all_products.append(parsed)
                    last_id = product.id
                
                logger.info(f"Batch {batch_count}: Fetched {len(products)} products. Total: {len(all_products)}")
                
                if not fetch_all:
                    break
                
                if len(products) < per_page:
                    break
                
                # Safety limit
                if batch_count >= 100:
                    logger.warning(f"Reached safety limit of 100 batches. Total: {len(all_products)}")
                    break
            
            logger.info(f"✅ Product sync completed: {len(all_products)} products from Shopify")
            return all_products
            
        except Exception as e:
            logger.error(f"❌ Error fetching products: {str(e)}")
            return []
        finally:
            self.disconnect()
    
    def _parse_product(self, product) -> Optional[Dict]:
        """Parse Shopify product object into database format"""
        try:
            # Get images
            images = []
            for img in getattr(product, 'images', []) or []:
                images.append({
                    'id': getattr(img, 'id', None),
                    'src': getattr(img, 'src', ''),
                    'alt': getattr(img, 'alt', ''),
                })
            
            # Get variants
            variants = []
            for variant in getattr(product, 'variants', []) or []:
                variants.append({
                    'id': getattr(variant, 'id', None),
                    'title': getattr(variant, 'title', ''),
                    'sku': getattr(variant, 'sku', ''),
                    'price': float(getattr(variant, 'price', 0) or 0),
                    'compare_at_price': float(getattr(variant, 'compare_at_price', 0) or 0) if getattr(variant, 'compare_at_price', None) else None,
                    'inventory_quantity': getattr(variant, 'inventory_quantity', 0),
                    'inventory_policy': getattr(variant, 'inventory_policy', ''),
                    'barcode': getattr(variant, 'barcode', ''),
                    'weight': getattr(variant, 'weight', 0),
                    'weight_unit': getattr(variant, 'weight_unit', ''),
                    'option1': getattr(variant, 'option1', ''),
                    'option2': getattr(variant, 'option2', ''),
                    'option3': getattr(variant, 'option3', ''),
                })
            
            # Get first variant price as main price
            main_price = 0
            if variants:
                main_price = variants[0].get('price', 0)
            
            product_data = {
                'shopify_product_id': str(product.id),
                'title': product.title,
                'handle': getattr(product, 'handle', ''),
                'body_html': getattr(product, 'body_html', ''),
                'vendor': getattr(product, 'vendor', ''),
                'product_type': getattr(product, 'product_type', ''),
                'tags': getattr(product, 'tags', ''),
                'status': getattr(product, 'status', 'active'),
                'published_at': getattr(product, 'published_at', None),
                'created_at': getattr(product, 'created_at', None),
                'updated_at': getattr(product, 'updated_at', None),
                'images': images,
                'image_url': images[0]['src'] if images else None,
                'variants': variants,
                'price': main_price,
                'options': [],
            }
            
            # Get options (Size, Color, etc.)
            for opt in getattr(product, 'options', []) or []:
                product_data['options'].append({
                    'name': getattr(opt, 'name', ''),
                    'values': getattr(opt, 'values', []),
                })
            
            return product_data
            
        except Exception as e:
            logger.error(f"Error parsing product {product.id if hasattr(product, 'id') else 'unknown'}: {str(e)}")
            return None

    
    def update_order_note(self, order_id: int, note: str) -> bool:
        """
        Update order note/attributes with 1688 fulfillment info
        
        Args:
            order_id: Shopify order ID
            note: Note to add (e.g., "1688 Order: 123456789")
        
        Returns:
            True if successful, False otherwise
        """
        if not self.session:
            if not self.connect():
                return False
        
        try:
            order = shopify.Order.find(order_id)
            if order:
                # Append to existing note
                existing_note = getattr(order, 'note', '') or ''
                if note not in existing_note:
                    order.note = f"{existing_note}\n{note}".strip()
                    order.save()
                    logger.info(f"Updated order {order_id} note with: {note}")
                    return True
            return False
        except Exception as e:
            logger.error(f"Failed to update order {order_id} note: {str(e)}")
            return False
    
    def add_order_tag(self, order_id: int, tag: str) -> bool:
        """
        Add a tag to a Shopify order
        
        Args:
            order_id: Shopify order ID
            tag: Tag to add (e.g., "1688-ordered")
        
        Returns:
            True if successful, False otherwise
        """
        if not self.session:
            if not self.connect():
                return False
        
        try:
            order = shopify.Order.find(order_id)
            if order:
                existing_tags = getattr(order, 'tags', '') or ''
                tags_list = [t.strip() for t in existing_tags.split(',') if t.strip()]
                if tag not in tags_list:
                    tags_list.append(tag)
                    order.tags = ', '.join(tags_list)
                    order.save()
                    logger.info(f"Added tag '{tag}' to order {order_id}")
                    return True
            return False
        except Exception as e:
            logger.error(f"Failed to add tag to order {order_id}: {str(e)}")
            return False

