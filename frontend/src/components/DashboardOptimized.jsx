import { useState, useEffect } from 'react';
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
  ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardOptimized = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    fulfillmentStatus: {},
    paymentStatus: {},
    deliveryStatus: {}
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('all');
  const [recentOrders, setRecentOrders] = useState([]);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStats();
    fetchStores();
    fetchRecentOrders();
  }, [selectedStore]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [customersRes, statsRes] = await Promise.all([
        axios.get(`${API}/customers/count`, {
          params: selectedStore !== 'all' ? { store_name: selectedStore } : {}
        }),
        axios.get(`${API}/dashboard/stats`, {
          params: selectedStore !== 'all' ? { store_name: selectedStore } : {}
        })
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
  };

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/stores`);
      setStores(response.data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await axios.get(`${API}/customers`, {
        params: {
          limit: 10,
          ...(selectedStore !== 'all' && { store_name: selectedStore })
        }
      });
      // Handle the response structure properly
      const orders = response.data?.customers || response.data || [];
      setRecentOrders(Array.isArray(orders) ? orders : []);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      setRecentOrders([]);
    }
  };

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

  if (loading && !stats.totalCustomers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner text="Loading dashboard..." size="large" />
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers?.toLocaleString() || '0',
      icon: Users,
      change: '+12%',
      positive: true
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders?.toLocaleString() || '0',
      icon: ShoppingCart,
      change: '+8%',
      positive: true
    },
    {
      title: 'Fulfilled',
      value: (stats.fulfillmentStatus?.fulfilled || 0).toLocaleString(),
      icon: CheckCircle2,
      change: '+15%',
      positive: true
    },
    {
      title: 'Unfulfilled',
      value: (stats.fulfillmentStatus?.unfulfilled || 0).toLocaleString(),
      icon: Clock,
      change: '-5%',
      positive: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your business performance</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-48 bg-white border-gray-300 text-gray-900">
              <SelectValue placeholder="Select Store" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all" className="text-gray-900">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.store_name} className="text-gray-900">
                  {store.store_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleShopifySync} 
            disabled={syncing}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Shopify'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-emerald-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${stat.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {stat.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {stat.change}
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.title}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="w-full">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'overview' 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'upload' 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
            }`}
          >
            Upload Orders
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            </div>
            <div className="p-6">
              {recentOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No orders found</h3>
                  <p className="text-gray-500 mb-4">Sync orders from Shopify or upload a CSV file</p>
                  <Button 
                    onClick={handleShopifySync}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    Sync Orders
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order.customer_id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-emerald-600 font-semibold">
                            {order.first_name?.charAt(0) || 'O'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {order.first_name} {order.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Order #{order.order_number} • {order.store_name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.fulfillment_status === 'fulfilled' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.fulfillment_status || 'unfulfilled'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.payment_status === 'paid' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {order.payment_status || 'pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-emerald-500 transition-colors">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Shopify Orders CSV</h3>
              <p className="text-sm text-gray-500 mb-6">
                Export orders from Shopify and upload here to sync your data
              </p>
              <Input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="max-w-md mx-auto mb-4 bg-white border-gray-300"
              />
              {selectedFile && (
                <div className="text-sm text-emerald-600 mb-4">
                  Selected: {selectedFile.name}
                </div>
              )}
              <Button
                onClick={handleCSVUpload}
                disabled={!selectedFile || uploadingCSV}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingCSV ? 'Uploading...' : 'Upload CSV'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOptimized;
