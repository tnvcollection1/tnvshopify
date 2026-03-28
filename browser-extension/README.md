# WaMerce 1688 Importer - Chrome Extension

A powerful browser extension for importing products from 1688.com to WaMerce with one click.

## E2E Testing Guide

### Prerequisites
1. **Chrome/Chromium Browser** (or Brave, Edge with Chromium)
2. **WaMerce Backend Running** - The extension connects to `https://catalog-sync-11.preview.emergentagent.com`
3. **1688.com Account** (optional, but recommended for full product details)

### Installation Steps

1. **Download the Extension**
   - The extension files are located at `/app/browser-extension`
   - Or download the folder from your deployment

2. **Load in Chrome Developer Mode**
   ```
   1. Open Chrome and go to chrome://extensions/
   2. Enable "Developer mode" (toggle in top-right corner)
   3. Click "Load unpacked"
   4. Select the /app/browser-extension folder
   5. The WaMerce icon 🛒 should appear in your toolbar
   ```

3. **Pin the Extension** (recommended)
   - Click the puzzle piece icon in Chrome toolbar
   - Click the pin icon next to "WaMerce 1688 Importer"

### E2E Test Scenarios

#### Test 1: Product Detail Page Import
**URL:** `https://detail.1688.com/offer/[any-product-id].html`

**Steps:**
1. Navigate to any 1688 product detail page
2. Wait for page to fully load (2-3 seconds)
3. Click the WaMerce extension icon
4. **Expected Results:**
   - Status dot should be GREEN (connected)
   - Page type should show "PRODUCT PAGE"
   - Product count should show "1"
   - Product preview should show image, title, and price
5. Click "Import 1 Products to WaMerce"
6. **Expected Results:**
   - Progress bar appears
   - Status updates: "Starting import..." → "Job started" → "Imported 1 products!"
   - Toast shows "Successfully imported 1 products!"

#### Test 2: Store Listing Page Import
**URL:** `https://[seller-name].1688.com/page/offerlist.htm`

**Steps:**
1. Navigate to any 1688 seller's product listing page
2. Wait for products to load
3. Click the WaMerce extension icon
4. **Expected Results:**
   - Status dot should be GREEN
   - Page type should show "STORE PAGE"
   - Product count should show multiple products (e.g., "24")
   - Product list shows first 10 products with previews
5. Click "Import X Products to WaMerce"
6. **Expected Results:**
   - Progress bar shows import progress
   - All products imported successfully

#### Test 3: Search Results Import
**URL:** `https://s.1688.com/selloffer/offer_search.htm?keywords=[search-term]`

**Steps:**
1. Go to 1688.com
2. Search for any product (e.g., "女装" for women's clothing)
3. Click the WaMerce extension icon
4. **Expected Results:**
   - Page type shows "SEARCH PAGE"
   - Multiple products detected
5. Click import and verify all products are imported

#### Test 4: Copy Product IDs
1. On any 1688 page with products
2. Click extension icon
3. Click "📋 Copy Product IDs"
4. **Expected:** Toast shows "Copied X product IDs!"
5. Paste in notepad to verify IDs are copied

#### Test 5: Rescan Page
1. On a 1688 page, scroll down to load more products
2. Click extension icon
3. Click "🔄 Rescan Page"
4. **Expected:** Product count updates to include newly loaded products

#### Test 6: Translation Option
1. Ensure "🌐 Translate Chinese → English" is checked
2. Import products
3. In WaMerce Product Collector, verify:
   - Product titles are in English (or have English translations)

#### Test 7: Floating Button (Content Script)
1. Navigate to any 1688 product or listing page
2. Look for orange "🛒 WaMerce Import" button at bottom-right
3. Hover over it - should show product count
4. Click it - should show alert with product count

#### Test 8: Connection Error Handling
1. Disconnect from internet or block the API URL
2. Click extension icon
3. **Expected:**
   - Status dot should be RED
   - Status text shows "Server unavailable"
   - Import button should still be clickable but will fail gracefully

#### Test 9: Non-1688 Page
1. Navigate to any non-1688 website (e.g., google.com)
2. Click extension icon
3. **Expected:**
   - Shows "Not on 1688.com" message
   - Provides link to "Go to 1688.com →"

### Verification in WaMerce Dashboard

After importing, verify products in WaMerce:

1. Click "Open WaMerce Dashboard →" in extension
2. Or navigate to: `https://catalog-sync-11.preview.emergentagent.com/product-collector`
3. Verify:
   - Imported products appear in the list
   - Product images are displayed
   - Titles are correct (translated if option was enabled)
   - Prices are captured
   - SKUs/variants are imported (for detail page imports)

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not working | Refresh the 1688 page, then try again |
| No products found | Wait for page to fully load, click "Rescan Page" |
| Status dot RED | Check internet connection, verify server is running |
| Import stuck | Check browser console (F12) for errors |
| Products not in WaMerce | Verify import completed, check Product Collector page |

### Console Debugging

1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for `[WaMerce v4]` log messages:
   - `Content script loaded` - Extension injected successfully
   - `Scraped: {id, title, images, skus}` - Product data extracted
   - `Found X products` - Listing page scan results

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/1688-scraper/products` | Health check / connection test |
| `POST /api/1688-scraper/extension-import` | Submit products for import |
| `GET /api/1688-scraper/job/{job_id}` | Poll import job status |

### Known Limitations

1. **Chinese Text**: Some titles remain in Chinese - enable translation for English
2. **Rate Limiting**: Don't import too many products too quickly (wait between imports)
3. **Login Required**: Some product variants may require being logged into 1688
4. **HTML Changes**: 1688 frequently updates their page structure - extension may need updates
