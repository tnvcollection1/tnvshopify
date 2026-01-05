# Chrome Extension v4.0 Testing Guide

## Installation

1. **Download the Extension**
   - Download from: `/api/download/chrome-extension` endpoint
   - Or find at: `/app/wamerce-1688-extension.zip`

2. **Install in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the unzipped `browser-extension` folder
   - The WaMerce 1688 Importer should appear

## Testing on 1688 Product Pages

### Test Case 1: Single Product Page Scraping

1. Go to a 1688 product page, e.g.:
   - https://detail.1688.com/offer/850596274690.html

2. Click the WaMerce floating button (orange "W" icon)

3. Click "Scrape This Product"

4. Verify the scraped data includes:
   - [ ] Product ID
   - [ ] Title (Chinese)
   - [ ] Price
   - [ ] Images (main gallery images)
   - [ ] Variants/SKUs (color and size options)

5. Click "Send to WaMerce"

6. Verify in app at `/product-scraper`:
   - [ ] Product appears in list
   - [ ] Click "Edit" to verify images and variants

### Test Case 2: Collection/Search Page Scraping

1. Go to a 1688 search results page, e.g.:
   - https://s.1688.com/selloffer/offer_search.htm?keywords=shoes

2. Click the WaMerce floating button

3. Click "Scan Page Products"

4. Verify it finds products with:
   - [ ] Product IDs
   - [ ] Titles
   - [ ] Prices
   - [ ] Thumbnail images

5. Select products to import

6. Click "Import Selected"

### Expected Results

#### On Product Detail Page:
- Extension should scrape ALL images from gallery
- Extension should scrape ALL variants (color/size combinations)
- Data should be sent to backend without using TMAPI

#### On Search/Collection Page:
- Extension should detect all product cards
- Extract basic info: ID, title, price, image
- Allow batch import

## Troubleshooting

### Issue: No images scraped
- Extension tries multiple sources: script data, gallery DOM, data attributes
- If no images found, click "Fetch Images & Variants" in Edit modal to get from TMAPI

### Issue: No variants scraped
- Modern 1688 pages load variants dynamically
- Extension attempts to extract from `window.iDetailData` and DOM
- Fallback: Use "Fetch Images & Variants" button

### Issue: Products not appearing in app
- Check browser console for errors
- Verify backend URL in extension settings
- Check network tab for API calls

## Console Logging

The extension logs to browser console with prefix `[WaMerce v4]`:
- `[WaMerce v4] Extracting images...`
- `[WaMerce v4] Found X main images, Y SKU images`
- `[WaMerce v4] Extracting variants...`
- `[WaMerce v4] Total variants: X`

## Files

- `/app/browser-extension/content.js` - Main scraping logic
- `/app/browser-extension/manifest.json` - Extension manifest (v4.0.0)
- `/app/wamerce-1688-extension.zip` - Installable package
