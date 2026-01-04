import React, { useState } from 'react';
import { RefreshCw, Store, Package, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const StoreSyncPanel = ({ onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedCourier, setSelectedCourier] = useState('all');
  const [syncStatus, setSyncStatus] = useState({});

  const stores = [
    { value: 'all', label: 'All Stores', icon: '🏪' },
    { value: 'tnvcollection', label: 'TnV Collection', icon: '👕' },
    { value: 'tnvcollectionpk', label: 'TnV Collection PK', icon: '🇵🇰' },
    { value: 'ashmiaa', label: 'Ashmiaa', icon: '👗' }
  ];

  const couriers = [
    { value: 'all', label: 'All Couriers', icon: '📦' },
    { value: 'dtdc', label: 'DTDC', icon: '🚚' },
    { value: 'tcs', label: 'TCS', icon: '📮' }
  ];

  const syncShopifyOrders = async () => {
    setSyncing(true);
    setSyncStatus({});
    
    try {
      const storesToSync = selectedStore === 'all' 
        ? ['tnvcollection', 'tnvcollectionpk', 'ashmiaa']
        : [selectedStore];

      let totalSynced = 0;
      const results = {};
      const jobIds = {};

      // Start all sync jobs (non-blocking)
      for (const store of storesToSync) {
        try {
          const response = await axios.post(
            `${API_URL}/api/shopify/sync-background/${store}`,
            null,
            { params: { days_back: 30 } }
          );

          if (response.data.success) {
            jobIds[store] = response.data.job_id;
            results[store] = {
              success: true,
              status: 'started',
              job_id: response.data.job_id
            };
          }
        } catch (error) {
          results[store] = {
            success: false,
            error: error.response?.data?.detail || 'Failed to start sync'
          };
        }
      }

      // Poll for completion
      const pollInterval = 2000; // 2 seconds
      const maxPolls = 60; // 2 minutes max
      let polls = 0;
      
      const checkJobs = async () => {
        let allComplete = true;
        
        for (const store of Object.keys(jobIds)) {
          try {
            const statusRes = await axios.get(
              `${API_URL}/api/shopify/sync-status/${jobIds[store]}`
            );
            
            const job = statusRes.data.job;
            results[store] = {
              success: true,
              status: job.status,
              count: job.orders_processed || 0,
              progress: job.progress || 0
            };
            
            if (job.status === 'completed') {
              totalSynced += job.orders_processed || 0;
            } else if (job.status !== 'failed') {
              allComplete = false;
            }
          } catch (err) {
            console.error(`Error checking status for ${store}:`, err);
          }
        }
        
        setSyncStatus({
          type: 'shopify',
          results,
          total: totalSynced,
          inProgress: !allComplete
        });
        
        polls++;
        
        if (!allComplete && polls < maxPolls) {
          setTimeout(checkJobs, pollInterval);
        } else {
          setSyncing(false);
          if (onSyncComplete) onSyncComplete();
        }
      };
      
      // Start polling
      setTimeout(checkJobs, pollInterval);
      
    } catch (error) {
      console.error('Sync error:', error);
      setSyncing(false);
    }
  };

  const syncCourierTracking = async () => {
    setSyncing(true);
    setSyncStatus({});

    try {
      const couriersToSync = selectedCourier === 'all'
        ? ['dtdc', 'tcs']
        : [selectedCourier];

      const results = {};
      let totalUpdated = 0;

      for (const courier of couriersToSync) {
        try {
          const endpoint = courier === 'dtdc' 
            ? `${API_URL}/api/dtdc/sync-all-tracking`
            : `${API_URL}/api/tcs/sync-all`;

          const response = await axios.post(endpoint);

          results[courier] = {
            success: true,
            updated: response.data.updated || 0,
            failed: response.data.failed || 0
          };
          totalUpdated += results[courier].updated;
        } catch (error) {
          results[courier] = {
            success: false,
            error: error.response?.data?.detail || 'Failed to sync'
          };
        }
      }

      setSyncStatus({
        type: 'courier',
        results,
        total: totalUpdated
      });

      if (onSyncComplete) onSyncComplete();
    } catch (error) {
      console.error('Courier sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-6">
        <RefreshCw className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-bold text-white">Store & Courier Sync</h3>
      </div>

      {/* Store Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Store className="w-4 h-4 inline mr-1" />
          Select Store
        </label>
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          disabled={syncing}
        >
          {stores.map(store => (
            <option key={store.value} value={store.value}>
              {store.icon} {store.label}
            </option>
          ))}
        </select>
      </div>

      {/* Courier Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Package className="w-4 h-4 inline mr-1" />
          Select Courier
        </label>
        <select
          value={selectedCourier}
          onChange={(e) => setSelectedCourier(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          disabled={syncing}
        >
          {couriers.map(courier => (
            <option key={courier.value} value={courier.value}>
              {courier.icon} {courier.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sync Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={syncShopifyOrders}
          disabled={syncing}
          className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {syncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Store className="w-4 h-4" />
          )}
          Sync Orders
        </button>

        <button
          onClick={syncCourierTracking}
          disabled={syncing}
          className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {syncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Package className="w-4 h-4" />
          )}
          Sync Tracking
        </button>
      </div>

      {/* Sync Status Display */}
      {syncStatus.results && (
        <div className="mt-4 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            {syncStatus.inProgress ? (
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
            <h4 className="font-bold text-white">
              {syncStatus.type === 'shopify' ? 'Shopify Sync' : 'Courier Sync'} 
              {syncStatus.inProgress ? ' (In Progress...)' : ' Results'}
            </h4>
          </div>

          {Object.entries(syncStatus.results).map(([key, result]) => (
            <div key={key} className="mb-2 pb-2 border-b border-gray-700 last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 capitalize">{key}</span>
                {result.success ? (
                  <span className="text-sm text-green-400">
                    {result.status === 'started' && '🚀 Started...'}
                    {result.status === 'fetching' && '📥 Fetching orders...'}
                    {result.status === 'processing' && `⏳ Processing... ${result.progress || 0}%`}
                    {result.status === 'completed' && `✅ ${result.count || 0} synced`}
                    {result.status === 'failed' && '❌ Failed'}
                    {!result.status && `✅ ${result.count || result.updated || 0} ${syncStatus.type === 'shopify' ? 'synced' : 'updated'}`}
                    {result.failed > 0 && ` (${result.failed} failed)`}
                  </span>
                ) : (
                  <span className="text-sm text-red-400">
                    ❌ {result.error}
                  </span>
                )}
              </div>
              {result.progress > 0 && result.status === 'processing' && (
                <div className="mt-1 h-1 bg-gray-700 rounded overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300" 
                    style={{ width: `${result.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-center text-white font-bold">
              Total: {syncStatus.total} {syncStatus.type === 'shopify' ? 'orders' : 'orders updated'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreSyncPanel;
