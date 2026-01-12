# TNC Collection Storefront

A standalone e-commerce storefront for TNC Collection stores, built with React + Vite + Tailwind CSS.

## 🏪 Stores

| Store | Domain | Currency |
|-------|--------|----------|
| TNC Collection India | tnvcollection.com | ₹ INR |
| TNC Collection Pakistan | tnvcollection.pk | Rs PKR |

## 🚀 Quick Deploy to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/tnc-storefront)

### Option 2: Manual Deploy

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial storefront"
   git remote add origin https://github.com/YOUR_USERNAME/tnc-storefront.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Deploy!

3. **Add Custom Domains**
   - Go to your project settings → Domains
   - Add `tnvcollection.com`
   - Add `tnvcollection.pk`
   - Update DNS records at your registrar

## ⚙️ Environment Variables

Create these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://wamerce.com` | Your backend API URL |
| `VITE_DEFAULT_STORE` | `tnvcollection` | Default store for development |

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── LuxuryStorefrontLayout.jsx   # Header, Footer, Cart
│   │   ├── LuxuryStorefrontHome.jsx     # Homepage
│   │   ├── LuxuryProductListing.jsx     # Product grid
│   │   ├── LuxuryProductDetail.jsx      # Product page
│   │   ├── LuxuryShoppingCart.jsx       # Cart page
│   │   ├── LuxuryCheckout.jsx           # Checkout flow
│   │   ├── LuxuryOrderConfirmation.jsx  # Order success
│   │   └── LuxuryOrderTracking.jsx      # Track order
│   ├── config/
│   │   └── storeConfig.js               # Store settings
│   ├── App.jsx                          # Routes
│   └── main.jsx                         # Entry point
├── .env.example                         # Environment template
└── vercel.json                          # Vercel config
```

## 🌐 Custom Domain Setup

### For tnvcollection.com (India):

1. In Vercel, add domain `tnvcollection.com`
2. At your DNS provider, add:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### For tnvcollection.pk (Pakistan):

1. In Vercel, add domain `tnvcollection.pk`
2. At your DNS provider, add:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

## 🔗 How Domain Detection Works

The storefront automatically detects which store to show based on the domain:

```javascript
// Domain → Store mapping
tnvcollection.com    → India store (₹ INR)
tnvcollection.pk     → Pakistan store (Rs PKR)
localhost            → Default store (configurable)
```

## 📱 Features

- ✅ Responsive design (mobile-first)
- ✅ Product listing with filters & sorting
- ✅ Product detail with image gallery
- ✅ Shopping cart with promo codes
- ✅ COD checkout (Cash on Delivery)
- ✅ WhatsApp order support
- ✅ Order tracking
- ✅ Multi-currency support
- ✅ SEO-friendly URLs

## 🛠️ Customization

### Update Store Info

Edit `src/config/storeConfig.js`:

```javascript
'tnvcollection': {
  name: 'Your Store Name',
  contact: {
    email: 'your@email.com',
    whatsapp: '+91XXXXXXXXXX',  // Your WhatsApp number
  },
  // ... other settings
}
```

### Update Branding

- Logo: Update in `LuxuryStorefrontLayout.jsx`
- Colors: Update in `tailwind.config.js`
- Fonts: Update in `index.html` and `index.css`

## 📄 License

Private - TNC Collection
