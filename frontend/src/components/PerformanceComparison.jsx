import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  ShoppingCart,
  Target, 
  RefreshCw,
  BarChart3,
  ArrowRight,
  Facebook,
  Store,
  Percent,
  Eye,
  MousePointer,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API = process.env.REACT_APP_BACKEND_URL;

// Store to Facebook Ad Account mapping
const STORE_AD_ACCOUNT_MAP = {
  'asmia': {
    fb_account_id: 'act_7529265450431149',
    fb_account_name: 'Asmia',
    currency: 'INR'
  },
  'tnvcollectionpk': {
    fb_account_id: 'act_3108518676133383',
    fb_account_name: 'TNVPK',
    currency: 'PKR'
  },
  'tnvcollection': {
    fb_account_id: 'act_703560774245662',
    fb_account_name: 'tnv',
    currency: 'INR'
  },
  'ashmiaa': {
    fb_account_id: 'act_7529265450431149',
    fb_account_name: 'Asmia',
    currency: 'INR'
  }
};

const PerformanceComparison = () => {
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('last_30d');
  const [storePerformance, setStorePerformance] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllPerformance();
  }, [datePreset]);

  const fetchAllPerformance = async () => {
    setRefreshing(true);
    try {
      // Get stores from CRM
      const storesResponse = await axios.get(`${API}/api/stores`);
      const stores = storesResponse.data || [];
      
      const performanceData = [];
      
      for (const store of stores) {
        const storeName = store.store_name?.toLowerCase();
        const mapping = STORE_AD_ACCOUNT_MAP[storeName];
        
        if (mapping) {
          // Get Shopify sales data for this store
          const salesData = await fetchShopifySales(store.store_name);
          
          // Get Facebook ad performance
          const fbData = await fetchFacebookPerformance(mapping.fb_account_id);
          
          // Calculate true ROAS
          const trueRoas = fbData.spend > 0 ? (salesData.revenue / fbData.spend) : 0;
          
          performanceData.push({
            store_name: store.store_name,
            fb_account_name: mapping.fb_account_name,
            fb_account_id: mapping.fb_account_id,
            currency: mapping.currency,
            // Shopify metrics
            shopify_revenue: salesData.revenue,
            shopify_orders: salesData.orders,
            shopify_aov: salesData.orders > 0 ? salesData.revenue / salesData.orders : 0,
            // Facebook metrics
            fb_spend: fbData.spend,
            fb_impressions: fbData.impressions,
            fb_reach: fbData.reach,
            fb_clicks: fbData.clicks,
            fb_ctr: fbData.ctr,
            fb_cpc: fbData.cpc,
            fb_cpm: fbData.cpm,
            fb_purchases: fbData.purchases,
            fb_roas: fbData.roas,
            // Calculated metrics
            true_roas: trueRoas,
            cost_per_order: fbData.spend > 0 && salesData.orders > 0 ? fbData.spend / salesData.orders : 0,
            profit: salesData.revenue - fbData.spend
          });
        }
      }
      
      setStorePerformance(performanceData);
    } catch (error) {
      console.error('Error fetching performance:', error);
      toast.error('Failed to fetch performance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchShopifySales = async (storeName) => {
    try {
      // Get dashboard stats which includes revenue data
      const response = await axios.get(`${API}/api/dashboard/stats?store_name=${storeName}`);
      const stats = response.data;
      
      // Get orders for the store
      const ordersResponse = await axios.get(`${API}/api/customers?store_name=${storeName}&limit=1000`);
      const orders = ordersResponse.data || [];
      
      // Calculate total revenue from orders
      let totalRevenue = 0;
      let orderCount = 0;
      
      // Filter orders based on date preset
      const now = new Date();
      let startDate = new Date();
      
      switch (datePreset) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'last_7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'last_30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }
      
      for (const order of orders) {
        const orderDate = new Date(order.last_order_date || order.created_at);
        if (orderDate >= startDate) {
          totalRevenue += order.total_spent || 0;
          orderCount++;
        }
      }
      
      return {
        revenue: totalRevenue,
        orders: orderCount
      };
    } catch (error) {
      console.error(`Error fetching Shopify sales for ${storeName}:`, error);
      return { revenue: 0, orders: 0 };
    }
  };

  const fetchFacebookPerformance = async (accountId) => {
    try {
      // Set the ad account
      await axios.post(`${API}/api/facebook/set-ad-account?ad_account_id=${accountId}`);
      
      // Get account insights
      const response = await axios.get(`${API}/api/facebook/account/insights?date_preset=${datePreset}`);
      
      if (response.data.success && response.data.metrics) {
        return response.data.metrics;
      }
      
      return {
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        purchases: 0,
        roas: 0
      };
    } catch (error) {
      console.error(`Error fetching FB performance for ${accountId}:`, error);
      return {
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        purchases: 0,
        roas: 0
      };
    }
  };

  const formatCurrency = (value, currency = 'PKR') => {
    if (value === null || value === undefined) return '-';
    const symbol = currency === 'INR' ? '₹' : 'Rs.';
    return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '-';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '-';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  // Calculate totals
  const totals = storePerformance.reduce((acc, store) => ({
    shopify_revenue: acc.shopify_revenue + store.shopify_revenue,
    shopify_orders: acc.shopify_orders + store.shopify_orders,
    fb_spend: acc.fb_spend + store.fb_spend,
    fb_impressions: acc.fb_impressions + store.fb_impressions,
    fb_clicks: acc.fb_clicks + store.fb_clicks,
    profit: acc.profit + store.profit
  }), { shopify_revenue: 0, shopify_orders: 0, fb_spend: 0, fb_impressions: 0, fb_clicks: 0, profit: 0 });

  const overallRoas = totals.fb_spend > 0 ? totals.shopify_revenue / totals.fb_spend : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Performance Comparison
            </h1>
            <p className="text-gray-600 mt-1">Shopify Sales vs Facebook Ad Spend by Store</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last_7d">Last 7 Days</SelectItem>
                <SelectItem value="last_30d">Last 30 Days</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={fetchAllPerformance} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-5 h-5 opacity-80" />
              <span className="text-xs opacity-80">Shopify Revenue</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.shopify_revenue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Facebook className="w-5 h-5 opacity-80" />
              <span className="text-xs opacity-80">FB Ad Spend</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.fb_spend)}</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${totals.profit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} text-white`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              {totals.profit >= 0 ? <TrendingUp className="w-5 h-5 opacity-80" /> : <TrendingDown className="w-5 h-5 opacity-80" />}
              <span className="text-xs opacity-80">Profit</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.profit)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 opacity-80" />
              <span className="text-xs opacity-80">True ROAS</span>
            </div>
            <p className="text-2xl font-bold">{overallRoas.toFixed(2)}x</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-5 h-5 opacity-80" />
              <span className="text-xs opacity-80">Total Orders</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(totals.shopify_orders)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-5 h-5 opacity-80" />
              <span className="text-xs opacity-80">Impressions</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(totals.fb_impressions)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Store by Store Comparison */}
      <div className="space-y-4">
        {storePerformance.map((store, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardHeader className="bg-gray-50 border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-lg">{store.store_name}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <div className="flex items-center gap-2">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-700">{store.fb_account_name}</span>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                  store.true_roas >= 2 ? 'bg-green-100 text-green-700' :
                  store.true_roas >= 1 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  ROAS: {store.true_roas.toFixed(2)}x
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {/* Shopify Metrics */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <p className="text-xs text-green-600 font-medium mb-1">Shopify Revenue</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(store.shopify_revenue, store.currency)}</p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <p className="text-xs text-green-600 font-medium mb-1">Orders</p>
                  <p className="text-xl font-bold text-green-700">{store.shopify_orders}</p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <p className="text-xs text-green-600 font-medium mb-1">AOV</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(store.shopify_aov, store.currency)}</p>
                </div>

                {/* Facebook Metrics */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium mb-1">FB Ad Spend</p>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(store.fb_spend, store.currency)}</p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium mb-1">Impressions</p>
                  <p className="text-xl font-bold text-blue-700">{formatNumber(store.fb_impressions)}</p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium mb-1">Clicks</p>
                  <p className="text-xl font-bold text-blue-700">{formatNumber(store.fb_clicks)}</p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium mb-1">CTR</p>
                  <p className="text-xl font-bold text-blue-700">{formatPercent(store.fb_ctr)}</p>
                </div>

                {/* Calculated Metrics */}
                <div className={`rounded-lg p-3 border ${store.profit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <p className={`text-xs font-medium mb-1 ${store.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Profit</p>
                  <p className={`text-xl font-bold ${store.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatCurrency(store.profit, store.currency)}
                  </p>
                </div>
              </div>
              
              {/* Additional metrics row */}
              <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Cost per Order</p>
                  <p className="text-lg font-bold text-gray-700">
                    {store.cost_per_order > 0 ? formatCurrency(store.cost_per_order, store.currency) : '-'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">CPC</p>
                  <p className="text-lg font-bold text-gray-700">
                    {store.fb_cpc > 0 ? formatCurrency(store.fb_cpc, store.currency) : '-'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">CPM</p>
                  <p className="text-lg font-bold text-gray-700">
                    {store.fb_cpm > 0 ? formatCurrency(store.fb_cpm, store.currency) : '-'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">FB ROAS</p>
                  <p className="text-lg font-bold text-gray-700">
                    {typeof store.fb_roas === 'number' && store.fb_roas > 0 ? `${store.fb_roas.toFixed(2)}x` : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {storePerformance.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No matching stores found</p>
            <p className="text-sm text-gray-400 mt-2">Configure store-to-ad-account mappings to see performance</p>
          </CardContent>
        </Card>
      )}

      {/* Mapping Reference */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Store ↔ Ad Account Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(STORE_AD_ACCOUNT_MAP).filter((v, i, a) => 
              a.findIndex(t => t[1].fb_account_id === v[1].fb_account_id) === i
            ).map(([storeName, mapping]) => (
              <div key={storeName} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{storeName}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">{mapping.fb_account_name}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceComparison;
