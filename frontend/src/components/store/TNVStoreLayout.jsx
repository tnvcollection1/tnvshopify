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
  { code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: 'Rs', rate: 278.50, flag: '🇵🇰' },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', rate: 83.12, flag: '🇮🇳' },
];

export const TNVStoreProvider = ({ children, storeName = 'tnvcollection' }) => {
  const [region, setRegion] = useState(REGIONS[0]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [navConfig, setNavConfig] = useState(null);

  useEffect(() => {
    const savedRegion = localStorage.getItem('tnv_region');
    const savedCart = localStorage.getItem('tnv_cart');
    const savedWishlist = localStorage.getItem('tnv_wishlist');
    
    if (savedRegion) setRegion(JSON.parse(savedRegion));
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedWishlist) setWishlist(JSON.parse(savedWishlist));

    if (!savedRegion) detectRegion();
    fetchNavConfig();
  }, []);

  useEffect(() => { localStorage.setItem('tnv_region', JSON.stringify(region)); }, [region]);
  useEffect(() => { localStorage.setItem('tnv_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('tnv_wishlist', JSON.stringify(wishlist)); }, [wishlist]);

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

  const formatPrice = (price) => {
    const baseRate = 83.12;
    const converted = (parseFloat(price) / baseRate) * region.rate;
    if (region.rate < 1) return `${region.symbol} ${converted.toFixed(3)}`;
    return `${region.symbol} ${Math.round(converted).toLocaleString()}`;
  };

  return (
    <StoreContext.Provider value={{
      storeName, region, setRegion, regions: REGIONS, cart, addToCart, removeFromCart,
      updateCartQuantity, cartTotal, cartCount, wishlist, toggleWishlist, isInWishlist,
      user, setUser, searchQuery, setSearchQuery, formatPrice, API_URL, navConfig
    }}>
      {children}
    </StoreContext.Provider>
  );
};

// Namshi-style Header with Mega Menu
export const TNVHeader = () => {
  const { region, setRegion, regions, cartCount, wishlist, searchQuery, setSearchQuery, navConfig } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [regionDropdown, setRegionDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [promoIndex, setPromoIndex] = useState(0);
  const location = useLocation();

  // Get config from backend or use defaults
  const logo = navConfig?.logo || { text: 'TNV', badge: 'COLLECTION', badgeColor: '#FF6B9D' };
  const promoMessages = navConfig?.promoMessages || [
    { text: 'Cash On Delivery', icon: '💵' },
    { text: 'Free Delivery and Exchange', icon: '🚚' },
    { text: '100% Genuine Products', icon: '✓' },
    { text: 'Easy Returns', icon: '↩️' },
  ];
  const categories = navConfig?.categories || [
    { name: 'WOMEN', path: '/women', subNav: ['CLOTHING', 'SHOES', 'ACCESSORIES', 'BAGS', 'SPORTS', 'NEW ARRIVALS', 'PREMIUM', 'SALE', 'BRANDS'] },
    { name: 'MEN', path: '/men', subNav: ['CLOTHING', 'SHOES', 'ACCESSORIES', 'BAGS', 'SPORTS', 'NEW ARRIVALS', 'PREMIUM', 'SALE', 'BRANDS'] },
    { name: 'KIDS', path: '/kids' },
    { name: 'Beauty', path: '/beauty' },
    { name: 'Home', path: '/home' },
  ];
  const megaMenu = navConfig?.megaMenu || {};

  // Auto-rotate promo messages
  useEffect(() => {
    const interval = setInterval(() => {
      setPromoIndex(prev => (prev + 1) % promoMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [promoMessages.length]);

  // Get current category from URL
  const getCurrentCategory = () => {
    const path = location.pathname.replace('/tnv', '');
    if (path.startsWith('/women')) return 'WOMEN';
    if (path.startsWith('/men')) return 'MEN';
    if (path.startsWith('/kids')) return 'KIDS';
    return null;
  };

  const currentCategory = getCurrentCategory();
  const currentCategoryConfig = categories.find(c => c.name === currentCategory);

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* TOP BAR - Promo Carousel + Language (Height: 36px) */}
      <div className="bg-[#1a1a1a] text-white h-9">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-full">
          {/* Language Toggle */}
          <div className="flex items-center space-x-2 text-[13px]">
            <button className="font-medium hover:text-gray-300">English</button>
            <span className="text-gray-500">|</span>
            <button className="hover:text-gray-300 font-arabic">العربية</button>
          </div>
          
          {/* Rotating Promo Messages */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setPromoIndex(prev => (prev - 1 + promoMessages.length) % promoMessages.length)}
              className="p-1 hover:bg-white/10 rounded"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            
            <div className="flex items-center space-x-2 min-w-[200px] justify-center">
              <span className="text-base">{promoMessages[promoIndex]?.icon}</span>
              <span className="text-[13px] font-medium whitespace-nowrap">
                {promoMessages[promoIndex]?.text}
              </span>
            </div>
            
            <button 
              onClick={() => setPromoIndex(prev => (prev + 1) % promoMessages.length)}
              className="p-1 hover:bg-white/10 rounded"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {/* Region Selector */}
          <div className="relative">
            <button 
              onClick={() => setRegionDropdown(!regionDropdown)}
              className="flex items-center space-x-1.5 text-[13px] hover:text-gray-300"
            >
              <span className="text-base">{region.flag}</span>
              <span>{region.code}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {regionDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-white text-black shadow-xl rounded-lg overflow-hidden min-w-[180px] z-50 border">
                {regions.map(r => (
                  <button
                    key={r.code}
                    onClick={() => { setRegion(r); setRegionDropdown(false); }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-gray-100 flex items-center space-x-2 text-sm ${region.code === r.code ? 'bg-gray-50 font-medium' : ''}`}
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

      {/* MAIN HEADER (Height: 64px) */}
      <div className="border-b h-16">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-full">
          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden p-2 -ml-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo */}
          <Link to="/tnv" className="flex items-center space-x-2">
            {logo.image ? (
              <img src={logo.image} alt={logo.text} style={{ height: logo.height || 32 }} />
            ) : (
              <>
                <span className="text-2xl font-black tracking-tight text-black">{logo.text}</span>
                {logo.badge && (
                  <span 
                    className="hidden sm:flex items-center text-white px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: `linear-gradient(135deg, ${logo.badgeColor || '#FF6B9D'}, ${logo.badgeColor || '#FF6B9D'}90)` }}
                  >
                    {logo.badge}
                  </span>
                )}
              </>
            )}
          </Link>

          {/* Main Category Tabs - Desktop */}
          <nav className="hidden lg:flex items-center space-x-1">
            {categories.filter(c => c.active !== false).map(cat => {
              // Fashion categories (WOMEN, MEN) show gender selection dropdown on click
              const isFashionCategory = ['WOMEN', 'MEN', 'FASHION'].includes(cat.name.toUpperCase());
              
              return (
                <div 
                  key={cat.name}
                  className="relative"
                  onMouseEnter={() => !isFashionCategory && setActiveCategory(cat.name)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  {isFashionCategory ? (
                    // Fashion category - shows dropdown on click
                    <button
                      onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full hover:bg-gray-100 transition ${activeCategory === cat.name ? 'bg-gray-100' : ''}`}
                    >
                      {cat.icon && (
                        <span 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                          style={{ backgroundColor: cat.bgColor || '#f5f5f5' }}
                        >
                          {cat.icon.value || cat.icon}
                        </span>
                      )}
                      <span className={`text-[13px] font-medium ${cat.highlight ? 'text-red-500' : 'text-gray-700'}`}>
                        {cat.name}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${activeCategory === cat.name ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    // Non-fashion category - direct link
                    <Link
                      to={`/tnv${cat.path}`}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full hover:bg-gray-100 transition ${currentCategory === cat.name ? 'bg-gray-100' : ''}`}
                    >
                      {cat.icon && (
                        <span 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                          style={{ backgroundColor: cat.bgColor || '#f5f5f5' }}
                        >
                          {cat.icon.value || cat.icon}
                        </span>
                      )}
                      <span className={`text-[13px] font-medium ${cat.highlight ? 'text-red-500' : 'text-gray-700'}`}>
                        {cat.name}
                      </span>
                    </Link>
                  )}

                  {/* Gender Selection Dropdown (for WOMEN/MEN/FASHION) */}
                  {isFashionCategory && activeCategory === cat.name && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                      <div className="bg-white rounded-2xl shadow-2xl border p-6 min-w-[500px]">
                        <div className="grid grid-cols-2 gap-4">
                          {/* WOMEN Card */}
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
                                <h3 className="text-2xl font-bold tracking-wide">WOMEN</h3>
                              </div>
                            </div>
                          </Link>
                          
                          {/* MEN Card */}
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
                                <h3 className="text-2xl font-bold tracking-wide">MEN</h3>
                              </div>
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mega Menu Dropdown (for non-fashion categories with mega menu) */}
                  {!isFashionCategory && activeCategory === cat.name && megaMenu[cat.name] && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                      <div className="bg-white rounded-xl shadow-2xl border p-8 min-w-[800px]">
                        <div className="flex gap-12">
                          {/* Menu Columns */}
                          {megaMenu[cat.name].columns?.map((column, idx) => (
                            <div key={idx} className="min-w-[160px]">
                              <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase">
                                {column.title}
                              </h4>
                              <ul className="space-y-2">
                                {column.items?.map((item, i) => (
                                  <li key={i}>
                                    <Link 
                                      to={`/tnv${item.path}`}
                                      className="text-sm text-gray-600 hover:text-black hover:underline"
                                    >
                                      {item.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          
                          {/* Featured Image */}
                          {megaMenu[cat.name].featuredImage && (
                            <div className="min-w-[200px]">
                              <Link to={megaMenu[cat.name].featuredLink || '#'}>
                                <img 
                                  src={megaMenu[cat.name].featuredImage} 
                                  alt={megaMenu[cat.name].featuredTitle}
                                  className="w-full h-64 object-cover rounded-lg"
                                />
                                <p className="text-sm font-medium mt-2 text-center">
                                  {megaMenu[cat.name].featuredTitle}
                                </p>
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Search + Icons */}
          <div className="flex items-center space-x-2">
            {/* Search Bar - Desktop */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for Trench Coats"
                  className="w-64 pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            
            {/* Mobile Search */}
            <button className="md:hidden p-2" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="w-5 h-5" />
            </button>

            {/* User */}
            <Link to="/tnv/account" className="p-2.5 hover:bg-gray-100 rounded-full">
              <User className="w-5 h-5" />
            </Link>
            
            {/* Wishlist */}
            <Link to="/tnv/wishlist" className="relative p-2.5 hover:bg-gray-100 rounded-full">
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {wishlist.length}
                </span>
              )}
            </Link>
            
            {/* Cart */}
            <Link to="/tnv/cart" className="relative p-2.5 hover:bg-gray-100 rounded-full">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-black text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* SECONDARY NAV - Sub Categories (Height: 48px) */}
      {currentCategoryConfig?.subNav && (
        <div className="hidden lg:block bg-white border-b h-12">
          <div className="max-w-7xl mx-auto px-4 h-full">
            <nav className="flex items-center space-x-8 h-full overflow-x-auto">
              {currentCategoryConfig.subNav.map((item, idx) => (
                <Link
                  key={idx}
                  to={`/tnv${currentCategoryConfig.path}/${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`text-[13px] font-medium uppercase whitespace-nowrap hover:text-black transition ${
                    item === 'SALE' ? 'text-red-500' : 'text-gray-600'
                  }`}
                >
                  {item}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="md:hidden px-4 py-3 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for brands, products..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b max-h-[70vh] overflow-y-auto">
          <nav className="py-2">
            {categories.filter(c => c.active !== false).map(cat => (
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
                        {cat.icon.value || cat.icon}
                      </span>
                    )}
                    <span className={`font-medium ${cat.highlight ? 'text-red-500' : ''}`}>{cat.name}</span>
                  </div>
                  {cat.subNav && <ChevronRight className="w-5 h-5 text-gray-400" />}
                </Link>
                
                {/* Sub nav items */}
                {cat.subNav && (
                  <div className="bg-gray-50 px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      {cat.subNav.slice(0, 6).map((item, idx) => (
                        <Link
                          key={idx}
                          to={`/tnv${cat.path}/${item.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`text-xs px-3 py-1.5 rounded-full ${
                            item === 'SALE' ? 'bg-red-100 text-red-600' : 'bg-white text-gray-600'
                          }`}
                        >
                          {item}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
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
