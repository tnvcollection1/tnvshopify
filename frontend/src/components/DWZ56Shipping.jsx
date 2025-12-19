import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { 
  Package, Truck, DollarSign, RefreshCw, Search, Plus, 
  CheckCircle, XCircle, Clock, AlertTriangle, MapPin,
  Plane, Ship, Box, FileText, Calculator, Warehouse,
  CreditCard, BarChart3, Eye, Trash2, Download
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Status badge colors
const STATUS_COLORS = {
  'NOT_SENT': 'bg-gray-500',
  'SENT': 'bg-blue-500',
  'IN_TRANSIT': 'bg-yellow-500',
  'DELIVERED': 'bg-green-500',
  'TIMEOUT': 'bg-orange-500',
  'CUSTOMS_HOLD': 'bg-purple-500',
  'ADDRESS_ERROR': 'bg-red-400',
  'LOST': 'bg-red-600',
  'RETURNED': 'bg-pink-500',
  'OTHER_EXCEPTION': 'bg-red-500',
  'DESTROYED': 'bg-gray-800',
};

const STATUS_ICONS = {
  'NOT_SENT': Clock,
  'SENT': Plane,
  'IN_TRANSIT': Truck,
  'DELIVERED': CheckCircle,
  'TIMEOUT': AlertTriangle,
  'CUSTOMS_HOLD': FileText,
  'ADDRESS_ERROR': MapPin,
  'LOST': XCircle,
  'RETURNED': RefreshCw,
  'OTHER_EXCEPTION': AlertTriangle,
  'DESTROYED': Trash2,
};

export default function DWZ56Shipping() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Data states
  const [clientInfo, setClientInfo] = useState(null);
  const [courierTypes, setCourierTypes] = useState([]);
  const [trackingList, setTrackingList] = useState([]);
  const [preInputList, setPreInputList] = useState([]);
  const [statusSummary, setStatusSummary] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [payments, setPayments] = useState([]);
  
  // Pagination
  const [trackingPage, setTrackingPage] = useState(1);
  const [trackingTotal, setTrackingTotal] = useState(0);
  
  // Filters
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchTracking, setSearchTracking] = useState('');
  const [selectedCourier, setSelectedCourier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // Quote form
  const [quoteForm, setQuoteForm] = useState({
    destination: '',
    weight: '',
    courier: '',
    length: '',
    width: '',
    height: '',
  });
  
  // Create shipment form
  const [shipmentForm, setShipmentForm] = useState({
    cEmsKind: '',
    cDes: '',
    fWeight: '',
    cReceiver: '',
    cRAddr: '',
    cRCity: '',
    cRCountry: '',
    cRPhone: '',
    cRPostcode: '',
    cGoods: '',
    iQuantity: 1,
    fPrice: '',
    cMemo: '',
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Fetch client info
  const fetchClientInfo = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/dwz56/client-info`);
      const data = await res.json();
      if (data.success) {
        setClientInfo(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch client info:', err);
    }
  }, []);
  
  // Fetch courier types
  const fetchCourierTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/dwz56/courier-types`);
      const data = await res.json();
      if (data.success) {
        setCourierTypes(data.couriers);
      }
    } catch (err) {
      console.error('Failed to fetch courier types:', err);
    }
  }, []);
  
  // Fetch status summary
  const fetchStatusSummary = useCallback(async () => {
    try {
      let url = `${API_URL}/api/dwz56/tracking-status-summary`;
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      if (params.toString()) url += `?${params}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStatusSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch status summary:', err);
    }
  }, [dateRange]);
  
  // Fetch tracking list
  const fetchTrackingList = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: 20 });
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      if (searchTracking) params.append('tracking_number', searchTracking);
      if (selectedCourier) params.append('courier_type', selectedCourier);
      if (selectedStatus) {
        // Create status mask
        const mask = Array(11).fill('0');
        mask[parseInt(selectedStatus)] = '1';
        params.append('status_mask', mask.join(''));
      }
      
      const res = await fetch(`${API_URL}/api/dwz56/tracking-list?${params}`);
      const data = await res.json();
      if (data.success) {
        setTrackingList(data.records);
        setTrackingTotal(data.total_records);
        setTrackingPage(page);
      }
    } catch (err) {
      setError('Failed to fetch tracking list');
    } finally {
      setLoading(false);
    }
  }, [dateRange, searchTracking, selectedCourier, selectedStatus]);
  
  // Fetch pre-input list
  const fetchPreInputList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dwz56/pre-input-list?page_size=50`);
      const data = await res.json();
      if (data.success) {
        setPreInputList(data.records);
      }
    } catch (err) {
      console.error('Failed to fetch pre-input list:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Get shipping quote
  const getQuote = async () => {
    if (!quoteForm.destination || !quoteForm.weight) {
      setError('Destination and weight are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const body = {
        cqDes: quoteForm.destination,
        fqWeight: parseFloat(quoteForm.weight),
        nqItemType: 1,
      };
      if (quoteForm.courier) body.cqEmsKind = quoteForm.courier;
      if (quoteForm.length) body.fqLong = parseFloat(quoteForm.length);
      if (quoteForm.width) body.fqWidth = parseFloat(quoteForm.width);
      if (quoteForm.height) body.fqHeight = parseFloat(quoteForm.height);
      
      const res = await fetch(`${API_URL}/api/dwz56/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setQuotes(data.quotes);
      } else {
        setError(data.detail || 'Failed to get quote');
      }
    } catch (err) {
      setError('Failed to get quote');
    } finally {
      setLoading(false);
    }
  };
  
  // Create shipment
  const createShipment = async () => {
    if (!shipmentForm.cEmsKind || !shipmentForm.cDes) {
      setError('Courier type and destination are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const body = {
        ...shipmentForm,
        fWeight: shipmentForm.fWeight ? parseFloat(shipmentForm.fWeight) : undefined,
        iQuantity: parseInt(shipmentForm.iQuantity) || 1,
        fPrice: shipmentForm.fPrice ? parseFloat(shipmentForm.fPrice) : undefined,
      };
      
      const res = await fetch(`${API_URL}/api/dwz56/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateDialog(false);
        setShipmentForm({
          cEmsKind: '', cDes: '', fWeight: '', cReceiver: '', cRAddr: '',
          cRCity: '', cRCountry: '', cRPhone: '', cRPostcode: '',
          cGoods: '', iQuantity: 1, fPrice: '', cMemo: '',
        });
        fetchPreInputList();
      } else {
        setError(data.detail || 'Failed to create shipment');
      }
    } catch (err) {
      setError('Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/dwz56/inventory?page_size=100`);
      const data = await res.json();
      if (data.success) {
        setInventory(data.inventory);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    }
  }, []);
  
  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/dwz56/payment-records?page_size=50`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.records);
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    }
  }, []);
  
  // Initial load
  useEffect(() => {
    fetchClientInfo();
    fetchCourierTypes();
  }, [fetchClientInfo, fetchCourierTypes]);
  
  // Tab-based data loading
  useEffect(() => {
    if (activeTab === 'dashboard') {
      // Don't call fetchStatusSummary as it makes 11 API calls and causes rate limiting
      // The client info and courier types are fetched on initial load
    } else if (activeTab === 'tracking') {
      fetchTrackingList(1);
    } else if (activeTab === 'orders') {
      fetchPreInputList();
    } else if (activeTab === 'inventory') {
      fetchInventory();
    } else if (activeTab === 'payments') {
      fetchPayments();
    }
  }, [activeTab, fetchTrackingList, fetchPreInputList, fetchInventory, fetchPayments]);
  
  const StatusBadge = ({ status, label }) => {
    const Icon = STATUS_ICONS[status] || Clock;
    return (
      <Badge className={`${STATUS_COLORS[status] || 'bg-gray-500'} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DWZ56 Shipping</h1>
          <p className="text-gray-500">International logistics management</p>
        </div>
        <div className="flex items-center gap-4">
          {clientInfo && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Account Balance</p>
              <p className="text-lg font-semibold text-green-600">
                ¥{clientInfo.available_balance?.toLocaleString() || '0'}
              </p>
            </div>
          )}
          <Button onClick={() => { fetchClientInfo(); fetchCourierTypes(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="dashboard"><BarChart3 className="w-4 h-4 mr-1" /> Dashboard</TabsTrigger>
          <TabsTrigger value="tracking"><Truck className="w-4 h-4 mr-1" /> Tracking</TabsTrigger>
          <TabsTrigger value="orders"><Package className="w-4 h-4 mr-1" /> Orders</TabsTrigger>
          <TabsTrigger value="quote"><Calculator className="w-4 h-4 mr-1" /> Quote</TabsTrigger>
          <TabsTrigger value="inventory"><Warehouse className="w-4 h-4 mr-1" /> Inventory</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-1" /> Payments</TabsTrigger>
        </TabsList>
        
        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Account Info */}
          {clientInfo && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Credit Limit</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">¥{clientInfo.credit_limit?.toLocaleString() || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">¥{clientInfo.balance?.toLocaleString() || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">¥{clientInfo.available_balance?.toLocaleString() || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Pending Audit</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-600">{clientInfo.pending_audit_count || 0}</p>
                  <p className="text-xs text-gray-500">¥{clientInfo.pending_audit_amount?.toLocaleString() || '0'}</p>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Status Summary */}
          {statusSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Shipment Status Overview</CardTitle>
                <CardDescription>Total: {statusSummary.total} shipments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Object.entries(statusSummary.summary).map(([code, data]) => {
                    const Icon = STATUS_ICONS[code] || Clock;
                    return (
                      <div 
                        key={code} 
                        className={`p-4 rounded-lg ${STATUS_COLORS[code]} bg-opacity-10 border cursor-pointer hover:shadow-md transition-shadow`}
                        onClick={() => {
                          setSelectedStatus(data.state_code.toString());
                          setActiveTab('tracking');
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-5 h-5 ${STATUS_COLORS[code].replace('bg-', 'text-')}`} />
                          <span className="text-sm font-medium">{data.label_en}</span>
                        </div>
                        <p className="text-2xl font-bold">{data.count}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Available Couriers */}
          <Card>
            <CardHeader>
              <CardTitle>Available Courier Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {courierTypes.map((courier, idx) => (
                  <Badge key={idx} variant="outline" className="px-3 py-1">
                    <Plane className="w-3 h-3 mr-1" />
                    {courier.display_name}
                  </Badge>
                ))}
                {courierTypes.length === 0 && (
                  <p className="text-gray-500">No courier types available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Tracking #</Label>
                  <Input 
                    placeholder="Search tracking..."
                    value={searchTracking}
                    onChange={(e) => setSearchTracking(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Courier</Label>
                  <Select value={selectedCourier} onValueChange={setSelectedCourier}>
                    <SelectTrigger>
                      <SelectValue placeholder="All couriers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All couriers</SelectItem>
                      {courierTypes.map((c, i) => (
                        <SelectItem key={i} value={c.code}>{c.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => fetchTrackingList(1)} className="w-full">
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tracking Table */}
          <Card>
            <CardHeader>
              <CardTitle>Shipment Tracking ({trackingTotal} total)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking #</TableHead>
                    <TableHead>AWB #</TableHead>
                    <TableHead>Courier</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trackingList.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{item.cNum}</TableCell>
                      <TableCell className="font-mono text-sm">{item.cNo}</TableCell>
                      <TableCell>{item.cEmsKindi || item.cEmsKind}</TableCell>
                      <TableCell>{item.cDes}</TableCell>
                      <TableCell>{item.fWeight?.toFixed(2)} kg</TableCell>
                      <TableCell>
                        <StatusBadge status={item.status_code} label={item.status_label_en} />
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{item.cLTDate}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]" title={item.cLTInfo}>
                          {item.cLTInfo}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {trackingList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No shipments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {trackingTotal > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    disabled={trackingPage <= 1}
                    onClick={() => fetchTrackingList(trackingPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="py-2 px-4">
                    Page {trackingPage} of {Math.ceil(trackingTotal / 20)}
                  </span>
                  <Button 
                    variant="outline" 
                    disabled={trackingPage >= Math.ceil(trackingTotal / 20)}
                    onClick={() => fetchTrackingList(trackingPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Pre-Input Orders</h2>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Create Shipment</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Shipment</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Courier Type *</Label>
                    <Select 
                      value={shipmentForm.cEmsKind} 
                      onValueChange={(v) => setShipmentForm(prev => ({ ...prev, cEmsKind: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select courier" />
                      </SelectTrigger>
                      <SelectContent>
                        {courierTypes.map((c, i) => (
                          <SelectItem key={i} value={c.code}>{c.display_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Destination *</Label>
                    <Input 
                      value={shipmentForm.cDes}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, cDes: e.target.value }))}
                      placeholder="Country/Region"
                    />
                  </div>
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input 
                      type="number"
                      step="0.001"
                      value={shipmentForm.fWeight}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, fWeight: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Receiver Name</Label>
                    <Input 
                      value={shipmentForm.cReceiver}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, cReceiver: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Receiver Address</Label>
                    <Textarea 
                      value={shipmentForm.cRAddr}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, cRAddr: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input 
                      value={shipmentForm.cRCity}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, cRCity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input 
                      value={shipmentForm.cRCountry}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, cRCountry: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input 
                      value={shipmentForm.cRPhone}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, cRPhone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <Input 
                      value={shipmentForm.cRPostcode}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, cRPostcode: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Goods Description</Label>
                    <Input 
                      value={shipmentForm.cGoods}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, cGoods: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input 
                      type="number"
                      value={shipmentForm.iQuantity}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, iQuantity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Goods Value</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={shipmentForm.fPrice}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, fPrice: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Remarks</Label>
                    <Textarea 
                      value={shipmentForm.cMemo}
                      onChange={(e) => setShipmentForm(prev => ({ ...prev, cMemo: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                  <Button onClick={createShipment} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Shipment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Tracking #</TableHead>
                    <TableHead>Courier</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preInputList.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.iID}</TableCell>
                      <TableCell>{item.dDate}</TableCell>
                      <TableCell className="font-mono text-sm">{item.cNum}</TableCell>
                      <TableCell>{item.cEmsKindi || item.cEmsKind}</TableCell>
                      <TableCell>{item.cDes}</TableCell>
                      <TableCell>{item.cReceiver}</TableCell>
                      <TableCell>{item.fWeight?.toFixed(3)} kg</TableCell>
                      <TableCell>
                        <Badge variant={item.irID > 0 ? 'default' : 'secondary'}>
                          {item.irID > 0 ? 'Processed' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {preInputList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No pre-input orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Quote Tab */}
        <TabsContent value="quote" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Get Shipping Quote</CardTitle>
              <CardDescription>Calculate shipping rates for your package</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Destination *</Label>
                  <Input 
                    placeholder="Country or region code"
                    value={quoteForm.destination}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, destination: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Weight (kg) *</Label>
                  <Input 
                    type="number"
                    step="0.001"
                    placeholder="e.g., 1.5"
                    value={quoteForm.weight}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, weight: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Courier (optional)</Label>
                  <Select 
                    value={quoteForm.courier} 
                    onValueChange={(v) => setQuoteForm(prev => ({ ...prev, courier: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All couriers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All couriers</SelectItem>
                      {courierTypes.map((c, i) => (
                        <SelectItem key={i} value={c.code}>{c.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Length (cm)</Label>
                  <Input 
                    type="number"
                    value={quoteForm.length}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, length: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Width (cm)</Label>
                  <Input 
                    type="number"
                    value={quoteForm.width}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, width: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Height (cm)</Label>
                  <Input 
                    type="number"
                    value={quoteForm.height}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, height: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={getQuote} className="mt-4" disabled={loading}>
                <Calculator className="w-4 h-4 mr-2" />
                {loading ? 'Calculating...' : 'Get Quote'}
              </Button>
            </CardContent>
          </Card>
          
          {quotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Courier</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Fuel Surcharge</TableHead>
                      <TableHead>Customs Fee</TableHead>
                      <TableHead>Delivery Time</TableHead>
                      <TableHead>Max Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((q, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{q.courier_name}</TableCell>
                        <TableCell className="font-bold text-green-600">¥{q.total_price?.toFixed(2)}</TableCell>
                        <TableCell>¥{q.fuel_surcharge?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>¥{q.customs_fee?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                          {q.delivery_days_min && q.delivery_days_max 
                            ? `${q.delivery_days_min}-${q.delivery_days_max} days`
                            : '-'}
                        </TableCell>
                        <TableCell>{q.max_weight_kg ? `${q.max_weight_kg} kg` : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Shelf</TableHead>
                    <TableHead>In Stock</TableHead>
                    <TableHead>Total In</TableHead>
                    <TableHead>Total Out</TableHead>
                    <TableHead>Min/Max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>{item.name}</div>
                        {item.name_en && <div className="text-xs text-gray-500">{item.name_en}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.scan_code}</TableCell>
                      <TableCell>{item.warehouse || '-'}</TableCell>
                      <TableCell>{item.shelf || '-'}</TableCell>
                      <TableCell className="font-bold">
                        <Badge variant={item.current_stock <= item.min_stock ? 'destructive' : 'default'}>
                          {item.current_stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-green-600">+{item.total_in}</TableCell>
                      <TableCell className="text-red-600">-{item.total_out}</TableCell>
                      <TableCell className="text-xs">
                        {item.min_stock}/{item.max_stock}
                      </TableCell>
                    </TableRow>
                  ))}
                  {inventory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No inventory data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Related Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.ifID}</TableCell>
                      <TableCell>{item.dDate}</TableCell>
                      <TableCell>
                        <Badge variant={item.nType === 0 ? 'default' : 'secondary'}>
                          {item.nType === 0 ? 'Settlement' : 'Clearing'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.cMoney}</TableCell>
                      <TableCell className={item.fFee >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.fFee?.toFixed(2)}
                      </TableCell>
                      <TableCell>{item.fFeer?.toFixed(2)}</TableCell>
                      <TableCell>
                        {['Cash', 'Transfer', 'Online', 'Offset', 'Other'][item.nPayWay] || '-'}
                      </TableCell>
                      <TableCell>{item.cInvoice || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No payment records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
