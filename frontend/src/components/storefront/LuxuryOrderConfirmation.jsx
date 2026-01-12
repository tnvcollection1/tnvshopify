import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  CheckCircle2, Package, Truck, MapPin, Phone, Mail,
  Copy, MessageCircle, ArrowRight, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from './LuxuryStorefrontLayout';
import { formatPrice } from './config/storeConfig';

const API = process.env.REACT_APP_BACKEND_URL;

const LuxuryOrderConfirmation = () => {
  const storeConfig = useStore();
  const { storeSlug, orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentStoreSlug = storeSlug || storeConfig?.id || 'tnvcollection';

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`${API}/api/storefront/orders/${orderId}`);
        const data = await response.json();
        if (data.success || data.order) {
          setOrder(data.order || data);
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchOrder();
  }, [orderId]);

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    toast.success('Order ID copied!');
  };

  const contactWhatsApp = () => {
    const whatsappNumber = storeConfig?.contact?.whatsapp?.replace(/[^0-9]/g, '') || '';
    const message = encodeURIComponent(`Hi! I'd like to check on my order #${orderId}`);
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8]" data-testid="luxury-order-confirmation">
      <div className="max-w-[800px] mx-auto px-4 py-12">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-light tracking-wide mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">
            Thank you for your order. We've received it and will process it shortly.
          </p>
        </div>

        {/* Order ID Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Order Number</p>
              <p className="text-xl font-mono font-medium">{orderId}</p>
            </div>
            <button
              onClick={copyOrderId}
              className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition"
              title="Copy Order ID"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-medium mb-6">Order Status</h2>
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />
            
            {/* Status Steps */}
            <div className="space-y-6 relative">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center z-10">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Order Placed</p>
                  <p className="text-sm text-gray-500">Your order has been confirmed</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center z-10">
                  <Package className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-400">Processing</p>
                  <p className="text-sm text-gray-400">We're preparing your order</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center z-10">
                  <Truck className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-400">Shipped</p>
                  <p className="text-sm text-gray-400">On the way to you</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Details */}
        {order && (
          <>
            {/* Shipping Address */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </h2>
              <div className="text-gray-600">
                <p className="font-medium text-black">
                  {order.shipping_address?.first_name} {order.shipping_address?.last_name}
                </p>
                <p>{order.shipping_address?.address1}</p>
                {order.shipping_address?.address2 && <p>{order.shipping_address?.address2}</p>}
                <p>
                  {order.shipping_address?.city}, {order.shipping_address?.province} {order.shipping_address?.zip}
                </p>
                <p>{order.shipping_address?.country}</p>
                <p className="mt-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {order.shipping_address?.phone || order.customer?.phone}
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <h2 className="text-lg font-medium mb-4">Payment</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {order.payment_method === 'cod' ? 'Cash on Delivery' : 
                     order.payment_method === 'online' ? 'Online Payment' : 'WhatsApp Order'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.payment_status === 'pending' ? 'Payment pending' : 'Paid'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  order.payment_status === 'paid' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {order.payment_status === 'paid' ? 'Paid' : 'Pay on Delivery'}
                </span>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <h2 className="text-lg font-medium mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.line_items?.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="w-16 h-20 bg-gray-100 rounded">
                      {item.image && (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover rounded" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      {item.variant_title && item.variant_title !== 'Default Title' && (
                        <p className="text-sm text-gray-500">{item.variant_title}</p>
                      )}
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">
                      {formatPrice(item.price * item.quantity, storeConfig)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(order.subtotal, storeConfig)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>{order.shipping_cost === 0 ? 'Free' : formatPrice(order.shipping_cost, storeConfig)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount, storeConfig)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-medium pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatPrice(order.total, storeConfig)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={contactWhatsApp}
            className="w-full py-4 bg-[#25D366] text-white text-sm tracking-wider uppercase hover:bg-[#128C7E] transition flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Contact Us on WhatsApp
          </button>
          
          <Link
            to={`/store/${currentStoreSlug}`}
            className="w-full py-4 border border-black text-black text-sm tracking-wider uppercase hover:bg-black hover:text-white transition flex items-center justify-center gap-2"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Help Text */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Need help? Contact us at{' '}
            <a href={`mailto:${storeConfig?.contact?.email}`} className="text-black underline">
              {storeConfig?.contact?.email}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LuxuryOrderConfirmation;
