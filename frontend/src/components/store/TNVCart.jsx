import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, Shield, Tag } from 'lucide-react';
import { useStore } from './TNVStoreLayout';

const TNVCart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateCartQuantity, cartTotal, formatPrice, region, storeConfig, storeName } = useStore();

  // Get store-specific thresholds and base URL
  const deliveryThreshold = storeConfig?.freeShippingThreshold || 500;
  const baseUrl = storeConfig?.baseUrl || '/tnv';
  const freeDelivery = cartTotal >= deliveryThreshold;
  const amountForFreeDelivery = deliveryThreshold - cartTotal;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl p-12">
            <ShoppingBag className="w-20 h-20 mx-auto text-gray-300 mb-6" />
            <h1 className="text-2xl font-bold mb-2">Your bag is empty</h1>
            <p className="text-gray-500 mb-8">Looks like you haven't added anything to your bag yet.</p>
            <Link 
              to={baseUrl}
              className="inline-block bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Free Delivery Banner */}
      {!freeDelivery && (
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-black py-3 px-4 text-center">
          <p className="text-sm font-medium">
            Add {formatPrice(amountForFreeDelivery)} more for FREE delivery! 🚚
          </p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Shopping Bag ({cart.length})</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item, idx) => (
              <div key={`${item.productId}-${item.variantId}`} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <Link to={`/tnv/product/${item.productId}`} className="flex-shrink-0">
                    <img
                      src={item.image || 'https://via.placeholder.com/120x150?text=No+Image'}
                      alt={item.title}
                      className="w-24 h-30 sm:w-32 sm:h-40 object-cover rounded-lg"
                    />
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">TNV Collection</p>
                        <Link 
                          to={`/tnv/product/${item.productId}`}
                          className="font-medium text-sm sm:text-base line-clamp-2 hover:text-gray-600"
                        >
                          {item.title}
                        </Link>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId, item.variantId)}
                        className="p-2 text-gray-400 hover:text-red-500 transition"
                        data-testid={`remove-item-${idx}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Variant Info */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.size && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">Size: {item.size}</span>
                      )}
                      {item.color && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">Color: {item.color}</span>
                      )}
                    </div>

                    {/* Quantity & Price */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center border rounded-lg">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity - 1)}
                          className="p-2 hover:bg-gray-100"
                          data-testid={`decrease-qty-${idx}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity + 1)}
                          className="p-2 hover:bg-gray-100"
                          data-testid={`increase-qty-${idx}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="font-bold text-lg">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-32">
              <h2 className="text-lg font-bold mb-6">Order Summary</h2>

              {/* Promo Code */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter promo code"
                      className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      data-testid="promo-code-input"
                    />
                  </div>
                  <button className="px-4 py-3 bg-gray-100 rounded-lg font-medium text-sm hover:bg-gray-200 transition">
                    Apply
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery</span>
                  <span className={freeDelivery ? 'text-green-600' : ''}>
                    {freeDelivery ? 'FREE' : formatPrice(50)}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(cartTotal + (freeDelivery ? 0 : 50))}</span>
                </div>
                <p className="text-xs text-gray-500">Including VAT</p>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => navigate('/tnv/checkout')}
                className="w-full py-4 bg-black text-white rounded-full font-bold text-lg hover:bg-gray-800 transition flex items-center justify-center space-x-2"
                data-testid="checkout-btn"
              >
                <span>Checkout</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Truck className="w-5 h-5 text-green-600" />
                  <span>Free delivery on orders over {formatPrice(500)}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span>Secure checkout & 100% authentic</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-xs text-gray-500 mb-3">We accept</p>
                <div className="flex flex-wrap gap-2">
                  {['VISA', 'Mastercard', 'COD', 'Apple Pay'].map(method => (
                    <span key={method} className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TNVCart;
