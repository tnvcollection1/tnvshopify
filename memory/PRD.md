# TNV Collection - Product Requirements Document

## Original Problem Statement
Multi-tenant e-commerce platform (tnvcollection.com) with Shopify integration, logistics management (Shri Maruti/Innofulfill), and customer-facing storefront.

## Architecture
- **Frontend**: React (CRA) with Tailwind CSS, Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrations**: Shopify Admin API, Innofulfill Logistics, 1688.com, Google Sheets, WhatsApp

## What's Been Implemented

### Session - Feb 2026 (Previous)
- Shri Maruti (Innofulfill) full API integration: Auth, Rates, Booking, Tracking
- Logistics Dashboard (`/logistics`) with 6 tabs
- Shopify Bulk Order Shipping UI
- Shopify `orders/paid` Webhook auto-push
- Manual booking of Orders 29615, 29616, 29617
- Wedding video generator (moviepy)

### Session - Current
- **Order 29618 booked** via Shri Maruti (AWB: TNVC0000000072, Manish -> Bangalore 560028)
- **TNVC Storefront** built at `/store` - Allbirds-inspired design with:
  - Announcement bar (rotating messages)
  - Sticky navigation header with logo, menu, search/user/cart icons
  - Full-width hero banner with CTAs
  - 4-card category row (New Arrivals, Men, Women, Best Sellers)
  - Horizontal product carousel with badges
  - Lifestyle banner section
  - Product grid (Trending Now)
  - 3x Promo tiles
  - Value props (Comfort, Sustainability, Materials)
  - Newsletter signup
  - Multi-column footer

## Known Issues
- **Order 29614**: Shri Maruti rejects Akola (444104) for booking despite rate calculator showing rates. Carrier limitation.
- **1688 API Token**: Requires user to complete auth flow for refresh token
- **Innofulfill Cancel API**: Not accessible with seller-level credentials

## Prioritized Backlog

### P0
- Connect storefront to actual Shopify product data (live catalog)
- Pricing formula update (pending user input)

### P1
- Shopify Product Categorization Fix (Size 45 filter)
- Hydrogen deployment (migrate storefront to Shopify Hydrogen)
- Refactor LogisticsDashboard.jsx (~1400 lines)

### P2
- User-facing Sales Dashboard, Order Tracking, Wishlist, Reviews
- Complete checkout flow with Razorpay
- Abandoned cart recovery via WhatsApp
- 1688 API token reliability fix

## Key Files
- `/app/frontend/src/components/storefront/TNVCStorefront.jsx` - Allbirds-style storefront
- `/app/backend/services/innofulfill_service.py` - Logistics API
- `/app/backend/routes/logistics.py` - Logistics routes
- `/app/frontend/src/components/LogisticsDashboard.jsx` - Logistics UI
- `/app/backend/routes/shopify_webhooks.py` - Webhook handlers

## DB Collections
- `stores`, `customers`, `logistics_bookings`

## Credentials
- Admin: admin/admin
- Shri Maruti: tnvcollection1@gmail.com / Sunny123!
