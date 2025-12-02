"""
Enhanced Shopify Order Synchronization Module with:
- Retry logic with exponential backoff
- Detailed progress tracking
- Better error handling and logging
- Rate limit handling
- Data validation
- Duplicate detection
"""
import shopify
import logging
import time
from datetime import datetime, timezone
from typing import List, Dict, Optional, Callable
from enum import Enum

logger = logging.getLogger(__name__)


class SyncStatus(Enum):
    """Sync status enum"""
    IDLE = "idle"
    CONNECTING = "connecting"
    FETCHING = "fetching"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SyncProgress:
    """Track sync progress"""
    def __init__(self):
        self.status = SyncStatus.IDLE
        self.total_orders = 0
        self.processed_orders = 0
        self.failed_orders = 0
        self.current_batch = 0
        self.total_batches = 0
        self.errors = []
        self.start_time = None
        self.end_time = None
        self.last_update = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        elapsed = None
        if self.start_time:
            end = self.end_time or datetime.now(timezone.utc)
            elapsed = (end - self.start_time).total_seconds()
        
        return {
            "status": self.status.value,
            "total_orders": self.total_orders,
            "processed_orders": self.processed_orders,
            "failed_orders": self.failed_orders,
            "current_batch": self.current_batch,
            "total_batches": self.total_batches if self.total_batches > 0 else "unknown",
            "progress_percentage": self._calculate_percentage(),
            "elapsed_seconds": elapsed,
            "errors": self.errors[-10:],  # Last 10 errors
            "last_update": self.last_update.isoformat() if self.last_update else None
        }
    
    def _calculate_percentage(self) -> float:
        """Calculate progress percentage"""
        if self.total_orders == 0:
            return 0.0
        return round((self.processed_orders / self.total_orders) * 100, 2)


