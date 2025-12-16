import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  RefreshCw,
  Upload,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  X,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  DollarSign,
  Truck
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';
import { useStore } from '../contexts/StoreContext';
import { formatCurrency, getCurrency } from '../utils/currency';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardOptimized = () => {
  const { selectedStore, stores, switchStore } = useStore();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    fulfillmentStatus: {},
    paymentStatus: {},
    deliveryStatus: {}
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingCosts, setSyncingCosts] = useState(false);
  const [syncingTCS, setSyncingTCS] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // WhatsApp states
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkWhatsAppDialog, setBulkWhatsAppDialog] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState('order_confirmation');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    fulfillmentStatus: 'all',
    paymentStatus: 'all',
    deliveryStatus: 'all',
    dateRange: 'all',
    channel: 'all'
  });

  const fetchStats = useCallback(async () => {
    try {
      const params = {};
      if (selectedStore !== 'all') {
        params.store_name = selectedStore;
      }
      const response = await axios.get(`${API}/customers/stats`, { params });
      const data = response.data;
      setStats({
        totalOrders: data.total || 0,
        totalCustomers: data.total || 0,
        fulfillmentStatus: {
          fulfilled: data.fulfilled || 0,
          unfulfilled: data.unfulfilled || 0,
          cancelled: data.cancelled || 0
        },
        paymentStatus: {
          paid: data.paymentReceived || 0,
          pending: data.paymentPending || 0
        },
        deliveryStatus: data
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [selectedStore]);

  const fetchRecentOrders = useCallback(async () => {
    try {
      const params = { limit: 50 };
      if (selectedStore !== 'all') params.store_name = selectedStore;
      if (filters.fulfillmentStatus !== 'all') params.fulfillment_status = filters.fulfillmentStatus;
      if (filters.paymentStatus !== 'all') params.payment_status = filters.paymentStatus;
      if (filters.deliveryStatus !== 'all') params.delivery_status = filters.deliveryStatus;
      if (searchQuery) params.search = searchQuery;
      
      const response = await axios.get(`${API}/customers`, { params });
      const orders = response.data?.customers || response.data || [];
      setRecentOrders(Array.isArray(orders) ? orders : []);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      setRecentOrders([]);
    }
  }, [selectedStore, filters, searchQuery]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchRecentOrders()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchRecentOrders]);

  const handleSync = async () => {
    if (selectedStore === 'all') {
      toast.error('Please select a specific store to sync');
      return;
    }
    setSyncing(true);
    try {
      await axios.post(`${API}/shopify/sync/${selectedStore}`);
      toast.success('Sync started successfully');
      await fetchStats();
      await fetchRecentOrders();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncCosts = async () => {
    if (selectedStore === 'all') {
      toast.error('Please select a specific store to sync costs');
      return;
    }
    setSyncingCosts(true);
    try {
      // Sync stock status and order costs
      const [stockRes, costRes] = await Promise.all([
        axios.post(`${API}/customers/sync-stock-status?store_name=${selectedStore}`),
        axios.post(`${API}/customers/sync-order-costs?store_name=${selectedStore}`)
      ]);
      
      toast.success(
        `Synced: ${costRes.data.updated} orders with costs, ${stockRes.data.in_stock} in stock, ${stockRes.data.out_of_stock} out of stock`
      );
      await fetchRecentOrders();
    } catch (error) {
      console.error('Sync costs error:', error);
      toast.error(error.response?.data?.detail || 'Failed to sync costs');
    } finally {
      setSyncingCosts(false);
    }
  };

  const handleSyncTCS = async () => {
    setSyncingTCS(true);
    try {
      const response = await axios.post(`${API}/tcs/sync-all`);
      if (response.data.success) {
        toast.success(
          `TCS Sync: ${response.data.synced_count || 0} orders updated, ${response.data.errors || 0} errors`
        );
        await fetchRecentOrders();
      } else {
        toast.error(response.data.error || 'TCS sync failed');
      }
    } catch (error) {
      console.error('TCS sync error:', error);
      toast.error(error.response?.data?.detail || 'Failed to sync TCS status');
    } finally {
      setSyncingTCS(false);
    }
  };

  const getStatusBadge = (status, type) => {
    if (type === 'fulfillment') {
      if (status === 'fulfilled') return <Badge className="bg-green-100 text-green-700 border-0">Fulfilled</Badge>;
      if (status === 'unfulfilled') return <Badge className="bg-yellow-100 text-yellow-700 border-0">Unfulfilled</Badge>;
      if (status === 'cancelled' || status === 'restocked') return <Badge className="bg-red-100 text-red-700 border-0">Cancelled</Badge>;
      return <Badge className="bg-gray-100 text-gray-700 border-0">{status || 'Pending'}</Badge>;
    }
    if (type === 'payment') {
      if (status === 'paid') return <Badge className="bg-green-100 text-green-700 border-0">Paid</Badge>;
      if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-700 border-0">Pending</Badge>;
      if (status === 'refunded') return <Badge className="bg-red-100 text-red-700 border-0">Refunded</Badge>;
      return <Badge className="bg-gray-100 text-gray-700 border-0">{status || 'Pending'}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredOrders = recentOrders;

  // WhatsApp Functions
  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.customer_id));
    }
  };

  const handleSendWhatsApp = async (order) => {
    const phone = order.phone || order.default_address?.phone;
    if (!phone) {
      toast.error('No phone number available for this customer');
      return;
    }

    // Clean phone number
    let cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      // Assume India if no country code
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
      cleanPhone = '+91' + cleanPhone;
    }

    // Create message
    const message = `Hi ${order.first_name || 'Customer'}! Your order #${order.order_number || order.name} is being processed. Thank you for shopping with us!`;
    
    // Open WhatsApp
    const whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success(`Opening WhatsApp for ${order.first_name || 'Customer'}`);
  };

  const handleBulkWhatsApp = () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders first');
      return;
    }
    setBulkWhatsAppDialog(true);
  };

  const handleSendBulkWhatsApp = async () => {
    try {
      setSendingWhatsApp(true);
      toast.loading(`Sending WhatsApp to ${selectedOrders.length} customers...`);

      const response = await axios.post(`${API}/customers/bulk-whatsapp`, {
        customer_ids: selectedOrders,
        template: whatsappTemplate
      });

      toast.dismiss();
      toast.success(`WhatsApp sent to ${response.data.sent_count || selectedOrders.length} customers!`);
      setBulkWhatsAppDialog(false);
      setSelectedOrders([]);
    } catch (error) {
      toast.dismiss();
      console.error('Bulk WhatsApp error:', error);
      toast.error(error.response?.data?.detail || 'Failed to send bulk WhatsApp');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleBulkCancellation = () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders first');
      return;
    }
    
    const ordersToCancel = filteredOrders.filter(o => selectedOrders.includes(o.customer_id));
    
    if (!window.confirm(`Send cancellation message to ${ordersToCancel.length} customers?`)) {
      return;
    }

    let successCount = 0;
    ordersToCancel.forEach((order, index) => {
      const phone = order.phone || order.default_address?.phone;
      if (!phone) return;

      // Clean phone number
      let cleanPhone = phone.replace(/[^0-9+]/g, '');
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        cleanPhone = '+91' + cleanPhone;
      }

      const customerName = `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Customer';
      const orderNumber = order.order_number || order.name || 'N/A';
      
      const message = `Hi ${customerName},

We regret to inform you that your order #${orderNumber} has been cancelled.

If you have any questions, please feel free to contact us.

Thank you for your understanding.`;

      const whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(message)}`;
      
      // Open with delay to avoid browser blocking
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        successCount++;
      }, index * 500);
    });

    toast.success(`Opening ${ordersToCancel.length} cancellation messages...`);
    setSelectedOrders([]);
  };

  const handleSendCancellation = (order) => {
    const phone = order.phone || order.default_address?.phone;
    if (!phone) {
      toast.error('No phone number available for this customer');
      return;
    }

    let cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
      cleanPhone = '+91' + cleanPhone;
    }

    const customerName = `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Customer';
    const orderNumber = order.order_number || order.name || 'N/A';
    
    const message = `Hi ${customerName},

