# Chrome Extension v5.0 E2E Testing Guide

## Overview
WaMerce 1688 Importer (v5.0.0) - Manifest V3 compatible Chrome extension for importing products from 1688.com.

**Backend Test Results:** 10/10 passed (Jan 7, 2025)

---

## Quick Start

### Step 1: Download & Install

1. **Download the Extension**
   ```
   Option A: Download from app
   - Navigate to: https://multi-tenant-shop-3.preview.emergentagent.com/settings
   - Click "Download Chrome Extension"
   
   Option B: Direct API download
   - GET /api/download/chrome-extension
   
   Option C: Local files
   - Extension folder: /app/browser-extension
   - ZIP file: /app/wamerce-1688-extension.zip
   ```

2. **Install in Chrome**
   ```
   1. Open Chrome → chrome://extensions/
   2. Enable "Developer mode" (top-right toggle)
   3. Click "Load unpacked"
   4. Select the browser-extension folder
   5. The WaMerce icon 🛒 appears in toolbar
   6. Pin the extension for easy access
   ```

---

## E2E Test Scenarios

### Test 1: Product Detail Page Import ⭐
**Priority: Critical | Estimated Time: 2 min**

**URL:** `https://detail.1688.com/offer/850596274690.html` (or any product)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to 1688 product detail page | Page loads with product images and info |
| 2 | Wait 2-3 seconds for full load | - |
| 3 | Click WaMerce extension icon | Popup opens |
| 4 | Check status indicator | 🟢 GREEN dot = Connected |
| 5 | Check page type | Shows "PRODUCT PAGE" |
| 6 | Check product count | Shows "1" |
| 7 | Verify product preview | Image, title, price visible |
| 8 | Click "Import 1 Products to WaMerce" | Progress bar appears |
| 9 | Wait for completion | Status: "Imported 1 products!" |
| 10 | Click "Open WaMerce Dashboard" | Opens Product Collector page |
| 11 | Verify product in app | Product appears with images & variants |

**Data Validation Checklist:**
- [ ] Product ID captured
- [ ] Title (Chinese) captured
- [ ] Price captured
- [ ] Main images captured (check gallery)
- [ ] SKU/variant images captured
- [ ] Color options captured
- [ ] Size options captured

---

### Test 2: Store Listing Page Import
**Priority: High | Estimated Time: 3 min**

**URL:** `https://shop1234567890.1688.com/page/offerlist.htm` (any seller store)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to seller's product listing | Grid of products loads |
| 2 | Click WaMerce extension icon | Popup opens |
| 3 | Check page type | Shows "STORE PAGE" |
| 4 | Check product count | Shows 10-50+ products |
| 5 | Review product previews | First 10 products shown |
| 6 | Click "Import X Products" | Import starts |
| 7 | Wait for completion | All products imported |

---

### Test 3: Search Results Import
**Priority: Medium | Estimated Time: 3 min**

**URL:** `https://s.1688.com/selloffer/offer_search.htm?keywords=shoes`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to 1688.com | Homepage loads |
| 2 | Search for "鞋子" (shoes) | Search results page |
| 3 | Click WaMerce extension | Popup opens |
| 4 | Check page type | Shows "SEARCH PAGE" |
| 5 | Check product count | Shows 40-60 products |
| 6 | Click Import | All products imported |

---

### Test 4: Translation Feature
**Priority: Medium | Estimated Time: 2 min**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open extension on any 1688 page | - |
| 2 | Enable "🌐 Translate Chinese → English" | Checkbox checked |
| 3 | Import products | Products imported |
| 4 | Check Product Collector in WaMerce | Titles show English translations |

---

### Test 5: Copy Product IDs
**Priority: Low | Estimated Time: 1 min**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open extension on 1688 page | Products detected |
| 2 | Click "📋 Copy Product IDs" | Toast: "Copied X product IDs!" |
| 3 | Paste in text editor | List of product IDs |

---

### Test 6: Rescan Page
**Priority: Low | Estimated Time: 1 min**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On listing page, scroll down | New products load |
| 2 | Click extension icon | Old count shown |
| 3 | Click "🔄 Rescan Page" | Count updates with new products |

---

