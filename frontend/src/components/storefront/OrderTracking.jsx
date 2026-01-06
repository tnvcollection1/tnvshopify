import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  Search,
  ChevronRight,
  Box,
  CircleDot,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Status configuration with colors and icons
const ORDER_STATUSES = {
  pending: {
    label: 'Order Placed',
    description: 'Your order has been received',
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500'
  },
  confirmed: {
    label: 'Confirmed',
    description: 'Order confirmed and being prepared',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500'
  },
  processing: {
    label: 'Processing',
    description: 'Your order is being processed',
    icon: Box,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500'
  },
  shipped: {
    label: 'Shipped',
    description: 'Your order is on its way',
    icon: Truck,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500'
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    description: 'Your order will arrive today',
    icon: MapPin,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-500'
  },
  delivered: {
    label: 'Delivered',
    description: 'Order has been delivered',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-600'
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Order has been cancelled',
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500'
  }
};

const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

// Order Lookup Form
const OrderLookup = ({ onSearch, loading }) => {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!orderId.trim()) {
      toast.error('Please enter your order number');
      return;
    }
    onSearch(orderId.trim(), email.trim());
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Track Your Order</h1>
        <p className="text-gray-600">Enter your order number to see the delivery status</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Order Number *
          </label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g., SF26010618069467"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email (optional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="For additional verification"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Track Order
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Can't find your order number? Check your confirmation email or{' '}
        <a href="#" className="text-black underline">contact support</a>
      </p>
    </div>
  );
};

