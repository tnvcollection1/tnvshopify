import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Package, Truck, Mail, Phone, MapPin, ArrowRight, Copy, Check } from 'lucide-react';
import { useStore } from './TNVStoreLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TNVOrderConfirmation = () => {
  const { orderId } = useParams();
  const { formatPrice, region } = useStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`${API_URL}/api/storefront/orders/${orderId}`);
      const data = await res.json();
      setOrder(data.order || data);
    } catch (e) {
      console.error('Error fetching order:', e);
    } finally {
      setLoading(false);
    }
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Success Header */}
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your order. We'll send you a confirmation email shortly.
          </p>

          {/* Order ID */}
          <div className="inline-flex items-center bg-gray-100 rounded-full px-4 py-2 space-x-2">
            <span className="text-sm text-gray-600">Order ID:</span>
            <span className="font-mono font-bold">{orderId}</span>
            <button onClick={copyOrderId} className="p-1 hover:bg-gray-200 rounded">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Order Timeline */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-lg mb-6">Order Status</h2>
          <div className="flex items-center justify-between">
            {[
              { icon: CheckCircle, label: 'Confirmed', active: true },
              { icon: Package, label: 'Processing', active: false },
              { icon: Truck, label: 'Shipped', active: false },
              { icon: CheckCircle, label: 'Delivered', active: false },
            ].map((step, idx) => (
              <React.Fragment key={step.label}>
                {idx > 0 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${step.active ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 ${step.active ? 'font-medium' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Order Details */}
        {order && (
          <>
            {/* Items */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              <h2 className="font-bold text-lg mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <img 
                      src={item.image || 'https://via.placeholder.com/80x100?text=Product'} 
                      alt={item.title}
                      className="w-20 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-500">
                        {item.size && `Size: ${item.size}`} {item.color && `| Color: ${item.color}`}
                      </p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      <p className="font-bold mt-1">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(order.subtotal || order.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery</span>
                  <span className={order.deliveryFee === 0 ? 'text-green-600' : ''}>
                    {order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee || 0)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Delivery Address
                </h3>
                <p className="text-gray-700">
                  {order.customer?.firstName} {order.customer?.lastName}
                </p>
                <p className="text-gray-500">{order.shipping_address?.address}</p>
                <p className="text-gray-500">
                  {order.shipping_address?.city}, {order.shipping_address?.country}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Contact Info
                </h3>
                <p className="text-gray-700 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  {order.customer?.email}
                </p>
                <p className="text-gray-700 flex items-center mt-2">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  {order.customer?.phone}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            to={`/tnv/track/${orderId}`}
            className="flex-1 py-4 bg-black text-white rounded-full font-bold text-center hover:bg-gray-800 transition flex items-center justify-center space-x-2"
          >
            <Truck className="w-5 h-5" />
            <span>Track Order</span>
          </Link>
          <Link 
            to="/tnv"
            className="flex-1 py-4 border-2 border-black rounded-full font-bold text-center hover:bg-gray-100 transition flex items-center justify-center space-x-2"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Need help? <a href="#" className="text-black underline">Contact Support</a></p>
        </div>
      </div>
    </div>
  );
};

export default TNVOrderConfirmation;
