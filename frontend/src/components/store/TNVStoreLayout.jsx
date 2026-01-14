import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, User, Heart, ShoppingBag, ChevronDown, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Store Context
const StoreContext = createContext();
export const useStore = () => useContext(StoreContext);

// Countries/Regions
const REGIONS = [
  { code: 'AE', name: 'UAE', currency: 'AED', symbol: 'AED', rate: 3.67, flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', symbol: 'SAR', rate: 3.75, flag: '🇸🇦' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', symbol: 'KWD', rate: 0.31, flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar', currency: 'QAR', symbol: 'QAR', rate: 3.64, flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', symbol: 'BHD', rate: 0.38, flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', currency: 'OMR', symbol: 'OMR', rate: 0.38, flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: 'Rs.', rate: 278.50, flag: '🇵🇰' },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', rate: 83.12, flag: '🇮🇳' },
];

// Store-specific configurations
const STORE_CONFIGS = {
  'tnvcollection': {
    defaultRegion: 'IN',
    currency: 'INR',
    symbol: '₹',
    country: 'India',
    baseUrl: '/tnv',
    freeShippingThreshold: 2000,
    shippingCost: 150
  },
  'tnvcollectionpk': {
    defaultRegion: 'PK',
    currency: 'PKR',
    symbol: 'Rs.',
    country: 'Pakistan',
    baseUrl: '/tnv-pk',
    freeShippingThreshold: 5000,
    shippingCost: 300
  }
};

