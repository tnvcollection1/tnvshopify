"""
Smart Inventory Clearance Engine
AI-powered inventory analysis and clearance recommendations
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import os

logger = logging.getLogger(__name__)

# Thresholds for inventory categorization
DEAD_STOCK_DAYS = 360  # 1 year without sales
SLOW_MOVING_DAYS = 180  # 6 months
MODERATE_DAYS = 90  # 3 months


class InventoryClearanceEngine:
    """Engine for analyzing inventory and generating clearance recommendations"""
    
    def __init__(self, db):
        self.db = db
        self.emergent_key = os.environ.get('EMERGENT_LLM_KEY')
    
    async def analyze_inventory_health(self, store_name: str = None) -> Dict:
        """
        Analyze inventory health and categorize items
        """
        try:
            query = {}
            if store_name:
                query['store_name'] = store_name
            
            # Get all inventory items - try inventory_v2 first (main collection)
            items = await self.db.inventory_v2.find(query, {'_id': 0}).to_list(10000)
            
            if not items:
                # Try inventory collection as fallback
                items = await self.db.inventory.find(query, {'_id': 0}).to_list(10000)
            
            if not items:
                # Try inventory_cache collection
                items = await self.db.inventory_cache.find(query, {'_id': 0}).to_list(10000)
            
            if not items:
                return {
                    'success': False, 
                    'error': 'No inventory data found. Please sync inventory from Shopify first (Settings > Sync Inventory).'
                }
            
            # Build a lookup of last sale dates from customer orders
            sales_pipeline = [
                {'$unwind': '$line_items'},
                {'$group': {
                    '_id': '$line_items.sku',
                    'last_sale_date': {'$max': '$last_order_date'},
                    'total_orders': {'$sum': 1},
                    'total_quantity_sold': {'$sum': '$line_items.quantity'}
                }},
                {'$match': {'_id': {'$ne': None}}}
            ]
            
            sales_data = await self.db.customers.aggregate(sales_pipeline).to_list(50000)
            sales_lookup = {s['_id']: s for s in sales_data}
            
            # Enrich inventory items with sales data
            for item in items:
                sku = item.get('sku')
                if sku and sku in sales_lookup:
                    sales_info = sales_lookup[sku]
                    item['last_sale_date'] = sales_info.get('last_sale_date')
                    item['total_orders'] = sales_info.get('total_orders', 0)
                    item['total_quantity_sold'] = sales_info.get('total_quantity_sold', 0)
                return {
                    'success': False, 
                    'error': 'No inventory data found. Please sync inventory from Shopify first (Settings > Sync Inventory).'
                }
            
            now = datetime.now(timezone.utc)
            
            categories = {
                'dead_stock': [],      # 360+ days
                'slow_moving': [],     # 180-360 days
                'moderate': [],        # 90-180 days
                'healthy': [],         # < 90 days
                'no_data': []          # No sales data
            }
            
            total_dead_value = 0
            total_slow_value = 0
            
            for item in items:
                last_sale = item.get('last_sale_date') or item.get('last_sold_at')
                quantity = item.get('quantity', 0)
                price = item.get('price', 0) or item.get('compare_at_price', 0)
                
                if quantity <= 0:
                    continue  # Skip out of stock items
                
                item_value = quantity * price
                
                if not last_sale:
                    # Check created_at as fallback
                    created = item.get('created_at') or item.get('synced_at')
                    if created:
                        try:
                            if isinstance(created, str):
                                created_date = datetime.fromisoformat(created.replace('Z', '+00:00'))
                            else:
                                created_date = created
                            days_since = (now - created_date).days
                            if days_since >= DEAD_STOCK_DAYS:
                                item['days_without_sale'] = days_since
                                item['category'] = 'dead_stock'
                                item['inventory_value'] = item_value
                                categories['dead_stock'].append(item)
                                total_dead_value += item_value
                            elif days_since >= SLOW_MOVING_DAYS:
                                item['days_without_sale'] = days_since
                                item['category'] = 'slow_moving'
                                item['inventory_value'] = item_value
                                categories['slow_moving'].append(item)
                                total_slow_value += item_value
                            else:
                                categories['no_data'].append(item)
                        except:
                            categories['no_data'].append(item)
                    else:
                        categories['no_data'].append(item)
                    continue
                
                try:
                    if isinstance(last_sale, str):
                        last_sale_date = datetime.fromisoformat(last_sale.replace('Z', '+00:00'))
                    else:
                        last_sale_date = last_sale
                    
                    days_since_sale = (now - last_sale_date).days
                    item['days_without_sale'] = days_since_sale
                    item['inventory_value'] = item_value
                    
                    if days_since_sale >= DEAD_STOCK_DAYS:
                        item['category'] = 'dead_stock'
                        categories['dead_stock'].append(item)
                        total_dead_value += item_value
                    elif days_since_sale >= SLOW_MOVING_DAYS:
                        item['category'] = 'slow_moving'
                        categories['slow_moving'].append(item)
                        total_slow_value += item_value
                    elif days_since_sale >= MODERATE_DAYS:
                        item['category'] = 'moderate'
                        categories['moderate'].append(item)
                    else:
                        item['category'] = 'healthy'
                        categories['healthy'].append(item)
                        
                except Exception as e:
                    logger.error(f"Error parsing date for {item.get('sku')}: {e}")
                    categories['no_data'].append(item)
            
            # Sort by days without sale (worst first)
            for cat in ['dead_stock', 'slow_moving', 'moderate']:
                categories[cat] = sorted(
                    categories[cat], 
                    key=lambda x: x.get('days_without_sale', 0), 
                    reverse=True
                )
            
            return {
                'success': True,
                'summary': {
                    'total_items': len(items),
                    'dead_stock_count': len(categories['dead_stock']),
                    'slow_moving_count': len(categories['slow_moving']),
                    'moderate_count': len(categories['moderate']),
                    'healthy_count': len(categories['healthy']),
                    'no_data_count': len(categories['no_data']),
                    'dead_stock_value': round(total_dead_value, 2),
                    'slow_moving_value': round(total_slow_value, 2),
                    'total_at_risk_value': round(total_dead_value + total_slow_value, 2)
                },
                'categories': {
                    'dead_stock': categories['dead_stock'][:50],  # Limit for response
                    'slow_moving': categories['slow_moving'][:50],
                    'moderate': categories['moderate'][:30]
                },
                'thresholds': {
                    'dead_stock_days': DEAD_STOCK_DAYS,
                    'slow_moving_days': SLOW_MOVING_DAYS,
                    'moderate_days': MODERATE_DAYS
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing inventory health: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_ai_recommendations(self, items: List[Dict]) -> Dict:
        """
        Get AI-powered discount recommendations for clearance items
        """
        try:
            if not items:
                return {'success': False, 'error': 'No items provided'}
            
            if not self.emergent_key:
                return {'success': False, 'error': 'Emergent LLM key not configured'}
            
            from emergentintegrations.llm.chat import chat, LLMConfig
            
            # Prepare item summary for AI
            items_summary = []
            for item in items[:20]:  # Limit to 20 items for token efficiency
                items_summary.append({
                    'sku': item.get('sku'),
                    'title': item.get('title', '')[:50],
                    'days_without_sale': item.get('days_without_sale', 0),
                    'quantity': item.get('quantity', 0),
                    'current_price': item.get('price', 0),
                    'original_price': item.get('compare_at_price', 0),
                    'inventory_value': item.get('inventory_value', 0)
                })
            
            prompt = f"""You are an e-commerce inventory optimization expert. Analyze these slow-moving/dead stock items and recommend clearance discount percentages.

