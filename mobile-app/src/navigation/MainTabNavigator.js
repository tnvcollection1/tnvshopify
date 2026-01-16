/**
 * Main Tab Navigator - Namshi Style
 * Bottom tab navigation with matching icons
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

// Custom Tab Bar Component - Namshi Style
const NamshiTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { cartCount } = useCart();

  const tabs = [
    { name: 'Home', icon: '🏠', label: 'Home' },
    { name: 'Browse', icon: '☰', label: 'Categories' },
    { name: 'NewArrivals', icon: '✨', label: '2026 Reset' },
    { name: 'Cart', icon: '🛍', label: 'Bag', badge: cartCount },
    { name: 'Account', icon: '👤', label: 'Account' },
  ];

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 10 }]}>
      {state.routes.map((route, index) => {
        const tab = tabs[index];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            tabSwitchHaptic();
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              {tab.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge > 9 ? '9+' : tab.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Placeholder for New Arrivals / 2026 Reset
const NewArrivalsScreen = () => {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>✨</Text>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>2026 Reset</Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>Coming Soon</Text>
    </View>
  );
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <NamshiTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Browse" component={BrowseScreen} />
      <Tab.Screen name="NewArrivals" component={NewArrivalsScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    padding: 4,
    borderRadius: 20,
  },
  iconContainerActive: {
    backgroundColor: '#c4ff00',
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#999',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#000',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#e11d48',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default MainTabNavigator;
