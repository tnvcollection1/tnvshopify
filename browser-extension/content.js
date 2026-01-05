// WaMerce 1688 Importer - Content Script v4.0
// FULL product scraping WITHOUT ANY API calls
// Scrapes: title, ALL images, ALL variants/SKUs, prices, seller info
// Works on: Product detail pages AND collection/listing pages

(function() {
  if (window.__wamerceImporterV4) return;
  window.__wamerceImporterV4 = true;
  
  console.log('[WaMerce v4] Content script loaded - Full scraping, no API calls');
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[WaMerce v4] Message:', request.action);
    
    if (request.action === 'getProducts') {
      const products = scanPageForProducts();
      sendResponse({ products });
    }
    
    if (request.action === 'getFullProductData') {
      const fullData = scrapeFullProductData();
      sendResponse({ product: fullData });
    }
    
    if (request.action === 'getPageInfo') {
      sendResponse({
        url: window.location.href,
        title: document.title,
        isDetailPage: isProductDetailPage(),
        isListingPage: isListingPage(),
        productCount: countProductsOnPage(),
      });
    }
    
    return true;
  });
  
  function isProductDetailPage() {
    return window.location.href.includes('detail.1688.com/offer/') || 
           window.location.href.includes('/offer/') && window.location.href.match(/\d{10,}/);
  }
  
  function isListingPage() {
    return window.location.href.includes('/page/offerlist') ||
           window.location.href.includes('s.1688.com') ||
           window.location.href.includes('/offer_list') ||
           document.querySelectorAll('[data-offer-id], .offer-list-row, .sm-offer-item').length > 3;
  }
  
  function countProductsOnPage() {
    if (isProductDetailPage()) return 1;
    return document.querySelectorAll('[data-offer-id], .sm-offer-item, .offer-list-row-offer, a[href*="offer/"]').length;
  }

  // ============= FULL PRODUCT SCRAPING (Detail Page) =============
  function scrapeFullProductData() {
    const product = {
      product_id: null,
      title: null,
      title_cn: null,
      price: null,
      price_range: null,
      images: [],
      main_images: [],
      sku_images: [],
      description_images: [],
      skus: [],
      variants: [],
      seller: { name: null, member_id: null, shop_url: null },
      min_order: 1,
      sold_count: null,
      scraped_at: new Date().toISOString(),
      source: 'extension_v4_full',
    };
    
    try {
      // 1. Product ID from URL
      const urlMatch = window.location.href.match(/offer\/(\d+)/);
      if (urlMatch) product.product_id = urlMatch[1];
      
      // 2. Get data from window objects (most reliable)
      extractFromWindowObjects(product);
      
      // 3. Scrape from DOM as fallback/supplement
      scrapeFromDOM(product);
      
      // 4. Extract ALL images comprehensively
      extractAllImages(product);
      
      // 5. Extract ALL SKUs/variants
      extractAllVariants(product);
      
      // 6. Combine images
      product.images = [...new Set([...product.main_images, ...product.sku_images])];
      
      console.log('[WaMerce v4] Scraped:', {
        id: product.product_id,
        title: product.title_cn?.substring(0, 30),
        images: product.images.length,
        skus: product.skus.length,
      });
      
    } catch (e) {
      console.error('[WaMerce v4] Scrape error:', e);
    }
    
    return product;
  }
  
  function extractFromWindowObjects(product) {
    // Try iDetailData
    if (window.iDetailData) {
      const d = window.iDetailData;
      product.title_cn = product.title_cn || d.offerTitle || d.subject;
      product.price = product.price || d.price;
      product.price_range = d.priceRange;
      
      // SKU info map
      if (d.sku?.skuInfoMap) {
        Object.entries(d.sku.skuInfoMap).forEach(([specId, info]) => {
          product.skus.push({
            spec_id: specId,
            price: info.price || info.discountPrice,
            stock: info.canBookCount || info.amountOnSale || 0,
            props_names: info.specAttrs || '',
            image: info.skuPic,
          });
          if (info.skuPic) product.sku_images.push(cleanImageUrl(info.skuPic));
        });
      }
      
      // Seller
      if (d.sellerInfo) {
        product.seller.name = d.sellerInfo.sellerName || d.sellerInfo.companyName;
        product.seller.member_id = d.sellerInfo.loginId || d.sellerInfo.memberId;
      }
    }
    
    // Try __INIT_DATA__
    if (window.__INIT_DATA__) {
      const init = window.__INIT_DATA__;
      
      if (init.offerModel) {
        product.title_cn = product.title_cn || init.offerModel.subject;
        product.min_order = init.offerModel.beginAmount || 1;
      }
      
      if (init.skuModel?.skuInfoMap) {
        Object.entries(init.skuModel.skuInfoMap).forEach(([specId, info]) => {
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
      
      // Images from init data
      if (init.offerModel?.images) {
        init.offerModel.images.forEach(img => {
          const url = cleanImageUrl(img);
          if (url && !product.main_images.includes(url)) {
            product.main_images.push(url);
          }
        });
      }
    }
    
    // Try globalData
    if (window.globalData?.tempModel) {
      const temp = window.globalData.tempModel;
      if (temp.images) {
        temp.images.forEach(img => {
          const url = cleanImageUrl(typeof img === 'string' ? img : img.url);
          if (url && !product.main_images.includes(url)) {
            product.main_images.push(url);
          }
        });
      }
    }
    
    // Try to find data in script tags
    document.querySelectorAll('script').forEach(script => {
      const text = script.textContent || '';
      
      // Look for image arrays
      const imgMatch = text.match(/"images"\s*:\s*\[([^\]]+)\]/);
      if (imgMatch) {
        try {
          const urls = imgMatch[1].match(/"([^"]+)"/g);
          if (urls) {
            urls.forEach(url => {
              const clean = cleanImageUrl(url.replace(/"/g, ''));
              if (clean && !product.main_images.includes(clean)) {
                product.main_images.push(clean);
              }
            });
          }
        } catch (e) {}
      }
      
      // Look for SKU data
      const skuMatch = text.match(/skuInfoMap['"]\s*:\s*(\{[^}]+(?:\{[^}]*\}[^}]*)*\})/);
      if (skuMatch) {
        try {
          // This is complex JSON, skip for now - DOM extraction will handle it
        } catch (e) {}
      }
    });
  }
  
  function scrapeFromDOM(product) {
    // Title
    if (!product.title_cn) {
      const titleSelectors = [
        'h1.d-title', 
        '.mod-detail-title h1', 
        '.detail-title', 
        'h1[class*="title"]', 
        '.offer-title h1',
        '.title-text',
        '.d-title'
      ];
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          product.title_cn = el.textContent.trim();
          break;
        }
      }
    }
    
    // Price
    if (!product.price) {
      const priceEl = document.querySelector('.price-value, .price-now, .price-original-value, [class*="price"] .value');
      if (priceEl) {
        const match = priceEl.textContent.match(/[\d.]+/);
        if (match) product.price = parseFloat(match[0]);
      }
    }
    
    // Seller
    if (!product.seller.name) {
      const sellerEl = document.querySelector('.company-name a, .shop-name a, [class*="seller-name"] a, .contact-name');
      if (sellerEl) {
        product.seller.name = sellerEl.textContent.trim();
        product.seller.shop_url = sellerEl.href;
        const memberMatch = sellerEl.href?.match(/memberId=([^&]+)|winport\/([^\/]+)/);
        if (memberMatch) product.seller.member_id = memberMatch[1] || memberMatch[2];
      }
    }
    
    // Sold count
    const soldEl = document.querySelector('.sale-count, [class*="sold"], [class*="sale"]');
    if (soldEl) {
      const match = soldEl.textContent.match(/\d+/);
      if (match) product.sold_count = parseInt(match[0]);
    }
    
    product.title = product.title_cn;
  }
  
  function extractAllImages(product) {
    console.log('[WaMerce v4] Extracting images...');
    
    // 1. First try to find images in script data (most reliable)
    document.querySelectorAll('script').forEach(script => {
      const text = script.textContent || '';
      
      // Look for image URLs in various patterns
      const patterns = [
        // Full alicdn URLs
        /https?:\/\/cbu\d+\.alicdn\.com\/[^"'\s><]+\.(?:jpg|jpeg|png|webp)/gi,
        // Protocol-relative URLs
        /\/\/cbu\d+\.alicdn\.com\/[^"'\s><]+\.(?:jpg|jpeg|png|webp)/gi,
        // In JSON objects
        /"(?:image|img|src|url|originalImageURI)"[:\s]*"([^"]+alicdn[^"]+)"/gi,
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          // Handle both full match and capture group
          const imgUrl = match[1] || match[0];
          const cleanUrl = cleanImageUrl(imgUrl);
          if (cleanUrl && !product.main_images.includes(cleanUrl)) {
            product.main_images.push(cleanUrl);
          }
        }
      });
    });
    
    // 2. Main gallery images from DOM
    const gallerySelectors = [
      '.detail-gallery-img img',
      '.mod-detail-gallery img', 
      '.vertical-img img',
      '.thumb-list img',
      '.detail-gallery img',
      '.image-list img',
      '#dt-tab img',
      '.tab-pane img',
      '.detail-main-img img',
      '.main-img-list img',
      '.offer-main-img img',
      '.main-image img',
      '.slider-item img',
      '.detail-pic img',
      '[class*="detail"] [class*="gallery"] img',
      '[class*="detail"] [class*="image"] img',
      '.d-content-main img',
      '.module-pdp-image-gallery img',
    ];
    
    gallerySelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(img => {
        // Try multiple attribute sources
        const sources = [
          img.src,
          img.dataset.src,
          img.dataset.lazySrc,
          img.dataset.original,
          img.getAttribute('data-src'),
          img.getAttribute('data-lazy-src'),
        ];
        
        for (const src of sources) {
          const url = cleanImageUrl(src);
          if (url && !product.main_images.includes(url)) {
            product.main_images.push(url);
            break;
          }
        }
      });
    });
    
    // 3. Get large image from currently visible main image
    const mainImgEl = document.querySelector('.detail-gallery-turn-wrapper img, .offer-main-img img, .main-image-wrapper img');
    if (mainImgEl) {
      const url = cleanImageUrl(mainImgEl.src || mainImgEl.dataset.src);
      if (url && !product.main_images.includes(url)) {
        product.main_images.unshift(url); // Put at front as main image
      }
    }
    
    // 4. SKU/Variant images
    const skuImgSelectors = [
      '.obj-sku img',
      '.sku-item img', 
      '[class*="sku"] img',
      '.prop-img img',
      '.sku-color img',
      '.color-item img',
      '.sku-prop-img img',
      '[class*="variant"] img',
    ];
    
    skuImgSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(img => {
        const url = cleanImageUrl(img.src || img.dataset.src);
        if (url && !product.sku_images.includes(url)) {
          product.sku_images.push(url);
        }
      });
    });
    
    // 5. Look for images in data attributes on any element
    document.querySelectorAll('[data-imgs], [data-images], [data-big-img], [data-pic]').forEach(el => {
      try {
        const data = el.dataset.imgs || el.dataset.images || el.dataset.bigImg || el.dataset.pic;
        if (data) {
          if (data.startsWith('[') || data.startsWith('{')) {
            // JSON array or object
            const parsed = JSON.parse(data);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            items.forEach(item => {
              const url = cleanImageUrl(typeof item === 'string' ? item : (item.url || item.src || item.original));
              if (url && !product.main_images.includes(url)) {
                product.main_images.push(url);
              }
            });
          } else if (data.includes('alicdn')) {
            // Direct URL
            const url = cleanImageUrl(data);
            if (url && !product.main_images.includes(url)) {
              product.main_images.push(url);
            }
          }
        }
      } catch (e) {}
    });
    
    // 6. Also scan ALL images on page as fallback
    if (product.main_images.length === 0) {
      console.log('[WaMerce v4] No gallery images found, scanning all page images...');
      document.querySelectorAll('img').forEach(img => {
        const url = cleanImageUrl(img.src || img.dataset.src);
        // Only include reasonably sized images (likely product images)
        if (url && url.includes('alicdn') && !product.main_images.includes(url)) {
          // Check if image appears to be a product image (not icon/logo)
          if (img.width > 100 || img.height > 100 || !img.complete) {
            product.main_images.push(url);
          }
        }
      });
    }
    
    // 7. Description images (lower priority)
    document.querySelectorAll('.detail-content img, .offer-description img, .desc-content img, .detail-desc img').forEach(img => {
      const url = cleanImageUrl(img.src || img.dataset.src);
      if (url && !product.description_images.includes(url)) {
        product.description_images.push(url);
      }
    });
    
    console.log('[WaMerce v4] Found', product.main_images.length, 'main images,', product.sku_images.length, 'SKU images');
  }
  
  function extractAllVariants(product) {
    console.log('[WaMerce v4] Extracting variants...');
    
    // Try to find SKU data in script tags first (most reliable)
    document.querySelectorAll('script').forEach(script => {
      const text = script.textContent || '';
      
      // Look for skuInfoMap object
      const skuMapMatch = text.match(/["']skuInfoMap["']\s*:\s*(\{[\s\S]*?\})\s*[,}]/);
      if (skuMapMatch && product.skus.length === 0) {
        try {
          // This is complex nested JSON, try to extract key-value pairs
          const mapText = skuMapMatch[1];
          const skuIds = mapText.match(/"([a-f0-9]{20,})"/g) || [];
          
          skuIds.forEach(idMatch => {
            const specId = idMatch.replace(/"/g, '');
            // Try to find price and stock for this SKU
            const priceMatch = text.match(new RegExp(`"${specId}"[^}]*"price"\\s*:\\s*([\\d.]+)`));
            const stockMatch = text.match(new RegExp(`"${specId}"[^}]*"(?:canBookCount|amountOnSale)"\\s*:\\s*(\\d+)`));
            
            if (!product.skus.find(s => s.spec_id === specId)) {
              product.skus.push({
                spec_id: specId,
                price: priceMatch ? parseFloat(priceMatch[1]) : product.price,
                stock: stockMatch ? parseInt(stockMatch[1]) : 100,
              });
            }
          });
        } catch (e) {
          console.log('[WaMerce v4] Error parsing skuInfoMap:', e);
        }
      }
      
      // Look for skuModel.skuProps array
      const skuPropsMatch = text.match(/["']skuProps["']\s*:\s*(\[[\s\S]*?\])\s*,?\s*["']/);
      if (skuPropsMatch) {
        try {
          const propsText = skuPropsMatch[1];
          // This contains the property definitions (color names, size names, etc)
          const valueMatches = propsText.match(/"value"\s*:\s*"([^"]+)"/g) || [];
          // Store for later use
          product._skuPropValues = valueMatches.map(m => m.match(/"([^"]+)"$/)[1]);
        } catch (e) {}
      }
    });
    
    // Get color options from DOM
    const colorOptions = [];
    document.querySelectorAll('.obj-sku .obj-content li, [class*="sku-prop"]:first-of-type li, .sku-color li, .prop-item li, [class*="color-list"] li').forEach((item, idx) => {
      const name = item.textContent?.trim() || item.title || item.dataset.value || item.dataset.name || `Color ${idx + 1}`;
      const img = item.querySelector('img');
      const imgUrl = img ? cleanImageUrl(img.src || img.dataset.src) : null;
      const specId = item.dataset.specId || item.dataset.value || item.dataset.skuId;
      
      // Skip if name is too short or looks like a button
      if (name.length > 1 && name.length < 50) {
        colorOptions.push({ 
          name: name.substring(0, 30), 
          image: imgUrl,
          specId 
        });
      }
    });
    
    // Get size options from DOM
    const sizeOptions = [];
    const sizeContainers = document.querySelectorAll('.obj-sku:nth-of-type(2) .obj-content li, [class*="sku-prop"]:nth-of-type(2) li, .sku-size li, [class*="size-list"] li');
    sizeContainers.forEach((item, idx) => {
      const name = item.textContent?.trim() || item.title || item.dataset.value || item.dataset.name || `Size ${idx + 1}`;
      const specId = item.dataset.specId || item.dataset.value || item.dataset.skuId;
      
      if (name.length > 0 && name.length < 30) {
        sizeOptions.push({ 
          name: name.substring(0, 20),
          specId 
        });
      }
    });
    
    console.log('[WaMerce v4] Found', colorOptions.length, 'colors,', sizeOptions.length, 'sizes');
    
    // If no SKUs from window objects, build from DOM
    if (product.skus.length === 0) {
      if (colorOptions.length > 0 || sizeOptions.length > 0) {
        
        if (colorOptions.length > 0 && sizeOptions.length > 0) {
          // Both color and size - create combinations
          colorOptions.forEach((color, ci) => {
            sizeOptions.forEach((size, si) => {
              product.skus.push({
                spec_id: `${color.specId || ci}_${size.specId || si}`,
                color: color.name,
                size: size.name,
                props_names: `颜色:${color.name};尺码:${size.name}`,
                image: color.image,
                price: product.price,
                stock: 100,
              });
            });
          });
        } else if (colorOptions.length > 0) {
          // Only color
          colorOptions.forEach((color, ci) => {
            product.skus.push({
              spec_id: color.specId || `color_${ci}`,
              color: color.name,
              props_names: `颜色:${color.name}`,
              image: color.image,
              price: product.price,
              stock: 100,
            });
          });
        } else if (sizeOptions.length > 0) {
          // Only size
          sizeOptions.forEach((size, si) => {
            product.skus.push({
              spec_id: size.specId || `size_${si}`,
              size: size.name,
              props_names: `尺码:${size.name}`,
              price: product.price,
              stock: 100,
            });
          });
        }
      }
    }
    
    // Enhance existing SKUs with color/size names if missing
    product.skus.forEach(sku => {
      if (sku.props_names && !sku.color && !sku.size) {
        const parts = sku.props_names.split(';');
        parts.forEach(part => {
          const [key, value] = part.split(':');
          if (key?.includes('颜色') || key?.toLowerCase().includes('color') || key?.includes('款式')) {
            sku.color = value;
          }
          if (key?.includes('尺码') || key?.includes('尺寸') || key?.toLowerCase().includes('size') || key?.includes('规格')) {
            sku.size = value;
          }
        });
      }
    });
    
    product.variants = product.skus;
    console.log('[WaMerce v4] Total variants:', product.variants.length);
  }
  
  function cleanImageUrl(url) {
    if (!url) return null;
    
    // Remove quotes
    url = url.replace(/["']/g, '');
    
    // Add protocol if missing
    if (url.startsWith('//')) url = 'https:' + url;
    
    // Only accept alicdn images
    if (!url.includes('alicdn') && !url.includes('1688.com')) return null;
    
    // Remove thumbnail size suffix to get full image
    url = url.replace(/_\d+x\d+\.(\w+)(\?.*)?$/, '.$1');
    url = url.replace(/\.(jpg|png|webp)_.+$/, '.$1');
    
    // Remove query params except for essential ones
    url = url.split('?')[0];
    
    return url;
  }
  
  // ============= LISTING PAGE SCANNING =============
  function scanPageForProducts() {
    const products = [];
    const seen = new Set();
    
    // If on detail page, get full data
    if (isProductDetailPage()) {
      const fullData = scrapeFullProductData();
      if (fullData.product_id) {
        products.push({
          id: fullData.product_id,
          title: fullData.title_cn || fullData.title,
          price: fullData.price ? `¥${fullData.price}` : '',
          image: fullData.images[0] || fullData.main_images[0] || '',
          url: window.location.href,
          isCurrentPage: true,
          fullData: fullData, // Include complete scraped data!
        });
      }
      return products;
    }
    
    console.log('[WaMerce v4] Scanning listing page for products...');
    
    // For listing/search/collection pages - comprehensive selectors
    const productCardSelectors = [
      // Modern 1688 search results
      '.sm-offer-item',
      '.offer-list-row-offer', 
      '.space-offer-card-box',
      '.pc-offer-card',
      // Legacy selectors
      '[data-offer-id]',
      '.offer-item',
      '.product-item',
      '.card-item',
      '.list-item',
      // Grid layouts
      '.offer-list-row .offer',
      '.list-gallery .item',
      // Category pages
      '.sm-offer-card',
      '.normalcommon-offer-card',
      // Search results
      '[class*="OfferCard"]',
      '[class*="offer-card"]',
      '.organic-list .item',
    ];
    
    // Try each selector
    let productCards = [];
    for (const sel of productCardSelectors) {
      const cards = document.querySelectorAll(sel);
      if (cards.length > 0) {
        productCards = [...cards];
        console.log(`[WaMerce v4] Found ${cards.length} products using selector: ${sel}`);
        break;
      }
    }
    
    // If no structured cards found, fallback to link-based detection
    if (productCards.length === 0) {
      console.log('[WaMerce v4] No product cards found, using link-based detection');
    }
    
    productCards.forEach(card => {
      let productId = card.dataset.offerId || card.dataset.id || card.getAttribute('data-offer-id');
      
      // Try to get ID from link inside card
      if (!productId) {
        const link = card.querySelector('a[href*="offer/"], a[href*="detail.1688.com"]');
        if (link) {
          const match = link.href.match(/offer\/(\d{10,})/);
          if (match) productId = match[1];
        }
      }
      
      // Try data attributes
      if (!productId) {
        productId = card.dataset.offerid || card.dataset.itemId || card.dataset.productId;
      }
      
      if (productId && !seen.has(productId)) {
        seen.add(productId);
        
        // Extract basic info from card - try multiple selectors
        const titleSelectors = ['.title', '[class*="title"]', 'h4', 'h3', '.name', '[class*="name"]', '.desc', 'a[title]'];
        let title = '';
        for (const sel of titleSelectors) {
          const el = card.querySelector(sel);
          if (el) {
            title = el.textContent?.trim() || el.title || el.getAttribute('title') || '';
            if (title.length > 5) break;
          }
        }
        
        const priceSelectors = ['.price', '[class*="price"]', '.price-value', '[class*="Price"]'];
        let price = '';
        for (const sel of priceSelectors) {
          const el = card.querySelector(sel);
          if (el) {
            const match = el.textContent?.match(/[\d.]+/);
            if (match) {
              price = `¥${match[0]}`;
              break;
            }
          }
        }
        
        // Get image
        const imgEl = card.querySelector('img');
        const image = cleanImageUrl(imgEl?.src || imgEl?.dataset?.src || imgEl?.dataset?.lazySrc || '') || '';
        
        products.push({
          id: productId,
          title: title.substring(0, 80) || `Product ${productId.substring(0, 8)}`,
          price: price,
          image: image,
          url: `https://detail.1688.com/offer/${productId}.html`,
          isCurrentPage: false,
          // Note: fullData not available for listing items - need to fetch from TMAPI
        });
      }
    });
    
    // Also check for any links to product pages if we found few products
    if (products.length < 5) {
      console.log('[WaMerce v4] Few products found, scanning links...');
      document.querySelectorAll('a[href*="detail.1688.com/offer/"], a[href*="/offer/"]').forEach(link => {
        const match = link.href.match(/offer\/(\d{10,})/);
        if (match && !seen.has(match[1])) {
          seen.add(match[1]);
          const container = link.closest('[class*="item"], [class*="card"], [class*="offer"], .list-item, tr, li') || link.parentElement;
          
          // Extract info from container
          let title = link.textContent?.trim() || '';
          if (!title || title.length < 5) {
            const titleEl = container?.querySelector('[class*="title"], h3, h4, .name');
            title = titleEl?.textContent?.trim() || `Product ${match[1].substring(0, 8)}`;
          }
          
          const priceEl = container?.querySelector('[class*="price"]');
          const priceMatch = priceEl?.textContent?.match(/[\d.]+/);
          const price = priceMatch ? `¥${priceMatch[0]}` : '';
          
          const imgEl = container?.querySelector('img');
          const image = cleanImageUrl(imgEl?.src || imgEl?.dataset?.src || '') || '';
          
          products.push({
            id: match[1],
            title: title.substring(0, 80),
            price: price,
            image: image,
            url: `https://detail.1688.com/offer/${match[1]}.html`,
            isCurrentPage: false,
          });
        }
      });
    }
    
    console.log(`[WaMerce v4] Total products found on page: ${products.length}`);
    return products;
  }
  
  // ============= FLOATING UI =============
  function createFloatingButton() {
    const existing = document.getElementById('wamerce-fab');
    if (existing) existing.remove();
    
    const fab = document.createElement('div');
    fab.id = 'wamerce-fab';
    fab.innerHTML = `
      <style>
        #wamerce-fab {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .wamerce-fab-main {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          color: white;
          border-radius: 50px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
          transition: transform 0.2s, box-shadow 0.2s;
          font-weight: 600;
        }
        .wamerce-fab-main:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5);
        }
        .wamerce-fab-count {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #22c55e;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }
      </style>
      <div class="wamerce-fab-main">
        <span>🛒</span>
        <span>WaMerce Import</span>
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
    
    fab.addEventListener('click', () => {
      const products = scanPageForProducts();
      if (products.length > 0) {
        alert(`Found ${products.length} product(s)!\n\nClick the WaMerce extension icon in your browser toolbar to import.`);
      } else {
        alert('No products found on this page.\n\nTry visiting a product detail page or search results page.');
      }
    });
  }
  
  // Initialize
  setTimeout(createFloatingButton, 1500);
  
})();
