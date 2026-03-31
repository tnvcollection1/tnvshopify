# Wamerce.com - Product Requirements Document

## Original Problem Statement
Multi-tenant e-commerce platform (wamerce.com) for tnvcollection.com. Key integrations include Shopify Admin API, Google Sheets sync, Shri Maruti Logistics, and catalog management.

## Architecture
- **Frontend**: React (deployed via Nginx on VPS 203.161.38.75)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas
- **VPS**: AlmaLinux 9 at /opt/wamerce/

## What's Been Implemented

### Shri Maruti Logistics (InnoFulfill) - Complete Integration
1. **Auth Service** — Auto-login with JWT token refresh
2. **Rate Calculator** — SURFACE/AIR comparison, zone/weight details
3. **Order Booking** — Manual booking + Shopify auto-push
4. **Order Tracking** — Real-time status + full history timeline
5. **Bulk Shipping** — Select multiple orders from DB, one-click push
6. **Auto-Push (Shopify → InnoFulfill)** — Webhook-based automation:
   - Shopify `orders/paid` webhook registered (ID: 2164300185766)
   - Background task auto-pushes paid orders to InnoFulfill
   - Enable/disable toggle with settings (delivery mode, pickup address)
   - Push failure logging for debugging
7. **Dashboard UI** — 6 tabs: Rates, Bulk Ship, Book, Shipments, Track, Auto-Push

### API Endpoints (21 tests, all passing)
- `GET /api/logistics/auth-status`
- `POST /api/logistics/calculate-rate`
- `POST /api/logistics/calculate-rate/compare`
- `POST /api/logistics/book-order`
- `POST /api/logistics/cancel-order`
- `GET /api/logistics/track/{id}`
- `GET /api/logistics/track/{id}/history`
- `POST /api/logistics/push-shopify-order`
- `GET /api/logistics/bookings`
- `GET /api/logistics/shippable-orders`
- `POST /api/logistics/bulk-push`
- `GET /api/logistics/auto-push/settings`
- `POST /api/logistics/auto-push/settings`
- `POST /api/logistics/register-webhook`
- `GET /api/logistics/webhooks`
- `GET /api/logistics/push-failures`

### Other Completed Features
- SKU Reconciliation, VPS Migration, Bulk Catalog Management
- Designer Shoes Pricing, Collection Mapping
- Wedding Invitation Video Generator

## Pending
- P1: Shopify Product Categorization Fix (Size 45 filter)
- P1: Pricing Formula Update (awaiting user details)

## Future/Backlog
- 1688 API token auto-refresh
- Sales Dashboard, Razorpay checkout
- Abandoned cart recovery (WhatsApp)
- Namshi-style Shopify theme

## Key Files
- `/app/backend/services/innofulfill_service.py`
- `/app/backend/routes/logistics.py`
- `/app/backend/routes/shopify_webhooks.py` (auto_push_to_innofulfill)
- `/app/frontend/src/components/LogisticsDashboard.jsx`
- `/app/backend/tests/test_logistics.py` (21 tests)

## Testing
- iteration_43: Initial logistics (9/9 pass)
- iteration_44: + Bulk ship (15/15 pass)
- iteration_45: + Auto-push settings (21/21 pass, all regressions pass)
