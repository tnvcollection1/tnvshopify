import { useState, useEffect, useCallback } from 'react';
import { offlineService } from '../services/offlineService';
import { pushNotificationService } from '../services/pushNotifications';

/**
 * Hook for network status monitoring
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const online = await offlineService.initialize();
      setIsOnline(online);
      setIsInitialized(true);
    };

    initialize();

    // Subscribe to network changes
    const unsubscribe = offlineService.addNetworkListener((online) => {
      setIsOnline(online);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, isInitialized };
};

/**
 * Hook for offline-first data fetching
 */
export const useOfflineData = (
  fetchFunction,
  cacheKey,
  storeName = 'tnvcollection',
  options = {}
) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const { isOnline } = useNetworkStatus();

  const { autoRefresh = true, cacheFirst = true } = options;

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Try cache first if offline or cacheFirst option
      if (!isOnline || (cacheFirst && !forceRefresh)) {
        const cached = await offlineService.getCachedProducts(storeName);
        if (cached) {
          setData(cached.products);
          setIsStale(cached.isStale);
          
          // If online and cache is stale, refresh in background
          if (isOnline && cached.isStale && autoRefresh) {
            fetchFromNetwork();
          }
          
          setLoading(false);
          return;
        }
      }

      // Fetch from network if online
      if (isOnline) {
        await fetchFromNetwork();
      } else {
        setError('No cached data available. Please connect to the internet.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [isOnline, storeName, fetchFunction, cacheFirst, autoRefresh]);

  const fetchFromNetwork = async () => {
    try {
      const result = await fetchFunction();
      setData(result);
      setIsStale(false);
      
      // Cache the result
      await offlineService.cacheProducts(result, storeName);
      await offlineService.updateLastSyncTime();
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return { data, loading, error, isStale, refresh, isOnline };
};

/**
 * Hook for push notification initialization
 */
export const usePushNotifications = (customerId, storeName = 'tnvcollection') => {
  const [pushToken, setPushToken] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('unknown');
  const [lastNotification, setLastNotification] = useState(null);

  useEffect(() => {
    const initializePush = async () => {
      const token = await pushNotificationService.initialize(
        // On notification received
        (notification) => {
          setLastNotification(notification);
        },
        // On notification response (user tap)
        (data) => {
          // Handle notification tap - navigate based on type
          handleNotificationAction(data);
        }
      );

      if (token) {
        setPushToken(token);
        setNotificationPermission('granted');

        // Register with backend
        if (customerId) {
          await pushNotificationService.registerTokenWithBackend(customerId, storeName);
        }
      } else {
        setNotificationPermission('denied');
      }
    };

    initializePush();

    // Check for notification that opened the app
    const checkInitialNotification = async () => {
      const response = await pushNotificationService.getLastNotificationResponse();
      if (response) {
        handleNotificationAction(response.notification.request.content.data);
      }
    };

    checkInitialNotification();

    return () => {
      pushNotificationService.cleanup();
    };
  }, [customerId, storeName]);

  const handleNotificationAction = (data) => {
    // This function should be implemented to handle navigation
    // based on notification type
    console.log('Notification action:', data);
    
    // You would typically call navigation here
    // For example:
    // if (data.type === 'order_shipped') {
    //   navigation.navigate('OrderTracking', { orderId: data.order_id });
    // }
  };

  const getSettings = useCallback(async () => {
    return await pushNotificationService.getSettings();
  }, []);

  const updateSettings = useCallback(async (settings) => {
    return await pushNotificationService.updateSettings(settings);
  }, []);

  return {
    pushToken,
    notificationPermission,
    lastNotification,
    getSettings,
    updateSettings,
  };
};

/**
 * Hook for offline cart management
 */
export const useOfflineCart = (storeName = 'tnvcollection') => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOnline } = useNetworkStatus();

  // Load cart from cache on mount
  useEffect(() => {
    const loadCart = async () => {
      const cachedCart = await offlineService.getCachedCart(storeName);
      setCart(cachedCart);
      setLoading(false);
    };
    loadCart();
  }, [storeName]);

  // Add to cart (works offline)
  const addToCart = useCallback(async (product, quantity = 1, variant = null) => {
    const newItem = {
      product,
      quantity,
      variant,
      addedAt: Date.now(),
    };

    const existingIndex = cart.findIndex(
      (item) => 
        item.product.id === product.id && 
        item.variant?.id === variant?.id
    );

    let updatedCart;
    if (existingIndex >= 0) {
      updatedCart = [...cart];
      updatedCart[existingIndex].quantity += quantity;
    } else {
      updatedCart = [...cart, newItem];
    }

    setCart(updatedCart);
    await offlineService.cacheCart(updatedCart, storeName);

    // Queue sync action if offline
    if (!isOnline) {
      await offlineService.queueAction({
        type: 'ADD_TO_CART',
        productId: product.id,
        quantity,
        variantId: variant?.id,
        store: storeName,
      });
    }

    return true;
  }, [cart, isOnline, storeName]);

  // Remove from cart
  const removeFromCart = useCallback(async (productId, variantId = null) => {
    const updatedCart = cart.filter(
      (item) => 
        !(item.product.id === productId && 
          item.variant?.id === variantId)
    );

    setCart(updatedCart);
    await offlineService.cacheCart(updatedCart, storeName);

    return true;
  }, [cart, storeName]);

  // Update quantity
  const updateQuantity = useCallback(async (productId, variantId, quantity) => {
    if (quantity <= 0) {
      return removeFromCart(productId, variantId);
    }

    const updatedCart = cart.map((item) => {
      if (item.product.id === productId && item.variant?.id === variantId) {
        return { ...item, quantity };
      }
      return item;
    });

    setCart(updatedCart);
    await offlineService.cacheCart(updatedCart, storeName);

    return true;
  }, [cart, removeFromCart, storeName]);

  // Clear cart
  const clearCart = useCallback(async () => {
    setCart([]);
    await offlineService.cacheCart([], storeName);
  }, [storeName]);

  // Get cart total
  const getTotal = useCallback(() => {
    return cart.reduce((total, item) => {
      const price = item.variant?.price || item.product.price || 0;
      return total + (price * item.quantity);
    }, 0);
  }, [cart]);

  // Get item count
  const getItemCount = useCallback(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  return {
    cart,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
    isOnline,
  };
};

/**
 * Hook for offline wishlist management
 */
export const useOfflineWishlist = (storeName = 'tnvcollection') => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOnline } = useNetworkStatus();

  // Load wishlist from cache
  useEffect(() => {
    const loadWishlist = async () => {
      const cachedWishlist = await offlineService.getCachedWishlist(storeName);
      setWishlist(cachedWishlist);
      setLoading(false);
    };
    loadWishlist();
  }, [storeName]);

  // Check if product is in wishlist
  const isInWishlist = useCallback((productId) => {
    return wishlist.some((item) => item.id === productId);
  }, [wishlist]);

  // Toggle wishlist
  const toggleWishlist = useCallback(async (product) => {
    const isIn = isInWishlist(product.id);
    let updatedWishlist;

    if (isIn) {
      updatedWishlist = wishlist.filter((item) => item.id !== product.id);
      
      if (!isOnline) {
        await offlineService.queueAction({
          type: 'REMOVE_FROM_WISHLIST',
          productId: product.id,
          store: storeName,
        });
      }
    } else {
      updatedWishlist = [...wishlist, { ...product, addedAt: Date.now() }];
      
      if (!isOnline) {
        await offlineService.queueAction({
          type: 'ADD_TO_WISHLIST',
          productId: product.id,
          store: storeName,
        });
      }
    }

    setWishlist(updatedWishlist);
    await offlineService.cacheWishlist(updatedWishlist, storeName);

    return !isIn; // Returns true if added, false if removed
  }, [wishlist, isInWishlist, isOnline, storeName]);

  return {
    wishlist,
    loading,
    isInWishlist,
    toggleWishlist,
    isOnline,
  };
};

export default {
  useNetworkStatus,
  useOfflineData,
  usePushNotifications,
  useOfflineCart,
  useOfflineWishlist,
};
