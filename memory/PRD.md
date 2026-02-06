# wamerce.com - Multi-Tenant E-Commerce Platform

## Original Problem Statement
Build a multi-tenant e-commerce platform allowing merchants to have their own stores with custom domains. The platform includes:
- Namshi.com-inspired storefront redesign
- Mobile app development (React Native/Expo)
- Shopify-like visual theme editors
- Comprehensive shipping integrations (DTDC, DWZ)
- AI-powered product image enhancement
- 1688 sourcing and fulfillment workflow

## Core Requirements

### 1. Storefront & UI/UX
- Replicate namshi.com header and storefront design
- Mega Menu with visual builder
- Flash Sale countdown banners
- Instagram-style Stories
- Quick View modals for products
- "Complete the Look" feature
- Multi-store support (currencies, languages)

### 2. Admin Features
- Dynamic menu and banner management
- Theme editor with real-time preview
- Sales Dashboard and Order Tracking
- Product approval workflow
- AI Image Enhancer (background removal)

### 3. E-Commerce Flow
- Checkout with Razorpay integration
- Wishlist and Reviews
- Abandoned cart recovery (WhatsApp)

### 4. Fulfillment Workflow
- 1688 sourcing integration
- Per-item linking: Shopify orders → 1688 purchase orders
- DWZ warehouse integration
- Custom tracking number format: `TNV{COUNTRY}{DDMM}{COLOR}{SIZE}{SERIAL}`

### 5. Merchant Onboarding
- Multi-step wizard
- Theme selection during onboarding

---

## What's Implemented ✅

### Session: June 2, 2025
- **P0 RESOLVED**: Fixed UI not updating after DWZ order placement
  - Root cause: GET `/api/1688/purchase-orders` was not reading `dwz_tracking` from the order document itself
  - Fix: Modified `alibaba_1688.py` to prioritize `dwz_tracking`/`dwz_waybill` fields from `purchase_orders_1688` collection
  - Now correctly displays tracking numbers in UI immediately after placing orders

### Session: Feb 4, 2026
- **P0 RESOLVED**: 1688 Purchase Orders page confirmed working at `/purchase-1688`
- Verified: 42 orders displaying with all columns (1688 Order ID, Product, Shopify #, Supplier Status, DWZ Tracking, Size/Color, Order Status, Created, Actions)
- URL routing confirmed correct in Sidebar navigation

### Previous Sessions
- **Admin Session Stability**: Fixed critical session expiration in AuthContext.jsx
- **Menu Configuration**: Enabled linking menu items to products/tags in ShopifyStyleEditor.jsx
- **Facebook Data Deletion**: Created `/api/facebook/data-deletion` endpoint
- **1688 Sourcing Workflow**:
  - Created "1688 Sourcing" menu in Sidebar
  - Per-item linking UI in ShopifyOrders.jsx
  - "Place DWZ Order" step for fulfilled items
- **Custom TNV Tracking**: Backend generator in routes/dwz56.py
- **Order Linking UI**: Shows "X of Y items linked" summary

---

## Current Issues

### P0 (Critical)
- [ ] Mobile App untested (React Native/Expo) - HIGH RISK

### P1 (Important)
- [ ] Stories component close ('X') button may not work in preview
- [ ] Header menu disappears when selected in editor
- [ ] DTDC Live API Integration - BLOCKED (awaiting user API key)

### P3 (Low Priority)
- [ ] Delete obsolete V2 Editor files (WebsiteEditorV2.jsx, MobileAppEditorV2.jsx)

### P4 (Tech Debt)
- [ ] Refactor monolithic server.py into modules

---

## Backlog / Future Tasks

### High Priority
- User-Generated Stories feature
- Additional section types/templates for theme editor

### Medium Priority
- Sooxie.com API integration
- Mobile app store submission prep (app.json)

### Low Priority
- Code cleanup and refactoring

---

## Architecture

```
/app/
├── backend/
│   ├── routes/
│   │   ├── alibaba_1688.py       # 1688 order management, Shopify linking
│   │   ├── dwz56.py              # DWZ shipping, tracking number generator
│   │   ├── facebook_data_deletion.py  # FB app review endpoint
│   │   ├── shopify_sync.py       # Product/tag list endpoints
│   │   └── users.py
│   └── server.py
├── frontend/
│   ├── src/
│   │   ├── App.js                # Route definitions
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx   # Session management (fixed)
│   │   ├── components/
│   │   │   ├── Purchase1688Orders.jsx  # 1688 orders dashboard
│   │   │   ├── ShopifyOrders.jsx      # Per-item linking & DWZ flow
│   │   │   ├── ShopifyStyleEditor.jsx # Theme editor
│   │   │   └── Sidebar.jsx            # Navigation menu
```

---

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/1688/purchase-orders` | GET | Fetch all 1688 purchase orders |
| `/api/1688/purchase-orders/{id}/link` | PATCH | Link 1688 order to Shopify |
| `/api/dwz56/generate-tracking` | GET | Generate custom TNV tracking number |
| `/api/shopify/product-list` | GET | Products list for theme editor |
| `/api/shopify/tags` | GET | Tags list for theme editor |
| `/api/facebook/data-deletion` | POST | Facebook data deletion webhook |

---

## 3rd Party Integrations

| Service | Status | Notes |
|---------|--------|-------|
| Razorpay | Requires User Key | Payments |
| DTDC | BLOCKED | Awaiting permanent API key |
| Emergent (ClipDrop) | Active | AI Image Background Removal |
| 1688.com | Active | Custom sourcing API |
| DWZ56 | Active | Warehouse shipping API |
| @dnd-kit | Active | Drag-and-drop UI |
| react-slick | Active | Carousels |

---

## Credentials for Testing
- **Admin Login**: admin / admin
- **VPS**: 159.198.36.164 (SSH credentials in chat history)

---

*Last Updated: Feb 4, 2026*
