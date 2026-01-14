# Wamerce - Multi-Tenant E-Commerce Platform

## Original Problem Statement
Build a multi-tenant e-commerce platform (`wamerce.com`) allowing merchants to have their own stores with custom domains. Current focus: Complete storefront redesign inspired by `namshi.com` and mobile app development.

## Core Requirements
- Multi-tenant architecture with custom domains
- Namshi.com-inspired storefront UI
- React Native mobile app
- Admin panel for store management
- Dynamic header/menu/banner configuration
- Multi-store support with different currencies (INR/PKR)
- Mega Menu with Visual Builder
- Core E-Commerce Features
- **Admin Panel Currency Consistency** ✅ NEW
- **Mobile App Push Notifications** ✅ NEW
- **Mobile App Offline Mode** ✅ NEW

## What's Been Implemented

### January 14, 2026 (Session 3 - Latest)

**Admin Panel Currency Consistency** ✅ COMPLETED
- Added `formatPrice`, `getCurrencySymbol`, `getCurrencyConfig` to StoreContext
- Updated CompetitorDashboard.jsx to use store-aware currency formatting
- Updated CompetitorPriceCatalog.jsx to use store-aware currency formatting
- Currency configs: INR (₹) for tnvcollection, PKR (Rs.) for tnvcollectionpk
- All admin pages now display correct currency based on selected store

**Mobile App Push Notifications** ✅ COMPLETED
- Backend API (`/api/push-notifications/*`):
  - Device registration (iOS/Android)
  - Send notifications to specific customers
  - Templated notifications (order_confirmed, order_shipped, order_delivered, back_in_stock, price_drop, cart_reminder)
  - Order status change notifications
  - Bulk notification sending
  - Notification statistics
- Mobile app service (`pushNotifications.js`):
  - Expo Push Notifications integration
  - Permission handling
  - Android notification channels
  - Token registration with backend
  - Notification settings persistence

**Mobile App Offline Mode** ✅ COMPLETED
- Offline service (`offlineService.js`):
  - Network status monitoring with NetInfo
  - Product caching with expiration (24h)
  - Cart caching (persists offline)
  - Wishlist caching (persists offline)
  - Recently viewed products cache
  - Pending actions queue for offline sync
  - Cache statistics and management
- React hooks (`useOffline.js`):
  - `useNetworkStatus()` - Network monitoring
  - `useOfflineData()` - Offline-first data fetching
  - `usePushNotifications()` - Push notification management
  - `useOfflineCart()` - Offline cart management
  - `useOfflineWishlist()` - Offline wishlist management
- Notification Settings Screen (`NotificationSettingsScreen.js`):
  - Enable/disable push notifications
  - Notification type preferences (orders, promotions, back-in-stock, price drops, new arrivals)
  - Cache statistics display
  - Clear offline data option

### January 14, 2026 (Session 2)

**Core E-Commerce Features** ✅ COMPLETED
- Order Tracking System (routes, timeline view, carrier tracking)
- Wishlist System (add/remove, share, move-to-cart)
- Product Reviews & Ratings (create, moderate, vote, filter)
- Customer Account Section (dashboard, orders, addresses, settings)
- Stock & Notifications (back-in-stock alerts)
- Recently Viewed Products

### January 14, 2026 (Session 1)

**Mega Menu with Visual Builder** ✅ COMPLETED
**Multi-Store/Multi-Currency Support** ✅ COMPLETED
**Sales Dashboard** ✅ COMPLETED
**Checkout + Razorpay Payment** ✅ COMPLETED

## Architecture

