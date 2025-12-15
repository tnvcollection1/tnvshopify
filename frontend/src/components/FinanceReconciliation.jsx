import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, 
  FileSpreadsheet, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Search,
  Download,
  TrendingUp,
  Package,
  Truck,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const FinanceReconciliation = () => {
  const { selectedStore: globalStore, stores } = useStore();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (globalStore && globalStore !== 'all') {
      fetchReconciliation();
    } else {
      setRecords([]);
      setSummary(null);
    }
  }, [globalStore, filter]);

  const fetchReconciliation = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (globalStore !== 'all') params.append('store_name', globalStore);
      if (filter !== 'all') params.append('status', filter);
      
      const response = await axios.get(`${API}/finance/purchase-order-reconciliation?${params}`);
      setRecords(response.data.records || []);
      setSummary(response.data.summary || null);
    } catch (error) {
      console.error('Error fetching reconciliation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (globalStore === 'all') {
      toast.error('Please select a specific store first');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to clear all reconciliation data for ${globalStore}?`)) {
      return;
    }

    try {
      setClearing(true);
      await axios.delete(`${API}/finance/clear-reconciliation?store_name=${globalStore}`);
      toast.success('Data cleared successfully');
      fetchReconciliation();
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (globalStore === 'all') {
      toast.error('Please select a specific store first. Each store has its own reconciliation file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await axios.post(
        `${API}/finance/upload-purchase-orders?store_name=${globalStore}`, 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      toast.success(
        `✅ Reconciled ${response.data.total_records} records for ${globalStore}\n` +
        `Matched: ${response.data.matched} | Not Matched: ${response.data.not_matched}\n` +
        `Match Rate: ${response.data.match_rate}`
      );
      
      fetchReconciliation();
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Matched</Badge>;
      case 'not_matched':
        return <Badge className="bg-red-100 text-red-800 border-red-200">❌ Not Matched</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRecords = records.filter(record => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      (record.shopify_id || '').toLowerCase().includes(searchLower) ||
      (record.sku || '').toLowerCase().includes(searchLower) ||
      (record.awb || '').toLowerCase().includes(searchLower)
    );
  });

  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = ['Shopify ID', 'SKU', 'AWB/Tracking', 'Sell Amount', 'Cost', 'Profit', 'Status', 'Shopify Order', 'Shopify Amount', 'Amount Match'];
    const rows = filteredRecords.map(r => [
      r.shopify_id,
      r.sku,
      r.awb,
      r.sell_amount,
      r.cost,
      r.profit,
      r.status,
      r.shopify_order_name || '-',
      r.shopify_amount || 0,
      r.amount_match ? 'Yes' : 'No'
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reconciliation_${globalStore}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported to CSV');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance Reconciliation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Match Purchase Orders with Shopify Orders 
              {globalStore !== 'all' && <span className="text-green-600 font-medium"> • Store: {globalStore}</span>}
            </p>
          </div>
          <div className="flex gap-3">
            {records.length > 0 && (
              <Button 
                onClick={handleClearData} 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={clearing || globalStore === 'all'}
              >
                {clearing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Clear Data
              </Button>
            )}
            <Button onClick={exportToCSV} variant="outline" disabled={records.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading || globalStore === 'all'}
              />
              <Button 
                as="span" 
                className={`${globalStore === 'all' ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                disabled={uploading || globalStore === 'all'}
              >
                {uploading ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Upload for {globalStore === 'all' ? 'Store' : globalStore}</>
                )}
              </Button>
            </label>
          </div>
        </div>
        
        {/* Store Selection Warning */}
        {globalStore === 'all' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              <strong>Please select a specific store</strong> from the header dropdown. Each store has its own reconciliation data and upload file.
            </p>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-green-200 shadow-sm hover:shadow-lg cursor-pointer transition-all hover:border-green-400" onClick={() => setFilter('matched')}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Matched</p>
                    <p className="text-2xl font-bold text-green-600">{summary.matched}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-red-200 shadow-sm hover:shadow-lg cursor-pointer transition-all hover:border-red-400" onClick={() => setFilter('not_matched')}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Not Matched</p>
                    <p className="text-2xl font-bold text-red-600">{summary.not_matched || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Sell</p>
                    <p className="text-2xl font-bold text-gray-900">₹{summary.total_sell?.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <Package className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Cost</p>
                    <p className="text-2xl font-bold text-gray-900">₹{summary.total_cost?.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Profit</p>
                    <p className={`text-2xl font-bold ${summary.total_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₹{summary.total_profit?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <Truck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Match Rate</p>
                    <p className="text-2xl font-bold text-indigo-600">{summary.match_rate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6 bg-white border border-gray-200 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[250px]">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by Shopify ID, SKU, or AWB..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-48">
                <Label>Status</Label>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="matched">✅ Matched</SelectItem>
                    <SelectItem value="partial">⚠️ Partial</SelectItem>
                    <SelectItem value="unmatched">❌ Unmatched</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchReconciliation} variant="outline">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              {filter !== 'all' && (
                <Button variant="ghost" onClick={() => setFilter('all')}>Clear Filter</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        {records.length === 0 && !loading && (
          <Card className="mb-6 bg-white border border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Purchase Order Sheet</h3>
                <p className="text-gray-600 mb-4">
                  Upload your Excel file with these columns to reconcile with Shopify orders:
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200">SHOPIFY ID / ORDER #</Badge>
                  <Badge variant="outline" className="text-sm bg-purple-50 text-purple-700 border-purple-200">SKU</Badge>
                  <Badge variant="outline" className="text-sm bg-orange-50 text-orange-700 border-orange-200">AWB / DTDC TRACKING</Badge>
                  <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">SELL AMOUNT</Badge>
                  <Badge variant="outline" className="text-sm bg-red-50 text-red-700 border-red-200">COST</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Matching is done by: Order # → Tracking Number → Amount verification
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        {filteredRecords.length > 0 && (
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg text-gray-900">
                Reconciliation Results ({filteredRecords.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shopify ID</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>AWB/Tracking</TableHead>
                      <TableHead className="text-right">Sell Amount</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Shopify Order</TableHead>
                      <TableHead className="text-right">Shopify Amount</TableHead>
                      <TableHead>Amount Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record, index) => (
                      <TableRow 
                        key={record.id || index}
                        className={record.status === 'unmatched' ? 'bg-red-50' : record.status === 'partial' ? 'bg-yellow-50' : ''}
                      >
                        <TableCell className="font-mono">{record.shopify_id || '-'}</TableCell>
                        <TableCell className="font-mono">{record.sku || '-'}</TableCell>
                        <TableCell className="font-mono">{record.awb || '-'}</TableCell>
                        <TableCell className="text-right">₹{(record.sell_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">₹{(record.cost || 0).toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-semibold ${record.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{(record.profit || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="font-mono">{record.shopify_order_name || '-'}</TableCell>
                        <TableCell className="text-right">₹{(record.shopify_amount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          {record.amount_match ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : record.matched ? (
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-300" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceReconciliation;
