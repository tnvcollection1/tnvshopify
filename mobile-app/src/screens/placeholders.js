// Placeholder screens

// CheckoutScreen.js
export { default as CheckoutScreen } from './CheckoutScreen';

// CategoryScreen.js  
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
const CategoryScreen = () => <View style={styles.c}><Text>Category Screen - TODO</Text></View>;
export default CategoryScreen;

// SearchScreen.js
const SearchScreen = () => <View style={styles.c}><Text>Search Screen - TODO</Text></View>;
export { SearchScreen };

// OrderConfirmationScreen.js
const OrderConfirmationScreen = () => <View style={styles.c}><Text>Order Confirmation - TODO</Text></View>;
export { OrderConfirmationScreen };

// OrderTrackingScreen.js
const OrderTrackingScreen = () => <View style={styles.c}><Text>Order Tracking - TODO</Text></View>;
export { OrderTrackingScreen };

const styles = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
