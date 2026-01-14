/**
 * Enhanced Header Component
 * Modern header with animations and sleek design
 * Supports dark mode
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { borderRadius, typography, spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default promo messages fallback
const defaultPromoMessages = [
  { text: 'Cash On Delivery', icon: '💵', active: true },
  { text: 'Free Delivery on ₹999+', icon: '🚚', active: true },
  { text: 'Easy Returns', icon: '↩️', active: true },
];

// Default logo config fallback
const defaultLogo = { text: 'TNV', badge: 'COLLECTION', badgeColor: '#FF3366' };

const Header = ({ showSearch, title, transparent = false }) => {
  const navigation = useNavigation();
  const { region, regions, changeRegion, navConfig } = useStore();
  const { cartCount } = useCart();
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionModal, setRegionModal] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const cartBounce = useRef(new Animated.Value(1)).current;

  // Get config from backend or use defaults
  const logo = navConfig?.logo || defaultLogo;
  const promoMessages = (navConfig?.promoMessages || defaultPromoMessages).filter(m => m.active !== false);
  const currentPromo = promoMessages[promoIndex] || promoMessages[0] || defaultPromoMessages[0];

  // Rotate promo messages with animation
  useEffect(() => {
    if (promoMessages.length > 1) {
      const interval = setInterval(() => {
        Animated.sequence([
          Animated.timing(slideAnim, {
            toValue: -30,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 30,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
        
        setTimeout(() => {
          setPromoIndex(prev => (prev + 1) % promoMessages.length);
        }, 200);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [promoMessages.length]);

  // Bounce cart badge when count changes
  useEffect(() => {
    if (cartCount > 0) {
      Animated.sequence([
        Animated.spring(cartBounce, {
          toValue: 1.3,
          useNativeDriver: true,
          damping: 10,
          stiffness: 400,
        }),
        Animated.spring(cartBounce, {
          toValue: 1,
          useNativeDriver: true,
          damping: 10,
          stiffness: 400,
        }),
      ]).start();
    }
  }, [cartCount]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('Search', { query: searchQuery });
      setSearchVisible(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Promo Bar - Animated */}
      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.promoBar}
      >
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.promoText}>
            <Text style={styles.promoIcon}>{currentPromo.icon}</Text>
            {'  '}{currentPromo.text}
          </Text>
        </Animated.View>
        
        <TouchableOpacity
          style={styles.regionBtn}
          onPress={() => setRegionModal(true)}
        >
          <Text style={styles.regionFlag}>{region.flag}</Text>
          <Text style={styles.regionCode}>{region.code}</Text>
          <Text style={styles.regionArrow}>▼</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Main Header */}
      <View style={[styles.header, transparent && styles.headerTransparent]}>
        {title ? (
          <View style={styles.titleContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={{ width: 40 }} />
          </View>
        ) : (
          <>
            {/* Logo */}
            <TouchableOpacity 
              style={styles.logoContainer}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.logo}>{logo.text}</Text>
              {logo.badge && (
                <LinearGradient
                  colors={[logo.badgeColor || '#FF3366', '#FF6B8A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText}>{logo.badge}</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            {/* Actions */}
            <View style={styles.actions}>
              {showSearch && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setSearchVisible(true)}
                >
                  <View style={styles.searchIconContainer}>
                    <Text style={styles.actionIcon}>🔍</Text>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('Wishlist')}
              >
                <Text style={styles.actionIcon}>♡</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('Cart')}
              >
                <Text style={styles.actionIcon}>🛍️</Text>
                {cartCount > 0 && (
                  <Animated.View 
                    style={[
                      styles.cartBadge,
                      { transform: [{ scale: cartBounce }] }
                    ]}
                  >
                    <Text style={styles.cartBadgeText}>
                      {cartCount > 9 ? '9+' : cartCount}
                    </Text>
                  </Animated.View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Search Modal */}
      <Modal
        visible={searchVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.searchModal}>
          <View style={styles.searchHeader}>
            <View style={styles.searchInputContainer}>
              <Text style={styles.searchInputIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search for products, brands..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setSearchVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Searches */}
          <View style={styles.recentSearches}>
            <Text style={styles.recentTitle}>Popular Searches</Text>
            <View style={styles.searchTags}>
              {['Dresses', 'Sneakers', 'Bags', 'Watches', 'Summer Sale'].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.searchTag}
                  onPress={() => {
                    setSearchQuery(tag);
                    handleSearch();
                  }}
                >
                  <Text style={styles.searchTagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Region Modal */}
      <Modal
        visible={regionModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.regionModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Region</Text>
            <TouchableOpacity 
              onPress={() => setRegionModal(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.regionList}>
            {regions.map((r) => (
              <TouchableOpacity
                key={r.code}
                style={[
                  styles.regionItem,
                  region.code === r.code && styles.regionItemActive,
                ]}
                onPress={() => {
                  changeRegion(r);
                  setRegionModal(false);
                }}
              >
                <Text style={styles.regionItemFlag}>{r.flag}</Text>
                <View style={styles.regionItemInfo}>
                  <Text style={styles.regionItemName}>{r.name}</Text>
                  <Text style={styles.regionItemCurrency}>{r.currency}</Text>
                </View>
                {region.code === r.code && (
                  <View style={styles.checkmarkContainer}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  promoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  promoText: {
    color: colors.white,
    fontSize: typography.caption,
    fontWeight: typography.medium,
  },
  promoIcon: {
    fontSize: 14,
  },
  regionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  regionFlag: {
    fontSize: 14,
  },
  regionCode: {
    color: colors.white,
    fontSize: typography.caption,
    fontWeight: typography.medium,
    marginLeft: spacing.xs,
  },
  regionArrow: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 8,
    marginLeft: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTransparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
  },
  title: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: colors.text,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: typography.extrabold,
    color: colors.text,
    letterSpacing: -1,
  },
  badge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    color: colors.white,
    fontSize: typography.tiny,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  searchIconContainer: {
    backgroundColor: colors.background,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 22,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  cartBadgeText: {
    color: colors.white,
    fontSize: typography.tiny,
    fontWeight: typography.bold,
  },
  searchModal: {
    flex: 1,
    backgroundColor: colors.white,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchInputIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body,
    color: colors.text,
  },
  clearBtn: {
    fontSize: 16,
    color: colors.textTertiary,
    padding: spacing.xs,
  },
  cancelBtn: {
    marginLeft: spacing.md,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  recentSearches: {
    padding: spacing.lg,
  },
  recentTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  searchTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  searchTag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  searchTagText: {
    fontSize: typography.bodySmall,
    color: colors.text,
  },
  regionModal: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: colors.background,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  regionList: {
    padding: spacing.md,
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
  },
  regionItemActive: {
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  regionItemFlag: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  regionItemInfo: {
    flex: 1,
  },
  regionItemName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  regionItemCurrency: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  checkmarkContainer: {
    width: 28,
    height: 28,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 16,
    color: colors.white,
    fontWeight: typography.bold,
  },
});

export default Header;
