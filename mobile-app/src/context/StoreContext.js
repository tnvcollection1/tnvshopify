/**
 * Store Context
 * Manages store configuration, region, and wishlist
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';

const StoreContext = createContext();

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

// Available regions
const REGIONS = [
  { code: 'AE', name: 'UAE', currency: 'AED', symbol: 'AED', rate: 3.67, flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', symbol: 'SAR', rate: 3.75, flag: '🇸🇦' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', symbol: 'KWD', rate: 0.31, flag: '🇰🇼' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: 'Rs', rate: 278.50, flag: '🇵🇰' },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', rate: 83.12, flag: '🇮🇳' },
];

export const StoreProvider = ({ children }) => {
  const [region, setRegion] = useState(REGIONS[0]);
  const [wishlist, setWishlist] = useState([]);
  const [navConfig, setNavConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoreData();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('region', JSON.stringify(region));
  }, [region]);

  useEffect(() => {
    AsyncStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const loadStoreData = async () => {
    try {
      // Load region
      const savedRegion = await AsyncStorage.getItem('region');
      if (savedRegion) {
        setRegion(JSON.parse(savedRegion));
      }

      // Load wishlist
      const savedWishlist = await AsyncStorage.getItem('wishlist');
      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }

      // Load nav config from API
      try {
        const config = await api.getNavConfig();
        setNavConfig(config);
      } catch (e) {
        console.log('Could not load nav config');
      }
    } catch (e) {
      console.log('Error loading store data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const changeRegion = (newRegion) => {
    setRegion(newRegion);
  };

  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.find(
        (p) => p.shopify_product_id === product.shopify_product_id
      );
      if (exists) {
        return prev.filter(
          (p) => p.shopify_product_id !== product.shopify_product_id
        );
      }
      return [...prev, product];
    });
  };

  const isInWishlist = (productId) => {
    return wishlist.some((p) => p.shopify_product_id === productId);
  };

  const formatPrice = (price) => {
    const baseRate = 83.12; // Base rate in INR
    const converted = (parseFloat(price) / baseRate) * region.rate;
    if (region.rate < 1) {
      return `${region.symbol} ${converted.toFixed(3)}`;
    }
    return `${region.symbol} ${Math.round(converted).toLocaleString()}`;
  };

  return (
    <StoreContext.Provider
      value={{
        region,
        regions: REGIONS,
        changeRegion,
        wishlist,
        toggleWishlist,
        isInWishlist,
        formatPrice,
        navConfig,
        isLoading,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
