"""
Job Manager Service
Handles background job management for scraping and import tasks
"""

import os
import uuid
from typing import Dict, List, Optional, Callable, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import logging

logger = logging.getLogger(__name__)

# Database connection
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client[os.environ.get('DB_NAME', 'shopify_customers_db')]
    return _db


# In-memory job storage (for quick access)
# For production, consider Redis or database storage
scrape_jobs: Dict[str, Dict] = {}
import_jobs: Dict[str, Dict] = {}


def create_job_id() -> str:
    """Generate a short unique job ID"""
    return str(uuid.uuid4())[:8]


def create_scrape_job(url: str, method: str = "playwright") -> Dict:
    """
    Create a new scrape job and return job data.
    
    Args:
        url: URL to scrape
        method: Scraping method (playwright, http, tmapi)
    
    Returns:
        Job data dictionary
    """
    job_id = create_job_id()
    
    job_data = {
        "job_id": job_id,
        "type": "scrape",
        "status": "created",
        "url": url,
        "method": method,
        "progress": 0,
        "total": 0,
        "products_scraped": 0,
        "products_created": 0,
        "products_translated": 0,
        "errors": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": None,
        "completed_at": None,
    }
    
    scrape_jobs[job_id] = job_data
    return job_data


def create_import_job(product_ids: List[str], source: str = "manual") -> Dict:
    """
    Create a new import job and return job data.
    
    Args:
        product_ids: List of product IDs to import
        source: Source of the import (extension, manual, batch)
    
    Returns:
        Job data dictionary
    """
    job_id = create_job_id()
    
    job_data = {
        "job_id": job_id,
        "type": "import",
        "status": "created",
        "source": source,
        "product_ids": product_ids,
        "total": len(product_ids),
        "progress": 0,
        "imported": 0,
        "failed": 0,
        "translated": 0,
        "errors": [],
        "products": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": None,
        "completed_at": None,
    }
    
    import_jobs[job_id] = job_data
    return job_data


def get_job(job_id: str) -> Optional[Dict]:
    """
    Get job status by ID.
    
    Args:
        job_id: Job ID to look up
    
    Returns:
        Job data or None
    """
    if job_id in scrape_jobs:
        return scrape_jobs[job_id]
    if job_id in import_jobs:
        return import_jobs[job_id]
    return None


def update_job(job_id: str, updates: Dict) -> bool:
    """
    Update job data.
    
    Args:
        job_id: Job ID to update
        updates: Dictionary of fields to update
    
    Returns:
        True if updated, False if job not found
    """
    job = None
    if job_id in scrape_jobs:
        job = scrape_jobs[job_id]
    elif job_id in import_jobs:
        job = import_jobs[job_id]
    
    if not job:
        return False
    
    job.update(updates)
    return True


def complete_job(job_id: str, status: str = "completed") -> bool:
    """
    Mark a job as completed.
    
    Args:
        job_id: Job ID to complete
        status: Final status (completed, failed, cancelled)
    
    Returns:
        True if updated, False if job not found
    """
    return update_job(job_id, {
        "status": status,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    })


