/**
 * Complete the Look Component
 * AI-powered outfit suggestions based on current product
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Sparkles } from 'lucide-react';
import { useStore } from './TNVStoreLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getImageUrl = (src) => {
  if (!src) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop';
  if (src.startsWith('/api/')) return `${API_URL}${src}`;
  return src;
};

// Mock "Complete the Look" suggestions based on category
const LOOK_SUGGESTIONS = {
  shoes: [
    { category: 'Pants', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=200&h=200&fit=crop' },
    { category: 'Belt', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop' },
    { category: 'Watch', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop' },
  ],
  clothing: [
    { category: 'Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop' },
    { category: 'Bag', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop' },
    { category: 'Sunglasses', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop' },
  ],
  default: [
    { category: 'Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop' },
    { category: 'Watch', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop' },
    { category: 'Sunglasses', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop' },
  ],
};

const CompleteTheLook = ({ currentProduct, allProducts = [], baseUrl = '/tnv' }) => {
  const { formatPrice, toggleWishlist, isInWishlist, addToCart } = useStore();
  const [suggestions, setSuggestions] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (currentProduct && allProducts.length > 0) {
      generateSuggestions();
    }
  }, [currentProduct, allProducts]);

  const generateSuggestions = () => {
    // Get random products that are different from current
    const otherProducts = allProducts.filter(
      p => p.shopify_product_id !== currentProduct?.shopify_product_id
    );
    
    // Shuffle and take 3-4 products
    const shuffled = otherProducts.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 4);
    
    setSuggestions(selected);
    setSelectedItems(selected.map(p => p.shopify_product_id));
    
    // Calculate total
    const total = selected.reduce((sum, p) => {
      return sum + (p.variants?.[0]?.price || p.price || 0);
    }, currentProduct?.variants?.[0]?.price || currentProduct?.price || 0);
    setTotalPrice(total);
  };

  const toggleItem = (productId) => {
    setSelectedItems(prev => {
      const newSelected = prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      
      // Recalculate total
      const selectedProducts = suggestions.filter(p => newSelected.includes(p.shopify_product_id));
      const total = selectedProducts.reduce((sum, p) => {
        return sum + (p.variants?.[0]?.price || p.price || 0);
      }, currentProduct?.variants?.[0]?.price || currentProduct?.price || 0);
      setTotalPrice(total);
      
      return newSelected;
    });
  };

  const addAllToCart = () => {
    const itemsToAdd = suggestions.filter(p => selectedItems.includes(p.shopify_product_id));
    itemsToAdd.forEach(product => addToCart(product, 1));
    if (currentProduct) addToCart(currentProduct, 1);
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 my-6" data-testid="complete-the-look">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-bold">Complete the Look</h3>
        <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full ml-auto">AI Suggested</span>
      </div>

      {/* Products Grid */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {/* Current Product */}
        {currentProduct && (
          <div className="flex-shrink-0 w-28">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-white border-2 border-purple-400">
              <img 
                src={getImageUrl(currentProduct.images?.[0]?.src)}
                alt={currentProduct.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 left-1 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                Main
              </div>
            </div>
            <p className="text-xs font-medium mt-2 line-clamp-1">{currentProduct.title}</p>
            <p className="text-sm font-bold">{formatPrice(currentProduct.variants?.[0]?.price || currentProduct.price || 0)}</p>
          </div>
        )}

        {/* Plus Icon */}
        <div className="flex-shrink-0 flex items-center">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
            +
          </div>
        </div>

        {/* Suggested Products */}
        {suggestions.map((product, idx) => {
          const isSelected = selectedItems.includes(product.shopify_product_id);
          const price = product.variants?.[0]?.price || product.price || 0;
          
          return (
            <div key={product.shopify_product_id || idx} className="flex-shrink-0 w-28">
              <button 
                onClick={() => toggleItem(product.shopify_product_id)}
                className={`relative aspect-square rounded-xl overflow-hidden bg-white border-2 transition ${
                  isSelected ? 'border-green-500' : 'border-gray-200'
                }`}
              >
                <img 
                  src={getImageUrl(product.images?.[0]?.src)}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                {/* Checkbox */}
                <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition ${
                  isSelected ? 'bg-green-500 text-white' : 'bg-white/80'
                }`}>
                  {isSelected ? '✓' : ''}
                </div>
              </button>
              <p className="text-xs font-medium mt-2 line-clamp-1">{product.title}</p>
              <p className="text-sm font-bold">{formatPrice(price)}</p>
            </div>
          );
        })}
      </div>

      {/* Total & Add All Button */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-purple-200">
        <div>
          <p className="text-sm text-gray-600">Total for selected items</p>
          <p className="text-xl font-bold text-purple-700">{formatPrice(totalPrice)}</p>
        </div>
        <button
          onClick={addAllToCart}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 transition"
        >
          <ShoppingBag className="w-5 h-5" />
          Add {selectedItems.length + 1} Items
        </button>
      </div>
    </div>
  );
};

export default CompleteTheLook;
