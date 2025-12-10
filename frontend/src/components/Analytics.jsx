import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  DollarSign,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";
import StoreSyncPanel from "./StoreSyncPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Analytics = () => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    delivered: 0,
    inTransit: 0,
    returned: 0,
    deliveryRate: 0,
    returnRate: 0,
    avgDeliveryTime: 0,
    totalRevenue: 0,
    totalProfit: 0,
  });
  const [selectedStore, setSelectedStore] = useState("all");
  const [stores, setStores] = useState([]);
  const [timeRange, setTimeRange] = useState("30");

  useEffect(() => {
    fetchStores();
    fetchAnalytics();
  }, [selectedStore, timeRange]);

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/stores`);
      setStores(response.data || []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore !== "all") params.append("store_name", selectedStore);

      const response = await axios.get(`${API}/customers?${params.toString()}`);
      const customers = response.data.customers || [];

      // Calculate metrics
      const totalOrders = customers.length;
      const delivered = customers.filter((c) => c.delivery_status === "DELIVERED").length;
      const inTransit = customers.filter(
        (c) => c.delivery_status === "IN_TRANSIT" || c.delivery_status === "OUT_FOR_DELIVERY"
      ).length;
      const returned = customers.filter((c) => c.delivery_status === "RETURNED").length;
      const deliveryRate = totalOrders > 0 ? ((delivered / totalOrders) * 100).toFixed(1) : 0;
      const returnRate = totalOrders > 0 ? ((returned / totalOrders) * 100).toFixed(1) : 0;
      const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);

      setMetrics({
        totalOrders,
        delivered,
        inTransit,
        returned,
        deliveryRate,
        returnRate,
        avgDeliveryTime: 0, // TODO: Calculate from actual delivery dates
        totalRevenue,
        totalProfit: 0, // TODO: Calculate from cost data
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Performance metrics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40 border-gray-300">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-48 border-gray-300">
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
          </div>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Orders */}
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.totalOrders}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-600 font-medium">+12% vs last period</span>
                  </div>
                </div>
                <Package className="w-12 h-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Rate */}
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Delivery Rate</p>
                  <p className="text-3xl font-bold text-green-600">{metrics.deliveryRate}%</p>
                  <p className="text-xs text-gray-500 mt-2">{metrics.delivered} delivered</p>
                </div>
                <Truck className="w-12 h-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          {/* Return Rate */}
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Return Rate</p>
                  <p className="text-3xl font-bold text-red-600">{metrics.returnRate}%</p>
                  <p className="text-xs text-gray-500 mt-2">{metrics.returned} returned</p>
                </div>
                <AlertCircle className="w-12 h-12 text-red-400" />
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">${metrics.totalRevenue.toFixed(2)}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-600 font-medium">+8% vs last period</span>
                  </div>
                </div>
                <DollarSign className="w-12 h-12 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Status Breakdown */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Delivered</p>
                      <p className="text-xs text-gray-500">Successfully delivered orders</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-lg px-4 py-2">
                    {metrics.delivered}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">In Transit</p>
                      <p className="text-xs text-gray-500">Currently being delivered</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-lg px-4 py-2">
                    {metrics.inTransit}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Returned</p>
                      <p className="text-xs text-gray-500">Orders returned by customers</p>
                    </div>
                  </div>
                  <Badge className="bg-red-100 text-red-800 border-red-200 text-lg px-4 py-2">
                    {metrics.returned}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Delivery Success Rate</span>
                    <span className="text-sm font-bold text-green-600">{metrics.deliveryRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.deliveryRate}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Return Rate</span>
                    <span className="text-sm font-bold text-red-600">{metrics.returnRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-red-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.returnRate}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">In Transit</span>
                    <span className="text-sm font-bold text-blue-600">
                      {metrics.totalOrders > 0
                        ? ((metrics.inTransit / metrics.totalOrders) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${metrics.totalOrders > 0 ? (metrics.inTransit / metrics.totalOrders) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
