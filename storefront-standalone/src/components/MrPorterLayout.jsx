import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, Search, Menu, X, Heart, User, 
  MapPin, Phone, Mail, Instagram, Facebook, ArrowRight,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { detectStore, formatPrice, getApiUrl } from '../config/storeConfig';

const API = import.meta.env.VITE_API_URL || getApiUrl();

// ===================== CONTEXTS =====================
const StoreContext = createContext();
export const useStore = () => useContext(StoreContext);

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children, storeConfig }) => {
  const storageKey = `cart_${storeConfig?.id || 'default'}`;
  
  const [cart, setCart] = useState(() => {
    if (typeof window === 'undefined') return [];
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

// ===================== MR PORTER HEADER =====================
const MrPorterHeader = ({ storeConfig }) => {
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [shopifyMenus, setShopifyMenus] = useState([]);
  const [navigation, setNavigation] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const storeSlug = storeConfig?.id || 'tnvcollectionpk';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setActiveMenu(null);
  }, [location.pathname]);

  // Fetch Shopify menus
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const res = await fetch(`${API}/api/shopify/menus?store_name=${storeSlug}`);
        if (res.ok) {
          const data = await res.json();
          setShopifyMenus(data.menus || []);
          
          // Find main menu
          const mainMenu = data.menus?.find(m => 
            m.handle === 'main-menu' || m.title?.toLowerCase().includes('main')
          );
          
          if (mainMenu && mainMenu.items?.length > 0) {
            // Transform Shopify menu items to navigation format
            const navItems = mainMenu.items.map(item => {
              // Convert Shopify URL to local path
              let path = item.url || '/products';
              if (path.includes('/collections/')) {
                const handle = path.split('/collections/')[1]?.split('?')[0];
                path = `/products?collection=${handle}`;
              } else if (path === '/' || path === '#') {
                path = '/products';
              }
              
              return {
                name: item.title,
                path: path,
                submenu: item.items?.map(sub => sub.title) || [],
                subItems: item.items?.map(sub => {
                  let subPath = sub.url || '/products';
                  if (subPath.includes('/collections/')) {
                    const handle = subPath.split('/collections/')[1]?.split('?')[0];
                    subPath = `/products?collection=${handle}`;
                  }
                  return { name: sub.title, path: subPath };
                }) || []
              };
            });
            
            // Add collections and sale if not present
            if (!navItems.some(n => n.name.toLowerCase() === 'collections')) {
              navItems.splice(1, 0, { 
                name: 'Collections', 
                path: '/collections',
                submenu: ['All Collections', 'Featured', 'Seasonal']
              });
            }
            if (!navItems.some(n => n.name.toLowerCase() === 'sale')) {
              navItems.push({ 
                name: 'Sale', 
                path: '/products?collection=sale',
                highlight: true 
              });
            }
            
            setNavigation(navItems);
          }
        }
      } catch (e) {
        console.error('Failed to fetch menus:', e);
      }
    };
    
    fetchMenus();
  }, [storeSlug]);

  // Default navigation if no Shopify menus
  const defaultNavigation = [
    { 
      name: 'What\'s New', 
      path: '/products?collection=new-arrivals',
      submenu: []
    },
    { 
      name: 'Collections', 
      path: '/collections',
      submenu: ['All Collections', 'Featured', 'Seasonal']
    },
    { 
      name: 'Clothing', 
      path: '/products?category=clothing',
      submenu: []
    },
    { 
      name: 'Shoes', 
      path: '/products?category=shoes',
      submenu: []
    },
    { 
      name: 'Bags', 
      path: '/products?category=bags',
      submenu: []
    },
    { 
      name: 'Accessories', 
      path: '/products?collection=accessories',
      submenu: []
    },
    { 
      name: 'Sale', 
      path: '/products?collection=sale',
      highlight: true 
    },
  ];

  const activeNavigation = navigation.length > 0 ? navigation : defaultNavigation;

  return (
    <>
      {/* Top Bar */}
      <div className="bg-black text-white text-[10px] md:text-xs tracking-[0.1em] py-2 text-center">
        <span>{storeConfig?.shippingMessage || 'FREE SHIPPING ON ORDERS OVER ₹5,000'}</span>
      </div>

      {/* Main Header */}
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white shadow-sm' : 'bg-white'
        }`}
        data-testid="mrporter-header"
      >
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Left - Mobile Menu */}
            <div className="flex items-center gap-2 md:gap-4 w-1/3">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-1.5 hover:bg-gray-100 rounded transition"
                aria-label="Menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-1.5 hover:bg-gray-100 rounded transition hidden md:flex"
                aria-label="Search"
              >
                <Search className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Center - Logo */}
            <Link 
              to="/" 
              className="flex-shrink-0"
              data-testid="header-logo"
            >
              <h1 className="text-lg md:text-xl font-medium tracking-[0.25em] uppercase">
                {storeConfig?.name || 'TNC COLLECTION'}
              </h1>
            </Link>

            {/* Right - Actions */}
            <div className="flex items-center justify-end gap-1 md:gap-3 w-1/3">
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-1.5 hover:bg-gray-100 rounded transition md:hidden"
                aria-label="Search"
              >
                <Search className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <button 
                className="p-1.5 hover:bg-gray-100 rounded transition hidden md:flex"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <button 
                onClick={() => navigate('/cart')}
                className="p-1.5 hover:bg-gray-100 rounded transition relative"
                aria-label="Cart"
                data-testid="cart-button"
              >
                <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-black text-white text-[9px] rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center justify-center gap-8 pb-3 border-b border-gray-100">
            {activeNavigation.map((item) => (
              <div 
                key={item.path}
                className="relative"
                onMouseEnter={() => setActiveMenu(item.name)}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <Link
                  to={item.path}
                  className={`text-[11px] tracking-[0.15em] uppercase py-2 transition-colors ${
                    item.highlight 
                      ? 'text-red-600 hover:text-red-700' 
                      : 'text-black hover:text-gray-600'
                  }`}
                >
                  {item.name}
                </Link>
                
                {/* Dropdown with subItems */}
                {((item.subItems && item.subItems.length > 0) || (item.submenu && item.submenu.length > 0)) && activeMenu === item.name && (
                  <div className="absolute top-full left-0 pt-2 z-50">
                    <div className="bg-white shadow-lg border border-gray-100 py-3 min-w-[200px]">
                      {item.subItems && item.subItems.length > 0 ? (
                        item.subItems.map((sub, idx) => (
                          <Link
                            key={idx}
                            to={sub.path}
                            className="block px-4 py-2 text-xs text-gray-600 hover:text-black hover:bg-gray-50 transition"
                          >
                            {sub.name}
                          </Link>
                        ))
                      ) : (
                        item.submenu?.map((sub, idx) => (
                          <Link
                            key={idx}
                            to={`${item.path}&sub=${encodeURIComponent(sub)}`}
                            className="block px-4 py-2 text-xs text-gray-600 hover:text-black hover:bg-gray-50 transition"
                          >
                            {sub}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Search Overlay */}
        {searchOpen && (
          <div className="absolute inset-x-0 top-full bg-white shadow-lg border-t border-gray-100 z-50">
            <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for products, brands and more..."
                  className="w-full py-3 pl-12 pr-4 text-sm border-b border-gray-300 focus:border-black focus:outline-none transition"
                  autoFocus
                />
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button 
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="lg:hidden fixed inset-0 top-[calc(2rem+3.5rem)] bg-white z-40 overflow-y-auto">
            <nav className="px-4 py-6">
              {navigation.map((item) => (
                <div key={item.path} className="border-b border-gray-100">
                  <Link
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`block py-4 text-sm tracking-[0.1em] uppercase ${
                      item.highlight ? 'text-red-600' : 'text-black'
                    }`}
                  >
                    {item.name}
                  </Link>
                </div>
              ))}
              
              {/* Mobile extras */}
              <div className="mt-8 space-y-4">
                <Link 
                  to="/track"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 text-xs tracking-[0.1em] uppercase text-gray-600"
                >
                  <MapPin className="w-4 h-4" />
                  Track Order
                </Link>
                <a 
                  href={`https://wa.me/${storeConfig?.contact?.whatsapp?.replace(/[^0-9]/g, '')}`}
                  className="flex items-center gap-3 text-xs tracking-[0.1em] uppercase text-gray-600"
                >
                  <Phone className="w-4 h-4" />
                  Contact Us
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

