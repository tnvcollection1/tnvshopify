# WaMerce E-Commerce Management Platform - PRD

## Original Problem Statement
WaMerce is a comprehensive e-commerce management platform for Pakistani businesses that:
1. Syncs orders from multiple Shopify stores
2. Tracks deliveries via TCS Pakistan courier
3. Manages customer WhatsApp communications
4. Provides dynamic pricing intelligence
5. Integrates with 1688 (Alibaba China) for product sourcing and automated fulfillment

## User Personas
- **Store Owner/Admin**: Manages multiple Shopify stores, needs unified dashboard
- **Fulfillment Manager**: Handles order fulfillment from 1688 suppliers to customers
- **Customer Service**: Manages WhatsApp communications and delivery tracking

## Core Features

### Completed Features

#### 1. Shopify Integration
- Multi-store order sync (ashmiaa, tnvcollection, tnvcollectionpk)
- Automatic hourly background sync (enabled Jan 2026)
- Order status tracking (fulfillment, payment, delivery)
- Draft orders sync

#### 2. Delivery Tracking (TCS Pakistan)
- Real-time delivery status updates
- COD payment tracking
- Automatic 2-hour sync cycle

#### 3. 1688 (Alibaba) Integration
- API connection with HMAC-SHA1 signature
- Product catalog sync (32 products from order history)
- Order listing and tracking
- Shipping address management
- Auto-purchase order creation

#### 4. Fulfillment Automation Pipeline
- Shopify → 1688 → DWZ56 workflow
- Product matching to 1688 catalog
- Background auto-purchase processing
- Tracking sync from 1688 suppliers
- DWZ56 shipping integration

#### 5. Background Scheduler
- Hourly Shopify sync for ALL stores
- 2-hour TCS delivery status updates

### In Progress

#### 1688 Fulfillment Automation Enhancements
- Frontend UI for fulfillment pipeline visualization
- Automated tracking polling
- Shopify fulfillment update after DWZ56 shipment

### Known Issues

1. **1688 Product API Authorization (P1)** - Direct product lookup fails with 401; workaround via order history sync
2. **Shopify OAuth redirect_uri (P1)** - May need Partner Dashboard configuration
3. **Data duplication (P2)** - Sync uses customer_id; should use order.id

## Tech Stack
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React on port 3000
- **Database**: MongoDB
- **Scheduler**: APScheduler (background jobs)
- **External APIs**: Shopify Admin API, 1688 Open Platform, TCS Pakistan, DWZ56, WhatsApp Business

## Key API Endpoints

### Shopify
- `POST /api/shopify/sync/{store_name}` - Manual sync
- `GET /api/scheduler/status` - Scheduler status

### 1688 Integration
- `GET /api/1688/health` - API health check
- `GET /api/1688/catalog` - List synced products
- `GET /api/1688/orders` - List 1688 orders
- `POST /api/1688/sync-products-from-orders` - Sync products from order history
- `POST /api/1688/auto-order-from-shopify` - Create 1688 order from Shopify order

### Fulfillment Pipeline
- `GET /api/fulfillment/stats` - Pipeline statistics
- `GET /api/fulfillment/pipeline` - List pipeline orders
- `GET /api/fulfillment/pending-purchase` - Orders awaiting 1688 purchase
- `POST /api/fulfillment/auto-purchase/{customer_id}` - Trigger auto-purchase
- `POST /api/fulfillment/send-to-dwz56/{shopify_order_id}` - Send to DWZ56

## Database Collections
- `customers` - Shopify orders/customers
- `stores` - Store configurations
- `product_catalog_1688` - 1688 product catalog
- `fulfillment_pipeline` - Fulfillment automation records
- `purchase_orders_1688` - 1688 purchase orders

## Environment Variables
- `ALIBABA_1688_APP_KEY` - 1688 App Key (8585237)
- `ALIBABA_1688_APP_SECRET` - 1688 App Secret
- `ALIBABA_1688_ACCESS_TOKEN` - 1688 Access Token
- `SHOPIFY_*` - Shopify credentials per store

## Changelog

### January 3, 2026 (Session 3)
- **1688 Product Importer** (`/product-scraper`) - NEW FEATURE!
  - Import products from 1688 by product IDs or URLs
  - Two methods: "Batch Import by IDs" (recommended) and "Scrape from URL"
  - Uses 1688 API (`alibaba.product.simple.get`) for reliable product data
  - Features:
    - Paste multiple product IDs/URLs (comma, newline, or semicolon separated)
    - Auto-extract product IDs from full 1688 URLs
    - Fetch product details: title, price, images, variants, seller info
    - Background job processing with progress tracking
    - Import directly to Shopify (optional)
    - Search and manage imported products
    - Delete products from local catalog
  - New API endpoints in `/api/1688-scraper/`:
    - `POST /batch-import` - Import multiple products by ID
    - `POST /scrape` - Scrape from 1688 URL (limited by anti-bot)
    - `GET /products` - List imported products with pagination/search
    - `GET /job/{job_id}` - Check import job status
    - `DELETE /products/{product_id}` - Delete imported product
    - `POST /import-to-shopify/{product_id}` - Push to Shopify
  - Added to sidebar navigation under "1688 Scraper"
  - **93% test pass rate** (14/15 tests passed)

