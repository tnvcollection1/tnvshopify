/**
 * Account Screen
 * User profile and settings
 * Supports dark mode
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { spacing, borderRadius, typography } from '../theme';

const AccountScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuth();
  const { region, changeRegion, regions } = useStore();
  const { colors, statusBarStyle } = useTheme();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems = [
    { icon: '📦', title: 'My Orders', screen: 'Orders' },
    { icon: '❤️', title: 'Wishlist', screen: 'Wishlist' },
    { icon: '📍', title: 'Addresses', screen: 'Addresses' },
    { icon: '💳', title: 'Payment Methods', screen: 'PaymentMethods' },
    { icon: '⚙️', title: 'Settings', screen: 'Settings' },
    { icon: '🔔', title: 'Notifications', screen: 'NotificationSettings' },
    { icon: '❓', title: 'Help & Support', screen: 'Support' },
    { icon: '📜', title: 'Terms & Conditions', screen: 'Terms' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={statusBarStyle} />
      <Header title="Account" />

      <ScrollView style={styles.content}>
        {/* User Info */}
        {isAuthenticated ? (
          <View style={[styles.userCard, { backgroundColor: colors.card }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                {user?.name?.[0]?.toUpperCase() || '👤'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'User'}</Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Text>✏️</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.guestCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.guestTitle, { color: colors.text }]}>Welcome to TNV Collection</Text>
            <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
              Sign in to access your orders, wishlist, and more
            </Text>
            <TouchableOpacity
              style={[styles.signInBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={[styles.signInBtnText, { color: colors.textInverse }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Region Selector */}
        <View style={[styles.regionSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Region & Currency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.regionOptions}>
              {regions.map((r) => (
                <TouchableOpacity
                  key={r.code}
                  style={[
                    styles.regionOption,
                    { backgroundColor: colors.background },
                    region.code === r.code && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => changeRegion(r)}
                >
                  <Text style={styles.regionFlag}>{r.flag}</Text>
                  <Text style={[
                    styles.regionCode, 
                    { color: colors.text },
                    region.code === r.code && { color: colors.textInverse }
                  ]}>{r.code}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Menu Items */}
        <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.menuArrow, { color: colors.textTertiary }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        {isAuthenticated && (
          <TouchableOpacity 
            style={[styles.logoutBtn, { backgroundColor: colors.card }]} 
            onPress={handleLogout}
          >
            <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
          </TouchableOpacity>
        )}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: colors.textTertiary }]}>TNV Collection v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: typography.bold,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
  },
  userEmail: {
    fontSize: typography.bodySmall,
    marginTop: spacing.xs,
  },
  editBtn: {
    padding: spacing.sm,
  },
  guestCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  guestTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
  },
  guestSubtitle: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  signInBtn: {
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  signInBtnText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
  regionSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  sectionTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    marginBottom: spacing.md,
  },
  regionOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  regionOption: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  regionFlag: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  regionCode: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
  },
  menuSection: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  menuTitle: {
    flex: 1,
    fontSize: typography.body,
  },
  menuArrow: {
    fontSize: 20,
  },
  logoutBtn: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  appInfo: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  appVersion: {
    fontSize: typography.caption,
  },
});

export default AccountScreen;
