# Wamerce - Multi-Tenant E-Commerce Platform

## Original Problem Statement
Build a multi-tenant e-commerce platform (`wamerce.com`) allowing merchants to have their own stores with custom domains. Current focus: Complete storefront redesign inspired by `namshi.com` and mobile app development.

## Core Requirements
- Multi-tenant architecture with custom domains
- Namshi.com-inspired storefront UI
- React Native mobile app
- Admin panel for store management
- Dynamic header/menu/banner configuration

## What's Been Implemented

### January 14, 2026 (Latest)
- **Unified Store Settings Page** (`/store-settings`)
  - All-in-one configuration dashboard
  - General Settings, Logo & Branding, Hero Banners, Category Tabs, Sub Navigation, Promo Messages, Mobile App
  - Image upload support integrated
  
- **Image Upload API** (`/app/backend/routes/image_upload.py`)
  - `POST /api/uploads/image?category={type}` - Upload images
  - `GET /api/uploads/images/{category}/{filename}` - Serve images
  - `GET /api/uploads/list/{category}` - List images
  - `DELETE /api/uploads/images/{category}/{filename}` - Delete images
  - Supports: JPEG, PNG, GIF, WebP (max 10MB)

- **Header Styling Fixed** - Matches Namshi.com:
  - White background with black NAMSHI logo
  - Category tabs with colored image boxes
  - WOMEN/MEN dropdown selector
  - Sub-navigation with SALE highlighted in red

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

## Access URLs
- **Store Settings**: `/store-settings`
- **Web Store**: `/tnv`
- **Mobile Preview**: `/mobile-app-preview`
- **Login**: admin / admin

## Prioritized Backlog

### P0 (Critical)
- [x] Header matches Namshi.com ✅

### P1 (High Priority)
- [ ] Deploy storefront to VPS (`tnvcollection.com`)
- [ ] Mega Menu implementation

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
