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

## What's Been Implemented

### January 14, 2026 (Latest Session)

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

**Backend APIs**
- `/api/analytics/*` - Dashboard metrics
- `/api/checkout/cart/*` - Cart CRUD
- `/api/checkout/order/*` - Order management
- `/api/checkout/webhook/razorpay` - Payment webhooks

**Unified Store Settings** (`/store-settings`)
- All-in-one configuration dashboard
- General Settings, Logo & Branding, Hero Banners, Category Tabs, Sub Navigation, Promo Messages, Mobile App
- Image upload support integrated
- Drag-and-drop reordering (@dnd-kit)

**Image Upload API** (`/api/uploads/`)
- Upload images for banners, categories, products
- Supports: JPEG, PNG, GIF, WebP (max 10MB)

### Previous Work
- Banner & Menu Backend API (`/api/storefront/banners/`)
- Mobile app boilerplate (`/app/mobile-app/`)
- Web preview for mobile app (`/mobile-app-preview`)
- P0 Security fix (Merchant Data Isolation) - VERIFIED
- P1 Header Config Admin UI - FIXED
- P2 Shopify Image Proxy (`/api/images/proxy`) - IMPLEMENTED

## Architecture

```
/app/
├── backend/
│   ├── routes/
│   │   ├── image_upload.py        # NEW: Image upload API
│   │   ├── storefront_banners.py  # Banners & Menu API
│   │   ├── storefront_config.py   # Navigation + Mobile App config
│   │   └── image_proxy.py         # Shopify image caching
│   └── uploads/                   # NEW: Uploaded images storage
│       ├── banners/
│       ├── categories/
│       └── general/
├── frontend/
│   ├── src/components/
│   │   ├── UnifiedStoreSettings.jsx  # NEW: All-in-one settings
│   │   ├── BannerConfigManager.jsx
│   │   └── store/
│   │       └── TNVStoreLayout.jsx    # FIXED: Namshi-style header
└── mobile-app/
```

## Key API Endpoints
- `POST /api/uploads/image` - Upload images
- `GET /api/storefront/banners/hero/{store}` - Hero banners
- `GET /api/storefront/banners/category-tabs/{store}` - Category tabs
- `GET /api/storefront/banners/sub-nav/{store}` - Sub-navigation
- `GET /api/storefront/config/mobile-app/{store}` - Mobile app config
- `GET /api/analytics/overview?store={store}` - Dashboard metrics (returns currency)
- `GET /api/checkout/cart/{session_id}?store={store}` - Cart with store currency

## Access URLs
- **India Store**: `/tnv` (INR currency ₹)
- **Pakistan Store**: `/tnv-pk` (PKR currency Rs.)
- **Store Settings**: `/store-settings`
- **Sales Dashboard**: `/sales-dashboard`
- **Mobile Preview**: `/mobile-app-preview`
- **Login**: admin / admin

## Prioritized Backlog

### P0 (Critical)
- [x] Header matches Namshi.com ✅
- [x] Multi-store/Multi-currency (INR/PKR) ✅

### P1 (High Priority)
- [ ] Deploy storefront to VPS (`tnvcollection.com`)
- [ ] Mega Menu with visual builder
- [ ] DNS setup for `tnvcollection.pk` (A record → 159.198.36.164)

### P2 (Medium Priority)
- [ ] Sooxie.com API integration
- [ ] DNS setup for `tnvcollection.pk`

### P3 (Low Priority)
- [ ] Backend file refactoring
- [ ] Drag-and-drop reordering for banners

## Credentials
- Admin: `admin` / `admin`
- VPS IP: `159.198.36.164`
- MongoDB Atlas: `mongodb+srv://wamerce:Wamerce2026!@cluster0.uggtqki.mongodb.net/`
