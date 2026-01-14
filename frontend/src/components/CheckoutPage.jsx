import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Trash2, Plus, Minus, CreditCard, Truck, Tag,
  MapPin, Phone, Mail, User, ChevronRight, Check, Loader2,
  AlertCircle, ShieldCheck, Lock
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Generate or get session ID
const getSessionId = () => {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Cart, 2: Shipping, 3: Payment
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Cart state
  const [cart, setCart] = useState({ items: [], subtotal: 0, shipping: 0, discount: 0, total: 0 });
  
  // Shipping state
  const [shipping, setShipping] = useState({
    full_name: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'UAE'
  });
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  
  // Order state
  const [order, setOrder] = useState(null);

  const sessionId = getSessionId();

  useEffect(() => {
    fetchCart();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const fetchCart = async () => {
    try {
      const res = await fetch(`${API}/api/checkout/cart/${sessionId}`);
      const data = await res.json();
      setCart(data);
    } catch (e) {
      console.error('Failed to fetch cart:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    try {
      await fetch(`${API}/api/checkout/cart/update?session_id=${sessionId}&product_id=${productId}&quantity=${newQuantity}`, {
        method: 'POST'
      });
      fetchCart();
    } catch (e) {
      toast.error('Failed to update cart');
    }
  };

  const removeItem = async (productId) => {
    try {
      await fetch(`${API}/api/checkout/cart/${sessionId}/item/${productId}`, {
        method: 'DELETE'
      });
      fetchCart();
      toast.success('Item removed');
    } catch (e) {
      toast.error('Failed to remove item');
    }
  };

  const applyCoupon = async () => {
    if (!couponCode) return;
    
    try {
      const res = await fetch(`${API}/api/checkout/coupon/validate?code=${couponCode}&subtotal=${cart.subtotal}`, {
        method: 'POST'
      });
      
      if (res.ok) {
        const data = await res.json();
        setAppliedCoupon(data);
        setCart(prev => ({
          ...prev,
          discount: data.discount,
          total: prev.subtotal + prev.shipping - data.discount
        }));
        toast.success(`Coupon applied! You saved AED ${data.discount}`);
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Invalid coupon');
      }
    } catch (e) {
      toast.error('Failed to apply coupon');
    }
  };

  const handleShippingChange = (e) => {
    const { name, value } = e.target;
    setShipping(prev => ({ ...prev, [name]: value }));
  };

  const validateShipping = () => {
    const required = ['full_name', 'phone', 'address_line1', 'city', 'state', 'postal_code'];
    for (const field of required) {
      if (!shipping[field]) {
        toast.error(`Please fill in ${field.replace('_', ' ')}`);
        return false;
      }
    }
    return true;
  };

  const createOrder = async () => {
    if (!validateShipping()) return;
    
    setProcessing(true);
    
    try {
      const res = await fetch(`${API}/api/checkout/order/create?session_id=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items,
          shipping_address: shipping,
          payment_method: paymentMethod,
          coupon_code: appliedCoupon?.code
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create order');
      }
      
      if (paymentMethod === 'cod') {
        // COD order - show success
        setOrder(data);
        setStep(4);
        toast.success('Order placed successfully!');
      } else {
        // Razorpay payment
        openRazorpay(data);
      }
    } catch (e) {
      toast.error(e.message || 'Failed to create order');
    } finally {
      setProcessing(false);
    }
  };

  const openRazorpay = (orderData) => {
    const options = {
      key: orderData.razorpay_key,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'TNV Collection',
      description: `Order #${orderData.order_id}`,
      order_id: orderData.razorpay_order_id,
      handler: async (response) => {
        // Verify payment
        try {
          const verifyRes = await fetch(`${API}/api/checkout/order/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          
          const result = await verifyRes.json();
          
          if (verifyRes.ok) {
            setOrder({ ...orderData, ...result });
            setStep(4);
            toast.success('Payment successful!');
          } else {
            toast.error('Payment verification failed');
          }
        } catch (e) {
          toast.error('Payment verification failed');
        }
      },
      prefill: {
        name: orderData.customer.name,
        email: orderData.customer.email || '',
        contact: orderData.customer.phone
      },
      theme: {
        color: '#000000'
      },
      modal: {
        ondismiss: () => {
          toast.info('Payment cancelled');
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const formatCurrency = (value) => `AED ${(value || 0).toFixed(2)}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Order Success Page
  if (step === 4 && order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-gray-500 mb-6">Thank you for your order</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500">Order ID</p>
              <p className="text-xl font-bold">{order.order_id}</p>
            </div>
            
            <div className="space-y-3 text-left mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-medium capitalize">{paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-bold">{formatCurrency(order.total_aed || order.total)}</span>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/tnv')}
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Steps */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            {[
              { num: 1, label: 'Cart' },
              { num: 2, label: 'Shipping' },
              { num: 3, label: 'Payment' }
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                <div 
                  className={`flex items-center gap-2 cursor-pointer ${step >= s.num ? 'text-black' : 'text-gray-400'}`}
                  onClick={() => step > s.num && setStep(s.num)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s.num ? 'bg-black text-white' : 'bg-gray-200'
                  }`}>
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className="hidden sm:inline font-medium">{s.label}</span>
                </div>
                {i < 2 && <ChevronRight className="w-5 h-5 text-gray-300" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Cart */}
            {step === 1 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Your Cart ({cart.items?.length || 0} items)
                </h2>
                
                {cart.items?.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Your cart is empty</p>
                    <button
                      onClick={() => navigate('/tnv')}
                      className="mt-4 px-6 py-2 bg-black text-white rounded-lg"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.items?.map(item => (
                      <div key={item.product_id} className="flex gap-4 pb-4 border-b">
                        <img
                          src={item.image || 'https://via.placeholder.com/100'}
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{item.name}</h3>
                          {item.size && <p className="text-sm text-gray-500">Size: {item.size}</p>}
                          {item.color && <p className="text-sm text-gray-500">Color: {item.color}</p>}
                          <p className="font-bold mt-1">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                          <button
                            onClick={() => removeItem(item.product_id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <div className="flex items-center gap-2 border rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              className="p-2 hover:bg-gray-100"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              className="p-2 hover:bg-gray-100"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Shipping */}
            {step === 2 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        name="full_name"
                        value={shipping.full_name}
                        onChange={handleShippingChange}
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        name="phone"
                        value={shipping.phone}
                        onChange={handleShippingChange}
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="+971 50 123 4567"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        name="email"
                        type="email"
                        value={shipping.email}
                        onChange={handleShippingChange}
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                    <input
                      name="address_line1"
                      value={shipping.address_line1}
                      onChange={handleShippingChange}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="Street address, building name"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input
                      name="address_line2"
                      value={shipping.address_line2}
                      onChange={handleShippingChange}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="Apartment, suite, unit (optional)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      name="city"
                      value={shipping.city}
                      onChange={handleShippingChange}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="Dubai"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State/Emirate *</label>
                    <input
                      name="state"
                      value={shipping.state}
                      onChange={handleShippingChange}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="Dubai"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                    <input
                      name="postal_code"
                      value={shipping.postal_code}
                      onChange={handleShippingChange}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="00000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <select
                      name="country"
                      value={shipping.country}
                      onChange={handleShippingChange}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="UAE">United Arab Emirates</option>
                      <option value="SA">Saudi Arabia</option>
                      <option value="KW">Kuwait</option>
                      <option value="QA">Qatar</option>
                      <option value="BH">Bahrain</option>
                      <option value="OM">Oman</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Method
                  </h2>
                  
                  <div className="space-y-3">
                    <label 
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
                        paymentMethod === 'razorpay' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="razorpay"
                        checked={paymentMethod === 'razorpay'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-5 h-5"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Pay Online (Razorpay)</p>
                        <p className="text-sm text-gray-500">Credit/Debit Card, UPI, Net Banking</p>
                      </div>
                      <div className="flex gap-2">
                        <img src="https://cdn.razorpay.com/static/assets/logo/payment.svg" alt="Razorpay" className="h-6" />
                      </div>
                    </label>
                    
                    <label 
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
                        paymentMethod === 'cod' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-5 h-5"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Cash on Delivery</p>
                        <p className="text-sm text-gray-500">Pay when you receive your order</p>
                      </div>
                      <Truck className="w-6 h-6 text-gray-400" />
                    </label>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Secure Payment
                  </span>
                  <span className="flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    SSL Encrypted
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>
              
              {/* Coupon Code */}
              {step < 4 && (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                        disabled={!!appliedCoupon}
                      />
                    </div>
                    <button
                      onClick={applyCoupon}
                      disabled={!!appliedCoupon || !couponCode}
                      className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-green-600 text-sm mt-2 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Coupon applied: -{formatCurrency(appliedCoupon.discount)}
                    </p>
                  )}
                </div>
              )}
              
              {/* Price Breakdown */}
              <div className="space-y-3 py-4 border-t border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span>{cart.shipping === 0 ? 'FREE' : formatCurrency(cart.shipping)}</span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(cart.discount)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between py-4 text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(cart.total)}</span>
              </div>
              
              {/* Action Button */}
              {step === 1 && cart.items?.length > 0 && (
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
                >
                  Proceed to Shipping
                </button>
              )}
              
              {step === 2 && (
                <button
                  onClick={() => validateShipping() && setStep(3)}
                  className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
                >
                  Continue to Payment
                </button>
              )}
              
              {step === 3 && (
                <button
                  onClick={createOrder}
                  disabled={processing}
                  className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'cod' ? 'Place Order' : 'Pay Now'}
                    </>
                  )}
                </button>
              )}
              
              {/* Info */}
              {cart.subtotal > 0 && cart.subtotal < 200 && (
                <p className="text-sm text-center text-gray-500 mt-4">
                  Add {formatCurrency(200 - cart.subtotal)} more for free shipping!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
