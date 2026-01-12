import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, Truck, CheckCircle2, Clock, Search, Filter,
  MessageCircle, Phone, Mail, MapPin, ChevronDown, ChevronRight,
  RefreshCw, Eye, ExternalLink, Copy, AlertCircle, Box,
  ClipboardCheck, Home, XCircle, Loader2, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const API = process.env.REACT_APP_BACKEND_URL;

// Order Status Configuration
const ORDER_STATUSES = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: Box },
  shipped: { label: 'Shipped', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800', icon: MapPin },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: Home },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

// ===================== ORDER CARD =====================

const OrderCard = ({ order, onStatusUpdate, onViewDetails, onSendWhatsApp }) => {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = ORDER_STATUSES[order.status] || ORDER_STATUSES.pending;
  const StatusIcon = statusConfig.icon;
  
  const customer = order.customer || {};
  const shipping = order.shipping_address || {};
  const currency = order.currency === 'PKR' ? 'Rs' : '₹';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getNextStatus = () => {
    const currentIndex = STATUS_FLOW.indexOf(order.status);
    if (currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1) {
      return STATUS_FLOW[currentIndex + 1];
    }
    return null;
  };

  const nextStatus = getNextStatus();

  return (
    <Card className="mb-4" data-testid={`order-card-${order.order_id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{order.order_id}</span>
                <button 
                  onClick={() => copyToClipboard(order.order_id)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Copy className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-500">
                {customer.first_name} {customer.last_name} • {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <span className="font-semibold text-lg">
              {currency}{order.total?.toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 border-t">
          <div className="grid md:grid-cols-3 gap-6 mt-4">
            {/* Customer Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Customer</h4>
              <p className="font-medium">{customer.first_name} {customer.last_name}</p>
              <div className="space-y-1 mt-2 text-sm">
                <a 
                  href={`mailto:${customer.email}`} 
                  className="flex items-center gap-2 text-gray-600 hover:text-black"
                >
                  <Mail className="w-3 h-3" /> {customer.email}
                </a>
                <a 
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-2 text-gray-600 hover:text-black"
                >
                  <Phone className="w-3 h-3" /> {customer.phone}
                </a>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Shipping Address</h4>
              <div className="text-sm text-gray-600">
                <p>{shipping.address1}</p>
                {shipping.address2 && <p>{shipping.address2}</p>}
                <p>{shipping.city}, {shipping.province} {shipping.zip}</p>
                <p>{shipping.country}</p>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Items ({order.line_items?.length || 0})</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {order.line_items?.map((item, i) => (
                  <div key={i} className="text-sm flex justify-between">
                    <span className="text-gray-600 truncate flex-1 mr-2">
                      {item.title} {item.variant_title && item.variant_title !== 'Default Title' ? `(${item.variant_title})` : ''}
                    </span>
                    <span className="text-gray-800">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm">
            <div className="flex items-center gap-4 text-gray-500">
              <span>Payment: <strong className={order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}>
                {order.payment_method === 'cod' ? 'COD' : 'Prepaid'} ({order.payment_status})
              </strong></span>
              {order.tracking_number && (
                <span>Tracking: <strong>{order.tracking_number}</strong></span>
              )}
              {order.courier && (
                <span>Courier: <strong>{order.courier}</strong></span>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onSendWhatsApp(order)}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              
              {nextStatus && order.status !== 'cancelled' && (
                <Button 
                  size="sm"
                  onClick={() => onStatusUpdate(order, nextStatus)}
                >
                  Mark as {ORDER_STATUSES[nextStatus]?.label}
                </Button>
              )}
              
              <Button variant="ghost" size="sm" onClick={() => onViewDetails(order)}>
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// ===================== STATUS UPDATE DIALOG =====================

const StatusUpdateDialog = ({ open, onClose, order, onConfirm }) => {
  const [status, setStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('');
  const [note, setNote] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order) {
      setTrackingNumber(order.tracking_number || '');
      setCourier(order.courier || '');
    }
  }, [order]);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm({
      status,
      tracking_number: trackingNumber || undefined,
      courier: courier || undefined,
      note,
      send_whatsapp: sendWhatsApp
    });
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Order #{order?.order_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">New Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FLOW.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_STATUSES[s]?.label}
                  </SelectItem>
                ))}
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === 'shipped' || status === 'out_for_delivery') && (
            <>
              <div>
                <label className="text-sm font-medium">Tracking Number</label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Courier</label>
                <Select value={courier} onValueChange={setCourier}>
                  <SelectTrigger className="mt-1">
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
            <label className="text-sm font-medium">Note (optional)</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              className="mt-1"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Send WhatsApp notification to customer</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!status || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===================== WHATSAPP DIALOG =====================

const WhatsAppDialog = ({ open, onClose, order, notification }) => {
  if (!notification) return null;

  const openWhatsApp = () => {
    window.open(notification.link, '_blank');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            Send WhatsApp Notification
          </DialogTitle>
          <DialogDescription>
            Order #{order?.order_id} • {notification.phone}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
          <pre className="text-sm whitespace-pre-wrap font-sans">
            {notification.message}
          </pre>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={openWhatsApp} className="bg-green-600 hover:bg-green-700">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===================== STATS CARDS =====================

const StatsCards = ({ orders }) => {
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length,
    shipped: orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cod_pending: orders.filter(o => o.payment_method === 'cod' && o.payment_status !== 'paid').length,
    total_revenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0),
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Orders</p>
        </CardContent>
      </Card>
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-4">
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
          <p className="text-sm text-yellow-600">Pending</p>
        </CardContent>
      </Card>
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="pt-4">
          <p className="text-2xl font-bold text-purple-700">{stats.processing}</p>
          <p className="text-sm text-purple-600">Processing</p>
        </CardContent>
      </Card>
      <Card className="border-indigo-200 bg-indigo-50">
        <CardContent className="pt-4">
          <p className="text-2xl font-bold text-indigo-700">{stats.shipped}</p>
          <p className="text-sm text-indigo-600">In Transit</p>
        </CardContent>
      </Card>
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-4">
          <p className="text-2xl font-bold text-green-700">{stats.delivered}</p>
          <p className="text-sm text-green-600">Delivered</p>
        </CardContent>
      </Card>
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <p className="text-2xl font-bold text-amber-700">{stats.cod_pending}</p>
          <p className="text-sm text-amber-600">COD Pending</p>
        </CardContent>
      </Card>
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-4">
          <p className="text-2xl font-bold text-emerald-700">₹{stats.total_revenue.toLocaleString()}</p>
          <p className="text-sm text-emerald-600">Revenue</p>
        </CardContent>
      </Card>
    </div>
  );
};

// ===================== MAIN COMPONENT =====================

const StorefrontOrdersDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  
  const [whatsAppNotification, setWhatsAppNotification] = useState(null);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/api/storefront/orders?limit=100`;
      if (storeFilter !== 'all') url += `&store_name=${storeFilter}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [storeFilter, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusUpdate = (order, newStatus) => {
    setSelectedOrder(order);
    setPendingStatus(newStatus);
    setShowStatusDialog(true);
  };

  const confirmStatusUpdate = async (updateData) => {
    try {
      const response = await fetch(`${API}/api/storefront/orders/${selectedOrder.order_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Order updated to ${updateData.status}`);
        
        // Show WhatsApp dialog if notification was generated
        if (result.whatsapp_notification && updateData.send_whatsapp) {
          setWhatsAppNotification(result.whatsapp_notification);
          setShowWhatsAppDialog(true);
        }
        
        fetchOrders();
      } else {
        throw new Error(result.message || 'Failed to update');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleSendWhatsApp = async (order) => {
    // Generate WhatsApp message for current status
    try {
      const response = await fetch(`${API}/api/storefront/orders/${order.order_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: order.status,
          send_whatsapp: true,
          note: 'Resending notification'
        })
      });
      
      const result = await response.json();
      
      if (result.whatsapp_notification) {
        setSelectedOrder(order);
        setWhatsAppNotification(result.whatsapp_notification);
        setShowWhatsAppDialog(true);
      }
    } catch (error) {
      console.error('WhatsApp error:', error);
      toast.error('Failed to generate WhatsApp message');
    }
  };

  const handleViewDetails = (order) => {
    // Could open a detailed modal or navigate to a detail page
    console.log('View details:', order);
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesId = order.order_id?.toLowerCase().includes(search);
      const matchesName = `${order.customer?.first_name} ${order.customer?.last_name}`.toLowerCase().includes(search);
      const matchesPhone = order.customer?.phone?.includes(search);
      const matchesEmail = order.customer?.email?.toLowerCase().includes(search);
      if (!matchesId && !matchesName && !matchesPhone && !matchesEmail) return false;
    }
    return true;
  });

  return (
    <div className="p-6" data-testid="storefront-orders-dashboard">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Storefront Orders</h1>
          <p className="text-gray-500">Manage COD and prepaid orders</p>
        </div>
        <Button onClick={fetchOrders} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <StatsCards orders={orders} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search orders, customers, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            <SelectItem value="tnvcollection">TNC Collection (IN)</SelectItem>
            <SelectItem value="tnvcollectionpk">TNC Collection (PK)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(ORDER_STATUSES).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No orders found</h3>
          <p className="text-gray-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div>
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.order_id}
              order={order}
              onStatusUpdate={handleStatusUpdate}
              onViewDetails={handleViewDetails}
              onSendWhatsApp={handleSendWhatsApp}
            />
          ))}
        </div>
      )}

      {/* Status Update Dialog */}
      <StatusUpdateDialog
        open={showStatusDialog}
        onClose={() => {
          setShowStatusDialog(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onConfirm={confirmStatusUpdate}
      />

      {/* WhatsApp Dialog */}
      <WhatsAppDialog
        open={showWhatsAppDialog}
        onClose={() => {
          setShowWhatsAppDialog(false);
          setWhatsAppNotification(null);
        }}
        order={selectedOrder}
        notification={whatsAppNotification}
      />
    </div>
  );
};

export default StorefrontOrdersDashboard;