def add_job_error(job_id: str, error: str) -> bool:
    """
    Add an error message to a job.
    
    Args:
        job_id: Job ID
        error: Error message
    
    Returns:
        True if added, False if job not found
    """
    job = get_job(job_id)
    if not job:
        return False
    
    job["errors"].append({
        "message": error,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return True


def increment_job_counter(job_id: str, counter: str, amount: int = 1) -> bool:
    """
    Increment a job counter.
    
    Args:
        job_id: Job ID
        counter: Counter name (e.g., 'imported', 'failed')
        amount: Amount to increment
    
    Returns:
        True if incremented, False if job not found
    """
    job = get_job(job_id)
    if not job:
        return False
    
    if counter in job:
        job[counter] += amount
    return True


def cleanup_old_jobs(max_age_hours: int = 24):
    """
    Remove completed jobs older than max_age_hours.
    
    Args:
        max_age_hours: Maximum age in hours for completed jobs
    """
    from datetime import timedelta
    
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    cutoff_str = cutoff.isoformat()
    
    # Cleanup scrape jobs
    to_remove = []
    for job_id, job in scrape_jobs.items():
        if job.get("status") in ["completed", "failed", "cancelled"]:
            completed_at = job.get("completed_at", "")
            if completed_at and completed_at < cutoff_str:
                to_remove.append(job_id)
    
    for job_id in to_remove:
        del scrape_jobs[job_id]
    
    # Cleanup import jobs
    to_remove = []
    for job_id, job in import_jobs.items():
        if job.get("status") in ["completed", "failed", "cancelled"]:
            completed_at = job.get("completed_at", "")
            if completed_at and completed_at < cutoff_str:
                to_remove.append(job_id)
    
    for job_id in to_remove:
        del import_jobs[job_id]


async def run_scrape_job(
    job_id: str,
    url: str,
    store_name: Optional[str],
    create_in_shopify: bool,
    max_products: int,
    translate: bool = True
):
    """
    Run a scrape job in the background.
    
    Args:
        job_id: Job ID
        url: URL to scrape
        store_name: Shopify store name (optional)
        create_in_shopify: Whether to create products in Shopify
        max_products: Maximum products to scrape
        translate: Whether to translate Chinese text
    """
    from services.scraper_service import scrape_collection_with_playwright
    from services.product_fetcher_service import fetch_product_via_tmapi, save_product_to_db
    from services.translation_service import translate_product
    from services.shopify_publishing_service import publish_product_to_shopify
    
    db = get_db()
    
    try:
        update_job(job_id, {
            "status": "scraping",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "phase": "extracting_products",
        })
        
        # Step 1: Extract product IDs using Playwright
        product_ids = await scrape_collection_with_playwright(url, max_products)
        
        if not product_ids:
            update_job(job_id, {
                "status": "failed",
                "phase": "no_products_found",
            })
            add_job_error(job_id, "No products found on the page")
            complete_job(job_id, "failed")
            return
        
        update_job(job_id, {
            "total": len(product_ids),
            "phase": "fetching_details",
        })
        
        logger.info(f"[Job {job_id}] Found {len(product_ids)} products to process")
        
        # Step 2: Fetch full details for each product via TMAPI
        for i, pid in enumerate(product_ids):
            try:
                # Update progress
                progress = int((i + 1) / len(product_ids) * 100)
                update_job(job_id, {
                    "progress": progress,
                    "current_product": pid,
                })
                
                # Fetch product details
                product = await fetch_product_via_tmapi(pid)
                
                if not product:
                    add_job_error(job_id, f"Failed to fetch product {pid}")
                    increment_job_counter(job_id, "failed")
                    continue
                
                increment_job_counter(job_id, "products_scraped")
                
                # Translate if requested
                if translate and product.get("title"):
                    product = await translate_product(product)
                    increment_job_counter(job_id, "products_translated")
                
                # Save to database
                await save_product_to_db(product, translate=False)
                
                # Create in Shopify if requested
                if create_in_shopify and store_name:
                    result = await publish_product_to_shopify(product, store_name)
                    if result.get("success"):
                        increment_job_counter(job_id, "products_created")
                        product["shopify_product_id"] = result.get("shopify_product_id")
                    else:
                        add_job_error(job_id, f"Shopify error for {pid}: {result.get('error')}")
                
            except Exception as e:
                logger.error(f"[Job {job_id}] Error processing {pid}: {e}")
                add_job_error(job_id, f"Error processing {pid}: {str(e)}")
                increment_job_counter(job_id, "failed")
        
        # Mark as completed
        complete_job(job_id, "completed")
        logger.info(f"[Job {job_id}] Completed successfully")
        
    except Exception as e:
        logger.error(f"[Job {job_id}] Fatal error: {e}")
        add_job_error(job_id, f"Fatal error: {str(e)}")
        complete_job(job_id, "failed")


async def run_batch_import(
    job_id: str,
    product_ids: List[str],
    translate: bool = True,
    platform: str = "1688"
):
    """
    Run a batch import job in the background.
    
    Args:
        job_id: Job ID
        product_ids: List of product IDs to import
        translate: Whether to translate Chinese text
        platform: Platform to fetch from (1688, taobao)
    """
    from services.product_fetcher_service import fetch_product_via_tmapi, fetch_taobao_product_via_tmapi, save_product_to_db
    from services.translation_service import translate_product
    
    db = get_db()
    
    try:
        update_job(job_id, {
            "status": "importing",
            "started_at": datetime.now(timezone.utc).isoformat(),
        })
        
        fetch_func = fetch_taobao_product_via_tmapi if platform == "taobao" else fetch_product_via_tmapi
        
        for i, pid in enumerate(product_ids):
            try:
                # Update progress
                progress = int((i + 1) / len(product_ids) * 100)
                update_job(job_id, {
                    "progress": progress,
                    "current_product": pid,
                })
                
                # Fetch product
                product = await fetch_func(pid)
                
                if not product:
                    add_job_error(job_id, f"Failed to fetch {pid}")
                    increment_job_counter(job_id, "failed")
                    continue
                
                # Translate if requested
                if translate and product.get("title"):
                    product = await translate_product(product)
                    increment_job_counter(job_id, "translated")
                
                # Save to database
                await save_product_to_db(product, translate=False)
                increment_job_counter(job_id, "imported")
                
                # Add to products list
                job = get_job(job_id)
                if job:
                    job["products"].append({
                        "product_id": pid,
                        "title": product.get("title", ""),
                        "price": product.get("price", 0),
                        "image": (product.get("images") or [None])[0],
                    })
                
            except Exception as e:
                logger.error(f"[Job {job_id}] Error importing {pid}: {e}")
                add_job_error(job_id, f"Error importing {pid}: {str(e)}")
                increment_job_counter(job_id, "failed")
        
        complete_job(job_id, "completed")
        logger.info(f"[Job {job_id}] Import completed")
        
    except Exception as e:
        logger.error(f"[Job {job_id}] Fatal error: {e}")
        add_job_error(job_id, f"Fatal error: {str(e)}")
        complete_job(job_id, "failed")


async def run_extension_import(
    job_id: str,
    product_ids: List[str],
    translate: bool = True
):
    """
    Run an import job for products collected via browser extension.
    Similar to batch import but with extension-specific logging.
    
    Args:
        job_id: Job ID
        product_ids: List of product IDs from extension
        translate: Whether to translate Chinese text
    """
    from services.product_fetcher_service import fetch_product_via_tmapi, save_product_to_db
    from services.translation_service import translate_product
    from services.tmapi_service import log_tmapi_call
    
    db = get_db()
    
    try:
        update_job(job_id, {
            "status": "importing",
            "source": "extension",
            "started_at": datetime.now(timezone.utc).isoformat(),
        })
        
        for i, pid in enumerate(product_ids):
            try:
                progress = int((i + 1) / len(product_ids) * 100)
                update_job(job_id, {
                    "progress": progress,
                    "current_product": pid,
                })
                
                # Check if already imported
                existing = await db.scraped_products.find_one(
                    {"product_id": pid},
                    {"_id": 0, "product_id": 1}
                )
                
                if existing:
                    logger.info(f"[Job {job_id}] Product {pid} already imported, skipping")
                    increment_job_counter(job_id, "imported")
                    continue
                
                # Fetch via TMAPI
                product = await fetch_product_via_tmapi(pid, log_usage=True)
                
                if not product:
                    add_job_error(job_id, f"TMAPI failed for {pid}")
                    increment_job_counter(job_id, "failed")
                    continue
                
                # Mark source as extension
                product["source"] = "extension"
                product["is_global_api"] = True
                
                # Translate
                if translate:
                    product = await translate_product(product)
                    increment_job_counter(job_id, "translated")
                
                # Save
                await save_product_to_db(product, translate=False)
                increment_job_counter(job_id, "imported")
                
                # Add to products list
                job = get_job(job_id)
                if job:
                    job["products"].append({
                        "product_id": pid,
                        "title": product.get("title", ""),
                        "price": product.get("price", 0),
                        "image": (product.get("images") or [None])[0],
                        "variants_count": len(product.get("variants", [])),
                    })
                
            except Exception as e:
                logger.error(f"[Job {job_id}] Error: {e}")
                add_job_error(job_id, str(e))
                increment_job_counter(job_id, "failed")
        
        complete_job(job_id, "completed")
        
    except Exception as e:
        logger.error(f"[Job {job_id}] Fatal error: {e}")
        complete_job(job_id, "failed")