export const TNVStoreProvider = ({ children, storeName = 'tnvcollection' }) => {
  // Get store-specific config
  const storeConfig = STORE_CONFIGS[storeName] || STORE_CONFIGS['tnvcollection'];
  
  // Set default region based on store - use initializer function
  const getDefaultRegion = (store) => {
    const config = STORE_CONFIGS[store] || STORE_CONFIGS['tnvcollection'];
    const saved = localStorage.getItem(`tnv_region_${store}`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return REGIONS.find(r => r.code === config.defaultRegion) || REGIONS[0];
  };
  
  const getInitialCart = (store) => {
    const saved = localStorage.getItem(`tnv_cart_${store}`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  };
  
  const getInitialWishlist = (store) => {
    const saved = localStorage.getItem(`tnv_wishlist_${store}`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  };
  
  const [region, setRegion] = useState(() => getDefaultRegion(storeName));
  const [cart, setCart] = useState(() => getInitialCart(storeName));
  const [wishlist, setWishlist] = useState(() => getInitialWishlist(storeName));
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [navConfig, setNavConfig] = useState(null);

  const detectRegion = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      const detected = REGIONS.find(r => r.code === data.country_code);
      if (detected) setRegion(detected);
    } catch (e) { console.log('Could not detect region'); }
  };

  const fetchNavConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/storefront/config/navigation/${storeName}`);
      const data = await res.json();
      setNavConfig(data);
    } catch (e) {
      console.log('Using default nav config');
    }
  };

  useEffect(() => {
    fetchNavConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeName]);

  useEffect(() => { localStorage.setItem(`tnv_region_${storeName}`, JSON.stringify(region)); }, [region, storeName]);
  useEffect(() => { localStorage.setItem(`tnv_cart_${storeName}`, JSON.stringify(cart)); }, [cart, storeName]);
  useEffect(() => { localStorage.setItem(`tnv_wishlist_${storeName}`, JSON.stringify(wishlist)); }, [wishlist, storeName]);

  const addToCart = (product, variant, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => 
        item.productId === product.shopify_product_id && item.variantId === variant?.id
      );
      if (existing) {
        return prev.map(item => 
          item.productId === product.shopify_product_id && item.variantId === variant?.id
            ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, {
        productId: product.shopify_product_id,
        variantId: variant?.id,
        title: product.title,
        image: product.images?.[0]?.src,
        price: variant?.price || product.price,
        size: variant?.option1,
        color: variant?.option2,
        quantity
      }];
    });
  };

  const removeFromCart = (productId, variantId) => {
    setCart(prev => prev.filter(item => !(item.productId === productId && item.variantId === variantId)));
  };

  const updateCartQuantity = (productId, variantId, quantity) => {
    if (quantity <= 0) { removeFromCart(productId, variantId); return; }
    setCart(prev => prev.map(item =>
      item.productId === productId && item.variantId === variantId ? { ...item, quantity } : item
    ));
  };

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.shopify_product_id === product.shopify_product_id);
      if (exists) return prev.filter(p => p.shopify_product_id !== product.shopify_product_id);
      return [...prev, product];
    });
  };

  const isInWishlist = (productId) => wishlist.some(p => p.shopify_product_id === productId);
  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Format price - uses store's default currency
  const formatPrice = (price) => {
    // If price is already in store's currency (INR for India, PKR for Pakistan)
    // Display in the selected region's currency
    const baseRate = storeConfig.currency === 'INR' ? 83.12 : 278.50; // INR or PKR base
    const converted = (parseFloat(price) / baseRate) * region.rate;
    if (region.rate < 1) return `${region.symbol} ${converted.toFixed(3)}`;
    return `${region.symbol} ${Math.round(converted).toLocaleString()}`;
  };
  
  // Format price in store's native currency (no conversion)
  const formatStoreCurrency = (price) => {
    return `${storeConfig.symbol} ${Math.round(parseFloat(price)).toLocaleString()}`;
  };

  return (
    <StoreContext.Provider value={{
      storeName, storeConfig, region, setRegion, regions: REGIONS, cart, addToCart, removeFromCart,
      updateCartQuantity, cartTotal, cartCount, wishlist, toggleWishlist, isInWishlist,
      user, setUser, searchQuery, setSearchQuery, formatPrice, formatStoreCurrency, API_URL, navConfig
    }}>
      {children}
    </StoreContext.Provider>
  );
};

// Namshi-style Header - EXACT COPY
export const TNVHeader = () => {
  const { region, setRegion, regions, cartCount, wishlist, searchQuery, setSearchQuery, navConfig } = useStore();
  const [regionDropdown, setRegionDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [genderDropdown, setGenderDropdown] = useState(false);
  const [selectedGender, setSelectedGender] = useState('WOMEN');
  const [promoIndex, setPromoIndex] = useState(0);
  const location = useLocation();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.category-dropdown-container')) {
        setActiveCategory(null);
      }
      if (!e.target.closest('.gender-dropdown-container')) {
        setGenderDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Promo messages (rotating)
  const promoMessages = navConfig?.promoMessages || [
    { text: 'Cash On Delivery' },
    { text: 'Free Delivery and Exchange' },
    { text: '100% Genuine Products' },
    { text: 'Easy Returns' },
  ];
  
  // Category tabs state - fetched from API
  const [categoryTabs, setCategoryTabs] = useState([]);
  const [subNavItems, setSubNavItems] = useState([]);

  // Fetch category tabs and sub-nav from API
  useEffect(() => {
    const fetchLayoutConfig = async () => {
      try {
        const [tabsRes, subNavRes] = await Promise.all([
          fetch(`${API_URL}/api/storefront/banners/category-tabs/tnvcollection`),
          fetch(`${API_URL}/api/storefront/banners/sub-nav/tnvcollection`)
        ]);
        const tabsData = await tabsRes.json();
        const subNavData = await subNavRes.json();
        if (tabsData.categoryTabs) setCategoryTabs(tabsData.categoryTabs);
        if (subNavData.subNavItems) setSubNavItems(subNavData.subNavItems);
      } catch (e) {
        console.log('Using default layout config');
      }
    };
    fetchLayoutConfig();
  }, []);
  
  // Default category tabs - EXACTLY like Namshi with images
  const defaultCategoryTabs = [
    { 
      id: 'cat-fashion',
      name: 'FASHION', 
      path: '/fashion', 
      bgColor: '#c8e6c9', // Light green
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100&h=100&fit=crop',
      hasMegaMenu: true 
    },
    { 
      id: 'cat-beauty',
      name: 'Beauty', 
      path: '/beauty', 
      bgColor: '#f5f5f5',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100&h=100&fit=crop'
    },
    { 
      id: 'cat-bags',
      name: 'BAGS & KIDS', 
      path: '/bags', 
      bgColor: '#ffe0b2', // Peach/orange
      image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=100&h=100&fit=crop'
    },
    { 
      id: 'cat-home',
      name: 'HOME & MORE', 
      path: '/home', 
      bgColor: '#b2dfdb', // Teal
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop'
    },
    { 
      id: 'cat-premium',
      name: 'PREMIUM', 
      path: '/premium', 
      bgColor: '#f5f5f5',
      image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=100&h=100&fit=crop'
    },
  ];
  
  // Use API data or defaults
  const mainTabs = categoryTabs.length > 0 ? categoryTabs : defaultCategoryTabs;
  
  // Default sub-navigation items (EXACTLY like Namshi)
  const defaultSubNavItems = [
    { id: 'sub-clothing', name: 'CLOTHING', path: '/tnv/clothing', highlight: false },
    { id: 'sub-shoes', name: 'SHOES', path: '/tnv/shoes', highlight: false },
    { id: 'sub-accessories', name: 'ACCESSORIES', path: '/tnv/accessories', highlight: false },
    { id: 'sub-bags', name: 'BAGS', path: '/tnv/bags', highlight: false },
    { id: 'sub-sports', name: 'SPORTS', path: '/tnv/sports', highlight: false },
    { id: 'sub-new', name: 'NEW ARRIVALS', path: '/tnv/new-arrivals', highlight: false },
    { id: 'sub-premium', name: 'PREMIUM', path: '/tnv/premium', highlight: false },
    { id: 'sub-sale', name: 'SALE', path: '/tnv/sale', highlight: true },
    { id: 'sub-brands', name: 'BRANDS', path: '/tnv/brands', highlight: false },
  ];
  
  const subNavList = subNavItems.length > 0 ? subNavItems : defaultSubNavItems;

  // Auto-rotate promo messages
  useEffect(() => {
    const interval = setInterval(() => {
      setPromoIndex(prev => (prev + 1) % promoMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [promoMessages.length]);

  const handleGenderSelect = (gender) => {
    setSelectedGender(gender);
    setGenderDropdown(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* TOP BAR - EXACTLY like Namshi */}
      <div className="bg-white border-b h-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-full">
          {/* Language Toggle - Left */}
          <div className="flex items-center gap-2 text-sm">
            <button className="text-red-500 border-b-2 border-red-500 pb-0.5 font-medium">English</button>
            <span className="text-gray-300">|</span>
            <button className="text-gray-600 hover:text-black font-arabic">العربية</button>
          </div>
          
          {/* Promo Carousel - Center */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPromoIndex(prev => (prev - 1 + promoMessages.length) % promoMessages.length)}
              className="p-1 hover:bg-gray-100 rounded text-gray-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-sm text-black min-w-[160px] text-center">
              {promoMessages[promoIndex]?.text}
            </span>
            
            <button 
              onClick={() => setPromoIndex(prev => (prev + 1) % promoMessages.length)}
              className="p-1 hover:bg-gray-100 rounded text-gray-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Region Selector - Right */}
          <div className="relative">
            <button 
              onClick={() => setRegionDropdown(!regionDropdown)}
              className="flex items-center gap-1 text-sm hover:opacity-80"
            >
              <span className="text-lg">{region.flag}</span>
              <ChevronDown className="w-3 h-3 text-gray-600" />
            </button>
            
            {regionDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-white shadow-xl rounded-lg overflow-hidden min-w-[180px] z-50 border">
                {regions.map(r => (
                  <button
                    key={r.code}
                    onClick={() => { setRegion(r); setRegionDropdown(false); }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-gray-100 flex items-center gap-2 text-sm ${region.code === r.code ? 'bg-gray-50 font-medium' : ''}`}
                  >
                    <span>{r.flag}</span>
                    <span>{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN HEADER - WHITE background like Namshi */}
      <div className="bg-white border-b h-[72px]">
        <div className="max-w-7xl mx-auto px-4 flex items-center h-full gap-3">
          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden p-2 text-black"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo - BLACK italic like NAMSHI */}
          <Link to="/tnv" className="shrink-0 mr-4">
            <span className="text-black text-2xl font-black italic tracking-wide">NAMSHI</span>
          </Link>

          {/* Category Tabs with Images - EXACTLY like Namshi */}
          <nav className="hidden lg:flex items-center gap-1 category-dropdown-container">
            {mainTabs.map(cat => (
              <div 
                key={cat.name}
                className="relative"
                onClick={() => cat.hasMegaMenu && setActiveCategory(activeCategory === cat.name ? null : cat.name)}
              >
                <div className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 transition ${activeCategory === cat.name ? 'bg-gray-100' : ''}`}>
                  {/* Category Image Box - Like Namshi */}
                  <div 
                    className="w-11 h-11 rounded overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: cat.bgColor }}
                  >
                    <img 
                      src={cat.image} 
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <span className="text-black text-xs font-medium whitespace-nowrap">
                    {cat.name}
                  </span>
                </div>

                {/* Fashion Dropdown - Gender Selection */}
                {cat.hasMegaMenu && activeCategory === cat.name && (
                  <div className="absolute top-full left-0 pt-2 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl border p-6 min-w-[500px]">
                      <div className="grid grid-cols-2 gap-4">
                        <Link 
                          to="/tnv/women/clothing"
                          onClick={() => setActiveCategory(null)}
                          className="group block"
                        >
                          <div className="relative overflow-hidden rounded-xl bg-[#faf6f3] aspect-[3/4]">
                            <img 
                              src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=500&fit=crop"
                              alt="Women"
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 flex items-start justify-center pt-4">
                              <h3 className="text-2xl font-bold tracking-wide text-black">WOMEN</h3>
                            </div>
                          </div>
                        </Link>
                        
                        <Link 
                          to="/tnv/men/clothing"
                          onClick={() => setActiveCategory(null)}
                          className="group block"
                        >
                          <div className="relative overflow-hidden rounded-xl bg-[#f3f6fa] aspect-[3/4]">
                            <img 
                              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop"
                              alt="Men"
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 flex items-start justify-center pt-4">
                              <h3 className="text-2xl font-bold tracking-wide text-black">MEN</h3>
                            </div>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Search Bar - Like Namshi */}
          <div className="flex-1 hidden md:block max-w-sm mx-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for Guess Bags"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 rounded-full pl-10 pr-4 py-2.5 text-sm placeholder-gray-400 border-0"
              />
            </div>
          </div>

          {/* Action Icons - BLACK icons like Namshi */}
          <div className="flex items-center gap-1 ml-auto">
            <button className="text-black p-2 hover:bg-gray-100 rounded hidden md:flex items-center gap-1">
              <User className="w-5 h-5" />
              <ChevronDown className="w-3 h-3" />
            </button>
            <Link to="/tnv/wishlist" className="text-black p-2 hover:bg-gray-100 rounded relative">
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <Link to="/tnv/cart" className="text-black p-2 hover:bg-gray-100 rounded relative">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* GENDER SELECTOR BAR - WOMEN / MEN dropdown + sub-nav - EXACTLY like Namshi */}
      <div className="bg-white border-b h-11">
        <div className="max-w-7xl mx-auto px-4 flex items-center h-full">
          {/* Gender Dropdown */}
          <div className="relative gender-dropdown-container">
            <button 
              onClick={() => setGenderDropdown(!genderDropdown)}
              className="flex items-center gap-1 pr-4 border-r border-gray-300 font-bold text-sm"
            >
              <span>{selectedGender}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${genderDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Gender Dropdown Menu */}
            {genderDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white shadow-xl rounded-lg border overflow-hidden z-50 min-w-[120px]">
                <button 
                  onClick={() => handleGenderSelect('WOMEN')}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 ${selectedGender === 'WOMEN' ? 'bg-gray-50 font-bold' : ''}`}
                >
                  WOMEN
                </button>
                <button 
                  onClick={() => handleGenderSelect('MEN')}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 ${selectedGender === 'MEN' ? 'bg-gray-50 font-bold' : ''}`}
                >
                  MEN
                </button>
              </div>
            )}
          </div>
          
          {/* Sub-nav Links */}
          <nav className="flex items-center gap-6 ml-4 overflow-x-auto">
            {subNavList.map(item => (
              <Link
                key={item.id || item.name}
                to={item.path || `/tnv/${selectedGender.toLowerCase()}/${item.name.toLowerCase().replace(' ', '-')}`}
                className={`text-xs font-medium whitespace-nowrap py-2 hover:text-black transition ${item.highlight ? 'text-red-500' : 'text-gray-600'}`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b max-h-[70vh] overflow-y-auto">
          <nav className="py-2">
            {mainTabs.filter(c => c.active !== false).map(cat => (
              <div key={cat.name}>
                <Link
                  to={`/tnv${cat.path}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    {cat.icon && (
                      <span 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: cat.bgColor || '#f5f5f5' }}
                      >
                        {cat.icon.value || cat.icon || '📁'}
                      </span>
                    )}
                    <span className={`font-medium ${cat.highlight ? 'text-red-500' : ''}`}>{cat.name}</span>
                  </div>
                </Link>
              </div>
            ))}
            
            <div className="border-t mt-2 pt-2">
              <Link to="/tnv/account" className="flex items-center px-4 py-3 hover:bg-gray-50">
                <User className="w-5 h-5 mr-3" />
                <span>My Account</span>
              </Link>
              <Link to="/tnv/orders" className="flex items-center px-4 py-3 hover:bg-gray-50">
                <ShoppingBag className="w-5 h-5 mr-3" />
                <span>Track Order</span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

