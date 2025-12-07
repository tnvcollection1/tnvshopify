import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Play, Pause, Target, Users, DollarSign, TrendingUp } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'discount',
    target: 'all',
    discount_percentage: 0,
    start_date: '',
    end_date: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/campaigns`);
      setCampaigns(res.data.campaigns || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    try {
      await axios.post(`${API_URL}/api/campaigns/create`, newCampaign);
      alert('✅ Campaign created successfully!');
      setShowCreateModal(false);
      setNewCampaign({
        name: '',
        type: 'discount',
        target: 'all',
        discount_percentage: 0,
        start_date: '',
        end_date: '',
        status: 'draft'
      });
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('❌ Error creating campaign');
    }
  };

  const toggleCampaignStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await axios.put(`${API_URL}/api/campaigns/${id}/status`, { status: newStatus });
      fetchCampaigns();
    } catch (error) {
      console.error('Error toggling campaign:', error);
    }
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/campaigns/${id}`);
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              🎯 Campaign Manager
            </h1>
            <p className="text-gray-400">
              Create and manage marketing campaigns for your inventory
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="w-8 h-8 text-purple-400" />
            <span className="text-2xl font-bold">{campaigns.length}</span>
          </div>
          <h3 className="text-gray-400 text-sm">Total Campaigns</h3>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-900/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Play className="w-8 h-8 text-green-400" />
            <span className="text-2xl font-bold">{campaigns.filter(c => c.status === 'active').length}</span>
          </div>
          <h3 className="text-gray-400 text-sm">Active Campaigns</h3>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-yellow-900/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Pause className="w-8 h-8 text-yellow-400" />
            <span className="text-2xl font-bold">{campaigns.filter(c => c.status === 'draft').length}</span>
          </div>
          <h3 className="text-gray-400 text-sm">Draft Campaigns</h3>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-blue-900/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold">0</span>
          </div>
          <h3 className="text-gray-400 text-sm">Conversions</h3>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold">Active Campaigns</h2>
        </div>
        
        {campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-6">Create your first campaign to start promoting your inventory</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Create First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Campaign Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Target</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Discount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Period</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Status</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold">{campaign.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                        {campaign.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{campaign.target}</td>
                    <td className="px-6 py-4 text-green-400 font-semibold">
                      {campaign.discount_percentage}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {campaign.start_date} - {campaign.end_date}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {campaign.status === 'active' ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                          {campaign.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                          className="p-2 hover:bg-gray-600 rounded transition-colors"
                          title={campaign.status === 'active' ? 'Pause' : 'Activate'}
                        >
                          {campaign.status === 'active' ? (
                            <Pause className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <Play className="w-4 h-4 text-green-400" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="p-2 hover:bg-gray-600 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold">Create New Campaign</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Summer Clearance Sale"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Type</label>
                  <select
                    value={newCampaign.type}
                    onChange={(e) => setNewCampaign({...newCampaign, type: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="discount">Discount</option>
                    <option value="flash_sale">Flash Sale</option>
                    <option value="clearance">Clearance</option>
                    <option value="promotion">Promotion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Target Audience</label>
                  <select
                    value={newCampaign.target}
                    onChange={(e) => setNewCampaign({...newCampaign, target: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Customers</option>
                    <option value="new">New Customers</option>
                    <option value="returning">Returning Customers</option>
                    <option value="high_value">High Value Customers</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Discount Percentage</label>
                <input
                  type="number"
                  value={newCampaign.discount_percentage}
                  onChange={(e) => setNewCampaign({...newCampaign, discount_percentage: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 20"
                  min="0"
                  max="100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={newCampaign.start_date}
                    onChange={(e) => setNewCampaign({...newCampaign, start_date: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={newCampaign.end_date}
                    onChange={(e) => setNewCampaign({...newCampaign, end_date: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createCampaign}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