### January 3, 2026 (Session 2)
- **1688 Product SKU API Working!**: Successfully integrated `alibaba.product.simple.get` API from the Buyer SDK
  - Now fetches SKU variants (size/color/specId) automatically for products from merchants you've purchased from
  - Dropdown shows all available variants with price and stock info
  - Selecting a variant auto-populates the specId for ordering
- **Order Fulfillment Modal**: Created comprehensive order fulfillment feature for Shopify orders
  - New component `OrderFulfillmentModal.jsx` for per-order fulfillment
  - Accessible via ⚡ button in All Orders table (Dashboard)
  - Features:
    - Add 1688 links to individual products within an order
    - Auto-fetch SKU variants via API (NEW!)
    - Track 1688 Order ID, 1688 Fulfillment ID, DWZ Fulfillment ID
    - Place orders on 1688 with size/color/specId selection
    - Save fulfillment data to database
  - New API endpoints in `/api/fulfillment/`:
    - `GET /order/{order_id}` - Get fulfillment data for an order
    - `PUT /order/{order_id}` - Save/update fulfillment data
    - `GET /orders-with-tracking` - Get all orders with tracking data
- **Access Token Updated**: `70a07ab8-76fa-4f82-b568-6fcf2834b157`

### January 3, 2026 (Session 1)
- **Products Catalog Page** (`/products`) with:
  - Grid/List view for 6,338 Shopify products
  - Search, filter by store, filter by link status
  - **Link to 1688** - Link any Shopify product to its 1688 supplier
  - View linked products on 1688 with one click
  - Stats cards showing products per store
- **1688 Token Updated** - New token `19aec7b8-eaaf-4d06-89fb-459182495953`
- **Shopify Product Sync** - Full sync for ALL stores:
  - `POST /api/shopify/sync-products-all` - Sync ALL stores
  - `GET /api/shopify/products` - List with search & filters
  - **6,338 products synced** from all Shopify stores!
- **Auto-Purchase Toggle** in Bulk Processing:
  - Toggle to enable "Auto-purchase on 1688"
  - Creates 1688 purchase orders automatically
- **Fulfillment Dashboard UI** (`/fulfillment`)
- **Return Status Sync** - Shopify sync captures return_status, refunds
- Enabled automatic hourly Shopify sync for ALL stores

## Roadmap

### P0 (Critical)
- [x] Fix Shopify sync
- [x] Enable automatic hourly sync
- [x] Frontend UI for fulfillment pipeline
- [x] 1688 Purchase Orders with specId handling (UI complete, needs valid specIds from user)
- [x] 1688 Product Importer - Import products by ID or URL

### P1 (High)
- [ ] Auto-create products in Shopify from imported 1688 products (extend importer)
- [ ] Auto-sync 1688 fulfillment status to Shopify orders
- [ ] Bulk order from dashboard (select multiple → order on 1688 in batch)
- [ ] Fix 1688 Product API authorization (user action needed on 1688 console - requires Product API scope)
- [x] Sync return/refund status from Shopify
- [x] Sync Shopify Products (6,338 products)
- [ ] User login issues (credentials work but user reports problems - may need browser cache clear)

### P2 (Medium)
- [ ] Investigate missing Shopify orders #29206 & #29477
- [ ] Fix Shopify OAuth redirect_uri for new stores
- [ ] Refactor sync to use order.id instead of customer_id
- [ ] Background job queue (Celery) for long-running tasks
- [ ] Refactor server.py to separate route files

### P3 (Low)
- [ ] Universal AI Analytics
- [ ] Abandoned Cart Recovery via WhatsApp
- [ ] bepragma.ai features

## Credentials Reference
- **1688 AppKey**: 8585237
- **1688 AccessToken**: 19aec7b8-eaaf-4d06-89fb-459182495953
- **Admin Login**: admin / Sunny345!

## Known Blockers
1. **1688 Product API**: Returns 400 error for `com.alibaba.product/alibaba.cross.syncProductInfo` - user needs to enable Product API scope in 1688 developer console
2. **specId Required**: To place orders with size/color variants, users must manually find and enter the specId from the 1688 product page
