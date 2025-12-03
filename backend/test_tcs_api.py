#!/usr/bin/env python3
"""
Test script to check different TCS tracking API parameter combinations
"""
import requests
import json
from dotenv import load_dotenv
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def get_tcs_token():
    """Get TCS token from database"""
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    config = await db.tcs_config.find_one({"service": "tcs_pakistan"}, {"_id": 0})
    client.close()
    
    if config:
        return config.get('bearer_token')
    return None

def test_tcs_api_variations(tracking_number: str, token: str):
    """Test different parameter combinations for TCS tracking API"""
    
    base_url = "https://ociconnect.tcscourier.com/tracking/api/Tracking/GetDynamicTrackDetail"
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test different parameter names
    param_variations = [
        {"consignee": tracking_number},  # Current implementation
        {"consignment": tracking_number},
        {"consignmentno": tracking_number},
        {"cn": tracking_number},
        {"tracking_number": tracking_number},
        {"awb": tracking_number},
        {"shipment_number": tracking_number}
    ]
    
    print(f"Testing TCS API with tracking number: {tracking_number}")
    print("-" * 60)
    
    for i, params in enumerate(param_variations, 1):
        param_name = list(params.keys())[0]
        print(f"\n{i}. Testing with parameter: {param_name}")
        
        try:
            response = requests.get(base_url, params=params, headers=headers, timeout=10)
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', 'N/A')
                print(f"   Message: {message}")
                
                # Check for checkpoints
                checkpoints = data.get('checkpoints', [])
                delivery_info = data.get('deliveryinfo', [])
                
                if checkpoints:
                    print(f"   ✅ Checkpoints: {len(checkpoints)} found!")
                    print(f"   First checkpoint: {checkpoints[0]}")
                elif delivery_info:
                    print(f"   📍 Delivery Info: {len(delivery_info)} items")
                    print(f"   First item: {delivery_info[0]}")
                else:
                    print(f"   ❌ No checkpoints or delivery info")
                    
                print(f"   Summary: {data.get('shipmentsummary', 'N/A')}")
                
            else:
                print(f"   Error: {response.text[:200]}")
                
        except Exception as e:
            print(f"   Exception: {str(e)}")

# Alternative API endpoints to test
def test_alternative_endpoints(tracking_number: str, token: str):
    """Test alternative TCS API endpoints"""
    
    alternative_urls = [
        "https://ociconnect.tcscourier.com/tracking/api/Tracking/GetTrackDetail",
        "https://ociconnect.tcscourier.com/tracking/api/Track",
        "https://ociconnect.tcscourier.com/api/tracking",
        "https://ociconnect.tcscourier.com/ecom/api/tracking"
    ]
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\n" + "="*60)
    print("TESTING ALTERNATIVE ENDPOINTS")
    print("="*60)
    
    for url in alternative_urls:
        print(f"\nTesting URL: {url}")
        params = {"consignment": tracking_number}  # Use most common param name
        
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Message: {data.get('message', 'N/A')}")
                if data.get('checkpoints'):
                    print(f"✅ Has checkpoints: {len(data['checkpoints'])}")
            else:
                print(f"Error: {response.text[:100]}")
        except Exception as e:
            print(f"Exception: {str(e)}")

async def main():
    """Main test function"""
    
    # Get test tracking number from database
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    customer = await db.customers.find_one(
        {'tracking_company': 'TCS', 'tracking_number': {'$exists': True, '$ne': ''}},
        {'_id': 0, 'tracking_number': 1}
    )
    client.close()
    
    if not customer:
        print("No TCS tracking numbers found in database")
        return
    
    tracking_number = customer['tracking_number']
    
    # Get TCS token
    token = await get_tcs_token()
    if not token:
        print("No TCS token found in database")
        return
    
    print(f"Using token: {token[:20]}...")
    
    # Test parameter variations
    test_tcs_api_variations(tracking_number, token)
    
    # Test alternative endpoints
    test_alternative_endpoints(tracking_number, token)

if __name__ == "__main__":
    asyncio.run(main())