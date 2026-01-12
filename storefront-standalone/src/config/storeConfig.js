/**
 * Multi-tenant Store Configuration
 * Maps domains to store-specific settings
 */

export const STORE_CONFIG = {
  // India Store - tnvcollection.com
  'tnvcollection': {
    id: 'tnvcollection',
    name: 'TNC Collection',
    tagline: 'Premium Fashion',
    domain: 'tnvcollection.com',
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
  
  // Pakistan Store - tnvcollection.pk
  'tnvcollectionpk': {
    id: 'tnvcollectionpk',
    name: 'TNC Collection',
    tagline: 'Premium Fashion',
    domain: 'tnvcollection.pk',
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

// Domain to store mapping for production
export const DOMAIN_TO_STORE = {
  'tnvcollection.com': 'tnvcollection',
  'www.tnvcollection.com': 'tnvcollection',
  'tnvcollection.pk': 'tnvcollectionpk',
  'www.tnvcollection.pk': 'tnvcollectionpk',
  // Development domains
  'localhost': import.meta.env.VITE_DEFAULT_STORE || 'tnvcollection',
  '127.0.0.1': import.meta.env.VITE_DEFAULT_STORE || 'tnvcollection'
};

/**
 * Get store config based on current domain
 */
export const getStoreConfig = (storeSlugOrDomain) => {
  // First check if it's a direct slug match
  if (STORE_CONFIG[storeSlugOrDomain]) {
    return STORE_CONFIG[storeSlugOrDomain];
  }
  
  // Check domain mapping
  const storeSlug = DOMAIN_TO_STORE[storeSlugOrDomain];
  if (storeSlug && STORE_CONFIG[storeSlug]) {
    return STORE_CONFIG[storeSlug];
  }
  
  // Default to configured store
  return STORE_CONFIG[import.meta.env.VITE_DEFAULT_STORE || 'tnvcollection'];
};

/**
 * Detect store from current window location
 */
export const detectStore = () => {
  if (typeof window === 'undefined') {
    return STORE_CONFIG[import.meta.env.VITE_DEFAULT_STORE || 'tnvcollectionpk'];
  }
  
  const hostname = window.location.hostname;
  return getStoreConfig(hostname);
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
  return import.meta.env.VITE_API_URL || 'https://wamerce.com';
};

export default STORE_CONFIG;
