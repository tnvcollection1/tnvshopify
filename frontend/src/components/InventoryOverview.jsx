import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Package, DollarSign, TrendingUp, TrendingDown, Truck, CheckCircle, Clock, AlertTriangle, Search, X, RefreshCw, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import axios from 'axios';
import { useStore } from '../contexts/StoreContext';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const InventoryOverview = () => {
  const { selectedStore: globalStore, getStoreName } = useStore();
  const [stats, setStats] = useState({
    total_items: 0,
    total_cost: 0,
    total_cost_inr: 0,
    total_cost_pkr: 0,
    total_sale_value: 0,
    total_profit: 0,
    inventory_sale_value: 0,
    inventory_profit: 0,
    items_with_sale_price: 0,
    can_fulfill_today: { count: 0, cost: 0, sale_value: 0, profit: 0 },
    in_transit_tracked: { count: 0, cost: 0, sale_value: 0, profit: 0 },
    delivered_recent: { count: 0, cost: 0, sale_value: 0, profit: 0 },
    unknown_old: { count: 0, cost: 0, sale_value: 0, profit: 0 },
    by_collection: [],
    by_size: [],
    by_color: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryItems, setCategoryItems] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchInventoryStats();
  }, [globalStore]);

  const fetchInventoryStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (globalStore !== 'all') params.append('store_name', globalStore);
      
      const response = await axios.get(`${API}/api/inventory/v2/overview-stats?${params}`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      toast.error('Failed to load inventory stats');
    } finally {
      setLoading(false);
    }
  };

  const syncPrices = async () => {
    setSyncing(true);
    try {
      const params = new URLSearchParams();
      if (globalStore !== 'all') params.append('store_name', globalStore);
      
      const response = await axios.post(`${API}/api/inventory/v2/sync-shopify-prices?${params}`);
      if (response.data.success) {
        toast.success(`Synced ${response.data.updated_count} items`);
        fetchInventoryStats();
      }
    } catch (error) {
      toast.error('Failed to sync prices');
    } finally {
      setSyncing(false);
    }
  };

  const [syncingStock, setSyncingStock] = useState(false);
  
  const syncStockFromShopify = async () => {
    if (globalStore === 'all') {
      toast.error('Please select a specific store first');
      return;
    }
    
    setSyncingStock(true);
    try {
      toast.loading('Syncing inventory from Shopify...');
      
      const response = await axios.post(`${API}/api/inventory/v2/sync-shopify-stock?store_name=${globalStore}`);
      
      toast.dismiss();
      
      if (response.data.success) {
        toast.success(
          `✅ ${response.data.message}\n` +
          `Created: ${response.data.created_count} | Updated: ${response.data.updated_count}`
        );
        fetchInventoryStats();
      } else {
        toast.error(response.data.message || 'Sync failed');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error syncing stock:', error);
      toast.error(error.response?.data?.detail || 'Failed to sync stock from Shopify');
    } finally {
      setSyncingStock(false);
    }
  };

  const loadCategoryItems = async (category) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setCategoryItems([]);
      return;
    }
    
    setSelectedCategory(category);
    setCategoryLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (globalStore !== 'all') params.append('store_name', globalStore);
      
      let endpoint = `${API}/api/inventory/v2`;
      
      // Map category to appropriate endpoint/params
      switch (category) {
        case 'all':
          // All items - no filter
          break;
        case 'by_cost':
          // Items sorted by cost (highest first)
          params.append('sort_by', 'cost_desc');
          break;
        case 'with_price':
          // Items that have sale price set
          params.append('has_price', 'true');
          break;
        case 'profitable':
          // Items with positive profit
          params.append('profitable', 'true');
          break;
        case 'can_fulfill':
          params.append('status', 'can_fulfill_today');
          break;
        case 'in_transit':
          params.append('status', 'in_transit');
          break;
        case 'delivered':
          params.append('status', 'delivered');
          break;
        case 'unknown':
          params.append('status', 'unknown');
          break;
        default:
          params.append('category', category);
      }
      
      const response = await axios.get(`${endpoint}?${params}&limit=100`);
      setCategoryItems(response.data.items || []);
    } catch (error) {
      console.error('Error loading category items:', error);
      setCategoryItems([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `Rs. ${(value || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shopify-style Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Inventory</h1>
              <p className="text-sm text-gray-500">
                {globalStore !== 'all' ? getStoreName(globalStore) : 'All locations'} • {stats.total_items.toLocaleString()} products
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                onClick={syncStockFromShopify}
                disabled={syncingStock || globalStore === 'all'}
              >
                {syncingStock ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Syncing Stock...</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" /> Sync from Shopify</>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={syncPrices}
                disabled={syncing}
              >
                {syncing ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Sync Prices</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Summary Stats - Shopify Style */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card 
            className={`bg-white border shadow-sm cursor-pointer transition-all hover:shadow-md ${
              selectedCategory === 'all' ? 'ring-2 ring-gray-500 border-gray-500' : 'border-gray-200'
            }`}
            onClick={() => loadCategoryItems('all')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Inventory</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_items.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Package className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`bg-white border shadow-sm cursor-pointer transition-all hover:shadow-md ${
              selectedCategory === 'by_cost_inr' ? 'ring-2 ring-orange-500 border-orange-500' : 'border-gray-200'
            }`}
            onClick={() => loadCategoryItems('by_cost_inr')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Cost (INR)</p>
                  <p className="text-2xl font-semibold text-orange-600">₹{(stats.total_cost_inr || 0).toLocaleString()}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">India stores</p>
            </CardContent>
          </Card>

          <Card 
            className={`bg-white border shadow-sm cursor-pointer transition-all hover:shadow-md ${
              selectedCategory === 'by_cost_pkr' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-gray-200'
            }`}
            onClick={() => loadCategoryItems('by_cost_pkr')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Cost (PKR)</p>
                  <p className="text-2xl font-semibold text-emerald-600">Rs.{(stats.total_cost_pkr || 0).toLocaleString()}</p>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Pakistan stores</p>
            </CardContent>
          </Card>

          <Card 
            className={`bg-white border shadow-sm cursor-pointer transition-all hover:shadow-md ${
              selectedCategory === 'with_price' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
            }`}
            onClick={() => loadCategoryItems('with_price')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Sale Value</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.total_sale_value)}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{stats.items_with_sale_price || 0} items with price</p>
            </CardContent>
          </Card>

          <Card 
            className={`bg-white border shadow-sm cursor-pointer transition-all hover:shadow-md ${
              selectedCategory === 'profitable' ? 'ring-2 ring-green-500 border-green-500' : 'border-gray-200'
            }`}
            onClick={() => loadCategoryItems('profitable')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Profit</p>
                  <p className={`text-2xl font-semibold ${stats.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(stats.total_profit)}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${stats.total_profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {stats.total_profit >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </div>
              {stats.total_cost > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {((stats.total_profit / stats.total_cost) * 100).toFixed(1)}% margin
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stock Status Cards - Shopify Style */}
        <div className="mb-6">
          <h2 className="text-base font-medium text-gray-900 mb-3">Stock Status</h2>
          <div className="grid grid-cols-4 gap-4">
            <Card 
              className={`bg-white border shadow-sm cursor-pointer transition-all hover:shadow-md ${
                selectedCategory === 'can_fulfill' ? 'ring-2 ring-green-500 border-green-500' : 'border-gray-200'
              }`}
              onClick={() => loadCategoryItems('can_fulfill')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Ready to Ship</p>
                    <p className="text-2xl font-semibold text-green-600">{stats.can_fulfill_today?.count || 0}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Cost</p>
                    <p className="font-medium">{formatCurrency(stats.can_fulfill_today?.cost)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Profit</p>
                    <p className={`font-medium ${(stats.can_fulfill_today?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.can_fulfill_today?.profit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`bg-white border shadow-sm cursor-pointer transition-all hover:shadow-md ${
                selectedCategory === 'in_transit' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
              }`}
              onClick={() => loadCategoryItems('in_transit')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">In Transit</p>
                    <p className="text-2xl font-semibold text-blue-600">{stats.in_transit_tracked?.count || 0}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Cost</p>
                    <p className="font-medium">{formatCurrency(stats.in_transit_tracked?.cost)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Profit</p>
                    <p className={`font-medium ${(stats.in_transit_tracked?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.in_transit_tracked?.profit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`bg-white border shadow-sm cursor-pointer transition-all hover:shadow-md ${
                selectedCategory === 'delivered' ? 'ring-2 ring-purple-500 border-purple-500' : 'border-gray-200'
              }`}
              onClick={() => loadCategoryItems('delivered')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Delivered</p>
                    <p className="text-2xl font-semibold text-purple-600">{stats.delivered_recent?.count || 0}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Cost</p>
                    <p className="font-medium">{formatCurrency(stats.delivered_recent?.cost)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Profit</p>
                    <p className={`font-medium ${(stats.delivered_recent?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.delivered_recent?.profit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`bg-white border shadow-sm cursor-pointer transition-all hover:shadow-md ${
                selectedCategory === 'unknown' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-gray-200'
              }`}
              onClick={() => loadCategoryItems('unknown')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Unknown Status</p>
                    <p className="text-2xl font-semibold text-amber-600">{stats.unknown_old?.count || 0}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Cost</p>
                    <p className="font-medium">{formatCurrency(stats.unknown_old?.cost)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Profit</p>
                    <p className={`font-medium ${(stats.unknown_old?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.unknown_old?.profit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Selected Category Items Table */}
        {selectedCategory && (
          <Card className="mb-6 bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200 py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  {selectedCategory === 'all' && '📦 All Inventory Items'}
                  {selectedCategory === 'by_cost' && '💰 Items by Cost'}
                  {selectedCategory === 'with_price' && '🏷️ Items with Sale Price'}
                  {selectedCategory === 'profitable' && '📈 Profitable Items'}
                  {selectedCategory === 'can_fulfill' && '✅ Ready to Ship Items'}
                  {selectedCategory === 'in_transit' && '🚚 In Transit Items'}
                  {selectedCategory === 'delivered' && '📦 Delivered Items'}
                  {selectedCategory === 'unknown' && '⚠️ Unknown Status Items'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {categoryLoading ? (
                <div className="p-8 text-center text-gray-500">Loading items...</div>
              ) : categoryItems.length > 0 ? (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 text-gray-600 font-medium">SKU</th>
                        <th className="text-left p-3 text-gray-600 font-medium">Product</th>
                        <th className="text-left p-3 text-gray-600 font-medium">Collection</th>
                        <th className="text-right p-3 text-gray-600 font-medium">Cost</th>
                        <th className="text-right p-3 text-gray-600 font-medium">Sale Price</th>
                        <th className="text-right p-3 text-gray-600 font-medium">Profit</th>
                        <th className="text-left p-3 text-gray-600 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {categoryItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 font-mono text-xs">{item.sku}</td>
                          <td className="p-3">{item.product_name || '-'}</td>
                          <td className="p-3">{item.collection || '-'}</td>
                          <td className="p-3 text-right">{formatCurrency(item.cost)}</td>
                          <td className="p-3 text-right">
                            {item.sale_price > 0 ? formatCurrency(item.sale_price) : (
                              <span className="text-gray-400">Not set</span>
                            )}
                          </td>
                          <td className={`p-3 text-right font-medium ${(item.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.sale_price > 0 ? formatCurrency(item.profit) : '-'}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {item.status || 'unknown'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">No items in this category</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Collections Breakdown */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200 py-3 px-4">
              <CardTitle className="text-base font-medium">By Collection</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                {stats.by_collection?.slice(0, 15).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50">
                    <span className="text-sm text-gray-700 truncate flex-1">{item._id || 'Unknown'}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{item.count} items</span>
                      <span className="text-sm font-medium text-gray-900 w-28 text-right">
                        {formatCurrency(item.total_cost)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200 py-3 px-4">
              <CardTitle className="text-base font-medium">By Size</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {stats.by_size?.map((item, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 cursor-pointer"
                  >
                    {item._id} <span className="text-gray-400 ml-1">({item.count})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InventoryOverview;
