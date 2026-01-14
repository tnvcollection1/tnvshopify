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
  const { colors, shadows, isDark } = useTheme();
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
        colors={isDark ? ['#1a1a1a', '#2d2d2d'] : ['#1a1a1a', '#2d2d2d']}
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
      <View style={[
        styles.header, 
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
        transparent && styles.headerTransparent
      ]}>
        {title ? (
          <View style={styles.titleContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <View style={{ width: 40 }} />
          </View>
        ) : (
          <>
            {/* Logo */}
            <TouchableOpacity 
              style={styles.logoContainer}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={[styles.logo, { color: colors.text }]}>{logo.text}</Text>
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
                  <View style={[styles.searchIconContainer, { backgroundColor: colors.background }]}>
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
                      { backgroundColor: colors.accent, borderColor: colors.surface },
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
        <View style={[styles.searchModal, { backgroundColor: colors.surface }]}>
          <View style={[styles.searchHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.searchInputContainer, { backgroundColor: colors.background }]}>
              <Text style={styles.searchInputIcon}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
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
                  <Text style={[styles.clearBtn, { color: colors.textTertiary }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setSearchVisible(false)}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Searches */}
          <View style={styles.recentSearches}>
            <Text style={[styles.recentTitle, { color: colors.textSecondary }]}>Popular Searches</Text>
            <View style={styles.searchTags}>
              {['Dresses', 'Sneakers', 'Bags', 'Watches', 'Summer Sale'].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.searchTag, { backgroundColor: colors.background }]}
                  onPress={() => {
                    setSearchQuery(tag);
                    handleSearch();
                  }}
                >
                  <Text style={[styles.searchTagText, { color: colors.text }]}>{tag}</Text>
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
        <View style={[styles.regionModal, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Region</Text>
            <TouchableOpacity 
              onPress={() => setRegionModal(false)}
              style={[styles.closeBtn, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.regionList}>
            {regions.map((r) => (
              <TouchableOpacity
                key={r.code}
                style={[
                  styles.regionItem,
                  { backgroundColor: colors.background },
                  region.code === r.code && [styles.regionItemActive, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }],
                ]}
                onPress={() => {
                  changeRegion(r);
                  setRegionModal(false);
                }}
              >
                <Text style={styles.regionItemFlag}>{r.flag}</Text>
                <View style={styles.regionItemInfo}>
                  <Text style={[styles.regionItemName, { color: colors.text }]}>{r.name}</Text>
                  <Text style={[styles.regionItemCurrency, { color: colors.textSecondary }]}>{r.currency}</Text>
                </View>
                {region.code === r.code && (
                  <View style={[styles.checkmarkContainer, { backgroundColor: colors.primary }]}>
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    borderBottomWidth: 1,
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
  },
  title: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: typography.extrabold,
    letterSpacing: -1,
  },
  badge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    color: '#FFFFFF',
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
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: typography.tiny,
    fontWeight: typography.bold,
  },
  searchModal: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  clearBtn: {
    fontSize: 16,
    padding: spacing.xs,
  },
  cancelBtn: {
    marginLeft: spacing.md,
  },
  cancelText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  recentSearches: {
    padding: spacing.lg,
  },
  recentTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    marginBottom: spacing.md,
  },
  searchTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  searchTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  searchTagText: {
    fontSize: typography.bodySmall,
  },
  regionModal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
  },
  regionList: {
    padding: spacing.md,
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
  },
  regionItemActive: {
    borderWidth: 2,
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
  },
  regionItemCurrency: {
    fontSize: typography.bodySmall,
    marginTop: spacing.xs,
  },
  checkmarkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: typography.bold,
  },
});

export default Header;
