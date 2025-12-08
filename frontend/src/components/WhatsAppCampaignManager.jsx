import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Megaphone, Plus, Users, Send, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const WhatsAppCampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    template_name: '',
    segment: 'ALL',
    store_name: 'ashmiaa'
  });

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/whatsapp/campaigns`);
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/whatsapp/templates?status=APPROVED`);
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.template_name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/whatsapp/campaigns/create`, newCampaign);
      alert(response.data.message);
      setShowCreateModal(false);
      setNewCampaign({ name: '', template_name: '', segment: 'ALL', store_name: 'ashmiaa' });
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'completed': { className: 'bg-green-600', icon: CheckCircle },
      'sending': { className: 'bg-blue-600', icon: Send },
      'scheduled': { className: 'bg-yellow-600', icon: Clock },
      'failed': { className: 'bg-red-600', icon: XCircle }
    };
    const config = statusMap[status] || statusMap['scheduled'];
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status?.toUpperCase()}
      </Badge>
    );
  };

  const getSegmentColor = (segment) => {
    const colors = {
      'VIP': 'bg-purple-100 text-purple-800',
      'HIGH_VALUE': 'bg-blue-100 text-blue-800',
      'MEDIUM_VALUE': 'bg-green-100 text-green-800',
      'NEW': 'bg-yellow-100 text-yellow-800',
      'DORMANT': 'bg-gray-100 text-gray-800',
      'ALL': 'bg-indigo-100 text-indigo-800'
    };
    return colors[segment] || colors['ALL'];
  };

  const calculateSuccessRate = (campaign) => {
    if (campaign.sent_count === 0) return 0;
    return Math.round((campaign.sent_count / campaign.total_recipients) * 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-blue-600" />
            WhatsApp Campaigns
          </h1>
          <p className="text-gray-600 mt-1">Create and manage marketing campaigns</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-sm text-gray-600">Total Campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {campaigns.filter(c => c.status === 'sending').length}
            </div>
            <p className="text-sm text-gray-600">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {campaigns.filter(c => c.status === 'completed').length}
            </div>
            <p className="text-sm text-gray-600">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)}
            </div>
            <p className="text-sm text-gray-600">Messages Sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {loading && campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-4">No campaigns yet</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                      <Badge className={getSegmentColor(campaign.segment)}>
                        {campaign.segment}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Template: <span className="font-mono">{campaign.template_name}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {new Date(campaign.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Campaign Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <Users className="w-5 h-5 mx-auto text-gray-600 mb-1" />
                    <p className="text-2xl font-bold">{campaign.total_recipients}</p>
                    <p className="text-xs text-gray-600">Recipients</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <CheckCircle className="w-5 h-5 mx-auto text-green-600 mb-1" />
                    <p className="text-2xl font-bold text-green-600">{campaign.sent_count || 0}</p>
                    <p className="text-xs text-gray-600">Sent</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <TrendingUp className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-2xl font-bold text-blue-600">{campaign.delivered_count || 0}</p>
                    <p className="text-xs text-gray-600">Delivered</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <CheckCircle className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                    <p className="text-2xl font-bold text-purple-600">{campaign.read_count || 0}</p>
                    <p className="text-xs text-gray-600">Read</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <XCircle className="w-5 h-5 mx-auto text-red-600 mb-1" />
                    <p className="text-2xl font-bold text-red-600">{campaign.failed_count || 0}</p>
                    <p className="text-xs text-gray-600">Failed</p>
                  </div>
                </div>

                {/* Progress Bar */}
                {campaign.status === 'sending' || campaign.status === 'completed' ? (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{calculateSuccessRate(campaign)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${calculateSuccessRate(campaign)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-4">Create New Campaign</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name *</label>
                <Input
                  placeholder="e.g., Flash Sale - Winter Collection"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Template *</label>
                <Select
                  value={newCampaign.template_name}
                  onValueChange={(value) => setNewCampaign({ ...newCampaign, template_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.status === 'APPROVED').map(template => (
                      <SelectItem key={template.name} value={template.name}>
                        {template.name} ({template.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.filter(t => t.status === 'APPROVED').length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    No approved templates. Please get templates approved first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Segment *</label>
                <Select
                  value={newCampaign.segment}
                  onValueChange={(value) => setNewCampaign({ ...newCampaign, segment: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Customers</SelectItem>
                    <SelectItem value="VIP">VIP (5+ orders, Rs 10,000+)</SelectItem>
                    <SelectItem value="HIGH_VALUE">High Value (Rs 5,000+)</SelectItem>
                    <SelectItem value="MEDIUM_VALUE">Medium Value (Rs 1,000-5,000)</SelectItem>
                    <SelectItem value="NEW">New Customers (0-1 orders)</SelectItem>
                    <SelectItem value="DORMANT">Dormant (No order in 90 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <p className="font-semibold text-blue-800">💡 Campaign Tips</p>
                <ul className="list-disc list-inside text-blue-700 mt-1 space-y-1">
                  <li>Test with small segment first</li>
                  <li>Template must be APPROVED to send</li>
                  <li>Messages are sent in background</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={createCampaign} disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create & Send'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppCampaignManager;
