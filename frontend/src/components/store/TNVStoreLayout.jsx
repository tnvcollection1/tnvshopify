import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, User, Heart, ShoppingBag, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

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

  useEffect(() => {
    const savedRegion = localStorage.getItem('tnv_region');
    const savedCart = localStorage.getItem('tnv_cart');
    const savedWishlist = localStorage.getItem('tnv_wishlist');
    
    if (savedRegion) setRegion(JSON.parse(savedRegion));
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedWishlist) setWishlist(JSON.parse(savedWishlist));

    if (!savedRegion) detectRegion();
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
      user, setUser, searchQuery, setSearchQuery, formatPrice, API_URL
    }}>
      {children}
    </StoreContext.Provider>
  );
};

// Namshi-style Header
export const TNVHeader = () => {
  const { region, setRegion, regions, cartCount, wishlist, searchQuery, setSearchQuery } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [regionDropdown, setRegionDropdown] = useState(false);

  // Category tabs with icons like Namshi
  const categories = [
    { name: 'FASHION', icon: '👗', path: '/products', color: '#FF6B9D', bgColor: '#FFE8F0' },
    { name: 'Beauty', icon: '💄', path: '/beauty', color: '#9B59B6', bgColor: '#F3E5F5' },
    { name: 'Baby & Kids', icon: '👶', path: '/kids', color: '#3498DB', bgColor: '#E3F2FD' },
    { name: 'Home & More', icon: '🏠', path: '/home', color: '#27AE60', bgColor: '#E8F5E9' },
    { name: 'PREMIUM', icon: '✨', path: '/premium', color: '#F39C12', bgColor: '#FFF8E1' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* Top Bar - Language & Promo */}
      <div className="bg-[#1a1a1a] text-white">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-9">
          {/* Language Toggle */}
          <div className="flex items-center space-x-3 text-sm">
            <button className="font-medium hover:text-gray-300">English</button>
            <span className="text-gray-500">|</span>
            <button className="hover:text-gray-300">العربية</button>
          </div>
          
          {/* Promo Carousel */}
          <div className="flex items-center space-x-4">
            <ChevronLeft className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" />
            <span className="text-sm font-medium">Cash On Delivery</span>
            <ChevronRight className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" />
          </div>
          
          {/* Region Selector */}
          <div className="relative">
            <button 
              onClick={() => setRegionDropdown(!regionDropdown)}
              className="flex items-center space-x-1 text-sm hover:text-gray-300"
            >
              <span>{region.flag}</span>
              <span>{region.code}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {regionDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-white text-black shadow-xl rounded-lg overflow-hidden min-w-[180px] z-50">
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

      {/* Main Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/tnv" className="flex items-center space-x-3">
              <span className="text-2xl font-black tracking-tight text-black">NAMSHI</span>
              <span className="hidden sm:flex items-center bg-gradient-to-r from-pink-500 to-rose-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                FASHION
              </span>
            </Link>

            {/* Category Tabs */}
            <nav className="hidden lg:flex items-center space-x-1">
              {categories.map(cat => (
                <Link
                  key={cat.name}
                  to={`/tnv${cat.path}`}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full hover:bg-gray-100 transition group"
                >
                  <span 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                    style={{ backgroundColor: cat.bgColor }}
                  >
                    {cat.icon}
                  </span>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-black">{cat.name}</span>
                </Link>
              ))}
            </nav>

            {/* Search + Icons */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for Trench Coats"
                    className="w-64 pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
              
              {/* Mobile Search Toggle */}
              <button className="md:hidden p-2" onClick={() => setSearchOpen(!searchOpen)}>
                <Search className="w-5 h-5" />
              </button>

              {/* User */}
              <Link to="/tnv/account" className="p-2 hover:bg-gray-100 rounded-full">
                <User className="w-5 h-5" />
              </Link>
              
              {/* Wishlist */}
              <Link to="/tnv/wishlist" className="relative p-2 hover:bg-gray-100 rounded-full">
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {wishlist.length}
                  </span>
                )}
              </Link>
              
              {/* Cart */}
              <Link to="/tnv/cart" className="relative p-2 hover:bg-gray-100 rounded-full">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-black text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
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
    </header>
  );
};

// Namshi-style Footer
export const TNVFooter = () => {
  const { regions } = useStore();

  const footerLinks = [
    {
      title: 'About Us',
      links: ['About Us', 'Privacy Policy', 'Consumer Rights']
    },
    {
      title: 'Top Brands',
      links: ['Nike', 'New Balance', 'Adidas', 'Guess', 'Tommy Hilfiger', 'All Brands']
    },
    {
      title: 'Women Fashion',
      links: ['Clothing', 'Shoes', 'Accessories', 'Bags', 'Sports', 'Sale']
    },
    {
      title: 'Men Fashion',
      links: ['New In', 'Clothing', 'Shoes', 'Bags', 'Accessories', 'Sale']
    }
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
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <span>App Store</span>
              </button>
              <button className="bg-black text-white px-3 py-2 rounded-lg text-xs flex items-center space-x-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5.31 0 .61.1.86.28l15.14 8.5c.52.29.52 1.02 0 1.32l-15.14 8.5c-.25.18-.55.28-.86.28-.83 0-1.5-.67-1.5-1.5v-.08z"/>
                </svg>
                <span>Google Play</span>
              </button>
            </div>
          </div>
        </div>

        {/* Social + Payment */}
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <span className="text-sm text-gray-500">Follow Us</span>
            {['facebook', 'instagram', 'twitter', 'youtube'].map(social => (
              <a key={social} href="#" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                <span className="text-xs">{social[0].toUpperCase()}</span>
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
          <p className="text-sm text-gray-500">©2025 NAMSHI. ALL RIGHTS RESERVED</p>
        </div>
      </div>
    </footer>
  );
};

export default TNVStoreProvider;
