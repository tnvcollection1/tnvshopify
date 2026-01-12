/**
 * Multi-tenant Store Configuration
 * Supports: subdomain.wamerce.com pattern (like Shopify)
 * Also supports custom domains for merchants
 */

export const STORE_CONFIG = {
  // India Store - tnvcollection.wamerce.com or tnvcollection.com
  'tnvcollection': {
    id: 'tnvcollection',
    name: 'TNC Collection',
    tagline: 'Premium Fashion',
    subdomain: 'tnvcollection', // tnvcollection.wamerce.com
    customDomain: 'tnvcollection.com', // optional custom domain
    currency: {
      code: 'INR',
      symbol: '₹',
      name: 'Indian Rupee'
    },
    country: 'India',
    locale: 'en-IN',
    shippingMessage: 'Free shipping on orders over ₹5,000',
    freeShippingThreshold: 5000,
    shippingCost: 199,
    promoCode: 'WELCOME10',
    contact: {
      email: 'support@tnvcollection.com',
      phone: '+92-3111222868',
      whatsapp: '+923111222868',
      support_hours: '10 AM - 7 PM IST'
    },
    social: {
      instagram: 'https://instagram.com/tnvcollection',
      facebook: 'https://facebook.com/tnvcollection'
    },
    theme: {
      primary: '#000000',
      accent: '#c9a050',
      background: '#ffffff'
    }
  },
  
  // Pakistan Store - tnvcollectionpk.wamerce.com or tnvcollection.pk
  'tnvcollectionpk': {
    id: 'tnvcollectionpk',
    name: 'TNC Collection',
    tagline: 'Premium Fashion',
    subdomain: 'tnvcollectionpk', // tnvcollectionpk.wamerce.com
    customDomain: 'tnvcollection.pk', // optional custom domain
    currency: {
      code: 'PKR',
      symbol: 'Rs',
      name: 'Pakistani Rupee'
    },
    country: 'Pakistan',
    locale: 'en-PK',
    shippingMessage: 'Free shipping on orders over Rs 10,000',
    freeShippingThreshold: 10000,
    shippingCost: 250,
    promoCode: 'WELCOME10',
    contact: {
      email: 'support@tnvcollection.pk',
      phone: '+92-3111222868',
      whatsapp: '+923111222868',
      support_hours: '10 AM - 7 PM PKT'
    },
    social: {
      instagram: 'https://instagram.com/tnvcollectionpk',
      facebook: 'https://facebook.com/tnvcollectionpk'
    },
    theme: {
      primary: '#000000',
      accent: '#c9a050',
      background: '#ffffff'
    }
  }
};

// Platform domain
export const PLATFORM_DOMAIN = 'wamerce.com';

// Custom domain to store mapping (for merchants with their own domains)
export const CUSTOM_DOMAIN_TO_STORE = {
  'tnvcollection.com': 'tnvcollection',
  'www.tnvcollection.com': 'tnvcollection',
  'tnvcollection.pk': 'tnvcollectionpk',
  'www.tnvcollection.pk': 'tnvcollectionpk',
  'tnvcollection.in': 'tnvcollection',
  'www.tnvcollection.in': 'tnvcollection',
};

/**
 * Extract subdomain from hostname
 * e.g., "tnvcollection.wamerce.com" → "tnvcollection"
 */
export const extractSubdomain = (hostname) => {
  // Check if it's a wamerce.com subdomain
  if (hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const subdomain = hostname.replace(`.${PLATFORM_DOMAIN}`, '');
    // Ignore www
    if (subdomain === 'www') return null;
    return subdomain;
  }
  return null;
};

/**
 * Get store config based on subdomain, custom domain, or store slug
 */
export const getStoreConfig = (identifier) => {
  // Direct slug match
  if (STORE_CONFIG[identifier]) {
    return STORE_CONFIG[identifier];
  }
  
  // Check custom domain mapping
  if (CUSTOM_DOMAIN_TO_STORE[identifier]) {
    const storeSlug = CUSTOM_DOMAIN_TO_STORE[identifier];
    return STORE_CONFIG[storeSlug];
  }
  
  // Check if identifier is a subdomain match
  for (const [slug, config] of Object.entries(STORE_CONFIG)) {
    if (config.subdomain === identifier) {
      return config;
    }
  }
  
  // Default store
  return STORE_CONFIG[import.meta.env.VITE_DEFAULT_STORE || 'tnvcollection'];
};

/**
 * Detect store from current window location
 * Priority:
 * 1. URL parameter: ?store=storename (for preview/testing)
 * 2. Subdomain: storename.wamerce.com
 * 3. Custom domain: tnvcollection.com
 * 4. Default store
 */
export const detectStore = () => {
  if (typeof window === 'undefined') {
    return STORE_CONFIG[import.meta.env.VITE_DEFAULT_STORE || 'tnvcollection'];
  }
  
  const hostname = window.location.hostname;
  const urlParams = new URLSearchParams(window.location.search);
  
  // 1. Check for store preview parameter in URL
  const previewStore = urlParams.get('store');
  if (previewStore && STORE_CONFIG[previewStore]) {
    // Save to localStorage for session persistence
    localStorage.setItem('preview_store', previewStore);
    return STORE_CONFIG[previewStore];
  }
  
  // 2. Check localStorage for persisted store preference (for preview)
  const savedStore = localStorage.getItem('preview_store');
  if (savedStore && STORE_CONFIG[savedStore]) {
    return STORE_CONFIG[savedStore];
  }
  
  // 3. Check for subdomain pattern: storename.wamerce.com
  const subdomain = extractSubdomain(hostname);
  if (subdomain && STORE_CONFIG[subdomain]) {
    return STORE_CONFIG[subdomain];
  }
  
  // 4. Check custom domain mapping
  if (CUSTOM_DOMAIN_TO_STORE[hostname]) {
    return STORE_CONFIG[CUSTOM_DOMAIN_TO_STORE[hostname]];
  }
  
  // 5. Check if hostname contains store identifier
  for (const [slug, config] of Object.entries(STORE_CONFIG)) {
    if (hostname.includes(slug)) {
      return config;
    }
  }
  
  // 6. Default to configured store
  return STORE_CONFIG[import.meta.env.VITE_DEFAULT_STORE || 'tnvcollection'];
};

/**
 * Get the store URL (subdomain or custom domain)
 */
export const getStoreUrl = (storeConfig, useCustomDomain = false) => {
  if (useCustomDomain && storeConfig.customDomain) {
    return `https://${storeConfig.customDomain}`;
  }
  return `https://${storeConfig.subdomain}.${PLATFORM_DOMAIN}`;
};

/**
 * Format price with store currency
 */
export const formatPrice = (amount, storeConfig) => {
  const { currency, locale } = storeConfig;
  return `${currency.symbol}${parseFloat(amount).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

/**
 * Get API URL
 */
export const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || `https://api.${PLATFORM_DOMAIN}`;
};

export default STORE_CONFIG;
