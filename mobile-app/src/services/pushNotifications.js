import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Storage keys
const PUSH_TOKEN_KEY = 'push_token';
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

// Default notification settings
const DEFAULT_SETTINGS = {
  orderUpdates: true,
  promotions: true,
  backInStock: true,
  priceDrops: true,
  newArrivals: false,
};

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.onNotificationReceived = null;
    this.onNotificationResponse = null;
  }

  /**
   * Initialize push notifications
   * @param {function} onReceived - Callback when notification is received
   * @param {function} onResponse - Callback when user taps notification
   */
  async initialize(onReceived = null, onResponse = null) {
    this.onNotificationReceived = onReceived;
    this.onNotificationResponse = onResponse;

    // Register for push notifications
    const token = await this.registerForPushNotifications();
    
    if (token) {
      // Listen for incoming notifications
      this.notificationListener = Notifications.addNotificationReceivedListener(
        this._handleNotificationReceived.bind(this)
      );

      // Listen for notification responses (user taps)
      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        this._handleNotificationResponse.bind(this)
      );
    }

    return token;
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Register device for push notifications
   */
  async registerForPushNotifications() {
    let token;

    // Check if running on physical device
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      if (!projectId) {
        console.log('Project ID not found');
        // For development, use a mock token
        token = `ExponentPushToken[DEV_${Date.now()}]`;
      } else {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        token = tokenData.data;
      }
      
      this.expoPushToken = token;
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      
      console.log('Push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
      
      await Notifications.setNotificationChannelAsync('promotions', {
        name: 'Promotions & Offers',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return token;
  }

  /**
   * Register push token with backend
   */
  async registerTokenWithBackend(customerId, storeName = 'tnvcollection') {
    if (!this.expoPushToken) {
      console.log('No push token to register');
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/push-notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId,
          push_token: this.expoPushToken,
          platform: Platform.OS,
          device_name: Device.modelName || 'Unknown',
          store: storeName,
        }),
      });

      if (response.ok) {
        console.log('Push token registered with backend');
        return true;
      }
    } catch (error) {
      console.error('Failed to register token with backend:', error);
    }

    return false;
  }

  /**
   * Get notification settings
   */
  async getSettings() {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update notification settings
   */
  async updateSettings(settings) {
    try {
      const newSettings = { ...DEFAULT_SETTINGS, ...settings };
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      return newSettings;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return null;
    }
  }

  /**
   * Handle incoming notification
   */
  _handleNotificationReceived(notification) {
    console.log('Notification received:', notification);
    
    if (this.onNotificationReceived) {
      this.onNotificationReceived(notification);
    }
  }

  /**
   * Handle notification response (user tap)
   */
  _handleNotificationResponse(response) {
    console.log('Notification response:', response);
    
    const data = response.notification.request.content.data;
    
    if (this.onNotificationResponse) {
      this.onNotificationResponse(data);
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(title, body, data = {}, seconds = 1) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: { seconds },
    });
    
    return id;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Get last notification response (for app opened via notification)
   */
  async getLastNotificationResponse() {
    return await Notifications.getLastNotificationResponseAsync();
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Export notification types for navigation
export const NotificationTypes = {
  ORDER_UPDATE: 'order_update',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  PROMOTION: 'promotion',
  BACK_IN_STOCK: 'back_in_stock',
  PRICE_DROP: 'price_drop',
  NEW_ARRIVAL: 'new_arrival',
  CART_REMINDER: 'cart_reminder',
};

export default pushNotificationService;
