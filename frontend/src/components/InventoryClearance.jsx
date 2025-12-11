import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  DollarSign, 
  RefreshCw,
  Sparkles,
  Play,
  Trash2,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const API = process.env.REACT_APP_BACKEND_URL;

const InventoryClearance = () => {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('dead_stock');
  const [selectedStore, setSelectedStore] = useState('all');
  const [stores, setStores] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState('dead_stock');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [statsRes, campaignsRes, storesRes] = await Promise.all([
        axios.get(`${API}/api/clearance/stats`),
        axios.get(`${API}/api/clearance/campaigns`),
        axios.get(`${API}/api/stores`)
      ]);
      
      setStats(statsRes.data.stats);
      setCampaigns(campaignsRes.data.campaigns || []);
      setStores(storesRes.data.stores || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load clearance data');
    } finally {
      setLoading(false);
    }
  };

  const analyzeInventory = async () => {
    setAnalyzing(true);
    try {
      toast.loading('Analyzing inventory health...', { id: 'analyze' });
      const response = await axios.get(`${API}/api/clearance/health`, {
        params: { store_name: selectedStore === 'all' ? undefined : selectedStore }
      });
      
      if (response.data.success) {
        setHealthData(response.data);
        setStats(prev => ({
          ...prev,
          inventory_health: response.data.summary
        }));
        toast.success('Inventory analysis complete!', { id: 'analyze' });
      } else {
        toast.error(response.data.error || 'Analysis failed', { id: 'analyze' });
      }
    } catch (error) {
      console.error('Error analyzing:', error);
      toast.error('Failed to analyze inventory', { id: 'analyze' });
    } finally {
      setAnalyzing(false);
    }
  };

  const getAIRecommendations = async () => {
    setLoadingAI(true);
    try {
      toast.loading('Getting AI recommendations...', { id: 'ai' });
      const response = await axios.post(`${API}/api/clearance/ai-recommendations`, null, {
        params: { 
          store_name: selectedStore === 'all' ? undefined : selectedStore,
          category: selectedCategory
        }
      });
      
      if (response.data.success) {
        setAiRecommendations(response.data);
        toast.success('AI recommendations ready!', { id: 'ai' });
      } else {
        toast.error(response.data.error || 'Failed to get recommendations', { id: 'ai' });
      }
    } catch (error) {
      console.error('Error getting AI:', error);
      toast.error('Failed to get AI recommendations', { id: 'ai' });
    } finally {
      setLoadingAI(false);
    }
  };

  const runQuickClearance = async () => {
    setCreatingCampaign(true);
    try {
      toast.loading('Creating clearance campaign...', { id: 'campaign' });
      const response = await axios.post(`${API}/api/clearance/quick-clearance`, null, {
        params: {
          store_name: selectedStore || undefined,
          category: selectedCategory,
          auto_discount: true
        }
      });
      
      if (response.data.success) {
        toast.success('Clearance campaign created!', { id: 'campaign' });
        fetchInitialData();
      } else {
        toast.error(response.data.error || 'Failed to create campaign', { id: 'campaign' });
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign', { id: 'campaign' });
    } finally {
      setCreatingCampaign(false);
    }
  };

  const syncToShopify = async (campaignId) => {
    if (!selectedStore) {
      toast.error('Please select a store first');
      return;
    }
    
    try {
      toast.loading('Syncing to Shopify...', { id: 'sync' });
      const response = await axios.post(
        `${API}/api/clearance/campaigns/${campaignId}/sync`,
        null,
        { params: { store_name: selectedStore } }
      );
      
      if (response.data.success) {
        toast.success(`Synced ${response.data.synced} items to Shopify!`, { id: 'sync' });
        fetchInitialData();
      } else {
        toast.error(response.data.error || 'Sync failed', { id: 'sync' });
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Failed to sync to Shopify', { id: 'sync' });
    }
  };

  const deleteCampaign = async (campaignId) => {
    try {
      await axios.delete(`${API}/api/clearance/campaigns/${campaignId}`);
      toast.success('Campaign deleted');
      fetchInitialData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'dead_stock': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'slow_moving': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'moderate': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const inventoryHealth = stats?.inventory_health || {};

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-7 h-7 text-purple-600" />
              Smart Inventory Clearance
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              AI-powered inventory analysis and clearance recommendations (360-day threshold)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map(store => (
                  <SelectItem key={store.store_name} value={store.store_name}>
                    {store.store_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={analyzeInventory} disabled={analyzing}>
              {analyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Analyze Inventory
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Dead Stock (360+ days)</p>
                  <p className="text-2xl font-bold text-red-600">
                    {inventoryHealth.dead_stock_count || 0}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatCurrency(inventoryHealth.dead_stock_value)} at risk
                  </p>
                </div>
                <XCircle className="w-10 h-10 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Slow Moving (180-360d)</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {inventoryHealth.slow_moving_count || 0}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatCurrency(inventoryHealth.slow_moving_value)} at risk
                  </p>
                </div>
                <Clock className="w-10 h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total At Risk Value</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(inventoryHealth.total_at_risk_value)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {inventoryHealth.dead_stock_count + inventoryHealth.slow_moving_count || 0} items
                  </p>
                </div>
                <TrendingDown className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Campaigns</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.active_campaigns || 0}
                  </p>
                  <p className="text-xs text-gray-400">
                    {stats?.items_on_clearance || 0} items on sale
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Inventory Analysis */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dead_stock">Dead Stock</SelectItem>
                      <SelectItem value="slow_moving">Slow Moving</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    onClick={getAIRecommendations}
                    disabled={loadingAI}
                  >
                    {loadingAI ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                    )}
                    Get AI Recommendations
                  </Button>
                  
                  <Button 
                    onClick={runQuickClearance}
                    disabled={creatingCampaign}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {creatingCampaign ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Quick Clearance Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            {aiRecommendations && (
              <Card className="border-purple-200 bg-purple-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    AI Recommendations
                  </CardTitle>
                  <CardDescription>
                    {aiRecommendations.items_analyzed} items analyzed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {aiRecommendations.overall_strategy && (
                    <div className="mb-4 p-3 bg-white rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Strategy:</p>
                      <p className="text-sm text-gray-600">{aiRecommendations.overall_strategy}</p>
                    </div>
                  )}
                  
                  {aiRecommendations.recommendations && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {aiRecommendations.recommendations.slice(0, 10).map((rec, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                          <div>
                            <span className="font-medium">{rec.sku}</span>
                            <span className="text-gray-500 ml-2">- {rec.reason}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                              rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {rec.priority}
                            </span>
                            <span className="font-bold text-purple-600">
                              {rec.discount_percent}% off
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Inventory Categories */}
            {healthData && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Inventory by Category</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {['dead_stock', 'slow_moving', 'moderate'].map(category => {
                    const items = healthData.categories?.[category] || [];
                    const isExpanded = expandedCategory === category;
                    
                    return (
                      <div key={category} className="border rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100"
                          onClick={() => setExpandedCategory(isExpanded ? '' : category)}
                        >
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(category)}
                            <span className="font-medium capitalize">
                              {category.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({items.length} items)
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        
                        {isExpanded && items.length > 0 && (
                          <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                  <th className="text-left p-2">SKU</th>
                                  <th className="text-left p-2">Title</th>
                                  <th className="text-right p-2">Days</th>
                                  <th className="text-right p-2">Qty</th>
                                  <th className="text-right p-2">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.slice(0, 20).map((item, idx) => (
                                  <tr key={idx} className="border-t hover:bg-gray-50">
                                    <td className="p-2 font-mono text-xs">{item.sku}</td>
                                    <td className="p-2 truncate max-w-[200px]">{item.title}</td>
                                    <td className="p-2 text-right text-red-600">{item.days_without_sale}</td>
                                    <td className="p-2 text-right">{item.quantity}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.inventory_value)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Campaigns */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Clearance Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No campaigns yet</p>
                    <p className="text-xs mt-1">Create your first clearance campaign</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.slice(0, 5).map(campaign => (
                      <div key={campaign.campaign_id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm truncate max-w-[180px]">
                            {campaign.name}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            campaign.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {campaign.status}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>{campaign.total_items} items</p>
                          <p>Value: {formatCurrency(campaign.potential_recovery)}</p>
                          <p>Discount: {formatCurrency(campaign.discount_amount)}</p>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          {campaign.status === 'draft' && (
                            <Button 
                              size="sm" 
                              className="flex-1 h-7 text-xs"
                              onClick={() => syncToShopify(campaign.campaign_id)}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Sync to Shopify
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-7 text-xs text-red-600"
                            onClick={() => deleteCampaign(campaign.campaign_id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Thresholds Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Thresholds</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Dead Stock</span>
                  <span className="text-red-600 font-medium">360+ days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slow Moving</span>
                  <span className="text-orange-600 font-medium">180-360 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Moderate</span>
                  <span className="text-yellow-600 font-medium">90-180 days</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryClearance;
