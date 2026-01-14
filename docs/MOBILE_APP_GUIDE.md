# Mobile App Development Guide for TNV Collection

## Overview

This guide provides a comprehensive plan for building a mobile app that mirrors the Namshi.com shopping experience, connected to your existing FastAPI backend.

---

## 1. Technology Recommendations

### Option A: React Native (Recommended)
**Best for:** Maximum code reuse with your existing React frontend

**Pros:**
- Share UI components and business logic with web frontend
- Single codebase for iOS and Android
- Large ecosystem and community
- Hot reload for fast development
- Access to native device features

**Tech Stack:**
- **Framework:** React Native with Expo (easier) or React Native CLI (more control)
- **Navigation:** React Navigation v6
- **State Management:** React Context (same as web) or Redux Toolkit
- **API Client:** Axios or fetch
- **UI Components:** React Native Paper or NativeBase

**Timeline:** 6-8 weeks for MVP

### Option B: Flutter
**Best for:** Native performance with single codebase

**Pros:**
- Excellent performance
- Beautiful animations (Material/Cupertino)
- Strong typing with Dart
- Growing ecosystem

**Cons:**
- Different language (Dart) from existing codebase
- Separate UI code from web

**Timeline:** 8-10 weeks for MVP

### Option C: Native (Swift + Kotlin)
**Best for:** Maximum performance and platform-specific features

**Pros:**
- Best performance
- Full access to platform features
- Better App Store optimization

**Cons:**
- Two separate codebases
- Higher development cost
- Longer development time

**Timeline:** 12-16 weeks for MVP

---

## 2. Recommended Architecture

```
┌─────────────────────────────────────────────────────┐
│                   MOBILE APP                         │
│  ┌─────────────────────────────────────────────┐   │
│  │              React Native App                │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │  Home   │ │ Browse  │ │ Product │       │   │
│  │  │  Screen │ │ Screen  │ │ Detail  │       │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘       │   │
│  │       │           │           │             │   │
│  │  ┌────┴───────────┴───────────┴────┐       │   │
│  │  │        API Service Layer        │       │   │
│  │  │  (Axios/Fetch + Auth Handler)   │       │   │
│  │  └───────────────┬─────────────────┘       │   │
│  └──────────────────┼──────────────────────────┘   │
│                     │                               │
└─────────────────────┼───────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────┐
│              EXISTING BACKEND (FastAPI)              │
│  ┌─────────────────────────────────────────────┐   │
│  │  /api/storefront/products                   │   │
│  │  /api/storefront/orders                     │   │
│  │  /api/storefront/collections                │   │
│  │  /api/storefront/config/navigation          │   │
│  │  /api/auth/login                            │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 3. API Endpoints Already Available

Your existing backend already provides all necessary endpoints:

### Products
```
GET /api/storefront/products?store=tnvcollection&limit=48&page=1
GET /api/storefront/products/{product_id}?store=tnvcollection
```

### Collections
```
GET /api/storefront/collections?store=tnvcollection
GET /api/storefront/collections/{handle}?store=tnvcollection
```

### Navigation & Config
```
GET /api/storefront/config/navigation/tnvcollection
GET /api/storefront/banners?store=tnvcollection
GET /api/storefront/home-config?store=tnvcollection
```

### Orders
```
POST /api/storefront/orders/cod
POST /api/storefront/orders
GET /api/storefront/orders/{order_id}
GET /api/storefront/orders/{order_id}/track
```

### Authentication (for customer accounts)
```
POST /api/auth/customer/register
POST /api/auth/customer/login
GET /api/auth/customer/profile
```

---

## 4. Mobile App Screens (Namshi-style)

### Screen 1: Home
- **Header:** Logo, Search, Cart icon with badge
- **Promo Banner:** Rotating carousel
- **Category Tabs:** WOMEN, MEN, KIDS, Beauty, Home
- **Product Carousel:** Horizontal scroll with "GET IT TODAY" labels
- **Category Circles:** Round images with labels
- **Promo Banners:** Full-width promotional graphics

### Screen 2: Category/Browse
- **Filter Bar:** Sort, Filter button
- **Filter Modal:** Price range, Size, Color, Brand
- **Product Grid:** 2 columns, infinite scroll
- **Quick Add to Cart:** Size selector overlay

### Screen 3: Product Detail
- **Image Gallery:** Swipeable images
- **Product Info:** Brand, Title, Price, Discount
- **Size Selector:** Horizontal pills
- **Color Selector:** Color circles
- **Add to Bag Button:** Fixed at bottom
- **Product Tabs:** Description, Details, Reviews

### Screen 4: Cart
- **Cart Items:** Product cards with quantity controls
- **Promo Code Input**
- **Order Summary:** Subtotal, Delivery, Total
- **Checkout Button:** Fixed at bottom

### Screen 5: Checkout
- **Step Progress:** Shipping → Payment → Confirm
- **Address Form:** With country/city selectors
- **Payment Options:** COD, Card, Apple/Google Pay
- **Order Review:** Final confirmation

### Screen 6: Account
- **Profile Info:** Name, Email, Phone
- **My Orders:** Order history with status
- **Wishlist:** Saved items
- **Addresses:** Saved addresses
- **Settings:** Region, Language, Notifications

---

## 5. Push Notifications

Implement push notifications for:
- Order confirmation
- Shipping updates
- Delivery confirmation
- Promotional offers
- Back in stock alerts
- Price drop alerts

**Services:**
- Firebase Cloud Messaging (FCM) - Android
- Apple Push Notification Service (APNs) - iOS
- OneSignal (unified solution)

---

## 6. Implementation Steps

### Phase 1: Setup (Week 1)
1. Initialize React Native project with Expo
2. Set up navigation structure
3. Create API service layer
4. Implement authentication flow

### Phase 2: Core Screens (Weeks 2-4)
1. Build Home screen with all components
2. Implement Product Listing with filters
3. Create Product Detail page
4. Build Cart functionality

### Phase 3: Checkout (Week 5)
1. Implement checkout flow
2. Add payment integration
3. Create order confirmation

### Phase 4: Account & Polish (Weeks 6-7)
1. Build Account screens
2. Implement wishlist
3. Add push notifications
4. Performance optimization

### Phase 5: Testing & Launch (Week 8)
1. Beta testing
2. Bug fixes
3. App Store submission
4. Google Play submission

---

## 7. Code Example: API Service

```javascript
// services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://wamerce.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Products
export const getProducts = (params) => 
  api.get('/storefront/products', { params: { store: 'tnvcollection', ...params } });

