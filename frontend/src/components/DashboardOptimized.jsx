import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  RefreshCw,
  Upload,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

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
      <div className="p-6">
        <LoadingSpinner text="Loading dashboard..." size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of orders and customers</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.store_name}>
                  {store.store_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleShopifySync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Shopify'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Fulfilled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.fulfillmentStatus?.fulfilled || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Unfulfilled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.fulfillmentStatus?.unfulfilled || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="upload">Upload Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <EmptyState
                  title="No orders found"
                  description="Sync orders from Shopify or upload a CSV file"
                  actionLabel="Sync Orders"
                  onAction={handleShopifySync}
                />
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    <div
                      key={order.customer_id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-medium">
                          {order.first_name} {order.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Order #{order.order_number} • {order.store_name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={order.fulfillment_status === 'fulfilled' ? 'success' : 'secondary'}>
                          {order.fulfillment_status || 'unfulfilled'}
                        </Badge>
                        <Badge variant={order.payment_status === 'paid' ? 'success' : 'secondary'}>
                          {order.payment_status || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Orders CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Upload Shopify Orders CSV</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Export orders from Shopify and upload here
                </p>
                <Input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileChange}
                  className="max-w-md mx-auto mb-4"
                />
                {selectedFile && (
                  <div className="text-sm text-gray-600 mb-4">
                    Selected: {selectedFile.name}
                  </div>
                )}
                <Button
                  onClick={handleCSVUpload}
                  disabled={!selectedFile || uploadingCSV}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingCSV ? 'Uploading...' : 'Upload CSV'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardOptimized;
