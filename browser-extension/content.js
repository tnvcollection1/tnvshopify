// WaMerce 1688 Importer - Content Script v3.0
// Full product scraping WITHOUT any API calls (like Dianxiaomi)
// Runs on 1688.com product detail pages

(function() {
  // Prevent duplicate injection
  if (window.__wamerceImporterV3) return;
  window.__wamerceImporterV3 = true;
  
  console.log('[WaMerce] Content script v3.0 loaded - Full scraping mode');
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[WaMerce] Message received:', request.action);
    
    if (request.action === 'getProducts') {
      const products = scanPageForProducts();
      console.log('[WaMerce] Found', products.length, 'products');
      sendResponse({ products: products });
    }
    
    if (request.action === 'getFullProductData') {
      // Scrape complete product data from detail page
      const fullData = scrapeFullProductData();
      console.log('[WaMerce] Scraped full product data');
      sendResponse({ product: fullData });
    }
    
    if (request.action === 'getPageInfo') {
      sendResponse({
        url: window.location.href,
        title: document.title,
        isDetailPage: isProductDetailPage()
      });
    }
    
    return true;
  });
  
  // Check if current page is a product detail page
  function isProductDetailPage() {
    return window.location.href.includes('detail.1688.com/offer/') || 
           window.location.href.includes('/offer/') ||
           document.querySelector('.detail-gallery, .mod-detail-gallery, #dt-tab');
  }
  
  // Scrape FULL product data from detail page (0 API calls!)
  function scrapeFullProductData() {
    const product = {
      product_id: null,
      title: null,
      title_cn: null,
      price: null,
      price_range: null,
      images: [],
      description: null,
      description_images: [],
      skus: [],
      variants: [],
      seller: {
        name: null,
        member_id: null,
        shop_url: null,
      },
      min_order: 1,
      sold_count: null,
      scraped_at: new Date().toISOString(),
      source: 'extension_v3',
    };
    
    try {
      // 1. Extract Product ID from URL
      const urlMatch = window.location.href.match(/offer\/(\d+)/);
      if (urlMatch) product.product_id = urlMatch[1];
      
      // 2. Try to get data from window objects (most reliable)
      if (window.iDetailData) {
        const d = window.iDetailData;
        product.title_cn = d.offerTitle || d.subject;
        product.price = d.price;
        product.price_range = d.priceRange;
        
        // SKUs from iDetailData
        if (d.sku && d.sku.skuInfoMap) {
          Object.entries(d.sku.skuInfoMap).forEach(([specId, info]) => {
            product.skus.push({
              spec_id: specId,
              price: info.price || info.discountPrice,
              stock: info.canBookCount || info.amountOnSale || 0,
              props_names: info.specAttrs || '',
              image: info.skuPic,
            });
          });
        }
        
        // Seller info
        if (d.sellerInfo) {
          product.seller.name = d.sellerInfo.sellerName || d.sellerInfo.companyName;
          product.seller.member_id = d.sellerInfo.loginId || d.sellerInfo.memberId;
        }
      }
      
      // 3. Try window.__INIT_DATA__ (another common location)
      if (window.__INIT_DATA__) {
        const initData = window.__INIT_DATA__;
        if (initData.offerModel) {
          const offer = initData.offerModel;
          product.title_cn = product.title_cn || offer.subject;
          product.min_order = offer.beginAmount || 1;
        }
        if (initData.skuModel && initData.skuModel.skuInfoMap) {
          Object.entries(initData.skuModel.skuInfoMap).forEach(([specId, info]) => {
            if (!product.skus.find(s => s.spec_id === specId)) {
              product.skus.push({
                spec_id: specId,
                price: info.price,
                stock: info.canBookCount || 0,
                props_names: info.specAttrs || '',
              });
            }
          });
        }
      }
      
      // 4. Fallback: Scrape from DOM
      if (!product.title_cn) {
        const titleSelectors = ['h1.d-title', '.mod-detail-title h1', '.detail-title', 'h1[class*="title"]', '.offer-title'];
        for (const sel of titleSelectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent.trim()) {
            product.title_cn = el.textContent.trim();
            break;
          }
        }
      }
      
      // 5. Extract all images
      // Main gallery images
      const galleryImages = document.querySelectorAll('.detail-gallery img, .mod-detail-gallery img, .vertical-img img, .tab-content img');
      galleryImages.forEach(img => {
        let src = img.src || img.dataset.src || img.dataset.lazySrc;
        if (src) {
          if (src.startsWith('//')) src = 'https:' + src;
          // Get high-res version
          src = src.replace(/_\d+x\d+\.(jpg|png|webp)/i, '.$1').replace(/\?.+$/, '');
          if (!product.images.includes(src) && src.includes('alicdn')) {
            product.images.push(src);
          }
        }
      });
      
      // SKU images (color/variant images)
      const skuImages = document.querySelectorAll('.obj-sku img, .sku-item img, [class*="sku"] img');
      skuImages.forEach(img => {
        let src = img.src || img.dataset.src;
        if (src) {
          if (src.startsWith('//')) src = 'https:' + src;
          src = src.replace(/_\d+x\d+\.(jpg|png|webp)/i, '.$1').replace(/\?.+$/, '');
          if (!product.images.includes(src) && src.includes('alicdn')) {
            product.images.push(src);
          }
        }
      });
      
      // 6. Extract price from DOM if not found
      if (!product.price) {
        const priceEl = document.querySelector('.price-value, .price-now, [class*="price"]');
        if (priceEl) {
          const priceText = priceEl.textContent.replace(/[^\d.]/g, '');
          if (priceText) product.price = parseFloat(priceText);
        }
      }
      
      // 7. Extract variants/SKU options from DOM
      const colorItems = document.querySelectorAll('.obj-sku .obj-content li, [class*="sku-color"] li, [class*="sku-prop"] li');
      const colorOptions = [];
      const sizeOptions = [];
      
      colorItems.forEach(item => {
        const name = item.textContent.trim() || item.title || item.dataset.value;
        const img = item.querySelector('img');
        const imgSrc = img ? (img.src || img.dataset.src) : null;
        
        // Determine if color or size based on parent or class
        const parent = item.closest('.obj-sku, [class*="sku"]');
        const label = parent ? parent.querySelector('.obj-title, .sku-title')?.textContent : '';
        
        if (label.includes('颜色') || label.includes('color') || imgSrc) {
          colorOptions.push({ name, image: imgSrc });
        } else if (label.includes('尺码') || label.includes('size') || label.includes('规格')) {
          sizeOptions.push({ name });
        }
      });
      
      // Build variants array if SKUs not found from JS
      if (product.skus.length === 0 && (colorOptions.length > 0 || sizeOptions.length > 0)) {
        let idx = 0;
        colorOptions.forEach((color, ci) => {
          if (sizeOptions.length > 0) {
            sizeOptions.forEach((size, si) => {
              product.skus.push({
                spec_id: `${ci}_${si}`,
                color: color.name,
                size: size.name,
                props_names: `颜色:${color.name};尺码:${size.name}`,
                image: color.image,
                price: product.price,
              });
              idx++;
            });
          } else {
            product.skus.push({
              spec_id: `${ci}`,
              color: color.name,
              props_names: `颜色:${color.name}`,
              image: color.image,
              price: product.price,
            });
          }
        });
      }
      
      // 8. Extract description images
      const descImages = document.querySelectorAll('.detail-content img, .offer-description img, [class*="desc"] img');
      descImages.forEach(img => {
        let src = img.src || img.dataset.src;
        if (src) {
          if (src.startsWith('//')) src = 'https:' + src;
          if (!product.description_images.includes(src) && src.includes('alicdn')) {
            product.description_images.push(src);
          }
        }
      });
      
      // 9. Extract seller info from DOM
      if (!product.seller.name) {
        const sellerEl = document.querySelector('.company-name a, .shop-name, [class*="seller"] a');
        if (sellerEl) {
          product.seller.name = sellerEl.textContent.trim();
          product.seller.shop_url = sellerEl.href;
          // Extract member_id from shop URL
          const memberMatch = sellerEl.href?.match(/memberId=([^&]+)|shop\/([^\/]+)/);
          if (memberMatch) product.seller.member_id = memberMatch[1] || memberMatch[2];
        }
      }
      
      // 10. Extract sold count
      const soldEl = document.querySelector('.sale-count, [class*="sold"], [class*="sale"]');
      if (soldEl) {
        const soldMatch = soldEl.textContent.match(/\d+/);
        if (soldMatch) product.sold_count = parseInt(soldMatch[0]);
      }
      
      // 11. Set title (prefer Chinese, we'll translate later)
      product.title = product.title_cn;
      
    } catch (e) {
      console.error('[WaMerce] Error scraping product:', e);
    }
    
    console.log('[WaMerce] Scraped product:', product.product_id, 'Images:', product.images.length, 'SKUs:', product.skus.length);
    return product;
  }
  
  // Scan page for product IDs (for listing pages)
  function scanPageForProducts() {
    const products = [];
    const seen = new Set();
    
    // If on detail page, scrape full data
    if (isProductDetailPage()) {
      const fullData = scrapeFullProductData();
      if (fullData.product_id) {
        products.push({
          id: fullData.product_id,
          title: fullData.title,
          price: fullData.price ? `¥${fullData.price}` : '',
          image: fullData.images[0] || '',
          url: window.location.href,
          isCurrentPage: true,
          fullData: fullData, // Include full data!
        });
      }
      return products;
    }
    
    // For listing pages, scan for product cards
    const selectors = [
      'a[href*="offer/"]',
      'a[href*="detail.1688.com"]',
      '[data-offer-id]',
      '.sm-offer-item',
      '.offer-list-row-offer',
      '.space-offer-card-box'
    ];
    
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
        
        if (productId && !seen.has(productId) && productId.length >= 10) {
          seen.add(productId);
          
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
    
    return products;
  }
  
  // Create floating import button
  function createFloatingButton() {
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
    
    fab.addEventListener('mouseenter', () => {
      const products = scanPageForProducts();
      const countEl = fab.querySelector('.wamerce-fab-count');
      countEl.textContent = products.length;
      countEl.style.display = products.length > 0 ? 'flex' : 'none';
    });
    
    fab.addEventListener('click', () => {
      showNotification('Click the WaMerce icon in your toolbar to import products!', 'info');
    });
  }
  
  // Show notification
  function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `wamerce-notification wamerce-notification-${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => notif.remove(), 4000);
  }
  
  // Initialize
  setTimeout(createFloatingButton, 1500);
  
})();
