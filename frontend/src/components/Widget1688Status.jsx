import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ShoppingCart,
  Loader2,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;

const Widget1688Status = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todays_orders: 0,
    pending_1688: 0,
    ordered_on_1688: 0,
    shipped_from_supplier: 0,
    with_dwz: 0,
    synced_to_shopify: 0,
    recent_orders: [],
  });

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch multiple stats in parallel
      const [summaryRes, pipelineRes, ordersRes] = await Promise.all([
        fetch(`${API}/api/fulfillment/sync-status-summary`),
        fetch(`${API}/api/fulfillment/pending-sync?page_size=5`),
        fetch(`${API}/api/1688/purchase-orders?limit=5`),
      ]);

      const [summaryData, pipelineData, ordersData] = await Promise.all([
        summaryRes.json(),
        pipelineRes.json(),
        ordersRes.json(),
      ]);

      // Calculate stats
      const byStatus = summaryData?.summary?.by_status || {};
      
      setStats({
        todays_orders: summaryData?.summary?.total_orders || 0,
        pending_1688: (byStatus.new?.count || 0) + (byStatus.pending?.count || 0),
        ordered_on_1688: byStatus.purchased?.count || byStatus.ordered?.count || 0,
        shipped_from_supplier: byStatus.shipped_from_supplier?.count || 0,
        with_dwz: byStatus.sent_to_dwz56?.count || 0,
        synced_to_shopify: summaryData?.summary?.already_synced || 0,
        recent_orders: (ordersData?.orders || []).slice(0, 5),
        ready_for_sync: summaryData?.summary?.ready_for_sync?.total || 0,
      });
    } catch (e) {
      console.error('Error fetching 1688 stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700',
      pending: 'bg-yellow-100 text-yellow-700',
      purchased: 'bg-purple-100 text-purple-700',
      ordered: 'bg-purple-100 text-purple-700',
      shipped_from_supplier: 'bg-orange-100 text-orange-700',
      sent_to_dwz56: 'bg-cyan-100 text-cyan-700',
      fulfilled: 'bg-green-100 text-green-700',
      created: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2 overflow-hidden" data-testid="widget-1688-status">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold">1688 Orders Today</h3>
              <p className="text-sm text-white/80">Quick overview of your supply chain</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={fetchStats}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Status Pipeline */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          <div 
            className="text-center p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => navigate('/orders')}
          >
            <Clock className="w-4 h-4 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold text-blue-700">{stats.pending_1688}</p>
            <p className="text-[10px] text-blue-600">Pending</p>
          </div>
          
          <div 
            className="text-center p-2 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
            onClick={() => navigate('/purchase-1688')}
          >
            <Package className="w-4 h-4 mx-auto text-purple-500 mb-1" />
            <p className="text-lg font-bold text-purple-700">{stats.ordered_on_1688}</p>
            <p className="text-[10px] text-purple-600">Ordered</p>
          </div>
          
          <div 
            className="text-center p-2 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
            onClick={() => navigate('/fulfillment')}
          >
            <Truck className="w-4 h-4 mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold text-orange-700">{stats.shipped_from_supplier}</p>
            <p className="text-[10px] text-orange-600">Shipped</p>
          </div>
          
          <div 
            className="text-center p-2 bg-cyan-50 rounded-lg cursor-pointer hover:bg-cyan-100 transition-colors"
            onClick={() => navigate('/dwz56-shipping')}
          >
            <Zap className="w-4 h-4 mx-auto text-cyan-500 mb-1" />
            <p className="text-lg font-bold text-cyan-700">{stats.with_dwz}</p>
            <p className="text-[10px] text-cyan-600">With DWZ</p>
          </div>
          
          <div 
            className="text-center p-2 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
            onClick={() => navigate('/fulfillment-sync')}
          >
            <AlertCircle className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold text-yellow-700">{stats.ready_for_sync || 0}</p>
            <p className="text-[10px] text-yellow-600">To Sync</p>
          </div>
          
          <div 
            className="text-center p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
            onClick={() => navigate('/orders')}
          >
            <CheckCircle2 className="w-4 h-4 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold text-green-700">{stats.synced_to_shopify}</p>
            <p className="text-[10px] text-green-600">Synced</p>
          </div>
        </div>

        {/* Recent 1688 Orders */}
        {stats.recent_orders.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Recent 1688 Orders</h4>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-xs text-orange-600 h-6"
                onClick={() => navigate('/purchase-1688')}
              >
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-2">
              {stats.recent_orders.map((order, idx) => (
                <div 
                  key={order.alibaba_order_id || idx}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">
                      #{order.shopify_order_id || order.alibaba_order_id?.slice(-6)}
                    </span>
                    <Badge className={`text-[10px] ${getStatusColor(order.status)}`}>
                      {order.status || 'pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">
                      {order.product_id?.slice(-8)}...
                    </span>
                    {order.alibaba_order_id && (
                      <a
                        href={`https://trade.1688.com/order/buyer_order_detail.htm?orderId=${order.alibaba_order_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-500 hover:text-orange-700"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() => navigate('/bulk-order-1688')}
          >
            <Package className="w-3 h-3 mr-1" />
            Bulk Order
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() => navigate('/fulfillment-sync')}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Sync Fulfillment
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs bg-orange-500 hover:bg-orange-600"
            onClick={() => navigate('/product-collector')}
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            Import Products
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Widget1688Status;
