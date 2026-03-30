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
1. SKU Reconciliation (Google Sheet ↔ Shopify)
2. VPS Migration (203.161.38.75) with Nginx + SSL
3. Bulk Shopify Catalog Management (publish/unpublish/tag/price/collections)
4. Designer Shoes Pricing Update (8000-12500 INR range)
5. "Express Delivery" & "RTS" Collection Mapping
6. **Shri Maruti Logistics (Innofulfill) Full Integration** (March 30, 2026):
   - Auth service with auto-token refresh
   - Rate calculator (SURFACE & AIR, with compare)
   - Ecomm order booking (push-order)
   - Order tracking (status + history)
   - Shopify order auto-push to logistics
   - Bookings database with listing
7. Wedding Invitation Video Generator (programmatic MP4 creation)

### Logistics API Endpoints (All Tested & Working)
- `GET /api/logistics/auth-status` - Test Innofulfill auth
- `POST /api/logistics/calculate-rate` - Calculate shipping rate
- `POST /api/logistics/calculate-rate/compare` - Compare SURFACE vs AIR
- `POST /api/logistics/book-order` - Book order with Shri Maruti
- `POST /api/logistics/cancel-order` - Cancel booked orders
- `GET /api/logistics/track/{tracking_id}` - Current tracking status
- `GET /api/logistics/track/{tracking_id}/history` - Full tracking history
- `POST /api/logistics/push-shopify-order` - Auto-push Shopify orders
- `GET /api/logistics/bookings` - List all bookings

## Pending / In-Progress
- P1: Shopify Product Categorization Fix (Size 45 filter)
- P1: Pricing Formula Update (awaiting user details)
- P2: 1688 API token auto-refresh
- P2: Namshi-style Shopify Theme (on hold)

## Future/Backlog
- Sales Dashboard, Order Tracking UI, Wishlist, Reviews
- Razorpay checkout flow
- Abandoned cart recovery (WhatsApp)
- Zong VPBX outbound calls

## Third-Party Integrations
| Service | Status | Notes |
|---------|--------|-------|
| Shopify Admin API | Active | User API Key |
| Google Sheets | Active | Service Account |
| Innofulfill/Delcaper | **Active** | Auto-auth, vendor: tnvc |
| 1688.com | Broken | Token expires |
| Zong VPBX | Blocked | Awaiting API docs |
