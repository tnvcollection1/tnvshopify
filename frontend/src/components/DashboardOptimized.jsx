import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';
import { useStore } from '../contexts/StoreContext';

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
  const [recentOrders, setRecentOrders] = useState([]);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
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
      setLoading(true);
      const storeParam = selectedStore !== 'all' ? { store_name: selectedStore } : {};
      
      const [customersRes, statsRes] = await Promise.all([
        axios.get(`${API}/customers/count`, { params: storeParam }),
        axios.get(`${API}/dashboard/stats`, { params: storeParam })
      ]);

      setStats({
        totalCustomers: customersRes.data.total || 0,
        totalOrders: customersRes.data.total || 0,
        ...statsRes.data
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  const fetchRecentOrders = useCallback(async () => {
    try {
      const params = { limit: 50 };
      if (selectedStore !== 'all') {
        params.store_name = selectedStore;
      }
      if (filters.fulfillmentStatus !== 'all') {
        params.fulfillment_status = filters.fulfillmentStatus;
      }
      if (filters.paymentStatus !== 'all') {
        params.payment_status = filters.paymentStatus;
      }
      if (filters.deliveryStatus !== 'all') {
        params.delivery_status = filters.deliveryStatus;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await axios.get(`${API}/customers`, { params });
      const orders = response.data?.customers || response.data || [];
      setRecentOrders(Array.isArray(orders) ? orders : []);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      setRecentOrders([]);
    }
  }, [selectedStore, filters, searchQuery]);

  useEffect(() => {
    fetchStats();
    fetchRecentOrders();
  }, [fetchStats, fetchRecentOrders]);

  const handleShopifySync = async () => {
    if (!stores.length) {
      toast.error('No stores configured');
      return;
    }

    const storeToSync = selectedStore !== 'all' 
      ? stores.find(s => s.store_name === selectedStore) 
      : stores[0];

    if (!storeToSync) {
      toast.error('Please select a store to sync');
      return;
    }

    setSyncing(true);
    try {
      const response = await axios.post(`${API}/shopify/sync/${storeToSync.store_name}?days_back=30`);
      toast.success(`Synced ${response.data.orders_synced} orders successfully!`);
      fetchStats();
      fetchRecentOrders();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
    } else {
      toast.error('Please upload a CSV or Excel file');
    }
  };

  const handleCSVUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploadingCSV(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API}/upload-orders-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(response.data.message || 'Orders uploaded successfully!');
      setSelectedFile(null);
      fetchStats();
      fetchRecentOrders();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploadingCSV(false);
    }
  };

  const getStatusStyle = (status, type) => {
    if (type === 'fulfillment') {
      if (status === 'fulfilled') return 'bg-green-50 text-green-700 border-green-200';
      if (status === 'unfulfilled') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      return 'bg-gray-50 text-gray-600 border-gray-200';
    }
    if (type === 'payment') {
      if (status === 'paid') return 'bg-green-50 text-green-700 border-green-200';
      if (status === 'pending') return 'bg-orange-50 text-orange-700 border-orange-200';
      return 'bg-gray-50 text-gray-600 border-gray-200';
    }
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  if (loading && !stats.totalCustomers) {
    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center">
        <LoadingSpinner text="Loading dashboard..." size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
          <div className="flex items-center gap-3">
            <Select value={selectedStore} onValueChange={switchStore}>
              <SelectTrigger className="w-40 h-9 bg-white border-gray-300 text-sm">
                <SelectValue placeholder="All stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stores</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.store_name}>
                    {store.store_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline"
              onClick={handleShopifySync} 
              disabled={syncing}
              className="h-9 text-sm border-gray-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
            <Button className="h-9 text-sm bg-gray-900 hover:bg-gray-800 text-white">
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total orders</span>
              <span className="text-xs text-green-600 flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-1" />8%
              </span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.totalOrders?.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Fulfilled</span>
              <span className="text-xs text-green-600 flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-1" />15%
              </span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{(stats.fulfillmentStatus?.fulfilled || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Unfulfilled</span>
              <span className="text-xs text-red-500 flex items-center">
                <ArrowDownRight className="w-3 h-3 mr-1" />5%
              </span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{(stats.fulfillmentStatus?.unfulfilled || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Customers</span>
              <span className="text-xs text-green-600 flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-1" />12%
              </span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.totalCustomers?.toLocaleString() || '0'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="flex items-center gap-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview' 
                ? 'border-gray-900 text-gray-900' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All orders
          </button>
          <button
            onClick={() => setActiveTab('unfulfilled')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'unfulfilled' 
                ? 'border-gray-900 text-gray-900' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Unfulfilled
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'cancelled' 
                ? 'border-gray-900 text-gray-900' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Cancelled
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'upload' 
                ? 'border-gray-900 text-gray-900' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Import
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      {activeTab !== 'upload' && (
        <div className="px-6 py-4">
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
              className={`h-9 text-sm border-gray-300 ${showFilters ? 'bg-gray-100' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {Object.values(filters).filter(v => v !== 'all').length > 0 && (
                <span className="ml-2 bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-xs">
                  {Object.values(filters).filter(v => v !== 'all').length}
                </span>
              )}
            </Button>
          </div>
          
          {/* Expanded Filter Panel - Shopify Style */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Fulfillment Status */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Fulfillment status</label>
                  <Select value={filters.fulfillmentStatus} onValueChange={(v) => setFilters({...filters, fulfillmentStatus: v})}>
                    <SelectTrigger className="h-9 text-sm bg-white">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="fulfilled">✅ Fulfilled</SelectItem>
                      <SelectItem value="unfulfilled">⏳ Unfulfilled</SelectItem>
                      <SelectItem value="partially_fulfilled">⚠️ Partially fulfilled</SelectItem>
                      <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                      <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                      <SelectItem value="on_hold">🛑 On hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Payment status</label>
                  <Select value={filters.paymentStatus} onValueChange={(v) => setFilters({...filters, paymentStatus: v})}>
                    <SelectTrigger className="h-9 text-sm bg-white">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="paid">💰 Paid</SelectItem>
                      <SelectItem value="pending">⏳ Pending</SelectItem>
                      <SelectItem value="authorized">🔐 Authorized</SelectItem>
                      <SelectItem value="partially_refunded">↩️ Partially refunded</SelectItem>
                      <SelectItem value="refunded">🔄 Refunded</SelectItem>
                      <SelectItem value="voided">❌ Voided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Delivery Status */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Delivery status</label>
                  <Select value={filters.deliveryStatus} onValueChange={(v) => setFilters({...filters, deliveryStatus: v})}>
                    <SelectTrigger className="h-9 text-sm bg-white">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="DELIVERED">✅ Delivered</SelectItem>
                      <SelectItem value="IN_TRANSIT">🚚 In transit</SelectItem>
                      <SelectItem value="OUT_FOR_DELIVERY">📦 Out for delivery</SelectItem>
                      <SelectItem value="PENDING">⏳ Pending</SelectItem>
                      <SelectItem value="RETURNED">↩️ Returned</SelectItem>
                      <SelectItem value="RETURN_IN_PROCESS">🔄 Return in process</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Date</label>
                  <Select value={filters.dateRange} onValueChange={(v) => setFilters({...filters, dateRange: v})}>
                    <SelectTrigger className="h-9 text-sm bg-white">
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="last7days">Last 7 days</SelectItem>
                      <SelectItem value="last30days">Last 30 days</SelectItem>
                      <SelectItem value="last90days">Last 90 days</SelectItem>
                      <SelectItem value="thisYear">This year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Channel/Store */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Channel</label>
                  <Select value={filters.channel} onValueChange={(v) => setFilters({...filters, channel: v})}>
                    <SelectTrigger className="h-9 text-sm bg-white">
                      <SelectValue placeholder="All channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All channels</SelectItem>
                      <SelectItem value="online_store">🌐 Online Store</SelectItem>
                      <SelectItem value="pos">🏪 POS</SelectItem>
                      <SelectItem value="draft_orders">📝 Draft Orders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Clear Filters */}
              {Object.values(filters).some(v => v !== 'all') && (
                <div className="mt-3 pt-3 border-t border-gray-200">
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
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Orders Table */}
      {(activeTab === 'overview' || activeTab === 'unfulfilled') && (
        <div className="px-6 pb-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-14 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-1">
                <input type="checkbox" className="rounded border-gray-300" />
              </div>
              <div className="col-span-2">Order</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-3">Products</div>
              <div className="col-span-1">Fulfillment</div>
              <div className="col-span-2">Payment</div>
              <div className="col-span-1 text-right">Total</div>
            </div>

            {/* Table Body */}
            {recentOrders.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base font-medium text-gray-900 mb-1">No orders yet</h3>
                <p className="text-sm text-gray-500 mb-4">Sync orders from Shopify or upload a CSV file</p>
                <Button 
                  onClick={handleShopifySync}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  Sync Orders
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentOrders
                  .filter(order => {
                    if (activeTab === 'overview') return true;
                    if (activeTab === 'unfulfilled') return order.fulfillment_status !== 'fulfilled';
                    if (activeTab === 'cancelled') return order.fulfillment_status === 'cancelled' || order.financial_status === 'refunded';
                    return true;
                  })
                  .map((order) => {
                    // Generate product color based on name
                    const getProductColor = (name) => {
                      const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700'];
                      const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      return colors[hash % colors.length];
                    };
                    
                    const getProductInitials = (name) => {
                      if (!name) return '?';
                      const words = name.split(' ').filter(w => w.length > 0);
                      if (words.length >= 2) {
                        return (words[0][0] + words[1][0]).toUpperCase();
                      }
                      return name.substring(0, 2).toUpperCase();
                    };
                    
                    return (
                  <div 
                    key={order.customer_id} 
                    className="grid grid-cols-14 gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer items-center"
                  >
                    <div className="col-span-1">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-blue-600 hover:underline">
                        #{order.order_number || 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {order.last_order_date
                        ? new Date(order.last_order_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-900">{order.first_name} {order.last_name}</p>
                    </div>
                    <div className="col-span-3">
                      {order.line_items && order.line_items.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {order.line_items.slice(0, 3).map((item, idx) => (
                              <div 
                                key={idx}
                                className={`w-8 h-8 rounded border-2 border-white flex items-center justify-center text-xs font-medium overflow-hidden ${getProductColor(item.name || item.sku)}`}
                                title={item.name || item.sku}
                              >
                                {item.image_url ? (
                                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  getProductInitials(item.name || item.sku)
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 truncate">
                              {order.line_items[0]?.name || order.line_items[0]?.sku || 'Product'}
                            </p>
                            {order.line_items.length > 1 && (
                              <p className="text-xs text-gray-500">+{order.line_items.length - 1} more</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No items</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusStyle(order.fulfillment_status, 'fulfillment')}`}>
                        {order.fulfillment_status === 'fulfilled' ? '✅' : '⏳'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusStyle(order.payment_status, 'payment')}`}>
                        {order.payment_status || 'Pending'}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        ₹{order.total_spent?.toFixed(0) || '0'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {recentOrders.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {recentOrders.length} orders
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-sm border-gray-300" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-sm border-gray-300">
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="px-6 py-6">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="max-w-md mx-auto text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import orders</h3>
              <p className="text-sm text-gray-500 mb-6">
                Upload a CSV or Excel file with your orders data
              </p>
              <Input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="mb-4"
              />
              {selectedFile && (
                <p className="text-sm text-green-600 mb-4">
                  Selected: {selectedFile.name}
                </p>
              )}
              <Button
                onClick={handleCSVUpload}
                disabled={!selectedFile || uploadingCSV}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {uploadingCSV ? 'Uploading...' : 'Upload file'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOptimized;
