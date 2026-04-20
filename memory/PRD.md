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

### Hydrogen Migration — Scaffolded (Feb 2026)
- Initialized Hydrogen (Remix/React Router 7) skeleton at **`/app/tnvhydrogen/`** pointing at live Shopify catalog via Storefront API
- Customized homepage (`app/routes/_index.tsx`) with TNV branding: announcement bar, sage-green hero, Trending Now grid, value props
- TNV theme tokens appended to `app/styles/app.css`
- `package.json` cleaned of Shopify monorepo `workspace:*`/`catalog:` refs → real versions so VPS `npm install` works cleanly
- Env template at `.env.example`; `.env` has `SESSION_SECRET`, `PRIVATE_STOREFRONT_API_TOKEN`, `PUBLIC_STORE_DOMAIN`, `PUBLIC_CHECKOUT_DOMAIN` filled in
- **User action required**: paste `PUBLIC_STOREFRONT_API_TOKEN` and `PUBLIC_STOREFRONT_ID` into `/app/tnvhydrogen/.env` (or set on VPS)
- Deployment: VPS runs `cd /app/tnvhydrogen && npm ci && npm run build && npm run preview` (needs Node 22+)
- Full onboarding instructions: `/app/tnvhydrogen/TNV_README.md`

### Checkout — Shopify Hosted (Feb 2026)
- **Architecture switched from custom Razorpay UI → Shopify Storefront API hosted checkout** to enable native abandoned-cart recovery + Shopify Payments (Razorpay configured inside Shopify).
- **New endpoint**: `POST /api/checkout/shopify-cart` → creates a Shopify Cart via Storefront API `cartCreate` GraphQL mutation and returns `checkout_url` (customer is redirected to Shopify's native checkout page).
- **Frontend triggers**:
  - CartDrawer "Checkout" button → creates multi-line cart → redirects to `tnvcollection.com/cart/c/...`
  - PDP "Buy It Now" button → single-variant cart → redirects to Shopify checkout
- **Abandoned checkout tracking**: Native via Shopify (fires automatically when customer enters email and leaves).
- **Credentials**: `SHOPIFY_STOREFRONT_ACCESS_TOKEN` in backend/.env (Private Storefront token, uses `Shopify-Storefront-Private-Token` header).
- **Legacy Razorpay endpoints** (`/create-order`, `/verify-payment`) still exist but are dormant (no frontend calls them anymore).
- **Removed**: `/store/checkout` route + `CheckoutPage.jsx` import from App.js.
- **Tests**: `/app/backend/tests/test_checkout_e2e.py` — 8/8 passing (including 5 new TestShopifyCart cases).

### Cart & Checkout (Feb 2026 — E2E Validated)
- **Cart**: React Context `CartContext.jsx` + `CartDrawer.jsx` (persistent cart across storefront)
- **Checkout Page** (`/store/checkout`): `CheckoutPage.jsx` — shipping form + prepaid (Razorpay) and COD options
- **Backend Routes** (`/app/backend/routes/checkout.py`):
  - `POST /api/checkout/create-order` — creates Razorpay order (prepaid) OR Shopify order directly (COD)
  - `POST /api/checkout/verify-payment` — verifies HMAC signature, creates Shopify order, idempotent
  - `GET /api/checkout/order/{checkout_id}` — fetch status
- **Hardening**: Idempotency guard on verify-payment, Shopify errors surfaced as 502 (no silent failures), async Motor calls awaited correctly
- **E2E Tests**: `/app/backend/tests/test_checkout_e2e.py` — 8/8 pytest cases passing (storefront list/detail/collections, prepaid create+DB persistence, valid+invalid signature verification, COD flow)
- **Keys**: `RAZORPAY_KEY_ID=rzp_live_SfjhFxbltisq2k` (backend + frontend aligned)

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
- Shopify Hydrogen deployment (user requested migration; currently in React SPA)
- Shopify Product Categorization Fix (Size 45 filter)

### P2
- User-facing Sales Dashboard, Order Tracking, Wishlist, Reviews
- Abandoned cart recovery via WhatsApp
- Refactor LogisticsDashboard.jsx (~1400 lines)
- Namshi-style Shopify theme edits

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