We regret to inform you that your order #${orderNumber} has been cancelled.

If you have any questions, please feel free to contact us.

Thank you for your understanding.`;

    const whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success(`Opening cancellation message for ${customerName}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
            <div className="flex items-center gap-3">
              <Select value={selectedStore} onValueChange={switchStore}>
                <SelectTrigger className="w-40 h-9 text-sm">
                  <SelectValue placeholder="All stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stores</SelectItem>
                  {stores.map(store => (
                    <SelectItem key={store.store_name} value={store.store_name}>
                      {store.store_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync Orders
              </Button>
              <Button variant="outline" size="sm" onClick={handleSyncTCS} disabled={syncingTCS}>
                <Truck className={`w-4 h-4 mr-2 ${syncingTCS ? 'animate-spin' : ''}`} />
                Sync TCS
              </Button>
              <Button variant="outline" size="sm" onClick={handleSyncCosts} disabled={syncingCosts}>
                <DollarSign className={`w-4 h-4 mr-2 ${syncingCosts ? 'animate-spin' : ''}`} />
                Sync Costs
              </Button>
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleBulkWhatsApp}
                disabled={selectedOrders.length === 0}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Send WhatsApp {selectedOrders.length > 0 && `(${selectedOrders.length})`}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleBulkCancellation}
                disabled={selectedOrders.length === 0}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Orders {selectedOrders.length > 0 && `(${selectedOrders.length})`}
              </Button>
              <Button size="sm">Export</Button>
            </div>
          </div>
          {/* Selection Info Bar */}
          {selectedOrders.length > 0 && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700 font-medium">
                {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
              </span>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-blue-600 h-7"
                onClick={() => setSelectedOrders([])}
              >
                Clear selection
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <button 
            type="button"
            onClick={() => {
              setFilters({...filters, fulfillmentStatus: 'all'});
              setActiveTab('overview');
            }}
            className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-lg hover:border-blue-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total orders</span>
              <ShoppingCart className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-semibold mt-1 text-gray-900">{stats.totalOrders?.toLocaleString() || 0}</p>
          </button>
          <button 
            type="button"
            onClick={() => {
              setFilters({...filters, fulfillmentStatus: 'fulfilled'});
              setActiveTab('overview');
            }}
            className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-lg hover:border-green-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Fulfilled</span>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-semibold mt-1 text-green-600">{stats.fulfillmentStatus?.fulfilled?.toLocaleString() || 0}</p>
          </button>
          <button 
            type="button"
            onClick={() => {
              setFilters({...filters, fulfillmentStatus: 'unfulfilled'});
              setActiveTab('unfulfilled');
            }}
            className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-lg hover:border-orange-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Unfulfilled</span>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-2xl font-semibold mt-1 text-orange-600">{stats.fulfillmentStatus?.unfulfilled?.toLocaleString() || 0}</p>
          </button>
          <button 
            type="button"
            onClick={() => {
              setFilters({...filters, fulfillmentStatus: 'cancelled'});
              setActiveTab('cancelled');
            }}
            className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-lg hover:border-red-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Cancelled</span>
              <X className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-semibold mt-1 text-red-600">{stats.fulfillmentStatus?.cancelled?.toLocaleString() || 0}</p>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-gray-200 bg-white">
        <div className="flex gap-6">
          {['overview', 'unfulfilled', 'cancelled', 'upload'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' ? 'All orders' : tab === 'upload' ? 'Import' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      {activeTab !== 'upload' && (
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search orders by name, order #, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 bg-white border-gray-300 text-sm"
              />
            </div>
            <Button
              variant="outline"
              className={`h-9 text-sm ${showFilters ? 'bg-gray-100' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {Object.values(filters).filter(v => v !== 'all').length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                  {Object.values(filters).filter(v => v !== 'all').length}
                </span>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Fulfillment</label>
                  <Select value={filters.fulfillmentStatus} onValueChange={(v) => setFilters({...filters, fulfillmentStatus: v})}>
                    <SelectTrigger className="h-9 text-sm bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="fulfilled">Fulfilled</SelectItem>
                      <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Payment</label>
                  <Select value={filters.paymentStatus} onValueChange={(v) => setFilters({...filters, paymentStatus: v})}>
                    <SelectTrigger className="h-9 text-sm bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Delivery</label>
                  <Select value={filters.deliveryStatus} onValueChange={(v) => setFilters({...filters, deliveryStatus: v})}>
                    <SelectTrigger className="h-9 text-sm bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="RETURNED">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Date</label>
                  <Select value={filters.dateRange} onValueChange={(v) => setFilters({...filters, dateRange: v})}>
                    <SelectTrigger className="h-9 text-sm bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="last7days">Last 7 days</SelectItem>
                      <SelectItem value="last30days">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  {Object.values(filters).some(v => v !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters({
                        fulfillmentStatus: 'all',
                        paymentStatus: 'all',
                        deliveryStatus: 'all',
                        dateRange: 'all',
                        channel: 'all'
                      })}
                      className="text-blue-600"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Orders Table - Shopify Style */}
      {activeTab !== 'upload' && (
        <div className="px-6 py-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Table */}
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300"
                      checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fulfillment</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="px-4 py-12 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const salePrice = parseFloat(order.total_spent || order.total_price || 0);
                    const cost = parseFloat(order.cost || order.order_cost || 0);
                    const profit = salePrice - cost;
                    const itemCount = order.line_items?.length || order.order_skus?.length || 0;
                    const firstItem = order.line_items?.[0] || null;
                    const sku = firstItem?.sku || order.order_skus?.[0] || '';
                    
                    return (
                      <tr
                        key={order.customer_id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300"
                            checked={selectedOrders.includes(order.customer_id)}
                            onChange={() => handleSelectOrder(order.customer_id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                            #{order.order_number || order.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {formatDate(order.last_order_date || order.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {order.first_name || ''} {order.last_name || ''}
                            </p>
                            {order.phone && (
                              <p className="text-xs text-gray-500">{order.phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-[200px]">
                            {firstItem ? (
                              <>
                                <p className="text-sm text-gray-900 truncate">
                                  {firstItem.title || firstItem.name || 'Product'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {sku && `SKU: ${sku}`}
                                  {itemCount > 1 && <span className="ml-1 text-blue-600">+{itemCount - 1} more</span>}
                                </p>
                              </>
                            ) : sku ? (
                              <p className="text-sm text-gray-600">SKU: {sku}</p>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {order.financial_status === 'paid' || order.payment_status === 'paid' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Paid
                            </span>
                          ) : order.financial_status === 'refunded' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Refunded
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {order.fulfillment_status === 'fulfilled' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Fulfilled
                            </span>
                          ) : order.fulfillment_status === 'cancelled' || order.fulfillment_status === 'restocked' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Unfulfilled
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {order.delivery_status === 'DELIVERED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Delivered
                            </span>
                          ) : order.delivery_status === 'IN_TRANSIT' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              In Transit
                            </span>
                          ) : order.delivery_status === 'PENDING' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          ) : order.delivery_status === 'RETURNED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Returned
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {order.stock_status === 'IN_STOCK' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              In Stock
                            </span>
                          ) : order.stock_status === 'OUT_OF_STOCK' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Out
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(salePrice, order.store_name)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {cost > 0 ? (
                            <span className="text-sm text-gray-600">
                              {order.cost_currency === 'PKR' ? `Rs.${cost.toLocaleString()}` : formatCurrency(cost, order.store_name)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {cost > 0 ? (
                            <span className={`text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {profit >= 0 ? '+' : ''}{formatCurrency(profit, order.store_name)}
                              {order.cost_currency === 'PKR' && <span className="text-xs text-gray-400 ml-1">(mixed)</span>}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleSendWhatsApp(order)}
                              title={order.phone || order.default_address?.phone ? "Send WhatsApp" : "No phone number"}
                              disabled={!order.phone && !order.default_address?.phone}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleSendCancellation(order)}
                              title={order.phone || order.default_address?.phone ? "Send Cancellation" : "No phone number"}
                              disabled={!order.phone && !order.default_address?.phone}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="px-6 py-8">
          <div className="max-w-xl mx-auto bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Import orders</h3>
            <p className="text-sm text-gray-500 mb-6">
              Upload a CSV file to import orders in bulk
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg cursor-pointer hover:bg-gray-800"
            >
              Select file
            </label>
            {selectedFile && (
              <p className="mt-4 text-sm text-gray-600">{selectedFile.name}</p>
            )}
          </div>
        </div>
      )}

      {/* Order Detail Modal - Shopify Style */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl">
                    Order #{selectedOrder.order_number}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedOrder.fulfillment_status, 'fulfillment')}
                    {getStatusBadge(selectedOrder.payment_status, 'payment')}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(selectedOrder.last_order_date)} from {selectedOrder.store_name || 'Online Store'}
                </p>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-6 py-6">
                {/* Left Column - Order Items */}
                <div className="col-span-2 space-y-6">
                  {/* Products */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Products</h3>
                    <div className="space-y-3">
                      {selectedOrder.line_items?.length > 0 ? (
                        selectedOrder.line_items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4 bg-white rounded-lg p-3 border border-gray-200">
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-sm font-medium">
                              {(item.name || 'P').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{item.name || item.sku}</p>
                              <p className="text-xs text-gray-500">SKU: {item.sku || 'N/A'} • Qty: {item.quantity || 1}</p>
                            </div>
                            <p className="text-sm font-medium">₹{item.price || 0}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No items</p>
                      )}
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Payment</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal</span>
                        <span>₹{selectedOrder.total_spent?.toFixed(0) || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Shipping</span>
                        <span>₹0</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200 font-medium">
                        <span>Total</span>
                        <span>₹{selectedOrder.total_spent?.toFixed(0) || '0'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Customer Info */}
                <div className="space-y-6">
                  {/* Customer */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Customer</h3>
                    <div className="space-y-3">
                      <p className="text-sm font-medium">
                        {selectedOrder.first_name} {selectedOrder.last_name}
                      </p>
                      {selectedOrder.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{selectedOrder.email}</span>
                        </div>
                      )}
                      {selectedOrder.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{selectedOrder.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Shipping address</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{selectedOrder.first_name} {selectedOrder.last_name}</p>
                      {selectedOrder.address && <p>{selectedOrder.address}</p>}
                      {selectedOrder.city && <p>{selectedOrder.city}, {selectedOrder.province}</p>}
                      {selectedOrder.country && <p>{selectedOrder.country}</p>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      size="sm"
                      onClick={() => handleSendWhatsApp(selectedOrder)}
                      disabled={!selectedOrder.phone && !selectedOrder.default_address?.phone}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send WhatsApp
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      Print order
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk WhatsApp Dialog */}
      <Dialog open={bulkWhatsAppDialog} onOpenChange={setBulkWhatsAppDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Bulk WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600">
              Send WhatsApp messages to <strong>{selectedOrders.length}</strong> selected customers.
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Message Template
              </label>
              <Select value={whatsappTemplate} onValueChange={setWhatsappTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_confirmation">Order Confirmation</SelectItem>
                  <SelectItem value="order_shipped">Order Shipped</SelectItem>
                  <SelectItem value="delivery_update">Delivery Update</SelectItem>
                  <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                  <SelectItem value="order_ready">Order Ready for Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setBulkWhatsAppDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendBulkWhatsApp} 
              className="bg-green-600 hover:bg-green-700"
              disabled={sendingWhatsApp}
            >
              {sendingWhatsApp ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Send Messages
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardOptimized;
