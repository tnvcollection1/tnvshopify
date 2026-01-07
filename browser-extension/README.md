# WaMerce 1688 Importer - Chrome Extension

A powerful browser extension for importing products from 1688.com to WaMerce with one click.

## Features

- **One-Click Import**: Import products directly from your browser while browsing 1688.com
- **Full Product Scraping**: Extracts title, images, SKUs, prices, variants, and seller info
- **Works on Multiple Page Types**:
  - Product detail pages
  - Store listing pages
  - Search results pages
- **Chinese → English Translation**: Optional automatic translation
- **No API Limits**: Uses your browser session, not server-side scraping

## Installation

### Developer Mode (Recommended for Testing)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `/app/browser-extension` folder
5. The extension icon should appear in your toolbar

### Testing on Live 1688 Pages

1. Navigate to [1688.com](https://www.1688.com)
2. Search for any product or go to a supplier's store
3. Click the WaMerce extension icon
4. The extension will automatically detect and list products on the page
5. Click **Import Products to WaMerce** to start importing

## Supported Page Types

| Page Type | URL Pattern | What Gets Scraped |
|-----------|-------------|-------------------|
| Product Detail | `detail.1688.com/offer/...` | Full product data (title, images, SKUs, price, seller) |
| Store Page | `*.1688.com/page/offerlist...` | All visible products |
| Search Results | `s.1688.com/...` | All search result products |

## How It Works

### Content Script (`content.js`)
- Runs automatically on all 1688.com pages
- Scrapes product data from:
  - DOM elements (images, prices, titles)
  - JavaScript window objects (`iDetailData`, `__INIT_DATA__`)
  - Script tags containing JSON data
- Creates a floating "WaMerce Import" button on pages

### Popup (`popup.js`)
- Shows when you click the extension icon
- Displays found products with previews
- Handles import to WaMerce server
- Polls job status for progress updates

## Backend API Endpoints Used

The extension communicates with these WaMerce API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/1688-scraper/products` | GET | Check server connection |
| `/api/1688-scraper/extension-import` | POST | Submit products for import |
| `/api/1688-scraper/job/{job_id}` | GET | Poll import job status |

## Troubleshooting

### Extension Not Working on 1688

1. **Check permissions**: Make sure the extension has access to 1688.com
2. **Refresh the page**: The content script needs a page reload to inject
3. **Check console**: Open DevTools (F12) and look for `[WaMerce v4]` logs

### No Products Found

1. **Wait for page load**: 1688 pages load slowly, wait a few seconds
2. **Try rescanning**: Click the "Rescan Page" button in the popup
3. **Check page type**: The extension works best on product detail pages

### Import Failed

1. **Check server connection**: The status dot should be green
2. **Check server URL**: Verify `SERVER_URL` in `popup.js` points to the correct deployment
3. **Check network**: Open DevTools Network tab to see API errors

## Development

### File Structure

```
browser-extension/
├── manifest.json      # Extension configuration (Manifest V3)
├── popup.html         # Popup UI HTML
├── popup.js           # Popup logic and API calls
├── content.js         # Page scraping logic
├── content.css        # Floating button styles
└── icons/             # Extension icons (16, 48, 128px)
```

### Updating Server URL

To point to a different WaMerce deployment:

1. Open `popup.js`
2. Change `const SERVER_URL = '...'` to your server URL
3. Reload the extension in `chrome://extensions`

### Testing Changes

1. Make changes to the extension files
2. Go to `chrome://extensions`
3. Click the refresh icon on the WaMerce extension card
4. Open a new 1688 page to test

## Version History

- **v5.0.0**: Current version - Full scraping without API calls
- **v4.0.0**: Added comprehensive image extraction
- **v3.0.0**: Added SKU/variant scraping
- **v2.0.0**: Added store/listing page support
- **v1.0.0**: Initial release - Product detail pages only

## Known Limitations

1. **Chinese text**: Titles are in Chinese - enable translation for English
2. **Some pages may not work**: 1688 frequently updates their HTML structure
3. **Rate limiting**: Importing too many products quickly may trigger 1688's protection
4. **Login required**: Some product data may require being logged into 1688

## Support

For issues or feature requests, contact the WaMerce team or open an issue in the repository.
