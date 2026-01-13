import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { 
  Package, Truck, CheckCircle2, Clock, MapPin, Phone, 
  Search, MessageCircle, ArrowRight, Loader2, AlertCircle,
  Box, Home, ClipboardCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from './MrPorterLayout';
import { formatPrice } from '../config/storeConfig';

const API = import.meta.env.VITE_API_URL;

// Order Status Steps
const ORDER_STATUSES = [
  { key: 'pending', label: 'Order Placed', icon: ClipboardCheck },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', icon: Box },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

const getStatusIndex = (status) => {
  const index = ORDER_STATUSES.findIndex(s => s.key === status);
  return index >= 0 ? index : 0;
};

// ===================== ORDER SEARCH =====================

const OrderSearch = ({ onSearch, loading }) => {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (orderId.trim()) {
      onSearch(orderId.trim(), phone.trim());
    }
  };

  return (
    <div className="bg-white p-6 lg:p-8 rounded-lg shadow-sm">
      <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
        <Search className="w-5 h-5" />
        Track Your Order
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">Order Number *</label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g., SF2501121234"
            className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black transition"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">Phone Number (for verification)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !orderId.trim()}
          className="w-full py-4 bg-black text-white text-sm tracking-wider uppercase hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Track Order
            </>
          )}
        </button>
      </form>
    </div>
  );
};

// ===================== ORDER STATUS TRACKER =====================

