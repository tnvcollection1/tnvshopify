import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Package, Truck, CheckCircle, Clock, MapPin, Phone, Mail,
  ChevronRight, Copy, ExternalLink, AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from './TNVStoreLayout';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Order status timeline component
const OrderTimeline = ({ timeline, currentStatus }) => {
  return (
    <div className="relative">
      {timeline.map((event, index) => {
        const isLast = index === timeline.length - 1;
        const isCurrent = event.status === currentStatus;
        
        return (
          <div key={index} className="flex gap-4 pb-8 last:pb-0">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  isCurrent 
                    ? 'bg-green-500 text-white ring-4 ring-green-100' 
                    : 'bg-gray-100 text-gray-500'
                }`}
                style={{ backgroundColor: isCurrent ? event.color : undefined }}
              >
                {event.icon}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 mt-2 ${isCurrent ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between">
                <h4 className={`font-semibold ${isCurrent ? 'text-green-600' : 'text-gray-900'}`}>
                  {event.label}
                </h4>
                {isCurrent && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{event.message}</p>
              {event.location && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Main Order Tracking Page
const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const { formatPrice, storeConfig } = useStore();
  const baseUrl = storeConfig?.baseUrl || '/tnv';
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchOrderId, setSearchOrderId] = useState('');
  
  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId);
    } else {
      setLoading(false);
    }
  }, [orderId]);
  
  const fetchOrder = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ecommerce/orders/track/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        toast.error('Order not found');
        setOrder(null);
      }
    } catch (e) {
      toast.error('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchOrderId.trim()) {
      fetchOrder(searchOrderId.trim());
    }
  };
  
  const copyTrackingNumber = () => {
    if (order?.tracking_number) {
      navigator.clipboard.writeText(order.tracking_number);
      toast.success('Tracking number copied!');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Search Form */}
        {!orderId && (
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
            <h1 className="text-2xl font-bold mb-2">Track Your Order</h1>
            <p className="text-gray-500 mb-6">Enter your order ID to see the latest status</p>
            
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="Enter Order ID (e.g., ORD-IN-20240115-ABC123)"
                className="flex-1 px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                data-testid="order-search-input"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800"
                data-testid="order-search-btn"
              >
                Track
              </button>
            </form>
          </div>
        )}
        
        {order && (
          <>
            {/* Order Header */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold">{order.order_id}</h1>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(order.order_id);
                        toast.success('Order ID copied!');
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-gray-500 text-sm">
                    Ordered on {new Date(order.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div 
                    className="px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                    style={{ 
                      backgroundColor: `${order.current_status_color}20`,
                      color: order.current_status_color
                    }}
                  >
                    <span>{order.current_status_icon}</span>
                    <span>{order.current_status_label}</span>
                  </div>
                </div>
              </div>
              
              {/* Tracking Number */}
              {order.tracking_number && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Tracking Number</p>
                    <p className="text-lg font-mono">{order.tracking_number}</p>
                    {order.carrier && <p className="text-sm text-gray-500">via {order.carrier}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyTrackingNumber}
                      className="p-2 hover:bg-blue-100 rounded-lg"
                    >
                      <Copy className="w-5 h-5 text-blue-600" />
                    </button>
                    {order.carrier_tracking_url && (
                      <a
                        href={order.carrier_tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-blue-100 rounded-lg"
                      >
                        <ExternalLink className="w-5 h-5 text-blue-600" />
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              {/* Estimated Delivery */}
              <div className="mt-4 flex items-center gap-3 text-sm">
                <Truck className="w-5 h-5 text-green-600" />
                <span>
                  Estimated Delivery: <strong>{order.estimated_delivery}</strong>
                </span>
              </div>
            </div>
            
            {/* Timeline and Details Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Timeline */}
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-6">Tracking History</h2>
                <OrderTimeline 
                  timeline={order.timeline || []} 
                  currentStatus={order.current_status}
                />
              </div>
              
              {/* Order Details */}
              <div className="space-y-6">
                {/* Items */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold mb-4">Order Items</h3>
                  <div className="space-y-3">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex gap-3">
                        <img
                          src={item.image || 'https://via.placeholder.com/60'}
                          alt={item.name}
                          className="w-14 h-14 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          <p className="text-sm font-medium">{formatPrice(item.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t mt-4 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shipping</span>
                      <span>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{formatPrice(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-2 border-t">
                      <span>Total</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Shipping Address */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold mb-4">Shipping Address</h3>
                  {order.shipping_address && (
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{order.shipping_address.full_name}</p>
                      <p className="text-gray-600">{order.shipping_address.address_line1}</p>
                      {order.shipping_address.address_line2 && (
                        <p className="text-gray-600">{order.shipping_address.address_line2}</p>
                      )}
                      <p className="text-gray-600">
                        {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                      </p>
                      <p className="text-gray-600">{order.shipping_address.country}</p>
                      <div className="flex items-center gap-2 mt-3 text-gray-500">
                        <Phone className="w-4 h-4" />
                        <span>{order.shipping_address.phone}</span>
                      </div>
                      {order.shipping_address.email && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Mail className="w-4 h-4" />
                          <span>{order.shipping_address.email}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Payment Info */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold mb-4">Payment</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Method</span>
                      <span className="capitalize">{order.payment_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className={`capitalize ${
                        order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {order.payment_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <Link
                to={baseUrl}
                className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800"
              >
                Continue Shopping
              </Link>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 border-2 rounded-xl font-medium hover:bg-gray-50"
              >
                Print Receipt
              </button>
            </div>
          </>
        )}
        
        {!order && !loading && orderId && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
            <p className="text-gray-500 mb-6">
              We couldn&apos;t find an order with ID: {orderId}
            </p>
            <Link
              to={`${baseUrl}/track`}
              className="inline-block px-6 py-3 bg-black text-white rounded-xl font-medium"
            >
              Try Again
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
