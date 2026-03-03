# Wamerce - Multi-Tenant E-commerce Platform

## Original Problem Statement
Build a multi-tenant e-commerce platform (wamerce.com) with comprehensive fulfillment workflow involving Shopify, 1688.com, and DWZ shipping platform.

## Core Architecture
- **Frontend**: React with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **External Integrations**: Shopify, 1688.com, DWZ56, BVM Voice API, Razorpay, DTDC

## What's Been Implemented

### Completed Features (as of Feb 2026)

#### Shopify Integration
- [x] Order sync from Shopify stores
- [x] Product catalog management
- [x] Theme API for programmatic modifications
- [x] **Discount percentage badges** on product cards (Feb 17, 2026)
- [x] **Product selection checkboxes** for bulk operations (Feb 23, 2026)
- [x] **Auto-Link to 1688** now works with selected products (Feb 23, 2026)

#### AI Product Title & Variant Optimization (tnvcollectionpk) - COMPLETED Feb 28, 2026
- [x] Identified and rewrote 266 machine-translated product titles using GPT-4o-mini
- [x] Translated all Chinese variant option values (colors, styles) to English
- [x] Fixed 6 products with Chinese option names (颜色分类 -> Color, 尺码 -> Size)
- [x] Cleaned up messy concatenated variant names (e.g. "2095BlackHeight-Increasing" -> "2095 Black Height-Increasing")
- [x] Final scan: 0 Chinese text remaining across all 2,095 products

#### COD Blocker for RTO Customers (tnvcollectionpk) - COMPLETED Mar 3, 2026
- [x] Backend API (`/api/cod-blocker/sync`) scans all cancelled+fulfilled orders, identifies RTO customers
- [x] Tags RTO customers with "no-cod" in Shopify (27 customers tagged)
- [x] Theme snippet injected showing "COD not available" warning on cart page for tagged customers
- [x] Webhook endpoint (`/api/cod-blocker/check-new-order`) auto-cancels COD orders from blocked customers
- [x] Admin APIs: `/api/cod-blocker/status`, `/api/cod-blocker/check/{email}`, `/api/cod-blocker/blocked-customers`
- [ ] **Note**: Standard Shopify plan cannot hide payment methods at checkout. The solution uses cart-page warnings + auto-cancellation of COD orders from blocked customers

#### VPS Deployment - COMPLETED Mar 3, 2026
- [x] SSH access restored to VPS (159.198.36.164)
- [x] Deployed new backend routes: cod_blocker.py, zong_vpbx.py, bvm_calling.py, shopify_themes.py, facebook_data_deletion.py
- [x] Updated server.py with new route imports and includes
- [x] Built and deployed admin panel frontend (React build)
- [x] PM2 backend restarted and running
- [x] COD blocker sync executed on production — 38 customers tagged

#### Zong VPBX Voice Calling (tnvcollectionpk)
- [x] **API Integration Complete** (Feb 23, 2026)
- [x] Call logs fetching with recordings
- [x] Urdu/English call templates for Pakistan market
- [x] Order-based calling endpoints
- [x] Bulk calling support
- [ ] Automated outbound calls (pending API capability check)

#### 1688.com Integration
- [x] Product sourcing from 1688
- [x] Purchase order management
- [x] Logistics status sync
- [ ] **Automated OAuth2 token refresh** (IN PROGRESS - needs refresh_token)

#### DWZ56 Shipping
- [x] Complete API integration
- [x] "Delete and recreate" workflow (write-once API limitation)
- [x] Field mapping: cNum (seller tracking), cRNo (internal ref), cMemo (color/size), cMark (Shopify order#)
- [x] Consolidated shipment handling with suffixes (-01, -02)
- [x] Bulk operations for record management

#### BVM Voice Calling
- [x] API integration scaffolding created
- [ ] **Configuration pending** (needs user credentials)

### Key Files
- `/app/backend/routes/shopify_themes.py` - Shopify theme management API
- `/app/backend/routes/alibaba_1688.py` - 1688 API integration
- `/app/backend/routes/dwz56.py` - DWZ shipping workflow
- `/app/backend/routes/bvm_calling.py` - BVM voice API integration

## Known Issues

### P0 - Critical
- **1688 API Token Expiry**: Tokens expire frequently causing 401 errors. Need automated refresh token flow.

### P1 - High Priority
- **tnvcollectionpk Store**: 20,000+ orders synced

### P2 - Medium Priority
- **Bulk Operation Timeouts**: Long-running operations need background task refactoring
- **BVM Voice API**: Awaiting credentials for configuration

## Prioritized Backlog

### P0 - Must Have
1. Complete 1688 OAuth2 refresh token automation
2. Store-specific order sync functionality

### P1 - Should Have
1. BVM Voice Calling configuration
2. Background task implementation for bulk operations
3. Sales Dashboard
4. Order Tracking system

### P2 - Nice to Have
1. Mega Menu visual builder
2. Razorpay checkout flow
3. WhatsApp abandoned cart recovery
4. Merchant onboarding wizard
5. Shopify-like visual "Pro" editors
6. AI Image Enhancer
7. Instagram-style Stories
8. Product Quick View modal
9. "Complete the Look" feature
10. Flash Sale countdown banner

## Technical Notes

### DWZ API Constraint
The DWZ API is "write-once" - records cannot be updated. To modify a record:
1. Delete the existing record
2. Create a new record with updated data

### 1688 Token Management
- Current tokens are short-lived
- Need `refresh_token` from user to implement auto-refresh
- Auth URL endpoint: `/api/1688/auth/get-url`

### Shopify Theme Modification
Theme files can be programmatically edited via:
- `PUT /api/shopify/themes/{theme_id}/assets`
- Published theme ID: 147303956646 (install-me-wokiee-3-0-0)