```
/app/
├── backend/
│   ├── routes/
│   │   ├── ecommerce.py           # E-commerce APIs
│   │   ├── mega_menu.py           # Mega menu configuration
│   │   ├── push_notifications.py  # NEW: Push notification APIs
│   │   ├── analytics.py           # Dashboard analytics
│   │   ├── checkout.py            # Cart & checkout
│   │   └── ...
│   └── uploads/
├── frontend/
│   ├── src/
│   │   ├── contexts/
│   │   │   └── StoreContext.jsx   # UPDATED: formatPrice, getCurrencySymbol
│   │   └── components/
│   │       ├── CompetitorDashboard.jsx  # UPDATED: Store-aware currency
│   │       ├── CompetitorPriceCatalog.jsx # UPDATED: Store-aware currency
│   │       └── store/
└── mobile-app/
    └── src/
        ├── services/
        │   ├── pushNotifications.js  # NEW: Push notification service
        │   └── offlineService.js     # NEW: Offline caching service
        ├── hooks/
        │   └── useOffline.js         # NEW: Offline/push hooks
        └── screens/
            └── NotificationSettingsScreen.js  # NEW: Settings UI
```

## Key API Endpoints

### Push Notifications APIs (NEW)
- `POST /api/push-notifications/register` - Register device for push
- `DELETE /api/push-notifications/unregister/{token}` - Unregister device
- `POST /api/push-notifications/send/{customer_id}` - Send to customer
- `POST /api/push-notifications/send-bulk` - Send bulk notifications
- `POST /api/push-notifications/send-template/{template}/{customer_id}` - Send templated notification
- `POST /api/push-notifications/notify-order-status/{order_id}` - Notify on order status change
- `GET /api/push-notifications/stats` - Get notification statistics
- `GET /api/push-notifications/devices/{customer_id}` - Get customer devices

### E-Commerce APIs
- Order Tracking: `GET /api/ecommerce/orders/track/{order_id}`
- Wishlist: `GET/POST/DELETE /api/ecommerce/wishlist/{customer_id}/*`
- Reviews: `GET/POST /api/ecommerce/reviews/*`
- Customer: `GET/PUT /api/ecommerce/customer/{customer_id}/*`

### Store & Menu APIs
- `GET/POST /api/mega-menu/config/{store}` - Mega menu configuration
- `GET /api/analytics/overview?store={store}` - Dashboard metrics

## Access URLs
- **India Store**: `/tnv` (INR currency ₹)
- **Pakistan Store**: `/tnv-pk` (PKR currency Rs.)
- **Order Tracking**: `/tnv/track` or `/tnv-pk/track`
- **Wishlist**: `/tnv/wishlist` or `/tnv-pk/wishlist`
- **Account**: `/tnv/account` or `/tnv-pk/account`
- **Admin Pages**: `/competitor-dashboard`, `/sales-dashboard`, `/store-settings`
- **Login**: admin / admin

## Prioritized Backlog

### P0 (Critical) - ALL COMPLETED ✅
- [x] Header matches Namshi.com
- [x] Multi-store/Multi-currency (INR/PKR)
- [x] Mega Menu with visual builder
- [x] Core E-commerce features
- [x] Admin panel currency consistency
- [x] Mobile app push notifications
- [x] Mobile app offline mode

### P1 (High Priority)
- [ ] Deploy storefront to VPS (`tnvcollection.com`)
- [ ] DNS setup for `tnvcollection.pk` (A record → 159.198.36.164)

### P2 (Medium Priority)
- [ ] Sooxie.com API integration
- [ ] Mobile app store submission preparation

### P3 (Low Priority)
- [ ] Backend file refactoring (split server.py, alibaba_1688.py)
- [ ] Automated security testing

## Test Reports
- `/app/test_reports/iteration_37.json` - Push notifications & currency (21/21 passed)
- `/app/test_reports/iteration_36.json` - E-commerce features (32/32 passed)

## Credentials
- Admin: `admin` / `admin`
- VPS IP: `159.198.36.164`
- MongoDB Atlas: `mongodb+srv://wamerce:Wamerce2026!@cluster0.uggtqki.mongodb.net/`

## Mobile App Dependencies (Updated)
- expo-notifications
- expo-device
- expo-constants
- @react-native-community/netinfo
- @react-native-async-storage/async-storage