const OrderStatusTracker = ({ order, storeConfig }) => {
  const currentIndex = getStatusIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="bg-white p-6 lg:p-8 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium">Order Status</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
          order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {order.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      </div>

      {isCancelled ? (
        <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div>
            <p className="font-medium text-red-700">Order Cancelled</p>
            <p className="text-sm text-red-600">
              {order.cancellation_reason || 'This order has been cancelled.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />
          <div 
            className="absolute left-5 top-5 w-0.5 bg-black transition-all duration-500"
            style={{ height: `${(currentIndex / (ORDER_STATUSES.length - 1)) * 100}%` }}
          />

          {/* Status Steps */}
          <div className="space-y-6 relative">
            {ORDER_STATUSES.map((status, index) => {
              const isCompleted = index <= currentIndex;
              const isCurrent = index === currentIndex;
              const StatusIcon = status.icon;

              // Find timestamp from history
              const historyEntry = order.status_history?.find(h => h.status === status.key);
              const timestamp = historyEntry?.timestamp;

              return (
                <div key={status.key} className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors ${
                    isCompleted ? 'bg-black text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 pt-2">
                    <p className={`font-medium ${isCompleted ? 'text-black' : 'text-gray-400'}`}>
                      {status.label}
                    </p>
                    {timestamp && (
                      <p className="text-sm text-gray-500">
                        {new Date(timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                    {isCurrent && status.key === 'shipped' && order.tracking_number && (
                      <div className="mt-2 p-3 bg-blue-50 rounded text-sm">
                        <p className="text-blue-800">
                          <strong>Tracking:</strong> {order.tracking_number}
                        </p>
                        {order.courier && (
                          <p className="text-blue-600">Courier: {order.courier}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estimated Delivery */}
      {order.estimated_delivery && !isCancelled && order.status !== 'delivered' && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-500" />
          <div>
            <p className="text-sm text-gray-500">Estimated Delivery</p>
            <p className="font-medium">
              {new Date(order.estimated_delivery).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================== ORDER DETAILS =====================

const OrderDetails = ({ order, storeConfig }) => {
  return (
    <div className="bg-white p-6 lg:p-8 rounded-lg shadow-sm">
      <h2 className="text-xl font-medium mb-6">Order Details</h2>

      {/* Order Info */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="text-gray-500">Order Number</p>
          <p className="font-mono font-medium">{order.order_id}</p>
        </div>
        <div>
          <p className="text-gray-500">Order Date</p>
          <p className="font-medium">
            {new Date(order.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Payment Method</p>
          <p className="font-medium">
            {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Payment Status</p>
          <p className={`font-medium ${
            order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'
          }`}>
            {order.payment_status === 'paid' ? 'Paid' : 'Pay on Delivery'}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-medium mb-4">Items</h3>
        <div className="space-y-4">
          {order.line_items?.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-16 h-20 bg-gray-100 rounded flex-shrink-0">
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
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 pt-4 mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span>{formatPrice(order.subtotal, storeConfig)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span>{order.shipping_cost === 0 ? 'Free' : formatPrice(order.shipping_cost, storeConfig)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatPrice(order.discount, storeConfig)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-medium pt-2 border-t">
          <span>Total</span>
          <span>{formatPrice(order.total, storeConfig)}</span>
        </div>
      </div>

      {/* Shipping Address */}
      {order.shipping_address && (
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Shipping Address
          </h3>
          <div className="text-gray-600 text-sm">
            <p className="font-medium text-black">
              {order.shipping_address.first_name} {order.shipping_address.last_name}
            </p>
            <p>{order.shipping_address.address1}</p>
            {order.shipping_address.address2 && <p>{order.shipping_address.address2}</p>}
            <p>
              {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.zip}
            </p>
            <p>{order.shipping_address.country}</p>
            <p className="mt-2 flex items-center gap-2">
              <Phone className="w-3 h-3" />
              {order.shipping_address.phone}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================== MAIN COMPONENT =====================

const LuxuryOrderTracking = () => {
  const storeConfig = useStore();
  const { storeSlug } = useParams();
  const [searchParams] = useSearchParams();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const currentStoreSlug = storeSlug || storeConfig?.id || 'tnvcollection';

  // Check for order ID in URL params
  useEffect(() => {
    const orderIdFromUrl = searchParams.get('order');
    if (orderIdFromUrl) {
      handleSearch(orderIdFromUrl, '');
    }
  }, [searchParams]);

  const handleSearch = async (orderId, phone) => {
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await fetch(`${API}/api/storefront/orders/${orderId}`);
      const data = await response.json();

      if (data.success && data.order) {
        // Optional: verify phone number matches
        if (phone) {
          const orderPhone = data.order.customer?.phone || data.order.shipping_address?.phone || '';
          const cleanOrderPhone = orderPhone.replace(/[^0-9]/g, '').slice(-10);
          const cleanSearchPhone = phone.replace(/[^0-9]/g, '').slice(-10);
          
          if (cleanOrderPhone !== cleanSearchPhone) {
            setError('Phone number does not match our records.');
            setOrder(null);
            return;
          }
        }
        setOrder(data.order);
      } else {
        setError('Order not found. Please check your order number.');
        setOrder(null);
      }
    } catch (e) {
      console.error('Search error:', e);
      setError('Failed to fetch order. Please try again.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const contactWhatsApp = () => {
    const whatsappNumber = storeConfig?.contact?.whatsapp?.replace(/[^0-9]/g, '') || '';
    const message = order 
      ? encodeURIComponent(`Hi! I need help with my order #${order.order_id}`)
      : encodeURIComponent(`Hi! I need help tracking my order.`);
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8]" data-testid="luxury-order-tracking">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-4">
          <nav className="text-sm text-gray-500">
            <Link to={`/store/${currentStoreSlug}`} className="hover:text-black transition">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-black">Track Order</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-8">
        <h1 className="text-3xl font-light tracking-wide text-center mb-8">Track Your Order</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Search Form */}
          <div className="lg:col-span-1">
            <OrderSearch onSearch={handleSearch} loading={loading} />
            
            {/* Help Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm mt-6">
              <h3 className="font-medium mb-4">Need Help?</h3>
              <button
                onClick={contactWhatsApp}
                className="w-full py-3 bg-[#25D366] text-white text-sm tracking-wider uppercase hover:bg-[#128C7E] transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Chat on WhatsApp
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                Available {storeConfig?.contact?.support_hours || '10 AM - 7 PM'}
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {!searched && !order && (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Enter your order number</h3>
                <p className="text-gray-500">
                  Your order number was sent to you via email and WhatsApp when you placed your order.
                </p>
              </div>
            )}

            {order && (
              <>
                <OrderStatusTracker order={order} storeConfig={storeConfig} />
                <OrderDetails order={order} storeConfig={storeConfig} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LuxuryOrderTracking;