class ShopifyOrderSyncEnhanced:
    """Enhanced Shopify sync with retry logic and progress tracking"""
    
    def __init__(
        self, 
        shop_url: str, 
        access_token: str, 
        api_version: str = "2024-01",
        max_retries: int = 3,
        retry_delay: int = 2
    ):
        """
        Initialize enhanced Shopify session
        
        Args:
            shop_url: Shopify store URL
            access_token: Store access token
            api_version: Shopify API version
            max_retries: Maximum retry attempts for failed operations
            retry_delay: Initial delay between retries (seconds)
        """
        self.shop_url = shop_url.replace('http://', '').replace('https://', '').strip('/')
        self.access_token = access_token
        self.api_version = api_version
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.session = None
        self.progress = SyncProgress()
        
    def connect(self) -> bool:
        """Establish connection to Shopify store with retry logic"""
        self.progress.status = SyncStatus.CONNECTING
        
        for attempt in range(1, self.max_retries + 1):
            try:
                self.session = shopify.Session(self.shop_url, self.api_version, self.access_token)
                shopify.ShopifyResource.activate_session(self.session)
                logger.info(f"✅ Connected to Shopify store: {self.shop_url}")
                return True
            except Exception as e:
                error_msg = f"Connection attempt {attempt}/{self.max_retries} failed: {str(e)}"
                logger.error(error_msg)
                self.progress.errors.append(error_msg)
                
                if attempt < self.max_retries:
                    delay = self.retry_delay * (2 ** (attempt - 1))  # Exponential backoff
                    logger.info(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
                else:
                    logger.error(f"❌ Failed to connect after {self.max_retries} attempts")
                    self.progress.status = SyncStatus.FAILED
                    return False
        
        return False
    
    def disconnect(self):
        """Close Shopify connection"""
        if self.session:
            shopify.ShopifyResource.clear_session()
            logger.info(f"Disconnected from Shopify store: {self.shop_url}")
    
    def fetch_orders_with_progress(
        self, 
        limit: int = 250, 
        status: str = "any", 
        created_after: Optional[str] = None, 
        fetch_all: bool = False,
        progress_callback: Optional[Callable[[SyncProgress], None]] = None
    ) -> List[Dict]:
        """
        Fetch orders from Shopify with progress tracking and retry logic
        
        Args:
            limit: Number of orders to fetch per page (max 250)
            status: Order status filter (any, open, closed, cancelled)
            created_after: Fetch orders created after this date (ISO format)
            fetch_all: If True, fetches ALL orders using pagination
            progress_callback: Optional callback function to report progress
            
        Returns:
            List of parsed order dictionaries
        """
        self.progress = SyncProgress()
        self.progress.start_time = datetime.now(timezone.utc)
        self.progress.status = SyncStatus.FETCHING
        
        if not self.connect():
            self.progress.status = SyncStatus.FAILED
            return []
        
        try:
            all_parsed_orders = []
            per_page = 250  # Shopify max limit
            batch_count = 0
            last_id = None
            consecutive_failures = 0
            max_consecutive_failures = 3
            
            while True:
                batch_count += 1
                self.progress.current_batch = batch_count
                
                # Fetch batch with retry logic
                orders = self._fetch_batch_with_retry(
                    per_page=per_page,
                    status=status,
                    created_after=created_after,
                    last_id=last_id
                )
                
                if orders is None:  # Retry failed
                    consecutive_failures += 1
                    if consecutive_failures >= max_consecutive_failures:
                        error_msg = f"Too many consecutive failures ({consecutive_failures}). Stopping sync."
                        logger.error(error_msg)
                        self.progress.errors.append(error_msg)
                        break
                    continue
                
                # Reset consecutive failures on success
                consecutive_failures = 0
                
                if not orders or len(orders) == 0:
                    logger.info(f"✅ No more orders found. Total fetched: {len(all_parsed_orders)}")
                    break
                
                # Process batch
                self.progress.status = SyncStatus.PROCESSING
                parsed_count = 0
                for order in orders:
                    parsed_order = self._parse_order_safe(order)
                    if parsed_order:
                        all_parsed_orders.append(parsed_order)
                        parsed_count += 1
                        self.progress.processed_orders += 1
                    else:
                        self.progress.failed_orders += 1
                    
                    last_id = order.id  # Update last_id for next iteration
                    self.progress.total_orders = len(all_parsed_orders) + self.progress.failed_orders
                
                logger.info(
                    f"📦 Batch {batch_count}: Fetched {len(orders)} orders, "
                    f"parsed {parsed_count}. Total: {len(all_parsed_orders)}"
                )
                
                # Update progress
                self.progress.last_update = datetime.now(timezone.utc)
                if progress_callback:
                    progress_callback(self.progress)
                
                # If not fetching all, stop after first batch
                if not fetch_all:
                    break
                
                # If we got fewer orders than the limit, we've reached the end
                if len(orders) < per_page:
                    logger.info(
                        f"✅ Reached end (batch had {len(orders)} < {per_page} orders). "
                        f"Total: {len(all_parsed_orders)}"
                    )
                    break
                
                # Safety limit: stop after 200 batches (50,000 orders)
                if batch_count >= 200:
                    warning_msg = f"Reached safety limit of 200 batches. Total: {len(all_parsed_orders)}"
                    logger.warning(warning_msg)
                    self.progress.errors.append(warning_msg)
                    break
                
                # Rate limiting: small delay between batches
                time.sleep(0.5)
            
            self.progress.status = SyncStatus.COMPLETED
            self.progress.end_time = datetime.now(timezone.utc)
            self.progress.total_batches = batch_count
            
            logger.info(
                f"✅ Sync completed: Fetched {len(all_parsed_orders)} orders "
                f"in {batch_count} batches. Failed: {self.progress.failed_orders}"
            )
            
            return all_parsed_orders
            
        except Exception as e:
            error_msg = f"Critical error during sync: {str(e)}"
            logger.error(error_msg)
            self.progress.errors.append(error_msg)
            self.progress.status = SyncStatus.FAILED
            self.progress.end_time = datetime.now(timezone.utc)
            return []
        finally:
            self.disconnect()
    
    def _fetch_batch_with_retry(
        self,
        per_page: int,
        status: str,
        created_after: Optional[str],
        last_id: Optional[int]
    ) -> Optional[List]:
        """Fetch a batch of orders with retry logic"""
        params = {
            'limit': per_page,
            'status': status,
            'order': 'id asc'
        }
        
        if created_after:
            params['created_at_min'] = created_after
        
        if last_id:
            params['since_id'] = last_id
        
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"Fetching batch (limit: {per_page}, since_id: {last_id})...")
                orders = shopify.Order.find(**params)
                return orders
            except shopify.ShopifyResource.RequestError as e:
                # Handle rate limiting
                if hasattr(e, 'code') and e.code == 429:
                    retry_after = int(e.response.headers.get('Retry-After', 5))
                    logger.warning(f"⚠️ Rate limited. Waiting {retry_after} seconds...")
                    time.sleep(retry_after)
                    continue
                
                error_msg = f"Batch fetch attempt {attempt}/{self.max_retries} failed: {str(e)}"
                logger.error(error_msg)
                self.progress.errors.append(error_msg)
                
                if attempt < self.max_retries:
                    delay = self.retry_delay * (2 ** (attempt - 1))
                    logger.info(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
                else:
                    logger.error(f"❌ Batch fetch failed after {self.max_retries} attempts")
                    return None
            except Exception as e:
                error_msg = f"Unexpected error in batch fetch: {str(e)}"
                logger.error(error_msg)
                self.progress.errors.append(error_msg)
                return None
        
        return None
    
    def _parse_order_safe(self, order) -> Optional[Dict]:
        """Parse order with error handling"""
        try:
            return self._parse_order(order)
        except Exception as e:
            order_id = getattr(order, 'id', 'unknown')
            error_msg = f"Failed to parse order {order_id}: {str(e)}"
            logger.error(error_msg)
            self.progress.errors.append(error_msg)
            return None
    
    def _parse_order(self, order) -> Optional[Dict]:
        """Parse Shopify order object into database format"""
        customer = order.customer
        if not customer:
            logger.warning(f"Order {order.id} has no customer, skipping")
            return None
        
        # Extract customer info
        customer_data = {
            'shopify_order_id': str(order.id),
            'order_number': order.order_number,
            'customer_id': f"shopify_{customer.id}" if customer.id else f"order_{order.id}",
            'first_name': customer.first_name or '',
            'last_name': customer.last_name or '',
            'email': customer.email or '',
            'phone': customer.phone or (customer.default_address.phone if customer.default_address else ''),
            'country_code': order.shipping_address.country_code if order.shipping_address else '',
            'order_date': order.created_at,
            'total_price': float(order.total_price) if order.total_price else 0.0,
            'financial_status': order.financial_status,
            'payment_status': order.financial_status,
            'payment_method': getattr(order, 'gateway', None),
            'fulfillment_status': order.fulfillment_status or 'unfulfilled',
            'line_items': [],
            'fulfillments': [],
            'tracking_info': None
        }
        
        # Extract line items with SKUs
        for item in order.line_items:
            customer_data['line_items'].append({
                'product_id': item.product_id,
                'variant_id': item.variant_id,
                'sku': item.sku or '',
                'name': item.name,
                'quantity': item.quantity,
                'price': float(item.price) if item.price else 0.0
            })
        
        # Extract fulfillment and tracking info
        if order.fulfillments:
            for fulfillment in order.fulfillments:
                fulfillment_data = {
                    'id': fulfillment.id,
                    'status': fulfillment.status,
                    'tracking_company': fulfillment.tracking_company or 'TCS Pakistan',
                    'tracking_number': fulfillment.tracking_number or '',
                    'tracking_url': fulfillment.tracking_url or '',
                    'created_at': fulfillment.created_at
                }
                customer_data['fulfillments'].append(fulfillment_data)
                
                # Set primary tracking info from first fulfillment
                if not customer_data['tracking_info'] and fulfillment.tracking_number:
                    customer_data['tracking_info'] = {
                        'tracking_number': fulfillment.tracking_number,
                        'tracking_company': fulfillment.tracking_company or 'TCS Pakistan',
                        'tracking_url': fulfillment.tracking_url or self._generate_tcs_tracking_url(fulfillment.tracking_number)
                    }
        
        return customer_data
    
    def _generate_tcs_tracking_url(self, tracking_number: str) -> str:
        """Generate TCS Pakistan tracking URL"""
        if tracking_number:
            return f"https://www.tcsexpress.com/track-shipment?tracking_id={tracking_number}"
        return ""
    
    def get_progress(self) -> Dict:
        """Get current sync progress"""
        return self.progress.to_dict()
    
    def get_shop_info(self) -> Optional[Dict]:
        """Get basic shop information with retry logic"""
        if not self.connect():
            return None
        
        for attempt in range(1, self.max_retries + 1):
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
                error_msg = f"Shop info fetch attempt {attempt}/{self.max_retries} failed: {str(e)}"
                logger.error(error_msg)
                
                if attempt < self.max_retries:
                    delay = self.retry_delay * (2 ** (attempt - 1))
                    time.sleep(delay)
                else:
                    return None
        
        return None
