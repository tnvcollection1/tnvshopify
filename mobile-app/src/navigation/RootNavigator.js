/**
 * Root Navigator
 * Handles auth state, onboarding, and main navigation structure
 */

import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

// Navigators
import MainTabNavigator from './MainTabNavigator';
import AuthNavigator from './AuthNavigator';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import SearchScreen from '../screens/SearchScreen';
import CategoryScreen from '../screens/CategoryScreen';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(null);

  // Check if onboarding was completed
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('onboarding_completed');
      setShowOnboarding(!completed);
    } catch (e) {
      console.log('Error checking onboarding status:', e);
      setShowOnboarding(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (isLoading || showOnboarding === null) {
    return null; // Or a splash screen
  }

  // Show onboarding for first-time users
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main App */}
      <Stack.Screen name="Main" component={MainTabNavigator} />
      
      {/* Auth Flow */}
      <Stack.Screen 
        name="Auth" 
        component={AuthNavigator}
        options={{ presentation: 'modal' }}
      />
      
      {/* Product Detail */}
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen}
        options={{ 
          headerShown: true,
          headerTitle: '',
          headerBackTitle: 'Back',
        }}
      />
      
      {/* Search */}
      <Stack.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ presentation: 'modal' }}
      />
      
      {/* Category */}
      <Stack.Screen 
        name="Category" 
        component={CategoryScreen}
        options={{ 
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      
      {/* Checkout Flow */}
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{ 
          headerShown: true,
          headerTitle: 'Checkout',
        }}
      />
      
      <Stack.Screen 
        name="OrderConfirmation" 
        component={OrderConfirmationScreen}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen 
        name="OrderTracking" 
        component={OrderTrackingScreen}
        options={{ 
          headerShown: true,
          headerTitle: 'Track Order',
        }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
