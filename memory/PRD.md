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
- **NEW**: Improved collection/search page scraping with multiple selector patterns
- Download available at `/api/download/chrome-extension`

#### 7. Product Edit Modal Fix (Jan 5, 2026) ✅
- **Issue**: Edit modal showed empty Color/Size fields and 0 images
- **Fix**: 
  - Updated `ProductEditModal.jsx` to parse `props_names` into color/size fields
  - Fixed `fetch_product_details` endpoint to correctly extract TMAPI response
  - Backend now parses variants with proper color/size extraction
  - **Auto-fetch**: Products with 0 variants automatically fetch data when modal opens
- **Result**: Modal now displays 11 images and 50 variants with actual color/size names

#### 8. Multi-Account 1688 OAuth ✅
- Users can connect multiple 1688 accounts
- OAuth flow implemented at `/api/1688/auth/authorize`
- Tokens stored in `alibaba_accounts` collection

#### 9. Publish to Shopify Feature (Jan 5, 2026) ✅ NEW
- **Feature**: One-click publish scraped products to Shopify with all variants and images
- **Endpoint**: `POST /api/1688-scraper/shopify/publish-batch`
- **UI**: Store selector dropdown + "Publish to Shopify" button in Edit modal
- **Price Conversion**: Automatic CNY to target currency with configurable markup
- **Tested**: Successfully published product 850596274690 to Shopify (ID: 10111038882075)

---

## Known Issues & Pending Work

### P0 - Critical
- None currently

### P1 - High Priority
1. **Chrome Extension Direct Scraping** (IN PROGRESS)
   - Extension enhanced but untested on actual 1688 pages
   - Goal: Scrape full product data without any API calls
   - Current: Falls back to "Fetch Images & Variants" which uses TMAPI

2. **Shopify Sync Timeout for Large Date Ranges** ✅ VALIDATED
   - **Fixed**: Syncing >90 days now processes in 30-day chunks
   - **Tested**: 120-day sync completed successfully (336 orders in 4 chunks)
   - **Features**: Deduplication, progress tracking, error handling per chunk

3. **Collection/Search Page Scraping**
   - Extension needs testing for bulk scraping from search results
   - Should scrape basic info (title, price, image, ID) from listings

### P2 - Medium Priority
4. **1688 Image Search** ✅ COMPLETED
   - Implemented `POST /api/1688-scraper/image-search` endpoint
   - Uses TMAPI endpoint `/1688/search/image`
   - UI: Image Search tab with URL input, sort dropdown, search button
   - Results display in grid with Factory badges
   - One-click import to add products to collection

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
January 5, 2026 - Session 10: Fulfillment Pipeline Enhancements (Sync, Export, Analytics, Image Search)

---

## Recent Completed Work (Jan 5, 2026 - Session 10)

### Fulfillment Pipeline Enhancements ✅ (VERIFIED)

**Four New Features Implemented and Tested**:

1. **Auto-Sync from Shopify** ✅
   - "Sync Shopify" button in pipeline header
   - Endpoint: `POST /api/fulfillment/pipeline/sync-from-shopify`
   - Syncs unfulfilled, paid orders into the pipeline

2. **CSV Export/Reporting** ✅
   - "Export CSV" and "Export JSON" buttons
   - Endpoint: `GET /api/fulfillment/pipeline/export?format=csv`
   - Downloads pipeline data with all order details

3. **Analytics Dashboard** ✅
   - "Analytics" button opens modal with:
     - Total Orders, Completed, Stuck (3+ days), Completion Rate
     - Stage Distribution bar chart
   - Endpoint: `GET /api/fulfillment/pipeline/analytics?days=30`

4. **Image Search for Product Linking** ✅
   - Order detail modal has "Find by Image" button
   - Endpoint: `POST /api/fulfillment/pipeline/{order_id}/link-product-by-image`
   - Uses TMAPI image search to find matching 1688 products
   - Links selected product to order

**WhatsApp Notifications** (integrated into stage updates):
- Stage changes automatically trigger WhatsApp notifications
- Manual notify button on order cards
- Endpoints: `POST /api/fulfillment/pipeline/{order_id}/notify-whatsapp`

