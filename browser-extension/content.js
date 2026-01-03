// WaMerce 1688 Importer - Content Script v1.0.1
// This script runs on 1688.com pages

(function() {
  // Avoid duplicate injection
  if (window.__wamerceInjected) return;
  window.__wamerceInjected = true;

  console.log('[WaMerce] Content script loaded');

  // Configuration
  let serverUrl = '';
  
  // Load saved server URL
  chrome.storage.local.get(['serverUrl'], (result) => {
    serverUrl = result.serverUrl || '';
    console.log('[WaMerce] Server URL:', serverUrl);
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.serverUrl) {
      serverUrl = changes.serverUrl.newValue || '';
    }
  });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[WaMerce] Received message:', request);
    
    if (request.action === 'getProducts') {
      const products = scanPageForProducts();
      console.log('[WaMerce] Found products:', products.length);
      sendResponse({ products: products });
    }
    
    return true; // Keep channel open for async response
  });

  // Scan page for products
  function scanPageForProducts() {
    const products = [];
    const seen = new Set();
    
    // Multiple selectors to find product links
    const allLinks = document.querySelectorAll('a[href*="offer/"], a[href*="detail.1688.com"]');
    
    allLinks.forEach(link => {
      const match = link.href.match(/offer\/(\d{10,})/);
      if (match && !seen.has(match[1])) {
        seen.add(match[1]);
        
        const container = link.closest('[class*="offer"], [class*="card"], [class*="item"]') || link.parentElement;
        
        let title = '';
        let price = '';
        let image = '';
        
        if (container) {
          const titleEl = container.querySelector('[class*="title"], h4, h3');
          if (titleEl) title = titleEl.textContent.trim().substring(0, 80);
          
          const priceEl = container.querySelector('[class*="price"]');
          if (priceEl) price = priceEl.textContent.trim();
          
          const imgEl = container.querySelector('img');
          if (imgEl && imgEl.src) image = imgEl.src;
        }
        
        products.push({
          id: match[1],
          title: title || `Product ${match[1]}`,
          price: price,
          image: image,
          url: `https://detail.1688.com/offer/${match[1]}.html`
        });
      }
    });
    
    // Check current URL
    const currentMatch = window.location.href.match(/offer\/(\d{10,})/);
    if (currentMatch && !seen.has(currentMatch[1])) {
      const title = document.querySelector('h1, [class*="detail-title"]')?.textContent?.trim() || '';
      products.unshift({
        id: currentMatch[1],
        title: title.substring(0, 80) || 'Current Product',
        price: '',
        image: '',
        url: window.location.href,
        isCurrentPage: true
      });
    }
    
    return products;
  }

  // Create floating button
  function createFloatingButton() {
    // Remove existing button
    const existing = document.getElementById('wamerce-float-btn');
    if (existing) existing.remove();

    const btn = document.createElement('div');
    btn.id = 'wamerce-float-btn';
    btn.innerHTML = `
      <div class="wamerce-btn-content">
        <span class="wamerce-icon">🛒</span>
        <span class="wamerce-text">WaMerce</span>
      </div>
      <div class="wamerce-quick-actions">
        <button class="wamerce-action" data-action="import-current">📥 Import This Product</button>
        <button class="wamerce-action" data-action="import-all">📦 Import All on Page</button>
        <button class="wamerce-action" data-action="open-dashboard">📊 Open Dashboard</button>
      </div>
    `;
    document.body.appendChild(btn);

    // Toggle quick actions
    let actionsVisible = false;
    btn.querySelector('.wamerce-btn-content').addEventListener('click', (e) => {
      e.stopPropagation();
      actionsVisible = !actionsVisible;
      btn.querySelector('.wamerce-quick-actions').style.display = actionsVisible ? 'block' : 'none';
    });

    // Close when clicking outside
    document.addEventListener('click', () => {
      actionsVisible = false;
      btn.querySelector('.wamerce-quick-actions').style.display = 'none';
    });

    // Action handlers
    btn.querySelectorAll('.wamerce-action').forEach(action => {
      action.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAction(e.target.dataset.action);
      });
    });
    
    console.log('[WaMerce] Floating button created');
  }

  // Handle actions
  async function handleAction(action) {
    if (!serverUrl) {
      showNotification('⚠️ Please set WaMerce URL in extension popup first', 'error');
      return;
    }

    switch (action) {
      case 'import-current':
        await importCurrentProduct();
        break;
      case 'import-all':
        await importAllProducts();
        break;
      case 'open-dashboard':
        window.open(`${serverUrl}/product-scraper`, '_blank');
        break;
    }
  }

  // Import current product
  async function importCurrentProduct() {
    const match = window.location.href.match(/offer\/(\d{10,})/);
    if (!match) {
      showNotification('⚠️ Not on a product detail page', 'error');
      return;
    }

    showNotification('📥 Importing product...', 'info');

    try {
      const response = await fetch(`${serverUrl}/api/1688-scraper/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: [match[1]],
          translate: true
        })
      });

      const data = await response.json();
      if (data.success) {
        showNotification('✅ Product imported successfully!', 'success');
      } else {
        throw new Error(data.detail || 'Import failed');
      }
    } catch (error) {
      showNotification('❌ ' + error.message, 'error');
    }
  }

  // Import all products on page
  async function importAllProducts() {
    const products = scanPageForProducts();

    if (products.length === 0) {
      showNotification('⚠️ No products found on this page', 'error');
      return;
    }

    showNotification(`📦 Importing ${products.length} products...`, 'info');

    try {
      const response = await fetch(`${serverUrl}/api/1688-scraper/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: products.map(p => p.id),
          translate: true
        })
      });

      const data = await response.json();
      if (data.success) {
        showNotification(`✅ ${data.product_ids.length} products importing!`, 'success');
      } else {
        throw new Error(data.detail || 'Import failed');
      }
    } catch (error) {
      showNotification('❌ ' + error.message, 'error');
    }
  }

  // Show notification
  function showNotification(message, type = 'info') {
    const existing = document.getElementById('wamerce-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'wamerce-notification';
    notification.className = `wamerce-notification wamerce-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  // Initialize
  function init() {
    console.log('[WaMerce] Initializing...');
    createFloatingButton();
  }

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure page is fully rendered
    setTimeout(init, 1000);
  }
})();
