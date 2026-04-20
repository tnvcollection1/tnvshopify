# TNV Collection - Product Requirements Document

## Original Problem Statement
Multi-tenant e-commerce platform (tnvcollection.com) with Shopify integration, logistics management (Shri Maruti/Innofulfill), and customer-facing storefront.

## Architecture
- **Frontend**: React (CRA) with Tailwind CSS, Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrations**: Shopify Admin API, Innofulfill Logistics, 1688.com, Google Sheets

## What's Been Implemented

### Storefront (Current Session)
- **TNVC Storefront** at `/store` — Complete layout matching a premium shoe brand site with 12 sections:
  1. Announcement bar (discount messaging)
  2. Sticky navigation with italic script logo, MEN/WOMEN/SALE dropdown menus, About/ReRun links, icons
  3. Promo banner (muted green with serif italic headline)
  4. Split hero section (product shot with white frame + lifestyle photo)
  5. Collection name CTA bar with Shop Men/Shop Women links
  6. Category row (4 cards: New Arrivals, Mens, Womens, Best Sellers)
  7. Large product carousel (scrollable, big images, active product info)
  8. Color grid section ("Bold By Design" with interactive color swatches)
  9. Standard product carousel ("Trending Now" - smaller cards with badge, name, color, price)
  10. 3x Promo tiles (Summer Travel, New Arrivals, Fresh Colors)
  11. Value props (3 columns: Comfort, Sustainability, Materials)
  12. Dark footer (italic logo, social icons, HELP/SHOP/COMPANY link columns)
- **Connected to live Shopify catalog** via `/api/storefront/products` API
- All product images, names, prices, colors, and variant data pulled from live Shopify store
- Fonts: Playfair Display (serif headings) + DM Sans (body)

### Backend API - Storefront
- `GET /api/storefront/products?limit=20` — Fetches products with images, prices, colors, sizes, inventory
- `GET /api/storefront/products/{id}` — Single product detail
- `GET /api/storefront/collections` — Fetch collections

### Logistics (Previous Sessions)
- Shri Maruti (Innofulfill) full API: Auth, Rates, Booking, Tracking
- Logistics Dashboard at `/logistics` with 6 tabs
- Shopify Bulk Order Shipping + `orders/paid` webhook auto-push
- Booked Orders: 29615, 29616, 29617, 29618 (AWB: TNVC0000000072)

## Known Issues
- Order 29614: Shri Maruti rejects Akola (444104) for bookings
- 1688 API Token: Requires user to complete auth flow for refresh token
- Innofulfill Cancel API: Not accessible with seller-level credentials

## Prioritized Backlog

### P0
- Pricing formula update (pending user input)

### P1
- Shopify Hydrogen deployment (migrate React components)
- Shopify Product Categorization Fix (Size 45 filter)
- Product detail page for storefront
- Add to cart / checkout flow

### P2
- User-facing Sales Dashboard, Order Tracking, Wishlist, Reviews
- Checkout flow with Razorpay
- Abandoned cart recovery via WhatsApp
- Refactor LogisticsDashboard.jsx (~1400 lines)

## Key Files
- `/app/frontend/src/components/storefront/TNVCStorefront.jsx` - Main storefront page
- `/app/backend/routes/storefront.py` - Storefront API (Shopify product fetching)
- `/app/backend/services/innofulfill_service.py` - Logistics API
- `/app/backend/routes/logistics.py` - Logistics routes
- `/app/frontend/src/components/LogisticsDashboard.jsx` - Logistics UI

## Credentials
- Admin: admin/admin
- Shri Maruti: tnvcollection1@gmail.com / Sunny123!
