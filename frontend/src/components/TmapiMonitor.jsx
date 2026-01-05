import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Activity,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Database,
  Image as ImageIcon,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const TmapiMonitor = () => {
  const [usage, setUsage] = useState(null);
  const [importStats, setImportStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch TMAPI usage
      const usageRes = await fetch(`${API}/api/1688-scraper/tmapi/usage?days=7`);
      const usageData = await usageRes.json();
      if (usageData.success) {
        setUsage(usageData);
        setRecentLogs(usageData.recent_logs || []);
      }

      // Fetch import stats
      const statsRes = await fetch(`${API}/api/1688-scraper/import-history/stats`);
      const statsData = await statsRes.json();
      if (statsData.success) {
        setImportStats(statsData);
      }
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !usage) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">TMAPI Monitor</h2>
          <p className="text-gray-500 text-sm">Track API usage and product imports</p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* TMAPI Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Calls</p>
                <p className="text-2xl font-bold">{usage?.total_calls || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-400 mt-2">~{(usage?.total_calls || 0) * 50} points</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold">{usage?.success_rate || '0%'}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-400 mt-2">{usage?.successful_calls || 0} successful</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Est. Points Used</p>
                <p className="text-2xl font-bold">{usage?.estimated_points_used || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-xs text-gray-400 mt-2">Last 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Failed Calls</p>
                <p className="text-2xl font-bold">{usage?.failed_calls || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-xs text-gray-400 mt-2">Check logs for errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Import Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-500" />
            Product Import Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Package className="w-6 h-6 mx-auto text-gray-600 mb-2" />
              <p className="text-2xl font-bold">{importStats?.total_products || 0}</p>
              <p className="text-xs text-gray-500">Total Products</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <ImageIcon className="w-6 h-6 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{importStats?.with_images || 0}</p>
              <p className="text-xs text-gray-500">With Images</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Package className="w-6 h-6 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold">{importStats?.with_variants || 0}</p>
              <p className="text-xs text-gray-500">With Variants</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <ShoppingCart className="w-6 h-6 mx-auto text-orange-600 mb-2" />
              <p className="text-2xl font-bold">{importStats?.published_to_shopify || 0}</p>
              <p className="text-xs text-gray-500">Published</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Clock className="w-6 h-6 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold">{importStats?.imported_last_24h || 0}</p>
              <p className="text-xs text-gray-500">Last 24h</p>
            </div>
          </div>

          {/* By Source */}
          {importStats?.by_source && Object.keys(importStats.by_source).length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">By Source:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(importStats.by_source).map(([source, count]) => (
                  <Badge key={source} variant="outline" className="text-xs">
                    {source}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Usage by Endpoint */}
      {usage?.by_endpoint && Object.keys(usage.by_endpoint).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Usage by Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(usage.by_endpoint).map(([endpoint, stats]) => (
                <div key={endpoint} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <code className="text-sm">{endpoint}</code>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">{stats.total} calls</span>
                    <span className="text-green-600">{stats.success} ✓</span>
                    {stats.failed > 0 && <span className="text-red-600">{stats.failed} ✗</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Recent API Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Endpoint</th>
                  <th className="text-left py-2 px-2">Product ID</th>
                  <th className="text-left py-2 px-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2">
                      {log.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <code className="text-xs bg-gray-100 px-1 rounded">{log.endpoint}</code>
                    </td>
                    <td className="py-2 px-2">
                      <a
                        href={`https://detail.1688.com/offer/${log.product_id}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:underline"
                      >
                        {log.product_id}
                      </a>
                    </td>
                    <td className="py-2 px-2 text-gray-500 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {recentLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">
                      No API calls logged yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TmapiMonitor;
