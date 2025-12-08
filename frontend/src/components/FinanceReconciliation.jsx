import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, DollarSign, CheckCircle, XCircle, AlertCircle, RefreshCw, Link2, History, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FinanceReconciliation = () => {
  const [reconciliationData, setReconciliationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [financeStatus, setFinanceStatus] = useState(null);
  const [filter, setFilter] = useState('all'); // all, complete, partial, missing, verified
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadHistory, setUploadHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [unmatchedData, setUnmatchedData] = useState(null);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    fetchFinanceStatus();
    fetchUploadHistory();
  }, []);

  const fetchFinanceStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/finance/status`);
      setFinanceStatus(response.data);
    } catch (error) {
      console.error('Error fetching finance status:', error);
    }
  };

  const handleLedgerUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/finance/upload-ledger`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`✅ Uploaded ${response.data.uploaded_count} ledger records`);
      fetchFinanceStatus();
      
    } catch (error) {
      console.error('Error uploading ledger:', error);
      toast.error('Failed to upload ledger file');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionsUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/finance/upload-transactions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`✅ Uploaded ${response.data.uploaded_count} bank transactions`);
      fetchFinanceStatus();
      
    } catch (error) {
      console.error('Error uploading transactions:', error);
      toast.error('Failed to upload transactions file');
    } finally {
      setLoading(false);
    }
  };

  const fetchReconciliation = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/finance/reconciliation?store_name=ashmiaa`);
      setReconciliationData(response.data);
      toast.success('✅ Reconciliation complete');
    } catch (error) {
      console.error('Error fetching reconciliation:', error);
      toast.error('Failed to fetch reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const matchTransactions = async () => {
    try {
      setLoading(true);
      toast.info('🔗 Matching transactions...');
      const response = await axios.post(`${API_URL}/api/finance/match-transactions`);
      toast.success(`✅ Matched ${response.data.matched_count} transactions`);
      // Refresh reconciliation
      await fetchReconciliation();
    } catch (error) {
      console.error('Error matching transactions:', error);
      toast.error('Failed to match transactions');
    } finally {
      setLoading(false);
    }
  };

  const verifyOrder = async (orderNumber) => {
    const username = localStorage.getItem('username') || 'admin';
    const notes = prompt('Add verification notes (optional):') || '';
    
    try {
      setVerifyingOrder(orderNumber);
      await axios.post(`${API_URL}/api/finance/verify-order`, null, {
        params: { order_number: orderNumber, verified_by: username, notes }
      });
      toast.success(`✅ Order ${orderNumber} verified`);
      // Refresh reconciliation
      await fetchReconciliation();
    } catch (error) {
      console.error('Error verifying order:', error);
      toast.error('Failed to verify order');
    } finally {
      setVerifyingOrder(null);
    }
  };

  const fetchUploadHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/finance/upload-history`);
      setUploadHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching upload history:', error);
    }
  };

  const rollbackToSnapshot = async (snapshotId) => {
    if (!window.confirm('Are you sure you want to rollback? This will replace current data.')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/finance/rollback/${snapshotId}`);
      toast.success(response.data.message);
      await fetchFinanceStatus();
      await fetchReconciliation();
    } catch (error) {
      console.error('Error rolling back:', error);
      toast.error('Failed to rollback');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnmatchedRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/finance/unmatched-records?store_name=ashmiaa`);
      setUnmatchedData(response.data);
      setShowUnmatched(true);
      toast.info(`Found ${response.data.summary.unmatched_ledger_count} unmatched ledger records`);
    } catch (error) {
      console.error('Error fetching unmatched records:', error);
      toast.error('Failed to fetch unmatched records');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Verified': 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      'Complete': 'bg-green-500/20 text-green-300 border-green-500/50',
      'Partial': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      'Missing Data': 'bg-gray-500/20 text-gray-300 border-gray-500/50',
      'Error': 'bg-red-600/30 text-red-200 border-red-500'
    };

    const icons = {
      'Verified': <CheckCircle className="w-4 h-4" />,
      'Complete': <CheckCircle className="w-4 h-4" />,
      'Partial': <AlertCircle className="w-4 h-4" />,
      'Missing Data': <XCircle className="w-4 h-4" />,
      'Error': <XCircle className="w-4 h-4" />
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  const filteredOrders = reconciliationData?.orders?.filter(order => {
    const matchesFilter = filter === 'all' || order.reconciliation_status.toLowerCase().includes(filter);
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          💰 Finance Reconciliation - Ashmia
        </h1>
        <p className="text-gray-400">
          Match Shopify orders with purchase records and bank transactions
        </p>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-semibold">General Ledger</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            {financeStatus?.ledger_records || 0} records uploaded
          </p>
          <label className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleLedgerUpload}
              className="hidden"
              disabled={loading}
            />
          </label>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-semibold">Bank Transactions</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            {financeStatus?.transaction_records || 0} records uploaded
          </p>
          <label className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleTransactionsUpload}
              className="hidden"
              disabled={loading}
            />
          </label>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-semibold">Reconcile</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Run reconciliation process
          </p>
          <button
            onClick={fetchReconciliation}
            disabled={loading || !financeStatus?.ledger_records}
            className="flex items-center justify-center gap-2 px-4 py-2 w-full bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 mb-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Processing...' : 'Run Reconciliation'}
          </button>
          <button
            onClick={matchTransactions}
            disabled={loading || !financeStatus?.transaction_records}
            className="flex items-center justify-center gap-2 px-4 py-2 w-full bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Link2 className="w-4 h-4" />
            Match Transactions
          </button>
        </div>
      </div>

      {/* Upload History & Unmatched Records Buttons */}
      <div className="mb-6 flex justify-end gap-3">
        <button
          onClick={fetchUnmatchedRecords}
          disabled={loading || !financeStatus?.ledger_records}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 border border-orange-500 rounded-lg transition-colors disabled:opacity-50"
        >
          <AlertCircle className="w-4 h-4" />
          View Unmatched Records
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors"
        >
          <History className="w-4 h-4" />
          {showHistory ? 'Hide History' : 'View Upload History'}
        </button>
      </div>

      {/* Upload History Panel */}
      {showHistory && (
        <div className="mb-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Upload History & Rollback
          </h3>
          <div className="space-y-2">
            {uploadHistory.length === 0 ? (
              <p className="text-gray-400">No upload history yet</p>
            ) : (
              uploadHistory.map((item) => (
                <div key={item.snapshot_id} className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{item.file_name}</p>
                    <p className="text-sm text-gray-400">
                      {item.upload_type} • {item.record_count} records • {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => rollbackToSnapshot(item.snapshot_id)}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Rollback
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Unmatched Records Panel */}
      {showUnmatched && unmatchedData && (
        <div className="mb-8 bg-gray-800/50 backdrop-blur-sm border border-orange-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              Unmatched Records from Uploaded Files
            </h3>
            <button
              onClick={() => setShowUnmatched(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900/50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-400 mb-1">
                {unmatchedData.summary.unmatched_ledger_count}
              </div>
              <div className="text-sm text-gray-400">
                Unmatched Ledger Records (out of {unmatchedData.summary.total_ledger_records})
              </div>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-400 mb-1">
                {unmatchedData.summary.unmatched_transactions_count}
              </div>
              <div className="text-sm text-gray-400">
                Unmatched Transactions (out of {unmatchedData.summary.total_transactions})
              </div>
            </div>
          </div>

          {/* Unmatched Ledger Records */}
          {unmatchedData.unmatched_ledger.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3 text-orange-300">
                📄 Ledger Records Not Found in Shopify ({unmatchedData.unmatched_ledger.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-400">Order #</th>
                      <th className="px-4 py-2 text-left text-gray-400">Date</th>
                      <th className="px-4 py-2 text-left text-gray-400">Status</th>
                      <th className="px-4 py-2 text-left text-gray-400">Payment</th>
                      <th className="px-4 py-2 text-right text-gray-400">Amount</th>
                      <th className="px-4 py-2 text-left text-gray-400">Tracking</th>
                      <th className="px-4 py-2 text-left text-gray-400">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {unmatchedData.unmatched_ledger.slice(0, 50).map((record, idx) => (
                      <tr key={idx} className="hover:bg-gray-700/30">
                        <td className="px-4 py-2 font-mono text-orange-400">#{record.order_number}</td>
                        <td className="px-4 py-2 text-gray-300">{record.date}</td>
                        <td className="px-4 py-2 text-gray-300">{record.order_status}</td>
                        <td className="px-4 py-2 text-gray-300">{record.payment_status}</td>
                        <td className="px-4 py-2 text-right text-white">Rs. {record.sale_price?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-gray-300">{record.tracking_number || '-'}</td>
                        <td className="px-4 py-2 text-orange-300 text-xs">{record.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {unmatchedData.unmatched_ledger.length > 50 && (
                  <p className="text-center text-gray-500 mt-2 text-sm">
                    Showing first 50 of {unmatchedData.unmatched_ledger.length} records
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Unmatched Transactions */}
          {unmatchedData.unmatched_transactions.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-3 text-orange-300">
                💳 Bank Transactions Not Matched to Orders ({unmatchedData.unmatched_transactions.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-400">Date</th>
                      <th className="px-4 py-2 text-left text-gray-400">Description</th>
                      <th className="px-4 py-2 text-left text-gray-400">Mode</th>
                      <th className="px-4 py-2 text-right text-gray-400">Debit</th>
                      <th className="px-4 py-2 text-right text-gray-400">Credit</th>
                      <th className="px-4 py-2 text-left text-gray-400">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {unmatchedData.unmatched_transactions.slice(0, 50).map((trans, idx) => (
                      <tr key={idx} className="hover:bg-gray-700/30">
                        <td className="px-4 py-2 text-gray-300">{trans.date}</td>
                        <td className="px-4 py-2 text-gray-300">{trans.description}</td>
                        <td className="px-4 py-2 text-gray-300">{trans.payment_mode}</td>
                        <td className="px-4 py-2 text-right text-red-400">
                          {trans.debit > 0 ? `Rs. ${trans.debit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-right text-green-400">
                          {trans.credit > 0 ? `Rs. ${trans.credit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-orange-300 text-xs">{trans.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {unmatchedData.unmatched_transactions.length > 50 && (
                  <p className="text-center text-gray-500 mt-2 text-sm">
                    Showing first 50 of {unmatchedData.unmatched_transactions.length} records
                  </p>
                )}
              </div>
            </div>
          )}

          {unmatchedData.unmatched_ledger.length === 0 && unmatchedData.unmatched_transactions.length === 0 && (
            <p className="text-center text-green-400 py-8">
              ✅ All records from uploaded files are matched!
            </p>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {reconciliationData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-white mb-1">
              {reconciliationData.summary.total_orders}
            </div>
            <div className="text-gray-400 text-xs">Total Orders</div>
          </div>
          
          <div className="bg-gray-800/50 border border-blue-900/50 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {reconciliationData.summary.verified || 0}
            </div>
            <div className="text-gray-400 text-xs">Verified</div>
          </div>
          
          <div className="bg-gray-800/50 border border-green-900/50 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {reconciliationData.summary.fully_reconciled}
            </div>
            <div className="text-gray-400 text-xs">Complete</div>
          </div>
          
          <div className="bg-gray-800/50 border border-yellow-900/50 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {reconciliationData.summary.partial_reconciled}
            </div>
            <div className="text-gray-400 text-xs">Partial</div>
          </div>
          
          <div className="bg-gray-800/50 border border-red-900/50 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {reconciliationData.summary.errors || 0}
            </div>
            <div className="text-gray-400 text-xs">Errors</div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-400 mb-1">
              {reconciliationData.summary.not_reconciled}
            </div>
            <div className="text-gray-400 text-xs">Missing</div>
          </div>
          
          <div className="bg-gray-800/50 border border-indigo-900/50 rounded-xl p-4">
            <div className="text-2xl font-bold text-indigo-400 mb-1">
              {reconciliationData.summary.transaction_matched || 0}
            </div>
            <div className="text-gray-400 text-xs">TX Matched</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {reconciliationData && (
        <div className="mb-6 flex gap-4 items-center">
          <input
            type="text"
            placeholder="Search by order number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'verified' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Verified
            </button>
            <button
              onClick={() => setFilter('complete')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Complete
            </button>
            <button
              onClick={() => setFilter('partial')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'partial' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Partial
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Errors
            </button>
            <button
              onClick={() => setFilter('missing')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'missing' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Missing
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      {reconciliationData && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Order #</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Delivery</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Payment</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Amount</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">TX Match</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Status</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredOrders.map((order) => (
                  <React.Fragment key={order.order_number}>
                    <tr 
                      className="hover:bg-gray-700/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedOrder(expandedOrder === order.order_number ? null : order.order_number)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-blue-400">
                            #{order.order_number}
                          </span>
                          {order.transaction_matched && (
                            <span className="text-xs text-gray-500">
                              {expandedOrder === order.order_number ? '▼' : '▶'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{order.customer_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-300">{order.delivery_status}</span>
                          {order.tracking_match && (
                            <CheckCircle className="w-3 h-3 text-green-500" title="Tracking verified" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{order.payment_status}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-white font-semibold">
                          Rs. {order.amount?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {order.transaction_matched ? (
                          <button 
                            className="text-green-400 text-sm flex items-center justify-center gap-1 hover:text-green-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedOrder(expandedOrder === order.order_number ? null : order.order_number);
                            }}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {(order.match_confidence * 100).toFixed(0)}%
                          </button>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(order.reconciliation_status)}
                      </td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {!order.verified && order.ledger_exists && (
                          <button
                            onClick={() => verifyOrder(order.order_number)}
                            disabled={verifyingOrder === order.order_number}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {verifyingOrder === order.order_number ? '...' : 'Verify'}
                          </button>
                        )}
                        {order.verified && (
                          <span className="text-green-400 text-xs">✓ Verified</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded Row - Transaction Details & Validation Errors */}
                    {expandedOrder === order.order_number && (order.transaction_matched || order.has_errors) && (
                      <tr className="bg-gray-900/50">
                        <td colSpan="8" className="px-6 py-4">
                          {/* Validation Errors (if any) */}
                          {order.has_errors && order.validation_errors && (
                            <div className="ml-8 mb-4 p-4 bg-red-900/20 rounded-lg border border-red-500">
                              <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                                <XCircle className="w-4 h-4" />
                                Validation Errors - Data Mismatch Detected
                              </h4>
                              <ul className="list-disc list-inside space-y-1 text-sm text-red-300">
                                {order.validation_errors.map((error, idx) => (
                                  <li key={idx}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Transaction Details */}
                          {order.transaction_matched && (
                          <div className="ml-8 p-4 bg-gray-800/50 rounded-lg border border-green-900/50">
                            <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                              <Link2 className="w-4 h-4" />
                              Matched Bank Transaction ({(order.match_confidence * 100).toFixed(0)}% confidence)
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                              <div>
                                <div className="text-gray-500 text-xs mb-1">Date</div>
                                <div className="text-white">{order.matched_transaction_details?.date || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 text-xs mb-1">Description</div>
                                <div className="text-white">{order.matched_transaction_details?.description || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 text-xs mb-1">Payment Mode</div>
                                <div className="text-white">{order.matched_transaction_details?.payment_mode || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 text-xs mb-1">Debit</div>
                                <div className="text-red-400">
                                  {order.matched_transaction_details?.debit > 0 
                                    ? `Rs. ${order.matched_transaction_details.debit.toFixed(2)}` 
                                    : '-'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 text-xs mb-1">Credit</div>
                                <div className="text-green-400">
                                  {order.matched_transaction_details?.credit > 0 
                                    ? `Rs. ${order.matched_transaction_details.credit.toFixed(2)}` 
                                    : '-'}
                                </div>
                              </div>
                            </div>
                            
                            {/* Tracking Verification */}
                            {order.tracking_number && order.tracking_number !== 'N/A' && (
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                <div className="text-xs text-gray-400 mb-2">Tracking Verification:</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-300">Shopify: {order.tracking_number}</span>
                                  {order.tracking_match ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                      <span className="text-gray-300">Excel: {order.ledger_tracking || 'N/A'}</span>
                                      <span className="text-green-400 text-xs ml-2">✓ Match Verified</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4 text-red-500" />
                                      <span className="text-gray-300">Excel: {order.ledger_tracking || 'Not found'}</span>
                                      <span className="text-red-400 text-xs ml-2">✗ Mismatch</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredOrders.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              <p className="text-lg">No orders found matching your filters</p>
            </div>
          )}
        </div>
      )}

      {!reconciliationData && !loading && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No reconciliation data yet</p>
          <p className="text-gray-500 text-sm">
            Upload ledger and bank transaction files, then run reconciliation
          </p>
        </div>
      )}
    </div>
  );
};

export default FinanceReconciliation;