### Auto-Sync 1688 Fulfillment to Shopify ✅ NEW

**New Service**: `/app/backend/services/shopify_fulfillment_sync.py`

**Features**:
1. **Auto-Sync on Stage Change**: When order reaches `local_shipped` stage, automatically creates fulfillment in Shopify
2. **Manual Sync Button**: "Sync to Shopify" button in pipeline UI syncs all pending orders
3. **Tracking Info Sync**: Sends tracking number and carrier to Shopify
4. **Customer Notification**: Shopify sends fulfillment email to customer

**Endpoints**:
- `POST /api/fulfillment-sync/sync-order/{order_id}` - Sync single order
- `POST /api/fulfillment-sync/sync-stage/local_shipped` - Sync all orders in stage
- `GET /api/fulfillment-sync/pending-sync` - Get orders pending sync
- `GET /api/fulfillment-sync/sync-logs` - View sync history

### Bulk Operations & DWZ Import ✅ NEW (Session 10 Part 2)

**Bulk Stage Updates**:
- "Bulk Update" button in pipeline UI (orange)
- Select multiple orders → choose target stage → update all at once
- Supports optional tracking number for DWZ/local shipped stages
- Endpoint: `POST /api/fulfillment/pipeline/bulk-update-stage`

**Automated DWZ Tracking Import**:
- "Import DWZ" button in pipeline UI (purple)
- Import DWZ tracking numbers via CSV format
- Auto-advances orders to "DWZ56 Shipped" stage (optional)
- Endpoints:
  - `POST /api/fulfillment/pipeline/import-dwz-tracking` - JSON format
  - `POST /api/fulfillment/pipeline/import-dwz-csv` - CSV text format

### DWZ Auto-Sync & Timeline ✅ NEW (Session 10 Part 3)

**Automated DWZ Tracking Fetch**:
- "Sync DWZ" button in pipeline UI (cyan)
- Fetches real-time tracking status from DWZ56 API
- Auto-updates order stages based on DWZ status (Sent → In Transit, Delivered → Warehouse Arrived)
- Logs all syncs to `dwz_sync_logs` collection
- Endpoints:
  - `POST /api/dwz56-sync/sync` - Trigger sync
  - `GET /api/dwz56-sync/tracking/{tracking_number}` - Get single tracking
  - `GET /api/dwz56-sync/sync-logs` - View sync history

**Batch WhatsApp Notifications**:
- "Batch Notify" button in pipeline UI (emerald)
- Send notifications to ALL orders in a specific stage
- Shows order counts per stage before sending
- Endpoint: `POST /api/fulfillment/pipeline/notify-by-stage`

**Order History Timeline**:
- History icon (🔵) on each order card
- Shows complete order timeline with events
- Current status summary with tracking numbers
- Endpoints:
  - `GET /api/dwz56-sync/order-history/{order_id}` - Get timeline
  - `POST /api/dwz56-sync/log-event` - Log custom events

### Scheduled Auto-Sync, Email Notifications & Advanced Analytics ✅ NEW (Session 10 Part 4)

**Scheduled DWZ Auto-Sync (Cron Job)**:
- Added to `/app/backend/scheduler.py`
- Runs every 4 hours automatically
- Fetches tracking from DWZ56 API and updates pipeline
- Logs progress to backend logs

**Email Notifications Service**:
- New service: `/app/backend/services/email_notification_service.py`
- Supports SendGrid and SMTP (fallback)
- Email templates for all 7 pipeline stages
- Endpoints:
  - `GET /api/email-notifications/config` - Check config status
  - `GET /api/email-notifications/templates` - List all templates
  - `PUT /api/email-notifications/templates/{stage}` - Update template
  - `POST /api/email-notifications/send/{order_id}` - Send to order
  - `POST /api/email-notifications/send-by-stage` - Batch send by stage
  - `GET /api/email-notifications/logs` - View send logs
- **Note**: SendGrid/SMTP not configured - templates ready but sending disabled

