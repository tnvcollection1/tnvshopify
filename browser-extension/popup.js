// WaMerce 1688 Importer - Popup Script v2.0
// Dianxiaomi-style one-click import

let serverUrl = '';
let products = [];
let pageInfo = { type: 'unknown', title: '', url: '' };

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved server URL
  const stored = await chrome.storage.local.get(['serverUrl']);
  serverUrl = stored.serverUrl || '';
  document.getElementById('serverUrl').value = serverUrl;
  
  // Setup event listeners
  document.getElementById('settingsBtn').addEventListener('click', toggleSettings);
  document.getElementById('saveServer').addEventListener('click', saveServerUrl);
  document.getElementById('openDashboard').addEventListener('click', openDashboard);
  
  // Check connection and scan page
  await checkConnection();
  await scanCurrentPage();
});

// Toggle settings panel
function toggleSettings() {
  const section = document.getElementById('serverSection');
  section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

// Save server URL
async function saveServerUrl() {
  serverUrl = document.getElementById('serverUrl').value.trim().replace(/\/$/, '');
  await chrome.storage.local.set({ serverUrl });
  showToast('Server URL saved!', 'success');
  await checkConnection();
}

// Check connection to WaMerce server
async function checkConnection() {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  
  if (!serverUrl) {
    dot.className = 'status-dot error';
    text.textContent = 'Set server URL';
    return false;
  }
  
  dot.className = 'status-dot loading';
  text.textContent = 'Connecting...';
  
  try {
    const response = await fetch(`${serverUrl}/api/1688-scraper/products?limit=1`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      dot.className = 'status-dot connected';
      text.textContent = 'Connected';
      return true;
    } else {
      throw new Error('Connection failed');
    }
  } catch (error) {
    dot.className = 'status-dot error';
    text.textContent = 'Not connected';
    return false;
  }
}

// Scan current page for products
async function scanCurrentPage() {
  const mainContent = document.getElementById('mainContent');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      showNotOn1688();
      return;
    }
    
    // Check if on 1688
    if (!tab.url.includes('1688.com')) {
      showNotOn1688();
      return;
    }
    
    // Detect page type
    pageInfo = detectPageType(tab.url, tab.title);
    
    // Try to get products from content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProducts' });
      if (response && response.products) {
        products = response.products;
      }
    } catch (e) {
      console.log('Content script not ready, using executeScript');
    }
    
    // Fallback: Execute script directly
    if (!products || products.length === 0) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractProductsFromPage
        });
        
        if (results && results[0] && results[0].result) {
          products = results[0].result;
        }
      } catch (e) {
        console.error('Script execution failed:', e);
      }
    }
    
    // Render the UI
    renderMainUI();
    
  } catch (error) {
    console.error('Scan error:', error);
    mainContent.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #666;">
        <p>Error scanning page</p>
        <p style="font-size: 11px; margin-top: 8px;">${error.message}</p>
      </div>
    `;
  }
}

// Detect page type from URL
function detectPageType(url, title) {
  if (url.includes('/offer/') || url.includes('detail.1688.com')) {
    return { type: 'product', title: title || 'Product Page', url };
  } else if (url.includes('/page/offerlist') || url.includes('winport')) {
    return { type: 'store', title: title || 'Store Page', url };
  } else if (url.includes('s.1688.com') || url.includes('search')) {
    return { type: 'search', title: title || 'Search Results', url };
  } else if (url.match(/[a-z]+\.1688\.com\/?$/)) {
    return { type: 'store', title: title || 'Store Home', url };
  }
  return { type: 'other', title: title || '1688 Page', url };
}

// Extract products from page (injected function)
function extractProductsFromPage() {
  const products = [];
  const seen = new Set();
  
  // Find all product links
  const selectors = [
    'a[href*="offer/"]',
    'a[href*="detail.1688.com"]',
    '[data-offer-id]',
    '.sm-offer-item a',
    '.offer-list-row a',
    '.space-offer-card-box a'
  ];
  
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      let productId = null;
      let href = el.href || el.closest('a')?.href;
      
      // Extract ID from href
      if (href) {
        const match = href.match(/offer\/(\d{10,})/);
        if (match) productId = match[1];
      }
      
      // Or from data attribute
      if (!productId && el.dataset && el.dataset.offerId) {
        productId = el.dataset.offerId;
      }
      
      if (productId && !seen.has(productId)) {
        seen.add(productId);
        
        // Try to get product info
        const container = el.closest('.sm-offer-item, .offer-item, .space-offer-card-box, [class*="card"], [class*="item"]') || el.parentElement?.parentElement;
        
        let title = '';
        let price = '';
        let image = '';
        
        if (container) {
          const titleEl = container.querySelector('.title, [class*="title"], h4, h3, .name');
          if (titleEl) title = titleEl.textContent.trim().substring(0, 60);
          
          const priceEl = container.querySelector('.price, [class*="price"]');
          if (priceEl) price = priceEl.textContent.trim().replace(/[^\d.¥]/g, '').substring(0, 20);
          
          const imgEl = container.querySelector('img');
          if (imgEl && imgEl.src) image = imgEl.src;
        }
        
        products.push({
          id: productId,
          title: title || 'Product ' + productId.substring(0, 8) + '...',
          price: price || '',
          image: image,
          url: `https://detail.1688.com/offer/${productId}.html`
        });
      }
    });
  });
  
  // Check if current page is a product detail page
  const currentMatch = window.location.href.match(/offer\/(\d{10,})/);
  if (currentMatch && !seen.has(currentMatch[1])) {
    const title = document.querySelector('h1, .d-title, [class*="mod-detail-title"]')?.textContent?.trim() || '';
    const price = document.querySelector('.price-value, [class*="price"]')?.textContent?.trim() || '';
    const image = document.querySelector('.detail-gallery img, .main-image img')?.src || '';
    
    products.unshift({
      id: currentMatch[1],
      title: title.substring(0, 60) || 'Current Product',
      price: price,
      image: image,
      url: window.location.href,
      isCurrentPage: true
    });
  }
  
  return products;
}

