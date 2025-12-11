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
  Pause
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API = process.env.REACT_APP_BACKEND_URL;

const FacebookMarketing = () => {
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [accountInsights, setAccountInsights] = useState(null);
  const [datePreset, setDatePreset] = useState('last_30d');
  const [audiences, setAudiences] = useState([]);
  const [stores, setStores] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkConnection();
    fetchStores();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchCampaigns();
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
        // Filter to show only accounts with spending (active accounts)
        const activeAccounts = response.data.ad_accounts.filter(
          acc => acc.amount_spent > 0 || !acc.name.includes('Read-Only')
        );
        setAdAccounts(activeAccounts);
        
        // Auto-select first active account
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

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/api/facebook/campaigns`);
      if (response.data.success) {
        setCampaigns(response.data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
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

  const formatCurrency = (value, currency = 'PKR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value?.toLocaleString() || '0';
  };

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Facebook className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Facebook Marketing</h1>
        </div>
        <p className="text-gray-600">Manage campaigns, audiences, and track ad performance</p>
      </div>

      {/* Connection Status */}
      {!connectionStatus?.success && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800">Not Connected</p>
                <p className="text-sm text-red-600">{connectionStatus?.error || 'Failed to connect to Facebook API'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {connectionStatus?.success && (
        <>
          {/* Account Selector & Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-gray-900">Connected as {connectionStatus.user?.name}</span>
                </div>
                <Select value={selectedAccount} onValueChange={handleSelectAccount}>
                  <SelectTrigger>
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-2">Date Range</p>
                <Select value={datePreset} onValueChange={setDatePreset}>
                  <SelectTrigger>
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Quick Actions</p>
                  <p className="font-medium">{campaigns.length} Campaigns</p>
                </div>
                <Button onClick={fetchCampaigns} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          {accountInsights && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-5 h-5 opacity-80" />
                    <span className="text-xs opacity-80">Spend</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(accountInsights.spend)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Eye className="w-5 h-5 opacity-80" />
                    <span className="text-xs opacity-80">Impressions</span>
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(accountInsights.impressions)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-5 h-5 opacity-80" />
                    <span className="text-xs opacity-80">Reach</span>
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(accountInsights.reach)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <MousePointer className="w-5 h-5 opacity-80" />
                    <span className="text-xs opacity-80">Clicks</span>
                  </div>
                  <p className="text-2xl font-bold">{formatNumber(accountInsights.clicks)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-5 h-5 opacity-80" />
                    <span className="text-xs opacity-80">CTR</span>
                  </div>
                  <p className="text-2xl font-bold">{accountInsights.ctr?.toFixed(2)}%</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-5 h-5 opacity-80" />
                    <span className="text-xs opacity-80">CPC</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(accountInsights.cpc)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Campaigns Table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Campaigns
              </CardTitle>
              <CardDescription>All campaigns in this ad account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Campaign Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Objective</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Daily Budget</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 15).map(campaign => (
                      <tr key={campaign.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            campaign.effective_status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-700' 
                              : campaign.effective_status === 'PAUSED'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {campaign.effective_status === 'ACTIVE' ? (
                              <Play className="w-3 h-3" />
                            ) : (
                              <Pause className="w-3 h-3" />
                            )}
                            {campaign.effective_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">{campaign.name}</td>
                        <td className="py-3 px-4 text-gray-600">{campaign.objective?.replace('OUTCOME_', '')}</td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          {campaign.daily_budget > 0 ? formatCurrency(campaign.daily_budget) : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(campaign.created_time).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {campaigns.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No campaigns found in this account
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sync CRM to Facebook */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Sync CRM Customers to Facebook
                </CardTitle>
                <CardDescription>Create custom audiences from your store customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stores.map(store => (
                    <div key={store.store_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{store.store_name}</p>
                        <p className="text-sm text-gray-600">Sync all customers to a Facebook audience</p>
                      </div>
                      <Button 
                        onClick={() => syncStoreToAudience(store.store_name)}
                        disabled={syncing}
                        size="sm"
                      >
                        {syncing ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Sync
                      </Button>
                    </div>
                  ))}
                  {stores.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No stores configured</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Custom Audiences
                </CardTitle>
                <CardDescription>Your Facebook custom audiences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {audiences.slice(0, 10).map(audience => (
                    <div key={audience.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{audience.name}</p>
                        <p className="text-sm text-gray-600">
                          ~{formatNumber(audience.approximate_count || 0)} users
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        audience.delivery_status?.code === 200 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {audience.operation_status?.code === 200 ? 'Ready' : 'Processing'}
                      </span>
                    </div>
                  ))}
                  {audiences.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No custom audiences yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default FacebookMarketing;
