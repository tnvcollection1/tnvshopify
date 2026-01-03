// WaMerce 1688 Importer - Popup Script

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
  scanCurrentPage();
  
  // Event listeners
  document.getElementById('serverUrl').addEventListener('change', saveServerUrl);
  document.getElementById('scanBtn').addEventListener('click', scanCurrentPage);
  document.getElementById('importBtn').addEventListener('click', importProducts);
  document.getElementById('openDashboard').addEventListener('click', openDashboard);
  document.getElementById('selectAllOption').addEventListener('change', toggleSelectAll);
});

// Save server URL
async function saveServerUrl() {
  serverUrl = document.getElementById('serverUrl').value.trim();
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
    const response = await fetch(`${serverUrl}/api/1688/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      indicator.className = 'status-indicator connected';
      statusText.textContent = 'Connected to WaMerce';
    } else {
      throw new Error('Connection failed');
    }
  } catch (error) {
    indicator.className = 'status-indicator error';
    statusText.textContent = 'Connection failed';
  }
}

// Scan current page for products
async function scanCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('1688.com')) {
    showToast('Please open a 1688.com page');
    return;
  }
  
  // Inject content script to scan page
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: scanPageForProducts
    });
    
    const products = results[0].result || [];
    document.getElementById('productCount').textContent = products.length;
    
    // Store products for import
    selectedProducts = products;
    
    // Update UI
    updateProductList(products);
    updateImportButton();
    
    if (products.length > 0) {
      showToast(`Found ${products.length} products`);
    }
  } catch (error) {
    console.error('Scan error:', error);
    showToast('Error scanning page');
  }
}

// Function to scan page (injected into page)
function scanPageForProducts() {
  const products = [];
  const seen = new Set();
  
  // Find all product links
  document.querySelectorAll('a[href*="offer/"]').forEach(link => {
    const match = link.href.match(/offer\/(\d{10,})/);
    if (match && !seen.has(match[1])) {
      seen.add(match[1]);
      
      // Try to get product info from surrounding elements
      const container = link.closest('[data-offer-id], .sm-offer-item, .offer-item, .sm-offer, .space-offer-card-box, [class*="offer"]') || link.parentElement;
      
      let title = '';
      let price = '';
      let image = '';
      
      // Try to find title
      const titleEl = container?.querySelector('.title, .offer-title, [class*="title"], h4, h3') || link;
      title = titleEl?.textContent?.trim() || '';
      
      // Try to find price
      const priceEl = container?.querySelector('.price, .sm-offer-price, [class*="price"]');
      price = priceEl?.textContent?.trim() || '';
      
      // Try to find image
      const imgEl = container?.querySelector('img');
      image = imgEl?.src || '';
      
      products.push({
        id: match[1],
        title: title.substring(0, 80),
        price: price,
        image: image,
        url: `https://detail.1688.com/offer/${match[1]}.html`
      });
    }
  });
  
  // Also check for product detail page
  const detailMatch = window.location.href.match(/offer\/(\d{10,})/);
  if (detailMatch && !seen.has(detailMatch[1])) {
    const title = document.querySelector('h1, .d-title, [class*="title"]')?.textContent?.trim() || '';
    const price = document.querySelector('.price-value, .price, [class*="price"]')?.textContent?.trim() || '';
    const image = document.querySelector('.detail-gallery img, .main-image img')?.src || '';
    
    products.unshift({
      id: detailMatch[1],
      title: title.substring(0, 80),
      price: price,
      image: image,
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
  
  if (products.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'block';
  list.innerHTML = products.slice(0, 10).map(p => `
    <div class="product-item">
      ${p.image ? `<img src="${p.image}" alt="">` : '<div style="width:30px;height:30px;background:#eee;border-radius:4px;"></div>'}
      <span class="title" title="${p.title}">${p.title || p.id}</span>
      <span class="price">${p.price || ''}</span>
    </div>
  `).join('');
  
  if (products.length > 10) {
    list.innerHTML += `<div class="product-item" style="justify-content:center;color:#666;">... and ${products.length - 10} more</div>`;
  }
}

// Update import button state
function updateImportButton() {
  const btn = document.getElementById('importBtn');
  const count = selectedProducts.length;
  
  btn.disabled = count === 0 || !serverUrl;
  btn.innerHTML = count > 0 
    ? `<span>📥</span> Import ${count} Products`
    : `<span>📥</span> Import Selected Products`;
}

// Toggle select all
function toggleSelectAll(e) {
  // This would communicate with content script to select/deselect products
  // For now, it just uses all scanned products
  showToast(e.target.checked ? 'All products selected' : 'Selection cleared');
}

// Import products to WaMerce
async function importProducts() {
  if (!serverUrl || selectedProducts.length === 0) {
    showToast('No products to import');
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
      showToast(`✅ Import started! Job ID: ${data.job_id}`);
      
      // Open dashboard to see progress
      if (confirm('Import started! Open WaMerce to see progress?')) {
        chrome.tabs.create({ url: `${serverUrl}/product-scraper` });
      }
    } else {
      throw new Error(data.detail || 'Import failed');
    }
  } catch (error) {
    console.error('Import error:', error);
    showToast('❌ Import failed: ' + error.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
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