// Render main UI based on scan results
function renderMainUI() {
  const mainContent = document.getElementById('mainContent');
  
  // Page info badge
  const pageTypeColors = {
    store: 'store',
    product: 'product',
    search: 'search',
    other: ''
  };
  
  let html = `
    <div class="page-info ${pageTypeColors[pageInfo.type] || ''}">
      <div class="page-type">📍 ${pageInfo.type.toUpperCase()} PAGE</div>
      <div class="page-title">${pageInfo.title.substring(0, 50)}</div>
    </div>
    
    <div class="product-count">
      <div class="count-number">${products.length}</div>
      <div class="count-label">Products<br>Found</div>
    </div>
    
    <div class="actions">
      <button class="action-btn primary" id="importAllBtn" ${products.length === 0 ? 'disabled' : ''}>
        📥 Import ${products.length} Products to WaMerce
      </button>
      
      <button class="action-btn secondary" id="copyIdsBtn" ${products.length === 0 ? 'disabled' : ''}>
        📋 Copy Product IDs
      </button>
      
      <button class="action-btn secondary" id="rescanBtn">
        🔄 Rescan Page
      </button>
    </div>
    
    <div class="options">
      <div class="option-row">
        <input type="checkbox" id="translateOption" checked>
        <label for="translateOption">🌐 Translate Chinese → English</label>
      </div>
    </div>
  `;
  
  // Show product preview list if we have products
  if (products.length > 0) {
    html += `
      <div class="product-list">
        ${products.slice(0, 10).map(p => `
          <div class="product-item">
            <img src="${p.image || ''}" onerror="this.style.display='none'" alt="">
            <div class="info">
              <div class="title">${p.title}</div>
              <div class="price">${p.price}</div>
            </div>
          </div>
        `).join('')}
        ${products.length > 10 ? `<div class="product-item" style="justify-content: center; color: #666;">... and ${products.length - 10} more</div>` : ''}
      </div>
    `;
  }
  
  // Progress section (hidden initially)
  html += `
    <div class="progress-section" id="progressSection" style="display: none;">
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill" style="width: 0%"></div>
      </div>
      <div class="progress-text" id="progressText">Importing...</div>
    </div>
  `;
  
  mainContent.innerHTML = html;
  
  // Add event listeners
  document.getElementById('importAllBtn').addEventListener('click', importAllProducts);
  document.getElementById('copyIdsBtn').addEventListener('click', copyProductIds);
  document.getElementById('rescanBtn').addEventListener('click', rescanPage);
}

