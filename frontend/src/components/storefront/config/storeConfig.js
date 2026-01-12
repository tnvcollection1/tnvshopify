/**
 * Multi-tenant Store Configuration
 * Maps domains and slugs to store-specific settings
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
    promoCode: 'WELCOME10',
    contact: {
      email: 'support@tnvcollection.com',
      phone: '+91-XXXXXXXXXX',
      whatsapp: '+91-XXXXXXXXXX'
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
    promoCode: 'WELCOME10',
    contact: {
      email: 'support@tnvcollection.pk',
      phone: '+92-XXXXXXXXXX',
      whatsapp: '+92-XXXXXXXXXX'
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
  // Development/preview domains
  'localhost': 'tnvcollection',
  'localhost:3000': 'tnvcollection'
};

/**
 * Get store config based on current domain or slug
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
  
  // Default to India store
  return STORE_CONFIG['tnvcollection'];
};

/**
 * Detect store from current window location
 */
export const detectStore = () => {
  if (typeof window === 'undefined') return STORE_CONFIG['tnvcollection'];
  
  const hostname = window.location.hostname;
  const port = window.location.port;
  const hostWithPort = port ? `${hostname}:${port}` : hostname;
  
  // Check with port first, then without
  return getStoreConfig(hostWithPort) || getStoreConfig(hostname);
};

/**
 * Format price with store currency
 */
export const formatPrice = (amount, storeConfig) => {
  const { currency } = storeConfig;
  return `${currency.symbol}${parseFloat(amount).toLocaleString(storeConfig.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

export default STORE_CONFIG;
