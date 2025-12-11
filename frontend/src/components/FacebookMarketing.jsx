import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  RefreshCw,
  Eye,
  MousePointer,
  ShoppingCart,
  Facebook,
  Settings,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Calendar,
  Filter,
  Columns,
  MoreHorizontal,
  Brain,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import AICampaignOptimizer from './AICampaignOptimizer';

const API = process.env.REACT_APP_BACKEND_URL;

const FacebookMarketing = () => {
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignInsights, setCampaignInsights] = useState({});
  const [accountInsights, setAccountInsights] = useState(null);
  const [datePreset, setDatePreset] = useState('last_30d');
  const [audiences, setAudiences] = useState([]);
  const [stores, setStores] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [sortField, setSortField] = useState('spend');
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' or 'ai'
  const [sortDirection, setSortDirection] = useState('desc');
  const [visibleColumns, setVisibleColumns] = useState({
    delivery: true,
    results: true,
    costPerResult: true,
    budget: true,
    spend: true,
    impressions: true,
    reach: true,
    frequency: true,
    cpm: true,
    linkClicks: true,
    ctr: true,
    purchases: true,
    purchaseValue: true,
    roas: true,
    costPerPurchase: true,
    starts: true,
    ends: true
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  useEffect(() => {
    checkConnection();
    fetchStores();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchCampaignsWithInsights();
      fetchAccountInsights();
      fetchAudiences();
    }
  }, [selectedAccount, datePreset]);

  const checkConnection = async () => {
    try {
      const response = await axios.get(`${API}/api/facebook/status`);
      setConnectionStatus(response.data);
      
      if (response.data.success) {
        fetchAdAccounts();
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setConnectionStatus({ success: false, error: 'Failed to connect' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdAccounts = async () => {
    try {
      const response = await axios.get(`${API}/api/facebook/ad-accounts`);
      if (response.data.success) {
        const activeAccounts = response.data.ad_accounts.filter(
          acc => acc.amount_spent > 0 || !acc.name.includes('Read-Only')
        );
        setAdAccounts(activeAccounts);
        
        if (activeAccounts.length > 0 && !selectedAccount) {
          handleSelectAccount(activeAccounts[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
    }
  };

  const handleSelectAccount = async (accountId) => {
    try {
      await axios.post(`${API}/api/facebook/set-ad-account?ad_account_id=${accountId}`);
      setSelectedAccount(accountId);
      toast.success('Ad account selected');
    } catch (error) {
      toast.error('Failed to select ad account');
    }
  };

  const fetchCampaignsWithInsights = async () => {
    setLoadingInsights(true);
    try {
      // First fetch campaigns
      const campaignsResponse = await axios.get(`${API}/api/facebook/campaigns`);
      if (campaignsResponse.data.success) {
        const campaignList = campaignsResponse.data.campaigns;
        setCampaigns(campaignList);
        
        // Then fetch insights for each campaign (in batches to avoid rate limiting)
        const insights = {};
        for (const campaign of campaignList.slice(0, 20)) { // Limit to first 20 campaigns
          try {
            const insightResponse = await axios.get(
              `${API}/api/facebook/campaigns/${campaign.id}/insights?date_preset=${datePreset}`
            );
            if (insightResponse.data.success && insightResponse.data.metrics) {
              insights[campaign.id] = insightResponse.data.metrics;
            }
          } catch (e) {
            console.error(`Error fetching insights for campaign ${campaign.id}:`, e);
          }
        }
        setCampaignInsights(insights);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchAccountInsights = async () => {
    try {
      const response = await axios.get(`${API}/api/facebook/account/insights?date_preset=${datePreset}`);
      if (response.data.success) {
        setAccountInsights(response.data.metrics);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  const fetchAudiences = async () => {
    try {
      const response = await axios.get(`${API}/api/facebook/audiences`);
      if (response.data.success) {
        setAudiences(response.data.audiences);
      }
    } catch (error) {
      console.error('Error fetching audiences:', error);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/api/stores`);
      setStores(response.data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const syncStoreToAudience = async (storeName) => {
    setSyncing(true);
    try {
      const response = await axios.post(
        `${API}/api/facebook/audiences/sync-store?store_name=${storeName}`
      );
      
      if (response.data.success) {
        toast.success(`✅ Synced ${response.data.customers_synced} customers to Facebook audience`);
        fetchAudiences();
      } else {
        toast.error(response.data.error || 'Failed to sync');
      }
    } catch (error) {
      toast.error('Failed to sync store to audience');
    } finally {
      setSyncing(false);
    }
  };

  const toggleCampaignStatus = async (campaignId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    
    try {
      toast.loading(`${newStatus === 'ACTIVE' ? 'Activating' : 'Pausing'} campaign...`, { id: 'toggle' });
      
      const response = await axios.post(
        `${API}/api/facebook/campaigns/${campaignId}/status?status=${newStatus}`
      );
      
      if (response.data.success) {
        toast.success(`✅ Campaign ${newStatus.toLowerCase()}`, { id: 'toggle' });
        fetchCampaignsWithInsights();
      } else {
        toast.error(response.data.error || 'Failed to update', { id: 'toggle' });
      }
    } catch (error) {
      console.error('Error toggling campaign:', error);
      toast.error('Failed to update campaign status', { id: 'toggle' });
    }
  };

  const formatCurrency = (value, decimals = 0) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '-';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value?.toLocaleString() || '0';
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '-';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedCampaigns = () => {
    return [...campaigns].sort((a, b) => {
      const aInsight = campaignInsights[a.id] || {};
      const bInsight = campaignInsights[b.id] || {};
      
      let aVal, bVal;
      
      switch (sortField) {
        case 'spend':
          aVal = aInsight.spend || 0;
          bVal = bInsight.spend || 0;
          break;
        case 'impressions':
          aVal = aInsight.impressions || 0;
          bVal = bInsight.impressions || 0;
          break;
        case 'reach':
          aVal = aInsight.reach || 0;
          bVal = bInsight.reach || 0;
          break;
        case 'purchases':
          aVal = aInsight.purchases || 0;
          bVal = bInsight.purchases || 0;
          break;
        case 'roas':
          aVal = aInsight.purchase_roas || 0;
          bVal = bInsight.purchase_roas || 0;
          break;
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        default:
          aVal = aInsight[sortField] || 0;
          bVal = bInsight[sortField] || 0;
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  };

  const SortableHeader = ({ field, label, className = "" }) => (
    <th 
      className={`py-2 px-3 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-nowrap ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Connecting to Facebook...</p>
        </div>
      </div>
    );
  }

  const selectedAccountData = adAccounts.find(acc => acc.id === selectedAccount);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Bar - Facebook Ads Manager Style */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Facebook className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Ads Manager</h1>
              </div>
              
              {connectionStatus?.success && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-700">{connectionStatus.user?.name}</span>
                </div>
              )}

              {/* Tabs */}
              <div className="flex items-center gap-1 ml-4 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'campaigns' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 inline mr-2" />
                  Campaigns
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'ai' 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Brain className="w-4 h-4 inline mr-2" />
                  AI Optimizer
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Account Selector */}
              <Select value={selectedAccount} onValueChange={handleSelectAccount}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select Ad Account" />
                </SelectTrigger>
                <SelectContent>
                  {adAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Date Range */}
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-40">
                  <Calendar className="w-4 h-4 mr-2" />
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

              <Button onClick={fetchCampaignsWithInsights} variant="outline" size="sm" disabled={loadingInsights}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingInsights ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Summary Cards */}
        {accountInsights && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <p className="text-xs text-gray-500 mb-1">Amount Spent</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(accountInsights.spend, 2)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <p className="text-xs text-gray-500 mb-1">Impressions</p>
              <p className="text-lg font-bold text-gray-900">{formatNumber(accountInsights.impressions)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <p className="text-xs text-gray-500 mb-1">Reach</p>
              <p className="text-lg font-bold text-gray-900">{formatNumber(accountInsights.reach)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <p className="text-xs text-gray-500 mb-1">Frequency</p>
              <p className="text-lg font-bold text-gray-900">{accountInsights.frequency?.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <p className="text-xs text-gray-500 mb-1">Link Clicks</p>
              <p className="text-lg font-bold text-gray-900">{formatNumber(accountInsights.clicks)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <p className="text-xs text-gray-500 mb-1">CTR</p>
              <p className="text-lg font-bold text-gray-900">{formatPercent(accountInsights.ctr)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <p className="text-xs text-gray-500 mb-1">CPM</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(accountInsights.cpm, 2)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <p className="text-xs text-gray-500 mb-1">CPC</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(accountInsights.cpc, 2)}</p>
            </div>
          </div>
        )}

        {/* AI Optimizer Tab */}
        {activeTab === 'ai' && (
          <AICampaignOptimizer 
            campaigns={campaigns.map(c => ({...c, insights: campaignInsights[c.id] || {}}))} 
            onRefresh={fetchCampaignsWithInsights}
          />
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <>
        {/* Toolbar */}
        <div className="bg-white rounded-t-lg border border-b-0 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {campaigns.length} Campaigns
            </span>
            {loadingInsights && (
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Loading insights...
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowColumnSelector(!showColumnSelector)}
              >
                <Columns className="w-4 h-4 mr-2" />
                Columns
              </Button>
              
              {showColumnSelector && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg p-3 z-20 w-64 max-h-80 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-500 mb-2">SHOW/HIDE COLUMNS</p>
                  {Object.entries({
                    delivery: 'Delivery',
                    results: 'Results (Purchases)',
                    costPerResult: 'Cost per Result',
                    budget: 'Budget',
                    spend: 'Amount Spent',
                    impressions: 'Impressions',
                    reach: 'Reach',
                    frequency: 'Frequency',
                    cpm: 'CPM',
                    linkClicks: 'Link Clicks',
                    ctr: 'CTR',
                    purchases: 'Purchases',
                    purchaseValue: 'Purchase Value',
                    roas: 'ROAS',
                    costPerPurchase: 'Cost per Purchase',
                    starts: 'Starts',
                    ends: 'Ends'
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 py-1 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns[key]}
                        onChange={() => setVisibleColumns(prev => ({...prev, [key]: !prev[key]}))}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Campaigns Table - Facebook Ads Manager Style */}
        <div className="bg-white rounded-b-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50">Off/On</th>
                  <SortableHeader field="name" label="Campaign" className="text-left min-w-[200px]" />
                  {visibleColumns.delivery && <th className="py-2 px-3 text-xs font-semibold text-gray-600">Delivery</th>}
                  {visibleColumns.results && <SortableHeader field="purchases" label="Results" />}
                  {visibleColumns.costPerResult && <SortableHeader field="costPerPurchase" label="Cost per Result" />}
                  {visibleColumns.budget && <th className="py-2 px-3 text-xs font-semibold text-gray-600">Budget</th>}
                  {visibleColumns.spend && <SortableHeader field="spend" label="Amount Spent" />}
                  {visibleColumns.impressions && <SortableHeader field="impressions" label="Impressions" />}
                  {visibleColumns.reach && <SortableHeader field="reach" label="Reach" />}
                  {visibleColumns.frequency && <SortableHeader field="frequency" label="Frequency" />}
                  {visibleColumns.cpm && <SortableHeader field="cpm" label="CPM" />}
                  {visibleColumns.linkClicks && <SortableHeader field="link_clicks" label="Link Clicks" />}
                  {visibleColumns.ctr && <SortableHeader field="ctr" label="CTR" />}
                  {visibleColumns.purchases && <SortableHeader field="purchases" label="Purchases" />}
                  {visibleColumns.purchaseValue && <SortableHeader field="purchase_value" label="Purchase Value" />}
                  {visibleColumns.roas && <SortableHeader field="roas" label="ROAS" />}
                  {visibleColumns.costPerPurchase && <SortableHeader field="cost_per_purchase" label="Cost/Purchase" />}
                  {visibleColumns.starts && <th className="py-2 px-3 text-xs font-semibold text-gray-600">Starts</th>}
                  {visibleColumns.ends && <th className="py-2 px-3 text-xs font-semibold text-gray-600">Ends</th>}
                </tr>
              </thead>
              <tbody>
                {getSortedCampaigns().map((campaign, idx) => {
                  const insights = campaignInsights[campaign.id] || {};
                  const isActive = campaign.effective_status === 'ACTIVE';
                  
                  return (
                    <tr key={campaign.id} className={`border-b hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="py-2 px-3 sticky left-0 bg-inherit">
                        <div 
                          onClick={() => toggleCampaignStatus(campaign.id, campaign.effective_status)}
                          className={`w-10 h-5 rounded-full ${isActive ? 'bg-blue-600' : 'bg-gray-300'} relative cursor-pointer hover:opacity-80 transition-opacity`}
                          title={isActive ? 'Click to pause' : 'Click to activate'}
                        >
                          <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${isActive ? 'right-0.5' : 'left-0.5'}`} />
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="min-w-[200px]">
                          <p className="font-medium text-gray-900 truncate">{campaign.name}</p>
                          <p className="text-xs text-gray-500">{campaign.objective?.replace('OUTCOME_', '')}</p>
                        </div>
                      </td>
                      {visibleColumns.delivery && (
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            campaign.effective_status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-700' 
                              : campaign.effective_status === 'PAUSED'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {campaign.effective_status === 'ACTIVE' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                            {campaign.effective_status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.results && <td className="py-2 px-3 text-right font-medium">{insights.purchases || '-'}</td>}
                      {visibleColumns.costPerResult && <td className="py-2 px-3 text-right">{insights.cost_per_purchase ? formatCurrency(insights.cost_per_purchase, 2) : '-'}</td>}
                      {visibleColumns.budget && <td className="py-2 px-3 text-right">{campaign.daily_budget > 0 ? formatCurrency(campaign.daily_budget) : (campaign.lifetime_budget > 0 ? formatCurrency(campaign.lifetime_budget) + ' LT' : '-')}</td>}
                      {visibleColumns.spend && <td className="py-2 px-3 text-right font-medium">{insights.spend ? formatCurrency(insights.spend, 2) : '-'}</td>}
                      {visibleColumns.impressions && <td className="py-2 px-3 text-right">{formatNumber(insights.impressions)}</td>}
                      {visibleColumns.reach && <td className="py-2 px-3 text-right">{formatNumber(insights.reach)}</td>}
                      {visibleColumns.frequency && <td className="py-2 px-3 text-right">{insights.frequency?.toFixed(2) || '-'}</td>}
                      {visibleColumns.cpm && <td className="py-2 px-3 text-right">{insights.cpm ? formatCurrency(insights.cpm, 2) : '-'}</td>}
                      {visibleColumns.linkClicks && <td className="py-2 px-3 text-right">{formatNumber(insights.link_clicks)}</td>}
                      {visibleColumns.ctr && <td className="py-2 px-3 text-right">{formatPercent(insights.ctr)}</td>}
                      {visibleColumns.purchases && <td className="py-2 px-3 text-right font-medium text-green-600">{insights.purchases || '-'}</td>}
                      {visibleColumns.purchaseValue && <td className="py-2 px-3 text-right text-green-600">{insights.purchase_value ? formatCurrency(insights.purchase_value, 2) : '-'}</td>}
                      {visibleColumns.roas && <td className="py-2 px-3 text-right font-medium text-blue-600">{insights.purchase_roas ? `${insights.purchase_roas.toFixed(2)}x` : '-'}</td>}
                      {visibleColumns.costPerPurchase && <td className="py-2 px-3 text-right">{insights.cost_per_purchase ? formatCurrency(insights.cost_per_purchase, 2) : '-'}</td>}
                      {visibleColumns.starts && <td className="py-2 px-3 text-center text-xs">{formatDate(campaign.start_time)}</td>}
                      {visibleColumns.ends && <td className="py-2 px-3 text-center text-xs">{formatDate(campaign.stop_time)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {campaigns.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No campaigns found in this account</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section - CRM Sync & Audiences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Sync CRM to Facebook
              </CardTitle>
              <CardDescription className="text-xs">Create custom audiences from store customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stores.map(store => (
                  <div key={store.store_name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{store.store_name}</span>
                    <Button 
                      onClick={() => syncStoreToAudience(store.store_name)}
                      disabled={syncing}
                      size="sm"
                      variant="outline"
                    >
                      {syncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Custom Audiences
              </CardTitle>
              <CardDescription className="text-xs">{audiences.length} audiences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {audiences.slice(0, 8).map(audience => (
                  <div key={audience.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{audience.name}</p>
                      <p className="text-xs text-gray-500">~{formatNumber(audience.approximate_count || 0)} users</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Ready</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default FacebookMarketing;
