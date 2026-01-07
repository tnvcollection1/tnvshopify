import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Database,
  Calendar,
  Settings,
  ChevronDown,
  ChevronRight,
  Loader2,
  History,
  Zap,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Status badge component
const StatusBadge = ({ status }) => {
  const config = {
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    running: { color: 'bg-blue-100 text-blue-800', icon: Loader2 },
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
    cancelled: { color: 'bg-gray-100 text-gray-800', icon: Pause },
    retrying: { color: 'bg-orange-100 text-orange-800', icon: RefreshCw }
  };
  
  const { color, icon: Icon } = config[status] || config.pending;
  
  return (
    <Badge className={`${color} gap-1`}>
      <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {status}
    </Badge>
  );
};

// Store Card Component
const StoreCard = ({ store, onSync, onViewHistory }) => {
  const lastSynced = store.last_synced_at 
    ? new Date(store.last_synced_at).toLocaleString() 
    : 'Never';
  
  return (
    <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-gray-500" />
          <div>
            <h3 className="font-semibold">{store.store_name}</h3>
            <p className="text-xs text-gray-500">{store.display_name}</p>
          </div>
        </div>
        <Badge variant={store.connected ? 'default' : 'secondary'}>
          {store.connected ? 'Connected' : 'Not Connected'}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Orders</p>
          <p className="text-lg font-semibold">{store.order_count?.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Last Synced</p>
          <p className="text-sm">{lastSynced}</p>
        </div>
      </div>
      
      {store.running_job && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Sync in Progress</span>
          </div>
          <Progress value={store.running_job.progress?.percentage || 0} className="h-2" />
          <p className="text-xs text-blue-600 mt-1">
            {store.running_job.progress?.processed || 0} / {store.running_job.progress?.total || 0} records
          </p>
        </div>
      )}
      
      <div className="flex gap-2">
        <Button 
          size="sm" 
          className="flex-1"
          onClick={() => onSync(store.store_name)}
          disabled={!!store.running_job || !store.connected}
        >
          {store.running_job ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Syncing...</>
          ) : (
            <><Play className="w-4 h-4 mr-1" /> Sync Now</>
          )}
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onViewHistory(store.store_name)}
        >
          <History className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// Sync Job Detail Component
