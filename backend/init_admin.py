"""
Script to initialize the admin user in production database
Run this once after deployment to create the default admin account
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import hashlib
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def init_admin():
    """Initialize admin user in database"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 80)
    print("🚀 ADMIN USER INITIALIZATION")
    print("=" * 80)
    
    # Check if admin already exists
    existing_admin = await db.agents.find_one({"username": "admin"})
    
    if existing_admin:
        print("✅ Admin user already exists!")
        print(f"   Username: {existing_admin.get('username')}")
        print(f"   Full Name: {existing_admin.get('full_name')}")
        print(f"   Role: {existing_admin.get('role')}")
        client.close()
        return
    
    # Create admin user
    admin_password = "admin123"
    hashed_password = hashlib.sha256(admin_password.encode()).hexdigest()
    
    admin_user = {
        "id": "admin-default-user",
        "username": "admin",
        "password": hashed_password,
        "full_name": "Administrator",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.agents.insert_one(admin_user)
    
    print("✅ Admin user created successfully!")
    print(f"   Username: admin")
    print(f"   Password: admin123")
    print(f"   Full Name: Administrator")
    print(f"   Role: admin")
    print("=" * 80)
    print("🎉 You can now login with these credentials!")
    print("=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_admin())