export const getProduct = (productId) => 
  api.get(`/storefront/products/${productId}`, { params: { store: 'tnvcollection' } });

// Orders
export const createOrder = (orderData) => 
  api.post('/storefront/orders/cod', orderData);

export const getOrder = (orderId) => 
  api.get(`/storefront/orders/${orderId}`);

// Navigation Config
export const getNavConfig = () => 
  api.get('/storefront/config/navigation/tnvcollection');

export default api;
```

---

## 8. Code Example: Product Card Component

```jsx
// components/ProductCard.js
import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

const ProductCard = ({ product, onAddToWishlist }) => {
  const navigation = useNavigation();
  
  const price = product.variants?.[0]?.price || product.price;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;
  const image = product.images?.[0]?.src;

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => navigation.navigate('ProductDetail', { productId: product.shopify_product_id })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.wishlistBtn} onPress={() => onAddToWishlist(product)}>
          <Icon name="heart" size={18} color="#999" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.info}>
        <Text style={styles.brand}>{product.vendor || 'TNV Collection'}</Text>
        <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
        
        <View style={styles.priceRow}>
          <Text style={styles.price}>AED {price}</Text>
          {comparePrice && (
            <Text style={styles.comparePrice}>AED {comparePrice}</Text>
          )}
        </View>
        
        <Text style={styles.delivery}>Free delivery</Text>
        <Text style={styles.eta}>
          GET IT <Text style={styles.etaHighlight}>TODAY</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  imageContainer: {
    aspectRatio: 3/4,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#e53935',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  info: {
    padding: 10,
  },
  brand: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    height: 32,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
  comparePrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  delivery: {
    fontSize: 11,
    color: '#666',
  },
  eta: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  etaHighlight: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
});

export default ProductCard;
```

---

## 9. Estimated Costs

### Development (One-time)
- **React Native MVP:** $15,000 - $25,000 (6-8 weeks)
- **Flutter MVP:** $18,000 - $30,000 (8-10 weeks)
- **Native Apps:** $35,000 - $60,000 (12-16 weeks)

### Ongoing (Monthly)
- **App Store Fees:** $99/year (Apple) + $25 one-time (Google)
- **Push Notifications:** $0-100/month (depending on volume)
- **Backend (already covered):** Your existing infrastructure
- **Maintenance:** 5-10% of development cost annually

---

## 10. Next Steps

1. **Decision:** Choose technology (Recommend: React Native with Expo)
2. **Design:** Create Figma mockups based on Namshi
3. **Development:** Start with MVP features
4. **Testing:** Beta test with real users
5. **Launch:** Submit to App Store and Google Play

---

## Questions?

If you need:
- Detailed technical specifications
- React Native boilerplate code
- Specific feature implementation
- Backend API modifications for mobile

Let me know and I can provide more detailed guidance!
