import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Calendar,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  History,
  Clock,
  Package,
  ChevronRight,
  Play,
  Pause,
  XCircle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const ShopifyHistoricalSync = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [syncMode, setSyncMode] = useState('range'); // 'range', 'month', 'batch'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [batchSize, setBatchSize] = useState(30);
  const [loading, setLoading] = useState(false);
  const [syncJobs, setSyncJobs] = useState([]);
  const [activePoll, setActivePoll] = useState(null);

  // Predefined month options
  const monthOptions = [
    { value: '1', label: 'Last 30 days' },
    { value: '2', label: 'Last 60 days' },
    { value: '3', label: 'Last 90 days' },
    { value: '6', label: 'Last 6 months' },
    { value: '12', label: 'Last 12 months' },
    { value: 'all', label: 'All time (full sync)' },
  ];

  useEffect(() => {
    fetchStores();
    // Load any existing sync jobs
    const savedJobs = localStorage.getItem('shopifySyncJobs');
    if (savedJobs) {
      try {
        setSyncJobs(JSON.parse(savedJobs));
      } catch {}
    }
  }, []);

  // Poll for job status
  useEffect(() => {
    if (!activePoll) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/shopify/sync-status/${activePoll}`);
        const data = await res.json();
        
        if (data.success && data.job) {
          setSyncJobs(prev => {
            const updated = prev.map(j => 
              j.job_id === activePoll ? { ...j, ...data.job } : j
            );
            localStorage.setItem('shopifySyncJobs', JSON.stringify(updated));
            return updated;
          });
          
          if (data.job.status === 'completed' || data.job.status === 'failed') {
            setActivePoll(null);
            if (data.job.status === 'completed') {
              toast.success(`Sync completed: ${data.job.orders_synced || 0} orders imported`);
            } else {
              toast.error(`Sync failed: ${data.job.error || 'Unknown error'}`);
            }
          }
        }
      } catch (e) {
        console.error('Poll error:', e);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [activePoll]);

  const fetchStores = async () => {
    try {
      const res = await fetch(`${API}/api/stores`);
      const data = await res.json();
      if (data.success && data.stores) {
        setStores(data.stores);
        if (data.stores.length === 1) {
          setSelectedStore(data.stores[0].store_name);
        }
      }
    } catch (e) {
      console.error('Error fetching stores:', e);
    }
  };

  const calculateDaysBack = () => {
    if (syncMode === 'month') {
      if (selectedMonth === 'all') return 3650; // ~10 years
      return parseInt(selectedMonth) * 30;
    }
    
    if (syncMode === 'range' && startDate) {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return Math.max(1, days);
    }
    
    return batchSize;
  };

  const startSync = async () => {
    if (!selectedStore) {
      toast.error('Please select a store');
      return;
    }

    const daysBack = calculateDaysBack();
    
    // Warn if syncing more than 90 days
    if (daysBack > 90) {
      const confirm = window.confirm(
        `You're about to sync ${daysBack} days of orders. This may take several minutes. Continue?`
      );
      if (!confirm) return;
    }

    setLoading(true);
    
    try {
      const res = await fetch(
        `${API}/api/shopify/sync-background/${selectedStore}?days_back=${daysBack}`,
        { method: 'POST' }
      );
      const data = await res.json();
      
      if (data.success && data.job_id) {
        const newJob = {
          job_id: data.job_id,
          store_name: selectedStore,
          days_back: daysBack,
          status: 'running',
          started_at: new Date().toISOString(),
          orders_synced: 0,
        };
        
        setSyncJobs(prev => {
          const updated = [newJob, ...prev].slice(0, 10); // Keep last 10 jobs
          localStorage.setItem('shopifySyncJobs', JSON.stringify(updated));
          return updated;
        });
        
        setActivePoll(data.job_id);
        toast.success(`Sync started for ${selectedStore}`);
      } else {
        toast.error(data.message || 'Failed to start sync');
      }
    } catch (e) {
      toast.error('Error starting sync: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'running':
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
      case 'running':
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700">Running</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-orange-500" />
            Historical Order Sync
          </CardTitle>
          <CardDescription>
            Import historical orders from Shopify. Large date ranges are processed in batches to prevent timeouts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Store Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Select Store</label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-full" data-testid="store-selector">
                <SelectValue placeholder="Choose a store..." />
              </SelectTrigger>
              <SelectContent>
                {stores.map(store => (
                  <SelectItem key={store.store_name} value={store.store_name}>
                    {store.store_name} {store.shopify_domain && `(${store.shopify_domain})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sync Mode Tabs */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Sync Mode</label>
            <div className="flex gap-2">
              <Button
                variant={syncMode === 'month' ? 'default' : 'outline'}
                onClick={() => setSyncMode('month')}
                size="sm"
                data-testid="sync-mode-month"
              >
                Quick Select
              </Button>
              <Button
                variant={syncMode === 'range' ? 'default' : 'outline'}
                onClick={() => setSyncMode('range')}
                size="sm"
                data-testid="sync-mode-range"
              >
                Date Range
              </Button>
              <Button
                variant={syncMode === 'batch' ? 'default' : 'outline'}
                onClick={() => setSyncMode('batch')}
                size="sm"
                data-testid="sync-mode-batch"
              >
                Days Back
              </Button>
            </div>
          </div>

          {/* Mode-specific inputs */}
          {syncMode === 'month' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Time Period</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full" data-testid="month-selector">
                  <SelectValue placeholder="Select time period..." />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {syncMode === 'range' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="start-date"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">End Date (optional)</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Today"
                  data-testid="end-date"
                />
              </div>
            </div>
          )}

          {syncMode === 'batch' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Days to sync: {batchSize}</label>
              <input
                type="range"
                min="7"
                max="365"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                className="w-full"
                data-testid="batch-slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>7 days</span>
                <span>365 days</span>
              </div>
            </div>
          )}

          {/* Sync Summary */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">
                Will sync: {calculateDaysBack()} days of orders
                {selectedStore && ` from ${selectedStore}`}
              </span>
            </div>
            {calculateDaysBack() > 90 && (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Large sync - this will be processed in background batches
              </p>
            )}
          </div>

          {/* Start Button */}
          <Button
            onClick={startSync}
            disabled={loading || !selectedStore || (syncMode === 'month' && !selectedMonth) || (syncMode === 'range' && !startDate)}
            className="w-full bg-orange-500 hover:bg-orange-600"
            data-testid="start-sync-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting Sync...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Historical Sync
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Sync Jobs */}
      {syncJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Recent Sync Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncJobs.map((job, idx) => (
                <div
                  key={job.job_id || idx}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium text-sm">{job.store_name}</p>
                      <p className="text-xs text-gray-500">
                        {job.days_back} days • Started {new Date(job.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.status === 'running' || job.status === 'processing' ? (
                      <div className="text-right">
                        <p className="text-xs text-blue-600">{job.phase || 'Processing...'}</p>
                        <Progress value={job.progress || 0} className="w-24 h-2 mt-1" />
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-sm font-medium">{job.orders_synced || 0} orders</p>
                      </div>
                    )}
                    {getStatusBadge(job.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-2">💡 Tips for Historical Sync</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Large syncs (&gt;90 days) are processed in the background to prevent timeouts</li>
            <li>• You can start a sync and leave the page - it will continue running</li>
            <li>• Duplicate orders are automatically skipped</li>
            <li>• Use "All time" for a complete historical import</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopifyHistoricalSync;
