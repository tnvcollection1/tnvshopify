import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, Search, Menu, X, Heart, User, ChevronDown, 
  MapPin, Phone, Mail, Instagram, Facebook, ArrowRight 
} from 'lucide-react';
import { toast } from 'sonner';
import { detectStore, getStoreConfig } from './config/storeConfig';

const API = process.env.REACT_APP_BACKEND_URL;

// ===================== CONTEXTS =====================

// Store Context
const StoreContext = createContext();
export const useStore = () => useContext(StoreContext);

// Cart Context
const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children, storeConfig }) => {
  const storageKey = `cart_${storeConfig?.id || 'default'}`;
  
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, storageKey]);

  const addToCart = (product, variant, quantity = 1) => {
    const productId = product.shopify_product_id || product.id;
    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.productId === productId && item.variantId === variant.id
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      
      return [...prev, {
        productId,
        variantId: variant.id,
        title: product.title,
        variantTitle: variant.title,
        price: parseFloat(variant.price),
        image: product.images?.[0]?.src || product.image_url || product.image,
        quantity,
        sku: variant.sku
      }];
    });
    toast.success('Added to bag');
  };

  const removeFromCart = (variantId) => {
    setCart(prev => prev.filter(item => item.variantId !== variantId));
  };

  const updateQuantity = (variantId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.variantId === variantId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, removeFromCart, updateQuantity, 
      clearCart, cartTotal, cartCount, storeConfig 
    }}>
      {children}
    </CartContext.Provider>
  );
};

// ===================== HEADER COMPONENT =====================

