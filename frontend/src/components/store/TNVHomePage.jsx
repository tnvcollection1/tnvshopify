import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart, ShoppingBag, Truck, RotateCcw, Shield } from 'lucide-react';
import { useStore } from './TNVStoreLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TNVHomePage = () => {
  const { storeName, formatPrice, toggleWishlist, isInWishlist, addToCart } = useStore();
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    fetchData();
  }, [storeName]);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners]);

  const fetchData = async () => {
    try {
      const [bannersRes, productsRes, collectionsRes] = await Promise.all([
        fetch(`${API_URL}/api/storefront/banners?store=${storeName}`),
        fetch(`${API_URL}/api/storefront/products?store=${storeName}&limit=16`),
        fetch(`${API_URL}/api/storefront/collections?store=${storeName}&limit=10`)
      ]);
      
      const bannersData = await bannersRes.json();
      const productsData = await productsRes.json();
      const collectionsData = await collectionsRes.json();
      
      setBanners(bannersData.banners || []);
      setProducts(productsData.products || []);
      setCollections(collectionsData.collections || []);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const nextBanner = () => setCurrentBanner(prev => (prev + 1) % banners.length);
  const prevBanner = () => setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Categories */}
      <section className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-2">
        {[
          { name: 'Women', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=800&fit=crop', path: '/women' },
          { name: 'Men', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&h=800&fit=crop', path: '/men' },
          { name: 'Kids', image: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=600&h=800&fit=crop', path: '/kids' },
        ].map((cat, idx) => (
          <Link 
            key={cat.name}
            to={`/tnv${cat.path}`}
            className="relative aspect-[3/4] sm:aspect-[4/5] overflow-hidden group"
          >
            <img 
              src={cat.image} 
              alt={cat.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
              <h2 className="text-white text-lg sm:text-2xl font-bold">{cat.name}</h2>
              <span className="text-white/80 text-xs sm:text-sm">Shop Now →</span>
            </div>
          </Link>
        ))}
      </section>

      {/* Features Bar */}
      <section className="bg-gray-50 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Truck, text: 'Free Delivery', sub: 'On orders over AED 200' },
            { icon: RotateCcw, text: 'Easy Returns', sub: '14 days return policy' },
            { icon: Shield, text: '100% Authentic', sub: 'Genuine products' },
            { icon: ShoppingBag, text: 'Cash on Delivery', sub: 'Pay when you receive' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center space-x-3">
              <item.icon className="w-8 h-8 text-gray-600 flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-medium text-sm">{item.text}</p>
                <p className="text-xs text-gray-500 hidden sm:block">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hero Banners */}
      {banners.length > 0 && (
        <section className="relative">
          <div className="relative h-[300px] sm:h-[400px] md:h-[500px] overflow-hidden">
            {banners.map((banner, idx) => (
              <div
                key={banner.id || idx}
                className={`absolute inset-0 transition-opacity duration-700 ${idx === currentBanner ? 'opacity-100' : 'opacity-0'}`}
              >
                <img 
                  src={banner.image || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&h=600&fit=crop'}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
                <div className="absolute inset-0 flex items-center">
                  <div className="max-w-7xl mx-auto px-4 w-full">
                    <div className="max-w-lg">
                      <p className="text-white/80 text-sm mb-2">{banner.subtitle || 'NEW COLLECTION'}</p>
                      <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold mb-4">{banner.title}</h2>
                      <Link 
                        to="/tnv/collection/all"
                        className="inline-block bg-white text-black px-6 py-3 font-medium hover:bg-gray-100 transition"
                      >
                        Shop Now
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {banners.length > 1 && (
              <>
                <button onClick={prevBanner} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={nextBanner} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white">
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                  {banners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentBanner(idx)}
                      className={`w-2 h-2 rounded-full ${idx === currentBanner ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Labels You Love */}
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-6">Labels You Love</h2>
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            {[
              { name: 'Nike', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png' },
              { name: 'Adidas', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/200px-Adidas_Logo.svg.png' },
              { name: 'Puma', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/da/Puma_complete_logo.svg/200px-Puma_complete_logo.svg.png' },
              { name: 'TNV', logo: null },
              { name: 'H&M', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/H%26M-Logo.svg/200px-H%26M-Logo.svg.png' },
              { name: 'Zara', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Zara_Logo.svg/200px-Zara_Logo.svg.png' },
            ].map((brand, idx) => (
              <Link 
                key={idx}
                to={`/tnv/brand/${brand.name.toLowerCase()}`}
                className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 bg-white border rounded-xl flex items-center justify-center hover:shadow-lg transition p-4"
              >
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="font-bold text-lg">{brand.name}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-8 sm:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">New Arrivals</h2>
            <Link to="/tnv/collection/new" className="text-sm font-medium hover:underline">View All →</Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.slice(0, 8).map((product, idx) => (
              <ProductCard key={product.shopify_product_id || idx} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: 'Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop' },
              { name: 'Bags', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop' },
              { name: 'Clothing', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=400&fit=crop' },
              { name: 'Accessories', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop' },
            ].map((cat, idx) => (
              <Link 
                key={idx}
                to={`/tnv/category/${cat.name.toLowerCase()}`}
                className="relative aspect-square rounded-xl overflow-hidden group"
              >
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-lg sm:text-xl">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Now */}
      <section className="py-8 sm:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">Trending Now</h2>
            <Link to="/tnv/trending" className="text-sm font-medium hover:underline">View All →</Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.slice(8, 16).map((product, idx) => (
              <ProductCard key={product.shopify_product_id || idx} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-8 sm:p-12 text-white text-center">
            <h2 className="text-2xl sm:text-4xl font-bold mb-2">MEGA SALE</h2>
            <p className="text-lg sm:text-xl mb-4">Up to 70% OFF on selected items</p>
            <Link 
              to="/tnv/sale"
              className="inline-block bg-white text-red-500 px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition"
            >
              Shop Sale
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product }) => {
  const { formatPrice, toggleWishlist, isInWishlist } = useStore();
  const [imageError, setImageError] = useState(false);
  
  const image = product.images?.[0]?.src || 'https://via.placeholder.com/400x500?text=No+Image';
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden">
      <Link to={`/tnv/product/${product.shopify_product_id}`}>
        <div className="aspect-[3/4] overflow-hidden bg-gray-100">
          <img
            src={imageError ? 'https://via.placeholder.com/400x500?text=No+Image' : image}
            alt={product.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>
      
      {/* Wishlist Button */}
      <button
        onClick={() => toggleWishlist(product)}
        className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition"
      >
        <Heart 
          className={`w-4 h-4 ${isInWishlist(product.shopify_product_id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
        />
      </button>
      
      {/* Discount Badge */}
      {discount > 0 && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
          -{discount}%
        </span>
      )}
      
      <div className="p-3">
        <p className="text-xs text-gray-500 mb-1">TNV Collection</p>
        <h3 className="text-sm font-medium line-clamp-2 mb-2 min-h-[2.5rem]">{product.title}</h3>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-sm">{formatPrice(price)}</span>
          {comparePrice && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(comparePrice)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export { ProductCard };
export default TNVHomePage;
