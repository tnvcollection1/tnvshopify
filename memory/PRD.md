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
  - Color codes: R=Red, U=Blue, B=Black, W=White, G=Green, Y=Yellow, etc.

### 5. Merchant Onboarding
- Multi-step wizard
- Theme selection during onboarding

---

## What's Implemented ✅

### Session: Feb 6, 2026
- **DWZ API Integration Fixed**: Resolved timestamp issues with DWZ API
  - The VPS system time is set to 2026, which matches the DWZ API server time
  - No timestamp offset correction needed
  - API calls now work correctly (client-info, pre-input-list, etc.)

- **Local Tracking Data Management**:
  - Created `/api/dwz56/clear-local-tracking` endpoint to clear DWZ tracking from local database
  - Created `/api/dwz56/clear-tracking-counters` endpoint to reset serial number counters
  - Successfully cleared 4 orders with old/incorrect tracking numbers
  - Users can now regenerate new tracking numbers with correct format

- **Tracking Number Format Confirmed**:
  - Format: `TNVIN0602B42001` (TNV + Country + DDMM + Color + Size + Serial)
  - Black color code is correctly set to `B`

- **DWZ Platform Limitation Identified**:
  - The DWZ API's `PreInputDel` endpoint does not work as documented
  - All attempts to delete pre-input records via API return "Missing required parameters"
  - **Workaround**: Users must delete old records manually via the DWZ web portal
  - Local tracking data can be cleared to allow regeneration

### Previous Sessions
- **Admin Session Stability**: Fixed critical session expiration in AuthContext.jsx
- **Menu Configuration**: Enabled linking menu items to products/tags in ShopifyStyleEditor.jsx
- **Facebook Data Deletion**: Created `/api/facebook/data-deletion` endpoint
- **1688 Sourcing Workflow**: Per-item linking UI, DWZ order placement
- **Custom TNV Tracking**: Backend generator with color code mapping
- **Order Linking UI**: Shows "X of Y items linked" summary

---

## Current Issues

### P0 (Critical)
- [x] DWZ API timestamp issue - RESOLVED (no offset needed)
- [x] Cannot clear local tracking data - RESOLVED (new endpoints created)
- [ ] DWZ PreInputDel API not working - BLOCKED (API limitation, manual deletion required)

### P1 (Important)
- [ ] Mobile App untested (React Native/Expo) - HIGH RISK
- [ ] Shopify & 1688 API tokens expire frequently (needs OAuth2 refresh flow)
- [ ] Header menu disappears when selected in editor
- [ ] DTDC Live API Integration - BLOCKED (awaiting user API key)

### P3 (Low Priority)
- [ ] Delete obsolete V2 Editor files (WebsiteEditorV2.jsx, MobileAppEditorV2.jsx)

### P4 (Tech Debt)
- [ ] Refactor monolithic server.py into modules

---

## Backlog / Future Tasks

### High Priority
- Implement OAuth2 refresh token flow for Shopify & 1688 integrations
- Stabilize and test React Native mobile app
- Implement User-Generated Stories feature

### Medium Priority
- Additional section types/templates for theme editor
- Sooxie.com API integration
- Mobile app store submission prep (app.json)

### Low Priority
- Code cleanup and refactoring
- Delete obsolete V2 Editor components

---

## Architecture

```
/app/
├── backend/
│   ├── routes/
│   │   ├── alibaba_1688.py       # 1688 order management, Shopify linking
│   │   ├── dwz56.py              # DWZ shipping, tracking number generator
│   │   │                         # New: clear-local-tracking, clear-tracking-counters
│   │   ├── facebook_data_deletion.py  # FB app review endpoint
│   │   ├── shopify_sync.py       # Product/tag list endpoints
│   │   └── users.py
│   └── server.py
├── frontend/
│   ├── src/
│   │   ├── App.js                # Route definitions
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx   # Session management
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
| `/api/dwz56/client-info` | GET | Get DWZ account info (balance, etc.) |
| `/api/dwz56/pre-input-list` | GET | List pre-input records on DWZ |
| `/api/dwz56/clear-local-tracking` | POST | Clear DWZ tracking from local DB |
| `/api/dwz56/clear-tracking-counters` | POST | Reset tracking serial counters |
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
| 1688.com | Active | Custom sourcing API (token expires) |
| DWZ56 | Active | Warehouse shipping API |
| @dnd-kit | Active | Drag-and-drop UI |
| react-slick | Active | Carousels |

---

## Database

**Primary Database**: `shopify_customers_db` (MongoDB)

Key Collections:
- `purchase_orders_1688` - 1688 order data with DWZ tracking
- `customers` - Shopify order/customer data
- `fulfillment_pipeline` - Fulfillment workflow tracking
- `tracking_counters` - Serial number counters for TNV tracking

---

## Credentials for Testing
- **Admin Login**: admin / admin
- **VPS**: 159.198.36.164 (SSH credentials in chat history)

---

*Last Updated: Feb 6, 2026*
