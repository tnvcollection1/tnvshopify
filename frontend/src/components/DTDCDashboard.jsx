import React, { useState, useEffect } from 'react';
import { 
  Truck, Package, MapPin, Clock, Search, RefreshCw, 
  Plus, Calculator, Calendar, CheckCircle, AlertCircle,
  ChevronDown, ChevronRight, Phone, Mail, Building,
  DollarSign, Weight, Box, Filter, Download, TrendingUp,
  BarChart2, PieChart, ArrowUpRight, ArrowDownRight,
  Eye, Printer, MoreHorizontal, XCircle, RotateCcw
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status colors and icons
const STATUS_CONFIG = {
  'BOOKED': { color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50' },
  'PICKUP_AWAITED': { color: 'bg-yellow-500', textColor: 'text-yellow-600', bgLight: 'bg-yellow-50' },
  'PICKUP_SCHEDULED': { color: 'bg-orange-500', textColor: 'text-orange-600', bgLight: 'bg-orange-50' },
  'PICKED_UP': { color: 'bg-indigo-500', textColor: 'text-indigo-600', bgLight: 'bg-indigo-50' },
  'IN_TRANSIT': { color: 'bg-purple-500', textColor: 'text-purple-600', bgLight: 'bg-purple-50' },
  'CD_OUT': { color: 'bg-cyan-500', textColor: 'text-cyan-600', bgLight: 'bg-cyan-50' },
  'OUT_FOR_DELIVERY': { color: 'bg-amber-500', textColor: 'text-amber-600', bgLight: 'bg-amber-50' },
  'DELIVERED': { color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50' },
  'UNDELIVERED': { color: 'bg-red-500', textColor: 'text-red-600', bgLight: 'bg-red-50' },
  'RTO': { color: 'bg-rose-500', textColor: 'text-rose-600', bgLight: 'bg-rose-50' },
  'CANCELLED': { color: 'bg-gray-500', textColor: 'text-gray-600', bgLight: 'bg-gray-50' }
};

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

const DTDCDashboard = () => {
  const { selectedStore } = useStore();
  const storeName = selectedStore || 'tnvcollection';
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState({
    booked: 0,
    delivered: 0,
    deliveredWithinEDD: 0,
    rto: 0,
    prepaid: 0,
    cod: 0,
    inTransit: 0,
    outForDelivery: 0,
    fatPercent: 0,
    fadPercent: 0
  });
  const [bookingTrends, setBookingTrends] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [laneDistribution, setLaneDistribution] = useState([]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [dateFilter, setDateFilter] = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Settings form
  const [configForm, setConfigForm] = useState({
    name: 'TNV Collection',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    pincode: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    fetchData();
  }, [storeName]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shipmentsRes, configRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/shipping/shipments?store=${storeName}&limit=100`),
        fetch(`${API_URL}/api/shipping/config/${storeName}`),
        fetch(`${API_URL}/api/shipping/stats/${storeName}`)
      ]);
      
      if (shipmentsRes.ok) {
        const data = await shipmentsRes.json();
        setShipments(data.shipments || []);
        calculateStats(data.shipments || []);
      }
      
      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data);
        if (data.origin) {
          setConfigForm(data.origin);
        }
      }
      
      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.stats) setStats(data.stats);
        if (data.bookingTrends) setBookingTrends(data.bookingTrends);
        if (data.statusDistribution) setStatusDistribution(data.statusDistribution);
        if (data.laneDistribution) setLaneDistribution(data.laneDistribution);
      }
      
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (shipmentList) => {
    const newStats = {
      booked: shipmentList.length,
      delivered: shipmentList.filter(s => s.status === 'DELIVERED').length,
      deliveredWithinEDD: shipmentList.filter(s => s.status === 'DELIVERED' && s.delivered_within_edd).length,
      rto: shipmentList.filter(s => s.status === 'RTO').length,
      prepaid: shipmentList.filter(s => !s.cod_amount || s.cod_amount === 0).length,
      cod: shipmentList.filter(s => s.cod_amount > 0).length,
      inTransit: shipmentList.filter(s => ['IN_TRANSIT', 'CD_OUT', 'PICKED_UP'].includes(s.status)).length,
      outForDelivery: shipmentList.filter(s => s.status === 'OUT_FOR_DELIVERY').length,
      fatPercent: 0,
      fadPercent: 0
    };
    
    if (newStats.booked > 0) {
      newStats.fatPercent = Math.round((newStats.delivered / newStats.booked) * 100);
      newStats.fadPercent = Math.round((newStats.deliveredWithinEDD / newStats.booked) * 100);
    }
    
    setStats(newStats);
    
    // Calculate status distribution
    const statusCounts = {};
    shipmentList.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });
    setStatusDistribution(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
    
    // Calculate lane distribution (by city)
    const laneCounts = {};
    shipmentList.forEach(s => {
      const lane = s.destination?.city || 'Unknown';
      laneCounts[lane] = (laneCounts[lane] || 0) + 1;
    });
    setLaneDistribution(Object.entries(laneCounts).map(([name, value]) => ({ name, value })));
    
    // Generate booking trends (last 7 days)
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = shipmentList.filter(s => s.created_at?.startsWith(dateStr)).length;
      trends.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        bookings: count
      });
    }
    setBookingTrends(trends);
  };

  const handleSyncFromDTDC = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/shipping/sync-shipments/${storeName}`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Synced ${data.synced_count || 0} shipments from DTDC`);
        fetchData();
      } else {
        toast.info(data.message || 'Sync completed');
      }
    } catch (e) {
      toast.error('Failed to sync from DTDC');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shipping/config/${storeName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          origin: configForm
        })
      });
      
      if (res.ok) {
        toast.success('Configuration saved');
        fetchData();
      } else {
        throw new Error('Failed to save');
      }
    } catch (e) {
      toast.error('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Please enter AWB number');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shipping/track/${trackingNumber}?store=${storeName}`);
      const data = await res.json();
      setTrackingResult(data);
      toast.success('Tracking info retrieved');
    } catch (e) {
      toast.error('Failed to track shipment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['BOOKED'];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.bgLight} ${cfg.textColor}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.color}`}></span>
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  const filteredShipments = shipments.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Header */}
      <div className="bg-[#003366] text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-white text-[#003366] px-3 py-1 rounded font-bold text-sm">DTDC</div>
                <span className="text-lg font-semibold">Customer Portal Dashboard</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-[#004488] px-3 py-1.5 rounded">
                <span className="text-sm">GL6029 - TNV C...</span>
                <ChevronDown className="w-4 h-4" />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSyncFromDTDC}
                disabled={syncing}
                className="bg-transparent border-white text-white hover:bg-white/10"
              >
                {syncing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sync from DTDC
              </Button>
              <Button variant="outline" size="sm" className="bg-transparent border-white text-white hover:bg-white/10">
                <MapPin className="w-4 h-4 mr-2" />
                Track Consignment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6">
            {[
              { id: 'dashboard', label: 'Customer Portal Dashboard' },
              { id: 'consignments', label: 'Consignments' },
              { id: 'track', label: 'Track Shipment' },
              { id: 'settings', label: 'Settings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-[#003366] text-[#003366] font-medium' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Booking Date</span>
                  <select 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
                <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* KPI Cards - Row 1 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500"># Booked</span>
                  <Package className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-orange-500">{stats.booked}</div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500"># Delivered</span>
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-green-500">{stats.delivered}</div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500"># Delivered within EDD</span>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-green-600">{stats.deliveredWithinEDD}</div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500"># RTO</span>
                  <RotateCcw className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-red-500">{stats.rto}</div>
              </div>
            </div>

            {/* KPI Cards - Row 2 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500"># Prepaid</span>
                  <DollarSign className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-800">{stats.prepaid}</div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500"># COD</span>
                  <DollarSign className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-800">{stats.cod}</div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">FAT %</span>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-blue-500">{stats.fatPercent}</div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">FAD %</span>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-blue-500">{stats.fadPercent}</div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Booking Trends */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Booking Trends</h3>
                  <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bookingTrends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="bookings" 
                        stroke="#003366" 
                        strokeWidth={2}
                        dot={{ fill: '#003366', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lane Wise Distribution */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Lane wise Distribution</h3>
                  <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={laneDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#003366" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Second Charts Row */}
            <div className="grid grid-cols-3 gap-4">
              {/* Shipment Status */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Shipment Status</h3>
                  <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} />
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Product Distribution */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Product Distribution</h3>
                  <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
                </div>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={[
                          { name: 'E-Com Premium', value: stats.cod },
                          { name: 'E-Com Standard', value: stats.prepaid }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#FF6B6B" />
                        <Cell fill="#4ECDC4" />
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} />
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Non-Delivery Reasons */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Non-Delivery Reasons</h3>
                  <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
                </div>
                <div className="h-48 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <XCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No Data</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Refresh Time */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Next Refresh Time</h3>
              <div className="text-center py-2 bg-gray-50 rounded text-lg font-mono">
                {new Date(Date.now() + 5 * 60000).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Consignments Tab */}
        {activeTab === 'consignments' && (
          <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="bg-white rounded-lg border">
              <div className="flex border-b overflow-x-auto">
                {['all', 'BOOKED', 'PICKUP_AWAITED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'UNDELIVERED', 'RTO', 'CANCELLED'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                      statusFilter === status 
                        ? 'border-[#003366] text-[#003366] bg-blue-50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              {/* Actions Bar */}
              <div className="p-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-1" />
                    More Filters
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Consignment Number" 
                    className="w-48"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                  <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">
                    Actions
                  </Button>
                  <Button variant="outline" size="sm">Bulk Print</Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left font-medium text-gray-600">
                        <input type="checkbox" className="rounded" />
                      </th>
                      <th className="p-3 text-left font-medium text-gray-600">CN #</th>
                      <th className="p-3 text-left font-medium text-gray-600">Customer Reference Number</th>
                      <th className="p-3 text-left font-medium text-gray-600">Created At</th>
                      <th className="p-3 text-left font-medium text-gray-600">Status</th>
                      <th className="p-3 text-left font-medium text-gray-600">Amount to be Paid</th>
                      <th className="p-3 text-left font-medium text-gray-600">Is COD</th>
                      <th className="p-3 text-left font-medium text-gray-600">Number Of pieces</th>
                      <th className="p-3 text-left font-medium text-gray-600">Customer Name</th>
                      <th className="p-3 text-left font-medium text-gray-600">Booking Date</th>
                      <th className="p-3 text-left font-medium text-gray-600">Destination Address</th>
                      <th className="p-3 text-left font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShipments.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                          <p>No consignments found</p>
                          <p className="text-sm">Click "Sync from DTDC" to fetch your shipments</p>
                        </td>
                      </tr>
                    ) : (
                      filteredShipments.map((shipment, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="p-3">
                            <input type="checkbox" className="rounded" />
                          </td>
                          <td className="p-3 font-mono text-blue-600">{shipment.awb_number}</td>
                          <td className="p-3">#{shipment.order_id}</td>
                          <td className="p-3 text-gray-600">
                            {shipment.created_at ? new Date(shipment.created_at).toLocaleString() : '-'}
                          </td>
                          <td className="p-3">{getStatusBadge(shipment.status)}</td>
                          <td className="p-3">₹{shipment.cod_amount || 0}</td>
                          <td className="p-3">{shipment.cod_amount > 0 ? 'Yes' : 'No'}</td>
                          <td className="p-3">{shipment.package?.num_pieces || 1}</td>
                          <td className="p-3">{shipment.destination?.name || '-'}</td>
                          <td className="p-3 text-gray-600">
                            {shipment.created_at ? new Date(shipment.created_at).toLocaleString() : '-'}
                          </td>
                          <td className="p-3 max-w-[200px] truncate" title={shipment.destination?.address_line_1}>
                            {shipment.destination?.address_line_1 || '-'}, {shipment.destination?.city || ''}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" className="p-1">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="p-1">
                                <Printer className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 border-t flex items-center justify-between text-sm text-gray-600">
                <div>Showing {filteredShipments.length} of {shipments.length}</div>
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <select className="border rounded px-2 py-1">
                    <option>20</option>
                    <option>50</option>
                    <option>100</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Track Tab */}
        {activeTab === 'track' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Track Shipment
              </h2>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter AWB / Consignment Number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="font-mono"
                />
                <Button onClick={handleTrack} disabled={loading} className="bg-[#003366]">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Track
                </Button>
              </div>
            </div>

            {trackingResult && (
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Tracking Result</h3>
                  {getStatusBadge(trackingResult.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500">AWB Number</p>
                    <p className="font-mono font-semibold">{trackingResult.awb_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Carrier</p>
                    <p className="font-semibold">{trackingResult.carrier}</p>
                  </div>
                </div>

                {trackingResult.tracking_events?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Tracking History</h4>
                    <div className="space-y-3">
                      {trackingResult.tracking_events.map((event, idx) => (
                        <div key={idx} className="flex gap-3 pl-4 border-l-2 border-[#003366]">
                          <div className="w-2 h-2 rounded-full bg-[#003366] -ml-[5px] mt-2" />
                          <div>
                            <p className="font-medium">{event.status || event.description}</p>
                            <p className="text-sm text-gray-500">
                              {event.location && `${event.location} • `}
                              {event.timestamp}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Pickup / Origin Address
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    This address will be used as the origin for all shipments
                  </p>
                </div>
                <Button 
                  onClick={handleSyncFromDTDC} 
                  variant="outline"
                  disabled={syncing}
                  className="text-[#003366] border-[#003366]"
                >
                  {syncing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Sync from DTDC
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Business Name *</Label>
                    <Input
                      placeholder="TNV Collection"
                      value={configForm.name}
                      onChange={(e) => setConfigForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={configForm.phone}
                      onChange={(e) => setConfigForm(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Address Line 1 *</Label>
                  <Input
                    placeholder="Shop No. 123, Building Name"
                    value={configForm.address_line_1}
                    onChange={(e) => setConfigForm(p => ({ ...p, address_line_1: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Address Line 2</Label>
                  <Input
                    placeholder="Street, Landmark"
                    value={configForm.address_line_2}
                    onChange={(e) => setConfigForm(p => ({ ...p, address_line_2: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Pincode *</Label>
                    <Input
                      placeholder="400001"
                      value={configForm.pincode}
                      onChange={(e) => setConfigForm(p => ({ ...p, pincode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>City *</Label>
                    <Input
                      placeholder="Mumbai"
                      value={configForm.city}
                      onChange={(e) => setConfigForm(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>State *</Label>
                    <Input
                      placeholder="Maharashtra"
                      value={configForm.state}
                      onChange={(e) => setConfigForm(p => ({ ...p, state: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={handleSaveConfig} disabled={loading} className="bg-[#003366]">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Configuration
                  </Button>
                </div>
              </div>

              {/* DTDC Account Info */}
              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold mb-4">DTDC Account</h3>
                <div className="bg-[#F5F5F0] rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer Code</span>
                    <span className="font-mono font-semibold">GL6029</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Connected
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Synced</span>
                    <span>{config?.updated_at ? new Date(config.updated_at).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DTDCDashboard;
