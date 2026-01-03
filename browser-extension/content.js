// WaMerce 1688 Importer - Content Script
// This script runs on 1688.com pages and adds import functionality

(function() {
  // Avoid duplicate injection
  if (window.__wamerceInjected) return;
  window.__wamerceInjected = true;

  // Configuration
  let serverUrl = '';
  
  // Load saved server URL
  chrome.storage.local.get(['serverUrl'], (result) => {
    serverUrl = result.serverUrl || '';
  });

  // Create floating button
  function createFloatingButton() {
    const btn = document.createElement('div');
    btn.id = 'wamerce-float-btn';
    btn.innerHTML = `
      <div class="wamerce-btn-content">
        <span class="wamerce-icon">🛒</span>
        <span class="wamerce-text">WaMerce</span>
      </div>
      <div class="wamerce-quick-actions" style="display:none;">
        <button class="wamerce-action" data-action="import-current">📥 Import This</button>
        <button class="wamerce-action" data-action="import-all">📦 Import All</button>
        <button class="wamerce-action" data-action="open-dashboard">📊 Dashboard</button>
      </div>
    `;
    document.body.appendChild(btn);

    // Toggle quick actions
    btn.querySelector('.wamerce-btn-content').addEventListener('click', () => {
      const actions = btn.querySelector('.wamerce-quick-actions');
      actions.style.display = actions.style.display === 'none' ? 'block' : 'none';
    });

    // Action handlers
    btn.querySelectorAll('.wamerce-action').forEach(action => {
      action.addEventListener('click', handleAction);
    });
  }

  // Handle actions
  async function handleAction(e) {
    const action = e.target.dataset.action;
    
    if (!serverUrl) {
      showNotification('Please configure WaMerce server URL in extension popup', 'error');
      return;
    }

    switch (action) {
      case 'import-current':
        importCurrentProduct();
        break;
      case 'import-all':
        importAllProducts();
        break;
      case 'open-dashboard':
        window.open(`${serverUrl}/product-scraper`, '_blank');
        break;
    }
  }

  // Import current product (on detail page)
  async function importCurrentProduct() {
    const match = window.location.href.match(/offer\/(\d{10,})/);
    if (!match) {
      showNotification('Not on a product page', 'error');
      return;
    }

    const productId = match[1];
    showNotification('Importing product...', 'info');

    try {
      const response = await fetch(`${serverUrl}/api/1688-scraper/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: [productId],
          translate: true
        })
      });

      const data = await response.json();
      if (data.success) {
        showNotification(`✅ Import started! ${data.product_ids.length} product(s)`, 'success');
      } else {
        throw new Error(data.detail || 'Import failed');
      }
    } catch (error) {
      showNotification('❌ ' + error.message, 'error');
    }
  }

  // Import all products on page
  async function importAllProducts() {
    const productIds = [];
    const seen = new Set();

    document.querySelectorAll('a[href*="offer/"]').forEach(link => {
      const match = link.href.match(/offer\/(\d{10,})/);
      if (match && !seen.has(match[1])) {
        seen.add(match[1]);
        productIds.push(match[1]);
      }
    });

    if (productIds.length === 0) {
      showNotification('No products found on this page', 'error');
      return;
    }

    showNotification(`Importing ${productIds.length} products...`, 'info');

    try {
      const response = await fetch(`${serverUrl}/api/1688-scraper/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: productIds,
          translate: true
        })
      });

      const data = await response.json();
      if (data.success) {
        showNotification(`✅ Import started! ${data.product_ids.length} products`, 'success');
      } else {
        throw new Error(data.detail || 'Import failed');
      }
    } catch (error) {
      showNotification('❌ ' + error.message, 'error');
    }
  }

  // Show notification
  function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.getElementById('wamerce-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'wamerce-notification';
    notification.className = `wamerce-notification wamerce-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 4000);
  }

  // Add import button to product cards
  function addImportButtons() {
    document.querySelectorAll('[data-offer-id], .sm-offer-item, .offer-item, .space-offer-card-box').forEach(card => {
      if (card.querySelector('.wamerce-card-btn')) return;

      const link = card.querySelector('a[href*="offer/"]');
      if (!link) return;

      const match = link.href.match(/offer\/(\d{10,})/);
      if (!match) return;

      const btn = document.createElement('button');
      btn.className = 'wamerce-card-btn';
      btn.innerHTML = '📥';
      btn.title = 'Import to WaMerce';
      btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!serverUrl) {
          showNotification('Configure WaMerce URL in extension popup', 'error');
          return;
        }

        btn.innerHTML = '⏳';
        
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
            btn.innerHTML = '✅';
            showNotification('Product imported!', 'success');
          } else {
            throw new Error(data.detail);
          }
        } catch (error) {
          btn.innerHTML = '❌';
          showNotification('Import failed', 'error');
        }

        setTimeout(() => btn.innerHTML = '📥', 2000);
      };

      card.style.position = 'relative';
      card.appendChild(btn);
    });
  }

  // Initialize
  function init() {
    createFloatingButton();
    addImportButtons();

    // Re-add buttons when page content changes
    const observer = new MutationObserver(() => {
      addImportButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Wait for page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
