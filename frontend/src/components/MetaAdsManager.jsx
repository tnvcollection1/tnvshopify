import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  MousePointer,
  DollarSign,
  Users,
  Target,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  GitCompare,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MetaAdsManager = () => {
  const { agent } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [realtimeStats, setRealtimeStats] = useState(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [datePreset, setDatePreset] = useState('last_7d');
  const [refreshing, setRefreshing] = useState(false);

  const tenantId = agent?.tenant_id || 'default';

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${API}/meta-ads/validate?tenant_id=${tenantId}`);
      const data = await response.json();
      
      setConnected(data.connected);
      
      if (data.connected) {
        await Promise.all([
          fetchCampaigns(),
          fetchSummary(),
          fetchRealtimeStats()
        ]);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`${API}/meta-ads/campaigns?tenant_id=${tenantId}`);
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API}/meta-ads/account-summary?tenant_id=${tenantId}&date_preset=${datePreset}`);
      const data = await response.json();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchRealtimeStats = async () => {
    try {
      const response = await fetch(`${API}/meta-ads/realtime-stats?tenant_id=${tenantId}`);
      const data = await response.json();
      if (data.success) {
        setRealtimeStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching realtime stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCampaigns(),
      fetchSummary(),
      fetchRealtimeStats()
    ]);
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const toggleCampaignSelection = (campaignId) => {
    setSelectedCampaigns(prev => {
      if (prev.includes(campaignId)) {
        return prev.filter(id => id !== campaignId);
      }
      if (prev.length >= 5) {
        toast.error('Maximum 5 campaigns can be compared');
        return prev;
      }
      return [...prev, campaignId];
    });
  };

  const compareCampaigns = async () => {
    if (selectedCampaigns.length < 2) {
      toast.error('Select at least 2 campaigns to compare');
      return;
    }
    
    try {
      const response = await fetch(
        `${API}/meta-ads/compare?tenant_id=${tenantId}&campaign_ids=${selectedCampaigns.join(',')}&date_preset=${datePreset}`
      );
      const data = await response.json();
      if (data.success) {
        setComparison(data.comparison);
      } else {
        toast.error(data.error || 'Comparison failed');
      }
    } catch (error) {
      console.error('Error comparing campaigns:', error);
      toast.error('Failed to compare campaigns');
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    const n = parseFloat(num);
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toFixed(2);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return '₹' + parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-[#1877F2]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-8 h-8 text-[#1877F2]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Connect Facebook Ads</h2>
            <p className="text-gray-400 mb-6">
              Connect your Meta Ads account to view campaign performance and compare ad effectiveness.
            </p>
            <Button
              onClick={() => window.location.href = '/settings'}
              className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
            >
              Configure in Settings
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const datePresets = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last_7d', label: 'Last 7 Days' },
    { id: 'last_14d', label: 'Last 14 Days' },
    { id: 'last_30d', label: 'Last 30 Days' },
    { id: 'this_month', label: 'This Month' }
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Meta Ads Manager</h1>
          <p className="text-gray-400 mt-1">Real-time campaign performance & comparison</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm">
            <CheckCircle className="w-4 h-4" />
            Connected
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-white/10 text-white hover:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Stats */}
      {realtimeStats && (
        <div className="bg-gradient-to-r from-[#1877F2]/20 to-emerald-500/20 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Today's Performance</h2>
            <span className="text-xs text-gray-400">Live</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Impressions</p>
              <p className="text-2xl font-bold text-white">{formatNumber(realtimeStats.impressions)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Clicks</p>
              <p className="text-2xl font-bold text-white">{formatNumber(realtimeStats.clicks)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">CTR</p>
              <p className="text-2xl font-bold text-emerald-400">{parseFloat(realtimeStats.ctr || 0).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Spend</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(realtimeStats.spend)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">CPC</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(realtimeStats.cpc)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Reach</p>
              <p className="text-2xl font-bold text-white">{formatNumber(realtimeStats.reach)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Period Summary */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-gray-400 text-sm">Period:</span>
        <div className="flex gap-2">
          {datePresets.map(preset => (
            <button
              key={preset.id}
              onClick={() => {
                setDatePreset(preset.id);
                fetchSummary();
              }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                datePreset === preset.id
                  ? 'bg-emerald-500 text-black font-medium'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-gray-400 text-sm">Impressions</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(summary.impressions)}</p>
          </div>
          
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-gray-400 text-sm">Clicks</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(summary.clicks)}</p>
          </div>
          
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-gray-400 text-sm">Spend</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.spend)}</p>
          </div>
          
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-gray-400 text-sm">Reach</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(summary.reach)}</p>
          </div>
        </div>
      )}

      {/* Campaign Comparison Section */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Campaign Comparison</h2>
            <p className="text-sm text-gray-400">Select 2-5 campaigns to compare performance</p>
          </div>
          <Button
            onClick={compareCampaigns}
            disabled={selectedCampaigns.length < 2}
            className="bg-emerald-500 hover:bg-emerald-600 text-black"
          >
            <GitCompare className="w-4 h-4 mr-2" />
            Compare ({selectedCampaigns.length})
          </Button>
        </div>
        
        <div className="p-6">
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No campaigns found</h3>
              <p className="text-gray-500">Create campaigns in Facebook Ads Manager to see them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(campaign => (
                <div
                  key={campaign.id}
                  onClick={() => toggleCampaignSelection(campaign.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    selectedCampaigns.includes(campaign.id)
                      ? 'bg-emerald-500/20 border border-emerald-500/50'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedCampaigns.includes(campaign.id)
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-white/30'
                      }`}>
                        {selectedCampaigns.includes(campaign.id) && (
                          <CheckCircle className="w-3 h-3 text-black" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{campaign.name}</h4>
                        <p className="text-sm text-gray-400">
                          {campaign.objective} • {campaign.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-gray-400">Budget</p>
                        <p className="text-white font-medium">
                          {formatCurrency(campaign.daily_budget || campaign.lifetime_budget)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        campaign.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : campaign.status === 'PAUSED'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Comparison Results</h2>
          </div>
          
          <div className="p-6">
            {/* Best performers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-emerald-400 text-sm mb-1">🏆 Best CTR</p>
                <p className="text-white font-semibold truncate">{comparison.best_ctr?.campaign_name}</p>
                <p className="text-emerald-400 text-lg font-bold">{parseFloat(comparison.best_ctr?.ctr || 0).toFixed(2)}%</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-400 text-sm mb-1">💰 Best CPC</p>
                <p className="text-white font-semibold truncate">{comparison.best_cpc?.campaign_name}</p>
                <p className="text-blue-400 text-lg font-bold">{formatCurrency(comparison.best_cpc?.cpc)}</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <p className="text-purple-400 text-sm mb-1">📊 Highest Reach</p>
                <p className="text-white font-semibold truncate">{comparison.highest_reach?.campaign_name}</p>
                <p className="text-purple-400 text-lg font-bold">{formatNumber(comparison.highest_reach?.reach)}</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-yellow-400 text-sm mb-1">⭐ Most Conversions</p>
                <p className="text-white font-semibold truncate">{comparison.most_conversions?.campaign_name}</p>
                <p className="text-yellow-400 text-lg font-bold">{comparison.most_conversions?.conversions || '0'}</p>
              </div>
            </div>
            
            {/* Detailed comparison table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                    <th className="pb-3 font-medium">Campaign</th>
                    <th className="pb-3 font-medium text-right">Impressions</th>
                    <th className="pb-3 font-medium text-right">Clicks</th>
                    <th className="pb-3 font-medium text-right">CTR</th>
                    <th className="pb-3 font-medium text-right">Spend</th>
                    <th className="pb-3 font-medium text-right">CPC</th>
                    <th className="pb-3 font-medium text-right">Reach</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.campaigns.map((campaign, index) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="py-4 text-white font-medium">{campaign.campaign_name}</td>
                      <td className="py-4 text-right text-gray-300">{formatNumber(campaign.impressions)}</td>
                      <td className="py-4 text-right text-gray-300">{formatNumber(campaign.clicks)}</td>
                      <td className="py-4 text-right">
                        <span className={campaign.ctr === comparison.best_ctr?.ctr ? 'text-emerald-400 font-semibold' : 'text-gray-300'}>
                          {parseFloat(campaign.ctr || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-4 text-right text-gray-300">{formatCurrency(campaign.spend)}</td>
                      <td className="py-4 text-right">
                        <span className={campaign.cpc === comparison.best_cpc?.cpc ? 'text-blue-400 font-semibold' : 'text-gray-300'}>
                          {formatCurrency(campaign.cpc)}
                        </span>
                      </td>
                      <td className="py-4 text-right text-gray-300">{formatNumber(campaign.reach)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaAdsManager;
