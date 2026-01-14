/**
 * Settings Screen
 * App settings including theme toggle, notifications, and account options
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../context/StoreContext';
import { spacing, borderRadius, typography } from '../theme';

const SettingRow = ({ icon, title, subtitle, onPress, rightElement, colors }) => (
  <TouchableOpacity
    style={[styles.settingRow, { backgroundColor: colors.card }]}
    onPress={onPress}
    disabled={!onPress}
  >
    <Text style={styles.settingIcon}>{icon}</Text>
    <View style={styles.settingInfo}>
      <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
    {rightElement || (onPress && (
      <Text style={[styles.settingArrow, { color: colors.textTertiary }]}>›</Text>
    ))}
  </TouchableOpacity>
);

const SectionHeader = ({ title, colors }) => (
  <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
    {title}
  </Text>
);

const ThemeOption = ({ label, icon, value, isSelected, onPress, colors }) => (
  <TouchableOpacity
    style={[
      styles.themeOption,
      { backgroundColor: colors.card },
      isSelected && { borderColor: colors.accent, borderWidth: 2 },
    ]}
    onPress={onPress}
  >
    <Text style={styles.themeIcon}>{icon}</Text>
    <Text style={[styles.themeLabel, { color: colors.text }]}>{label}</Text>
    {isSelected && (
      <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
        <Text style={styles.checkMark}>✓</Text>
      </View>
    )}
  </TouchableOpacity>
);

const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark, themeMode, setTheme, statusBarStyle } = useTheme();
  const { region } = useStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={statusBarStyle} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <SectionHeader title="APPEARANCE" colors={colors} />
        
        <View style={[styles.themeSelector, { backgroundColor: colors.card }]}>
          <Text style={[styles.themeSelectorTitle, { color: colors.text }]}>
            Theme Mode
          </Text>
          <Text style={[styles.themeSelectorSubtitle, { color: colors.textSecondary }]}>
            Choose how the app looks
          </Text>
          
          <View style={styles.themeOptions}>
            <ThemeOption
              label="Light"
              icon="☀️"
              value="light"
              isSelected={themeMode === 'light'}
              onPress={() => setTheme('light')}
              colors={colors}
            />
            <ThemeOption
              label="Dark"
              icon="🌙"
              value="dark"
              isSelected={themeMode === 'dark'}
              onPress={() => setTheme('dark')}
              colors={colors}
            />
            <ThemeOption
              label="System"
              icon="📱"
              value="system"
              isSelected={themeMode === 'system'}
              onPress={() => setTheme('system')}
              colors={colors}
            />
          </View>

          {/* Current theme indicator */}
          <View style={[styles.currentTheme, { backgroundColor: colors.background }]}>
            <Text style={[styles.currentThemeText, { color: colors.textSecondary }]}>
              Currently using: <Text style={{ color: colors.text, fontWeight: '600' }}>
                {isDark ? 'Dark' : 'Light'} Mode
              </Text>
            </Text>
          </View>
        </View>

        {/* Account Section */}
        <SectionHeader title="ACCOUNT" colors={colors} />
        
        <View style={styles.settingsGroup}>
          <SettingRow
            icon="👤"
            title="Profile"
            subtitle="View and edit your profile"
            onPress={() => navigation.navigate('Profile')}
            colors={colors}
          />
          <SettingRow
            icon="📍"
            title="Addresses"
            subtitle="Manage delivery addresses"
            onPress={() => navigation.navigate('Addresses')}
            colors={colors}
          />
          <SettingRow
            icon="💳"
            title="Payment Methods"
            subtitle="Manage payment options"
            onPress={() => navigation.navigate('PaymentMethods')}
            colors={colors}
          />
        </View>

        {/* Preferences Section */}
        <SectionHeader title="PREFERENCES" colors={colors} />
        
        <View style={styles.settingsGroup}>
          <SettingRow
            icon="🌍"
            title="Region"
            subtitle={`${region.flag} ${region.name}`}
            onPress={() => navigation.navigate('RegionSelector')}
            colors={colors}
          />
          <SettingRow
            icon="🔔"
            title="Notifications"
            subtitle="Manage push notifications"
            onPress={() => navigation.navigate('NotificationSettings')}
            colors={colors}
          />
          <SettingRow
            icon="📶"
            title="Offline Mode"
            subtitle="Manage cached data"
            onPress={() => navigation.navigate('OfflineSettings')}
            colors={colors}
          />
        </View>

        {/* Support Section */}
        <SectionHeader title="SUPPORT" colors={colors} />
        
        <View style={styles.settingsGroup}>
          <SettingRow
            icon="❓"
            title="Help & FAQ"
            onPress={() => navigation.navigate('Help')}
            colors={colors}
          />
          <SettingRow
            icon="💬"
            title="Contact Us"
            onPress={() => navigation.navigate('Contact')}
            colors={colors}
          />
          <SettingRow
            icon="📄"
            title="Terms & Privacy"
            onPress={() => navigation.navigate('Terms')}
            colors={colors}
          />
        </View>

        {/* App Info */}
        <SectionHeader title="ABOUT" colors={colors} />
        
        <View style={styles.settingsGroup}>
          <SettingRow
            icon="ℹ️"
            title="App Version"
            subtitle="1.0.0"
            colors={colors}
          />
          <SettingRow
            icon="⭐"
            title="Rate Us"
            subtitle="Love the app? Leave a review!"
            onPress={() => {}}
            colors={colors}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity 
          style={[styles.logoutBtn, { backgroundColor: colors.card }]}
          onPress={() => {}}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    letterSpacing: 0.5,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  settingsGroup: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  settingIcon: {
    fontSize: 22,
    width: 36,
  },
  settingInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  settingTitle: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  settingSubtitle: {
    fontSize: typography.caption,
    marginTop: 2,
  },
  settingArrow: {
    fontSize: 24,
    fontWeight: typography.light,
  },
  themeSelector: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  themeSelectorTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  themeSelectorSubtitle: {
    fontSize: typography.caption,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  themeLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  checkCircle: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: typography.bold,
  },
  currentTheme: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  currentThemeText: {
    fontSize: typography.caption,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  logoutText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
});

export default SettingsScreen;
