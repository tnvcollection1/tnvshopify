"""
Order & Shipment Tracking API Routes
Provides tracking information for orders and DTDC shipments
"""
import logging
from fastapi import APIRouter, HTTPException
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dtdc_tracking_service import dtdc_service

logger = logging.getLogger(__name__)

# Initialize router
tracking_router = APIRouter(prefix="/api/tracking", tags=["tracking"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'shopify_customers_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@tracking_router.get("/{identifier}")
async def get_tracking_info(identifier: str):
    """
    Get tracking information by order number or DTDC tracking ID
    Automatically detects if it's an order number or tracking ID
    
    Args:
        identifier: Order number (e.g., TNV1234) or DTDC tracking (e.g., I76854908)
    """
    try:
        # Try to fetch as order number first
        order_data = await get_order_tracking(identifier)
        
        if order_data:
            # If order has tracking number, fetch DTDC data
            if order_data.get('tracking_number'):
                dtdc_data = dtdc_service.get_tracking_data(order_data['tracking_number'])
                order_data['dtdc_tracking'] = dtdc_data
            
            return {
                'success': True,
                'type': 'order',
                'data': order_data
            }
        
        # If not found as order, try as DTDC tracking number
        dtdc_data = dtdc_service.get_tracking_data(identifier)
        
        if dtdc_data.get('success'):
            # Try to find associated order
            order = await db.customers.find_one(
                {'tracking_number': identifier},
                {'_id': 0}
            )
            
            return {
                'success': True,
                'type': 'tracking',
                'data': {
                    'dtdc_tracking': dtdc_data,
                    'order': order if order else None
                }
            }
        
        # Not found in either system
        raise HTTPException(
            status_code=404,
            detail='Tracking information not found. Please check the order/tracking number.'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching tracking info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def get_order_tracking(order_number: str) -> Optional[dict]:
    """
    Get order tracking information from database
    
    Args:
        order_number: Order number to search for
        
    Returns:
        Order data dict or None
    """
    try:
        # Search in customers collection
        customer = await db.customers.find_one(
            {'order_number': {'$regex': order_number, '$options': 'i'}},
            {'_id': 0}
        )
        
        if not customer:
            return None
        
        # Build tracking response
        tracking_data = {
            'order_number': customer.get('order_number'),
            'customer_name': f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
            'customer_phone': customer.get('phone'),
            'customer_email': customer.get('email'),
            'store_name': customer.get('store_name'),
            'tracking_number': customer.get('tracking_number'),
            'order_date': customer.get('order_date'),
            'order_status': customer.get('order_status', 'Processing'),
            'total_amount': customer.get('total_price', 0),
            'payment_status': customer.get('payment_status', 'Pending'),
            'shipping_address': {
                'address1': customer.get('shipping_address_1'),
                'address2': customer.get('shipping_address_2'),
                'city': customer.get('shipping_city'),
                'state': customer.get('shipping_province'),
                'pincode': customer.get('shipping_zip'),
                'country': customer.get('shipping_country')
            },
            'items': customer.get('order_skus', []),
            'delivery_status': customer.get('delivery_status'),
            'delivery_date': customer.get('delivery_date')
        }
        
        return tracking_data
        
    except Exception as e:
        logger.error(f"Error fetching order: {str(e)}")
        return None


@tracking_router.get("/dtdc/{tracking_number}")
async def get_dtdc_tracking(tracking_number: str):
    """
    Get DTDC tracking data directly
    
    Args:
        tracking_number: DTDC shipment number
    """
    try:
        result = dtdc_service.get_tracking_data(tracking_number)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=404,
                detail=result.get('error', 'Tracking number not found')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching DTDC tracking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@tracking_router.get("/order/{order_number}")
async def get_order_by_number(order_number: str):
    """
    Get order information by order number
    
    Args:
        order_number: Order number
    """
    try:
        order_data = await get_order_tracking(order_number)
        
        if not order_data:
            raise HTTPException(
                status_code=404,
                detail='Order not found'
            )
        
        return {
            'success': True,
            'data': order_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