const LuxuryHeader = ({ storeConfig }) => {
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const storeSlug = storeConfig?.id || 'tnvcollection';
  const basePath = `/store/${storeSlug}`;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = [
    { name: 'New In', path: `${basePath}/products?collection=new` },
    { name: 'Women', path: `${basePath}/products?category=women` },
    { name: 'Men', path: `${basePath}/products?category=men` },
    { name: 'Accessories', path: `${basePath}/products?category=accessories` },
    { name: 'Sale', path: `${basePath}/products?collection=sale`, highlight: true },
  ];

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-black text-white text-xs tracking-wider py-2.5 text-center">
        <span className="hidden sm:inline">{storeConfig?.shippingMessage} | </span>
        <span>Use code: <strong>{storeConfig?.promoCode}</strong> for 10% off</span>
      </div>

      {/* Main Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
      }`}>
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Mobile Menu */}
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition"
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Logo */}
            <Link 
              to={basePath} 
              className="absolute left-1/2 -translate-x-1/2 lg:relative lg:left-0 lg:translate-x-0"
            >
              <h1 className="text-xl lg:text-2xl font-light tracking-[0.3em] uppercase">
                {storeConfig?.name || 'TNC'}
              </h1>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              {categories.map((cat) => (
                <Link
                  key={cat.path}
                  to={cat.path}
                  className={`text-[13px] tracking-wider uppercase transition-colors ${
                    cat.highlight 
                      ? 'text-red-600 hover:text-red-700' 
                      : 'text-gray-800 hover:text-black'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1 lg:gap-2">
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                aria-label="Search"
              >
                <Search className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <button 
                className="p-2 hover:bg-gray-100 rounded-full transition hidden sm:flex"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <button 
                className="p-2 hover:bg-gray-100 rounded-full transition hidden sm:flex"
                aria-label="Account"
              >
                <User className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <button 
                onClick={() => navigate(`${basePath}/cart`)}
                className="p-2 hover:bg-gray-100 rounded-full transition relative"
                aria-label="Shopping Bag"
              >
                <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-black text-white text-[10px] rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search Overlay */}
        {searchOpen && (
          <div className="absolute inset-x-0 top-full bg-white border-t border-gray-100 shadow-lg">
            <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Search for products..."
                    className="w-full pl-8 pr-4 py-3 text-lg border-b-2 border-black focus:outline-none placeholder:text-gray-400"
                    autoFocus
                  />
                </div>
                <button 
                  onClick={() => setSearchOpen(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu Overlay */}
        {menuOpen && (
          <div className="lg:hidden fixed inset-0 top-[calc(2.5rem+4rem)] bg-white z-40 overflow-y-auto">
            <nav className="max-w-[1440px] mx-auto px-4 py-6">
              {categories.map((cat) => (
                <Link
                  key={cat.path}
                  to={cat.path}
                  onClick={() => setMenuOpen(false)}
                  className={`block py-4 text-lg tracking-wider uppercase border-b border-gray-100 ${
                    cat.highlight ? 'text-red-600' : 'text-gray-800'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
              <div className="mt-8 space-y-4">
                <Link 
                  to={`${basePath}/track`} 
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-sm text-gray-600"
                >
                  Track Order
                </Link>
                <Link 
                  to="#" 
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-sm text-gray-600"
                >
                  Contact Us
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

// ===================== FOOTER COMPONENT =====================

const LuxuryFooter = ({ storeConfig }) => {
  const storeSlug = storeConfig?.id || 'tnvcollection';
  const basePath = `/store/${storeSlug}`;
  
  return (
    <footer className="bg-[#1a1a1a] text-white">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-12 lg:py-16">
          <div className="max-w-xl mx-auto text-center">
            <h3 className="text-2xl font-light tracking-wider mb-3">Stay Updated</h3>
            <p className="text-gray-400 text-sm mb-6">
              Subscribe to receive updates on new arrivals and exclusive offers
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-none text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40"
              />
              <button 
                type="submit"
                className="px-6 py-3 bg-white text-black text-sm tracking-wider uppercase hover:bg-gray-200 transition"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <h4 className="text-xl font-light tracking-[0.2em] uppercase mb-4">
              {storeConfig?.name}
            </h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Curated collection of premium fashion and accessories. 
              Quality craftsmanship meets contemporary design.
            </p>
            <div className="flex gap-4">
              {storeConfig?.social?.instagram && (
                <a 
                  href={storeConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/10 transition"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {storeConfig?.social?.facebook && (
                <a 
                  href={storeConfig.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/10 transition"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h5 className="text-sm tracking-wider uppercase mb-4">Shop</h5>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to={`${basePath}/products?collection=new`} className="hover:text-white transition">New Arrivals</Link></li>
              <li><Link to={`${basePath}/products?category=women`} className="hover:text-white transition">Women</Link></li>
              <li><Link to={`${basePath}/products?category=men`} className="hover:text-white transition">Men</Link></li>
              <li><Link to={`${basePath}/products?collection=sale`} className="hover:text-white transition">Sale</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h5 className="text-sm tracking-wider uppercase mb-4">Help</h5>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to={`${basePath}/track`} className="hover:text-white transition">Track Order</Link></li>
              <li><a href="#" className="hover:text-white transition">Shipping & Returns</a></li>
              <li><a href="#" className="hover:text-white transition">Size Guide</a></li>
              <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="text-sm tracking-wider uppercase mb-4">Contact</h5>
            <ul className="space-y-3 text-sm text-gray-400">
              {storeConfig?.contact?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${storeConfig.contact.email}`} className="hover:text-white transition">
                    {storeConfig.contact.email}
                  </a>
                </li>
              )}
              {storeConfig?.contact?.whatsapp && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <a href={`https://wa.me/${storeConfig.contact.whatsapp.replace(/[^0-9]/g, '')}`} className="hover:text-white transition">
                    WhatsApp
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{storeConfig?.country}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} {storeConfig?.name}. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition">Privacy Policy</a>
              <a href="#" className="hover:text-white transition">Terms of Service</a>
              <span>Powered by Wamerce</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ===================== MAIN LAYOUT =====================

export const LuxuryStorefrontLayout = ({ children }) => {
  const { storeSlug } = useParams();
  
  // Compute store config directly instead of using effect + state
  const storeConfig = storeSlug 
    ? getStoreConfig(storeSlug)
    : detectStore();

  if (!storeConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <StoreContext.Provider value={storeConfig}>
      <CartProvider storeConfig={storeConfig}>
        <div className="min-h-screen flex flex-col bg-white">
          <LuxuryHeader storeConfig={storeConfig} />
          <main className="flex-1">
            {children}
          </main>
          <LuxuryFooter storeConfig={storeConfig} />
        </div>
      </CartProvider>
    </StoreContext.Provider>
  );
};

export default LuxuryStorefrontLayout;
