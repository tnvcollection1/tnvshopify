import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Fetch all available stores
  const fetchStores = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stores`);
      setStores(response.data || []);
      
      // Restore last selected store from localStorage
      const savedStore = localStorage.getItem('selectedStore');
      if (savedStore && response.data?.some(s => s.store_name === savedStore)) {
        setSelectedStore(savedStore);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Switch store and persist selection
  const switchStore = useCallback((storeName) => {
    setSelectedStore(storeName);
    localStorage.setItem('selectedStore', storeName);
    
    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent('storeChanged', { detail: { store: storeName } }));
  }, []);

  // Sync data for selected store from Shopify
  const syncStoreData = useCallback(async (storeName = null) => {
    const storeToSync = storeName || selectedStore;
    
    if (storeToSync === 'all') {
      alert('Please select a specific store to sync');
      return { success: false, message: 'Please select a specific store' };
    }

    setSyncing(true);
    try {
      // Sync orders
      const ordersResponse = await axios.post(`${API_URL}/api/sync-shopify`, {
        store_name: storeToSync
      });

      // Sync inventory
      const inventoryResponse = await axios.post(`${API_URL}/api/sync-inventory`, {
        store_name: storeToSync
      });

      const syncTime = new Date().toISOString();
      setLastSyncTime(syncTime);
      localStorage.setItem(`lastSync_${storeToSync}`, syncTime);

      // Dispatch sync complete event
      window.dispatchEvent(new CustomEvent('storeSyncComplete', { 
        detail: { 
          store: storeToSync, 
          orders: ordersResponse.data,
          inventory: inventoryResponse.data,
          syncTime 
        } 
      }));

      return { 
        success: true, 
        message: `Successfully synced ${storeToSync}`,
        orders: ordersResponse.data,
        inventory: inventoryResponse.data
      };
    } catch (error) {
      console.error('Error syncing store:', error);
      return { 
        success: false, 
        message: error.response?.data?.detail || 'Sync failed' 
      };
    } finally {
      setSyncing(false);
    }
  }, [selectedStore]);

  // Get store-specific query parameter
  const getStoreParam = useCallback(() => {
    if (selectedStore === 'all') return '';
    return `store_name=${selectedStore}`;
  }, [selectedStore]);

  // Get store display name
  const getStoreName = useCallback((storeId) => {
    const storeNames = {
      'tnvcollection': 'TNC Collection (IN)',
      'tnvcollectionpk': 'TNC Collection (PK)',
      'ashmiaa': 'Ashmiaa',
      'asmia': 'Asmia',
      'all': 'All Stores'
    };
    return storeNames[storeId] || storeId;
  }, []);

  // Get current store info
  const getCurrentStore = useCallback(() => {
    if (selectedStore === 'all') return null;
    return stores.find(s => s.store_name === selectedStore);
  }, [selectedStore, stores]);

  const value = {
    stores,
    selectedStore,
    loading,
    syncing,
    lastSyncTime,
    switchStore,
    syncStoreData,
    getStoreParam,
    getStoreName,
    getCurrentStore,
    fetchStores
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export default StoreContext;
