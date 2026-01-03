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

### January 3, 2026
- **Shopify Product Sync** - Full sync for ALL stores implemented:
  - `POST /api/shopify/sync-products/{store_name}` - Sync single store
  - `POST /api/shopify/sync-products-all` - Sync ALL stores
  - `GET /api/shopify/products` - List synced products with search
  - `GET /api/shopify/products/sync-status` - Check sync progress
  - **6,338 products synced** from all Shopify stores!
- **Auto-Purchase Toggle** in Bulk Processing:
  - Toggle to enable "Auto-purchase on 1688"
  - Creates 1688 purchase orders automatically during bulk processing
  - Confirmation dialog before processing
  - Progress tracking and success/failure reporting
- **Fulfillment Dashboard UI** (`/fulfillment` page) with:
  - Visual pipeline stages (Shopify → 1688 → DWZ56 → Delivered)
  - Stats cards for each status (Total, Pending, Processing, Purchased, etc.)
  - Pending orders sidebar with "Process" buttons
  - Bulk Processing with Select All checkbox
- **1688 Auth Endpoints** - Added /api/1688/auth/url, /auth/test, /auth/token for re-authorization
- **Return Status Sync** - Shopify sync now captures return_status, refunds, cancelled_at
- Fixed Shopify sync - was working but not being triggered
- Enabled automatic hourly Shopify sync for ALL stores (was disabled)
- All backend tests passing

## Roadmap

### P0 (Critical)
- [x] Fix Shopify sync
- [x] Enable automatic hourly sync
- [x] Frontend UI for fulfillment pipeline

### P1 (High)
- [ ] Fix 1688 Product API authorization (user action needed on 1688 console)
- [x] Sync return/refund status from Shopify
- [ ] Implement Shopify Product Sync (2,000 missing products)

### P2 (Medium)
- [ ] Refactor sync to use order.id instead of customer_id
- [ ] Background job queue (Celery) for long-running tasks
- [ ] Refactor server.py to separate route files

### P3 (Low)
- [ ] Universal AI Analytics
- [ ] Abandoned Cart Recovery via WhatsApp
- [ ] bepragma.ai features

## Credentials Reference
- **1688 AppKey**: 8585237
- **1688 AccessToken**: 650153f3-8596-4f08-9d17-20d3cb5f19b9
- **Admin Login**: admin / admin