Items to analyze:
{items_summary}

For each item, recommend:
1. Discount percentage (10-70%)
2. Priority (high/medium/low)
3. Brief reasoning

Consider:
- Days without sale (longer = higher discount)
- Inventory quantity (higher stock = more urgent)
- Inventory value at risk
- Typical clearance strategies

Respond in this JSON format:
{{
  "recommendations": [
    {{
      "sku": "SKU123",
      "discount_percent": 30,
      "priority": "high",
      "reason": "360+ days without sale, high stock"
    }}
  ],
  "overall_strategy": "Brief overall clearance strategy",
  "estimated_recovery": "Estimated % of value recoverable"
}}
"""
            
            config = LLMConfig(
                api_key=self.emergent_key,
                model="gpt-4o-mini"
            )
            
            response = await chat(
                config=config,
                prompt=prompt,
                system="You are an inventory optimization expert. Always respond with valid JSON."
            )
            
            # Parse AI response
            import json
            try:
                # Try to extract JSON from response
                response_text = response.strip()
                if '```json' in response_text:
                    response_text = response_text.split('```json')[1].split('```')[0]
                elif '```' in response_text:
                    response_text = response_text.split('```')[1].split('```')[0]
                
                ai_data = json.loads(response_text)
                return {
                    'success': True,
                    'recommendations': ai_data.get('recommendations', []),
                    'overall_strategy': ai_data.get('overall_strategy', ''),
                    'estimated_recovery': ai_data.get('estimated_recovery', ''),
                    'items_analyzed': len(items_summary)
                }
            except json.JSONDecodeError:
                # Return raw response if JSON parsing fails
                return {
                    'success': True,
                    'raw_recommendations': response,
                    'items_analyzed': len(items_summary)
                }
                
        except Exception as e:
            logger.error(f"Error getting AI recommendations: {e}")
            return {'success': False, 'error': str(e)}
    
    async def create_clearance_campaign(self, items: List[Dict], campaign_name: str = None) -> Dict:
        """
        Create a clearance campaign and store it
        """
        try:
            if not items:
                return {'success': False, 'error': 'No items provided'}
            
            campaign_id = f"clearance_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
            if not campaign_name:
                campaign_name = f"Clearance Sale - {datetime.now(timezone.utc).strftime('%B %Y')}"
            
            campaign = {
                'campaign_id': campaign_id,
                'name': campaign_name,
                'status': 'draft',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'items': [],
                'total_items': 0,
                'total_original_value': 0,
                'total_clearance_value': 0,
                'potential_recovery': 0
            }
            
            for item in items:
                discount = item.get('discount_percent', 20)
                original_price = item.get('price', 0) or item.get('compare_at_price', 0)
                clearance_price = round(original_price * (1 - discount / 100), 2)
                quantity = item.get('quantity', 0)
                
                campaign_item = {
                    'sku': item.get('sku'),
                    'title': item.get('title'),
                    'quantity': quantity,
                    'original_price': original_price,
                    'discount_percent': discount,
                    'clearance_price': clearance_price,
                    'days_without_sale': item.get('days_without_sale', 0),
                    'store_name': item.get('store_name'),
                    'synced_to_shopify': False
                }
                
                campaign['items'].append(campaign_item)
                campaign['total_original_value'] += original_price * quantity
                campaign['total_clearance_value'] += clearance_price * quantity
            
            campaign['total_items'] = len(campaign['items'])
            campaign['potential_recovery'] = round(campaign['total_clearance_value'], 2)
            campaign['discount_amount'] = round(
                campaign['total_original_value'] - campaign['total_clearance_value'], 2
            )
            
            # Save campaign to database
            await self.db.clearance_campaigns.insert_one(campaign)
            
            # Remove _id for response
            campaign.pop('_id', None)
            
            return {
                'success': True,
                'campaign': campaign
            }
            
        except Exception as e:
            logger.error(f"Error creating clearance campaign: {e}")
            return {'success': False, 'error': str(e)}
    
    async def sync_clearance_to_shopify(self, campaign_id: str, store_name: str) -> Dict:
        """
        Sync clearance prices to Shopify
        """
        try:
            # Get campaign
            campaign = await self.db.clearance_campaigns.find_one(
                {'campaign_id': campaign_id}, {'_id': 0}
            )
            
            if not campaign:
                return {'success': False, 'error': 'Campaign not found'}
            
            # Get store config
            store = await self.db.stores.find_one(
                {'store_name': store_name}, {'_id': 0}
            )
            
            if not store or not store.get('shopify_token'):
                return {'success': False, 'error': 'Store not configured or missing Shopify token'}
            
            import httpx
            
            shop_url = store.get('shop_url') or store.get('shopify_domain')
            token = store.get('shopify_token')
            
            synced = 0
            errors = []
            
            for item in campaign.get('items', []):
                if item.get('store_name') != store_name:
                    continue
                
                sku = item.get('sku')
                clearance_price = item.get('clearance_price')
                original_price = item.get('original_price')
                
                try:
                    # Find variant by SKU
                    async with httpx.AsyncClient() as client:
                        # Search for product by SKU
                        search_url = f"https://{shop_url}/admin/api/2024-01/products.json"
                        headers = {'X-Shopify-Access-Token': token}
                        
                        resp = await client.get(search_url, headers=headers, params={'limit': 250})
                        if resp.status_code != 200:
                            errors.append(f"{sku}: Failed to fetch products")
                            continue
                        
                        products = resp.json().get('products', [])
                        
                        variant_id = None
                        for product in products:
                            for variant in product.get('variants', []):
                                if variant.get('sku') == sku:
                                    variant_id = variant.get('id')
                                    break
                            if variant_id:
                                break
                        
                        if not variant_id:
                            errors.append(f"{sku}: Variant not found")
                            continue
                        
                        # Update variant price
                        update_url = f"https://{shop_url}/admin/api/2024-01/variants/{variant_id}.json"
                        update_data = {
                            'variant': {
                                'id': variant_id,
                                'price': str(clearance_price),
                                'compare_at_price': str(original_price)
                            }
                        }
                        
                        update_resp = await client.put(update_url, headers=headers, json=update_data)
                        
                        if update_resp.status_code == 200:
                            synced += 1
                            logger.info(f"✅ Updated {sku} to clearance price {clearance_price}")
                        else:
                            errors.append(f"{sku}: Update failed - {update_resp.text}")
                            
                except Exception as e:
                    errors.append(f"{sku}: {str(e)}")
            
            # Update campaign status
            await self.db.clearance_campaigns.update_one(
                {'campaign_id': campaign_id},
                {
                    '$set': {
                        'status': 'active' if synced > 0 else 'draft',
                        'synced_at': datetime.now(timezone.utc).isoformat(),
                        'synced_count': synced
                    }
                }
            )
            
            return {
                'success': True,
                'synced': synced,
                'errors': errors if errors else None,
                'message': f"Synced {synced} items to Shopify"
            }
            
        except Exception as e:
            logger.error(f"Error syncing to Shopify: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_clearance_campaigns(self, status: str = None) -> Dict:
        """
        Get all clearance campaigns
        """
        try:
            query = {}
            if status:
                query['status'] = status
            
            campaigns = await self.db.clearance_campaigns.find(
                query, {'_id': 0}
            ).sort('created_at', -1).to_list(100)
            
            return {
                'success': True,
                'campaigns': campaigns,
                'count': len(campaigns)
            }
            
        except Exception as e:
            logger.error(f"Error fetching campaigns: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_clearance_stats(self) -> Dict:
        """
        Get clearance dashboard statistics
        """
        try:
            # Get inventory health summary
            health = await self.analyze_inventory_health()
            
            # Get active campaigns
            active_campaigns = await self.db.clearance_campaigns.count_documents({'status': 'active'})
            
            # Get total cleared value
            pipeline = [
                {'$match': {'status': 'active'}},
                {'$group': {
                    '_id': None,
                    'total_clearance_value': {'$sum': '$total_clearance_value'},
                    'total_items': {'$sum': '$total_items'}
                }}
            ]
            agg_result = await self.db.clearance_campaigns.aggregate(pipeline).to_list(1)
            
            cleared_stats = agg_result[0] if agg_result else {'total_clearance_value': 0, 'total_items': 0}
            
            return {
                'success': True,
                'stats': {
                    'inventory_health': health.get('summary', {}),
                    'active_campaigns': active_campaigns,
                    'items_on_clearance': cleared_stats.get('total_items', 0),
                    'clearance_value': cleared_stats.get('total_clearance_value', 0),
                    'thresholds': health.get('thresholds', {})
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting clearance stats: {e}")
            return {'success': False, 'error': str(e)}
