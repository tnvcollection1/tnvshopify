import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, CreditCard, Truck, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { useCart } from './StorefrontLayout';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY_ID;

// Shipping Address Form
const ShippingForm = ({ formData, onChange, errors }) => (
  <div className="space-y-4">
    <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={onChange}
          className={`w-full px-4 py-3 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-black`}
          placeholder="John"
        />
        {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={onChange}
          className={`w-full px-4 py-3 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-black`}
          placeholder="Doe"
        />
        {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={onChange}
        className={`w-full px-4 py-3 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-black`}
        placeholder="john@example.com"
      />
      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
      <input
        type="tel"
        name="phone"
        value={formData.phone}
        onChange={onChange}
        className={`w-full px-4 py-3 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-black`}
        placeholder="+91 9876543210"
      />
      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
      <input
        type="text"
        name="address1"
        value={formData.address1}
        onChange={onChange}
        className={`w-full px-4 py-3 border ${errors.address1 ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-black`}
        placeholder="123 Main Street"
      />
      {errors.address1 && <p className="text-red-500 text-xs mt-1">{errors.address1}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Apartment, suite, etc. (optional)</label>
      <input
        type="text"
        name="address2"
        value={formData.address2}
        onChange={onChange}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        placeholder="Apt 4B"
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
        <input
          type="text"
          name="city"
          value={formData.city}
          onChange={onChange}
          className={`w-full px-4 py-3 border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-black`}
          placeholder="Mumbai"
        />
        {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">State/Province *</label>
        <input
          type="text"
          name="province"
          value={formData.province}
          onChange={onChange}
          className={`w-full px-4 py-3 border ${errors.province ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-black`}
          placeholder="Maharashtra"
        />
        {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
        <input
          type="text"
          name="zip"
          value={formData.zip}
          onChange={onChange}
          className={`w-full px-4 py-3 border ${errors.zip ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-black`}
          placeholder="400001"
        />
        {errors.zip && <p className="text-red-500 text-xs mt-1">{errors.zip}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
        <select
          name="country"
          value={formData.country}
          onChange={onChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="IN">India</option>
          <option value="PK">Pakistan</option>
          <option value="AE">UAE</option>
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
        </select>
      </div>
    </div>
  </div>
);

// Payment Method Selection
const PaymentMethod = ({ selected, onSelect }) => (
  <div className="space-y-4">
    <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
    
    <div className="space-y-3">
      <label 
        className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
          selected === 'razorpay' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          type="radio"
          name="payment"
          value="razorpay"
          checked={selected === 'razorpay'}
          onChange={(e) => onSelect(e.target.value)}
          className="w-5 h-5 text-black"
        />
        <CreditCard className="w-6 h-6 text-gray-600" />
        <div>
          <p className="font-medium">Pay Online</p>
          <p className="text-sm text-gray-500">Credit/Debit Card, UPI, Net Banking</p>
        </div>
      </label>

      <label 
        className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
          selected === 'cod' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          type="radio"
          name="payment"
          value="cod"
          checked={selected === 'cod'}
          onChange={(e) => onSelect(e.target.value)}
          className="w-5 h-5 text-black"
        />
        <Truck className="w-6 h-6 text-gray-600" />
        <div>
          <p className="font-medium">Cash on Delivery</p>
          <p className="text-sm text-gray-500">Pay when you receive your order</p>
        </div>
      </label>
    </div>
  </div>
);

// Order Summary
const OrderSummary = ({ cart, cartTotal }) => {
  const shipping = cartTotal > 5000 ? 0 : 199;
  const total = cartTotal + shipping;

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
      
      <div className="space-y-4 max-h-60 overflow-y-auto">
        {cart.map((item) => (
          <div key={item.variantId} className="flex gap-3">
            <div className="w-16 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0">
              <img src={item.image || 'https://via.placeholder.com/100'} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.title}</p>
              <p className="text-xs text-gray-500">{item.variantTitle}</p>
              <p className="text-sm">Qty: {item.quantity}</p>
            </div>
            <p className="font-medium text-sm">₹{(item.price * item.quantity).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span>₹{cartTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className={shipping === 0 ? 'text-green-600' : ''}>
            {shipping === 0 ? 'FREE' : `₹${shipping}`}
          </span>
        </div>
        <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
          <span>Total</span>
          <span>₹{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure Checkout</span>
        </div>
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4" />
          <span>Fast Delivery</span>
        </div>
      </div>
    </div>
  );
};

// Main Checkout Component
const Checkout = ({ storeName = 'tnvcollection' }) => {
  const navigate = useNavigate();
  const { cart, cartTotal, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    province: '',
    zip: '',
    country: 'IN'
  });
  
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    // Redirect if cart is empty (but not if order was just placed)
    if (cart.length === 0 && !orderPlaced) {
      navigate('/shop/cart');
    }
  }, [cart, navigate, orderPlaced]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.address1.trim()) newErrors.address1 = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.province.trim()) newErrors.province = 'State/Province is required';
    if (!formData.zip.trim()) newErrors.zip = 'Postal code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      setStep(2);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      const shipping = cartTotal > 5000 ? 0 : 199;
      const total = cartTotal + shipping;

      // Create order in backend
      const orderData = {
        store_name: storeName,
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
          province: formData.province,
          zip: formData.zip,
          country: formData.country,
          phone: formData.phone
        },
        line_items: cart.map(item => ({
          variant_id: item.variantId,
          quantity: item.quantity,
          price: item.price,
          title: item.title,
          variant_title: item.variantTitle
        })),
        payment_method: paymentMethod,
        subtotal: cartTotal,
        shipping: shipping,
        total: total
      };

      if (paymentMethod === 'cod') {
        // COD - Create order directly
        const response = await axios.post(`${API}/api/storefront/orders`, orderData);
        
        if (response.data.success) {
          setOrderPlaced(true);  // Prevent cart empty redirect
          clearCart();
          toast.success('Order placed successfully!');
          navigate(`/shop/order-confirmation/${response.data.order_id}`);
        } else {
          throw new Error(response.data.message || 'Failed to create order');
        }
      } else {
        // Razorpay payment
        const loaded = await loadRazorpay();
        if (!loaded) {
          toast.error('Failed to load payment gateway');
          setLoading(false);
          return;
        }

        // Create Razorpay order
        const razorpayResponse = await axios.post(`${API}/api/storefront/create-razorpay-order`, {
          amount: total,
          currency: 'INR',
          order_data: orderData
        });

        if (!razorpayResponse.data.success) {
          throw new Error(razorpayResponse.data.message || 'Failed to create payment order');
        }

        const options = {
          key: RAZORPAY_KEY,
          amount: razorpayResponse.data.amount,
          currency: razorpayResponse.data.currency,
          name: 'TNC Collection',
          description: 'Order Payment',
          order_id: razorpayResponse.data.razorpay_order_id,
          handler: async function (response) {
            try {
              // Verify payment and create order
              const verifyResponse = await axios.post(`${API}/api/storefront/verify-payment`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_data: orderData
              });

              if (verifyResponse.data.success) {
                clearCart();
                navigate(`/shop/order-confirmation/${verifyResponse.data.order_id}`);
                toast.success('Payment successful! Order placed.');
              } else {
                toast.error('Payment verification failed');
              }
            } catch (error) {
              toast.error('Error processing payment');
              console.error('Payment verification error:', error);
            }
          },
          prefill: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            contact: formData.phone
          },
          theme: {
            color: '#000000'
          }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.detail || error.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/shop" className="hover:text-black">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/shop/cart" className="hover:text-black">Cart</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-black">Checkout</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-black' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-black text-white' : 'bg-gray-200'
          }`}>1</div>
          <span className="font-medium">Shipping</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-200">
          <div className={`h-full bg-black transition-all ${step >= 2 ? 'w-full' : 'w-0'}`} />
        </div>
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-black' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-black text-white' : 'bg-gray-200'
          }`}>2</div>
          <span className="font-medium">Payment</span>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {step === 1 ? (
            <div>
              <ShippingForm formData={formData} onChange={handleChange} errors={errors} />
              <div className="flex gap-4 mt-8">
                <Link
                  to="/shop/cart"
                  className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Cart
                </Link>
                <button
                  onClick={handleContinue}
                  className="flex-1 bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          ) : (
            <div>
              <PaymentMethod selected={paymentMethod} onSelect={setPaymentMethod} />
              
              {/* Shipping Summary */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">Shipping to</p>
                    <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                    <p className="text-sm text-gray-600">
                      {formData.address1}{formData.address2 ? `, ${formData.address2}` : ''}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formData.city}, {formData.province} {formData.zip}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="flex-1 bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : paymentMethod === 'cod' ? (
                    'Place Order (COD)'
                  ) : (
                    'Pay Now'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="mt-8 lg:mt-0">
          <OrderSummary cart={cart} cartTotal={cartTotal} />
        </div>
      </div>
    </div>
  );
};

export default Checkout;
