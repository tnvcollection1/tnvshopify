import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Search, User, ShoppingBag, Heart, ChevronLeft, ChevronRight, MapPin, Gift, Menu, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Store configurations
const STORE_CONFIGS = {
  tnvcollection: {
    name: 'TNV Collection',
    subdomain: 'tnvcollection',
    currency: 'INR',
    currencySymbol: '₹',
    region: 'India',
    country: 'IN'
  },
  tnvcollectionpk: {
    name: 'TNV Collection', 
    subdomain: 'tnvcollectionpk',
    currency: 'PKR',
    currencySymbol: 'Rs.',
    region: 'Pakistan',
    country: 'PK'
  }
};

const StorefrontPreview = () => {
  const { storeSlug } = useParams();
  const location = useLocation();
  const [storeConfig, setStoreConfig] = useState(null);
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Extract store name from URL path
  const getStoreName = () => {
    const path = location.pathname;
    if (path.includes('tnvcollectionpkpreview')) return 'tnvcollectionpk';
    if (path.includes('tnvcollectionpreview')) return 'tnvcollection';
    return storeSlug?.replace('preview', '') || 'tnvcollectionpk';
  };

  const storeName = getStoreName();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const config = STORE_CONFIGS[storeName] || STORE_CONFIGS.tnvcollectionpk;
    setStoreConfig(config);
    fetchStoreData(storeName);
  }, [storeName]);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [banners]);

  const fetchStoreData = async (store) => {
    try {
      setLoading(true);
      const [bannersRes, productsRes, collectionsRes] = await Promise.all([
        fetch(`${API_URL}/api/storefront/banners?store=${store}`),
        fetch(`${API_URL}/api/storefront/products?store=${store}&limit=12`),
        fetch(`${API_URL}/api/storefront/collections?store=${store}&limit=8`)
      ]);

      const bannersData = await bannersRes.json();
      const productsData = await productsRes.json();
      const collectionsData = await collectionsRes.json();

      setBanners(bannersData.banners || []);
      setProducts(productsData.products || []);
      setCollections(collectionsData.collections || []);
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!storeConfig) return price;
    const num = parseFloat(price);
    return `${storeConfig.currencySymbol}${num.toLocaleString()}`;
  };

  const nextBanner = () => setCurrentBanner(prev => (prev + 1) % banners.length);
  const prevBanner = () => setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm tracking-widest text-gray-500">LOADING</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* Preview Mode Banner */}
      <div className="bg-amber-400 text-black text-center py-1.5 text-[10px] tracking-wider font-medium">
        PREVIEW MODE — {storeConfig?.name} ({storeConfig?.region}) — Changes reflect before VPS deployment
      </div>

      {/* Top Utility Bar - MR PORTER Style */}
      <div className="bg-black text-white">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-10">
            {/* Left - Location */}
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-1.5 text-[11px] tracking-wide hover:text-gray-300 transition">
                <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>SHIP TO: {storeConfig?.country}</span>
              </button>
            </div>

            {/* Center - Promo */}
            <div className="hidden md:block text-center">
              <p className="text-[11px] tracking-[0.15em]">FREE SHIPPING ON ORDERS OVER {storeConfig?.currencySymbol}5,000</p>
            </div>

            {/* Right - Utilities */}
            <div className="flex items-center space-x-5">
              <a href="#" className="text-[11px] tracking-wide hover:text-gray-300 transition hidden sm:block">HELP</a>
              <a href="#" className="text-[11px] tracking-wide hover:text-gray-300 transition hidden sm:block">CONTACT</a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header - MR PORTER Style */}
      <header className={`sticky top-0 z-50 bg-white transition-all duration-300 ${isScrolled ? 'shadow-sm' : ''}`}>
        {/* Top Header Row - Icons */}
        <div className="border-b border-gray-100">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              {/* Left Icons */}
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden hover:text-gray-600 transition"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
                </button>
                <button 
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="flex items-center space-x-2 hover:text-gray-600 transition"
                >
                  <Search className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-[11px] tracking-wide hidden sm:inline">SEARCH</span>
                </button>
              </div>

              {/* Center Logo */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <a href="#" className="block">
                  <h1 className="text-xl md:text-2xl tracking-[0.4em] font-light text-black">TNV</h1>
                </a>
              </div>

              {/* Right Icons */}
              <div className="flex items-center space-x-5">
                <button className="flex items-center space-x-2 hover:text-gray-600 transition hidden sm:flex">
                  <Gift className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-[11px] tracking-wide">REWARDS</span>
                </button>
                <button className="flex items-center space-x-2 hover:text-gray-600 transition">
                  <Heart className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-[11px] tracking-wide hidden sm:inline">WISHLIST</span>
                </button>
                <button className="flex items-center space-x-2 hover:text-gray-600 transition">
                  <User className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-[11px] tracking-wide hidden sm:inline">ACCOUNT</span>
                </button>
                <button className="flex items-center space-x-2 hover:text-gray-600 transition relative">
                  <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-[11px] tracking-wide hidden sm:inline">BAG (0)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Row */}
        <nav className="hidden lg:block border-b border-gray-200">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex items-center justify-center space-x-10 h-12">
              <a href="#" className="text-[11px] tracking-[0.15em] font-medium hover:text-gray-600 transition relative group">
                WHAT'S NEW
                <span className="absolute -bottom-[13px] left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </a>
              <a href="#" className="text-[11px] tracking-[0.15em] font-medium hover:text-gray-600 transition relative group">
                DESIGNERS
                <span className="absolute -bottom-[13px] left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </a>
              <a href="#" className="text-[11px] tracking-[0.15em] font-medium hover:text-gray-600 transition relative group">
                CLOTHING
                <span className="absolute -bottom-[13px] left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </a>
              <a href="#" className="text-[11px] tracking-[0.15em] font-medium hover:text-gray-600 transition relative group">
                SHOES
                <span className="absolute -bottom-[13px] left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </a>
              <a href="#" className="text-[11px] tracking-[0.15em] font-medium hover:text-gray-600 transition relative group">
                BAGS
                <span className="absolute -bottom-[13px] left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </a>
              <a href="#" className="text-[11px] tracking-[0.15em] font-medium hover:text-gray-600 transition relative group">
                ACCESSORIES
                <span className="absolute -bottom-[13px] left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </a>
              <a href="#" className="text-[11px] tracking-[0.15em] font-medium hover:text-gray-600 transition relative group">
                WATCHES
                <span className="absolute -bottom-[13px] left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </a>
              <a href="#" className="text-[11px] tracking-[0.15em] font-medium hover:text-gray-600 transition relative group">
                SPORT
                <span className="absolute -bottom-[13px] left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </a>
              <a href="#" className="text-[11px] tracking-[0.15em] font-medium text-red-600 hover:text-red-700 transition relative group">
                SALE
                <span className="absolute -bottom-[13px] left-0 w-full h-0.5 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </a>
            </div>
          </div>
        </nav>

        {/* Search Overlay */}
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            <div className="max-w-[800px] mx-auto px-4 py-6">
              <div className="flex items-center border-b-2 border-black">
                <Search className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search for products, brands and more..."
                  className="flex-1 px-4 py-3 text-lg focus:outline-none"
                  autoFocus
                />
                <button onClick={() => setSearchOpen(false)} className="text-gray-400 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500 tracking-wide">POPULAR SEARCHES</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Loafers', 'Sneakers', 'Bags', 'Boots', 'Formal Shoes'].map(term => (
                    <button key={term} className="px-3 py-1 bg-gray-100 text-sm hover:bg-gray-200 transition">
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            <div className="py-4">
              {['WHAT\'S NEW', 'DESIGNERS', 'CLOTHING', 'SHOES', 'BAGS', 'ACCESSORIES', 'WATCHES', 'SPORT'].map(item => (
                <a key={item} href="#" className="block px-6 py-3 text-sm tracking-wide hover:bg-gray-50">
                  {item}
                </a>
              ))}
              <a href="#" className="block px-6 py-3 text-sm tracking-wide text-red-600 hover:bg-gray-50">SALE</a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Banner - MR PORTER Style */}
      {banners.length > 0 && (
        <section className="relative">
          <div className="relative h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden">
            {banners.map((banner, idx) => (
              <div
                key={banner.id || idx}
                className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentBanner ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              >
                <img
                  src={banner.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop'}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-end justify-center pb-20">
                  <div className="text-center text-white max-w-2xl px-4">
                    <p className="text-[11px] tracking-[0.4em] mb-4 opacity-90">{banner.subtitle || 'THE COLLECTION'}</p>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-wide mb-4">{banner.title}</h2>
                    <p className="text-sm tracking-wide mb-8 opacity-90 max-w-md mx-auto">{banner.description || 'Discover our latest arrivals'}</p>
                    <button className="bg-white text-black px-12 py-4 text-[11px] tracking-[0.2em] font-medium hover:bg-gray-100 transition-colors">
                      {banner.button_text || 'SHOP NOW'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Navigation Arrows */}
            {banners.length > 1 && (
              <>
                <button 
                  onClick={prevBanner}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={nextBanner}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Dots */}
            {banners.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBanner(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${idx === currentBanner ? 'bg-white' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* What's New Section - MR PORTER Style */}
      <section className="py-16 border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-light tracking-wide">What's New Today</h2>
              <p className="text-sm text-gray-500 mt-1 tracking-wide">Discover what just landed at TNV Collection</p>
            </div>
            <a href="#" className="text-[11px] tracking-[0.15em] font-medium hover:text-gray-600 transition border-b border-black pb-0.5">
              SHOP ALL NEW
            </a>
          </div>

          {/* Products Horizontal Scroll */}
          <div className="relative">
            <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {products.slice(0, 8).map((product, idx) => (
                <div key={product.id || idx} className="flex-shrink-0 w-[280px] group cursor-pointer">
                  <div className="aspect-[3/4] bg-[#f5f5f5] overflow-hidden mb-4 relative">
                    <img
                      src={product.images?.[0]?.src || product.image || 'https://via.placeholder.com/400x500'}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <button className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Heart className="w-5 h-5 text-gray-600 hover:text-black" strokeWidth={1.5} />
                    </button>
                  </div>
                  <p className="text-[10px] tracking-[0.15em] font-medium text-gray-500 mb-1">TNV COLLECTION</p>
                  <h3 className="text-sm font-light leading-snug mb-2 line-clamp-2">{product.title}</h3>
                  <p className="text-sm font-medium">
                    {formatPrice(product.variants?.[0]?.price || product.price || 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid - MR PORTER Style */}
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6">
          <h2 className="text-2xl font-light tracking-wide text-center mb-12">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'SHOES', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=750&fit=crop' },
              { name: 'BAGS', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=750&fit=crop' },
              { name: 'ACCESSORIES', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&h=750&fit=crop' },
              { name: 'NEW ARRIVALS', image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=750&fit=crop' },
            ].map((cat, idx) => (
              <a key={idx} href="#" className="group relative aspect-[4/5] overflow-hidden bg-gray-100">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                <div className="absolute inset-0 flex items-end justify-center pb-8">
                  <span className="text-white text-[11px] tracking-[0.2em] font-medium">{cat.name}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Edit Section */}
      <section className="py-16 bg-[#f8f8f8]">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="aspect-[4/5] bg-gray-200 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=1000&fit=crop"
                alt="Featured"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="py-8 md:py-0 md:px-12">
              <p className="text-[11px] tracking-[0.4em] text-gray-500 mb-4">THE EDIT</p>
              <h2 className="text-3xl md:text-4xl font-light tracking-wide mb-6">Wardrobe Essentials</h2>
              <p className="text-gray-600 leading-relaxed mb-8">
                The pieces we think every man should have. Timeless designs crafted from premium materials, 
                built to last and designed to elevate your everyday style.
              </p>
              <button className="bg-black text-white px-12 py-4 text-[11px] tracking-[0.2em] font-medium hover:bg-gray-900 transition-colors">
                SHOP THE EDIT
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* More Products Grid */}
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6">
          <h2 className="text-2xl font-light tracking-wide text-center mb-12">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
            {products.slice(0, 8).map((product, idx) => (
              <div key={`grid-${product.id || idx}`} className="group cursor-pointer">
                <div className="aspect-[3/4] bg-[#f5f5f5] overflow-hidden mb-4 relative">
                  <img
                    src={product.images?.[0]?.src || product.image || 'https://via.placeholder.com/400x500'}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <button className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart className="w-5 h-5 text-gray-600 hover:text-black" strokeWidth={1.5} />
                  </button>
                </div>
                <p className="text-[10px] tracking-[0.15em] font-medium text-gray-500 mb-1">TNV COLLECTION</p>
                <h3 className="text-sm font-light leading-snug mb-2 line-clamp-2">{product.title}</h3>
                <p className="text-sm font-medium">
                  {formatPrice(product.variants?.[0]?.price || product.price || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-light tracking-wide mb-4">Stay Updated</h2>
          <p className="text-gray-400 text-sm mb-8">Subscribe to receive updates on new arrivals and exclusive offers</p>
          <div className="flex">
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 bg-transparent border border-gray-700 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors"
            />
            <button className="bg-white text-black px-8 py-3 text-[11px] tracking-[0.15em] font-medium hover:bg-gray-100 transition-colors">
              SUBSCRIBE
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-white py-16">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-[11px] tracking-[0.2em] font-medium mb-6">CUSTOMER SERVICE</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Contact Us</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">FAQs</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Shipping Info</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Returns</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] tracking-[0.2em] font-medium mb-6">ABOUT US</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Our Story</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Careers</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] tracking-[0.2em] font-medium mb-6">LEGAL</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Cookie Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] tracking-[0.2em] font-medium mb-6">FOLLOW US</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Instagram</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Facebook</a></li>
                <li><a href="#" className="text-sm text-gray-400 hover:text-white transition">Twitter</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-xl tracking-[0.4em] font-light mb-4 md:mb-0">TNV COLLECTION</p>
            <p className="text-xs text-gray-500">© 2025 TNV Collection. All Rights Reserved.</p>
          </div>
        </div>
      </footer>

      {/* Custom Scrollbar Hide Style */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
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

export default StorefrontPreview;
