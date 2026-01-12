import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, CreditCard, Truck, ShieldCheck, Loader2, 
  Check, MapPin, Phone, Mail, User, Home, Building, 
  Banknote, Smartphone, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore, useCart } from './LuxuryStorefrontLayout';
import { formatPrice } from './config/storeConfig';

const API = process.env.REACT_APP_BACKEND_URL;

// ===================== SHIPPING FORM =====================

const ShippingForm = ({ formData, onChange, errors, storeConfig }) => {
  const country = storeConfig?.country || 'India';
  const phonePlaceholder = country === 'Pakistan' ? '+92 300 1234567' : '+91 98765 43210';
  
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-medium tracking-wide flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        Shipping Address
      </h2>
      
      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">First Name *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={onChange}
              className={`w-full pl-10 pr-4 py-3 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition`}
              placeholder="John"
            />
          </div>
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">Last Name *</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={onChange}
            className={`w-full px-4 py-3 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition`}
            placeholder="Doe"
          />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">Email *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              className={`w-full pl-10 pr-4 py-3 border ${errors.email ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition`}
              placeholder="john@example.com"
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">Phone *</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={onChange}
              className={`w-full pl-10 pr-4 py-3 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition`}
              placeholder={phonePlaceholder}
            />
          </div>
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm text-gray-600 mb-1.5">Address Line 1 *</label>
        <div className="relative">
          <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            name="address1"
            value={formData.address1}
            onChange={onChange}
            className={`w-full pl-10 pr-4 py-3 border ${errors.address1 ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition`}
            placeholder="House/Flat No., Building Name"
          />
        </div>
        {errors.address1 && <p className="text-red-500 text-xs mt-1">{errors.address1}</p>}
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1.5">Address Line 2</label>
        <input
          type="text"
          name="address2"
          value={formData.address2}
          onChange={onChange}
          className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black transition"
          placeholder="Street, Area, Landmark (Optional)"
        />
      </div>

      {/* City, State, Zip */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">City *</label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={onChange}
              className={`w-full pl-10 pr-4 py-3 border ${errors.city ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition`}
              placeholder={country === 'Pakistan' ? 'Karachi' : 'Mumbai'}
            />
          </div>
          {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">State/Province *</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={onChange}
            className={`w-full px-4 py-3 border ${errors.state ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition`}
            placeholder={country === 'Pakistan' ? 'Sindh' : 'Maharashtra'}
          />
          {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">{country === 'Pakistan' ? 'Postal Code' : 'PIN Code'} *</label>
          <input
            type="text"
            name="zipCode"
            value={formData.zipCode}
            onChange={onChange}
            className={`w-full px-4 py-3 border ${errors.zipCode ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-black transition`}
            placeholder={country === 'Pakistan' ? '75500' : '400001'}
          />
          {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>}
        </div>
      </div>

      {/* Country - Auto-filled */}
      <div>
        <label className="block text-sm text-gray-600 mb-1.5">Country</label>
        <input
          type="text"
          value={country}
          disabled
          className="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-500"
        />
      </div>
    </div>
  );
};

// ===================== PAYMENT METHOD SELECTOR =====================

const PaymentMethodSelector = ({ selected, onChange, storeConfig }) => {
  const country = storeConfig?.country || 'India';
  
  const paymentMethods = [
    {
      id: 'cod',
      name: 'Cash on Delivery',
      description: 'Pay when your order arrives',
      icon: Banknote,
      available: true,
      badge: 'Most Popular'
    },
    {
      id: 'online',
      name: country === 'Pakistan' ? 'JazzCash / Easypaisa' : 'UPI / Cards / Netbanking',
      description: country === 'Pakistan' ? 'Pay securely via mobile wallet' : 'Pay securely via Razorpay',
      icon: country === 'Pakistan' ? Smartphone : CreditCard,
      available: true,
      badge: null
    },
    {
      id: 'whatsapp',
      name: 'Order via WhatsApp',
      description: 'Confirm order details on WhatsApp',
      icon: MessageCircle,
      available: true,
      badge: null
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium tracking-wide flex items-center gap-2">
        <CreditCard className="w-5 h-5" />
        Payment Method
      </h2>
      
      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <label
            key={method.id}
            className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition ${
              selected === method.id 
                ? 'border-black bg-gray-50' 
                : 'border-gray-200 hover:border-gray-300'
            } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={selected === method.id}
              onChange={(e) => onChange(e.target.value)}
              disabled={!method.available}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selected === method.id ? 'border-black' : 'border-gray-300'
            }`}>
              {selected === method.id && (
                <div className="w-2.5 h-2.5 rounded-full bg-black" />
              )}
            </div>
            <method.icon className={`w-6 h-6 ${
              method.id === 'whatsapp' ? 'text-[#25D366]' : 
              method.id === 'cod' ? 'text-green-600' : 'text-gray-600'
            }`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{method.name}</span>
                {method.badge && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    {method.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{method.description}</p>
            </div>
            {selected === method.id && (
              <Check className="w-5 h-5 text-black" />
            )}
          </label>
        ))}
      </div>

      {selected === 'cod' && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded text-sm">
          <p className="text-amber-800">
            💵 <strong>Cash on Delivery:</strong> Please keep exact change ready. 
            Our delivery partner will collect payment upon delivery.
          </p>
        </div>
      )}
    </div>
  );
};

// ===================== ORDER SUMMARY =====================

const CheckoutOrderSummary = ({ cart, storeConfig, shipping, discount }) => {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + shipping - discount;

  return (
    <div className="bg-[#f8f8f8] p-6">
      <h2 className="text-lg font-medium mb-4">Order Summary</h2>
      
      {/* Items */}
      <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
        {cart.map((item) => (
          <div key={item.variantId} className="flex gap-3">
            <div className="w-16 h-20 bg-white flex-shrink-0">
              {item.image && (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium line-clamp-1">{item.title}</h4>
              {item.variantTitle && item.variantTitle !== 'Default Title' && (
                <p className="text-xs text-gray-500">{item.variantTitle}</p>
              )}
              <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
              <p className="text-sm font-medium mt-1">
                {formatPrice(item.price * item.quantity, storeConfig)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-2 text-sm border-t border-gray-300 pt-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span>{formatPrice(subtotal, storeConfig)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatPrice(discount, storeConfig)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span>{shipping === 0 ? 'Free' : formatPrice(shipping, storeConfig)}</span>
        </div>
      </div>

      <div className="flex justify-between text-lg font-medium border-t border-gray-300 pt-4 mt-4">
        <span>Total</span>
        <span>{formatPrice(total, storeConfig)}</span>
      </div>

      {/* Trust Badges */}
      <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure checkout</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Truck className="w-4 h-4" />
          <span>Free shipping over {formatPrice(5000, storeConfig)}</span>
        </div>
      </div>
    </div>
  );
};

// ===================== MAIN CHECKOUT COMPONENT =====================

const LuxuryCheckout = () => {
  const storeConfig = useStore();
  const { cart, cartTotal, clearCart } = useCart();
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  
  const currentStoreSlug = storeSlug || storeConfig?.id || 'tnvcollection';
  const country = storeConfig?.country || 'India';

  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment, 3: Review
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    country: country
  });

  // Calculate totals
  const shipping = cartTotal >= 5000 ? 0 : (country === 'Pakistan' ? 250 : 199);
  const discount = 0; // Can be calculated from promo codes
  const total = cartTotal + shipping - discount;

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      navigate(`/store/${currentStoreSlug}/cart`);
    }
  }, [cart, navigate, currentStoreSlug]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateShipping = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.address1.trim()) newErrors.address1 = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP/PIN code is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToPayment = () => {
    if (validateShipping()) {
      setStep(2);
      window.scrollTo(0, 0);
    }
  };

  const handlePlaceOrder = async () => {
    if (paymentMethod === 'whatsapp') {
      // Generate WhatsApp order message
      const whatsappNumber = storeConfig?.contact?.whatsapp?.replace(/[^0-9]/g, '') || '';
      const currency = storeConfig?.currency?.symbol || '₹';
      
      let message = `🛍️ *New Order from ${storeConfig?.name}*\n\n`;
      message += `*Customer Details:*\n`;
      message += `Name: ${formData.firstName} ${formData.lastName}\n`;
      message += `Phone: ${formData.phone}\n`;
      message += `Email: ${formData.email}\n\n`;
      message += `*Shipping Address:*\n`;
      message += `${formData.address1}\n`;
      if (formData.address2) message += `${formData.address2}\n`;
      message += `${formData.city}, ${formData.state} ${formData.zipCode}\n`;
      message += `${country}\n\n`;
      message += `*Order Items:*\n`;
      message += `─────────────────\n`;
      
      cart.forEach((item, index) => {
        message += `${index + 1}. ${item.title}\n`;
        if (item.variantTitle && item.variantTitle !== 'Default Title') {
          message += `   ${item.variantTitle}\n`;
        }
        message += `   Qty: ${item.quantity} × ${currency}${item.price.toLocaleString()}\n`;
      });
      
      message += `─────────────────\n`;
      message += `*Subtotal:* ${currency}${cartTotal.toLocaleString()}\n`;
      message += `*Shipping:* ${shipping === 0 ? 'FREE' : currency + shipping}\n`;
      message += `*Total:* ${currency}${total.toLocaleString()}\n\n`;
      message += `💳 *Payment Method:* Cash on Delivery`;
      
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
      
      toast.success('Order sent to WhatsApp! We will confirm shortly.');
      clearCart();
      navigate(`/store/${currentStoreSlug}`);
      return;
    }

    setLoading(true);
    
    try {
      // Prepare order data
      const orderData = {
        store_name: currentStoreSlug,
        customer: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone
        },
        shipping_address: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          address1: formData.address1,
          address2: formData.address2,
          city: formData.city,
          province: formData.state,
          zip: formData.zipCode,
          country: country,
          phone: formData.phone
        },
        line_items: cart.map(item => ({
          product_id: item.productId,
          variant_id: item.variantId,
          title: item.title,
          variant_title: item.variantTitle,
          quantity: item.quantity,
          price: item.price,
          sku: item.sku
        })),
        subtotal: cartTotal,
        shipping_cost: shipping,
        discount: discount,
        total: total,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',
        currency: storeConfig?.currency?.code || 'INR'
      };

      // Create order
      const response = await fetch(`${API}/api/storefront/orders/cod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Order placed successfully!');
        clearCart();
        navigate(`/store/${currentStoreSlug}/order-confirmation/${result.order_id}`);
      } else {
        throw new Error(result.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="luxury-checkout">
      {/* Header */}
      <div className="bg-[#f8f8f8] py-4 border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between">
            <Link 
              to={`/store/${currentStoreSlug}/cart`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Cart
            </Link>
            
            {/* Progress Steps */}
            <div className="hidden sm:flex items-center gap-4">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-black' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step >= 1 ? 'bg-black text-white' : 'bg-gray-200'
                }`}>
                  {step > 1 ? <Check className="w-3 h-3" /> : '1'}
                </div>
                <span className="text-sm">Shipping</span>
              </div>
              <div className="w-8 h-px bg-gray-300" />
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-black' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step >= 2 ? 'bg-black text-white' : 'bg-gray-200'
                }`}>
                  {step > 2 ? <Check className="w-3 h-3" /> : '2'}
                </div>
                <span className="text-sm">Payment</span>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Secure Checkout <ShieldCheck className="inline w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-8">
            {step === 1 && (
              <>
                <ShippingForm 
                  formData={formData} 
                  onChange={handleInputChange} 
                  errors={errors}
                  storeConfig={storeConfig}
                />
                <button
                  onClick={handleContinueToPayment}
                  className="w-full py-4 bg-black text-white text-sm tracking-wider uppercase hover:bg-gray-800 transition"
                >
                  Continue to Payment
                </button>
              </>
            )}

            {step === 2 && (
              <>
                {/* Shipping Summary */}
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Shipping to:</span>
                    <button 
                      onClick={() => setStep(1)}
                      className="text-sm text-gray-600 underline hover:text-black"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formData.firstName} {formData.lastName}<br />
                    {formData.address1}{formData.address2 ? `, ${formData.address2}` : ''}<br />
                    {formData.city}, {formData.state} {formData.zipCode}<br />
                    {formData.phone}
                  </p>
                </div>

                <PaymentMethodSelector 
                  selected={paymentMethod} 
                  onChange={setPaymentMethod}
                  storeConfig={storeConfig}
                />

                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className="w-full py-4 bg-black text-white text-sm tracking-wider uppercase hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : paymentMethod === 'whatsapp' ? (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      Complete Order via WhatsApp
                    </>
                  ) : paymentMethod === 'cod' ? (
                    <>
                      <Banknote className="w-4 h-4" />
                      Place Order (Cash on Delivery)
                    </>
                  ) : (
                    'Proceed to Pay'
                  )}
                </button>

                {paymentMethod === 'cod' && (
                  <p className="text-xs text-center text-gray-500">
                    By placing this order, you agree to our Terms of Service and Privacy Policy
                  </p>
                )}
              </>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <CheckoutOrderSummary 
              cart={cart} 
              storeConfig={storeConfig}
              shipping={shipping}
              discount={discount}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LuxuryCheckout;
