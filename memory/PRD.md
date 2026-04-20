# TNV Collection - Product Requirements Document

## Original Problem Statement
Multi-tenant e-commerce platform (tnvcollection.com) with Shopify integration, logistics management (Shri Maruti/Innofulfill), and customer-facing storefront.

## Architecture
- **Frontend**: React (CRA) with Tailwind CSS, Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrations**: Shopify Admin API, Innofulfill Logistics, 1688.com, Google Sheets

## What's Been Implemented

### Storefront Pages (Current Session)
All pages connected to live Shopify catalog (646 products, 50 collections):

1. **Homepage** (`/store`) — 12 sections matching premium shoe brand layout:
   - Announcement bar, sticky nav with mega dropdowns, promo banner
   - Split hero (product + lifestyle), category row, large product carousel
   - Color grid ("Bold By Design"), standard product carousel ("Trending Now")
   - 3x promo tiles, value props, dark footer

2. **Product Detail Page** (`/store/product/:productId`) — Full PDP with:
   - Image gallery with thumbnails + prev/next navigation
   - Color selector buttons, size grid with availability indicators
   - Quantity selector, Add to Cart + Wishlist buttons
   - Trust badges (Free Shipping, 30-Day Returns, Secure Payment)
   - Product description (HTML from Shopify)

3. **Collections Listing** (`/store/collections`) — Grid of 50 collections with:
   - Collection images (Shopify images or stock fallbacks)
   - Collection names as overlay text

4. **Collection Page** (`/store/collection/:collectionId`) — Products in collection:
   - Collection header with title + product count
   - "All Collections" breadcrumb navigation
   - Product grid with images, names, colors, prices, color badges
   - Sort dropdown, Load More pagination
   - Products link to product detail page

### Backend API — Storefront
- `GET /api/storefront/products?limit=20&collection_id=X&page_info=X`
- `GET /api/storefront/products/:id` — Full detail with variants, options, body_html
- `GET /api/storefront/collections` — All 50 collections
- `GET /api/storefront/collections/:id` — Single collection detail

### Navigation Flow
- Homepage → Click product → Product Detail Page
- Homepage → Click "Collections" in nav → Collections Listing
- Collections Listing → Click collection → Collection Page (products grid)
- Collection Page → Click product → Product Detail Page
- Product Detail Page → Back button → Previous page

### Logistics (Previous Sessions)
- Shri Maruti (Innofulfill) full API: Auth, Rates, Booking, Tracking
- Logistics Dashboard at `/logistics` with 6 tabs
- Booked Orders: 29615, 29616, 29617, 29618

## Known Issues
- Order 29614: Shri Maruti rejects Akola 444104 for bookings
- 1688 API Token: Requires user refresh token

## Prioritized Backlog

### P0
- Pricing formula update (pending user input)

### P1
- Shopify Hydrogen deployment
- Cart + Checkout flow with Razorpay
- Shopify Product Categorization Fix (Size 45 filter)

### P2
- User-facing Sales Dashboard, Order Tracking, Wishlist, Reviews
- Abandoned cart recovery via WhatsApp
- Refactor LogisticsDashboard.jsx

## Key Files
- `/app/frontend/src/components/storefront/TNVCStorefront.jsx` — Homepage
- `/app/frontend/src/components/storefront/ProductDetailPage.jsx` — PDP
- `/app/frontend/src/components/storefront/CollectionPage.jsx` — Collection + Collections listing
- `/app/backend/routes/storefront.py` — Storefront API
- `/app/backend/services/innofulfill_service.py` — Logistics API
- `/app/backend/routes/logistics.py` — Logistics routes

## Credentials
- Admin: admin/admin
- Shri Maruti: tnvcollection1@gmail.com / Sunny123!
