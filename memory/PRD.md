# Shopify 1688 Integration Platform - PRD

## Original Problem Statement
Build a Shopify application that deeply integrates with 1688.com, Taobao, and Tmall for e-commerce operations.

## Core Requirements

### 1. Product Scraping
- Chrome Extension to collect product information from 1688.com
- "Product Collector" interface (Dianxiaomi-style UI)

### 2. Shopify Integration
- One-click publish to Shopify
- Product linking between Shopify and 1688
- Data sync management dashboard

### 3. Image Search & Auto-Link
- 1688 image search to find supplier products
- Auto-link Shopify products to 1688 suppliers via image matching

### 4. Order Management
- Link Shopify orders to 1688 products
- Per-SKU ordering and tracking
- Multi-stage fulfillment pipeline

### 5. Admin UI
- Shopify-style admin panel
- Complete data isolation between stores
- Warehouse receiving interface (mobile-friendly)

### 6. Customer Storefront
- Public e-commerce storefront (net-a-porter inspired)
- Storefront CMS for content management

### 7. Competitor Analysis
- Google Vision API for image-based competitor search
- Price comparison dashboard

---

## What's Been Implemented

### Completed Features (as of Jan 7, 2025)
- ✅ Complete e-commerce storefront with Razorpay checkout
- ✅ Order tracking system
- ✅ Storefront CMS with image upload
- ✅ Data Sync Dashboard for Shopify
- ✅ PIN-protected Warehouse Scanning Interface
- ✅ Email notifications via SendGrid (requires API keys)
- ✅ Competitor Price Dashboard with Google Vision API
- ✅ **Auto-Link Feature** - Bulk linking Shopify products to 1688 via image search
- ✅ Admin panel with Shopify-style UI

### Auto-Link Feature Status (Verified Jan 7, 2025)
- Backend endpoint: `POST /api/shopify/products/bulk-auto-link`
- Uses TMAPI for 1688 image search
- Test run: 9/10 products successfully linked (90% success rate)
- Frontend button available at `/products` page

---

## Prioritized Backlog

### P0 - Critical
- None currently blocking

### P1 - High Priority
- Complete `server.py` refactoring (remove duplicated endpoints)
- Currency conversion in Competitor Dashboard

### P2 - Medium Priority
- Shopify OAuth/session stability fixes
- Competitor search fallback (product title search)
- UI polish across admin pages

### P3 - Low Priority
- Chrome Extension testing on live 1688 pages

---

## Technical Architecture

### Stack
- Frontend: React + Shadcn UI
- Backend: FastAPI (Python)
- Database: MongoDB
- External APIs: Shopify, TMAPI (1688), Google Vision, Razorpay, SendGrid

### Key Files
- `/app/backend/server.py` - Main API server (needs refactoring)
- `/app/backend/routes/shopify_sync.py` - Shopify sync endpoints
- `/app/backend/services/image_search_service.py` - 1688 image search
- `/app/frontend/src/components/ShopifyProducts.jsx` - Products catalog

### Database Collections
- `stores` - Store configurations
- `shopify_products` - Synced product data
- `product_links` - Shopify-1688 product links
- `competitor_analyses` - Competitor analysis results

---

## Credentials Required
- Admin Login: `admin` / `admin`
- Warehouse PIN: `1688`
- Google Vision API Key: Configured in .env
- SendGrid API Key: Required for email features
- TMAPI Token: Configured in .env

---

## Known Issues
1. `server.py` has duplicated endpoints (routers created but old code not removed)
2. Competitor Dashboard doesn't convert currencies
3. Shopify OAuth sessions may drop intermittently
