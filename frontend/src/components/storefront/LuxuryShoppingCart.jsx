import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  X, Minus, Plus, ShoppingBag, ArrowRight, Trash2,
  ChevronLeft, Tag, Truck, MessageCircle
} from 'lucide-react';
import { useStore, useCart } from './LuxuryStorefrontLayout';
import { formatPrice } from './config/storeConfig';

// ===================== WHATSAPP ORDER HELPER =====================

const generateWhatsAppMessage = (cart, cartTotal, storeConfig, promoApplied = false) => {
  const storeName = storeConfig?.name || 'TNC Collection';
  const currency = storeConfig?.currency?.symbol || '₹';
  
  let message = `🛍️ *New Order from ${storeName}*\n\n`;
  message += `*Order Details:*\n`;
  message += `─────────────────\n`;
  
  cart.forEach((item, index) => {
    message += `${index + 1}. *${item.title}*\n`;
    if (item.variantTitle && item.variantTitle !== 'Default Title') {
      message += `   Variant: ${item.variantTitle}\n`;
    }
    message += `   Qty: ${item.quantity} × ${currency}${item.price.toLocaleString()}\n`;
    message += `   Subtotal: ${currency}${(item.quantity * item.price).toLocaleString()}\n\n`;
  });
  
  message += `─────────────────\n`;
  
  const shipping = cartTotal >= 5000 ? 0 : 199;
  const discount = promoApplied ? cartTotal * 0.1 : 0;
  const total = cartTotal + shipping - discount;
  
  message += `*Subtotal:* ${currency}${cartTotal.toLocaleString()}\n`;
  if (promoApplied) {
    message += `*Discount (10%):* -${currency}${discount.toLocaleString()}\n`;
  }
  message += `*Shipping:* ${shipping === 0 ? 'FREE' : currency + shipping}\n`;
  message += `*Total:* ${currency}${total.toLocaleString()}\n\n`;
  
  message += `📦 Please confirm my order and share payment details.\n`;
  message += `📍 I will provide my shipping address.`;
  
  return encodeURIComponent(message);
};

const WhatsAppOrderButton = ({ cart, cartTotal, storeConfig, promoApplied }) => {
  const whatsappNumber = storeConfig?.contact?.whatsapp?.replace(/[^0-9]/g, '') || '';
  
  const handleWhatsAppOrder = () => {
    if (!whatsappNumber || whatsappNumber.includes('XXXX')) {
      // Demo mode - show alert
      alert('WhatsApp ordering will be available once the store owner configures their WhatsApp number.');
      return;
    }
    
    const message = generateWhatsAppMessage(cart, cartTotal, storeConfig, promoApplied);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleWhatsAppOrder}
      className="w-full py-4 bg-[#25D366] text-white text-sm tracking-wider uppercase hover:bg-[#128C7E] transition flex items-center justify-center gap-2"
      data-testid="whatsapp-order-btn"
    >
      <MessageCircle className="w-5 h-5" />
      Order via WhatsApp
    </button>
  );
};

// ===================== CART ITEM =====================

