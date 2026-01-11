# Shopify 1688 Integration Platform - PRD

## Original Problem Statement
Build a Shopify application that deeply integrates with 1688.com, Taobao, and Tmall for e-commerce operations.

## Core Requirements

### 1. Product Scraping
- Chrome Extension to collect product information from 1688.com ✅
- "Product Collector" interface (Dianxiaomi-style UI) ✅

### 2. Shopify Integration
- One-click publish to Shopify ✅
- Product linking between Shopify and 1688 ✅
- Data sync management dashboard ✅

### 3. Image Search & Auto-Link
- 1688 image search to find supplier products ✅
- Auto-link Shopify products to 1688 suppliers via image matching ✅

### 4. Order Management
- Link Shopify orders to 1688 products ✅
- Per-SKU ordering and tracking ✅
- Multi-stage fulfillment pipeline ✅

### 5. Admin UI
- Shopify-style admin panel ✅
- Complete data isolation between stores ✅
- Warehouse receiving interface (mobile-friendly) ✅

### 6. Customer Storefront
- Public e-commerce storefront (net-a-porter inspired) ✅
- Storefront CMS for content management ✅

### 7. Competitor Analysis
- Google Vision API for image-based competitor search ✅
- Title-based fallback search ✅
- Currency conversion for price comparisons ✅
- Price alert notifications ✅
- Price comparison dashboard ✅

---

## What's Been Implemented

### Completed Features (as of Jan 11, 2025)

### AI Product Editor (Jan 11, 2025) ✅ NEW
- **New Component**: `/app/frontend/src/components/AIProductEditor.jsx`
- **Backend**: `/app/backend/routes/ai_product_editor.py`
- **Endpoints**:
  - `POST /api/ai-product/generate` - Generate optimized product content
  - `POST /api/ai-product/translate` - Translate text between languages
  - `POST /api/ai-product/improve-title` - Quick title improvement
  - `POST /api/ai-product/bulk-generate` - Bulk content generation
  - `POST /api/ai-product/generate-from-1688/{product_id}` - Generate from scraped product
  - `GET /api/ai-product/history` - View generation history
- **Features**:
  - Takes Chinese product titles and generates English optimized content
  - Generates: Optimized title, SEO title, 5 selling points, description, tags
  - Quick Title Improvement tool
  - Quick Translation tool (Chinese → English)
  - Generation history with reload capability
  - Copy buttons for all generated content
- **Powered by**: OpenAI GPT-4o via Emergent LLM Key
- **Route**: `/ai-product-editor`
- **Sidebar**: Added "AI Product Editor" under "1688 Sourcing" menu

### 1688 Trade API Enabled (Jan 11, 2025) ✅ NEW
- Activated **WaMerce CRM** app (Buyer Connect type)
- **AppKey**: 8585237, **Token**: 70a07ab8-76fa-4f82-b568-6fcf2834b157
- **Working APIs**:
  - `alibaba.trade.getBuyerOrderList` ✅ - List 1688 purchase orders (20 orders fetched)
  - `alibaba.trade.receiveAddress.get` ✅ - Get shipping addresses (1 address found)
  - Order creation and tracking APIs now available

### 1688 Merchants Page (Jan 11, 2025) ✅
- **New Component**: `/app/frontend/src/components/Merchants1688.jsx`
- **Backend Endpoints**:
  - `GET /api/1688-scraper/merchants` - List all merchants with product counts
  - `GET /api/1688-scraper/merchants/{seller_id}/products` - Get products by merchant
  - `GET /api/1688-scraper/merchants/stats` - Get overall statistics
- **Features**:
  - Stats dashboard: Merchants count, Products count, Total Value, Platforms
  - Merchant cards with sample images, product counts, avg/total prices
  - Click merchant → View all products from that merchant
  - Product detail modal with variants, images, pricing
  - Search merchants by name or ID
  - Pagination support
- **Sidebar**: Added "1688 Merchants" under "1688 Sourcing" menu
- **Route**: `/1688-merchants`

### 1688 Merchant Integration API (Jan 11, 2025) ✅
- Refreshed access token for AppKey 8641239
- **Available API Capabilities**:
  - Image search for cross-border products
  - Get Purchased Merchant Information
  - Get information on purchased merchant products
  - Image font detection
  - Product Translation
  - Intelligent product title recommendations

