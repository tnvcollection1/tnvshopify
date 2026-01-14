/**
 * Haptic Feedback Service
 * Provides tactile feedback for user interactions
 * Creates a premium, responsive feel throughout the app
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Check if haptics is available
const isHapticsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Light haptic feedback - for subtle interactions
 * Use for: toggles, small buttons, selections
 */
export const lightHaptic = () => {
  if (isHapticsAvailable) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

/**
 * Medium haptic feedback - for standard interactions
 * Use for: button presses, card taps, navigation
 */
export const mediumHaptic = () => {
  if (isHapticsAvailable) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

/**
 * Heavy haptic feedback - for significant actions
 * Use for: add to cart, checkout, important confirmations
 */
export const heavyHaptic = () => {
  if (isHapticsAvailable) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
};

/**
 * Success haptic feedback - double tap pattern
 * Use for: successful actions, confirmations
 */
export const successHaptic = () => {
  if (isHapticsAvailable) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

/**
 * Warning haptic feedback
 * Use for: warnings, attention needed
 */
export const warningHaptic = () => {
  if (isHapticsAvailable) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

/**
 * Error haptic feedback
 * Use for: errors, failed actions
 */
export const errorHaptic = () => {
  if (isHapticsAvailable) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

/**
 * Selection haptic feedback - very light
 * Use for: scrolling through pickers, selection changes
 */
export const selectionHaptic = () => {
  if (isHapticsAvailable) {
    Haptics.selectionAsync();
  }
};

/**
 * Theme toggle haptic - special pattern for dark mode
 * Creates a satisfying "click" feel
 */
export const themeToggleHaptic = () => {
  if (isHapticsAvailable) {
    // Medium impact for a satisfying toggle feel
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

/**
 * Add to cart haptic - celebratory pattern
 * Creates excitement when adding items
 */
export const addToCartHaptic = async () => {
  if (isHapticsAvailable) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 100);
  }
};

/**
 * Wishlist haptic - heart beat pattern
 */
export const wishlistHaptic = async () => {
  if (isHapticsAvailable) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 80);
  }
};

/**
 * Pull to refresh haptic
 */
export const pullToRefreshHaptic = () => {
  if (isHapticsAvailable) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

/**
 * Tab switch haptic
 */
export const tabSwitchHaptic = () => {
  if (isHapticsAvailable) {
    Haptics.selectionAsync();
  }
};

export default {
  light: lightHaptic,
  medium: mediumHaptic,
  heavy: heavyHaptic,
  success: successHaptic,
  warning: warningHaptic,
  error: errorHaptic,
  selection: selectionHaptic,
  themeToggle: themeToggleHaptic,
  addToCart: addToCartHaptic,
  wishlist: wishlistHaptic,
  pullToRefresh: pullToRefreshHaptic,
  tabSwitch: tabSwitchHaptic,
};
