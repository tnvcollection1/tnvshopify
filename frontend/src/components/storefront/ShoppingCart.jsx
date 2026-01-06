import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ChevronRight } from 'lucide-react';
import { useCart } from './StorefrontLayout';

const CartItem = ({ item, onUpdateQuantity, onRemove }) => (
  <div className="flex gap-4 py-6 border-b border-gray-200">
    {/* Image */}
    <Link to={`/shop/product/${item.productId || item.shopify_product_id}`} className="w-24 h-32 bg-gray-100 flex-shrink-0">
      <img
        src={item.image || 'https://via.placeholder.com/200'}
        alt={item.title}
        className="w-full h-full object-cover"
      />
    </Link>

    {/* Details */}
    <div className="flex-1 flex flex-col">
      <div className="flex justify-between">
        <div>
          <Link 
            to={`/shop/product/${item.productId || item.shopify_product_id}`}
            className="font-medium hover:underline"
          >
            {item.title}
          </Link>
          <p className="text-sm text-gray-500 mt-1">{item.variantTitle}</p>
          {item.sku && (
            <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(item.variantId)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-auto flex items-center justify-between">
        {/* Quantity */}
        <div className="flex items-center border border-gray-300">
          <button
            onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
            className="px-3 py-2 hover:bg-gray-100 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 font-medium">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
            className="px-3 py-2 hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Price */}
        <div className="text-right">
          <p className="font-semibold">₹{(item.price * item.quantity).toLocaleString()}</p>
          {item.quantity > 1 && (
            <p className="text-xs text-gray-500">₹{item.price.toLocaleString()} each</p>
          )}
        </div>
      </div>
    </div>
  </div>
);

const EmptyCart = () => (
  <div className="text-center py-16">
    <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
    <h2 className="text-2xl font-bold mb-2">Your bag is empty</h2>
    <p className="text-gray-500 mb-8">Looks like you haven&apos;t added anything to your bag yet.</p>
    <Link
      to="/shop/products"
      className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 font-medium hover:bg-gray-800 transition-colors"
    >
      Continue Shopping
      <ArrowRight className="w-5 h-5" />
    </Link>
  </div>
);

const OrderSummary = ({ cartTotal, itemCount }) => {
  const shipping = cartTotal > 5000 ? 0 : 199;
  const total = cartTotal + shipping;

  return (
    <div className="bg-gray-50 p-6 lg:p-8">
      <h2 className="text-lg font-semibold mb-6">Order Summary</h2>
      
      <div className="space-y-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal ({itemCount} items)</span>
          <span className="font-medium">₹{cartTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span className="font-medium">
            {shipping === 0 ? (
              <span className="text-green-600">FREE</span>
            ) : (
              `₹${shipping}`
            )}
          </span>
        </div>
        {cartTotal < 5000 && (
          <p className="text-xs text-gray-500">
            Add ₹{(5000 - cartTotal).toLocaleString()} more for free shipping
          </p>
        )}
        <div className="border-t border-gray-200 pt-4 flex justify-between">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-lg">₹{total.toLocaleString()}</span>
        </div>
      </div>

      <Link
        to="/shop/checkout"
        className="w-full mt-6 flex items-center justify-center gap-2 bg-black text-white py-4 font-medium hover:bg-gray-800 transition-colors"
      >
        Proceed to Checkout
        <ArrowRight className="w-5 h-5" />
      </Link>

      <p className="text-xs text-gray-500 text-center mt-4">
        Taxes calculated at checkout
      </p>

      {/* Trust Badges */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <span>🔒 Secure Checkout</span>
          <span>💳 Multiple Payment Options</span>
        </div>
      </div>
    </div>
  );
};

const ShoppingCart = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/shop" className="hover:text-black">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-black">Shopping Bag</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Shopping Bag</h1>

      <div className="lg:grid lg:grid-cols-3 lg:gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="divide-y divide-gray-200">
            {cart.map((item) => (
              <CartItem
                key={item.variantId}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            ))}
          </div>

          {/* Continue Shopping */}
          <div className="mt-8">
            <Link
              to="/shop/products"
              className="text-sm font-medium text-gray-600 hover:text-black"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div className="mt-8 lg:mt-0">
          <OrderSummary cartTotal={cartTotal} itemCount={cartCount} />
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
