/**
 * API Service Layer
 * Connects to TNV Collection Backend
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend API URL - Update this for production
const API_URL = 'https://wamerce.com/api';
// For development, use: 'https://ecom-platform-155.preview.emergentagent.com/api'

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log('Error getting auth token:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - clear storage
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
    }
    return Promise.reject(error);
  }
);

// ==================== PRODUCTS ====================

export const getProducts = async (params = {}) => {
  const response = await api.get('/storefront/products', {
    params: { store: 'tnvcollection', limit: 48, ...params },
  });
  return response.data;
};

export const getProduct = async (productId) => {
  const response = await api.get(`/storefront/products/${productId}`, {
    params: { store: 'tnvcollection' },
  });
  return response.data;
};

export const searchProducts = async (query, params = {}) => {
  const response = await api.get('/storefront/products/search', {
    params: { store: 'tnvcollection', q: query, ...params },
  });
  return response.data;
};

// ==================== COLLECTIONS ====================

export const getCollections = async () => {
  const response = await api.get('/storefront/collections', {
    params: { store: 'tnvcollection' },
  });
  return response.data;
};

export const getCollection = async (handle) => {
  const response = await api.get(`/storefront/collections/${handle}`, {
    params: { store: 'tnvcollection' },
  });
  return response.data;
};

// ==================== NAVIGATION CONFIG ====================

export const getNavConfig = async () => {
  const response = await api.get('/storefront/config/navigation/tnvcollection');
  return response.data;
};

export const getBanners = async () => {
  const response = await api.get('/storefront/banners', {
    params: { store: 'tnvcollection' },
  });
  return response.data;
};

// ==================== ORDERS ====================

export const createOrder = async (orderData) => {
  const response = await api.post('/storefront/orders/cod', {
    ...orderData,
    store: 'tnvcollection',
  });
  return response.data;
};

export const getOrder = async (orderId) => {
  const response = await api.get(`/storefront/orders/${orderId}`);
  return response.data;
};

export const getMyOrders = async () => {
  const response = await api.get('/storefront/orders/my-orders');
  return response.data;
};

export const trackOrder = async (orderId) => {
  const response = await api.get(`/storefront/orders/${orderId}/track`);
  return response.data;
};

// ==================== AUTHENTICATION ====================

export const login = async (email, password) => {
  const response = await api.post('/auth/customer/login', { email, password });
  if (response.data.token) {
    await AsyncStorage.setItem('auth_token', response.data.token);
    await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/customer/register', userData);
  if (response.data.token) {
    await AsyncStorage.setItem('auth_token', response.data.token);
    await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const logout = async () => {
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('user_data');
};

export const getProfile = async () => {
  const response = await api.get('/auth/customer/profile');
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await api.put('/auth/customer/profile', profileData);
  return response.data;
};

// ==================== WISHLIST ====================

export const getWishlist = async () => {
  const response = await api.get('/storefront/wishlist');
  return response.data;
};

export const addToWishlist = async (productId) => {
  const response = await api.post('/storefront/wishlist', { productId });
  return response.data;
};

export const removeFromWishlist = async (productId) => {
  const response = await api.delete(`/storefront/wishlist/${productId}`);
  return response.data;
};

// ==================== ADDRESSES ====================

export const getAddresses = async () => {
  const response = await api.get('/auth/customer/addresses');
  return response.data;
};

export const addAddress = async (addressData) => {
  const response = await api.post('/auth/customer/addresses', addressData);
  return response.data;
};

export const updateAddress = async (addressId, addressData) => {
  const response = await api.put(`/auth/customer/addresses/${addressId}`, addressData);
  return response.data;
};

export const deleteAddress = async (addressId) => {
  const response = await api.delete(`/auth/customer/addresses/${addressId}`);
  return response.data;
};

export default api;
