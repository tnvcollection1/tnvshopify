import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Package, Mail, ArrowRight } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`${API}/api/storefront/orders/${orderId}`);
        if (response.data.success) {
          setOrder(response.data.order);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-gray-600">
          Thank you for your purchase. Your order has been received.
        </p>
      </div>

      {/* Order Details Card */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="font-semibold text-lg">#{orderId}</p>
          </div>
          {order?.payment_method && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Payment Method</p>
              <p className="font-medium capitalize">{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
            </div>
          )}
        </div>

        {/* What's Next */}
        <div className="space-y-4">
          <h3 className="font-semibold">What&apos;s Next?</h3>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 border border-gray-200">
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium">Confirmation Email</p>
              <p className="text-sm text-gray-600">
                You will receive an email confirmation shortly at{' '}
                {order?.customer?.email && <span className="font-medium">{order.customer.email}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 border border-gray-200">
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium">Shipping Updates</p>
              <p className="text-sm text-gray-600">
                We&apos;ll notify you when your order ships. Expected delivery: 5-7 business days.
              </p>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        {order?.shipping_address && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="font-semibold mb-2">Shipping Address</h3>
            <p className="text-sm text-gray-600">
              {order.shipping_address.first_name} {order.shipping_address.last_name}<br />
              {order.shipping_address.address1}<br />
              {order.shipping_address.address2 && <>{order.shipping_address.address2}<br /></>}
              {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.zip}<br />
              {order.shipping_address.country}
            </p>
          </div>
        )}

        {/* Order Total */}
        {order?.total && (
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            <span className="font-semibold">Order Total</span>
            <span className="text-xl font-bold">₹{order.total.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Continue Shopping */}
      <div className="text-center space-y-4">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 font-medium hover:bg-gray-800 transition-colors"
        >
          Continue Shopping
          <ArrowRight className="w-5 h-5" />
        </Link>
        
        <p className="text-sm text-gray-500">
          Have questions?{' '}
          <a href="#" className="text-black underline">Contact Support</a>
        </p>
      </div>
    </div>
  );
};

export default OrderConfirmation;
