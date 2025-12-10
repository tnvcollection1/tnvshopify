"""
Product Handle Cache
Fetches and caches Shopify product handles for creating valid product URLs
"""
import shopify
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class ProductHandleCache:
    """Cache for storing product ID to handle mappings"""
    
    def __init__(self):
        self.cache: Dict[str, str] = {}
        self.session = None
    
    def _create_session(self, shop_domain: str, access_token: str):
        """Create Shopify API session"""
        try:
            api_version = '2024-10'
            shop_url = f"https://{shop_domain}"
            self.session = shopify.Session(shop_url, api_version, access_token)
            shopify.ShopifyResource.activate_session(self.session)
            logger.info(f"✅ Shopify session created for {shop_domain}")
        except Exception as e:
            logger.error(f"❌ Failed to create Shopify session: {e}")
            raise
    
    def _close_session(self):
        """Close Shopify API session"""
        if self.session:
            shopify.ShopifyResource.clear_session()
            self.session = None
    
    async def get_product_handle(self, product_id: int, shop_domain: str, access_token: str) -> Optional[str]:
        """
        Get product handle from cache or fetch from Shopify
        
        Args:
            product_id: Shopify product ID
            shop_domain: Store domain
            access_token: Shopify access token
            
        Returns:
            Product handle (slug) or None if not found
        """
        # Check cache first
        cache_key = f"{shop_domain}_{product_id}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Fetch from Shopify
        try:
            self._create_session(shop_domain, access_token)
            product = shopify.Product.find(product_id)
            
            if product and hasattr(product, 'handle'):
                handle = product.handle
                self.cache[cache_key] = handle
                logger.info(f"✅ Cached handle for product {product_id}: {handle}")
                self._close_session()
                return handle
            else:
                logger.warning(f"⚠️  Product {product_id} not found or has no handle")
                self._close_session()
                return None
                
        except Exception as e:
            logger.error(f"❌ Error fetching product handle for {product_id}: {e}")
            self._close_session()
            return None
    
    async def bulk_fetch_handles(self, product_ids: list, shop_domain: str, access_token: str) -> Dict[int, str]:
        """
        Fetch multiple product handles at once
        
        Args:
            product_ids: List of product IDs
            shop_domain: Store domain
            access_token: Shopify access token
            
        Returns:
            Dictionary mapping product_id to handle
        """
        handles = {}
        
        try:
            self._create_session(shop_domain, access_token)
            
            # Fetch in batches of 50 (Shopify limit)
            batch_size = 50
            for i in range(0, len(product_ids), batch_size):
                batch = product_ids[i:i + batch_size]
                
                # Create ID filter string
                id_filter = ','.join(str(pid) for pid in batch)
                products = shopify.Product.find(ids=id_filter, fields='id,handle')
                
                for product in products:
                    if hasattr(product, 'handle'):
                        product_id = int(product.id)
                        handle = product.handle
                        cache_key = f"{shop_domain}_{product_id}"
                        self.cache[cache_key] = handle
                        handles[product_id] = handle
                
                logger.info(f"✅ Fetched {len(products)} product handles (batch {i//batch_size + 1})")
            
            self._close_session()
            
        except Exception as e:
            logger.error(f"❌ Error bulk fetching product handles: {e}")
            self._close_session()
        
        return handles
    
    def get_cached_handle(self, product_id: int, shop_domain: str) -> Optional[str]:
        """Get handle from cache only (no API call)"""
        cache_key = f"{shop_domain}_{product_id}"
        return self.cache.get(cache_key)
    
    def clear_cache(self):
        """Clear all cached handles"""
        self.cache.clear()
        logger.info("🗑️  Product handle cache cleared")


# Global cache instance
product_handle_cache = ProductHandleCache()
