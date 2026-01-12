import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronDown,
  Eye,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Edit2,
  ChevronRight,
  X,
  MessageCircle,
  ExternalLink,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { useStore } from '../contexts/StoreContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Status configuration
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-blue-100 text-blue-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-800', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800', icon: MapPin },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle }
};

const PAYMENT_STATUS = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800' }
};

// Status Badge Component
const StatusBadge = ({ status, type = 'order' }) => {
  const config = type === 'payment' 
    ? PAYMENT_STATUS[status] || PAYMENT_STATUS.pending
    : STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// Update Status Modal
const UpdateStatusModal = ({ order, open, onClose, onUpdate }) => {
  const [status, setStatus] = useState(order?.status || 'pending');
  const [trackingNumber, setTrackingNumber] = useState(order?.tracking_number || '');
  const [courier, setCourier] = useState(order?.courier || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [whatsAppNotification, setWhatsAppNotification] = useState(null);

  useEffect(() => {
    if (order) {
      setStatus(order.status || 'pending');
      setTrackingNumber(order.tracking_number || '');
      setCourier(order.courier || '');
      setNote('');
      setWhatsAppNotification(null);
    }
  }, [order]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        status,
        note: note || `Status updated to ${status}`,
        send_whatsapp: sendWhatsApp
      };
      
      if (status === 'shipped' || trackingNumber) {
        payload.tracking_number = trackingNumber;
        payload.courier = courier;
      }

      const response = await axios.put(
        `${API}/api/storefront/orders/${order.order_id}/status`,
        payload
      );

      if (response.data.success) {
        toast.success(`Order status updated to ${status}`);
        
        // Show WhatsApp notification if available
        if (response.data.whatsapp_notification && sendWhatsApp) {
          setWhatsAppNotification(response.data.whatsapp_notification);
        } else {
          onUpdate();
          onClose();
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.detail || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    if (whatsAppNotification?.link) {
      window.open(whatsAppNotification.link, '_blank');
    }
    setWhatsAppNotification(null);
    onUpdate();
    onClose();
  };

  const skipWhatsApp = () => {
    setWhatsAppNotification(null);
    onUpdate();
    onClose();
  };

  if (!order) return null;

  // Show WhatsApp notification dialog after successful update
  if (whatsAppNotification) {
    return (
      <Dialog open={open} onOpenChange={skipWhatsApp}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <MessageCircle className="w-5 h-5" />
              Send WhatsApp Notification
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-3">
              Customer: <strong>{whatsAppNotification.phone}</strong>
            </p>
            <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-sans">
                {whatsAppNotification.message}
              </pre>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={skipWhatsApp}>
              Skip
            </Button>
            <Button onClick={openWhatsApp} className="bg-green-600 hover:bg-green-700">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            Update Order Status
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Order
            </label>
            <p className="text-sm text-gray-600">#{order.order_id}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(status === 'shipped' || status === 'out_for_delivery') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tracking Number
                </label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Courier
                </label>
                <Select value={courier} onValueChange={setCourier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select courier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DTDC Express">DTDC Express</SelectItem>
                    <SelectItem value="Delhivery">Delhivery</SelectItem>
                    <SelectItem value="BlueDart">BlueDart</SelectItem>
                    <SelectItem value="Ecom Express">Ecom Express</SelectItem>
                    <SelectItem value="India Post">India Post</SelectItem>
                    <SelectItem value="TCS">TCS (Pakistan)</SelectItem>
                    <SelectItem value="Leopards">Leopards (Pakistan)</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Note (optional)
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for this status change"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="flex-1 bg-[#008060] hover:bg-[#006e52]"
            >
              {loading ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Order Detail Modal
const OrderDetailModal = ({ order, open, onClose }) => {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Order #{order.order_id}</DialogTitle>
            <div className="flex gap-2">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.payment_status} type="payment" />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {new Date(order.created_at).toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Customer Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Customer
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <p className="font-medium">
                  {order.customer?.first_name} {order.customer?.last_name}
                </p>
                {order.customer?.email && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3.5 h-3.5" />
                    {order.customer.email}
                  </p>
                )}
                {order.customer?.phone && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-3.5 h-3.5" />
                    {order.customer.phone}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Shipping Address
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
                <p>{order.shipping_address?.first_name} {order.shipping_address?.last_name}</p>
                <p>{order.shipping_address?.address1}</p>
                {order.shipping_address?.address2 && <p>{order.shipping_address.address2}</p>}
                <p>
                  {order.shipping_address?.city}, {order.shipping_address?.province} {order.shipping_address?.zip}
                </p>
                <p>{order.shipping_address?.country}</p>
              </div>
            </div>

            {order.tracking_number && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Tracking
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="font-mono">{order.tracking_number}</p>
                  {order.courier && <p className="text-gray-500">via {order.courier}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Order Items & Payment */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Items</h3>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                {order.line_items?.map((item, idx) => (
                  <div key={idx} className="p-3 flex justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.variant_title && (
                        <p className="text-xs text-gray-500">{item.variant_title}</p>
                      )}
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Payment
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{order.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className={order.shipping === 0 ? 'text-green-600' : ''}>
                    {order.shipping === 0 ? 'FREE' : `₹${order.shipping}`}
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>₹{order.total?.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Method: </span>
                  <span className="font-medium">
                    {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status History */}
            {order.status_history?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Status History
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {order.status_history.slice().reverse().map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
                      <div>
                        <p className="font-medium capitalize">{entry.status.replace(/_/g, ' ')}</p>
                        <p className="text-gray-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                        {entry.note && <p className="text-gray-600">{entry.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
const StorefrontOrders = () => {
  const { selectedStore } = useStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  
  // Modal states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [orderToUpdate, setOrderToUpdate] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Note: Storefront orders are not filtered by store since they come from the public storefront
      // The store_name in storefront orders represents where the order was placed
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('page', page);
      params.append('limit', 25);

      const response = await axios.get(`${API}/api/storefront/orders?${params}`);
      
      if (response.data.success) {
        setOrders(response.data.orders || []);
        setTotalOrders(response.data.total || 0);
        setTotalPages(response.data.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  const handleUpdateStatus = (order) => {
    setOrderToUpdate(order);
    setStatusModalOpen(true);
  };

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_id?.toLowerCase().includes(query) ||
      order.customer?.first_name?.toLowerCase().includes(query) ||
      order.customer?.last_name?.toLowerCase().includes(query) ||
      order.customer?.email?.toLowerCase().includes(query) ||
      order.customer?.phone?.includes(query)
    );
  });

  // Stats
  const stats = {
    total: totalOrders,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Storefront Orders</h1>
              <p className="text-sm text-gray-500">Manage orders from your online storefront</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchOrders}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <div 
            className={`bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-blue-300 transition-colors ${statusFilter === 'pending' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          >
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-semibold text-blue-600">{stats.pending}</p>
          </div>
          <div 
            className={`bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-green-300 transition-colors ${statusFilter === 'confirmed' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}
          >
            <p className="text-sm text-gray-500">Confirmed</p>
            <p className="text-2xl font-semibold text-green-600">{stats.confirmed}</p>
          </div>
          <div 
            className={`bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-purple-300 transition-colors ${statusFilter === 'shipped' ? 'ring-2 ring-purple-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'shipped' ? 'all' : 'shipped')}
          >
            <p className="text-sm text-gray-500">Shipped</p>
            <p className="text-2xl font-semibold text-purple-600">{stats.shipped}</p>
          </div>
          <div 
            className={`bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-green-300 transition-colors ${statusFilter === 'delivered' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'delivered' ? 'all' : 'delivered')}
          >
            <p className="text-sm text-gray-500">Delivered</p>
            <p className="text-2xl font-semibold text-green-600">{stats.delivered}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by order ID, customer name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Loading orders...</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No orders found</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        #{order.order_id}
                      </button>
                      {order.tracking_number && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.tracking_number}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {order.customer?.first_name} {order.customer?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{order.customer?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={order.payment_status} type="payment" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-medium">₹{order.total?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 capitalize">{order.payment_method}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewOrder(order)}
                          title="View Order"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleUpdateStatus(order)}
                          title="Update Status"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {filteredOrders.length} of {totalOrders} orders
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <OrderDetailModal 
        order={selectedOrder} 
        open={detailModalOpen} 
        onClose={() => setDetailModalOpen(false)} 
      />
      <UpdateStatusModal
        order={orderToUpdate}
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onUpdate={fetchOrders}
      />
    </div>
  );
};

export default StorefrontOrders;