// Status Timeline Component
const StatusTimeline = ({ currentStatus, statusHistory = [] }) => {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  
  // If cancelled, show special view
  if (currentStatus === 'cancelled') {
    const config = ORDER_STATUSES.cancelled;
    const Icon = config.icon;
    return (
      <div className={`p-6 ${config.bgColor} rounded-lg border-2 ${config.borderColor}`}>
        <div className="flex items-center gap-4">
          <Icon className={`w-10 h-10 ${config.color}`} />
          <div>
            <p className={`font-semibold text-lg ${config.color}`}>{config.label}</p>
            <p className="text-gray-600">{config.description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {STATUS_FLOW.map((status, index) => {
        const config = ORDER_STATUSES[status];
        const Icon = config.icon;
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === STATUS_FLOW.length - 1;
        
        // Find timestamp from history
        const historyEntry = statusHistory.find(h => h.status === status);
        const timestamp = historyEntry?.timestamp;

        return (
          <div key={status} className="flex gap-4">
            {/* Timeline Line & Dot */}
            <div className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isCurrent 
                    ? `${config.bgColor} ${config.borderColor} border-2` 
                    : isCompleted 
                      ? 'bg-green-500' 
                      : 'bg-gray-200'
                }`}
              >
                {isCompleted && !isCurrent ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Icon className={`w-5 h-5 ${isCurrent ? config.color : 'text-gray-400'}`} />
                )}
              </div>
              {!isLast && (
                <div 
                  className={`w-0.5 h-16 ${
                    index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-8 ${isCurrent ? '' : ''}`}>
              <p className={`font-medium ${isCurrent ? 'text-black' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                {config.label}
              </p>
              <p className={`text-sm ${isCurrent ? 'text-gray-600' : 'text-gray-400'}`}>
                {config.description}
              </p>
              {timestamp && (
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Order Details Card
const OrderDetails = ({ order }) => {
  const config = ORDER_STATUSES[order.status] || ORDER_STATUSES.pending;
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Status Header */}
      <div className={`${config.bgColor} p-6 border-b ${config.borderColor} border-l-4`}>
        <div className="flex items-center gap-4">
          <Icon className={`w-8 h-8 ${config.color}`} />
          <div>
            <p className={`font-semibold text-lg ${config.color}`}>{config.label}</p>
            <p className="text-gray-600">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Order Info */}
      <div className="p-6 space-y-6">
        {/* Order Number & Date */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="font-semibold text-lg">#{order.order_id}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Order Date</p>
            <p className="font-medium">
              {new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Tracking Number */}
        {order.tracking_number && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Tracking Number</p>
            <p className="font-mono font-medium">{order.tracking_number}</p>
            {order.courier && (
              <p className="text-sm text-gray-500 mt-1">via {order.courier}</p>
            )}
          </div>
        )}

        {/* Estimated Delivery */}
        {order.estimated_delivery && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <Truck className="w-6 h-6 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Estimated Delivery</p>
              <p className="font-semibold text-blue-700">
                {new Date(order.estimated_delivery).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short'
                })}
              </p>
            </div>
          </div>
        )}

        {/* Shipping Address */}
        {order.shipping_address && (
          <div>
            <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Shipping Address
            </p>
            <div className="text-sm">
              <p className="font-medium">
                {order.shipping_address.first_name} {order.shipping_address.last_name}
              </p>
              <p className="text-gray-600">{order.shipping_address.address1}</p>
              {order.shipping_address.address2 && (
                <p className="text-gray-600">{order.shipping_address.address2}</p>
              )}
              <p className="text-gray-600">
                {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.zip}
              </p>
              <p className="text-gray-600">{order.shipping_address.country}</p>
            </div>
          </div>
        )}

        {/* Order Items */}
        {order.line_items && order.line_items.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-3">Order Items</p>
            <div className="space-y-3">
              {order.line_items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    {item.variant_title && (
                      <p className="text-sm text-gray-500">{item.variant_title}</p>
                    )}
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">₹{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Total */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>₹{order.subtotal?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Shipping</span>
            <span className={order.shipping === 0 ? 'text-green-600' : ''}>
              {order.shipping === 0 ? 'FREE' : `₹${order.shipping}`}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>Total</span>
            <span>₹{order.total?.toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-500 text-right">
            Payment: {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
          </p>
        </div>

        {/* Contact Info */}
        {order.customer && (
          <div className="pt-4 border-t flex gap-4 text-sm">
            <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2 text-gray-600 hover:text-black">
              <Mail className="w-4 h-4" />
              {order.customer.email}
            </a>
            <a href={`tel:${order.customer.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-black">
              <Phone className="w-4 h-4" />
              {order.customer.phone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Order Tracking Component
const OrderTracking = () => {
  const { orderId: urlOrderId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const fetchOrder = async (orderId, email = '') => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      
      const response = await axios.get(
        `${API}/api/storefront/orders/${orderId}/track${params.toString() ? `?${params}` : ''}`
      );
      
      if (response.data.success) {
        setOrder(response.data.order);
      } else {
        setError(response.data.message || 'Order not found');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.detail || 'Order not found. Please check your order number.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch if orderId in URL
  useEffect(() => {
    if (urlOrderId) {
      const email = searchParams.get('email') || '';
      fetchOrder(urlOrderId, email);
    }
  }, [urlOrderId, searchParams]);

  const handleSearch = (orderId, email) => {
    // Update URL for bookmarking
    window.history.pushState({}, '', `/shop/track/${orderId}${email ? `?email=${email}` : ''}`);
    fetchOrder(orderId, email);
  };

  const handleNewSearch = () => {
    setOrder(null);
    setError(null);
    window.history.pushState({}, '', '/shop/track');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link to="/shop" className="hover:text-black">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-black">Track Order</span>
      </nav>

      {!order && !error && (
        <OrderLookup onSearch={handleSearch} loading={loading} />
      )}

      {error && (
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleNewSearch}
            className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {order && (
        <div className="space-y-8">
          {/* Back Button */}
          <button
            onClick={handleNewSearch}
            className="text-sm text-gray-600 hover:text-black flex items-center gap-1"
          >
            ← Track another order
          </button>

          <div className="lg:grid lg:grid-cols-5 lg:gap-8">
            {/* Timeline - Left Side */}
            <div className="lg:col-span-2 mb-8 lg:mb-0">
              <h2 className="text-lg font-semibold mb-6">Order Status</h2>
              <StatusTimeline 
                currentStatus={order.status} 
                statusHistory={order.status_history || []}
              />
            </div>

            {/* Order Details - Right Side */}
            <div className="lg:col-span-3">
              <OrderDetails order={order} />
            </div>
          </div>

          {/* Need Help */}
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-gray-600 text-sm mb-4">
              If you have any questions about your order, our support team is here to help.
            </p>
            <a 
              href="#" 
              className="inline-flex items-center gap-2 text-black font-medium hover:underline"
            >
              Contact Support
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
