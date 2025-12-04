import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Calendar, Clock, Zap, Play, Pause, Trash2, Plus, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const AutomationScheduler = () => {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    type: 'whatsapp_campaign',
    trigger: 'daily',
    time: '09:00',
    segment: 'pending',
    template: 'order_ready',
    days: ['monday', 'wednesday', 'friday']
  });

  const automationTypes = [
    { value: 'whatsapp_campaign', label: '📱 WhatsApp Campaign', desc: 'Send scheduled messages' },
    { value: 'flash_sale', label: '⚡ Auto Flash Sale', desc: 'Create timed sales' },
    { value: 'price_update', label: '💰 Price Updates', desc: 'Adjust pricing automatically' },
    { value: 'stock_alert', label: '📦 Stock Alerts', desc: 'Notify on low stock' },
    { value: 'restock_message', label: '🔔 Restock Notify', desc: 'Message when back in stock' }
  ];

  const triggerTypes = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly (Select Days)' },
    { value: 'monthly', label: 'Monthly (1st of month)' },
    { value: 'on_event', label: 'On Event (Stock, Order, etc.)' }
  ];

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      const response = await axios.get(`${API}/api/automations`);
      if (response.data.success) {
        setAutomations(response.data.automations || []);
      }
    } catch (error) {
      console.error('Error fetching automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAutomation = async () => {
    try {
      const response = await axios.post(`${API}/api/automations/create`, newAutomation);
      
      if (response.data.success) {
        toast.success('Automation created!');
        setCreateDialog(false);
        setNewAutomation({
          name: '',
          type: 'whatsapp_campaign',
          trigger: 'daily',
          time: '09:00',
          segment: 'pending',
          template: 'order_ready',
          days: ['monday', 'wednesday', 'friday']
        });
        await fetchAutomations();
      }
    } catch (error) {
      console.error('Error creating automation:', error);
      toast.error('Failed to create automation');
    }
  };

  const handleToggleAutomation = async (automationId, currentStatus) => {
    try {
      const response = await axios.post(`${API}/api/automations/${automationId}/toggle`, {
        active: !currentStatus
      });
      
      if (response.data.success) {
        toast.success(currentStatus ? 'Automation paused' : 'Automation activated');
        await fetchAutomations();
      }
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast.error('Failed to update automation');
    }
  };

  const handleDeleteAutomation = async (automationId) => {
    if (!confirm('Delete this automation?')) return;
    
    try {
      const response = await axios.delete(`${API}/api/automations/${automationId}`);
      
      if (response.data.success) {
        toast.success('Automation deleted');
        await fetchAutomations();
      }
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast.error('Failed to delete automation');
    }
  };

  const handleRunNow = async (automationId) => {
    try {
      const response = await axios.post(`${API}/api/automations/${automationId}/run`);
      
      if (response.data.success) {
        toast.success('Automation executed!');
        await fetchAutomations();
      }
    } catch (error) {
      console.error('Error running automation:', error);
      toast.error('Failed to run automation');
    }
  };

  const getNextRun = (automation) => {
    if (!automation.next_run) return 'Not scheduled';
    
    const nextRun = new Date(automation.next_run);
    const now = new Date();
    const diff = nextRun - now;
    
    if (diff < 0) return 'Overdue';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours < 24) {
      return `In ${hours}h ${minutes}m`;
    } else {
      return nextRun.toLocaleDateString();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🤖 Automation Scheduler</h1>
            <p className="text-gray-600">Set up automated campaigns and let the system work for you</p>
          </div>
          <Button
            onClick={() => setCreateDialog(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Automation
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-700 font-semibold">Active Automations</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                {automations.filter(a => a.active).length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-700 font-semibold">Total Runs</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-600">
                {automations.reduce((sum, a) => sum + (a.run_count || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-700 font-semibold">Messages Sent</CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-600">
                {automations.reduce((sum, a) => sum + (a.messages_sent || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-orange-700 font-semibold">Time Saved</CardDescription>
              <CardTitle className="text-3xl font-bold text-orange-600">
                {automations.reduce((sum, a) => sum + (a.run_count || 0), 0) * 15} min
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Automations List */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Automations</CardTitle>
            <CardDescription>Manage your automated tasks</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading automations...
                      </TableCell>
                    </TableRow>
                  ) : automations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No automations created yet. Click "Create Automation" to get started!
                      </TableCell>
                    </TableRow>
                  ) : (
                    automations.map((automation) => (
                      <TableRow key={automation.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-semibold">{automation.name}</p>
                            <p className="text-xs text-gray-500">{automation.segment || 'All customers'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {automationTypes.find(t => t.value === automation.type)?.label || automation.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3" />
                            {automation.trigger} @ {automation.time}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-purple-600 font-medium">
                            {getNextRun(automation)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-gray-100 text-gray-700">
                            {automation.run_count || 0} times
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={automation.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {automation.active ? 'Active' : 'Paused'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleAutomation(automation.id, automation.active)}
                              title={automation.active ? 'Pause' : 'Activate'}
                            >
                              {automation.active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRunNow(automation.id)}
                              title="Run Now"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteAutomation(automation.id)}
                              className="text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create Automation Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Automation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Automation Name</label>
                <Input
                  placeholder="e.g., Daily Stock Alert to High-Value Customers"
                  value={newAutomation.name}
                  onChange={(e) => setNewAutomation({...newAutomation, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Automation Type</label>
                <Select 
                  value={newAutomation.type} 
                  onValueChange={(v) => setNewAutomation({...newAutomation, type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {automationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <p>{type.label}</p>
                          <p className="text-xs text-gray-500">{type.desc}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Schedule</label>
                  <Select 
                    value={newAutomation.trigger} 
                    onValueChange={(v) => setNewAutomation({...newAutomation, trigger: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map(trigger => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          {trigger.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <Input
                    type="time"
                    value={newAutomation.time}
                    onChange={(e) => setNewAutomation({...newAutomation, time: e.target.value})}
                  />
                </div>
              </div>

              {newAutomation.type === 'whatsapp_campaign' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Segment</label>
                    <Select 
                      value={newAutomation.segment} 
                      onValueChange={(v) => setNewAutomation({...newAutomation, segment: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">⏰ Pending Orders</SelectItem>
                        <SelectItem value="high_value">💎 High Value</SelectItem>
                        <SelectItem value="inactive">😴 Inactive</SelectItem>
                        <SelectItem value="new">🆕 New Customers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Message Template</label>
                    <Select 
                      value={newAutomation.template} 
                      onValueChange={(v) => setNewAutomation({...newAutomation, template: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="order_ready">✅ Order Ready</SelectItem>
                        <SelectItem value="flash_sale">⚡ Flash Sale</SelectItem>
                        <SelectItem value="stock_alert">📦 Stock Alert</SelectItem>
                        <SelectItem value="payment_reminder">💰 Payment Reminder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>⚡ Pro Tip:</strong> This automation will run automatically based on your schedule. You can pause it anytime!
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAutomation} 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={!newAutomation.name}
              >
                Create Automation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AutomationScheduler;
