"""
Shopify Tracking Sync Service
Fetches DTDC tracking data from Shopify fulfillments and updates local database
"""
import logging
import os
import httpx
from typing import Dict, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ShopifyTrackingSync:
    """Service to sync tracking data from Shopify fulfillments"""
    
    def __init__(self):
        self.shop_url = os.environ.get('SHOPIFY_SHOP_URL', 'ashmiaa.myshopify.com')
        self.access_token = os.environ.get('SHOPIFY_ACCESS_TOKEN')
        self.api_url = f"https://{self.shop_url}/admin/api/2024-01/graphql.json"
        
    async def sync_tracking_for_orders(self, db, order_ids: List[str] = None) -> Dict:
        """
        Sync tracking data from Shopify fulfillments to local database
        
        Args:
            db: MongoDB database instance
            order_ids: Optional list of specific Shopify order IDs to sync
            
        Returns:
            Dict with sync results
        """
        try:
            # If no specific order IDs provided, get all orders that need tracking sync
            if not order_ids:
                # Get orders that don't have tracking info or need update
                orders = await db.orders.find(
                    {},
                    {"_id": 0, "id": 1, "name": 1}
                ).to_list(1000)
                order_ids = [str(order['id']) for order in orders if order.get('id')]
            
            if not order_ids:
                return {
                    'success': True,
                    'message': 'No orders to sync',
                    'updated': 0
                }
            
            updated_count = 0
            errors = []
            
            # Process orders in batches
            batch_size = 50
            for i in range(0, len(order_ids), batch_size):
                batch_ids = order_ids[i:i + batch_size]
                
                try:
                    # Fetch fulfillment data from Shopify
                    fulfillments = await self._fetch_fulfillments(batch_ids)
                    
                    # Update local database with tracking info
                    for order_id, fulfillment_data in fulfillments.items():
                        try:
                            await self._update_order_tracking(db, order_id, fulfillment_data)
                            updated_count += 1
                        except Exception as e:
                            logger.error(f"Error updating order {order_id}: {str(e)}")
                            errors.append(f"Order {order_id}: {str(e)}")
                            
                except Exception as e:
                    logger.error(f"Error fetching batch: {str(e)}")
                    errors.append(f"Batch error: {str(e)}")
            
            return {
                'success': True,
                'updated': updated_count,
                'total': len(order_ids),
                'errors': errors if errors else None
            }
            
        except Exception as e:
            logger.error(f"Error syncing tracking data: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'updated': 0
            }
    
    async def _fetch_fulfillments(self, order_ids: List[str]) -> Dict[str, Dict]:
        """
        Fetch fulfillment data from Shopify for given order IDs
        
        Returns:
            Dict mapping order_id to fulfillment data
        """
        # Build GraphQL query for multiple orders
        query = """
        query GetOrderFulfillments($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Order {
              id
              name
              fulfillments {
                id
                status
                trackingInfo {
                  company
                  number
                  url
                }
                createdAt
                deliveredAt
              }
            }
          }
        }
        """
        
        # Convert order IDs to Shopify GID format
        gids = [f"gid://shopify/Order/{oid}" for oid in order_ids]
        
        variables = {"ids": gids}
        
        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": self.access_token
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.api_url,
                json={"query": query, "variables": variables},
                headers=headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Shopify API error: {response.status_code}")
            
            data = response.json()
            
            if 'errors' in data:
                raise Exception(f"GraphQL errors: {data['errors']}")
            
            # Parse response and extract tracking info
            result = {}
            for node in data.get('data', {}).get('nodes', []):
                if node and node.get('id'):
                    order_id = node['id'].split('/')[-1]  # Extract ID from GID
                    result[order_id] = self._parse_fulfillment_data(node)
            
            return result
    
    def _parse_fulfillment_data(self, order_node: Dict) -> Dict:
        """
        Parse fulfillment data from Shopify order node
        
        Returns:
            Dict with tracking information
        """
        fulfillments = order_node.get('fulfillments', [])
        
        if not fulfillments:
            return {}
        
        # Get the most recent fulfillment
        fulfillment = fulfillments[-1]
        tracking_info = fulfillment.get('trackingInfo', [])
        
        if not tracking_info:
            return {}
        
        # Get first tracking info (usually there's only one per fulfillment)
        track = tracking_info[0]
        
        return {
            'tracking_company': track.get('company', ''),
            'tracking_number': track.get('number', ''),
            'tracking_url': track.get('url', ''),
            'fulfillment_status': 'fulfilled',
            'delivered_at': fulfillment.get('deliveredAt'),
            'created_at': fulfillment.get('createdAt')
        }
    
    async def _update_order_tracking(self, db, order_id: str, tracking_data: Dict):
        """
        Update order in database with tracking information
        """
        if not tracking_data:
            return
        
        update_data = {
            'tracking_company': tracking_data.get('tracking_company'),
            'tracking_number': tracking_data.get('tracking_number'),
            'tracking_url': tracking_data.get('tracking_url'),
            'fulfillment_status': tracking_data.get('fulfillment_status'),
            'tracking_synced_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        if update_data:
            await db.orders.update_one(
                {'id': int(order_id)},
                {'$set': update_data}
            )
            logger.info(f"Updated tracking for order {order_id}: {update_data.get('tracking_number')}")


# Global instance
shopify_tracking_sync = ShopifyTrackingSync()
