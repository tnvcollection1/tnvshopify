# TNV Collection — Shopify Hydrogen Storefront

Production Hydrogen (Remix/React Router 7) storefront for **tnvcollection.com**.
Connected to the live Shopify catalog via the Storefront API. Customer checkout
is handled natively by Shopify (Razorpay is the payment gateway inside Shopify
Payments; abandoned-cart emails fire automatically).

## Directory

```
/app/tnvhydrogen/
├── app/
│   ├── routes/           # Remix routes (each file = a URL)
│   │   ├── _index.tsx              (/) Home — TNV hero + trending
│   │   ├── products.$handle.tsx    (/products/:handle) PDP
│   │   ├── collections._index.tsx  (/collections) Collection list
│   │   ├── collections.$handle.tsx (/collections/:handle) Collection
│   │   ├── cart.tsx                (/cart) Cart page
│   │   ├── account.*.tsx           (/account) Customer account
│   │   └── ...
│   ├── components/       # Reusable components (Header, ProductItem, etc.)
│   ├── lib/              # Hydrogen context, session, GraphQL fragments
│   ├── styles/           # Global CSS (app.css has TNV overrides)
│   ├── graphql/          # Generated Storefront API types
│   └── root.tsx          # Root layout
├── public/               # Static assets
├── server.ts             # Hydrogen server entry (MiniOxygen / Oxygen)
├── vite.config.ts
├── package.json
└── .env                  # Local dev env — fill values before running
```

## Required environment variables

These are read from `.env` locally and from your deployment environment
(Oxygen / VPS) in production.

| Variable | Where to get it | Status |
|---|---|---|
| `SESSION_SECRET` | Any random 40-char hex (we used the Hydrogen-generated one) | ✅ Set |
| `PUBLIC_STORE_DOMAIN` | `tnvcollection.myshopify.com` | ✅ Set |
| `PUBLIC_STOREFRONT_API_VERSION` | `2024-10` | ✅ Set |
| `PUBLIC_CHECKOUT_DOMAIN` | `tnvcollection.com` | ✅ Set |
| `PRIVATE_STOREFRONT_API_TOKEN` | Shopify Admin → Hydrogen → your storefront → Storefront API → **Private access token** → "View environment variable" | ✅ Set |
| `PUBLIC_STOREFRONT_API_TOKEN` | Same panel → **Public access token** | ⚠️ **FILL IN** |
| `PUBLIC_STOREFRONT_ID` | Same panel → `PUBLIC_STOREFRONT_ID` | ⚠️ **FILL IN** |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` | Shopify Admin → Customer Accounts → Headless → API credentials (only needed if using customer login) | Optional |
| `PUBLIC_CUSTOMER_ACCOUNT_API_URL` | Same panel | Optional |

To fill the missing values, in Shopify Admin go to **Sales channels → Hydrogen → Tnvhydrogen → Storefront API tab → click "View environment variable"** — it shows all values with copy buttons. Paste them into `.env`.

## Local development

```bash
cd /app/tnvhydrogen
npm install          # or yarn
npm run dev          # starts MiniOxygen on http://localhost:3000
```

## Build for production

```bash
npm run build        # builds client + server bundles into dist/
npm run preview      # preview the production build locally
```

## Deploy

Pick one of:

1. **Shopify Oxygen** (native Hydrogen hosting — recommended):
   - Connect this repo in Shopify Admin → Hydrogen → Storefronts → your storefront → Deployments
   - Oxygen auto-builds on every push to the connected branch. Env vars are read from the Hydrogen storefront settings.

2. **Custom VPS** (your current setup):
   - On VPS: `cd /path/to/tnvhydrogen && npm ci && npm run build && npm run preview`
   - `npm run preview` runs MiniOxygen on port 3000 — put Nginx in front and point `tnvcollection.com` at it.
   - Make sure the VPS has Node 20.x and all env vars exported in the shell/systemd unit.

## What has been customized from the skeleton

1. **`app/routes/_index.tsx`** — rewritten for TNV: announcement bar, sage-green hero block, "Trending Now" grid, value props.
2. **`app/styles/app.css`** — appended TNV theme tokens, hero gradient, and button styles.
3. **Meta tags** — TNV-branded page titles and descriptions.

All other routes (PDP, collections, cart, account, blogs, search, etc.) are the
stock Hydrogen skeleton components. They already work out of the box against the
live catalog — styling can be iterated on in follow-up sessions.

## Checkout flow

Customers do **not** pay inside Hydrogen. When they click Checkout (from the
cart page), Hydrogen redirects them to `cart.checkoutUrl`, which is Shopify's
native hosted checkout at `https://tnvcollection.com/checkouts/...`. Razorpay
appears as the payment method because it's configured in Shopify Payments.

This also enables **native abandoned-cart recovery emails** from Shopify —
no extra wiring needed.

## Credentials left untouched

- `SESSION_SECRET` = `9742f6d595583b00fa94916f3c51e8450398245d` (Hydrogen-provided)
- `PRIVATE_STOREFRONT_API_TOKEN` = `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`

Both are currently hard-coded in `.env` for convenience. Rotate before public launch.
