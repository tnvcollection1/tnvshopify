#!/usr/bin/env python3
"""
Create Demo User for Meta App Review
"""
import asyncio
import os
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

async def create_demo_user():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'shopify_customers_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Demo user credentials
    username = "demo_reviewer"
    password = "MetaReview2024!"
    
    # Hash password
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    
    # Check if demo user already exists
    existing_user = await db.agents.find_one({"username": username})
    
    if existing_user:
        print(f"✅ Demo user '{username}' already exists!")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        print(f"   Role: demo")
        return
    
    # Create demo user
    demo_user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "password": hashed_password,
        "full_name": "Meta Reviewer",
        "role": "demo",
        "email": "reviewer@meta.com",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None,
        "active": True,
        "permissions": [
            "whatsapp_inbox",
            "whatsapp_templates",
            "whatsapp_campaigns",
            "whatsapp_analytics"
        ]
    }
    
    # Insert into database
    result = await db.agents.insert_one(demo_user)
    
    print("\n" + "="*60)
    print("✅ DEMO USER CREATED SUCCESSFULLY!")
    print("="*60)
    print(f"\n📋 CREDENTIALS FOR META APP REVIEW:")
    print(f"\n   Username: {username}")
    print(f"   Password: {password}")
    print(f"   Role: demo")
    print(f"   Full Name: Meta Reviewer")
    print(f"\n🔒 SECURITY:")
    print(f"   - Can ONLY access WhatsApp CRM features")
    print(f"   - Cannot see Orders, Customers, Inventory")
    print(f"   - Cannot access Settings or Reports")
    print(f"   - Limited to WhatsApp Inbox, Templates, Campaigns, Analytics")
    print(f"\n📝 UPDATE REVIEWER INSTRUCTIONS WITH:")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    print("\n" + "="*60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_demo_user())