**Advanced Analytics with Date Range Filtering**:
- Enhanced Analytics modal with 4 tabs:
  1. **Overview**: Total/Completed/Stuck/Rate + Stage Distribution
  2. **Funnel**: Visual conversion funnel with percentages
  3. **Timeline**: Orders over time bar chart + Fastest completions
  4. **Stuck**: List of orders stuck 3+ days with details
- Date range picker (Start Date, End Date, Update button)
- Group by: day/week/month
- Endpoint: `GET /api/fulfillment/pipeline/analytics-advanced`

**Testing**: Iteration 18 - All 26 tests passed (100%)

**CSV Format**:
```
order_number,dwz_tracking
99001,DWZ123456789
99002,DWZ987654321
```

**Bug Fixes**:
- Fixed route ordering - moved `/{order_id}` to end of routes to prevent catching `/export`, `/analytics`
- Fixed store dropdown to handle both array and object API responses
- Fixed order queries to handle both string and integer `order_number` types

**Testing**: 13/13 backend tests passed (100%) - All features verified

### Chrome Extension Testing

**Status**: Extension code is functional, but 1688 uses CAPTCHA/blocking for automated access
- Extension v4 content.js has comprehensive scraping logic
- Must be tested manually by user in real browser with cookies
- Backend `/api/1688-scraper/extension-import` endpoint verified working

---

## Recent Completed Work (Jan 5, 2026 - Session 9)

### Multi-Stage Fulfillment Pipeline ✅

**Flow**: SHOPIFY → 1688 → DWZ56 → TRANSIT → WAREHOUSE ARRIVED → RECEIVED → SHIP TO CUSTOMER

**Store-Specific Carriers**:
- `tnvcollectionpk` → TCS (Pakistan)
- `tnvcollection` → DTDC (India)

**New Components**:
1. **`FulfillmentPipeline.jsx`** - Full pipeline tracking UI with:
   - 7-stage progress visualization
   - Order cards with tracking info
   - Stage filter and search
   - Bulk stage updates
   - Add tracking number modal
   - Store-specific carrier display

2. **`fulfillment_pipeline_service.py`** - Backend service with endpoints:
   - `GET /api/fulfillment/pipeline` - Get orders with current stage
   - `GET /api/fulfillment/pipeline/stats` - Get counts by stage
   - `POST /api/fulfillment/pipeline/{order_id}/update-stage` - Move order to next stage
   - `POST /api/fulfillment/pipeline/{order_id}/add-tracking` - Add tracking number
   - `POST /api/fulfillment/pipeline/bulk-update-stage` - Bulk update
   - `GET /api/fulfillment/carriers` - Get carrier configuration
   - `POST /api/fulfillment/pipeline/sync-from-shopify` - Sync unfulfilled orders

**Database Collections**:
- `fulfillment_pipeline` - Stores order pipeline state
- `customers` - Synced with fulfillment stage

---

## Recent Completed Work (Jan 5, 2026 - Session 8)

### Complete Service Module Refactoring ✅

**Final Line Count**: `product_scraper.py` reduced from **3,355 → 1,756 lines** (~47% reduction, -1,599 lines)

**New Services Created**:
1. `translation_service.py` (132 lines) - Chinese to English translation
2. `product_linking_service.py` (389 lines) - Shopify to 1688 product linking
3. `product_fetcher_service.py` (555 lines) - Product fetching from APIs
4. `scraper_service.py` (373 lines) - Web scraping functions
   - `scrape_product_details()` - Single product scraping
   - `scrape_collection_with_playwright()` - Playwright collection scraping
   - `scrape_collection_page()` - Collection page scraping
   - `extract_product_ids_from_html()` - HTML parsing
5. `job_manager_service.py` (509 lines) - Background job management
   - `run_scrape_job()` - Collection scraping jobs
   - `run_batch_import()` - Batch product imports
   - `run_extension_import()` - Browser extension imports
   - Job status tracking and progress management

**Extended Services**:
- `tmapi_service.py` - Usage summary, import history, stats
- `shopify_publishing_service.py` - Used for product creation

**Total Service Modules**: 11 modules managing distinct functionality