// Show "not on 1688" message
function showNotOn1688() {
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="not-1688">
      <div class="icon">🔍</div>
      <h3>Not on 1688.com</h3>
      <p>Open a 1688 store page, search results, or product page to start importing.</p>
      <a href="https://www.1688.com" target="_blank" class="go-btn">Go to 1688.com →</a>
    </div>
  `;
}

// Import all products to WaMerce
async function importAllProducts() {
  if (products.length === 0) {
    showToast('No products to import', 'error');
    return;
  }
  
  if (!serverUrl) {
    showToast('Please set server URL first', 'error');
    toggleSettings();
    return;
  }
  
  const btn = document.getElementById('importAllBtn');
  const progressSection = document.getElementById('progressSection');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const translate = document.getElementById('translateOption').checked;
  
  btn.disabled = true;
  btn.innerHTML = '⏳ Importing...';
  progressSection.style.display = 'block';
  progressFill.style.width = '10%';
  progressText.textContent = 'Starting import...';
  
  try {
    // Send to WaMerce API
    const response = await fetch(`${serverUrl}/api/1688-scraper/batch-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_ids: products.map(p => p.id),
        translate: translate
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.job_id) {
      progressFill.style.width = '30%';
      progressText.textContent = `Job started: ${data.product_ids.length} products`;
      
      // Poll for job status
      await pollJobStatus(data.job_id);
      
    } else {
      throw new Error(data.detail || 'Import failed');
    }
    
  } catch (error) {
    console.error('Import error:', error);
    showToast('Import failed: ' + error.message, 'error');
    btn.disabled = false;
    btn.innerHTML = `📥 Import ${products.length} Products to WaMerce`;
    progressSection.style.display = 'none';
  }
}

// Poll job status
async function pollJobStatus(jobId) {
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const btn = document.getElementById('importAllBtn');
  
  let attempts = 0;
  const maxAttempts = 120; // 2 minutes max
  
  const poll = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/1688-scraper/job/${jobId}`);
      const data = await response.json();
      
      if (data.success && data.job) {
        const job = data.job;
        const progress = job.progress || 0;
        
        progressFill.style.width = `${Math.max(30, progress)}%`;
        progressText.textContent = `${job.phase || job.status}: ${job.products_scraped || 0}/${job.total || products.length} products`;
        
        if (job.status === 'completed') {
          progressFill.style.width = '100%';
          progressText.textContent = `✅ Imported ${job.products_scraped} products!`;
          showToast(`Successfully imported ${job.products_scraped} products!`, 'success');
          
          btn.innerHTML = '✅ Import Complete!';
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = `📥 Import ${products.length} Products to WaMerce`;
          }, 3000);
          
          return;
        } else if (job.status === 'failed') {
          throw new Error(job.error || 'Import failed');
        }
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 1000);
      } else {
        throw new Error('Import timed out');
      }
      
    } catch (error) {
      progressText.textContent = `❌ ${error.message}`;
      showToast(error.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `📥 Import ${products.length} Products to WaMerce`;
    }
  };
  
  poll();
}

// Copy product IDs to clipboard
async function copyProductIds() {
  if (products.length === 0) {
    showToast('No products to copy', 'error');
    return;
  }
  
  const ids = products.map(p => p.id).join('\n');
  
  try {
    await navigator.clipboard.writeText(ids);
    showToast(`Copied ${products.length} product IDs!`, 'success');
  } catch (error) {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = ids;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(`Copied ${products.length} product IDs!`, 'success');
  }
}

// Rescan page
async function rescanPage() {
  products = [];
  document.getElementById('mainContent').innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="font-size: 32px; margin-bottom: 16px;">🔄</div>
      <p>Scanning page...</p>
    </div>
  `;
  await scanCurrentPage();
}

// Open dashboard
function openDashboard() {
  if (serverUrl) {
    chrome.tabs.create({ url: `${serverUrl}/product-scraper` });
  } else {
    showToast('Please set server URL first', 'error');
    toggleSettings();
  }
}

// Show toast notification
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}
