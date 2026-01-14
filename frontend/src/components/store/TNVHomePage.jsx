import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useStore } from './TNVStoreLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to get full image URL (handles relative proxy URLs)
const getImageUrl = (src) => {
  if (!src) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop';
  // If it's a relative proxy URL, prepend the API URL
  if (src.startsWith('/api/')) {
    return `${API_URL}${src}`;
  }
  return src;
};

const TNVHomePage = () => {
  const { storeName, formatPrice, toggleWishlist, isInWishlist } = useStore();
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
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
      const [bannersRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/api/storefront/banners/hero/${storeName}`),
        fetch(`${API_URL}/api/storefront/products?store=${storeName}&limit=24`)
      ]);
      
      const bannersData = await bannersRes.json();
      const productsData = await productsRes.json();
      
      setBanners(bannersData.banners || []);
      setProducts(productsData.products || []);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Category circles like Namshi
  const categories = [
    { name: 'New In', image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=300&h=300&fit=crop' },
    { name: 'Handbags', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop' },
    { name: 'Dresses', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop' },
    { name: 'Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop' },
    { name: 'Sports', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop' },
    { name: 'Pants', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=300&h=300&fit=crop' },
    { name: 'Sandals', image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=300&h=300&fit=crop' },
    { name: 'Watches', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=300&fit=crop' },
  ];

  const categories2 = [
    { name: 'Sneakers', image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=300&h=300&fit=crop' },
    { name: 'Sports Shoes', image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300&h=300&fit=crop' },
    { name: 'Tops & Tees', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&h=300&fit=crop' },
    { name: 'Boots', image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=300&h=300&fit=crop' },
    { name: 'Heels', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&h=300&fit=crop' },
    { name: 'Shirts', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=300&fit=crop' },
    { name: 'Jackets', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=300&fit=crop' },
    { name: 'Accessories', image: 'https://images.unsplash.com/photo-1611923134239-b9be5816e23e?w=300&h=300&fit=crop' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner - Namshi Style */}
      <section className="relative h-[400px] md:h-[500px] overflow-hidden">
        {banners.length > 0 ? (
          banners.map((banner, idx) => (
            <div
              key={banner.id || idx}
              className={`absolute inset-0 transition-opacity duration-700 ${idx === currentBanner ? 'opacity-100' : 'opacity-0'}`}
            >
              <img 
                src={banner.image || 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&h=600&fit=crop'}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-7xl mx-auto px-4 w-full">
                  <div className="max-w-md">
                    <h2 className="text-white text-4xl md:text-5xl font-bold mb-2 leading-tight">
                      {banner.title || 'Reset in Style'}
                    </h2>
                    <p className="text-white/90 text-lg mb-6">{banner.subtitle || 'Fresh Fits, Fresh Start'}</p>
                    <Link 
                      to="/tnv/products"
                      className="inline-block bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition shadow-lg"
                    >
                      Shop Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-pink-100 to-purple-100 flex items-center">
            <div className="max-w-7xl mx-auto px-4 w-full">
              <div className="max-w-md">
                <h2 className="text-gray-800 text-4xl md:text-5xl font-bold mb-2">Reset in Style</h2>
                <p className="text-gray-600 text-lg mb-6">Fresh Fits, Fresh Start</p>
                <Link to="/tnv/products" className="inline-block bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition">
                  Shop Now
                </Link>
              </div>
            </div>
          </div>
        )}
        
        {/* Banner Navigation Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBanner(idx)}
                className={`w-2.5 h-2.5 rounded-full transition ${idx === currentBanner ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Featured Products - Horizontal Scroll like Namshi */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Today's Picks</h2>
            <Link to="/tnv/products" className="text-sm text-gray-500 hover:text-black">View All →</Link>
          </div>
          
          <ProductCarousel products={products.slice(0, 8)} />
        </div>
      </section>

      {/* Promo Banner - Namshi Style */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-green-400 via-teal-400 to-cyan-400 rounded-2xl p-8 flex items-center justify-between overflow-hidden relative">
            <div className="text-white z-10">
              <h3 className="text-3xl md:text-4xl font-black mb-1">30% CASHBACK</h3>
              <p className="text-lg">On Sports Apparel & Footwear</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 z-10">
              <p className="text-white text-sm">USE CODE:</p>
              <p className="text-white text-xl font-black">SPORTS30</p>
            </div>
            {/* Decorative elements */}
            <div className="absolute right-20 top-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2" />
            <div className="absolute right-0 bottom-0 w-60 h-60 bg-white/10 rounded-full translate-x-1/4 translate-y-1/4" />
          </div>
        </div>
      </section>

      {/* Category Circles - Row 1 */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <CategoryCircles categories={categories} />
        </div>
      </section>

      {/* More Products */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Trending Now</h2>
            <Link to="/tnv/products" className="text-sm text-gray-500 hover:text-black">View All →</Link>
          </div>
          
          <ProductCarousel products={products.slice(8, 16)} />
        </div>
      </section>

      {/* Second Promo Banner */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 rounded-2xl p-8 text-center">
            <h3 className="text-white text-2xl md:text-3xl font-black mb-2">MEGA SALE</h3>
            <p className="text-white/90 text-lg mb-4">Up to 70% OFF on selected items</p>
            <Link to="/tnv/sale" className="inline-block bg-white text-pink-600 px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition">
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Category Circles - Row 2 */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <CategoryCircles categories={categories2} />
        </div>
      </section>

      {/* New Arrivals Grid */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">New Arrivals</h2>
            <Link to="/tnv/products" className="text-sm text-gray-500 hover:text-black">View All →</Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.slice(0, 10).map((product, idx) => (
              <ProductCard key={product.shopify_product_id || idx} product={product} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// Product Carousel Component (Horizontal Scroll)
const ProductCarousel = ({ products }) => {
  const scrollRef = useRef(null);
  
  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative group">
      {/* Left Arrow */}
      <button 
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-gray-50"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      {/* Products */}
      <div 
        ref={scrollRef}
        className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product, idx) => (
          <ProductCardHorizontal key={product.shopify_product_id || idx} product={product} />
        ))}
      </div>
      
      {/* Right Arrow */}
      <button 
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-gray-50"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

// Horizontal Product Card (Namshi style)
const ProductCardHorizontal = ({ product }) => {
  const { formatPrice, toggleWishlist, isInWishlist } = useStore();
  const [imageError, setImageError] = useState(false);
  
  const image = getImageUrl(product.images?.[0]?.src);
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;
  
  // Use product ID for consistent delivery display
  const deliveryOptions = ['TODAY', 'TOMORROW', '2-3 DAYS'];
  const delivery = deliveryOptions[product.shopify_product_id % 2];

  return (
    <div className="flex-shrink-0 w-44 group">
      <Link to={`/tnv/product/${product.shopify_product_id}`}>
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100 mb-2">
          <img
            src={imageError ? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=300&fit=crop' : image}
            alt={product.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Discount Badge */}
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              -{discount}%
            </span>
          )}
          
          {/* Wishlist */}
          <button
            onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
            className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition"
          >
            <Heart className={`w-4 h-4 ${isInWishlist(product.shopify_product_id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>
        </div>
      </Link>
      
      <div className="px-1">
        <p className="text-xs text-gray-500 truncate">{product.vendor || 'TNV Collection'}</p>
        <h3 className="text-xs font-medium line-clamp-2 h-8 mb-1">{product.title}</h3>
        <div className="flex items-center space-x-1.5">
          <span className="font-bold text-sm">{formatPrice(price)}</span>
          {comparePrice && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(comparePrice)}</span>
          )}
          {discount > 0 && (
            <span className="text-xs text-red-500 font-medium">-{discount}%</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">Free delivery</p>
        <p className="text-xs mt-0.5">
          <span className="text-gray-600">GET IT </span>
          <span className={`font-bold ${delivery === 'TODAY' ? 'text-green-600' : 'text-orange-500'}`}>{delivery}</span>
        </p>
      </div>
    </div>
  );
};

// Category Circles Component
const CategoryCircles = ({ categories }) => {
  const scrollRef = useRef(null);
  
  return (
    <div className="relative group">
      <button 
        onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
        className="absolute left-0 top-1/3 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <div 
        ref={scrollRef}
        className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((cat, idx) => (
          <Link 
            key={idx}
            to={`/tnv/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
            className="flex-shrink-0 text-center group/item"
          >
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden mb-2 border-2 border-transparent group-hover/item:border-black transition">
              <img 
                src={cat.image} 
                alt={cat.name}
                className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-300"
              />
            </div>
            <p className="text-sm font-medium">{cat.name}</p>
          </Link>
        ))}
      </div>
      
      <button 
        onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
        className="absolute right-0 top-1/3 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

// Standard Product Card
const ProductCard = ({ product }) => {
  const { formatPrice, toggleWishlist, isInWishlist } = useStore();
  const [imageError, setImageError] = useState(false);
  
  const image = getImageUrl(product.images?.[0]?.src);
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden">
      <Link to={`/tnv/product/${product.shopify_product_id}`}>
        <div className="aspect-[3/4] overflow-hidden bg-gray-100">
          <img
            src={imageError ? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop' : image}
            alt={product.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>
      
      <button
        onClick={() => toggleWishlist(product)}
        className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition opacity-0 group-hover:opacity-100"
      >
        <Heart className={`w-4 h-4 ${isInWishlist(product.shopify_product_id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </button>
      
      {discount > 0 && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
          -{discount}%
        </span>
      )}
      
      <div className="p-3">
        <p className="text-xs text-gray-500 mb-1">{product.vendor || 'TNV Collection'}</p>
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
