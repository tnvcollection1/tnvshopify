# Wamerce.com - Product Requirements Document

## Original Problem Statement
Multi-tenant e-commerce platform (wamerce.com) for tnvcollection.com. Key integrations include Shopify Admin API, Google Sheets sync, logistics, and catalog management.

## Architecture
- **Frontend**: React (deployed via Nginx on VPS 203.161.38.75)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas
- **VPS**: AlmaLinux 9 at /opt/wamerce/

## What's Been Implemented

### Completed Features
1. SKU Reconciliation (Google Sheet <> Shopify)
2. VPS Migration (203.161.38.75) with Nginx + SSL
3. Bulk Shopify Catalog Management (publish/unpublish/tag/price/collections)
4. Designer Shoes Pricing Update (8000-12500 INR range)
5. "Express Delivery" & "RTS" Collection Mapping
6. **Shri Maruti Logistics Full Integration** (March 30, 2026):
   - Auth service with auto-token refresh
   - Rate calculator (SURFACE & AIR, with compare)
   - Ecomm order booking (push-order)
   - Order cancellation, tracking (status + history)
   - Shopify order auto-push
7. **Logistics Dashboard UI** (March 30, 2026):
   - Rate Calculator tab (Surface vs Air comparison)
   - Book tab (manual + Shopify auto-push)
   - Shipments tab (listing with status/AWB/amounts)
   - Track tab (real-time status + timeline history)
8. **Bulk Shipping Feature** (March 30, 2026):
   - Lists all 423+ paid/unfulfilled orders from DB
   - Select multiple orders via checkboxes / select-all
   - One-click "Ship (N)" pushes all selected to Shri Maruti
   - Search by order #, customer name, phone
   - Surface/Air delivery mode selection
   - Shows push results (success/failed/skipped per order)
   - Already-booked orders marked as "Shipped" and disabled
9. Wedding Invitation Video Generator

### API Endpoints (All Tested)
- `GET /api/logistics/auth-status`
- `POST /api/logistics/calculate-rate`
- `POST /api/logistics/calculate-rate/compare`
- `POST /api/logistics/book-order`
- `POST /api/logistics/cancel-order`
- `GET /api/logistics/track/{id}`
- `GET /api/logistics/track/{id}/history`
- `POST /api/logistics/push-shopify-order`
- `GET /api/logistics/bookings`
- `GET /api/logistics/shippable-orders` (NEW)
- `POST /api/logistics/bulk-push` (NEW)

## Pending / In-Progress
- P1: Shopify Product Categorization Fix (Size 45 filter)
- P1: Pricing Formula Update (awaiting user details)
- P2: 1688 API token auto-refresh

## Future/Backlog
- Sales Dashboard, Wishlist, Reviews
- Razorpay checkout flow
- Abandoned cart recovery (WhatsApp)
- Zong VPBX outbound calls
- Namshi-style Shopify theme

## Key Files
- `/app/backend/services/innofulfill_service.py` - Innofulfill API client
- `/app/backend/routes/logistics.py` - All logistics routes
- `/app/frontend/src/components/LogisticsDashboard.jsx` - Full dashboard UI
- `/app/backend/tests/test_logistics.py` - Backend tests (15/15 pass)

## Testing Status
- Test reports: iteration_43.json (initial), iteration_44.json (bulk ship)
- Backend: 15/15 tests passed (100%)
- Frontend: All features verified (100%), all regressions pass
