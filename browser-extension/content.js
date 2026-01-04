// WaMerce 1688 Importer - Content Script v2.0
// Runs on 1688.com pages

(function() {
  // Prevent duplicate injection
  if (window.__wamerceImporterV2) return;
  window.__wamerceImporterV2 = true;
  
  console.log('[WaMerce] Content script v2.0 loaded');
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[WaMerce] Message received:', request.action);
    
    if (request.action === 'getProducts') {
      const products = scanPageForProducts();
      console.log('[WaMerce] Found', products.length, 'products');
      sendResponse({ products: products });
    }
    
    if (request.action === 'getPageInfo') {
      sendResponse({
        url: window.location.href,
        title: document.title
      });
    }
    
    return true;
  });
  
  // Scan page for products
  function scanPageForProducts() {
    const products = [];
    const seen = new Set();
    
    // Multiple selectors to find products
    const selectors = [
      'a[href*="offer/"]',
      'a[href*="detail.1688.com"]',
      '[data-offer-id]',
      '.sm-offer-item',
      '.offer-list-row-offer',
      '.space-offer-card-box'
    ];
    
    // Find all potential product elements
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        let productId = null;
        
        // Method 1: From href
        const link = el.tagName === 'A' ? el : el.querySelector('a[href*="offer/"]');
        if (link && link.href) {
          const match = link.href.match(/offer\/(\d{10,})/);
          if (match) productId = match[1];
        }
        
        // Method 2: From data attribute
        if (!productId && el.dataset) {
          productId = el.dataset.offerId || el.dataset.auctionId || el.dataset.id;
        }
        
        // Method 3: Look in parent elements
        if (!productId) {
          let parent = el.closest('[data-offer-id], [data-auction-id]');
          if (parent && parent.dataset) {
            productId = parent.dataset.offerId || parent.dataset.auctionId;
          }
        }
        
        if (productId && !seen.has(productId) && productId.length >= 10) {
          seen.add(productId);
          
          // Get product details
          const container = el.closest('.sm-offer-item, .offer-item, .offer-list-row-offer, .space-offer-card-box, [class*="card"], [class*="item"]') || el;
          
          let title = '';
          let price = '';
          let image = '';
          
          // Find title
          const titleSelectors = ['.title', '[class*="title"]', 'h4', 'h3', '.name', '[class*="name"]'];
          for (const ts of titleSelectors) {
            const titleEl = container.querySelector(ts);
            if (titleEl && titleEl.textContent.trim()) {
              title = titleEl.textContent.trim().substring(0, 80);
              break;
            }
          }
          
          // Find price
          const priceSelectors = ['.price', '[class*="price"]', '.value'];
          for (const ps of priceSelectors) {
            const priceEl = container.querySelector(ps);
            if (priceEl) {
              const priceText = priceEl.textContent.trim();
              const priceMatch = priceText.match(/[\d.]+/);
              if (priceMatch) {
                price = '¥' + priceMatch[0];
                break;
              }
            }
          }
          
          // Find image
          const imgEl = container.querySelector('img');
          if (imgEl) {
            image = imgEl.src || imgEl.dataset.src || imgEl.dataset.lazySrc || '';
            if (image.startsWith('//')) image = 'https:' + image;
          }
          
          products.push({
            id: productId,
            title: title || `Product ${productId.substring(0, 8)}...`,
            price: price,
            image: image,
            url: `https://detail.1688.com/offer/${productId}.html`
          });
        }
      });
    });
    
    // Check if we're on a product detail page
    const currentUrl = window.location.href;
    const currentMatch = currentUrl.match(/offer\/(\d{10,})/);
    if (currentMatch && !seen.has(currentMatch[1])) {
      const pid = currentMatch[1];
      
      // Get details from product page
      let title = '';
      const titleSelectors = ['h1', '.d-title', '[class*="mod-detail-title"]', '.detail-title'];
      for (const ts of titleSelectors) {
        const el = document.querySelector(ts);
        if (el && el.textContent.trim()) {
          title = el.textContent.trim().substring(0, 80);
          break;
        }
      }
      
      let price = '';
      const priceEl = document.querySelector('.price-value, [class*="price"], .price');
      if (priceEl) {
        const priceText = priceEl.textContent.trim();
        const priceMatch = priceText.match(/[\d.]+/);
        if (priceMatch) price = '¥' + priceMatch[0];
      }
      
      let image = '';
      const imgEl = document.querySelector('.detail-gallery img, .main-image img, [class*="gallery"] img');
      if (imgEl) {
        image = imgEl.src || '';
      }
      
      products.unshift({
        id: pid,
        title: title || 'Current Product',
        price: price,
        image: image,
        url: currentUrl,
        isCurrentPage: true
      });
    }
    
    return products;
  }
  
  // Create floating import button
  function createFloatingButton() {
    // Remove existing
    const existing = document.getElementById('wamerce-fab');
    if (existing) existing.remove();
    
    const fab = document.createElement('div');
    fab.id = 'wamerce-fab';
    fab.innerHTML = `
      <div class="wamerce-fab-main">
        <span class="wamerce-fab-icon">🛒</span>
        <span class="wamerce-fab-text">WaMerce</span>
      </div>
      <div class="wamerce-fab-count" style="display: none;">0</div>
    `;
    
    document.body.appendChild(fab);
    
    // Update count on hover
    fab.addEventListener('mouseenter', () => {
      const products = scanPageForProducts();
      const countEl = fab.querySelector('.wamerce-fab-count');
      countEl.textContent = products.length;
      countEl.style.display = products.length > 0 ? 'flex' : 'none';
    });
    
    // Click to open popup
    fab.addEventListener('click', () => {
      // Chrome extensions can't programmatically open popup, so show a message
      showNotification('Click the WaMerce icon in your toolbar to import products!', 'info');
    });
  }
  
  // Show notification
  function showNotification(message, type = 'info') {
    const existing = document.getElementById('wamerce-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'wamerce-notification';
    notification.className = `wamerce-notification wamerce-${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">×</button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }
  
  // Initialize when DOM is ready
  function init() {
    console.log('[WaMerce] Initializing...');
    
    // Wait a bit for page to fully load
    setTimeout(() => {
      createFloatingButton();
      
      // Log product count
      const products = scanPageForProducts();
      console.log('[WaMerce] Found', products.length, 'products on page');
    }, 2000);
  }
  
  // Run init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