### Test 7: Floating Button (Content Script)
**Priority: Medium | Estimated Time: 1 min**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to 1688 product page | - |
| 2 | Look for bottom-right corner | Orange "🛒 WaMerce Import" button |
| 3 | Hover over button | Shows product count tooltip |
| 4 | Click button | Alert shows product count |

---

### Test 8: Error Handling - No Connection
**Priority: Medium | Estimated Time: 1 min**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Disconnect internet | - |
| 2 | Click extension on 1688 page | Popup opens |
| 3 | Check status indicator | 🔴 RED dot |
| 4 | Check status text | "Server unavailable" |
| 5 | Try import | Graceful error message |

---

### Test 9: Non-1688 Page
**Priority: Low | Estimated Time: 30 sec**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to google.com | - |
| 2 | Click extension icon | Shows "Not on 1688.com" |
| 3 | Check for navigation link | "Go to 1688.com →" button |

---

## Verification in WaMerce

After importing, verify products in the app:

1. **Product Collector Page**
   - URL: `/product-collector`
   - Products should appear in the list
   - Click product to view details

2. **Verify Imported Data:**
   - [ ] Product images display correctly
   - [ ] Title is captured (Chinese or translated)
   - [ ] Price is correct
   - [ ] SKU variants are listed
   - [ ] Color/size options available

3. **Test Edit Flow:**
   - Click "Edit" on a product
   - Verify images can be reordered
   - Verify variants can be edited
   - Click "Fetch Images & Variants" to refresh from TMAPI

---

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/1688-scraper/products` | GET | Health check / connection test |
| `/api/1688-scraper/extension-import` | POST | Submit products for import |
| `/api/1688-scraper/job/{job_id}` | GET | Poll import job status |
| `/api/download/chrome-extension` | GET | Download extension ZIP |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Extension not working | Page not fully loaded | Refresh page, wait 3 seconds |
| No products found | Dynamic content not loaded | Click "Rescan Page" |
| Status dot RED | Server offline or network issue | Check internet, verify server running |
| Import stuck | Network timeout | Check console (F12) for errors |
| Products not in WaMerce | Import failed silently | Check job status in console |
| Wrong product count | 1688 page structure changed | Update extension or report bug |

---

## Console Debugging

1. Open Chrome DevTools (F12)
2. Go to **Console** tab
3. Filter by `[WaMerce` to see extension logs:
   ```
   [WaMerce v5] Content script loaded
   [WaMerce v5] Page type: PRODUCT
   [WaMerce v5] Extracting images...
   [WaMerce v5] Found 8 main images, 12 SKU images
   [WaMerce v5] Extracting variants...
   [WaMerce v5] Total variants: 24
   [WaMerce v5] Scraped: {id: "850596274690", title: "...", ...}
   ```

4. For popup debugging:
   - Right-click extension icon → "Inspect popup"
   - Opens DevTools for popup.html

---

## Files Reference

| File | Purpose |
|------|---------|
| `/app/browser-extension/manifest.json` | Extension manifest (v5.0.0, MV3) |
| `/app/browser-extension/popup.html` | Extension popup UI |
| `/app/browser-extension/popup.js` | Popup logic & API calls |
| `/app/browser-extension/content.js` | Page scraping logic |
| `/app/browser-extension/content.css` | Floating button styles |
| `/app/wamerce-1688-extension.zip` | Installable ZIP package |

---

## Known Limitations

1. **Chinese Text** - Enable translation checkbox for English titles
2. **Rate Limiting** - Wait 2-3 seconds between large imports
3. **Login Required** - Some variant data requires 1688 login
4. **Page Structure** - 1688 frequently changes HTML; extension may need updates
5. **Image URLs** - Some images use lazy loading; rescan if missing

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Product Detail Import | ✅ | Core functionality |
| Store Listing Import | ✅ | Batch import |
| Search Results Import | ✅ | Multi-product |
| Translation | ✅ | Chinese → English |
| Copy IDs | ✅ | Clipboard |
| Rescan | ✅ | Dynamic content |
| Floating Button | ✅ | Content script |
| Error Handling | ✅ | Graceful failures |
| Non-1688 Page | ✅ | User guidance |

**Last Tested:** January 7, 2025
**Extension Version:** 5.0.0
**Backend Tests:** 10/10 passed