### Session 7 Completed Work (Jan 5, 2026)

### 1. P0 Bug Fix: /purchase-1688 Page ✅
- **Issue**: Page was showing Excel file upload UI instead of purchase orders list
- **Fix**: Completely refactored `Purchase1688Orders.jsx` to:
  - Fetch orders from `/api/1688/purchase-orders` endpoint
  - Display orders in a data table with columns: 1688 Order ID, Product, Shopify #, Supplier Status, DWZ Tracking, Size/Color, Order Status, Created, Actions
  - Status filter dropdown and Shopify Order ID search
  - Order details modal with full API response and fulfillment status section
  - Pagination support
- **Backend Enhancement**: Modified `/api/1688/purchase-orders` endpoint to enrich orders with fulfillment data from `fulfillment_pipeline` and `customers` collections
- **Testing**: 12/12 tests passed (100%)

### 2. Webhook Security Enhancement ✅
- **New Features Added to `/app/backend/services/fulfillment_webhooks.py`**:
  - Rate limiting (100 requests/minute per IP, configurable)
  - IP whitelist support (via WEBHOOK_IP_WHITELIST env var)
  - Timestamp-based replay attack prevention
  - Security event logging to `security_logs` collection
- **New Security Endpoints**:
  - `GET /api/webhooks/fulfillment/security/config` - View security configuration
  - `GET /api/webhooks/fulfillment/security/stats` - Security statistics
  - `GET /api/webhooks/fulfillment/security/logs` - Security event logs
  - `POST /api/webhooks/fulfillment/security/generate-signature` - Generate test signatures
- **Environment Variables**:
  - `WEBHOOK_REQUIRE_SIGNATURE=true/false` - Require signature verification
  - `WEBHOOK_RATE_LIMIT=100` - Requests per minute per IP
  - `WEBHOOK_IP_WHITELIST=ip1,ip2` - Comma-separated IP whitelist

### 3. Shopify Sync Improvement for Large Date Ranges ✅
- **Issue**: Syncing >90 days of orders could timeout
- **Fix**: Modified `run_shopify_sync_background()` in `server.py` to:
  - Process large syncs in 30-day chunks
  - Deduplicate orders after all chunks fetched
  - Better progress reporting with phases
  - Proper error handling per chunk

---

## Recent Completed Work (Jan 5, 2026 - Session 6)

### 1. Service Module Refactoring ✅
- **New Modules Created**:
  - `/app/backend/services/image_search_service.py` - Image search and product linking
  - `/app/backend/services/fulfillment_webhooks.py` - Webhook-based fulfillment sync
  - `/app/backend/services/whatsapp_notifications.py` - Order notifications

### 2. Webhook-Based Fulfillment Sync ✅
- **Endpoints**:
  - `POST /api/webhooks/fulfillment/status-update` - Generic status updates
  - `POST /api/webhooks/fulfillment/dwz56` - DWZ56 shipping webhooks
  - `POST /api/webhooks/fulfillment/1688` - 1688 order webhooks
  - `POST /api/webhooks/fulfillment/test` - Test webhook generation
  - `GET /api/webhooks/fulfillment/logs` - Webhook history
- **Features**:
  - Signature verification (HMAC-SHA256)
  - Status mapping for DWZ56 and 1688
  - Auto-trigger Shopify sync on delivery
  - Webhook logging

### 3. WhatsApp Order Notifications ✅
- **Endpoints**:
  - `POST /api/notifications/whatsapp/send` - Send single notification
  - `POST /api/notifications/whatsapp/send-bulk` - Bulk notifications
  - `GET /api/notifications/whatsapp/templates` - Available templates
  - `GET /api/notifications/whatsapp/logs` - Notification history
- **Templates** (English & Urdu):
  - order_confirmed, order_shipped, order_delivered, order_1688_placed, order_in_transit
- **Fallback**: wa.me links when API token expired

### 4. Dashboard Widget ✅
- `Widget1688Status.jsx` showing order pipeline and quick actions

### Testing: 18/18 tests passed (100%)

---

## All Sessions Summary (Jan 5, 2026)
