import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Settings,
  MapPin,
  Calendar,
  Search,
  ChevronRight,
  Activity,
  Box,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStore } from '../contexts/StoreContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Status configurations
const STATUS_CONFIG = {
  NOT_SENT: { label: 'Not Sent', color: 'bg-gray-100 text-gray-700', icon: Clock },
  SENT: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Truck },
  IN_TRANSIT: { label: 'In Transit', color: 'bg-yellow-100 text-yellow-700', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  TIMEOUT: { label: 'Timeout', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  CUSTOMS_HOLD: { label: 'Customs Hold', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  ADDRESS_ERROR: { label: 'Address Error', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  LOST: { label: 'Lost', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  RETURNED: { label: 'Returned', color: 'bg-purple-100 text-purple-700', icon: Package },
  OTHER_EXCEPTION: { label: 'Exception', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  DESTROYED: { label: 'Destroyed', color: 'bg-gray-100 text-gray-700', icon: Package },
  UNKNOWN: { label: 'Unknown', color: 'bg-gray-100 text-gray-700', icon: Clock },
};

// Stat card component
const StatCard = ({ icon: Icon, label, value, color, onClick, active }) => (
  <button
    onClick={onClick}
    className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md ${active ? `ring-2 ring-${color}-500 border-${color}-500` : 'border-gray-200'}`}
    data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  </button>
);

// Shipment row component
const ShipmentRow = ({ shipment, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);
  const status = shipment.dwz_status || 'NOT_SENT';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;
  const StatusIcon = config.icon;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post(`${API}/api/dwz56/tracking/refresh/${shipment.dwz_waybill}`);
      toast.success(`Tracking updated for ${shipment.dwz_waybill}`);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to refresh tracking');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${config.color}`}>
          <StatusIcon className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{shipment.dwz_waybill}</span>
            <Badge variant="outline" className="text-xs">
              {shipment.store_name}
            </Badge>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
            <span>Order: {shipment.shopify_order_number || shipment.order_number || 'N/A'}</span>
            {shipment.dwz_tracking_info?.receiver && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {shipment.dwz_tracking_info.receiver}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <Badge className={config.color}>{config.label}</Badge>
          {shipment.dwz_last_update && (
            <p className="text-xs text-gray-400 mt-1">
              Updated: {new Date(shipment.dwz_last_update).toLocaleString()}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          data-testid={`refresh-${shipment.dwz_waybill}`}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );
};

// Main component
const DWZ56Tracking = () => {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [schedulerLogs, setSchedulerLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [runningJob, setRunningJob] = useState(null);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const params = selectedStore && selectedStore !== 'all' ? `?store_name=${selectedStore}` : '';
      const response = await axios.get(`${API}/api/dwz56/tracking/summary${params}`);
      if (response.data.success) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, [selectedStore]);

  // Fetch shipments based on filter
  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = '/api/dwz56/tracking/pending';
      if (filter === 'arrived') endpoint = '/api/dwz56/tracking/arrived';
      if (filter === 'delivered') endpoint = '/api/dwz56/tracking/delivered';
      
      const params = selectedStore && selectedStore !== 'all' ? `?store_name=${selectedStore}` : '';
      const response = await axios.get(`${API}${endpoint}${params}`);
      
      if (response.data.success) {
        let results = response.data.shipments || [];
        
        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          results = results.filter(s => 
            (s.dwz_waybill || '').toLowerCase().includes(query) ||
            (s.shopify_order_number || '').toString().includes(query) ||
            (s.order_number || '').toString().includes(query)
          );
        }
        
        setShipments(results);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
      toast.error('Failed to fetch shipments');
    } finally {
      setLoading(false);
    }
  }, [selectedStore, filter, searchQuery]);

  // Fetch scheduler status
  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        axios.get(`${API}/api/dwz56/scheduler/status`),
        axios.get(`${API}/api/dwz56/scheduler/logs?limit=10`)
      ]);
      
      if (statusRes.data.success) {
        setSchedulerStatus(statusRes.data);
      }
      if (logsRes.data.success) {
        setSchedulerLogs(logsRes.data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
    }
  }, []);

  // Run scheduler job
  const runJob = async (jobId) => {
    setRunningJob(jobId);
    try {
      const response = await axios.post(`${API}/api/dwz56/scheduler/run/${jobId}`);
      if (response.data.success) {
        toast.success(`Job executed: ${jobId}`);
        fetchSummary();
        fetchShipments();
        fetchSchedulerStatus();
      } else {
        toast.error(response.data.error || 'Job failed');
      }
    } catch (error) {
      toast.error('Failed to run job');
    } finally {
      setRunningJob(null);
    }
  };

  // Toggle scheduler
  const toggleScheduler = async () => {
    try {
      const endpoint = schedulerStatus?.running ? '/api/dwz56/scheduler/stop' : '/api/dwz56/scheduler/start';
      const response = await axios.post(`${API}${endpoint}`);
      if (response.data.success) {
        toast.success(response.data.message);
        fetchSchedulerStatus();
      }
    } catch (error) {
      toast.error('Failed to toggle scheduler');
    }
  };

  // Initial load
  useEffect(() => {
    fetchSummary();
    fetchShipments();
    fetchSchedulerStatus();
  }, [fetchSummary, fetchShipments, fetchSchedulerStatus]);

  // Refetch when filter changes
  useEffect(() => {
    fetchShipments();
  }, [filter, searchQuery, fetchShipments]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen" data-testid="dwz56-tracking-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DWZ56 Package Tracking</h1>
          <p className="text-gray-500">Track shipment status and manage auto-sync scheduler</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowSchedulerModal(true)}
            data-testid="scheduler-settings-btn"
          >
            <Settings className="w-4 h-4 mr-2" />
            Scheduler
            {schedulerStatus?.running && (
              <Badge className="ml-2 bg-green-100 text-green-700">Running</Badge>
            )}
          </Button>
          <Button
            onClick={() => { fetchSummary(); fetchShipments(); }}
            disabled={loading}
            data-testid="refresh-all-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            icon={Package}
            label="Total"
            value={summary.total}
            color="bg-gray-100 text-gray-700"
            onClick={() => setFilter('all')}
            active={filter === 'all'}
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={summary.pending}
            color="bg-blue-100 text-blue-700"
            onClick={() => setFilter('pending')}
            active={filter === 'pending'}
          />
          <StatCard
            icon={Truck}
            label="In Transit"
            value={summary.in_transit}
            color="bg-yellow-100 text-yellow-700"
            onClick={() => setFilter('transit')}
            active={filter === 'transit'}
          />
          <StatCard
            icon={Home}
            label="At Warehouse"
            value={summary.arrived_at_warehouse}
            color="bg-purple-100 text-purple-700"
            onClick={() => setFilter('arrived')}
            active={filter === 'arrived'}
          />
          <StatCard
            icon={CheckCircle}
            label="Delivered"
            value={summary.delivered}
            color="bg-green-100 text-green-700"
            onClick={() => setFilter('delivered')}
            active={filter === 'delivered'}
          />
          <StatCard
            icon={AlertTriangle}
            label="Exceptions"
            value={summary.exceptions}
            color="bg-red-100 text-red-700"
            onClick={() => setFilter('exceptions')}
            active={filter === 'exceptions'}
          />
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by waybill or order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]" data-testid="filter-select">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shipments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="transit">In Transit</SelectItem>
              <SelectItem value="arrived">At Warehouse</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="exceptions">Exceptions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Shipments List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">
            Shipments ({shipments.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : shipments.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No shipments found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {shipments.map((shipment, idx) => (
              <ShipmentRow
                key={shipment.dwz_waybill || idx}
                shipment={shipment}
                onRefresh={() => { fetchSummary(); fetchShipments(); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scheduler Modal */}
      <Dialog open={showSchedulerModal} onOpenChange={setShowSchedulerModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              DWZ56 Auto-Sync Scheduler
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Scheduler Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${schedulerStatus?.running ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="font-medium">
                  Scheduler is {schedulerStatus?.running ? 'Running' : 'Stopped'}
                </span>
              </div>
              <Button
                variant={schedulerStatus?.running ? 'outline' : 'default'}
                onClick={toggleScheduler}
                data-testid="toggle-scheduler-btn"
              >
                {schedulerStatus?.running ? (
                  <><Pause className="w-4 h-4 mr-2" /> Stop</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" /> Start</>
                )}
              </Button>
            </div>

            {/* Jobs */}
            <div>
              <h3 className="font-medium mb-3">Scheduled Jobs</h3>
              <div className="space-y-2">
                {schedulerStatus?.jobs?.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{job.name}</p>
                      <p className="text-xs text-gray-500">
                        Next run: {job.next_run ? new Date(job.next_run).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runJob(job.id)}
                      disabled={runningJob === job.id}
                      data-testid={`run-job-${job.id}`}
                    >
                      {runningJob === job.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Run Now
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Logs */}
            <div>
              <h3 className="font-medium mb-3">Recent Activity</h3>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {schedulerLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No logs yet</p>
                ) : (
                  schedulerLogs.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 text-sm bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Activity className={`w-4 h-4 ${log.status === 'completed' ? 'text-green-500' : 'text-red-500'}`} />
                        <span className="text-gray-700">{log.job}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs ${log.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                          {log.status}
                        </span>
                        <p className="text-xs text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DWZ56Tracking;