// ===================== MR PORTER FOOTER =====================
const MrPorterFooter = ({ storeConfig }) => {
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (email) {
      toast.success('Thank you for subscribing!');
      setEmail('');
    }
  };

  return (
    <footer className="bg-black text-white" data-testid="mrporter-footer">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-12 md:py-16">
          <div className="max-w-xl mx-auto text-center">
            <h3 className="text-xl md:text-2xl font-light tracking-wide mb-3">
              JOIN OUR NEWSLETTER
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Sign up for exclusive access to new arrivals, promotions and more
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-0">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-transparent border border-white/30 text-white placeholder:text-gray-500 focus:outline-none focus:border-white/60 text-sm"
              />
              <button 
                type="submit"
                className="px-6 py-3 bg-white text-black text-xs tracking-[0.1em] uppercase hover:bg-gray-200 transition"
              >
                SUBSCRIBE
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Shop */}
          <div>
            <h5 className="text-[11px] tracking-[0.15em] uppercase mb-4 md:mb-6">SHOP</h5>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="/products?collection=new" className="hover:text-white transition">What's New</Link></li>
              <li><Link to="/products?category=clothing" className="hover:text-white transition">Clothing</Link></li>
              <li><Link to="/products?category=shoes" className="hover:text-white transition">Shoes</Link></li>
              <li><Link to="/products?category=bags" className="hover:text-white transition">Bags</Link></li>
              <li><Link to="/products?collection=sale" className="hover:text-white transition">Sale</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h5 className="text-[11px] tracking-[0.15em] uppercase mb-4 md:mb-6">HELP</h5>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="/track" className="hover:text-white transition">Track Order</Link></li>
              <li><a href="#" className="hover:text-white transition">Shipping & Delivery</a></li>
              <li><a href="#" className="hover:text-white transition">Returns & Exchanges</a></li>
              <li><a href="#" className="hover:text-white transition">Size Guide</a></li>
              <li><a href="#" className="hover:text-white transition">FAQs</a></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h5 className="text-[11px] tracking-[0.15em] uppercase mb-4 md:mb-6">ABOUT</h5>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition">Our Story</a></li>
              <li><a href="#" className="hover:text-white transition">Sustainability</a></li>
              <li><a href="#" className="hover:text-white transition">Careers</a></li>
              <li><a href="#" className="hover:text-white transition">Press</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="text-[11px] tracking-[0.15em] uppercase mb-4 md:mb-6">CONTACT</h5>
            <ul className="space-y-3 text-sm text-gray-400">
              {storeConfig?.contact?.email && (
                <li>
                  <a href={`mailto:${storeConfig.contact.email}`} className="hover:text-white transition flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Us
                  </a>
                </li>
              )}
              {storeConfig?.contact?.whatsapp && (
                <li>
                  <a 
                    href={`https://wa.me/${storeConfig.contact.whatsapp.replace(/[^0-9]/g, '')}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    WhatsApp
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {storeConfig?.country || 'India'}
              </li>
            </ul>
            
            {/* Social */}
            <div className="flex gap-4 mt-6">
              {storeConfig?.social?.instagram && (
                <a 
                  href={storeConfig.social.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-9 h-9 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/10 transition"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {storeConfig?.social?.facebook && (
                <a 
                  href={storeConfig.social.facebook} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-9 h-9 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/10 transition"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] tracking-[0.1em] text-gray-500">
            <p>© {new Date().getFullYear()} {storeConfig?.name?.toUpperCase() || 'TNC COLLECTION'}. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition">PRIVACY POLICY</a>
              <a href="#" className="hover:text-white transition">TERMS & CONDITIONS</a>
              <a href="#" className="hover:text-white transition">COOKIE POLICY</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ===================== MAIN LAYOUT =====================
export const MrPorterLayout = ({ children }) => {
  const storeConfig = detectStore();

  if (!storeConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-gray-400 text-sm tracking-wider">LOADING...</div>
      </div>
    );
  }

  return (
    <StoreContext.Provider value={storeConfig}>
      <CartProvider storeConfig={storeConfig}>
        <div className="min-h-screen flex flex-col bg-white">
          <MrPorterHeader storeConfig={storeConfig} />
          <main className="flex-1">
            {children}
          </main>
          <MrPorterFooter storeConfig={storeConfig} />
        </div>
      </CartProvider>
    </StoreContext.Provider>
  );
};

export default MrPorterLayout;
