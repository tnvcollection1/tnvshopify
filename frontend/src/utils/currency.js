// Currency utility for store-based currency handling

export const STORE_CURRENCIES = {
  'tnvcollectionpk': { code: 'PKR', symbol: 'Rs.', name: 'Pakistani Rupee' },
  'ashmiaa': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  'tnvcollection': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  'asmia': { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  'default': { code: 'INR', symbol: '₹', name: 'Indian Rupee' }
};

export const getCurrency = (storeName) => {
  if (!storeName || storeName === 'all') return STORE_CURRENCIES.default;
  const store = storeName.toLowerCase();
  return STORE_CURRENCIES[store] || STORE_CURRENCIES.default;
};

export const formatCurrency = (amount, storeName) => {
  const currency = getCurrency(storeName);
  const value = parseFloat(amount) || 0;
  return `${currency.symbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export const formatCurrencyWithCode = (amount, storeName) => {
  const currency = getCurrency(storeName);
  const value = parseFloat(amount) || 0;
  return `${currency.code} ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export default { getCurrency, formatCurrency, formatCurrencyWithCode, STORE_CURRENCIES };
