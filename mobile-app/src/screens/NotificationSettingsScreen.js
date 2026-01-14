import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotificationService } from '../services/pushNotifications';
import { offlineService } from '../services/offlineService';

const NotificationSettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    orderUpdates: true,
    promotions: true,
    backInStock: true,
    priceDrops: true,
    newArrivals: false,
  });
  const [pushEnabled, setPushEnabled] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load notification settings
      const savedSettings = await pushNotificationService.getSettings();
      setSettings(savedSettings);

      // Check push permission
      const token = await AsyncStorage.getItem('push_token');
      setPushEnabled(!!token);

      // Load cache stats
      const stats = await offlineService.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    await pushNotificationService.updateSettings(newSettings);
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Offline Data',
      'This will remove all cached products and data. Your cart and wishlist will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await offlineService.clearAllCache();
            const stats = await offlineService.getCacheStats();
            setCacheStats(stats);
            Alert.alert('Success', 'Offline cache cleared');
          },
        },
      ]
    );
  };

  const handleEnablePush = async () => {
    const token = await pushNotificationService.registerForPushNotifications();
    if (token) {
      setPushEnabled(true);
      Alert.alert('Success', 'Push notifications enabled');
    } else {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive updates.'
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* Push Notification Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive updates about orders, offers, and more
              </Text>
            </View>
            {pushEnabled ? (
              <Switch
                value={true}
                onValueChange={() => {}}
                disabled
                trackColor={{ true: '#000' }}
              />
            ) : (
              <TouchableOpacity
                style={styles.enableButton}
                onPress={handleEnablePush}
              >
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notification Types */}
        {pushEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Order Updates</Text>
                <Text style={styles.settingDescription}>
                  Shipping, delivery, and order status
                </Text>
              </View>
              <Switch
                value={settings.orderUpdates}
                onValueChange={() => handleToggle('orderUpdates')}
                trackColor={{ true: '#000' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Promotions & Offers</Text>
                <Text style={styles.settingDescription}>
                  Sales, discounts, and special offers
                </Text>
              </View>
              <Switch
                value={settings.promotions}
                onValueChange={() => handleToggle('promotions')}
                trackColor={{ true: '#000' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Back in Stock</Text>
                <Text style={styles.settingDescription}>
                  Alerts when wishlist items are available
                </Text>
              </View>
              <Switch
                value={settings.backInStock}
                onValueChange={() => handleToggle('backInStock')}
                trackColor={{ true: '#000' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Price Drops</Text>
                <Text style={styles.settingDescription}>
                  Alerts when wishlist items go on sale
                </Text>
              </View>
              <Switch
                value={settings.priceDrops}
                onValueChange={() => handleToggle('priceDrops')}
                trackColor={{ true: '#000' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>New Arrivals</Text>
                <Text style={styles.settingDescription}>
                  Be first to know about new products
                </Text>
              </View>
              <Switch
                value={settings.newArrivals}
                onValueChange={() => handleToggle('newArrivals')}
                trackColor={{ true: '#000' }}
              />
            </View>
          </View>
        )}

        {/* Offline Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offline Mode</Text>
          
          <View style={styles.cacheInfo}>
            <Text style={styles.cacheLabel}>Cached Data</Text>
            <Text style={styles.cacheValue}>
              {cacheStats?.itemCount || 0} items ({cacheStats?.approximateSizeKB || 0} KB)
            </Text>
          </View>

          <Text style={styles.offlineDescription}>
            When offline, you can still browse cached products, view your cart,
            and add items to your wishlist. Changes will sync when you're back online.
          </Text>

          <TouchableOpacity
            style={styles.clearCacheButton}
            onPress={handleClearCache}
          >
            <Text style={styles.clearCacheText}>Clear Offline Data</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Store</Text>
            <Text style={styles.infoValue}>TNV Collection</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
  },
  enableButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cacheInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cacheLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  cacheValue: {
    fontSize: 14,
    color: '#666',
  },
  offlineDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    paddingVertical: 12,
  },
  clearCacheButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearCacheText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e63946',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
});

export default NotificationSettingsScreen;