const SyncJobDetail = ({ job }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!job) return null;
  
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} />
          <span className="font-medium">{job.store_name}</span>
          <Badge variant="outline">{job.sync_type}</Badge>
        </div>
        <span className="text-sm text-gray-500">
          {new Date(job.created_at).toLocaleString()}
        </span>
      </div>
      
      {(job.status === 'running' || job.status === 'retrying') && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>{job.message}</span>
            <span>{job.progress?.percentage}%</span>
          </div>
          <Progress value={job.progress?.percentage || 0} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Processed: {job.progress?.processed || 0}</span>
            <span>Failed: {job.progress?.failed || 0}</span>
            <span>Total: {job.progress?.total || 0}</span>
          </div>
        </div>
      )}
      
      {job.status === 'completed' && (
        <div className="text-sm text-green-600 mb-2">
          ✓ {job.progress?.processed || 0} records synced successfully
        </div>
      )}
      
      {job.status === 'failed' && job.errors?.length > 0 && (
        <div className="bg-red-50 p-3 rounded text-sm text-red-700 mb-2">
          {job.errors[0]}
        </div>
      )}
      
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full">
            {expanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
            {expanded ? 'Hide Details' : 'Show Details'}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="text-xs font-mono bg-gray-50 p-3 rounded overflow-auto max-h-48">
            <pre>{JSON.stringify(job, null, 2)}</pre>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Schedule Form Component
const ScheduleForm = ({ storeName, existingSchedule, onSave, onClose }) => {
  const [form, setForm] = useState({
    sync_type: existingSchedule?.sync_type || 'orders',
    schedule_type: existingSchedule?.schedule_type || 'interval',
    interval_hours: existingSchedule?.interval_hours || 6,
    daily_time: existingSchedule?.daily_time || '02:00',
    enabled: existingSchedule?.enabled ?? true
  });

  const handleSave = async () => {
    try {
      await axios.post(`${API}/api/sync/schedule`, {
        store_name: storeName,
        ...form
      });
      toast.success('Schedule saved');
      onSave();
    } catch (error) {
      toast.error('Failed to save schedule');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Sync Type</label>
        <Select value={form.sync_type} onValueChange={(v) => setForm({ ...form, sync_type: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="orders">Orders</SelectItem>
            <SelectItem value="products">Products</SelectItem>
            <SelectItem value="inventory">Inventory</SelectItem>
            <SelectItem value="all">All Data</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Schedule Type</label>
        <Select value={form.schedule_type} onValueChange={(v) => setForm({ ...form, schedule_type: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="interval">Every X Hours</SelectItem>
            <SelectItem value="daily">Daily at Specific Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {form.schedule_type === 'interval' && (
        <div>
          <label className="block text-sm font-medium mb-1">Interval (hours)</label>
          <Input
            type="number"
            value={form.interval_hours}
            onChange={(e) => setForm({ ...form, interval_hours: parseInt(e.target.value) || 6 })}
            min={1}
            max={168}
          />
        </div>
      )}
      
      {form.schedule_type === 'daily' && (
        <div>
          <label className="block text-sm font-medium mb-1">Time (24h)</label>
          <Input
            type="time"
            value={form.daily_time}
            onChange={(e) => setForm({ ...form, daily_time: e.target.value })}
          />
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Enabled</span>
        <Switch
          checked={form.enabled}
          onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save Schedule</Button>
      </div>
    </div>
  );
};

// Main Sync Dashboard Component
const SyncDashboard = () => {
  const [overview, setOverview] = useState({ stores: [] });
  const [jobs, setJobs] = useState([]);
  const [history, setHistory] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStore, setSelectedStore] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [pollingJobId, setPollingJobId] = useState(null);
  
  // Sync options state
  const [syncOptions, setSyncOptions] = useState({
    sync_type: 'orders',
    incremental: true,
    days_back: 30,
    chunk_size: 250
  });

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, jobsRes, historyRes, schedulesRes] = await Promise.all([
        axios.get(`${API}/api/sync/overview`),
        axios.get(`${API}/api/sync/jobs?limit=20`),
        axios.get(`${API}/api/sync/history?limit=50`),
        axios.get(`${API}/api/sync/schedules`)
      ]);
      
      setOverview(overviewRes.data);
      setJobs(jobsRes.data.jobs || []);
      setHistory(historyRes.data.history || []);
      setSchedules(schedulesRes.data.schedules || []);
    } catch (error) {
      console.error('Error fetching sync data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Poll for job status when a sync is running
  useEffect(() => {
    if (!pollingJobId) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/api/sync/status/${pollingJobId}`);
        const job = res.data;
        
        // Update jobs list
        setJobs(prev => prev.map(j => j.job_id === pollingJobId ? job : j));
        
        // Stop polling if job is done
        if (['completed', 'failed', 'cancelled'].includes(job.status)) {
          setPollingJobId(null);
          fetchData(); // Refresh all data
          if (job.status === 'completed') {
            toast.success(`Sync completed: ${job.progress?.processed} records synced`);
          } else if (job.status === 'failed') {
            toast.error(`Sync failed: ${job.errors?.[0] || 'Unknown error'}`);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }, [pollingJobId, fetchData]);

  const startSync = async (storeName) => {
    try {
      const res = await axios.post(`${API}/api/sync/start`, {
        store_name: storeName,
        ...syncOptions
      });
      
      if (res.data.success) {
        toast.success('Sync started');
        setPollingJobId(res.data.job_id);
        fetchData();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error('Failed to start sync');
    }
  };

  const cancelSync = async (jobId) => {
    try {
      await axios.post(`${API}/api/sync/cancel/${jobId}`);
      toast.success('Sync cancelled');
      setPollingJobId(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel sync');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f1f1] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-6 h-6" />
                Data Sync Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                Manage data synchronization across all stores
              </p>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Store className="w-4 h-4" />
              Stores Overview
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Zap className="w-4 h-4" />
              Active Jobs ({jobs.filter(j => ['running', 'pending', 'retrying'].includes(j.status)).length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-2">
              <Calendar className="w-4 h-4" />
              Schedules
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.stores?.map((store) => (
                <StoreCard
                  key={store.store_name}
                  store={store}
                  onSync={startSync}
                  onViewHistory={(name) => {
                    setSelectedStore(name);
                    setActiveTab('history');
                  }}
                />
              ))}
            </div>
          </TabsContent>

          {/* Active Jobs Tab */}
          <TabsContent value="jobs">
            <div className="space-y-4">
              {jobs.filter(j => ['running', 'pending', 'retrying'].includes(j.status)).length === 0 ? (
                <div className="bg-white rounded-lg border p-12 text-center">
                  <Zap className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No active sync jobs</p>
                </div>
              ) : (
                jobs
                  .filter(j => ['running', 'pending', 'retrying'].includes(j.status))
                  .map((job) => (
                    <div key={job.job_id} className="relative">
                      <SyncJobDetail job={job} />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-4 right-4"
                        onClick={() => cancelSync(job.job_id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))
              )}
              
              <h3 className="text-lg font-semibold mt-8 mb-4">Recent Jobs</h3>
              <div className="space-y-2">
                {jobs.slice(0, 10).map((job) => (
                  <SyncJobDetail key={job.job_id} job={job} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Sync History</h3>
                {selectedStore && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedStore(null)}>
                    Filtered: {selectedStore} ✕
                  </Badge>
                )}
              </div>
              <div className="divide-y">
                {history
                  .filter(h => !selectedStore || h.store_name === selectedStore)
                  .map((h, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <StatusBadge status={h.status} />
                        <div>
                          <span className="font-medium">{h.store_name}</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-gray-500">{h.sync_type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{h.records_synced} records</span>
                        <span>{new Date(h.completed_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>

          {/* Schedules Tab */}
          <TabsContent value="schedules">
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Sync Schedules</h3>
                <Button size="sm" onClick={() => { setSelectedStore(null); setShowScheduleModal(true); }}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Add Schedule
                </Button>
              </div>
              <div className="divide-y">
                {schedules.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p>No schedules configured</p>
                    <p className="text-sm">Set up automatic syncing for your stores</p>
                  </div>
                ) : (
                  schedules.map((s, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${s.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <span className="font-medium">{s.store_name}</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-gray-500">{s.sync_type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          {s.schedule_type === 'interval' 
                            ? `Every ${s.interval_hours} hours`
                            : `Daily at ${s.daily_time}`}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedStore(s.store_name);
                            setShowScheduleModal(true);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="max-w-xl bg-white rounded-lg border p-6 space-y-6">
              <h3 className="font-semibold">Default Sync Options</h3>
              
              <div>
                <label className="block text-sm font-medium mb-1">Sync Type</label>
                <Select 
                  value={syncOptions.sync_type} 
                  onValueChange={(v) => setSyncOptions({ ...syncOptions, sync_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orders">Orders</SelectItem>
                    <SelectItem value="products">Products</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="all">All Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Incremental Sync</p>
                  <p className="text-sm text-gray-500">Only sync new/changed data since last sync</p>
                </div>
                <Switch
                  checked={syncOptions.incremental}
                  onCheckedChange={(checked) => setSyncOptions({ ...syncOptions, incremental: checked })}
                />
              </div>
              
              {!syncOptions.incremental && (
                <div>
                  <label className="block text-sm font-medium mb-1">Days Back</label>
                  <Input
                    type="number"
                    value={syncOptions.days_back}
                    onChange={(e) => setSyncOptions({ ...syncOptions, days_back: parseInt(e.target.value) || 30 })}
                    min={1}
                    max={365}
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of days of historical data to sync</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Chunk Size</label>
                <Input
                  type="number"
                  value={syncOptions.chunk_size}
                  onChange={(e) => setSyncOptions({ ...syncOptions, chunk_size: parseInt(e.target.value) || 250 })}
                  min={50}
                  max={1000}
                />
                <p className="text-xs text-gray-500 mt-1">Records processed per batch (lower = slower but more reliable)</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedStore ? `Edit Schedule: ${selectedStore}` : 'Create Sync Schedule'}
            </DialogTitle>
          </DialogHeader>
          {!selectedStore && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Store</label>
              <Select value={selectedStore || ''} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {overview.stores?.map((s) => (
                    <SelectItem key={s.store_name} value={s.store_name}>
                      {s.store_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {selectedStore && (
            <ScheduleForm
              storeName={selectedStore}
              existingSchedule={schedules.find(s => s.store_name === selectedStore)}
              onSave={() => { setShowScheduleModal(false); fetchData(); }}
              onClose={() => setShowScheduleModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SyncDashboard;
