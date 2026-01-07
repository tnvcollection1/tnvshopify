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
- **Title-based fallback search** when image search yields no results
- **Currency conversion** for accurate multi-region price comparisons
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
- ✅ **Competitor Title Search Fallback** (Jan 7, 2025)
- ✅ **Currency Conversion Service** (Jan 7, 2025)
  - Live exchange rates from open.er-api.com
  - Converts USD/EUR/GBP/CNY/AED → INR
  - Currency detection based on URL domain
  - `GET /api/competitor/currency-rates` endpoint
- ✅ **server.py Refactoring** (Jan 7, 2025)
  - Removed ~290 lines of duplicate code
  - Settings endpoints moved to `/routes/settings.py`
  - Marketing endpoints moved to `/routes/marketing.py`
  - Fixed datetime comparison bug in marketing stats

### Auto-Link Feature Status (Verified Jan 7, 2025)
- Backend endpoint: `POST /api/shopify/products/bulk-auto-link`
- Uses TMAPI for 1688 image search
- Test run: 9/10 products successfully linked (90% success rate)
- Frontend button available at `/products` page

### Competitor Title Search (Jan 7, 2025)
- Backend: `web_search_service.py`, `competitor_analysis.py`
- New endpoint: `POST /api/competitor/search-by-title`
- Fallback in: `POST /api/competitor/analyze-from-url`
- Tests: 14/14 passed (100%)

### Currency Conversion (Jan 7, 2025)
- Backend: `currency_service.py`
- Live rates: USD=90.21, EUR=105.48, GBP=121.74 (to INR)
- Tests: 32/32 passed (100%)

---

## Prioritized Backlog

### P0 - Critical
- None currently blocking

### P1 - High Priority
- None remaining

### P2 - Medium Priority
- Shopify OAuth/session stability fixes
- UI polish across admin pages
- Chrome Extension testing on live 1688 pages

### P3 - Low Priority
- Additional server.py cleanup (potential remaining duplicates)
- Price alert notifications

---

## Technical Architecture

### Stack
- Frontend: React + Shadcn UI
- Backend: FastAPI (Python)
- Database: MongoDB
- External APIs: Shopify, TMAPI (1688), Google Vision, Razorpay, SendGrid

### Key Files
- `/app/backend/server.py` - Main API server (refactored, 6918 lines)
- `/app/backend/routes/shopify_sync.py` - Shopify sync endpoints
- `/app/backend/routes/competitor_analysis.py` - Competitor analysis
- `/app/backend/routes/marketing.py` - Marketing endpoints
- `/app/backend/routes/settings.py` - Settings endpoints
- `/app/backend/services/currency_service.py` - Currency conversion
- `/app/backend/services/web_search_service.py` - Title-based web search
- `/app/frontend/src/components/CompetitorDashboard.jsx` - Competitor analysis UI

### Database Collections
- `stores` - Store configurations
- `shopify_products` - Synced product data
- `product_links` - Shopify-1688 product links
- `competitor_analyses` - Competitor analysis results (includes `search_method`, `base_currency` fields)

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
2. Potential remaining duplicate code in server.py (P3)
