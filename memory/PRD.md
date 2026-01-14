# Wamerce - Multi-Tenant E-Commerce Platform

## Original Problem Statement
Build a multi-tenant e-commerce platform (`wamerce.com`) allowing merchants to have their own stores with custom domains. Current focus: Complete storefront redesign inspired by `namshi.com` and mobile app development.

## Core Requirements
- Multi-tenant architecture with custom domains
- Namshi.com-inspired storefront UI
- React Native mobile app
- Admin panel for store management
- Dynamic header/menu/banner configuration
- **Multi-store support with different currencies (INR/PKR)**
- **Mega Menu with Visual Builder** ✅
- **Core E-Commerce Features** ✅

## What's Been Implemented

### January 14, 2026 (Session 2 - Latest)

**Core E-Commerce Features** ✅ COMPLETED
- **Order Tracking System**:
  - Order tracking page with search functionality
  - Detailed timeline view with status icons and colors
  - Tracking number with carrier link
  - Estimated delivery date calculation
  - Order items, shipping address, payment info display
  - Routes: `/tnv/track` and `/tnv-pk/track`

- **Wishlist System**:
  - Add/remove items from wishlist
  - Store-specific wishlists (India/Pakistan)
  - Share wishlist functionality (generates shareable URL)
  - Move items to cart
  - Empty state with "Start Shopping" CTA
  - Routes: `/tnv/wishlist` and `/tnv-pk/wishlist`

- **Product Reviews & Ratings**:
  - Create reviews with rating, title, content, pros/cons
  - Verified purchase badge
  - Helpful/unhelpful voting
  - Rating distribution display
  - Sort by recent/helpful/rating
  - Filter by rating/verified purchases
  - Review moderation workflow (pending → approved/rejected)
  - Component: `ProductReviews.jsx` integrated in product detail page

- **Customer Account Section**:
  - Dashboard with summary cards (orders, pending, wishlist, reviews)
  - My Orders tab with order list
  - Addresses tab with CRUD operations
  - Settings tab with customer ID and store info
  - Address form modal with validation
  - Routes: `/tnv/account` and `/tnv-pk/account`

- **Stock & Notifications**:
  - Stock status API
  - Back-in-stock email notifications
  - Prevents duplicate subscriptions

- **Recently Viewed Products**:
  - Tracks last 20 viewed products
  - Store-specific tracking

**Backend API Endpoints** (`/api/ecommerce/*`):
- Order Tracking: `GET /orders/track/{order_id}`, `PUT /orders/{order_id}/status`, `GET /orders/history`
- Wishlist: `GET/POST/DELETE /wishlist/{customer_id}/*`, `GET/POST /wishlist/{customer_id}/share`
- Reviews: `POST /reviews`, `GET /reviews/product/{product_id}`, `POST /reviews/{id}/helpful`, `PUT /reviews/{id}/moderate`
- Customer: `GET/PUT /customer/{id}/profile`, `GET/POST/PUT/DELETE /customer/{id}/addresses/*`, `GET /customer/{id}/dashboard`
- Stock: `POST /stock/notify`, `GET /products/{id}/stock`
- Recently Viewed: `POST/GET /recently-viewed/{customer_id}`

### January 14, 2026 (Session 1)

**Mega Menu with Visual Builder** ✅ COMPLETED
- Full mega menu dropdowns on storefront header (Namshi-style)
- 4 default sections: FASHION, WOMEN, MEN, BEAUTY
- Each section has: columns, items, promo banners, quick links
- Hover to open (desktop, 150ms delay), click on mobile
- Visual Builder admin page (`/mega-menu-builder`):
  - Drag-and-drop reordering with @dnd-kit
  - Live preview panel
  - Store selector (India/Pakistan)
  - Add/Edit/Delete columns, items, banners
  - Clone menu between stores
  - Global settings (hover delay, animation, max width)
- **Quick Start Templates** ✅:
  - Fashion Store, Electronics Store, Beauty & Cosmetics, Home & Living, Grocery & Food
  - One-click apply with preview images
  - Merge option to add to existing menu
- Store-specific configurations (different menus per store)
- Backend API: `/api/mega-menu/*` (full CRUD + templates)

**Multi-Store/Multi-Currency Support** ✅ COMPLETED
- Two stores: `tnvcollection` (India/INR/₹) and `tnvcollectionpk` (Pakistan/PKR/Rs.)
- Store-specific routes: `/tnv` (India) and `/tnv-pk` (Pakistan)
- Backend APIs accept `store` query parameter
- Frontend detects store from URL path
- Store-specific configurations:
  - INR: Free shipping at ₹2,000, shipping cost ₹150
  - PKR: Free shipping at Rs.5,000, shipping cost Rs.300
- Sales Dashboard with store selector dropdown
- Header shows "TNV" for India, "TNV PK" for Pakistan
- Region flags: 🇮🇳 for India, 🇵🇰 for Pakistan

