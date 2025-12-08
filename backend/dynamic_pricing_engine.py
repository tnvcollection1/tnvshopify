"""
Dynamic Pricing Engine
Analyzes order history to categorize products and apply dynamic pricing
- Fast-moving: Category A
- Medium-moving: Category B
- Slow-moving: Category C (discounted pricing)
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple
from collections import defaultdict

logger = logging.getLogger(__name__)


class DynamicPricingEngine:
    """
    Analyzes product sales velocity and applies category-based pricing
    """
    
    def __init__(self):
        self.categories = {
            'A': {'threshold_percentile': 80, 'discount': 0},  # Top 20% sellers
            'B': {'threshold_percentile': 50, 'discount': 10},  # Middle 30%
            'C': {'threshold_percentile': 0, 'discount': 20}   # Bottom 50% (slow-moving)
        }
    
    async def analyze_product_velocity(self, db, days_lookback: int = 180) -> Dict:
        """
        Analyze product sales velocity over specified period
        
        Args:
            db: MongoDB database instance
            days_lookback: Number of days to analyze (default 180 = 6 months)
            
        Returns:
            Dict with product analysis and categorization
        """
        try:
            # Calculate date threshold
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_lookback)
            
            logger.info(f"🔍 Analyzing product velocity for last {days_lookback} days...")
            
            # Get all orders from inventory_v2 (which has SKU/product data)
            orders = await db.inventory_v2.find({}).to_list(10000)
            
            # Aggregate sales by SKU
            product_sales = defaultdict(lambda: {
                'total_quantity': 0,
                'total_revenue': 0,
                'order_count': 0,
                'last_sale_date': None,
                'product_name': None,
                'current_price': 0,
                'current_stock': 0
            })
            
            for order in orders:
                sku = order.get('sku')
                if not sku:
                    continue
                    
                quantity = order.get('quantity', 0)
                price = order.get('price', 0)
                
                product_sales[sku]['total_quantity'] += quantity
                product_sales[sku]['total_revenue'] += (quantity * price)
                product_sales[sku]['order_count'] += 1
                product_sales[sku]['product_name'] = order.get('product_name', sku)
                product_sales[sku]['current_price'] = price
                product_sales[sku]['current_stock'] = order.get('stock', 0)
                
                # Track last sale date
                created_at = order.get('created_at')
                if created_at:
                    if not product_sales[sku]['last_sale_date'] or created_at > product_sales[sku]['last_sale_date']:
                        product_sales[sku]['last_sale_date'] = created_at
            
            if not product_sales:
                logger.warning("⚠️  No product sales data found")
                return {
                    'success': True,
                    'total_products': 0,
                    'categories': {'A': [], 'B': [], 'C': []},
                    'analysis_period_days': days_lookback
                }
            
            # Calculate velocity scores (sales per day)
            for sku, data in product_sales.items():
                days_since_last_sale = days_lookback
                if data['last_sale_date']:
                    try:
                        last_sale = datetime.fromisoformat(data['last_sale_date'].replace('Z', '+00:00'))
                        days_since_last_sale = (datetime.now(timezone.utc) - last_sale).days
                    except:
                        pass
                
                # Velocity score: average sales per day
                data['velocity_score'] = data['total_quantity'] / max(days_lookback, 1)
                data['days_since_last_sale'] = days_since_last_sale
            
            # Sort by velocity score
            sorted_products = sorted(
                product_sales.items(),
                key=lambda x: x[1]['velocity_score'],
                reverse=True
            )
            
            # Categorize products based on velocity percentiles
            categorized = self._categorize_products(sorted_products)
            
            # Calculate recommended pricing
            pricing_recommendations = self._calculate_pricing(categorized)
            
            logger.info(f"✅ Analysis complete: {len(product_sales)} products categorized")
            
            return {
                'success': True,
                'total_products': len(product_sales),
                'categories': categorized,
                'pricing_recommendations': pricing_recommendations,
                'analysis_period_days': days_lookback,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error analyzing product velocity: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _categorize_products(self, sorted_products: List[Tuple]) -> Dict[str, List]:
        """
        Categorize products into A, B, C based on velocity
        """
        total = len(sorted_products)
        
        # Calculate split points
        a_split = int(total * 0.2)  # Top 20%
        b_split = int(total * 0.5)  # Next 30%
        
        categories = {
            'A': [],  # Fast-moving
            'B': [],  # Medium-moving
            'C': []   # Slow-moving
        }
        
        for idx, (sku, data) in enumerate(sorted_products):
            product_info = {
                'sku': sku,
                'product_name': data['product_name'],
                'total_quantity_sold': data['total_quantity'],
                'total_revenue': round(data['total_revenue'], 2),
                'order_count': data['order_count'],
                'velocity_score': round(data['velocity_score'], 2),
                'days_since_last_sale': data['days_since_last_sale'],
                'current_price': data['current_price'],
                'current_stock': data['current_stock']
            }
            
            if idx < a_split:
                categories['A'].append(product_info)
            elif idx < b_split:
                categories['B'].append(product_info)
            else:
                categories['C'].append(product_info)
        
        return categories
    
    def _calculate_pricing(self, categorized: Dict[str, List]) -> List[Dict]:
        """
        Calculate recommended pricing for each category
        """
        recommendations = []
        
        for category, products in categorized.items():
            discount_percent = self.categories[category]['discount']
            
            for product in products:
                current_price = product['current_price']
                recommended_price = current_price * (1 - discount_percent / 100)
                
                recommendations.append({
                    'sku': product['sku'],
                    'product_name': product['product_name'],
                    'category': category,
                    'current_price': round(current_price, 2),
                    'recommended_price': round(recommended_price, 2),
                    'discount_percent': discount_percent,
                    'velocity_score': product['velocity_score'],
                    'current_stock': product['current_stock'],
                    'days_since_last_sale': product['days_since_last_sale']
                })
        
        return recommendations
    
    async def apply_pricing(self, db, recommendations: List[Dict], auto_apply: bool = False) -> Dict:
        """
        Apply pricing recommendations to inventory
        
        Args:
            db: MongoDB database instance
            recommendations: List of pricing recommendations
            auto_apply: If True, automatically update prices. If False, just return recommendations
            
        Returns:
            Dict with application results
        """
        try:
            if not auto_apply:
                logger.info("📋 Pricing recommendations generated (not applied)")
                return {
                    'success': True,
                    'applied': False,
                    'recommendations_count': len(recommendations),
                    'message': 'Recommendations generated. Set auto_apply=True to apply pricing.'
                }
            
            updated_count = 0
            errors = []
            
            for rec in recommendations:
                try:
                    # Update inventory_v2 with new pricing
                    result = await db.inventory_v2.update_many(
                        {'sku': rec['sku']},
                        {
                            '$set': {
                                'price': rec['recommended_price'],
                                'pricing_category': rec['category'],
                                'discount_percent': rec['discount_percent'],
                                'pricing_updated_at': datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                    
                    if result.modified_count > 0:
                        updated_count += result.modified_count
                        logger.info(f"✅ Updated pricing for {rec['sku']}: ${rec['current_price']} → ${rec['recommended_price']} (Category {rec['category']})")
                    
                except Exception as e:
                    logger.error(f"Error updating {rec['sku']}: {str(e)}")
                    errors.append(f"{rec['sku']}: {str(e)}")
            
            logger.info(f"✅ Pricing update complete: {updated_count} products updated")
            
            return {
                'success': True,
                'applied': True,
                'updated_count': updated_count,
                'total_recommendations': len(recommendations),
                'errors': errors if errors else None
            }
            
        except Exception as e:
            logger.error(f"❌ Error applying pricing: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }


# Global instance
dynamic_pricing_engine = DynamicPricingEngine()
