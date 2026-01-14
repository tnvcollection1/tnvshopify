import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Store configurations
const STORE_CONFIGS = {
  tnvcollection: {
    name: 'TNV Collection India',
    subdomain: 'tnvcollection',
    currency: 'INR',
    currencySymbol: '₹'
  },
  tnvcollectionpk: {
    name: 'TNV Collection Pakistan', 
    subdomain: 'tnvcollectionpk',
    currency: 'PKR',
    currencySymbol: 'Rs.'
  }
};

const StorefrontPreview = () => {
  const { storeSlug } = useParams();
  const [storeConfig, setStoreConfig] = useState(null);
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);

  const storeName = storeSlug?.replace('preview', '') || 'tnvcollectionpk';

  useEffect(() => {
    const config = STORE_CONFIGS[storeName] || STORE_CONFIGS.tnvcollectionpk;
    setStoreConfig(config);
    fetchStoreData(storeName);
  }, [storeName]);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners]);

  const fetchStoreData = async (store) => {
    try {
      setLoading(true);
      const [bannersRes, productsRes, collectionsRes] = await Promise.all([
        fetch(`${API_URL}/api/storefront/banners?store=${store}`),
        fetch(`${API_URL}/api/storefront/products?store=${store}&limit=8`),
        fetch(`${API_URL}/api/storefront/collections?store=${store}&limit=6`)
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
    return `${storeConfig.currencySymbol} ${parseFloat(price).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Preview Banner */}
      <div className="bg-yellow-400 text-black text-center py-2 text-sm font-medium">
        🔍 PREVIEW MODE - {storeConfig?.name} | Changes here reflect before VPS deployment
      </div>

      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="bg-black text-white text-center py-2 text-xs tracking-wider">
          FREE SHIPPING ON ORDERS OVER {storeConfig?.currencySymbol}5,000 | USE CODE: WELCOME10
        </div>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-serif tracking-widest">TNV COLLECTION</h1>
            <nav className="hidden md:flex space-x-8 text-sm tracking-wide">
              <a href="#" className="hover:text-gray-600">NEW IN</a>
              <a href="#" className="hover:text-gray-600">MEN</a>
              <a href="#" className="hover:text-gray-600">WOMEN</a>
              <a href="#" className="hover:text-gray-600">ACCESSORIES</a>
              <a href="#" className="hover:text-gray-600">SALE</a>
            </nav>
            <div className="flex items-center space-x-4">
              <button className="text-sm">🔍</button>
              <button className="text-sm">👤</button>
              <button className="text-sm">🛒</button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      {banners.length > 0 && (
        <div className="relative h-[500px] overflow-hidden">
          {banners.map((banner, idx) => (
            <div
              key={banner.id || idx}
              className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentBanner ? 'opacity-100' : 'opacity-0'}`}
            >
              <img
                src={banner.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920'}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="text-center text-white">
                  <h2 className="text-5xl font-serif mb-4">{banner.title}</h2>
                  <p className="text-lg mb-6">{banner.subtitle}</p>
                  <button className="bg-white text-black px-8 py-3 text-sm tracking-wider hover:bg-gray-100 transition">
                    {banner.button_text || 'SHOP NOW'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {/* Banner indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBanner(idx)}
                className={`w-2 h-2 rounded-full ${idx === currentBanner ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Collections */}
      {collections.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-serif text-center mb-12">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {collections.slice(0, 6).map((collection, idx) => (
              <div key={collection.id || idx} className="group cursor-pointer">
                <div className="aspect-square bg-gray-100 overflow-hidden mb-3">
                  <img
                    src={collection.image || `https://images.unsplash.com/photo-${1549298916 + idx}-a1dabe68da3e?w=400`}
                    alt={collection.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
                <p className="text-center text-sm tracking-wide">{collection.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-16 bg-gray-50">
        <h2 className="text-3xl font-serif text-center mb-12">New Arrivals</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((product, idx) => (
            <div key={product.id || idx} className="group cursor-pointer bg-white">
              <div className="aspect-square overflow-hidden">
                <img
                  src={product.images?.[0]?.src || product.image || 'https://via.placeholder.com/400'}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-medium truncate">{product.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {formatPrice(product.variants?.[0]?.price || product.price || 0)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-serif mb-4">TNV COLLECTION</h3>
              <p className="text-gray-400 text-sm">Premium designer footwear for the discerning gentleman.</p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-4">CUSTOMER SERVICE</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Contact Us</li>
                <li>Shipping & Returns</li>
                <li>FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-4">COMPANY</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>About Us</li>
                <li>Careers</li>
                <li>Store Locator</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-4">FOLLOW US</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">Instagram</a>
                <a href="#" className="text-gray-400 hover:text-white">Facebook</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
            © 2025 TNV Collection. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StorefrontPreview;
