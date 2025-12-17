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
  Truck,
  CreditCard,
  Building2,
  Trash2,
  IndianRupee
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const DTDCReconciliation = () => {
  const { selectedStore: globalStore } = useStore();
  const [loading, setLoading] = useState(false);
  const [uploadingDTDC, setUploadingDTDC] = useState(false);
  const [uploadingBank, setUploadingBank] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('dtdc');
  
  // COD Reconciliation state
  const [codRecords, setCodRecords] = useState([]);
  const [codSummary, setCodSummary] = useState(null);
  const [codLoading, setCodLoading] = useState(false);

  useEffect(() => {
    if (globalStore && globalStore !== 'all') {
      fetchReconciliation();
      fetchCodReconciliation();
    } else {
      setRecords([]);
      setSummary(null);
      setCodRecords([]);
      setCodSummary(null);
    }
  }, [globalStore, filter]);

  const fetchReconciliation = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (globalStore !== 'all') params.append('store_name', globalStore);
      if (filter !== 'all') params.append('status', filter);
      
      const response = await axios.get(`${API}/finance/dtdc-payment-reconciliation?${params}`);
      setRecords(response.data.records || []);
      setSummary(response.data.summary || null);
    } catch (error) {
      console.error('Error fetching DTDC reconciliation:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCodReconciliation = async () => {
    try {
      setCodLoading(true);
      const response = await axios.get(`${API}/finance/cod-reconciliation?store_name=${globalStore}`);
      setCodRecords(response.data.records || []);
      setCodSummary(response.data.summary || null);
    } catch (error) {
      console.error('Error fetching COD reconciliation:', error);
    } finally {
      setCodLoading(false);
    }
  };

  const handleDTDCUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (globalStore === 'all') {
      toast.error('Please select a specific store first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingDTDC(true);
      const response = await axios.post(
        `${API}/finance/upload-dtdc-payments?store_name=${globalStore}`, 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      toast.success(
        `✅ Uploaded ${response.data.total_records} DTDC payments\n` +
        `Matched: ${response.data.matched} | Total COD: ₹${response.data.total_cod_amount?.toLocaleString()}`
      );
      
      fetchReconciliation();
      fetchCodReconciliation();
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading DTDC payments:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload DTDC payments');
    } finally {
      setUploadingDTDC(false);
    }
  };

  const handleBankUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (globalStore === 'all') {
      toast.error('Please select a specific store first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingBank(true);
      const response = await axios.post(
        `${API}/finance/upload-bank-statement?store_name=${globalStore}`, 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      toast.success(
        `✅ Uploaded ${response.data.total_records} bank transactions\n` +
        `DTDC Payments Found: ${response.data.dtdc_payments_detected} | Matched: ${response.data.matched_with_dtdc}`
      );
      
      fetchReconciliation();
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading bank statement:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload bank statement');
    } finally {
      setUploadingBank(false);
    }
  };

  const handleClearData = async () => {
    if (globalStore === 'all') {
      toast.error('Please select a specific store first');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to clear all DTDC reconciliation data for ${globalStore}?`)) {
      return;
    }

    try {
      setClearing(true);
      await axios.delete(`${API}/finance/clear-dtdc-reconciliation?store_name=${globalStore}`);
      toast.success('Data cleared successfully');
      fetchReconciliation();
      fetchCodReconciliation();
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  const filteredRecords = records.filter(record => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      (record.awb || '').toLowerCase().includes(searchLower) ||
      (record.matched_order_number || '').toString().toLowerCase().includes(searchLower) ||
      (record.shopify_order || '').toLowerCase().includes(searchLower) ||
      (record.utr_number || '').toLowerCase().includes(searchLower) ||
      (record.remittance_status || '').toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (record) => {
    if (record.bank_matched) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Received</Badge>;
    } else if (record.matched) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⏳ Pending</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">❓ Unmatched</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DTDC Payment Reconciliation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Match DTDC COD collections with bank deposits
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
          </div>
        </div>
        
        {/* Store Selection Warning */}
        {globalStore === 'all' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              <strong>Please select a specific store</strong> from the header dropdown to upload and view DTDC payment data.
            </p>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="dtdc">DTDC Payments</TabsTrigger>
            <TabsTrigger value="cod">COD Reconciliation</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'dtdc' && (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Truck className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{summary.total_records}</p>
                        <p className="text-sm text-gray-500">Total Records</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{summary.matched_orders || 0}</p>
                        <p className="text-sm text-gray-500">Matched Orders</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <IndianRupee className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">₹{(summary.total_cod_collected || 0).toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Total COD</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">₹{(summary.total_remitted || 0).toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Total Remitted</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <CreditCard className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{summary.unique_utrs || 0}</p>
                        <p className="text-sm text-gray-500">Unique UTRs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-600">{summary.not_matched_orders || 0}</p>
                        <p className="text-sm text-gray-500">Unmatched</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-100 rounded-lg">
                        <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-indigo-600">{summary.finance_reconciled || 0}</p>
                        <p className="text-sm text-gray-500">Reconciled</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* DTDC Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
                Step 1: Upload DTDC Payment Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Upload DTDC COD collection report. Required columns: <strong>AWB</strong>, <strong>COD Amount</strong>
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleDTDCUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={uploadingDTDC || globalStore === 'all'}
                />
                <Button 
                  className={`w-full ${globalStore === 'all' ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'} pointer-events-none`}
                >
                  {uploadingDTDC ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Upload DTDC Report</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bank Statement Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Step 2: Upload Bank Statement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Upload bank statement to match deposits. Required columns: <strong>Date</strong>, <strong>Amount</strong>, <strong>Description</strong>
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBankUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={uploadingBank || globalStore === 'all' || records.length === 0}
                />
                <Button 
                  className={`w-full ${(globalStore === 'all' || records.length === 0) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} pointer-events-none`}
                >
                  {uploadingBank ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Upload Bank Statement</>
                  )}
                </Button>
              </div>
              {records.length === 0 && globalStore !== 'all' && (
                <p className="text-xs text-amber-600 mt-2">⚠️ Upload DTDC report first</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by AWB or Order Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="received">Received in Bank</SelectItem>
              <SelectItem value="pending">Pending Deposit</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchReconciliation} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Data Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>AWB / CN Number</TableHead>
                <TableHead>Shopify Order#</TableHead>
                <TableHead className="text-right">COD Amount</TableHead>
                <TableHead className="text-right">Remitted Amount</TableHead>
                <TableHead>UTR Number</TableHead>
                <TableHead>Remittance Status</TableHead>
                <TableHead className="text-center">Order Match</TableHead>
                <TableHead className="text-center">Reconciliation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">Loading...</p>
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {globalStore === 'all' 
                      ? 'Please select a store to view DTDC payment data'
                      : 'No DTDC payment records found. Upload a DTDC report to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{record.awb}</TableCell>
                    <TableCell>
                      {record.shopify_order ? (
                        <span className="text-blue-600">{record.shopify_order}</span>
                      ) : record.matched_order_number ? (
                        <span className="text-blue-600">#{record.matched_order_number}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{(record.cod_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      ₹{(record.remitted_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {record.utr_number || '-'}
                    </TableCell>
                    <TableCell>
                      {record.remittance_status === 'Remitted' ? (
                        <Badge className="bg-green-100 text-green-800">Remitted</Badge>
                      ) : record.remittance_status === 'Posted To SAP' ? (
                        <Badge className="bg-blue-100 text-blue-800">Posted To SAP</Badge>
                      ) : record.remittance_status ? (
                        <Badge variant="outline">{record.remittance_status}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {record.matched ? (
                        <Badge className="bg-green-100 text-green-800">✓ Matched</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">Unmatched</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {record.finance_reconciled ? (
                        <Badge className="bg-green-100 text-green-800">✓ Reconciled</Badge>
                      ) : record.matched && record.remittance_status === 'Remitted' ? (
                        <Badge className="bg-blue-100 text-blue-800">Ready</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
          </>
        )}

        {/* COD Reconciliation Tab */}
        {activeTab === 'cod' && (
          <>
            {/* COD Summary Cards */}
            {codSummary && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{codSummary.total_orders}</p>
                      <p className="text-sm text-gray-500">COD Orders</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">₹{(codSummary.total_cod_expected || 0).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Expected COD</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">₹{(codSummary.total_cod_collected || 0).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Collected ({codSummary.collection_rate})</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">₹{(codSummary.total_cod_deposited || 0).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Deposited ({codSummary.deposit_rate})</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">₹{(codSummary.pending_collection || 0).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Pending Collection</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* COD Lifecycle Info */}
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">1</div>
                    <span>Order Placed (COD)</span>
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">2</div>
                    <span>DTDC Collects</span>
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">3</div>
                    <span>Bank Deposit</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* COD Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>COD Reconciliation Details</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>AWB</TableHead>
                    <TableHead className="text-right">Sell Amt</TableHead>
                    <TableHead className="text-right">Advance</TableHead>
                    <TableHead className="text-right">COD Expected</TableHead>
                    <TableHead className="text-right">COD Collected</TableHead>
                    <TableHead className="text-right">Bank Deposited</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      </TableCell>
                    </TableRow>
                  ) : codRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        {globalStore === 'all' 
                          ? 'Please select a store'
                          : 'No COD orders found. Upload finance reconciliation sheet with COD amounts first.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    codRecords.map((record, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm text-blue-600">#{record.shopify_id || record.shopify_order}</TableCell>
                        <TableCell className="font-mono text-sm">{record.awb || '-'}</TableCell>
                        <TableCell className="text-right">₹{(record.sell_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-blue-600">₹{(record.advance_payment || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">₹{(record.cod_expected || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {record.cod_collected > 0 ? (
                            <span className="text-orange-600 font-medium">₹{record.cod_collected.toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.bank_deposited ? (
                            <span className="text-green-600 font-medium">₹{(record.bank_amount || record.cod_collected || 0).toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {record.status === 'deposited' ? (
                            <Badge className="bg-green-100 text-green-800">✅ Deposited</Badge>
                          ) : record.status === 'collected' ? (
                            <Badge className="bg-orange-100 text-orange-800">📦 Collected</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">⏳ Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default DTDCReconciliation;
