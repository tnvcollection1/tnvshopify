/**
 * Main Tab Navigator
 * Bottom tab navigation for main app screens
 * With haptic feedback on tab switches
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import HomeScreen from '../screens/HomeScreen';
import BrowseScreen from '../screens/BrowseScreen';
import CartScreen from '../screens/CartScreen';
import WishlistScreen from '../screens/WishlistScreen';
import AccountScreen from '../screens/AccountScreen';

// Context
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

// Haptics
import { tabSwitchHaptic } from '../services/haptics';

const Tab = createBottomTabNavigator();

// Animated Tab Icon with haptic feedback
const TabIcon = ({ name, focused, badge, colors }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  
  React.useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [focused]);

  const icons = {
    Home: '🏠',
    Browse: '🔍',
    Cart: '🛒',
    Wishlist: '❤️',
    Account: '👤',
  };

  return (
    <View style={styles.iconContainer}>
      <Animated.Text 
        style={[
          styles.icon, 
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {icons[name]}
      </Animated.Text>
      {badge > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
};

// Custom Tab Bar Button with haptic feedback
const HapticTabButton = ({ children, onPress, accessibilityState }) => {
  const handlePress = () => {
    // Only trigger haptic if not already selected
    if (!accessibilityState.selected) {
      tabSwitchHaptic();
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { cartCount } = useCart();
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarButton: (props) => <HapticTabButton {...props} />,
        tabBarIcon: ({ focused }) => (
          <TabIcon 
            name={route.name} 
            focused={focused} 
            badge={route.name === 'Cart' ? cartCount : 0}
            colors={colors}
          />
        ),
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          // Add subtle shadow for depth
          shadowColor: isDark ? '#000' : '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Browse" 
        component={BrowseScreen}
        options={{ tabBarLabel: 'Browse' }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ tabBarLabel: 'Bag' }}
      />
      <Tab.Screen 
        name="Wishlist" 
        component={WishlistScreen}
        options={{ tabBarLabel: 'Wishlist' }}
      />
      <Tab.Screen 
        name="Account" 
        component={AccountScreen}
        options={{ tabBarLabel: 'Account' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MainTabNavigator;
