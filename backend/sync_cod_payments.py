#!/usr/bin/env python3
"""
COD Payment Sync Script
Updates all TCS customer records with payment information from TCS Payment API
"""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from tcs_payment import TCSPaymentAPI

load_dotenv()

async def sync_all_cod_payments():
    """Sync COD payment data for all TCS customers"""
    
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get TCS credentials
    config = await db.tcs_config.find_one({'service': 'tcs_pakistan'}, {'_id': 0})
    if not config:
        print("❌ TCS not configured")
        return
    
    token = config.get('bearer_token')
    customer_no = config.get('customer_no')
    
    # Initialize payment API
    payment_api = TCSPaymentAPI(bearer_token=token, customer_no=customer_no)
    
    # Get ALL TCS customers with Shopify payment data
    customers = await db.customers.find(
        {'tracking_company': 'TCS'},
        {'_id': 0, 'customer_id': 1, 'store_name': 1, 'tracking_number': 1, 'cod_payment_status': 1, 'total_spent': 1, 'payment_status': 1}
    ).to_list(1000)
    
    print(f"🔄 Syncing COD payment data for {len(customers)} TCS customers...")
    
    updated_count = 0
    cod_orders = 0
    prepaid_orders = 0
    errors = 0
    
    for i, customer in enumerate(customers, 1):
        try:
            tracking_number = customer['tracking_number']
            shopify_total = float(customer.get('total_spent', 0))
            shopify_payment_status = customer.get('payment_status', 'pending')
            
            print(f"  {i}/{len(customers)}: {tracking_number} (Shopify: Rs.{shopify_total}, {shopify_payment_status})", end=" ")
            
            # Get payment status using Shopify data as primary source
            payment_data = payment_api.get_payment_status(
                tracking_number, 
                shopify_total=shopify_total, 
                shopify_payment_status=shopify_payment_status
            )
            
            if payment_data.get('success'):
                status = payment_data.get('normalized_status')
                cod_amt = payment_data.get('cod_amount', 0)
                delivery_charges = payment_data.get('delivery_charges', 0)
                
                # Update database with Shopify-based COD data
                await db.customers.update_one(
                    {'customer_id': customer['customer_id'], 'store_name': customer['store_name']},
                    {'$set': {
                        'cod_payment_status': status,
                        'cod_amount': cod_amt,
                        'amount_paid': payment_data.get('paid_amount', 0.0),
                        'payment_balance': payment_data.get('balance', 0.0),
                        'delivery_charges': delivery_charges,
                        'parcel_weight': payment_data.get('parcel_weight', 0),
                        'booking_date': payment_data.get('booking_date'),
                        'delivery_date': payment_data.get('delivery_date')
                    }}
                )
                
                if status == 'PAID':
                    print(f"✅ PAID: Rs.{cod_amt} (DC: Rs.{delivery_charges})")
                    prepaid_orders += 1
                else:
                    print(f"💰 COD: Rs.{cod_amt} (DC: Rs.{delivery_charges})")
                    cod_orders += 1
                    
                updated_count += 1
                
            else:
                print(f"❌ {payment_data.get('message')}")
                errors += 1
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            errors += 1
    
    print(f"\n🎯 COD Payment Sync Complete!")
    print(f"  📊 Total Processed: {len(customers)}")
    print(f"  ✅ Updated: {updated_count}")
    print(f"  💰 COD Orders: {cod_orders}")
    print(f"  💳 Prepaid Orders: {prepaid_orders}")
    print(f"  ❌ Errors: {errors}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(sync_all_cod_payments())