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
                'tracking_info': None
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