### Cancel 1688 Purchase Feature (Jan 10, 2025) ✅
- **Backend endpoint**: `POST /api/fulfillment/pipeline/orders/{order_id}/cancel-purchase`
- **Functionality**: Unlinks 1688 purchase from Shopify order by:
  - Setting `alibaba_order_id` to null
  - Setting `purchase_status_1688` to 'not_purchased'
  - Resetting order status to 'pending'
  - Storing cancelled purchase info in `cancelled_purchases` array for audit trail
- **Frontend**: Red X icon button (XCircle) in order card action row
  - Only visible on orders with `alibaba_order_id`
  - Shows confirmation dialog with order number and 1688 order ID
  - Toast notification on successful cancellation
  - Auto-refreshes order list after cancellation
- **Tests**: 12/12 passed (100%)

### Restore 1688 Purchase Feature (Jan 10, 2025) ✅ NEW
- **Backend endpoints**:
  - `POST /api/fulfillment/pipeline/orders/{order_id}/restore-purchase` - Restores cancelled purchase
  - `GET /api/fulfillment/pipeline/orders/{order_id}/cancelled-purchases` - Gets cancellation history
- **Functionality**: Re-links cancelled 1688 order to Shopify order by:
  - Setting `alibaba_order_id` from cancelled_purchases history
  - Setting `purchase_status_1688` to 'purchased'
  - Setting order status to 'purchased'
  - Storing restore info in `restore_history` array for audit trail
- **Frontend**: Green circular arrow button (RotateCcw) in order card action row
  - Only visible when order has cancelled_purchases AND no active alibaba_order_id
  - Yellow indicator shows "Has X cancelled purchase(s)"
  - Shows confirmation dialog with order number and 1688 order ID to restore
  - Toast notification on successful restoration
- **Tests**: 10/10 passed (100%), 2 skipped

### Previous Features (as of Jan 9, 2025)
- ✅ Complete e-commerce storefront with Razorpay checkout
- ✅ Order tracking system
- ✅ Storefront CMS with image upload
- ✅ Data Sync Dashboard for Shopify
- ✅ PIN-protected Warehouse Scanning Interface
- ✅ Email notifications via SendGrid (requires API keys)
- ✅ Competitor Price Dashboard with Google Vision API
- ✅ Auto-Link Feature - Bulk linking Shopify products to 1688
- ✅ Admin panel with Shopify-style UI
- ✅ Competitor Title Search Fallback
- ✅ Currency Conversion Service
- ✅ server.py Refactoring (395 lines removed)
- ✅ Price Alert Notifications
- ✅ **Chrome Extension Testing** (Jan 7, 2025)
  - All backend integration tests pass (10/10)
  - Extension supports product detail, store, and search pages
  - Full data scraping: title, images, SKUs, variants, prices
  - README documentation added

### DWZ56 Auto-Shipment Integration (Jan 9, 2025)
- ✅ **Auto-create DWZ56 shipments** when 1688 order is fulfilled
- ✅ **Custom reference number format**: `TNV{COUNTRY}{DATE}{COLOR}{SIZE}{SERIAL}`
  - Example: `TNVIN0901R42001` = TNV + India + Jan 9 + Red + Size 42 + Serial 001
- ✅ **Auto-extract color/size** from Shopify order line items and SKU
- ✅ **Auto-detect courier type** based on store (India → 印度专线, Pakistan → 巴基斯坦专线)
- ✅ **Serial number auto-increment** per day
- ✅ **"Ship to DWZ56" button** in Fulfillment Pipeline modal
- ✅ **Bulk mark-shipped endpoint** for processing multiple orders
- API Endpoints:
  - `POST /api/1688/mark-shipped` - Mark single order as shipped + create DWZ56 shipment
  - `POST /api/1688/mark-shipped-bulk` - Bulk process multiple orders

### Product Approval System (Jan 9, 2025)
- ✅ **Product Approval Page** - Approve draft products to make them visible on storefront
- ✅ **Status filtering** - View products by status (Draft, Active, Archived)
- ✅ **Single product approval** - Approve individual products with one click
- ✅ **Bulk approval** - Select multiple products and approve them all at once
- ✅ **Shopify sync** - Status updates sync to Shopify Admin API in real-time
- ✅ **Status badges** - Visual indicators for Draft (yellow), Active (green), Archived (gray)
- ✅ **Product detail modal** - View product details before approving
- API Endpoints:
  - `GET /api/shopify/products?status=draft` - Get products filtered by status
  - `POST /api/shopify/products/{id}/status` - Update single product status
  - `POST /api/shopify/products/bulk-status` - Bulk update product statuses

