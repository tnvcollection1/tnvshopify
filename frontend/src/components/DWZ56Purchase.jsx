import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Package, Truck, DollarSign, RefreshCw, Search, 
  CheckCircle, XCircle, Clock, AlertTriangle, MapPin,
  Plane, FileText, CreditCard, BarChart3, ShoppingCart
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
};

const StatusBadge = ({ status, label }) => {
  const Icon = STATUS_ICONS[status] || Clock;
  return (
    <Badge className={`${STATUS_COLORS[status] || 'bg-gray-500'} text-white`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
};

export default function DWZ56Purchase() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Data states
  const [clientInfo, setClientInfo] = useState(null);
  const [courierTypes, setCourierTypes] = useState([]);
  const [trackingList, setTrackingList] = useState([]);
  const [feeList, setFeeList] = useState([]);
  const [importStats, setImportStats] = useState(null);
  
  // Pagination
  const [trackingPage, setTrackingPage] = useState(1);
  const [trackingTotal, setTrackingTotal] = useState(0);
  const [feePage, setFeePage] = useState(1);
  const [feeTotal, setFeeTotal] = useState(0);
  
  // Filters
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchTracking, setSearchTracking] = useState('');
  const [selectedCourier, setSelectedCourier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [matchFilter, setMatchFilter] = useState('all');
  
  // Fetch client info on mount
  useEffect(() => {
    fetchClientInfo();
    fetchCourierTypes();
  }, []);
  
  // Auto-load tracking when switching to tracking tab
  useEffect(() => {
    if (activeTab === 'tracking' && trackingList.length === 0) {
      fetchTrackingList(1);
    }
  }, [activeTab]);
  
  const fetchClientInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dwz56/purchase/client-info`);
      const data = await res.json();
      if (data.success) {
        setClientInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch client info:', err);
    }
  };
  
  const fetchCourierTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dwz56/purchase/courier-types`);
      const data = await res.json();
      if (data.success) {
        setCourierTypes(data.courier_types || []);
      }
    } catch (err) {
      console.error('Failed to fetch courier types:', err);
    }
  };
  
  const fetchImportStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dwz56/purchase/import-stats`);
      const data = await res.json();
      if (data.success) {
        setImportStats(data);
      }
    } catch (err) {
      setError('Failed to fetch import stats');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTrackingList = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: 50 });
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      if (searchTracking) params.append('tracking_number', searchTracking);
      if (selectedCourier && selectedCourier !== 'all') params.append('courier_type', selectedCourier);
      if (selectedStatus && selectedStatus !== 'all') {
        const mask = Array(11).fill('0');
        mask[parseInt(selectedStatus)] = '1';
        params.append('status_mask', mask.join(''));
      }
      
      const res = await fetch(`${API_URL}/api/dwz56/purchase/tracking-list?${params}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        let filteredRecords = data.records;
        
        if (selectedStore && selectedStore !== 'all') {
          filteredRecords = filteredRecords.filter(r => r.shopify_store === selectedStore);
        }
        
        if (matchFilter === 'matched') {
          filteredRecords = filteredRecords.filter(r => r.shopify_order_number);
        } else if (matchFilter === 'not_matched') {
          filteredRecords = filteredRecords.filter(r => !r.shopify_order_number);
        }
        
        setTrackingList(filteredRecords);
        setTrackingTotal(data.total_records);
        setTrackingPage(page);
        setError(null);
      } else if (res.status === 429) {
        setError('Rate limited by DWZ56 API. Please wait 1-2 minutes and try again.');
      }
    } catch (err) {
      setError('Failed to fetch tracking list');
    } finally {
      setLoading(false);
    }
  }, [dateRange, searchTracking, selectedCourier, selectedStatus, selectedStore, matchFilter]);
  
  const fetchFeeList = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: 50 });
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      
      const res = await fetch(`${API_URL}/api/dwz56/purchase/fee-list?${params}`);
      const data = await res.json();
      if (data.success) {
        setFeeList(data.records || []);
        setFeeTotal(data.total_records);
        setFeePage(page);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch fee list');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);
  
  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-orange-600" />
            DWZ56 Purchase Account
          </h1>
          <p className="text-gray-500">Account: Sunny (ID: 1051) - Purchase Reconciliation</p>
        </div>
        {clientInfo && (
          <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <DollarSign className="w-8 h-8" />
                <div>
                  <p className="text-sm opacity-80">Account Balance</p>
                  <p className="text-2xl font-bold">¥{clientInfo.balance?.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="tracking">
            <Package className="w-4 h-4 mr-2" />
            Tracking
          </TabsTrigger>
          <TabsTrigger value="fees">
            <CreditCard className="w-4 h-4 mr-2" />
            Fees & Payments
          </TabsTrigger>
        </TabsList>
        
        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Purchase Account Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientInfo ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-gray-500">Account Name</Label>
                    <p className="font-semibold">{clientInfo.account_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Client ID</Label>
                    <p className="font-semibold">{clientInfo.client_id}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Balance</Label>
                    <p className="font-semibold text-green-600">¥{clientInfo.balance?.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Contact</Label>
                    <p className="font-semibold">{clientInfo.contact || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading account info...</p>
              )}
            </CardContent>
          </Card>
          
          {/* Import Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Import Statistics</CardTitle>
              <Button onClick={fetchImportStats} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Load Import Stats'}
              </Button>
            </CardHeader>
            {importStats && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div 
                    className="text-center p-4 bg-white rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:bg-green-50 transition-all border-2 border-transparent hover:border-green-200"
                    onClick={() => { setSelectedStore('all'); setMatchFilter('matched'); setActiveTab('tracking'); setTimeout(() => fetchTrackingList(1), 100); }}
                  >
                    <p className="text-3xl font-bold text-green-600">
                      Rs.{importStats.total_sale_value?.toLocaleString(undefined, {maximumFractionDigits: 0}) || '0'}
                    </p>
                    <p className="text-sm text-gray-500">Total Sale Value</p>
                    <p className="text-xs text-green-500 mt-1">Click to view →</p>
                  </div>
                  <div 
                    className="text-center p-4 bg-white rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:bg-blue-50 transition-all border-2 border-transparent hover:border-blue-200"
                    onClick={() => { setSelectedStore('all'); setMatchFilter('matched'); setActiveTab('tracking'); setTimeout(() => fetchTrackingList(1), 100); }}
                  >
                    <p className="text-3xl font-bold text-blue-600">
                      {importStats.matched_orders?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-gray-500">Matched Orders</p>
                    <p className="text-xs text-blue-500 mt-1">Click to view →</p>
                  </div>
                  <div 
                    className="text-center p-4 bg-white rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:bg-purple-50 transition-all border-2 border-transparent hover:border-purple-200"
                    onClick={() => { setSelectedStore('all'); setMatchFilter('all'); setActiveTab('tracking'); setTimeout(() => fetchTrackingList(1), 100); }}
                  >
                    <p className="text-3xl font-bold text-purple-600">
                      {importStats.total_dwz56_records?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-gray-500">DWZ56 Records</p>
                    <p className="text-xs text-purple-500 mt-1">Click to view →</p>
                  </div>
                  <div 
                    className="text-center p-4 bg-white rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:bg-red-50 transition-all border-2 border-transparent hover:border-red-200"
                    onClick={() => { setSelectedStore('all'); setMatchFilter('not_matched'); setActiveTab('tracking'); setTimeout(() => fetchTrackingList(1), 100); }}
                  >
                    <p className="text-3xl font-bold text-red-600">
                      {(importStats.total_dwz56_records - importStats.matched_orders) || '0'}
                    </p>
                    <p className="text-sm text-gray-500">Not Matched</p>
                    <p className="text-xs text-red-500 mt-1">Click to view →</p>
                  </div>
                </div>
                
                {importStats.by_store && importStats.by_store.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Sales by Store (Click to filter)</h4>
                    <div className="space-y-2">
                      {importStats.by_store.map((store, idx) => (
                        <div 
                          key={idx} 
                          className="flex justify-between items-center p-3 bg-white rounded cursor-pointer hover:bg-blue-50 hover:shadow-md transition-all border-2 border-transparent hover:border-blue-200"
                          onClick={() => { setSelectedStore(store.store); setMatchFilter('matched'); setActiveTab('tracking'); setTimeout(() => fetchTrackingList(1), 100); }}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-orange-100">{store.store || 'Unknown'}</Badge>
                            <span className="text-xs text-blue-500">Click to filter →</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-green-600">Rs.{store.sale_value?.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            <span className="text-sm text-gray-500 ml-2">({store.orders} orders)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
          
          {/* Courier Types */}
          <Card>
            <CardHeader>
              <CardTitle>Available Courier Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {courierTypes.map((c, i) => (
                  <Badge key={i} variant="outline">{c.display_name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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
                      <SelectItem value="all">All couriers</SelectItem>
                      {courierTypes.map((c, i) => (
                        <SelectItem key={i} value={c.code}>{c.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="0">Not Sent</SelectItem>
                      <SelectItem value="1">Sent</SelectItem>
                      <SelectItem value="2">In Transit</SelectItem>
                      <SelectItem value="3">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Store</Label>
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger>
                      <SelectValue placeholder="All stores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All stores</SelectItem>
                      <SelectItem value="tnvcollectionpk">tnvcollectionpk</SelectItem>
                      <SelectItem value="tnvcollection">tnvcollection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Match Status</Label>
                  <Select value={matchFilter} onValueChange={setMatchFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="matched">✅ Matched</SelectItem>
                      <SelectItem value="not_matched">❌ Not Matched</SelectItem>
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
          
          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Purchase Tracking Records ({trackingList.length} / {trackingTotal})</span>
                <Badge variant="outline">Page {trackingPage}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking #</TableHead>
                        <TableHead>AWB</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Shopify Order</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackingList.map((rec, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">{rec.cNum}</TableCell>
                          <TableCell className="font-mono text-sm">{rec.cNo}</TableCell>
                          <TableCell className="text-sm">{rec.cRNo || '-'}</TableCell>
                          <TableCell>
                            <StatusBadge status={rec.status_code} label={rec.status_label_en} />
                          </TableCell>
                          <TableCell>
                            {rec.shopify_order_number ? (
                              <div>
                                <Badge variant="outline" className="bg-green-100">#{rec.shopify_order_number}</Badge>
                                <p className="text-xs text-gray-500">{rec.shopify_store}</p>
                                <p className="text-xs text-gray-500">{rec.shopify_customer}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>{rec.cAddress || '-'}</TableCell>
                          <TableCell>{rec.fWeight ? `${rec.fWeight}kg` : '-'}</TableCell>
                          <TableCell className="text-sm">{rec.dDate || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => fetchTrackingList(trackingPage - 1)}
                      disabled={trackingPage <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-500">
                      Page {trackingPage} of {Math.ceil(trackingTotal / 50)}
                    </span>
                    <Button 
                      variant="outline" 
                      onClick={() => fetchTrackingList(trackingPage + 1)}
                      disabled={trackingPage >= Math.ceil(trackingTotal / 50) || loading}
                    >
                      Next
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Fees Tab */}
        <TabsContent value="fees" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <div className="flex items-end col-span-2">
                  <Button onClick={() => fetchFeeList(1)} className="w-full md:w-auto">
                    <Search className="w-4 h-4 mr-2" />
                    Load Fees
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Fee List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Payment & Fee Records ({feeList.length})</span>
                <Badge variant="outline">Page {feePage}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : feeList.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeList.map((fee, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{fee.dDate || '-'}</TableCell>
                          <TableCell>{fee.cType || '-'}</TableCell>
                          <TableCell className={fee.fMoney > 0 ? 'text-green-600' : 'text-red-600'}>
                            ¥{fee.fMoney?.toLocaleString() || '0'}
                          </TableCell>
                          <TableCell>¥{fee.fBalance?.toLocaleString() || '0'}</TableCell>
                          <TableCell>{fee.cRef || '-'}</TableCell>
                          <TableCell>{fee.cNote || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => fetchFeeList(feePage - 1)}
                      disabled={feePage <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-500">
                      Page {feePage} of {Math.ceil(feeTotal / 50)}
                    </span>
                    <Button 
                      variant="outline" 
                      onClick={() => fetchFeeList(feePage + 1)}
                      disabled={feePage >= Math.ceil(feeTotal / 50) || loading}
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">Click "Load Fees" to view payment records</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