**Sales Dashboard** (`/sales-dashboard`)
- Revenue overview cards with growth percentages
- Revenue chart (Area + Line for orders)
- Sales by category pie chart
- Top selling products list
- Orders by status bar chart
- Recent orders table
- Customer locations breakdown
- Period selector (7d, 30d, 90d, 1y)
- **Store selector (INR/PKR)** ✅

**Checkout + Razorpay Payment** (`/checkout`, `/tnv/checkout`, `/tnv-pk/checkout`)
- 3-step checkout: Cart → Shipping → Payment
- Cart management (add, update, remove items)
- Shipping address form with validation
- Payment methods: Razorpay (online) & COD
- Order confirmation page
- Coupon code support
- **Store-aware currency display** ✅

## Architecture

```
/app/
├── backend/
│   ├── routes/
│   │   ├── ecommerce.py           # E-commerce APIs (orders, wishlist, reviews)
│   │   ├── mega_menu.py           # Mega menu configuration
│   │   ├── analytics.py           # Dashboard analytics
│   │   ├── checkout.py            # Cart & checkout
│   │   ├── image_upload.py        # Image uploads
│   │   ├── storefront_banners.py  # Banners & Menu API
│   │   └── storefront_config.py   # Navigation + Mobile App config
│   └── uploads/                   # Uploaded images storage
├── frontend/
│   ├── src/components/
│   │   ├── MegaMenuBuilder.jsx    # Mega menu visual builder
│   │   ├── UnifiedStoreSettings.jsx
│   │   ├── SalesDashboard.jsx
│   │   └── store/
│   │       ├── TNVStoreLayout.jsx    # Store provider & header
│   │       ├── OrderTrackingPage.jsx # Order tracking
│   │       ├── WishlistPage.jsx      # Wishlist
│   │       ├── CustomerAccountPage.jsx # Customer account
│   │       ├── ProductReviews.jsx    # Reviews component
│   │       └── TNVProductDetail.jsx  # Product detail w/ reviews
└── mobile-app/
```

## Key API Endpoints

### E-Commerce APIs
- `GET /api/ecommerce/orders/track/{order_id}` - Order tracking details
- `GET /api/ecommerce/orders/history` - Customer order history
- `GET/POST/DELETE /api/ecommerce/wishlist/{customer_id}/*` - Wishlist CRUD
- `GET/POST /api/ecommerce/reviews/*` - Product reviews
- `GET/PUT /api/ecommerce/customer/{customer_id}/*` - Customer profile & addresses
- `GET /api/ecommerce/customer/{customer_id}/dashboard` - Dashboard summary
- `POST /api/ecommerce/stock/notify` - Stock notifications

### Store & Menu APIs
- `GET/POST /api/mega-menu/config/{store}` - Mega menu configuration
- `GET /api/mega-menu/templates` - Template list
- `POST /api/mega-menu/templates/{key}/apply/{store}` - Apply template
- `GET /api/analytics/overview?store={store}` - Dashboard metrics
- `GET /api/checkout/cart/{session_id}?store={store}` - Cart

## Access URLs
- **India Store**: `/tnv` (INR currency ₹)
- **Pakistan Store**: `/tnv-pk` (PKR currency Rs.)
- **Order Tracking**: `/tnv/track` or `/tnv-pk/track`
- **Wishlist**: `/tnv/wishlist` or `/tnv-pk/wishlist`
- **Account**: `/tnv/account` or `/tnv-pk/account`
- **Mega Menu Builder**: `/mega-menu-builder`
- **Sales Dashboard**: `/sales-dashboard`
- **Store Settings**: `/store-settings`
- **Mobile Preview**: `/mobile-app-preview`
- **Login**: admin / admin

## Prioritized Backlog

### P0 (Critical) - COMPLETED ✅
- [x] Header matches Namshi.com ✅
- [x] Multi-store/Multi-currency (INR/PKR) ✅
- [x] Mega Menu with visual builder ✅
- [x] Core E-commerce features (orders, wishlist, reviews, account) ✅

### P1 (High Priority)
- [ ] Deploy storefront to VPS (`tnvcollection.com`)
- [ ] DNS setup for `tnvcollection.pk` (A record → 159.198.36.164)

### P2 (Medium Priority)
- [ ] Sooxie.com API integration

### P3 (Low Priority)
- [ ] Backend file refactoring (split server.py, alibaba_1688.py)
- [ ] Consistent currency display in admin panel
- [ ] Mobile app enhancements (push notifications, offline mode)

## Test Reports
- `/app/test_reports/iteration_36.json` - E-commerce features (32/32 tests passed)
- `/app/tests/test_iteration36_ecommerce_features.py` - Test file

## Credentials
- Admin: `admin` / `admin`
- VPS IP: `159.198.36.164`
- MongoDB Atlas: `mongodb+srv://wamerce:Wamerce2026!@cluster0.uggtqki.mongodb.net/`
