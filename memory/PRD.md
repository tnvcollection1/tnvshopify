# Wamerce - 1688 Integration Platform PRD

## Original Problem Statement
Build a comprehensive integration tool for Shopify stores with 1688.com, Taobao, and Tmall for:
1. **Product Syncing & Scraping**: Reliable scraping of product data (variants, SKUs, prices) with translation
2. **Order Automation & SKU Handling**: Automate placing Shopify orders on 1688 with correct variant selection
3. **Shopify Order Sync**: Sync orders from Shopify stores with performance optimization
4. **Zero-API Product Scraping**: Chrome Extension that scrapes full product details without relying on paid APIs (Dianxiaomi-style)

## Core User Personas
- E-commerce store owners running Shopify stores
- Dropshippers sourcing products from Chinese marketplaces
- Business administrators managing multiple stores

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **3rd Party APIs**: TMAPI (product data fallback), Shopify Admin API, OpenAI GPT-4o (translation)
- **Chrome Extension**: v4.0 for client-side scraping

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

#### 4. Non-Blocking Shopify Sync
- Background job system for order syncing
- Progress polling prevents UI hanging
- Job status tracking in `shopify_sync_jobs` collection

#### 5. Specific Order Sync Endpoint
- `POST /api/shopify/sync-orders/{store_name}` for syncing specific order numbers
- Workaround for production timeout issues

#### 6. Chrome Extension v4.0 (Jan 5, 2026) ✅
- Enhanced scraping of product data directly from 1688 DOM
- Scrapes images from multiple sources (scripts, gallery, DOM)
- Extracts SKU/variant data including color and size
- Download available at `/api/download/chrome-extension`

#### 7. Product Edit Modal Fix (Jan 5, 2026) ✅
- **Issue**: Edit modal showed empty Color/Size fields and 0 images
- **Fix**: 
  - Updated `ProductEditModal.jsx` to parse `props_names` into color/size fields
  - Fixed `fetch_product_details` endpoint to correctly extract TMAPI response
  - Backend now parses variants with proper color/size extraction
- **Result**: Modal now displays 11 images and 50 variants with actual color/size names

#### 8. Multi-Account 1688 OAuth ✅
- Users can connect multiple 1688 accounts
- OAuth flow implemented at `/api/1688/auth/authorize`
- Tokens stored in `alibaba_accounts` collection

---

## Known Issues & Pending Work

### P0 - Critical
- None currently

### P1 - High Priority
1. **Chrome Extension Direct Scraping** (IN PROGRESS)
   - Extension enhanced but untested on actual 1688 pages
   - Goal: Scrape full product data without any API calls
   - Current: Falls back to "Fetch Images & Variants" which uses TMAPI

2. **Shopify Sync Timeout for Large Date Ranges**
   - Syncing >30 days fails due to Cloudflare 100s timeout
   - Workaround: Use specific order sync endpoint
   - Needed: Batch/chunked historical sync UI

3. **Collection/Search Page Scraping**
   - Extension needs testing for bulk scraping from search results
   - Should scrape basic info (title, price, image, ID) from listings

### P2 - Medium Priority
4. **1688 Image Search** - BLOCKED
   - TMAPI `search_by_pic` returns "no Route matched"
   - Likely requires premium TMAPI plan upgrade

5. **Shopify OAuth redirect_uri Issue**
   - Affects new store connections

6. **Publish to Shopify Feature**
   - Build `POST /api/shopify/products/create-batch` endpoint
   - One-click publish scraped products to Shopify

---

## Upcoming Tasks

### Phase 1: Complete Chrome Extension Testing
- Test extension on actual 1688 product pages
- Verify image and variant scraping works
- Test collection/search page scraping

### Phase 2: Publish to Shopify (P1)
- Build product creation endpoint
- Connect UI for one-click publishing
- Handle variant and image upload

### Phase 3: Batch Historical Sync (P1)
- Create UI for month-by-month sync selection
- Process in smaller chunks to avoid timeouts

### Phase 4: Enhanced Features (P2)
- Account selection when placing 1688 orders
- Auto-sync 1688 fulfillment status back to Shopify
- Bulk order from dashboard

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
- `POST /api/1688-scraper/products/{product_id}/fetch-details` - Enrich product with TMAPI

### Product Scraper
- `POST /api/1688-scraper/extension-import` - Chrome extension endpoint
- `PUT /api/1688-scraper/products/{product_id}` - Update scraped product
- `GET /api/download/chrome-extension` - Download extension zip

---

## Key Files

### Backend
- `/app/backend/server.py` - Main server, Shopify sync logic
- `/app/backend/routes/alibaba_1688.py` - 1688 API integration, multi-account OAuth
- `/app/backend/routes/product_scraper.py` - TMAPI import logic, extension import

### Frontend
- `/app/frontend/src/components/ProductEditModal.jsx` - Product editing with variant parsing
- `/app/frontend/src/components/ProductScraper.jsx` - Product importer page
- `/app/frontend/src/components/ProductCollector.jsx` - Dianxiaomi-style product management

### Browser Extension
- `/app/browser-extension/content.js` - v4.0 with enhanced scraping
- `/app/browser-extension/manifest.json` - Extension manifest

---

## Database Collections
- `customers` - Shopify orders
- `scraped_products` - Imported products with variant data
- `product_catalog_1688` - 1688 product catalog
- `shopify_sync_jobs` - Background sync job tracking
- `purchase_orders_1688` - 1688 purchase order records
- `alibaba_accounts` - Connected 1688 accounts with tokens

---

## Credentials (for testing)
- **Admin Login**: admin / Sunny345!
- **TMAPI Token**: Stored in `backend/.env` as `TMAPI_TOKEN`

---

## Last Updated
January 5, 2026 - Product Edit Modal fix (images/variants display) complete
