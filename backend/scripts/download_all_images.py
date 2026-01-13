#!/usr/bin/env python3
"""
Download all product and banner images locally for Shopify independence.
This script downloads images from Shopify CDN and stores them locally.
"""

import os
import sys
import asyncio
import aiohttp
import hashlib
from pathlib import Path
from pymongo import MongoClient
from urllib.parse import urlparse
import json
from datetime import datetime

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'shopify_customers_db')
BASE_DIR = Path(os.environ.get('IMAGES_BASE_DIR', '/var/www/wamerce/backend/static/uploads'))
IMAGES_DIR = BASE_DIR / 'products'
BANNERS_DIR = BASE_DIR / 'banners'
MAX_CONCURRENT = 20

# Create directories
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
BANNERS_DIR.mkdir(parents=True, exist_ok=True)

client = MongoClient(MONGO_URL)
db = client[DB_NAME]


def get_image_filename(url, product_id, index):
    """Generate a unique filename for the image"""
    ext = Path(urlparse(url).path).suffix or '.jpg'
    if '?' in ext:
        ext = ext.split('?')[0]
    return f"{product_id}_{index}{ext}"


async def download_image(session, url, dest_path, semaphore):
    """Download a single image"""
    async with semaphore:
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status == 200:
                    content = await response.read()
                    with open(dest_path, 'wb') as f:
                        f.write(content)
                    return True, url, str(dest_path)
                else:
                    return False, url, f"HTTP {response.status}"
        except Exception as e:
            return False, url, str(e)


async def download_all_product_images(store_name=None):
    """Download all product images"""
    query = {}
    if store_name:
        query['store_name'] = store_name
    
    products = list(db.shopify_products.find(query, {'shopify_product_id': 1, 'images': 1, 'store_name': 1, 'title': 1}))
    
    print(f"\n📦 Found {len(products)} products to process")
    
    tasks = []
    image_map = {}  # Map old URLs to new local paths
    
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    
    async with aiohttp.ClientSession() as session:
        for product in products:
            product_id = product.get('shopify_product_id')
            store = product.get('store_name', 'default')
            images = product.get('images', [])
            
            store_dir = IMAGES_DIR / store
            store_dir.mkdir(parents=True, exist_ok=True)
            
            for i, img in enumerate(images):
                url = img.get('src')
                if not url:
                    continue
                
                filename = get_image_filename(url, product_id, i)
                dest_path = store_dir / filename
                
                # Skip if already downloaded
                if dest_path.exists():
                    local_url = f"/api/static/uploads/products/{store}/{filename}"
                    image_map[url] = local_url
                    continue
                
                task = download_image(session, url, dest_path, semaphore)
                tasks.append((task, url, str(dest_path), store, filename))
        
        if tasks:
            print(f"⬇️  Downloading {len(tasks)} images...")
            results = await asyncio.gather(*[t[0] for t in tasks])
            
            success = 0
            failed = 0
            for (result, task_info) in zip(results, tasks):
                is_success, url, info = result
                _, orig_url, dest, store, filename = task_info
                if is_success:
                    success += 1
                    local_url = f"/api/static/uploads/products/{store}/{filename}"
                    image_map[orig_url] = local_url
                else:
                    failed += 1
                    print(f"  ❌ Failed: {orig_url[:50]}... - {info}")
            
            print(f"✅ Downloaded: {success}, ❌ Failed: {failed}")
        else:
            print("✅ All images already downloaded!")
    
    return image_map


async def download_all_banner_images():
    """Download all banner images"""
    banners = list(db.storefront_banners.find({}, {'image_url': 1, 'store_name': 1, '_id': 1}))
    
    print(f"\n🎨 Found {len(banners)} banners to process")
    
    tasks = []
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    
    async with aiohttp.ClientSession() as session:
        for banner in banners:
            url = banner.get('image_url')
            store = banner.get('store_name', 'default')
            banner_id = str(banner.get('_id'))
            
            if not url or url.startswith('/api/'):
                continue
            
            store_dir = BANNERS_DIR / store
            store_dir.mkdir(parents=True, exist_ok=True)
            
            ext = Path(urlparse(url).path).suffix or '.jpg'
            filename = f"{banner_id}{ext}"
            dest_path = store_dir / filename
            
            if dest_path.exists():
                continue
            
            task = download_image(session, url, dest_path, semaphore)
            tasks.append((task, url, str(dest_path)))
        
        if tasks:
            print(f"⬇️  Downloading {len(tasks)} banner images...")
            results = await asyncio.gather(*[t[0] for t in tasks])
            
            success = sum(1 for r in results if r[0])
            print(f"✅ Downloaded: {success} banners")


def update_product_images_to_local(image_map):
    """Update product image URLs in database to local paths"""
    print(f"\n🔄 Updating {len(image_map)} image URLs in database...")
    
    updated = 0
    for product in db.shopify_products.find({'images': {'$exists': True, '$ne': []}}):
        images = product.get('images', [])
        modified = False
        
        for img in images:
            old_url = img.get('src')
            if old_url in image_map:
                img['original_src'] = old_url  # Keep original URL
                img['src'] = image_map[old_url]
                modified = True
        
        if modified:
            db.shopify_products.update_one(
                {'_id': product['_id']},
                {'$set': {'images': images, 'images_localized': True}}
            )
            updated += 1
    
    print(f"✅ Updated {updated} products with local image URLs")


def export_full_backup():
    """Export full database backup as JSON"""
    print("\n💾 Creating full JSON backup...")
    
    backup_dir = BASE_DIR / 'backups'
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    collections = ['shopify_products', 'shopify_collections', 'stores', 'storefront_banners', 
                   'storefront_menus', 'storefront_tags', 'orders', 'customers']
    
    backup_data = {}
    for coll_name in collections:
        docs = list(db[coll_name].find())
        # Convert ObjectId to string
        for doc in docs:
            doc['_id'] = str(doc['_id'])
        backup_data[coll_name] = docs
        print(f"  📁 {coll_name}: {len(docs)} documents")
    
    backup_file = backup_dir / f"wamerce_backup_{timestamp}.json"
    with open(backup_file, 'w') as f:
        json.dump(backup_data, f, default=str, indent=2)
    
    print(f"✅ Backup saved to: {backup_file}")
    return backup_file


async def main():
    print("=" * 60)
    print("🚀 WAMERCE IMAGE DOWNLOAD & BACKUP SCRIPT")
    print("=" * 60)
    
    # Download product images
    image_map = await download_all_product_images()
    
    # Download banner images
    await download_all_banner_images()
    
    # Update database with local URLs (optional - uncomment if needed)
    # update_product_images_to_local(image_map)
    
    # Create full backup
    backup_file = export_full_backup()
    
    print("\n" + "=" * 60)
    print("✅ COMPLETE!")
    print(f"   Images: {IMAGES_DIR}")
    print(f"   Banners: {BANNERS_DIR}")
    print(f"   Backup: {backup_file}")
    print("=" * 60)


if __name__ == '__main__':
    asyncio.run(main())
