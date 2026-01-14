/**
 * Header Component
 * App header with logo, search, and action icons
 * Now uses dynamic configuration from backend API
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';

// Default promo messages fallback
const defaultPromoMessages = [
  { text: 'Cash On Delivery', icon: '💵', active: true },
  { text: 'Free Delivery', icon: '🚚', active: true },
];

// Default logo config fallback
const defaultLogo = { text: 'TNV', badge: 'COLLECTION', badgeColor: '#FF6B9D' };

const Header = ({ showSearch, title }) => {
  const navigation = useNavigation();
  const { region, regions, changeRegion, navConfig } = useStore();
  const { cartCount } = useCart();
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionModal, setRegionModal] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);

  // Get config from backend or use defaults
  const logo = navConfig?.logo || defaultLogo;
  const promoMessages = (navConfig?.promoMessages || defaultPromoMessages).filter(m => m.active !== false);
  const currentPromo = promoMessages[promoIndex] || promoMessages[0] || defaultPromoMessages[0];

  // Rotate promo messages
  useEffect(() => {
    if (promoMessages.length > 1) {
      const interval = setInterval(() => {
        setPromoIndex(prev => (prev + 1) % promoMessages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [promoMessages.length]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('Search', { query: searchQuery });
      setSearchVisible(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Promo Bar - Dynamic from backend */}
      <View style={styles.promoBar}>
        <Text style={styles.promoText}>{currentPromo.icon} {currentPromo.text}</Text>
        <TouchableOpacity
          style={styles.regionBtn}
          onPress={() => setRegionModal(true)}
        >
          <Text style={styles.regionFlag}>{region.flag}</Text>
          <Text style={styles.regionCode}>{region.code}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Header */}
      <View style={styles.header}>
        {title ? (
          <Text style={styles.title}>{title}</Text>
        ) : (
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>{logo.text}</Text>
            {logo.badge && (
              <View style={[styles.badge, { backgroundColor: logo.badgeColor || '#FF6B9D' }]}>
                <Text style={styles.badgeText}>{logo.badge}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actions}>
          {showSearch && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setSearchVisible(true)}
            >
              <Text style={styles.actionIcon}>🔍</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Wishlist')}
          >
            <Text style={styles.actionIcon}>❤️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Cart')}
          >
            <Text style={styles.actionIcon}>🛒</Text>
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartCount > 9 ? '9+' : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Modal */}
      <Modal
        visible={searchVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.searchModal}>
          <View style={styles.searchHeader}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoFocus
            />
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setSearchVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
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
            <TouchableOpacity onPress={() => setRegionModal(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
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
              <Text style={styles.regionItemName}>{r.name}</Text>
              <Text style={styles.regionItemCurrency}>{r.currency}</Text>
              {region.code === r.code && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  promoBar: {
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  promoText: {
    color: '#fff',
    fontSize: 13,
  },
  regionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  regionFlag: {
    fontSize: 16,
  },
  regionCode: {
    color: '#fff',
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 24,
    fontWeight: '900',
  },
  badge: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 20,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#000',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  cancelBtn: {
    marginLeft: 12,
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  regionModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    fontSize: 20,
    color: '#666',
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  regionItemActive: {
    backgroundColor: '#f0f0f0',
  },
  regionItemFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  regionItemName: {
    flex: 1,
    fontSize: 16,
  },
  regionItemCurrency: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  checkmark: {
    fontSize: 18,
    color: '#22c55e',
  },
});

export default Header;
