# TNV Collection Mobile App

A React Native mobile app for the TNV Collection e-commerce platform, built with Expo.

## 📱 Features

- **Home Screen**: Promotional banners, category circles, product carousels
- **Browse/Category**: Product listing with filters and sorting
- **Product Detail**: Image gallery, size/color selection, add to cart
- **Shopping Cart**: Quantity controls, order summary, free delivery threshold
- **Checkout**: Multi-step checkout with COD support
- **Wishlist**: Save and manage favorite items
- **Account**: User profile, region selector, order history
- **Search**: Product search with suggestions
- **Order Tracking**: Real-time order status with timeline

## 🛠️ Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **State Management**: React Context API
- **API Client**: Axios
- **Local Storage**: AsyncStorage
- **UI Components**: Custom components with Expo icons

## 📂 Project Structure

```
/mobile-app
├── App.js                    # App entry point with providers
├── package.json              # Dependencies
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Header.js         # App header with search, cart
│   │   ├── ProductCard.js    # Product card for listings
│   │   ├── CategoryCircle.js # Category button
│   │   └── PromoBanner.js    # Promotional banners
│   │
│   ├── context/              # React Context providers
│   │   ├── AuthContext.js    # Authentication state
│   │   ├── CartContext.js    # Shopping cart state
│   │   └── StoreContext.js   # Store config, region, wishlist
│   │
│   ├── navigation/           # React Navigation setup
│   │   ├── RootNavigator.js  # Main stack navigator
│   │   ├── MainTabNavigator.js # Bottom tab navigation
│   │   └── AuthNavigator.js  # Auth flow screens
│   │
│   ├── screens/              # App screens
│   │   ├── HomeScreen.js     # Home/landing page
│   │   ├── BrowseScreen.js   # Product listing
│   │   ├── ProductDetailScreen.js # Product detail
│   │   ├── CartScreen.js     # Shopping cart
│   │   ├── CheckoutScreen.js # Checkout flow
│   │   ├── WishlistScreen.js # Saved items
│   │   ├── AccountScreen.js  # User profile
│   │   ├── SearchScreen.js   # Product search
│   │   ├── CategoryScreen.js # Category products
│   │   ├── OrderConfirmationScreen.js # Order success
│   │   ├── OrderTrackingScreen.js # Track order
│   │   └── auth/             # Auth screens
│   │       ├── LoginScreen.js
│   │       ├── RegisterScreen.js
│   │       └── ForgotPasswordScreen.js
│   │
│   ├── services/             # API services
│   │   └── api.js            # API client with all endpoints
│   │
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Utility functions
│   └── assets/               # Images, fonts, etc.
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your device (for testing)

### Installation

```bash
# Navigate to mobile app directory
cd mobile-app

# Install dependencies
npm install
# or
yarn install
```

### Running the App

```bash
# Start the development server
npm start
# or
expo start
```

Then:
- Scan the QR code with Expo Go (Android)
- Scan with Camera app (iOS) or press 'i' for iOS simulator
- Press 'a' for Android emulator
- Press 'w' for web preview

### Running on Simulators

```bash
# iOS (requires macOS + Xcode)
npm run ios

# Android (requires Android Studio)
npm run android

# Web
npm run web
```

## 🔌 API Configuration

The app connects to the TNV Collection backend. Update the API URL in `src/services/api.js`:

```javascript
const API_URL = 'https://wamerce.com/api';
```

For development, you can use the preview URL or localhost.

## 📱 Available API Endpoints

### Products
- `GET /storefront/products` - List products
- `GET /storefront/products/:id` - Product detail
- `GET /storefront/products/search` - Search products

### Collections
- `GET /storefront/collections` - List collections
- `GET /storefront/collections/:handle` - Collection detail

### Orders
- `POST /storefront/orders/cod` - Create COD order
- `GET /storefront/orders/:id` - Order detail
- `GET /storefront/orders/:id/track` - Track order

### Authentication
- `POST /auth/customer/login` - Login
- `POST /auth/customer/register` - Register
- `GET /auth/customer/profile` - Get profile

## 🎨 Customization

### Colors & Theme
Edit the color values in component StyleSheets or create a theme file:

```javascript
// src/theme/colors.js
export const colors = {
  primary: '#000000',
  secondary: '#FF6B9D',
  success: '#22c55e',
  error: '#ef4444',
  // ...
};
```

### Region & Currency
Regions are defined in `StoreContext.js`:

```javascript
const REGIONS = [
  { code: 'AE', currency: 'AED', rate: 3.67 },
  { code: 'PK', currency: 'PKR', rate: 278.50 },
  // Add more regions
];
```

## 📦 Building for Production

### Expo Build (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Standalone Build

```bash
# Build APK (Android)
expo build:android -t apk

# Build AAB for Play Store
expo build:android -t app-bundle

# Build for iOS App Store
expo build:ios
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### E2E Tests (Detox)
```bash
# Build for testing
detox build --configuration ios.sim.debug

# Run tests
detox test --configuration ios.sim.debug
```

## 📝 License

Proprietary - TNV Collection / WaMerce

## 🤝 Support

For questions or issues:
- Email: support@wamerce.com
- WhatsApp: +971 50 XXX XXXX
