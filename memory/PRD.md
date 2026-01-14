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

### January 14, 2026
- **Banner & Menu Backend API** (`/app/backend/routes/storefront_banners.py`)
  - Hero banners CRUD: `GET/POST /api/storefront/banners/hero/{store}`
  - Category tabs CRUD: `GET/POST /api/storefront/banners/category-tabs/{store}`
  - Sub-navigation CRUD: `GET/POST /api/storefront/banners/sub-nav/{store}`
  - Full layout endpoint: `GET/POST /api/storefront/banners/layout/{store}`
  - Reorder endpoints for drag & drop
  
- **Banner Config Admin UI** (`/app/frontend/src/components/BannerConfigManager.jsx`)
  - 3-tab interface: Hero Banners | Category Tabs | Sub Navigation
  - Full CRUD with inline editing
  - Reorder buttons (up/down arrows)
  - Visibility toggles
  - Route: `/banner-config`

- **Frontend Integration**
  - `TNVStoreLayout.jsx` fetches category tabs & sub-nav from API
  - `TNVHomePage.jsx` fetches hero banners from API

### Previous Sessions
- Mobile app boilerplate (`/app/mobile-app/`)
- Web preview for mobile app (`/mobile-app-preview`)
- P0 Security fix (Merchant Data Isolation) - VERIFIED
- P1 Header Config Admin UI - FIXED
- P2 Shopify Image Proxy (`/api/images/proxy`) - IMPLEMENTED
- Namshi-style header redesign (white background, WOMEN/MEN selector)

## Architecture

```
/app/
├── backend/
│   ├── routes/
│   │   ├── storefront_banners.py  # NEW: Banners & Menu API
│   │   ├── storefront_config.py   # Navigation config API
│   │   ├── storefront.py          # Products API with image proxy
│   │   └── image_proxy.py         # Shopify image caching
│   └── server.py
├── frontend/
│   ├── src/components/
│   │   ├── BannerConfigManager.jsx  # NEW: Admin UI
│   │   ├── HeaderConfigManager.jsx
│   │   └── store/
│   │       ├── TNVStoreLayout.jsx   # Header with API integration
│   │       └── TNVHomePage.jsx      # Homepage with banner API
└── mobile-app/                      # React Native boilerplate
```

## Key API Endpoints
- `GET /api/storefront/banners/hero/{store}` - Hero banners
- `GET /api/storefront/banners/category-tabs/{store}` - Category tabs
- `GET /api/storefront/banners/sub-nav/{store}` - Sub-navigation
- `GET /api/storefront/banners/layout/{store}` - Full config
- `GET /api/storefront/config/navigation/{store}` - Promo messages, mega menu
- `GET /api/images/proxy?url={url}` - Image proxy

## Prioritized Backlog

### P0 (Critical)
- [ ] Verify header matches Namshi.com exactly (awaiting user reference)

### P1 (High Priority)
- [ ] Deploy storefront to VPS (`tnvcollection.com`)
- [ ] Mega Menu implementation (full category dropdowns)

### P2 (Medium Priority)
- [ ] Sooxie.com API integration
- [ ] DNS setup for `tnvcollection.pk`

### P3 (Low Priority)
- [ ] Backend file refactoring (`server.py`, `alibaba_1688.py`)
- [ ] Inconsistent currency display in admin
- [ ] Automated security testing

## Credentials
- Admin: `admin` / `admin`
- VPS IP: `159.198.36.164`
- MongoDB Atlas: `mongodb+srv://wamerce:Wamerce2026!@cluster0.uggtqki.mongodb.net/`

## 3rd Party Integrations
- Shopify (data source)
- MongoDB Atlas (database)
- React Native / Expo (mobile)
- Namecheap (DNS, VPS)