// Footer Component
export const TNVFooter = () => {
  const { regions } = useStore();

  const footerLinks = [
    { title: 'About Us', links: ['About Us', 'Privacy Policy', 'Consumer Rights'] },
    { title: 'Top Brands', links: ['Nike', 'New Balance', 'Adidas', 'Guess', 'Tommy Hilfiger', 'All Brands'] },
    { title: 'Women Fashion', links: ['Clothing', 'Shoes', 'Accessories', 'Bags', 'Sports', 'Sale'] },
    { title: 'Men Fashion', links: ['New In', 'Clothing', 'Shoes', 'Bags', 'Accessories', 'Sale'] }
  ];

  return (
    <footer className="bg-white border-t mt-12">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {footerLinks.map((section, idx) => (
            <div key={idx}>
              <h4 className="font-bold text-sm mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-sm text-gray-600 hover:text-black">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          {/* Ship To */}
          <div>
            <h4 className="font-bold text-sm mb-4">Ship To</h4>
            <div className="grid grid-cols-2 gap-2">
              {regions.slice(0, 6).map(r => (
                <span key={r.code} className="text-sm text-gray-600 flex items-center space-x-1">
                  <span>{r.flag}</span>
                  <span>{r.code}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Shop on the go */}
          <div>
            <h4 className="font-bold text-sm mb-4">Shop on the go</h4>
            <div className="flex flex-col space-y-2">
              <button className="bg-black text-white px-3 py-2 rounded-lg text-xs flex items-center space-x-2">
                <span>🍎</span>
                <span>App Store</span>
              </button>
              <button className="bg-black text-white px-3 py-2 rounded-lg text-xs flex items-center space-x-2">
                <span>▶️</span>
                <span>Google Play</span>
              </button>
            </div>
          </div>
        </div>

        {/* Social + Payment */}
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <span className="text-sm text-gray-500">Follow Us</span>
            {['F', 'I', 'T', 'Y'].map((social, idx) => (
              <a key={idx} href="#" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                <span className="text-xs font-bold">{social}</span>
              </a>
            ))}
          </div>
          
          <div className="flex items-center space-x-3">
            {['Mastercard', 'Visa', 'COD', 'Tabby', 'Apple Pay'].map(method => (
              <span key={method} className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">{method}</span>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center mt-8 pt-4 border-t">
          <p className="text-sm text-gray-500">©2025 TNV COLLECTION. ALL RIGHTS RESERVED</p>
        </div>
      </div>
    </footer>
  );
};

export default TNVStoreProvider;
