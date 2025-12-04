import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Target,
  Users,
  MessageCircle,
  ShoppingCart,
  Tag,
  Clock,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const MarketingDashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    inventoryValue: 0,
    whatsappSent: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    fetchMarketingStats();
    fetchCampaigns();
  }, []);

  const fetchMarketingStats = async () => {
    try {
      const response = await axios.get(`${API}/api/marketing/stats`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching marketing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/api/marketing/campaigns`);
      if (response.data.success) {
        setCampaigns(response.data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500">Loading marketing dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Marketing Dashboard</h1>
          <p className="text-gray-600">Track sales performance and manage marketing campaigns</p>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-green-200 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-700 font-semibold">Today's Revenue</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                Rs. {stats.todayRevenue.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                Real-time tracking
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-700 font-semibold">This Week</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-600">
                Rs. {stats.weekRevenue.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-blue-600">
                <BarChart3 className="w-4 h-4 mr-1" />
                Last 7 days
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-700 font-semibold">This Month</CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-600">
                Rs. {stats.monthRevenue.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-purple-600">
                <DollarSign className="w-4 h-4 mr-1" />
                Monthly target
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader className="pb-3">
              <CardDescription className="text-orange-700 font-semibold">Conversion Rate</CardDescription>
              <CardTitle className="text-3xl font-bold text-orange-600">
                {stats.conversionRate}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-orange-600">
                <Target className="w-4 h-4 mr-1" />
                Orders / Visitors
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                WhatsApp Campaign
              </CardTitle>
              <CardDescription>Send bulk messages to customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-bold text-gray-900">{stats.whatsappSent}</div>
                <p className="text-sm text-gray-600">Messages sent today</p>
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => window.location.href = '/confirmation'}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Send Messages
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                Flash Sale
              </CardTitle>
              <CardDescription>Create time-limited offers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-bold text-gray-900">{campaigns.length}</div>
                <p className="text-sm text-gray-600">Active campaigns</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => toast.info("Flash sale feature coming soon!")}>
                  <Clock className="w-4 h-4 mr-2" />
                  Create Flash Sale
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Inventory Tags
              </CardTitle>
              <CardDescription>Manage product categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-bold text-gray-900">{stats.inventoryValue.toLocaleString()}</div>
                <p className="text-sm text-gray-600">Total inventory value</p>
                <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => window.location.href = '/inventory'}>
                  <Package className="w-4 h-4 mr-2" />
                  Manage Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>📈 Performance Metrics</CardTitle>
            <CardDescription>Key indicators for your business</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Orders</span>
                  <ShoppingCart className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Pending Orders</span>
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">WhatsApp Sent</span>
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.whatsappSent}</div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Avg Order Value</span>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  Rs. {stats.totalOrders > 0 ? Math.round(stats.monthRevenue / stats.totalOrders) : 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketingDashboard;
