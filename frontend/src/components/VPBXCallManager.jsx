import React, { useState, useEffect, useCallback } from 'react';
import { 
  Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Play, Download, Search, RefreshCw, Clock, User, Calendar,
  Filter, ChevronLeft, ChevronRight, Volume2, ExternalLink,
  MessageSquare, Send, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Call response icons and colors
const getCallResponseStyle = (response) => {
  const styles = {
    'Connected': { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
    'Answered': { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
    'Missed': { icon: PhoneMissed, color: 'text-red-500', bg: 'bg-red-50' },
    'User not attended': { icon: PhoneMissed, color: 'text-orange-500', bg: 'bg-orange-50' },
    'User Busy': { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    'Agent Hang-up': { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50' },
  };
  return styles[response] || { icon: Phone, color: 'text-gray-500', bg: 'bg-gray-50' };
};

// Format duration
const formatDuration = (seconds) => {
  if (!seconds) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

// Format phone number for display
const formatPhone = (phone) => {
  if (!phone) return 'N/A';
  // Pakistani format: 03XX-XXXXXXX
  if (phone.startsWith('03') && phone.length === 11) {
    return `${phone.slice(0, 4)}-${phone.slice(4)}`;
  }
  return phone;
};

const VPBXCallManager = () => {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [templates, setTemplates] = useState({});
  
  // Filters
  const [callType, setCallType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Dialogs
  const [dialDialogOpen, setDialDialogOpen] = useState(false);
  const [orderCallDialogOpen, setOrderCallDialogOpen] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState(null);
  
  // Dial form
  const [dialForm, setDialForm] = useState({ phone: '', message: '' });
  const [orderForm, setOrderForm] = useState({ orderNumber: '', callType: 'order_confirmation' });
  const [calling, setCalling] = useState(false);

  // Fetch VPBX config
  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API}/api/zong-vpbx/config`);
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  // Fetch call templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API}/api/zong-vpbx/templates`);
      const data = await res.json();
      setTemplates(data.templates || {});
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  // Fetch call logs
  const fetchCallLogs = useCallback(async () => {
    setLoading(true);
    try {
      const body = {};
      if (callType !== 'all') body.call_type = callType;
      if (dateRange.start) body.start_date = dateRange.start;
      if (dateRange.end) body.end_date = dateRange.end;

      const res = await fetch(`${API}/api/zong-vpbx/get-call-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.success && data.data?.data) {
        setCallLogs(data.data.data);
      } else {
        setCallLogs([]);
      }
    } catch (error) {
      console.error('Failed to fetch call logs:', error);
      toast.error('Failed to fetch call logs');
    } finally {
      setLoading(false);
    }
  }, [callType, dateRange]);

  useEffect(() => {
    fetchConfig();
    fetchTemplates();
    fetchCallLogs();
  }, [fetchCallLogs]);

  // Filter logs by search
  const filteredLogs = callLogs.filter(log => {
    if (!searchQuery) return true;
    return log.customer_number?.includes(searchQuery) || 
           log.extension?.includes(searchQuery);
  });

  // Make a call
  const handleMakeCall = async () => {
    if (!dialForm.phone) {
      toast.error('Please enter a phone number');
      return;
    }

    setCalling(true);
    try {
      const res = await fetch(`${API}/api/zong-vpbx/make-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: dialForm.phone,
          message: dialForm.message || 'Test call from TNV Collection Pakistan'
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Call initiated to ${dialForm.phone}`);
        setDialDialogOpen(false);
        setDialForm({ phone: '', message: '' });
        // Refresh logs after a delay
        setTimeout(fetchCallLogs, 3000);
      } else {
        toast.error(data.detail || 'Failed to make call');
      }
    } catch (error) {
      toast.error('Failed to make call');
    } finally {
      setCalling(false);
    }
  };

  // Call by order number
  const handleOrderCall = async () => {
    if (!orderForm.orderNumber) {
      toast.error('Please enter an order number');
      return;
    }

    setCalling(true);
    try {
      const res = await fetch(`${API}/api/zong-vpbx/call-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopify_order_number: orderForm.orderNumber,
          call_type: orderForm.callType
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Call sent! Order #${data.order_number} → ${data.phone_number}`);
        setOrderCallDialogOpen(false);
        setOrderForm({ orderNumber: '', callType: 'order_confirmation' });
        setTimeout(fetchCallLogs, 3000);
      } else {
        toast.error(data.detail || 'Failed to call order');
      }
    } catch (error) {
      toast.error('Failed to call order');
    } finally {
      setCalling(false);
    }
  };

  // Stats
  const stats = {
    total: callLogs.length,
    connected: callLogs.filter(l => l.call_response === 'Connected' || l.call_response === 'Answered').length,
    missed: callLogs.filter(l => l.call_response === 'Missed' || l.call_response === 'User not attended').length,
    inbound: callLogs.filter(l => l.call_type === 'inbound').length,
    outbound: callLogs.filter(l => l.call_type === 'outbound').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">VPBX Call Manager</h1>
                <p className="text-sm text-gray-500">
                  {config?.status === 'configured' ? (
                    <span className="text-green-600">● Connected to Zong VPBX</span>
                  ) : (
                    <span className="text-red-600">● Not configured</span>
                  )}
                  {' • '}{config?.target_store || 'tnvcollectionpk'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDialDialogOpen(true)}
                className="gap-2"
              >
                <PhoneOutgoing className="w-4 h-4" />
                Quick Dial
              </Button>
              <Button 
                onClick={() => setOrderCallDialogOpen(true)}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <MessageSquare className="w-4 h-4" />
                Call by Order #
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Calls</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Phone className="w-8 h-8 text-gray-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Connected</p>
                  <p className="text-2xl font-bold text-green-600">{stats.connected}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Missed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.missed}</p>
                </div>
                <PhoneMissed className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inbound</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.inbound}</p>
                </div>
                <PhoneIncoming className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Outbound</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.outbound}</p>
                </div>
                <PhoneOutgoing className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={callType} onValueChange={setCallType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Call Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calls</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-[150px]"
                placeholder="Start Date"
              />
              
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-[150px]"
                placeholder="End Date"
              />
              
              <Button 
                variant="outline" 
                onClick={fetchCallLogs}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Call Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Call History
              <Badge variant="secondary" className="ml-2">{filteredLogs.length} calls</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No call logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Extension</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Duration</th>
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Recording</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, idx) => {
                      const responseStyle = getCallResponseStyle(log.call_response);
                      const ResponseIcon = responseStyle.icon;
                      
                      return (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-3">
                            {log.call_type === 'inbound' ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <PhoneIncoming className="w-3 h-3 mr-1" />
                                Inbound
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                <PhoneOutgoing className="w-3 h-3 mr-1" />
                                Outbound
                              </Badge>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="font-medium">{formatPhone(log.customer_number)}</div>
                            {log.master_number && (
                              <div className="text-xs text-gray-500">via {log.master_number}</div>
                            )}
                          </td>
                          <td className="py-3 text-sm text-gray-600">
                            {log.extension || '-'}
                          </td>
                          <td className="py-3">
                            <div className={`flex items-center gap-1.5 ${responseStyle.color}`}>
                              <ResponseIcon className="w-4 h-4" />
                              <span className="text-sm">{log.call_response}</span>
                            </div>
                          </td>
                          <td className="py-3 text-sm">
                            {log.duration > 0 ? (
                              <span className="font-medium text-green-600">
                                {formatDuration(log.duration)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 text-sm text-gray-600">
                            {log.time}
                          </td>
                          <td className="py-3">
                            {log.recording ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedRecording(log.recording)}
                                className="gap-1 text-green-600 hover:text-green-700"
                              >
                                <Play className="w-4 h-4" />
                                Play
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDialForm({ phone: log.customer_number, message: '' });
                                setDialDialogOpen(true);
                              }}
                              className="gap-1"
                            >
                              <PhoneCall className="w-4 h-4" />
                              Call
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Dial Dialog */}
      <Dialog open={dialDialogOpen} onOpenChange={setDialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneOutgoing className="w-5 h-5 text-green-600" />
              Quick Dial
            </DialogTitle>
            <DialogDescription>
              Enter a phone number to call. The call will be logged in the VPBX system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Phone Number</label>
              <Input
                placeholder="03XX-XXXXXXX or +92..."
                value={dialForm.phone}
                onChange={(e) => setDialForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Message (Optional)</label>
              <textarea
                className="w-full p-3 border rounded-md text-sm resize-none"
                rows={3}
                placeholder="Enter a message for the call..."
                value={dialForm.message}
                onChange={(e) => setDialForm(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMakeCall} 
              disabled={calling}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {calling ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              {calling ? 'Calling...' : 'Make Call'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call by Order Dialog */}
      <Dialog open={orderCallDialogOpen} onOpenChange={setOrderCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Call by Order Number
            </DialogTitle>
            <DialogDescription>
              Enter an order number to automatically call the customer with a pre-defined message.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Order Number</label>
              <Input
                placeholder="e.g., 28754"
                value={orderForm.orderNumber}
                onChange={(e) => setOrderForm(prev => ({ ...prev, orderNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Call Type</label>
              <Select 
                value={orderForm.callType} 
                onValueChange={(v) => setOrderForm(prev => ({ ...prev, callType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_confirmation">📦 Order Confirmation (Urdu)</SelectItem>
                  <SelectItem value="order_confirmation_english">📦 Order Confirmation (English)</SelectItem>
                  <SelectItem value="delivery_update">🚚 Delivery Update</SelectItem>
                  <SelectItem value="cod_reminder">💵 COD Reminder</SelectItem>
                  <SelectItem value="out_for_delivery">🏃 Out for Delivery</SelectItem>
                  <SelectItem value="delivery_failed">❌ Delivery Failed</SelectItem>
                  <SelectItem value="feedback_request">⭐ Feedback Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {templates[orderForm.callType] && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Message Preview:</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {templates[orderForm.callType].substring(0, 200)}...
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderCallDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleOrderCall} 
              disabled={calling}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {calling ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {calling ? 'Calling...' : 'Call Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recording Player Dialog */}
      <Dialog open={!!selectedRecording} onOpenChange={() => setSelectedRecording(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-green-600" />
              Call Recording
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <audio controls className="w-full" src={selectedRecording}>
              Your browser does not support the audio element.
            </audio>
            
            <div className="mt-4 flex justify-center">
              <a 
                href={selectedRecording} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                Open in new tab
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VPBXCallManager;
