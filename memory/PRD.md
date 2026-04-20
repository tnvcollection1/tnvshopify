# TNV Collection - Product Requirements Document

## Original Problem Statement
Multi-tenant e-commerce platform (tnvcollection.com) with Shopify integration, logistics management (Shri Maruti/Innofulfill), and customer-facing storefront.

## Architecture
- **Frontend**: React (CRA) with Tailwind CSS, Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrations**: Shopify Admin API, Innofulfill Logistics, 1688.com, Google Sheets

## What's Been Implemented

### Storefront (Current Session)
- **TNVC Storefront V2** at `/store` — Complete rebuild matching the layout structure of a premium shoe brand site:
  1. Announcement bar (discount messaging)
  2. Sticky navigation with italic script logo, MEN/WOMEN/SALE dropdown menus, About/ReRun links, search/account/help/cart icons
  3. Promo banner (muted green with serif italic headline)
  4. Split hero section (product shot with white frame + lifestyle photo)
  5. Collection name CTA bar ("The New Canvas Cruiser Collection" with Shop Men/Shop Women links)
  6. Category row (4 cards: New Arrivals, Mens, Womens, Best Sellers)
  7. Large product carousel (scrollable, big images)
  8. Color grid section ("Bold By Design" with 5 interactive color swatches)
  9. Standard product carousel (smaller cards with badge, name, color, price)
  10. 3x Promo tiles (Summer Travel, New Arrivals, Fresh Colors)
  11. Value props (3 columns: Comfort, Sustainability, Materials)
  12. Dark footer (italic logo, social icons, HELP/SHOP/COMPANY link columns)
- Fonts: Playfair Display (serif headings) + DM Sans (body)
- Design: White background, clean typography, underline CTAs, minimal aesthetic

### Logistics (Previous Sessions)
- Shri Maruti (Innofulfill) full API: Auth, Rates, Booking, Tracking
- Logistics Dashboard at `/logistics` with 6 tabs
- Shopify Bulk Order Shipping UI + `orders/paid` webhook auto-push
- Booked Orders: 29615, 29616, 29617, 29618 (AWB: TNVC0000000072)

### Other
- Wedding video generator (moviepy)

## Known Issues
- Order 29614: Shri Maruti rejects Akola (444104) despite rate calculator showing rates
- 1688 API Token: Requires user to complete auth flow for refresh token
- Innofulfill Cancel API: Not accessible with seller-level credentials

## Prioritized Backlog

### P0
- Connect storefront to live Shopify product catalog (dynamic products)
- Pricing formula update (pending user input)

### P1
- Shopify Hydrogen deployment (migrate React components to Hydrogen/Remix)
- Shopify Product Categorization Fix (Size 45 filter)
- Refactor LogisticsDashboard.jsx (~1400 lines)

### P2
- User-facing Sales Dashboard, Order Tracking, Wishlist, Reviews
- Checkout flow with Razorpay
- Abandoned cart recovery via WhatsApp

## Key Files
- `/app/frontend/src/components/storefront/TNVCStorefront.jsx` - Main storefront page
- `/app/backend/services/innofulfill_service.py` - Logistics API
- `/app/backend/routes/logistics.py` - Logistics routes
- `/app/frontend/src/components/LogisticsDashboard.jsx` - Logistics UI

## Credentials
- Admin: admin/admin
- Shri Maruti: tnvcollection1@gmail.com / Sunny123!
