import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Search, User, ShoppingBag, Heart, ChevronDown, Gift, Menu, X, Globe, Grid, List, SlidersHorizontal } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Country & Currency Data
const COUNTRIES = [
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ', rate: 3.67 },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', rate: 1.53 },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', symbol: '৳', rate: 109.50 },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'C$', rate: 1.36 },
  { code: 'CN', name: 'China', currency: 'CNY', symbol: '¥', rate: 7.24 },
  { code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€', rate: 0.92 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', rate: 83.12 },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: 'Rs', rate: 278.50 },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', symbol: 'ر.س', rate: 3.75 },
  { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$', rate: 1.34 },
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', rate: 1 },
];

const STORE_CONFIGS = {
  tnvcollection: { baseCurrency: 'INR', baseSymbol: '₹', defaultCountry: 'IN' },
  tnvcollectionpk: { baseCurrency: 'PKR', baseSymbol: 'Rs', defaultCountry: 'PK' }
};

const getFlagEmoji = (countryCode) => {
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

const CollectionPage = () => {
  const { collectionHandle } = useParams();
  const location = useLocation();
  const [collection, setCollection] = useState(null);
  const [products, setProducts] = useState([]);
  const [allCollections, setAllCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid-4');
  const [filterOpen, setFilterOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const countryRef = useRef(null);

  // Get store name from URL
  const getStoreName = () => {
    const path = location.pathname;
    if (path.includes('tnvcollectionpk')) return 'tnvcollectionpk';
    return 'tnvcollection';
  };
  const storeName = getStoreName();
  const storeConfig = STORE_CONFIGS[storeName];

  useEffect(() => {
    const saved = localStorage.getItem('selectedCountry');
    if (saved) {
      setSelectedCountry(JSON.parse(saved));
    } else {
      detectCountry();
    }
  }, []);

  const detectCountry = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const detected = COUNTRIES.find(c => c.code === data.country_code) || COUNTRIES.find(c => c.code === 'US');
      setSelectedCountry(detected);
    } catch {
      setSelectedCountry(COUNTRIES.find(c => c.code === storeConfig?.defaultCountry) || COUNTRIES[11]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [collectionHandle, storeName]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all collections
      const collectionsRes = await fetch(`${API_URL}/api/storefront/collections?store=${storeName}&limit=20`);
      const collectionsData = await collectionsRes.json();
      setAllCollections(collectionsData.collections || []);

      // Find current collection
      const currentCollection = (collectionsData.collections || []).find(
        c => c.handle === collectionHandle || c.id === collectionHandle
      );
      setCollection(currentCollection);

      // Fetch products (filtered by collection if specified)
      let productsUrl = `${API_URL}/api/storefront/products?store=${storeName}&limit=24`;
      if (collectionHandle && collectionHandle !== 'all') {
        productsUrl += `&collection=${collectionHandle}`;
      }
      const productsRes = await fetch(productsUrl);
      const productsData = await productsRes.json();
      setProducts(productsData.products || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertPrice = (price) => {
    if (!storeConfig || !selectedCountry) return price;
    const basePrice = parseFloat(price);
    const baseCountry = COUNTRIES.find(c => c.currency === storeConfig.baseCurrency);
    if (!baseCountry) return price;
    const priceInUSD = basePrice / baseCountry.rate;
    return priceInUSD * selectedCountry.rate;
  };

  const formatPrice = (price) => {
    if (!selectedCountry) return price;
    const converted = convertPrice(price);
    if (selectedCountry.rate > 100) {
      return `${selectedCountry.symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${selectedCountry.symbol}${converted.toFixed(2)}`;
  };

  const sortedProducts = [...products].sort((a, b) => {
    const priceA = parseFloat(a.variants?.[0]?.price || a.price || 0);
    const priceB = parseFloat(b.variants?.[0]?.price || b.price || 0);
    switch (sortBy) {
      case 'price-low': return priceA - priceB;
      case 'price-high': return priceB - priceA;
      case 'name-az': return (a.title || '').localeCompare(b.title || '');
      case 'name-za': return (b.title || '').localeCompare(a.title || '');
      default: return 0;
    }
  });

  const gridClass = {
    'grid-2': 'grid-cols-2',
    'grid-3': 'grid-cols-2 md:grid-cols-3',
    'grid-4': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  }[viewMode] || 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="bg-black text-white">
          <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between h-10">
            <div className="relative" ref={countryRef}>
              <button 
                onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                className="flex items-center space-x-2 text-[11px] tracking-wide hover:text-gray-300 transition"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{selectedCountry?.code} | {selectedCountry?.currency}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {countryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white text-black shadow-xl border z-50 max-h-80 overflow-y-auto">
                  {COUNTRIES.map(country => (
                    <button
                      key={country.code}
                      onClick={() => {
                        setSelectedCountry(country);
                        localStorage.setItem('selectedCountry', JSON.stringify(country));
                        setCountryDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 text-sm ${
                        selectedCountry?.code === country.code ? 'bg-gray-100' : ''
                      }`}
                    >
                      <span>{getFlagEmoji(country.code)} {country.name}</span>
                      <span className="text-gray-500">{country.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[11px] tracking-wider hidden md:block">FREE SHIPPING ON ALL ORDERS</p>
            <div className="flex space-x-4 text-[11px]">
              <a href="#" className="hover:text-gray-300">HELP</a>
            </div>
          </div>
        </div>
        
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <button className="lg:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <Link to={`/${storeName}preview`} className="text-2xl tracking-[0.4em] font-light absolute left-1/2 -translate-x-1/2">TNV</Link>
            <div className="flex items-center space-x-4">
              <Search className="w-5 h-5 cursor-pointer" strokeWidth={1.5} />
              <Heart className="w-5 h-5 cursor-pointer" strokeWidth={1.5} />
              <ShoppingBag className="w-5 h-5 cursor-pointer" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden lg:block border-t border-gray-100">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex items-center justify-center space-x-8 h-12 overflow-x-auto">
              <Link 
                to={`/${storeName}preview/collection/all`}
                className={`text-[11px] tracking-[0.15em] font-medium whitespace-nowrap ${!collectionHandle || collectionHandle === 'all' ? 'text-black border-b-2 border-black' : 'text-gray-600 hover:text-black'}`}
              >
                ALL
              </Link>
              {allCollections.slice(0, 10).map(col => (
                <Link
                  key={col.id || col.handle}
                  to={`/${storeName}preview/collection/${col.handle || col.id}`}
                  className={`text-[11px] tracking-[0.15em] font-medium whitespace-nowrap ${collectionHandle === col.handle ? 'text-black border-b-2 border-black' : 'text-gray-600 hover:text-black'}`}
                >
                  {col.title?.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Page Header */}
      <div className="bg-[#f8f8f8] py-12">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <h1 className="text-3xl font-light tracking-wide mb-2">
            {collection?.title || 'All Products'}
          </h1>
          <p className="text-sm text-gray-600">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="border-b border-gray-200 sticky top-0 bg-white z-30">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <button 
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center space-x-2 text-sm hover:text-gray-600"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>FILTER</span>
            </button>

            <div className="flex items-center space-x-6">
              {/* Sort */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">SORT:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border-0 focus:ring-0 cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name-az">Name: A-Z</option>
                  <option value="name-za">Name: Z-A</option>
                </select>
              </div>

              {/* View Mode */}
              <div className="hidden md:flex items-center space-x-2 border-l pl-6">
                <button 
                  onClick={() => setViewMode('grid-2')}
                  className={`p-1 ${viewMode === 'grid-2' ? 'text-black' : 'text-gray-400'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('grid-3')}
                  className={`p-1 ${viewMode === 'grid-3' ? 'text-black' : 'text-gray-400'}`}
                >
                  <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
                    {[...Array(9)].map((_, i) => <div key={i} className="bg-current"></div>)}
                  </div>
                </button>
                <button 
                  onClick={() => setViewMode('grid-4')}
                  className={`p-1 ${viewMode === 'grid-4' ? 'text-black' : 'text-gray-400'}`}
                >
                  <div className="grid grid-cols-4 gap-0.5 w-4 h-4">
                    {[...Array(16)].map((_, i) => <div key={i} className="bg-current"></div>)}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {filterOpen && (
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-[1400px] mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {/* Categories */}
              <div>
                <h3 className="text-xs tracking-wider font-medium mb-4">CATEGORY</h3>
                <div className="space-y-2">
                  {allCollections.slice(0, 8).map(col => (
                    <Link
                      key={col.id}
                      to={`/${storeName}preview/collection/${col.handle || col.id}`}
                      className="block text-sm text-gray-600 hover:text-black"
                    >
                      {col.title}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-xs tracking-wider font-medium mb-4">PRICE</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <button className="block hover:text-black">Under {selectedCountry?.symbol}1,000</button>
                  <button className="block hover:text-black">{selectedCountry?.symbol}1,000 - {selectedCountry?.symbol}3,000</button>
                  <button className="block hover:text-black">{selectedCountry?.symbol}3,000 - {selectedCountry?.symbol}5,000</button>
                  <button className="block hover:text-black">Over {selectedCountry?.symbol}5,000</button>
                </div>
              </div>

              {/* Size */}
              <div>
                <h3 className="text-xs tracking-wider font-medium mb-4">SIZE</h3>
                <div className="flex flex-wrap gap-2">
                  {['6', '7', '8', '9', '10', '11', '12'].map(size => (
                    <button key={size} className="w-10 h-10 border border-gray-300 text-sm hover:border-black">
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <h3 className="text-xs tracking-wider font-medium mb-4">COLOR</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Black', color: '#000' },
                    { name: 'Brown', color: '#8B4513' },
                    { name: 'Tan', color: '#D2B48C' },
                    { name: 'White', color: '#FFF' },
                    { name: 'Navy', color: '#000080' },
                  ].map(c => (
                    <button 
                      key={c.name} 
                      className="w-8 h-8 rounded-full border border-gray-300 hover:ring-2 ring-black ring-offset-2"
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {sortedProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No products found in this collection</p>
            <Link to={`/${storeName}preview`} className="mt-4 inline-block text-sm underline">
              Browse all products
            </Link>
          </div>
        ) : (
          <div className={`grid ${gridClass} gap-x-6 gap-y-10`}>
            {sortedProducts.map((product, idx) => (
              <Link 
                key={product.id || idx} 
                to={`/${storeName}preview/product/${product.id}`}
                className="group"
              >
                <div className="aspect-[3/4] bg-[#f5f5f5] overflow-hidden mb-4 relative">
                  <img
                    src={product.images?.[0]?.src || 'https://via.placeholder.com/400x500'}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <button 
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.preventDefault(); }}
                  >
                    <Heart className="w-5 h-5 text-gray-600 hover:text-black" strokeWidth={1.5} />
                  </button>
                  {product.tags?.includes('sale') && (
                    <span className="absolute top-4 left-4 bg-red-600 text-white text-[10px] px-2 py-1 tracking-wider">
                      SALE
                    </span>
                  )}
                </div>
                <p className="text-[10px] tracking-[0.15em] text-gray-500 mb-1">TNV COLLECTION</p>
                <h3 className="text-sm font-light leading-snug mb-2 line-clamp-2 group-hover:underline">{product.title}</h3>
                <p className="text-sm font-medium">
                  {formatPrice(product.variants?.[0]?.price || product.price || 0)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-white py-16 mt-16">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-[11px] tracking-[0.2em] font-medium mb-6">CUSTOMER SERVICE</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Shipping</a></li>
                <li><a href="#" className="hover:text-white">Returns</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] tracking-[0.2em] font-medium mb-6">ABOUT</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Our Story</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] tracking-[0.2em] font-medium mb-6">LEGAL</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] tracking-[0.2em] font-medium mb-6">FOLLOW US</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Instagram</a></li>
                <li><a href="#" className="hover:text-white">Facebook</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-xl tracking-[0.4em] font-light mb-4">TNV COLLECTION</p>
            <p className="text-xs text-gray-500">© 2025 TNV Collection. All Rights Reserved.</p>
          </div>
        </div>
      </footer>

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default CollectionPage;
