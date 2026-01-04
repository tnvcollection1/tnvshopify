# Wamerce - 1688 Integration Platform PRD

## Original Problem Statement
Build a comprehensive integration tool for Shopify stores with 1688.com, Taobao, and Tmall for:
1. **Product Syncing & Scraping**: Reliable scraping of product data (variants, SKUs, prices) with translation
2. **Order Automation & SKU Handling**: Automate placing Shopify orders on 1688 with correct variant selection
3. **Shopify Order Sync**: Sync orders from Shopify stores with performance optimization

## Core User Personas
- E-commerce store owners running Shopify stores
- Dropshippers sourcing products from Chinese marketplaces
- Business administrators managing multiple stores

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **3rd Party APIs**: TMAPI (product data), Shopify Admin API, OpenAI GPT-4o (translation)

---

## What's Been Implemented

### Completed Features ✅

#### 1. TMAPI Integration (Dec 2024)
- Integrated third-party TMAPI service for reliable product data fetching
- Supports 1688, Taobao, and Tmall products
- Fetches full variant/SKU data including `props_names`, `spec_id`, prices, stock

#### 2. Product Importer (`/product-scraper`)
- TMAPI-powered import for 1688/Taobao/Tmall products
- Chrome extension for bulk product scraping
- Batch import capability

#### 3. SKU/Variant Display Fix (Jan 4, 2026) ✅
- **Issue**: SKU dropdown showed "SKU 1, SKU 2..." instead of descriptive names
- **Fix**: Updated `OrderFulfillmentModal.jsx` to parse `props_names` field
- **Result**: Dropdown now shows "黑色 / 46 - ¥298.00 (100 in stock)"
- **Status**: Working in preview, PENDING PRODUCTION DEPLOYMENT

#### 4. Non-Blocking Shopify Sync
- Background job system for order syncing
- Progress polling prevents UI hanging
- Job status tracking in `shopify_sync_jobs` collection

#### 5. Specific Order Sync Endpoint
- `POST /api/shopify/sync-orders/{store_name}` for syncing specific order numbers
- Workaround for production timeout issues

#### 6. Chrome Extension v2
- Scrapes product IDs from 1688 pages
- Sends to backend for TMAPI import
- Download available at `/api/download/chrome-extension`

---

## Known Issues & Pending Work

### P0 - Critical
- None currently (SKU fix complete, pending deployment)

### P1 - High Priority
1. **Shopify Sync Timeout for Large Date Ranges**
   - Syncing >30 days fails due to Cloudflare 100s timeout
   - Workaround: Use specific order sync endpoint
   - Needed: Batch/chunked historical sync UI

### P2 - Medium Priority
2. **1688 Image Search** - BLOCKED
   - TMAPI `search_by_pic` returns "no Route matched"
   - Likely requires premium TMAPI plan upgrade

3. **Shopify OAuth redirect_uri Issue**
   - Affects new store connections
   - Legacy authentication flow needs update

4. **Legacy User Login Difficulties**
   - Some users experiencing login issues

---

## Upcoming Tasks

### Phase 1: Batch Historical Sync (P1)
- Create UI for month-by-month sync selection
- Process in smaller chunks to avoid timeouts

### Phase 2: Auto-Shopify Integration (P1)
- Push imported products directly to Shopify store
- Auto-sync 1688 fulfillment status back to Shopify

### Phase 3: Enhanced Features (P2)
- Bulk order from dashboard (select multiple orders)
- Universal AI Analytics
- Abandoned Cart Recovery via WhatsApp

---

## Key API Endpoints

### Shopify Sync
- `POST /api/shopify/sync-background/{store_name}` - Start non-blocking sync
- `GET /api/shopify/sync-status/{job_id}` - Check sync progress
- `POST /api/shopify/sync-orders/{store_name}` - Sync specific order numbers

### 1688 Integration
- `GET /api/1688/product-skus/{product_id}` - Fetch SKU/variant data via TMAPI
- `POST /api/1688/create-purchase-order` - Place order on 1688
- `POST /api/1688-scraper/batch-import` - Import products via TMAPI

### Product Scraper
- `POST /api/1688-scraper/extension-import` - Chrome extension endpoint
- `POST /api/1688-scraper/configure-tmapi` - Set TMAPI token
- `GET /api/download/chrome-extension` - Download extension zip

---

## Key Files

### Backend
- `/app/backend/server.py` - Main server, Shopify sync logic
- `/app/backend/routes/alibaba_1688.py` - 1688 API integration
- `/app/backend/routes/product_scraper.py` - TMAPI import logic

### Frontend
- `/app/frontend/src/components/OrderFulfillmentModal.jsx` - SKU dropdown (FIXED)
- `/app/frontend/src/components/StoreSyncPanel.jsx` - Shopify sync UI
- `/app/frontend/src/components/ProductScraper.jsx` - Product importer

---

## Database Collections
- `customers` - Shopify orders
- `scraped_products` - Imported products with variant data
- `product_catalog_1688` - 1688 product catalog
- `shopify_sync_jobs` - Background sync job tracking
- `purchase_orders_1688` - 1688 purchase order records

---

## Credentials (for testing)
- **Admin Login**: admin / Sunny345!
- **TMAPI Token**: Stored in `backend/.env` as `TMAPI_TOKEN`

---

## Last Updated
January 4, 2026 - SKU dropdown fix verified working in preview
