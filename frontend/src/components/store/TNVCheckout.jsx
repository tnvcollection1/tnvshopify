import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Truck, CreditCard, MapPin, Phone, Mail, User, Check, Shield, Lock } from 'lucide-react';
import { useStore } from './TNVStoreLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TNVCheckout = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, formatPrice, region, storeName, storeConfig } = useStore();
  const baseUrl = storeConfig?.baseUrl || '/tnv';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: storeConfig?.country || region?.name || 'India',
    postalCode: '',
    paymentMethod: 'cod'
  });

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const deliveryFee = cartTotal >= 500 ? 0 : 50;
  const total = cartTotal + deliveryFee;

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const orderData = {
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        },
        shipping_address: {
          address: formData.address,
          city: formData.city,
          country: formData.country,
          postalCode: formData.postalCode
        },
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          color: item.color
        })),
        subtotal: cartTotal,
        deliveryFee,
        total,
        paymentMethod: formData.paymentMethod,
        store: storeName,
        currency: storeConfig?.currency || region?.currency || 'INR'
      };

      const res = await fetch(`${API_URL}/api/storefront/orders/cod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const data = await res.json();
      
      if (data.order_id || data.success) {
        navigate(`${baseUrl}/order-confirmation/${data.order_id || data.orderId}`);
      } else {
        alert('Failed to place order. Please try again.');
      }
    } catch (e) {
      console.error('Error placing order:', e);
      alert('Error placing order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <Link to={baseUrl} className="text-blue-500 hover:underline">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={`${baseUrl}/cart`} className="flex items-center text-gray-600 hover:text-black">
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span>Back to Bag</span>
            </Link>
            <h1 className="text-xl font-bold">Checkout</h1>
            <div className="w-24" />
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center space-x-4">
            {[
              { num: 1, label: 'Shipping' },
              { num: 2, label: 'Payment' },
              { num: 3, label: 'Confirm' }
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                {idx > 0 && <div className={`w-12 h-0.5 ${step >= s.num ? 'bg-black' : 'bg-gray-200'}`} />}
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step >= s.num ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-sm hidden sm:inline ${step >= s.num ? 'font-medium' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping */}
            {step === 1 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <MapPin className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Shipping Address</h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="John"
                        required
                        data-testid="checkout-first-name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Doe"
                      required
                      data-testid="checkout-last-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="john@example.com"
                        required
                        data-testid="checkout-email"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="+971 50 123 4567"
                        required
                        data-testid="checkout-phone"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-2">Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Street address, building, apartment"
                      required
                      data-testid="checkout-address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Dubai"
                      required
                      data-testid="checkout-city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Country</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
                      data-testid="checkout-country"
                    >
                      <option>UAE</option>
                      <option>Saudi Arabia</option>
                      <option>Kuwait</option>
                      <option>Qatar</option>
                      <option>Bahrain</option>
                      <option>Oman</option>
                      <option>Pakistan</option>
                      <option>India</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.address || !formData.city}
                  className="w-full mt-6 py-4 bg-black text-white rounded-full font-bold text-lg hover:bg-gray-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                  data-testid="continue-to-payment"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <CreditCard className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Payment Method</h2>
                </div>

                <div className="space-y-4">
                  {/* COD */}
                  <label className={`block p-4 border-2 rounded-xl cursor-pointer transition ${
                    formData.paymentMethod === 'cod' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-center space-x-4">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={formData.paymentMethod === 'cod'}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-black focus:ring-black"
                      />
                      <div className="flex-1">
                        <p className="font-bold">Cash on Delivery</p>
                        <p className="text-sm text-gray-500">Pay when you receive your order</p>
                      </div>
                      <div className="text-2xl">💵</div>
                    </div>
                  </label>

                  {/* Card */}
                  <label className={`block p-4 border-2 rounded-xl cursor-pointer transition ${
                    formData.paymentMethod === 'card' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-center space-x-4">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={formData.paymentMethod === 'card'}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-black focus:ring-black"
                      />
                      <div className="flex-1">
                        <p className="font-bold">Credit / Debit Card</p>
                        <p className="text-sm text-gray-500">Visa, Mastercard, American Express</p>
                      </div>
                      <div className="flex space-x-1">
                        <span className="text-xs bg-blue-600 text-white px-1 rounded">VISA</span>
                        <span className="text-xs bg-red-500 text-white px-1 rounded">MC</span>
                      </div>
                    </div>
                  </label>

                  {/* Apple Pay */}
                  <label className={`block p-4 border-2 rounded-xl cursor-pointer transition ${
                    formData.paymentMethod === 'applepay' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-center space-x-4">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="applepay"
                        checked={formData.paymentMethod === 'applepay'}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-black focus:ring-black"
                      />
                      <div className="flex-1">
                        <p className="font-bold">Apple Pay</p>
                        <p className="text-sm text-gray-500">Fast and secure payment</p>
                      </div>
                      <div className="text-2xl">🍎</div>
                    </div>
                  </label>
                </div>

                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 border-2 border-black rounded-full font-bold hover:bg-gray-100 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-4 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition"
                    data-testid="continue-to-confirm"
                  >
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Shipping Summary */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">Shipping Address</h3>
                    <button onClick={() => setStep(1)} className="text-sm text-blue-600 hover:underline">Edit</button>
                  </div>
                  <p className="text-gray-700">{formData.firstName} {formData.lastName}</p>
                  <p className="text-gray-500">{formData.address}</p>
                  <p className="text-gray-500">{formData.city}, {formData.country}</p>
                  <p className="text-gray-500">{formData.phone}</p>
                </div>

                {/* Payment Summary */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">Payment Method</h3>
                    <button onClick={() => setStep(2)} className="text-sm text-blue-600 hover:underline">Edit</button>
                  </div>
                  <p className="text-gray-700">
                    {formData.paymentMethod === 'cod' && '💵 Cash on Delivery'}
                    {formData.paymentMethod === 'card' && '💳 Credit / Debit Card'}
                    {formData.paymentMethod === 'applepay' && '🍎 Apple Pay'}
                  </p>
                </div>

                {/* Items Summary */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold mb-4">Order Items ({cart.length})</h3>
                  <div className="space-y-4">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <img 
                          src={item.image || 'https://via.placeholder.com/80x100?text=No+Image'} 
                          alt={item.title}
                          className="w-16 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                          <p className="text-xs text-gray-500">
                            {item.size && `Size: ${item.size}`} {item.color && `| Color: ${item.color}`}
                          </p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          <p className="font-bold text-sm mt-1">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className="w-full py-4 bg-black text-white rounded-full font-bold text-lg hover:bg-gray-800 transition disabled:bg-gray-400 flex items-center justify-center space-x-2"
                  data-testid="place-order-btn"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Place Order - {formatPrice(total)}</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Shield className="w-4 h-4" />
                  <span>Secure checkout - 256-bit SSL encryption</span>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-32">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>
              
              <div className="max-h-60 overflow-y-auto space-y-3 mb-4">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="relative">
                      <img 
                        src={item.image || 'https://via.placeholder.com/60x75?text=No+Image'} 
                        alt={item.title}
                        className="w-14 h-18 object-cover rounded"
                      />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white text-xs rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        {item.size && item.size} {item.color && `/ ${item.color}`}
                      </p>
                      <p className="text-sm font-bold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery</span>
                  <span className={deliveryFee === 0 ? 'text-green-600' : ''}>
                    {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center space-x-2 text-sm text-gray-500">
                <Truck className="w-4 h-4 text-green-600" />
                <span>Estimated delivery: 2-5 business days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TNVCheckout;
