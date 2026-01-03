// WaMerce 1688 Importer - Popup Script v1.0.1

let selectedProducts = [];
let serverUrl = '';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved server URL
  const stored = await chrome.storage.local.get(['serverUrl']);
  serverUrl = stored.serverUrl || '';
  document.getElementById('serverUrl').value = serverUrl;
  
  // Check connection
  if (serverUrl) {
    checkConnection();
  }
  
  // Get products from current tab
  setTimeout(() => scanCurrentPage(), 500);
  
  // Event listeners
  document.getElementById('serverUrl').addEventListener('change', saveServerUrl);
  document.getElementById('serverUrl').addEventListener('blur', saveServerUrl);
  document.getElementById('scanBtn').addEventListener('click', scanCurrentPage);
  document.getElementById('importBtn').addEventListener('click', importProducts);
  document.getElementById('openDashboard').addEventListener('click', openDashboard);
  document.getElementById('selectAllOption').addEventListener('change', toggleSelectAll);
});

// Save server URL
async function saveServerUrl() {
  serverUrl = document.getElementById('serverUrl').value.trim();
  // Remove trailing slash
  if (serverUrl.endsWith('/')) {
    serverUrl = serverUrl.slice(0, -1);
  }
  await chrome.storage.local.set({ serverUrl });
  checkConnection();
}

// Check connection to WaMerce server
async function checkConnection() {
  const indicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  
  if (!serverUrl) {
    indicator.className = 'status-indicator';
    statusText.textContent = 'Enter server URL';
    return;
  }
  
  try {
    // Try multiple endpoints to check connection
    const endpoints = [
      `${serverUrl}/api/1688-scraper/products?limit=1`,
      `${serverUrl}/api/stores`
    ];
    
    let connected = false;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          connected = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (connected) {
      indicator.className = 'status-indicator connected';
      statusText.textContent = 'Connected to WaMerce';
    } else {
      throw new Error('Connection failed');
    }
  } catch (error) {
    indicator.className = 'status-indicator error';
    statusText.textContent = 'Connection failed - check URL';
  }
}

// Scan current page for products
async function scanCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showToast('Cannot access current tab');
      return;
    }
    
    if (!tab.url || !tab.url.includes('1688.com')) {
      showToast('Please open a 1688.com page first');
      document.getElementById('productCount').textContent = '0';
      return;
    }
    
    showToast('Scanning page...');
    
    // Method 1: Try to get products from content script via message
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProducts' });
      if (response && response.products) {
        handleProductsFound(response.products);
        return;
      }
    } catch (msgError) {
      console.log('Content script message failed, trying executeScript:', msgError);
    }
    
    // Method 2: Execute script directly
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scanPageForProducts
      });
      
      if (results && results[0] && results[0].result) {
        handleProductsFound(results[0].result);
        return;
      }
    } catch (scriptError) {
      console.error('ExecuteScript error:', scriptError);
    }
    
    // Method 3: Parse URL for single product
    const match = tab.url.match(/offer\/(\d{10,})/);
    if (match) {
      const product = {
        id: match[1],
        title: 'Product ' + match[1],
        price: '',
        image: '',
        url: tab.url,
        isCurrentPage: true
      };
      handleProductsFound([product]);
      showToast('Found 1 product from URL');
      return;
    }
    
    showToast('No products found. Try refreshing the page.');
    document.getElementById('productCount').textContent = '0';
    
  } catch (error) {
    console.error('Scan error:', error);
    showToast('Scan failed: ' + (error.message || 'Unknown error'));
  }
}

// Handle products found
function handleProductsFound(products) {
  selectedProducts = products || [];
  document.getElementById('productCount').textContent = selectedProducts.length;
  updateProductList(selectedProducts);
  updateImportButton();
  
  if (selectedProducts.length > 0) {
    showToast(`Found ${selectedProducts.length} products`);
  }
}