### DWZ56 Auto-Sync Scheduler (Jan 9, 2025)
- ✅ **APScheduler Integration** - Background scheduler for automated tasks
- ✅ **Auto-sync Job** - Automatically sync shipped 1688 orders to DWZ56 (runs every 30 minutes)
- ✅ **Package Tracking Job** - Poll DWZ56 API for package status updates (runs every 15 minutes)
- ✅ **Scheduler Management API** - Start/stop scheduler, run jobs manually, view logs
- ✅ **DWZ56 Tracking Dashboard** - New UI page for tracking package status
- ✅ **Status Summary** - Visual dashboard showing Total, Pending, In Transit, At Warehouse, Delivered, Exceptions
- ✅ **Manual Refresh** - Refresh individual package tracking status
- ✅ **Scheduler Modal** - View scheduler status, job schedules, and execution logs
- API Endpoints:
  - `GET /api/dwz56/scheduler/status` - Get scheduler status and job info
  - `POST /api/dwz56/scheduler/start` - Start scheduler
  - `POST /api/dwz56/scheduler/stop` - Stop scheduler
  - `POST /api/dwz56/scheduler/run/{job_id}` - Run job manually
  - `GET /api/dwz56/scheduler/logs` - Get scheduler execution logs
  - `GET /api/dwz56/tracking/summary` - Get tracking status summary
  - `GET /api/dwz56/tracking/pending` - Get pending shipments
  - `GET /api/dwz56/tracking/arrived` - Get shipments arrived at warehouse
  - `GET /api/dwz56/tracking/delivered` - Get delivered shipments
  - `POST /api/dwz56/tracking/refresh/{waybill}` - Refresh single tracking status

### Chrome Extension (Verified Jan 7, 2025)
- Version: 5.0.0 (Manifest V3)
- Backend tests: 10/10 passed
- Supports:
  - Product detail pages (`detail.1688.com/offer/...`)
  - Store listing pages (`*.1688.com/page/offerlist...`)
  - Search results (`s.1688.com/...`)
- Features:
  - Full DOM scraping + window object data extraction
  - Chinese → English translation option
  - Multi-product import
  - Job progress polling

### Price Alert System
- PriceAlertService monitors competitor prices
- Auto-triggers when competitor < your price
- In-app notification bell with unread count
- Email alerts via SendGrid (optional)

### Server.py Refactoring
- Original: 7,205 lines → Current: 6,810 lines
- **Total Removed: 395 lines**

---

## Prioritized Backlog

### P0 - Critical
- None currently blocking

### P1 - High Priority
- None remaining

### P2 - Medium Priority
- Shopify OAuth/session stability fixes (recurring 5+ times)

### P3 - Low Priority
- Additional server.py cleanup

### Completed This Session (Jan 9, 2025)
- ✅ Product Approval System
- ✅ DWZ56 Auto-Sync Scheduler (APScheduler)
- ✅ DWZ56 Package Tracking Dashboard
- ✅ Chrome Extension E2E Testing Guide (updated to v5.0)
- ✅ Sidebar Scrolling Fix

---

## Technical Architecture

### Stack
- Frontend: React + Shadcn UI
- Backend: FastAPI (Python)
- Database: MongoDB
- Browser Extension: Chrome Manifest V3
- External APIs: Shopify, TMAPI (1688), Google Vision, Razorpay, SendGrid

### Key Files
- `/app/backend/server.py` - Main API server (6,810 lines)
- `/app/backend/routes/product_scraper.py` - 1688 scraper + extension import
- `/app/browser-extension/` - Chrome Extension
  - `manifest.json` - Extension config
  - `content.js` - Page scraping (29KB)
  - `popup.js` - UI and API calls (14KB)

### Database Collections
- `stores` - Store configurations
- `shopify_products` - Synced product data
- `scraped_products` - Products from 1688 extension
- `competitor_analyses` - Analysis results
- `notifications` - Price alert notifications

---

## Credentials Required
- Admin Login: `admin` / `admin`
- Warehouse PIN: `1688`
- Google Vision API Key: Configured in .env
- SendGrid API Key: Required for email features
- TMAPI Token: Configured in .env

---

## Known Issues
1. Shopify OAuth sessions may drop intermittently (P2)
2. Some Shopify sync endpoints still duplicated in server.py (P3)

---

## Recent Updates (Jan 7, 2025)

### Price Comparison Catalog
- New `/price-comparison` page showing all products with competitor data
- Columns: Product, Your Price, Competitor (domain), Competitor Price, % Difference
- Filters: All / Analyzed / Not Analyzed / Cheaper Competitors
- Bulk analyze feature
- Tests: 18/18 passed (100%)
