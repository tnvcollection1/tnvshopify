import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, ShoppingBag, Trash2, Share2, ExternalLink, 
  RefreshCw, ShoppingCart, X, Check, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from './TNVStoreLayout';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Generate customer ID from localStorage or create new
const getCustomerId = () => {
  let id = localStorage.getItem('customer_id');
  if (!id) {
    id = 'cust_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('customer_id', id);
  }
  return id;
};

const getSessionId = () => {
  let id = localStorage.getItem('cart_session_id');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('cart_session_id', id);
  }
  return id;
};

const WishlistPage = () => {
  const { formatPrice, storeConfig, storeName, addToCart } = useStore();
  const baseUrl = storeConfig?.baseUrl || '/tnv';
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movingToCart, setMovingToCart] = useState(null);
  const [shareUrl, setShareUrl] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const customerId = getCustomerId();
  const sessionId = getSessionId();
  
  useEffect(() => {
    fetchWishlist();
  }, []);
  
  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ecommerce/wishlist/${customerId}?store=${storeName}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      // Fallback to local storage
      const local = localStorage.getItem(`tnv_wishlist_${storeName}`);
      if (local) {
        try {
          setItems(JSON.parse(local));
        } catch { setItems([]); }
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemove = async (productId) => {
    try {
      await fetch(`${API}/api/ecommerce/wishlist/${customerId}/remove/${productId}?store=${storeName}`, {
        method: 'DELETE'
      });
      setItems(items.filter(item => item.product_id !== productId));
      toast.success('Removed from wishlist');
    } catch (e) {
      toast.error('Failed to remove item');
    }
  };
  
  const handleMoveToCart = async (item) => {
    setMovingToCart(item.product_id);
    try {
      const res = await fetch(
        `${API}/api/ecommerce/wishlist/${customerId}/move-to-cart?product_id=${item.product_id}&session_id=${sessionId}&store=${storeName}`,
        { method: 'POST' }
      );
      
      if (res.ok) {
        setItems(items.filter(i => i.product_id !== item.product_id));
        toast.success('Moved to cart!');
      }
    } catch (e) {
      // Fallback: add to local cart
      addToCart({
        shopify_product_id: item.product_id,
        title: item.title,
        images: [{ src: item.image }],
        price: item.price
      }, { id: item.variant_id, price: item.price, option1: item.size, option2: item.color }, 1);
      setItems(items.filter(i => i.product_id !== item.product_id));
      toast.success('Added to cart!');
    } finally {
      setMovingToCart(null);
    }
  };
  
  const handleShare = async () => {
    try {
      const res = await fetch(`${API}/api/ecommerce/wishlist/${customerId}/share?store=${storeName}`);
      const data = await res.json();
      setShareUrl(window.location.origin + data.share_url);
      setShowShareModal(true);
    } catch (e) {
      toast.error('Failed to generate share link');
    }
  };
  
  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500" fill="currentColor" />
              My Wishlist
            </h1>
            <p className="text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          
          {items.length > 0 && (
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              data-testid="share-wishlist-btn"
            >
              <Share2 className="w-4 h-4" />
              Share Wishlist
            </button>
          )}
        </div>
        
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Heart className="w-20 h-20 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-6">Save items you love to your wishlist</p>
            <Link
              to={baseUrl}
              className="inline-block px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div 
                key={item.product_id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden group"
                data-testid="wishlist-item"
              >
                {/* Image */}
                <Link to={`${baseUrl}/product/${item.product_id}`}>
                  <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
                    <img
                      src={item.image || 'https://via.placeholder.com/300x400'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.compare_price && item.compare_price > item.price && (
                      <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        -{Math.round((1 - item.price / item.compare_price) * 100)}%
                      </span>
                    )}
                  </div>
                </Link>
                
                {/* Details */}
                <div className="p-4">
                  <Link 
                    to={`${baseUrl}/product/${item.product_id}`}
                    className="font-medium text-sm line-clamp-2 hover:underline"
                  >
                    {item.title}
                  </Link>
                  
                  {(item.size || item.color) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {item.size && <span>Size: {item.size}</span>}
                      {item.size && item.color && <span> • </span>}
                      {item.color && <span>Color: {item.color}</span>}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-bold">{formatPrice(item.price)}</span>
                    {item.compare_price && item.compare_price > item.price && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(item.compare_price)}
                      </span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleMoveToCart(item)}
                      disabled={movingToCart === item.product_id}
                      className="flex-1 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center justify-center gap-1 disabled:opacity-50"
                      data-testid="move-to-cart-btn"
                    >
                      {movingToCart === item.product_id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          Add to Bag
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      className="p-2 border rounded-lg hover:bg-red-50 hover:border-red-200 text-gray-500 hover:text-red-500"
                      data-testid="remove-wishlist-btn"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Share Your Wishlist</h3>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-gray-500 text-sm mb-4">
                Share this link with friends and family so they can see your wishlist
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl || ''}
                  readOnly
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm"
                />
                <button
                  onClick={copyShareLink}
                  className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
              
              <div className="flex gap-3 mt-6">
                <a
                  href={`https://wa.me/?text=Check%20out%20my%20wishlist!%20${encodeURIComponent(shareUrl || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg text-center text-sm font-medium hover:bg-green-600"
                >
                  WhatsApp
                </a>
                <a
                  href={`mailto:?subject=My%20Wishlist&body=Check%20out%20my%20wishlist!%20${encodeURIComponent(shareUrl || '')}`}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-center text-sm font-medium hover:bg-blue-600"
                >
                  Email
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
