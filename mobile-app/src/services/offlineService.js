import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Storage keys
const KEYS = {
  PRODUCTS_CACHE: 'offline_products',
  CATEGORIES_CACHE: 'offline_categories',
  CART_CACHE: 'offline_cart',
  WISHLIST_CACHE: 'offline_wishlist',
  USER_PROFILE_CACHE: 'offline_user_profile',
  RECENTLY_VIEWED_CACHE: 'offline_recently_viewed',
  LAST_SYNC: 'offline_last_sync',
  PENDING_ACTIONS: 'offline_pending_actions',
};

// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

class OfflineService {
  constructor() {
    this.isOnline = true;
    this.listeners = [];
    this.syncInProgress = false;
  }

  /**
   * Initialize offline service and network monitoring
   */
  async initialize() {
    // Check initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable;

    // Subscribe to network changes
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      // Notify listeners
      this.listeners.forEach((listener) => listener(this.isOnline));

      // Sync pending actions when coming back online
      if (!wasOnline && this.isOnline) {
        this.syncPendingActions();
      }
    });

    return this.isOnline;
  }

  /**
   * Add network status listener
   */
  addNetworkListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Get network status
   */
  getNetworkStatus() {
    return this.isOnline;
  }

  // ==================== Product Caching ====================

  /**
   * Cache products for offline access
   */
  async cacheProducts(products, store = 'tnvcollection') {
    try {
      const cacheKey = `${KEYS.PRODUCTS_CACHE}_${store}`;
      const cacheData = {
        products,
        timestamp: Date.now(),
        store,
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('Failed to cache products:', error);
      return false;
    }
  }

  /**
   * Get cached products
   */
  async getCachedProducts(store = 'tnvcollection') {
    try {
      const cacheKey = `${KEYS.PRODUCTS_CACHE}_${store}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) return null;

      const cacheData = JSON.parse(cached);

      // Check if cache is expired
      if (Date.now() - cacheData.timestamp > CACHE_DURATION) {
        return { products: cacheData.products, isStale: true };
      }

      return { products: cacheData.products, isStale: false };
    } catch (error) {
      console.error('Failed to get cached products:', error);
      return null;
    }
  }

  /**
   * Cache a single product (for recently viewed)
   */
  async cacheProduct(product, store = 'tnvcollection') {
    try {
      const cacheKey = `${KEYS.PRODUCTS_CACHE}_single_${product.id || product.shopify_product_id}`;
      const cacheData = {
        product,
        timestamp: Date.now(),
        store,
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('Failed to cache product:', error);
      return false;
    }
  }

  /**
   * Get a cached product by ID
   */
  async getCachedProduct(productId) {
    try {
      const cacheKey = `${KEYS.PRODUCTS_CACHE}_single_${productId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) return null;
      return JSON.parse(cached).product;
    } catch (error) {
      return null;
    }
  }

  // ==================== Categories Caching ====================

  /**
   * Cache categories
   */
  async cacheCategories(categories, store = 'tnvcollection') {
    try {
      const cacheKey = `${KEYS.CATEGORIES_CACHE}_${store}`;
      const cacheData = {
        categories,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('Failed to cache categories:', error);
      return false;
    }
  }

  /**
   * Get cached categories
   */
  async getCachedCategories(store = 'tnvcollection') {
    try {
      const cacheKey = `${KEYS.CATEGORIES_CACHE}_${store}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) return null;

      return JSON.parse(cached).categories;
    } catch (error) {
      return null;
    }
  }

  // ==================== Cart Caching ====================

  /**
   * Cache cart data
   */
  async cacheCart(cartItems, store = 'tnvcollection') {
    try {
      const cacheKey = `${KEYS.CART_CACHE}_${store}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cartItems));
      return true;
    } catch (error) {
      console.error('Failed to cache cart:', error);
      return false;
    }
  }

  /**
   * Get cached cart
   */
  async getCachedCart(store = 'tnvcollection') {
    try {
      const cacheKey = `${KEYS.CART_CACHE}_${store}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      return [];
    }
  }

  // ==================== Wishlist Caching ====================

  /**
   * Cache wishlist
   */
  async cacheWishlist(wishlistItems, store = 'tnvcollection') {
    try {
      const cacheKey = `${KEYS.WISHLIST_CACHE}_${store}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(wishlistItems));
      return true;
    } catch (error) {
      console.error('Failed to cache wishlist:', error);
      return false;
    }
  }

  /**
   * Get cached wishlist
   */
  async getCachedWishlist(store = 'tnvcollection') {
    try {
      const cacheKey = `${KEYS.WISHLIST_CACHE}_${store}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      return [];
    }
  }

  // ==================== Recently Viewed ====================

  /**
   * Add to recently viewed (offline)
   */
  async addToRecentlyViewed(product, maxItems = 20) {
    try {
      const cached = await AsyncStorage.getItem(KEYS.RECENTLY_VIEWED_CACHE);
      let items = cached ? JSON.parse(cached) : [];

      // Remove if already exists
      items = items.filter((p) => p.id !== product.id);

      // Add to beginning
      items.unshift({
        ...product,
        viewedAt: Date.now(),
      });

      // Limit items
      items = items.slice(0, maxItems);

      await AsyncStorage.setItem(KEYS.RECENTLY_VIEWED_CACHE, JSON.stringify(items));
      return true;
    } catch (error) {
      console.error('Failed to add to recently viewed:', error);
      return false;
    }
  }

  /**
   * Get recently viewed products
   */
  async getRecentlyViewed() {
    try {
      const cached = await AsyncStorage.getItem(KEYS.RECENTLY_VIEWED_CACHE);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      return [];
    }
  }

  // ==================== Pending Actions (Offline Queue) ====================

  /**
   * Add an action to pending queue (for when offline)
   */
  async queueAction(action) {
    try {
      const cached = await AsyncStorage.getItem(KEYS.PENDING_ACTIONS);
      const actions = cached ? JSON.parse(cached) : [];

      actions.push({
        ...action,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        queuedAt: Date.now(),
      });

      await AsyncStorage.setItem(KEYS.PENDING_ACTIONS, JSON.stringify(actions));
      return true;
    } catch (error) {
      console.error('Failed to queue action:', error);
      return false;
    }
  }

  /**
   * Get all pending actions
   */
  async getPendingActions() {
    try {
      const cached = await AsyncStorage.getItem(KEYS.PENDING_ACTIONS);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Remove a pending action after successful sync
   */
  async removePendingAction(actionId) {
    try {
      const cached = await AsyncStorage.getItem(KEYS.PENDING_ACTIONS);
      if (!cached) return;

      const actions = JSON.parse(cached).filter((a) => a.id !== actionId);
      await AsyncStorage.setItem(KEYS.PENDING_ACTIONS, JSON.stringify(actions));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sync all pending actions when back online
   */
  async syncPendingActions() {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;

    try {
      const actions = await this.getPendingActions();

      for (const action of actions) {
        try {
          // Execute the action based on type
          switch (action.type) {
            case 'ADD_TO_CART':
              // Sync with server
              await this._syncCartAction(action);
              break;
            case 'ADD_TO_WISHLIST':
              await this._syncWishlistAction(action);
              break;
            case 'REMOVE_FROM_WISHLIST':
              await this._syncWishlistRemoveAction(action);
              break;
            // Add more action types as needed
          }

          // Remove successful action
          await this.removePendingAction(action.id);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          // Keep failed actions in queue for retry
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // Placeholder sync methods - implement based on your API
  async _syncCartAction(action) {
    // Implement cart sync with server
    console.log('Syncing cart action:', action);
  }

  async _syncWishlistAction(action) {
    // Implement wishlist sync with server
    console.log('Syncing wishlist action:', action);
  }

  async _syncWishlistRemoveAction(action) {
    // Implement wishlist remove sync
    console.log('Syncing wishlist remove action:', action);
  }

  // ==================== Cache Management ====================

  /**
   * Clear all offline cache
   */
  async clearAllCache() {
    try {
      const keys = Object.values(KEYS);
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter((k) => k.startsWith('offline_'));

      let totalSize = 0;
      for (const key of offlineKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return {
        itemCount: offlineKeys.length,
        approximateSizeKB: Math.round(totalSize / 1024),
        keys: offlineKeys,
      };
    } catch (error) {
      return { itemCount: 0, approximateSizeKB: 0, keys: [] };
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime() {
    try {
      const timestamp = await AsyncStorage.getItem(KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSyncTime() {
    try {
      await AsyncStorage.setItem(KEYS.LAST_SYNC, Date.now().toString());
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const offlineService = new OfflineService();

export default offlineService;