const CartItem = ({ item, storeConfig, onUpdateQuantity, onRemove }) => {
  return (
    <div className="flex gap-4 py-6 border-b border-gray-200" data-testid={`cart-item-${item.variantId}`}>
      {/* Image */}
      <div className="w-24 h-32 bg-[#f5f5f5] flex-shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBag className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
            {item.title}
          </h3>
          {item.variantTitle && item.variantTitle !== 'Default Title' && (
            <p className="text-sm text-gray-500">{item.variantTitle}</p>
          )}
          {item.sku && (
            <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          {/* Quantity */}
          <div className="flex items-center border border-gray-300">
            <button
              onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Price */}
          <span className="text-sm font-medium">
            {formatPrice(item.price * item.quantity, storeConfig)}
          </span>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.variantId)}
        className="p-2 text-gray-400 hover:text-red-500 transition self-start"
        title="Remove"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

// ===================== EMPTY CART =====================

const EmptyCart = ({ storeSlug }) => (
  <div className="text-center py-16">
    <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-6" />
    <h2 className="text-2xl font-light mb-4">Your bag is empty</h2>
    <p className="text-gray-500 mb-8">
      Looks like you haven't added anything to your bag yet.
    </p>
    <Link
      to={`/store/${storeSlug}/products`}
      className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white text-sm tracking-wider uppercase hover:bg-gray-800 transition"
    >
      Continue Shopping
      <ArrowRight className="w-4 h-4" />
    </Link>
  </div>
);

// ===================== ORDER SUMMARY =====================

const OrderSummary = ({ cart, cartTotal, storeConfig, onCheckout, onWhatsAppOrder }) => {
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  
  const shipping = cartTotal >= 5000 ? 0 : 199;
  const discount = promoApplied ? cartTotal * 0.1 : 0;
  const total = cartTotal + shipping - discount;

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === storeConfig?.promoCode || promoCode.toUpperCase() === 'WELCOME10') {
      setPromoApplied(true);
    }
  };

  return (
    <div className="bg-[#f8f8f8] p-6 lg:p-8 sticky top-24">
      <h2 className="text-lg font-medium mb-6">Order Summary</h2>

      {/* Promo Code */}
      <div className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Promo code"
              disabled={promoApplied}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-black disabled:bg-gray-100"
            />
          </div>
          <button
            onClick={handleApplyPromo}
            disabled={promoApplied || !promoCode}
            className="px-4 py-3 text-sm tracking-wider uppercase border border-black hover:bg-black hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent transition"
          >
            {promoApplied ? 'Applied' : 'Apply'}
          </button>
        </div>
        {promoApplied && (
          <p className="text-green-600 text-xs mt-2">✓ Promo code applied - 10% off</p>
        )}
      </div>

      {/* Summary Lines */}
      <div className="space-y-3 text-sm border-b border-gray-300 pb-6 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal ({cart.length} items)</span>
          <span>{formatPrice(cartTotal, storeConfig)}</span>
        </div>
        {promoApplied && (
          <div className="flex justify-between text-green-600">
            <span>Discount (10%)</span>
            <span>-{formatPrice(discount, storeConfig)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span>{shipping === 0 ? 'Free' : formatPrice(shipping, storeConfig)}</span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between text-lg font-medium mb-6">
        <span>Total</span>
        <span>{formatPrice(total, storeConfig)}</span>
      </div>

      {/* Free Shipping Notice */}
      {shipping > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6 bg-white p-3 rounded">
          <Truck className="w-4 h-4" />
          <span>
            Add {formatPrice(5000 - cartTotal, storeConfig)} more for free shipping
          </span>
        </div>
      )}

      {/* Checkout Button */}
      <button
        onClick={onCheckout}
        className="w-full py-4 bg-black text-white text-sm tracking-wider uppercase hover:bg-gray-800 transition"
      >
        Proceed to Checkout
      </button>

      {/* WhatsApp Order Button */}
      <div className="mt-3">
        <WhatsAppOrderButton 
          cart={cart} 
          cartTotal={cartTotal} 
          storeConfig={storeConfig}
          promoApplied={promoApplied}
        />
      </div>

      {/* Or Divider */}
      <div className="flex items-center gap-4 my-4">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="text-xs text-gray-400 uppercase">or</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      {/* Payment Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Secure checkout with Razorpay, UPI, Cards & more
        </p>
      </div>
    </div>
  );
};

// ===================== MAIN COMPONENT =====================

const LuxuryShoppingCart = () => {
  const storeConfig = useStore();
  const { cart, cartTotal, updateQuantity, removeFromCart } = useCart();
  const { storeSlug } = useParams();
  const navigate = useNavigate();

  const currentStoreSlug = storeSlug || storeConfig?.id || 'tnvcollection';

  const handleCheckout = () => {
    navigate(`/store/${currentStoreSlug}/checkout`);
  };

  return (
    <div className="min-h-screen bg-white" data-testid="luxury-shopping-cart">
      {/* Breadcrumb */}
      <div className="bg-[#f8f8f8] py-4">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <nav className="text-sm text-gray-500">
            <Link to={`/store/${currentStoreSlug}`} className="hover:text-black transition">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-black">Shopping Bag</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
        {cart.length === 0 ? (
          <EmptyCart storeSlug={currentStoreSlug} />
        ) : (
          <>
            <h1 className="text-3xl font-light tracking-wide mb-8">Shopping Bag</h1>
            
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <div className="border-t border-gray-200">
                  {cart.map((item) => (
                    <CartItem
                      key={item.variantId}
                      item={item}
                      storeConfig={storeConfig}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeFromCart}
                    />
                  ))}
                </div>

                {/* Continue Shopping */}
                <Link
                  to={`/store/${currentStoreSlug}/products`}
                  className="inline-flex items-center gap-2 mt-6 text-sm text-gray-600 hover:text-black transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Continue Shopping
                </Link>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <OrderSummary
                  cart={cart}
                  cartTotal={cartTotal}
                  storeConfig={storeConfig}
                  onCheckout={handleCheckout}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LuxuryShoppingCart;
