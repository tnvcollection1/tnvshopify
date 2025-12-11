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
  
  // Clickable card states
  const [viewingCard, setViewingCard] = useState(null);
  const [cardOrders, setCardOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

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

  // Clickable card functions
  const viewCardDetails = async (cardType) => {
    setViewingCard(cardType);
    setLoadingOrders(true);
    
    try {
      const params = new URLSearchParams();
      params.append("limit", "100");
      
      // Filter by date range based on card type
      const today = new Date();
      
      if (cardType === 'today') {
        params.append("start_date", today.toISOString().split('T')[0]);
        params.append("end_date", today.toISOString().split('T')[0]);
      } else if (cardType === 'week') {
        const weekAgo = new Date(today.setDate(today.getDate() - 7));
        params.append("start_date", weekAgo.toISOString().split('T')[0]);
      } else if (cardType === 'month') {
        const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
        params.append("start_date", monthAgo.toISOString().split('T')[0]);
      } else if (cardType === 'pending') {
        params.append("fulfillment_status", "unfulfilled");
      } else if (cardType === 'total') {
        // All orders
      }
      
      params.append("sort_by", "date_desc");
      
      const response = await axios.get(`${API}/api/customers?${params.toString()}`);
      setCardOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching orders for card:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  const closeCardView = () => {
    setViewingCard(null);
    setCardOrders([]);
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

        {/* Revenue Stats - Clickable */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-green-200 shadow-lg bg-gradient-to-br from-green-50 to-green-100 cursor-pointer hover:shadow-xl hover:border-green-400 transition-all" onClick={() => viewCardDetails('today')}>
            <CardHeader className="pb-3">
              <CardDescription className="text-green-700 font-semibold">Today&apos;s Revenue</CardDescription>
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

          <Card className="border-blue-200 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer hover:shadow-xl hover:border-blue-400 transition-all" onClick={() => viewCardDetails('week')}>
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

          <Card className="border-purple-200 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 cursor-pointer hover:shadow-xl hover:border-purple-400 transition-all" onClick={() => viewCardDetails('month')}>
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

          <Card className="border-orange-200 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 cursor-pointer hover:shadow-xl hover:border-orange-400 transition-all" onClick={() => viewCardDetails('total')}>
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

        {/* Performance Metrics - Clickable */}
        <Card>
          <CardHeader>
            <CardTitle>📈 Performance Metrics</CardTitle>
            <CardDescription>Key indicators for your business - Click to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 hover:shadow transition-all" onClick={() => viewCardDetails('total')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Orders</span>
                  <ShoppingCart className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 hover:shadow transition-all" onClick={() => viewCardDetails('pending')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Pending Orders</span>
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 hover:shadow transition-all" onClick={() => toast.info('WhatsApp analytics coming soon!')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">WhatsApp Sent</span>
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.whatsappSent}</div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 hover:shadow transition-all" onClick={() => viewCardDetails('total')}>
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

      {/* Card Details Modal */}
      {viewingCard && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeCardView}>
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {viewingCard === 'today' && '💰 Today\'s Orders'}
                    {viewingCard === 'week' && '📅 This Week\'s Orders'}
                    {viewingCard === 'month' && '📆 This Month\'s Orders'}
                    {viewingCard === 'total' && '📦 All Orders'}
                    {viewingCard === 'pending' && '⏳ Pending Orders'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {loadingOrders ? 'Loading...' : `${cardOrders.length} orders found`}
                  </p>
                </div>
                <button
                  onClick={closeCardView}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {loadingOrders ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading orders...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cardOrders.map((order, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-bold text-lg text-gray-900">#{order.order_number}</div>
                          <div className="text-sm text-gray-600">{order.first_name} {order.last_name}</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          order.fulfillment_status === 'fulfilled' ? 'bg-green-100 text-green-800' :
                          order.fulfillment_status === 'unfulfilled' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.fulfillment_status || 'PENDING'}
                        </div>
                      </div>

                      <div className="space-y-2 mb-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{order.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{order.store_name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-bold text-green-600">Rs. {order.total_spent?.toLocaleString() || 0}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.last_order_date ? new Date(order.last_order_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingOrders && cardOrders.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No orders found for this period</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total: <span className="font-bold">{cardOrders.length}</span> orders | 
                Revenue: <span className="font-bold text-green-600">Rs. {cardOrders.reduce((sum, o) => sum + (o.total_spent || 0), 0).toLocaleString()}</span>
              </div>
              <button
                onClick={closeCardView}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingDashboard;