// Function to scan page (injected into page)
function scanPageForProducts() {
  const products = [];
  const seen = new Set();
  
  // Find all product links with various patterns
  const linkSelectors = [
    'a[href*="offer/"]',
    'a[href*="detail.1688.com"]',
    '[data-offer-id]'
  ];
  
  linkSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      let productId = null;
      
      // Try to get ID from href
      if (el.href) {
        const match = el.href.match(/offer\/(\d{10,})/);
        if (match) productId = match[1];
      }
      
      // Try to get ID from data attribute
      if (!productId && el.dataset && el.dataset.offerId) {
        productId = el.dataset.offerId;
      }
      
      if (productId && !seen.has(productId)) {
        seen.add(productId);
        
        // Try to get product info from surrounding elements
        const container = el.closest('.offer-item, .sm-offer-item, .space-offer-card-box, [class*="card"], [class*="item"]') || el.parentElement;
        
        let title = '';
        let price = '';
        let image = '';
        
        if (container) {
          // Find title
          const titleEl = container.querySelector('.title, [class*="title"], h4, h3, .name, [class*="name"]');
          if (titleEl) title = titleEl.textContent.trim().substring(0, 80);
          
          // Find price
          const priceEl = container.querySelector('.price, [class*="price"]');
          if (priceEl) price = priceEl.textContent.trim();
          
          // Find image
          const imgEl = container.querySelector('img');
          if (imgEl && imgEl.src) image = imgEl.src;
        }
        
        products.push({
          id: productId,
          title: title || 'Product ' + productId,
          price: price,
          image: image,
          url: `https://detail.1688.com/offer/${productId}.html`
        });
      }
    });
  });
  
  // Also check current page URL
  const currentMatch = window.location.href.match(/offer\/(\d{10,})/);
  if (currentMatch && !seen.has(currentMatch[1])) {
    const title = document.querySelector('h1, .d-title, [class*="mod-detail-title"]')?.textContent?.trim() || '';
    const price = document.querySelector('.price-value, [class*="price"]')?.textContent?.trim() || '';
    
    products.unshift({
      id: currentMatch[1],
      title: title.substring(0, 80) || 'Current Product',
      price: price,
      image: '',
      url: window.location.href,
      isCurrentPage: true
    });
  }
  
  return products;
}

// Update product list display
function updateProductList(products) {
  const container = document.getElementById('selectedProducts');
  const list = document.getElementById('productList');
  
  if (!products || products.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'block';
  list.innerHTML = products.slice(0, 8).map(p => `
    <div class="product-item">
      ${p.image ? `<img src="${p.image}" alt="" onerror="this.style.display='none'">` : '<div style="width:30px;height:30px;background:#eee;border-radius:4px;"></div>'}
      <span class="title" title="${p.title || p.id}">${p.title || p.id}</span>
      <span class="price">${p.price || ''}</span>
    </div>
  `).join('');
  
  if (products.length > 8) {
    list.innerHTML += `<div class="product-item" style="justify-content:center;color:#666;">... and ${products.length - 8} more</div>`;
  }
}

// Update import button state
function updateImportButton() {
  const btn = document.getElementById('importBtn');
  const count = selectedProducts.length;
  
  btn.disabled = count === 0;
  btn.innerHTML = count > 0 
    ? `<span>📥</span> Import ${count} Product${count > 1 ? 's' : ''}`
    : `<span>📥</span> No Products Found`;
}

// Toggle select all
function toggleSelectAll(e) {
  showToast(e.target.checked ? 'All products selected' : 'Selection cleared');
}

// Import products to WaMerce
async function importProducts() {
  if (selectedProducts.length === 0) {
    showToast('No products to import');
    return;
  }
  
  if (!serverUrl) {
    showToast('Please enter WaMerce server URL first');
    return;
  }
  
  const btn = document.getElementById('importBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="loading"></span> Importing...';
  btn.disabled = true;
  
  const translate = document.getElementById('translateOption').checked;
  
  try {
    const productIds = selectedProducts.map(p => p.id);
    
    const response = await fetch(`${serverUrl}/api/1688-scraper/batch-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_ids: productIds,
        translate: translate
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(`✅ Importing ${data.product_ids.length} products!`);
      
      // Ask to open dashboard
      setTimeout(() => {
        if (confirm(`Import started for ${data.product_ids.length} products!\n\nOpen WaMerce to see progress?`)) {
          chrome.tabs.create({ url: `${serverUrl}/product-scraper` });
        }
      }, 500);
    } else {
      throw new Error(data.detail || 'Import failed');
    }
  } catch (error) {
    console.error('Import error:', error);
    showToast('❌ ' + (error.message || 'Import failed'));
  } finally {
    btn.innerHTML = originalText;
    updateImportButton();
  }
}

// Open WaMerce dashboard
function openDashboard() {
  if (serverUrl) {
    chrome.tabs.create({ url: `${serverUrl}/product-scraper` });
  } else {
    showToast('Please enter server URL first');
  }
}

// Show toast notification
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
