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
- **Price alert notifications** when competitors lower prices
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
- ✅ **server.py Refactoring** (Jan 7, 2025) - 395 lines removed
- ✅ **Price Alert Notifications** (Jan 7, 2025)
  - PriceAlertService monitors competitor prices
  - Auto-triggers when competitor < your price
  - In-app notification bell with unread count
  - Email alerts via SendGrid (optional)
  - Per-product alert settings

### Price Alert System (Jan 7, 2025)
- Backend: `price_alert_service.py`
- MongoDB collections: `notifications`, `price_alerts`
- Frontend: NotificationBell component with real-time polling
- Endpoints:
  - `GET /api/competitor/notifications`
  - `POST /api/competitor/notifications/{id}/read`
  - `POST /api/competitor/notifications/mark-all-read`
  - `POST /api/competitor/check-alerts/{analysis_id}`
  - `GET/POST /api/competitor/alerts/settings`
- Tests: 19/19 passed (100%)

### Server.py Refactoring Summary
- Original: 7,205 lines
- Current: 6,810 lines
- **Total Removed: 395 lines**
- Duplicates removed:
  - Settings auto-sync endpoints → `/routes/settings.py`
  - Marketing stats/campaigns → `/routes/marketing.py`
  - WhatsApp marketing → `/routes/whatsapp_api.py`

---

## Prioritized Backlog

### P0 - Critical
- None currently blocking

### P1 - High Priority
- None remaining

### P2 - Medium Priority
- Shopify OAuth/session stability fixes
- Chrome Extension testing on live 1688 pages
- Scheduled competitor price checks

### P3 - Low Priority
- Additional server.py cleanup (Shopify sync endpoints)

---

## Technical Architecture

### Stack
- Frontend: React + Shadcn UI
- Backend: FastAPI (Python)
- Database: MongoDB
- External APIs: Shopify, TMAPI (1688), Google Vision, Razorpay, SendGrid

### Key Files
- `/app/backend/server.py` - Main API server (6,810 lines)
- `/app/backend/routes/competitor_analysis.py` - Competitor + notifications
- `/app/backend/services/price_alert_service.py` - Price alert logic
- `/app/backend/services/currency_service.py` - Currency conversion
- `/app/frontend/src/components/CompetitorDashboard.jsx` - Dashboard + notifications

### Database Collections
- `stores` - Store configurations
- `shopify_products` - Synced product data
- `competitor_analyses` - Analysis results
- `notifications` - Price alert notifications
- `price_alerts` - Per-product alert settings

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
