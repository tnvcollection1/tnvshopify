import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  Building2,
  MapPin,
  Search,
  RefreshCw,
  Settings,
  ExternalLink,
  AlertCircle,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Target,
  BarChart3,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FacebookLeadAds = () => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupInfo, setSetupInfo] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [forms, setForms] = useState([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState(30);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  
  // Dialogs
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  
  // Edit state
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');

  useEffect(() => {
    fetchLeads();
    fetchStats();
    fetchSetupInfo();
    fetchSyncStatus();
    fetchForms();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLeads();
      fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [statusFilter, daysFilter, searchQuery, page]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('skip', (page * pageSize).toString());
      params.append('limit', pageSize.toString());
      params.append('days', daysFilter.toString());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await axios.get(`${API}/lead-ads/leads?${params}`);
      setLeads(response.data.leads || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/lead-ads/leads/stats?days=${daysFilter}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSetupInfo = async () => {
    try {
      const response = await axios.get(`${API}/lead-ads/setup-info`);
      setSetupInfo(response.data);
    } catch (error) {
      console.error('Error fetching setup info:', error);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await axios.get(`${API}/lead-ads/sync-status`);
      setSyncStatus(response.data);
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  const fetchForms = async () => {
    try {
      const response = await axios.get(`${API}/lead-ads/forms`);
      if (response.data.success) {
        setForms(response.data.forms || []);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const handleSyncLeads = async () => {
    setSyncing(true);
    try {
      const response = await axios.post(`${API}/lead-ads/sync?days=${daysFilter}`);
      if (response.data.success) {
        toast.success(`✅ Synced ${response.data.synced} new leads!`);
        if (response.data.skipped > 0) {
          toast.info(`Skipped ${response.data.skipped} existing leads`);
        }
        fetchLeads();
        fetchStats();
        fetchSyncStatus();
      } else {
        toast.error(response.data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing leads:', error);
      toast.error(error.response?.data?.detail || 'Failed to sync leads');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateLead = async (leadgenId, updates) => {
    try {
      await axios.patch(`${API}/lead-ads/leads/${leadgenId}`, updates);
      toast.success('Lead updated successfully');
      fetchLeads();
      fetchStats();
      setShowLeadDetail(false);
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleDeleteLead = async (leadgenId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    
    try {
      await axios.delete(`${API}/lead-ads/leads/${leadgenId}`);
      toast.success('Lead deleted');
      fetchLeads();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const openLeadDetail = (lead) => {
    setSelectedLead(lead);
    setEditNotes(lead.notes || '');
    setEditStatus(lead.status);
    setShowLeadDetail(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      qualified: 'bg-purple-100 text-purple-800 border-purple-200',
      converted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    return (
      <Badge className={styles[status] || 'bg-gray-100 text-gray-800'}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  const exportLeads = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Company', 'City', 'Status', 'Date'].join(','),
      ...leads.map(lead => [
        lead.full_name || '',
        lead.email || '',
        lead.phone || '',
        lead.company || '',
        lead.city || '',
        lead.status || '',
        lead.created_time || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facebook-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#f6f6f7]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-6 h-6 text-[#1877F2]" />
              Facebook Lead Ads
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Capture and manage leads from your Facebook & Instagram campaigns
            </p>
          </div>
          <div className="flex items-center gap-3">
            {syncStatus?.is_configured ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <AlertCircle className="w-3 h-3 mr-1" />
                Setup Required
              </Badge>
            )}
            <Button variant="outline" onClick={() => setShowSetupGuide(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Setup
            </Button>
            <Button variant="outline" onClick={exportLeads} disabled={leads.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              onClick={handleSyncLeads} 
              disabled={syncing || !syncStatus?.is_configured}
              className="bg-[#1877F2] hover:bg-[#166FE5]"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Sync from Facebook
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="w-5 h-5 text-[#1877F2]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Leads</p>
                  <p className="text-2xl font-semibold">{stats?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">New Leads</p>
                  <p className="text-2xl font-semibold">{stats?.new_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contacted</p>
                  <p className="text-2xl font-semibold">{stats?.contacted_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Converted</p>
                  <p className="text-2xl font-semibold">{stats?.converted_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className="w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={daysFilter.toString()} onValueChange={(v) => { setDaysFilter(parseInt(v)); setPage(0); }}>
                <SelectTrigger className="w-40">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads List */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Leads</CardTitle>
            <CardDescription>
              {total} total leads • Showing {leads.length} results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading leads...
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                  <Target className="w-10 h-10 text-[#1877F2]" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Leads Yet</h3>
                <p className="text-gray-500 mb-4">
                  Leads from your Facebook & Instagram campaigns will appear here
                </p>
                <Button onClick={() => setShowSetupGuide(true)} className="bg-[#1877F2] hover:bg-[#166FE5]">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Webhooks
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <div
                    key={lead.leadgen_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openLeadDetail(lead)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#1877F2] rounded-full flex items-center justify-center text-white font-semibold">
                        {lead.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">
                            {lead.full_name || 'Unknown'}
                          </h4>
                          {getStatusBadge(lead.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </span>
                          )}
                          {lead.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {lead.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400">
                        {formatDate(lead.created_time || lead.stored_at)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openLeadDetail(lead); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.leadgen_id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {leads.length > 0 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page + 1} of {Math.ceil(total / pageSize)}
                </span>
                <Button
                  variant="outline"
                  disabled={leads.length < pageSize || (page + 1) * pageSize >= total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={showLeadDetail} onOpenChange={setShowLeadDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>
              View and update lead information
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#1877F2] rounded-full flex items-center justify-center text-white text-xl font-semibold">
                  {selectedLead.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedLead.full_name || 'Unknown'}</h3>
                  {selectedLead.company && (
                    <p className="text-gray-500">{selectedLead.company}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="font-medium">{selectedLead.email || '—'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p className="font-medium">{selectedLead.phone || '—'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Location</label>
                  <p className="font-medium">
                    {[selectedLead.city, selectedLead.state, selectedLead.country]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Received</label>
                  <p className="font-medium">{formatDate(selectedLead.created_time || selectedLead.stored_at)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-2">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-2">Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  rows={3}
                />
              </div>

              {/* All Fields */}
              {selectedLead.all_fields && Object.keys(selectedLead.all_fields).length > 0 && (
                <div>
                  <label className="text-sm text-gray-500 block mb-2">All Form Fields</label>
                  <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                    {Object.entries(selectedLead.all_fields).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-500">{key}:</span>
                        <span className="font-medium">{value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeadDetail(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleUpdateLead(selectedLead.leadgen_id, { status: editStatus, notes: editNotes })}
              className="bg-[#1877F2] hover:bg-[#166FE5]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setup Guide Dialog */}
      <Dialog open={showSetupGuide} onOpenChange={setShowSetupGuide}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#1877F2]" />
              Facebook Lead Ads Webhook Setup
            </DialogTitle>
            <DialogDescription>
              Configure webhooks to receive leads in real-time
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Webhook URL */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Your Webhook URL</h4>
              <code className="block bg-white p-2 rounded text-sm break-all">
                {setupInfo?.webhook_url || 'Loading...'}
              </code>
              <p className="text-xs text-blue-600 mt-2">
                Use this URL in your Facebook App Dashboard
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Verify Token</h4>
              <code className="block bg-white p-2 rounded text-sm">
                {setupInfo?.verify_token || 'Loading...'}
              </code>
            </div>

            {/* Steps */}
            {setupInfo?.instructions?.map((instruction, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#1877F2] text-white text-sm flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <p className="text-gray-700">{instruction.replace(/^\d+\.\s*/, '')}</p>
              </div>
            ))}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Make sure your Facebook Page is subscribed to receive leadgen events.
                Go to Page Settings → Webhooks to verify the subscription.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupGuide(false)}>
              Close
            </Button>
            <Button
              onClick={() => window.open('https://developers.facebook.com/apps', '_blank')}
              className="bg-[#1877F2] hover:bg-[#166FE5]"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Facebook Developers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacebookLeadAds;
