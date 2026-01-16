/**
 * Namshi-Style Home Screen
 * Matching the web storefront design exactly
 * With category tabs, hero banner, product collage, and bottom navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  RefreshControl,
  Animated,
  Image,
  StatusBar,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProductCard from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { pullToRefreshHaptic, successHaptic } from '../services/haptics';
import * as api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Search placeholder options (rotating)
const SEARCH_PLACEHOLDERS = [
  'Search for Cargo Pants',
  'Search for Hoodies',
  'Search for Sneakers',
  'Search for Dresses',
  'Search for Watches',
];

// Category tabs - Namshi style with colorful backgrounds
const CATEGORY_TABS = [
  { 
    name: 'FASHION', 
    bgColor: '#c4ff00', 
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=150&h=150&fit=crop',
  },
  { 
    name: 'Beauty', 
    bgColor: '#ff69b4', 
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=150&h=150&fit=crop',
    isCircle: true,
    italic: true,
  },
  { 
    name: 'BABY & KIDS', 
    bgColor: '#7FFFD4', 
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=150&h=150&fit=crop',
  },
  { 
    name: 'HOME', 
    bgColor: '#FFDAB9', 
    image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=150&h=150&fit=crop',
    subtext: 'LIFESTYLE',
  },
  { 
    name: 'PREMIUM', 
    bgColor: '#f5f5f5', 
    isText: true,
  },
];

// Quick categories horizontal scroll
const QUICK_CATEGORIES = [
  { name: 'Sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop' },
  { name: 'Loafers', image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=300&h=200&fit=crop' },
  { name: 'T-Shirts', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=200&fit=crop' },
  { name: 'Jackets', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=200&fit=crop' },
  { name: 'Watches', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=200&fit=crop' },
];

// Product collage items
const PRODUCT_COLLAGE = [
  { name: 'Sunglasses', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=120&h=60&fit=crop', width: 90, height: 40 },
  { name: 'Watch', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=100&h=100&fit=crop', width: 60, height: 60 },
  { name: 'Hoodie', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=120&h=120&fit=crop', width: 80, height: 80 },
  { name: 'Sneakers', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=140&h=80&fit=crop', width: 100, height: 55 },
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark, statusBarStyle } = useTheme();
  const { cartCount } = useCart();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState('MEN');
  const [searchPlaceholder, setSearchPlaceholder] = useState(SEARCH_PLACEHOLDERS[0]);

  // Rotate search placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setSearchPlaceholder(prev => {
        const idx = SEARCH_PLACEHOLDERS.indexOf(prev);
        return SEARCH_PLACEHOLDERS[(idx + 1) % SEARCH_PLACEHOLDERS.length];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const productsRes = await api.getProducts({ limit: 20 });
      setProducts(productsRes.products || []);
    } catch (e) {
      console.log('Error fetching data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    pullToRefreshHaptic();
    setRefreshing(true);
    fetchData().then(() => {
      successHaptic();
    });
  };

  // Category Tab Component
  const CategoryTab = ({ item }) => (
    <TouchableOpacity 
      style={[styles.categoryTab, { backgroundColor: item.bgColor }]}
      onPress={() => navigation.navigate('Category', { category: item.name.toLowerCase() })}
    >
      {item.isText ? (
        <Text style={styles.categoryTextOnly}>{item.name}</Text>
      ) : item.isCircle ? (
        <View style={styles.categoryCircleContainer}>
          <View style={styles.categoryCircle}>
            <Image source={{ uri: item.image }} style={styles.categoryCircleImage} />
          </View>
          <View style={styles.categoryTabLabel}>
            <Text style={[styles.categoryTabText, item.italic && styles.italicText]}>{item.name}</Text>
          </View>
        </View>
      ) : (
        <>
          <Image source={{ uri: item.image }} style={styles.categoryTabImage} />
          <View style={styles.categoryTabLabel}>
            <Text style={styles.categoryTabText}>{item.name}</Text>
            {item.subtext && <Text style={styles.categorySubtext}>{item.subtext}</Text>}
          </View>
        </>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <StatusBar barStyle={statusBarStyle} />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#fff' }]}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* === CATEGORY TABS === */}
        <View style={[styles.categoryTabsContainer, { paddingTop: insets.top + 10 }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabsScroll}
          >
            {CATEGORY_TABS.map((item, idx) => (
              <CategoryTab key={idx} item={item} />
            ))}
          </ScrollView>
        </View>

        {/* === SEARCH ROW === */}
        <View style={styles.searchRow}>
          {/* Gender Dropdown */}
          <TouchableOpacity 
            style={styles.genderButton}
            onPress={() => setGenderOpen(!genderOpen)}
          >
            <Text style={styles.genderText}>{selectedGender}</Text>
            <Text style={styles.genderArrow}>{genderOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {/* Search Input */}
          <View style={styles.searchInput}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              placeholder={searchPlaceholder}
              placeholderTextColor="#999"
              style={styles.searchTextInput}
            />
            <Text style={styles.cameraIcon}>📷</Text>
          </View>

          {/* Wishlist */}
          <TouchableOpacity 
            style={styles.wishlistButton}
            onPress={() => navigation.navigate('Wishlist')}
          >
            <Text style={styles.heartIcon}>♡</Text>
          </TouchableOpacity>
        </View>

        {/* Gender Dropdown Panel */}
        {genderOpen && (
          <View style={styles.genderDropdown}>
            <TouchableOpacity 
              style={styles.genderOption}
              onPress={() => { setSelectedGender('Women'); setGenderOpen(false); }}
            >
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=60&h=60&fit=crop' }}
                style={styles.genderOptionImage}
              />
              <Text style={styles.genderOptionText}>Women</Text>
              <Text style={styles.genderOptionArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.genderOption, styles.genderOptionBorder]}
              onPress={() => { setSelectedGender('Men'); setGenderOpen(false); }}
            >
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop' }}
                style={styles.genderOptionImage}
              />
              <Text style={styles.genderOptionText}>Men</Text>
              <Text style={styles.genderOptionArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* === HERO BANNER - WHITE IN FOCUS === */}
        <View style={styles.heroBanner}>
          {/* Background */}
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop' }}
            style={styles.heroBgImage}
          />
          
          {/* Model */}
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&h=600&fit=crop' }}
            style={styles.heroModelImage}
          />

          {/* Title */}
          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitle}>WHITE</Text>
            <Text style={styles.heroSubtitle}>IN FOCUS</Text>
            <TouchableOpacity style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Shop Now</Text>
            </TouchableOpacity>
          </View>

          {/* Product Collage */}
          <View style={styles.productCollage}>
            {PRODUCT_COLLAGE.map((item, idx) => (
              <View key={idx} style={[styles.collageItem, { width: item.width, height: item.height }]}>
                <Image source={{ uri: item.image }} style={styles.collageImage} />
              </View>
            ))}
          </View>
        </View>

        {/* === QUICK CATEGORIES === */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.quickCategoriesContainer}
          contentContainerStyle={styles.quickCategoriesScroll}
        >
          {QUICK_CATEGORIES.map((cat, idx) => (
            <TouchableOpacity 
              key={idx}
              style={styles.quickCategory}
              onPress={() => navigation.navigate('Category', { category: cat.name.toLowerCase() })}
            >
              <Image source={{ uri: cat.image }} style={styles.quickCategoryImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* === 30% CASHBACK PROMO === */}
        <View style={styles.promoSection}>
          <LinearGradient
            colors={['#00d9ff', '#00b894', '#00cec9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoBanner}
          >
            <View style={styles.promoTextContainer}>
              <Text style={styles.promoTitle}>30% CASHBACK</Text>
              <Text style={styles.promoSubtitle}>On Sports Apparel & Footwear</Text>
            </View>
            <View style={styles.promoCodeBox}>
              <Text style={styles.promoCodeLabel}>USE CODE:</Text>
              <Text style={styles.promoCode}>SPORTS30</Text>
            </View>
          </LinearGradient>
        </View>

        {/* === SPORTS EDIT SECTION === */}
        <View style={styles.sportsEditSection}>
          <LinearGradient
            colors={['#059669', '#10b981']}
            style={styles.sportsEditBanner}
          >
            <View style={styles.sportsEditContent}>
              <Text style={styles.sportsEditTitle}>Sports Edit</Text>
              <Text style={styles.sportsEditSubtitle}>Your Go-To{'\n'}Active Essentials</Text>
              <TouchableOpacity style={styles.sportsEditButton}>
                <Text style={styles.sportsEditButtonText}>Shop Now</Text>
              </TouchableOpacity>
            </View>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop' }}
              style={styles.sportsEditImage}
            />
          </LinearGradient>
        </View>

        {/* === TODAY'S PICKS === */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Picks</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Browse')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.productsGrid}>
            {products.slice(0, 6).map((product, idx) => (
              <View key={product.shopify_product_id || idx} style={styles.productCardContainer}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        </View>

        {/* === MEGA SALE BANNER === */}
        <View style={styles.megaSaleSection}>
          <LinearGradient
            colors={['#f43f5e', '#ec4899', '#d946ef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.megaSaleBanner}
          >
            <Text style={styles.megaSaleTitle}>MEGA SALE</Text>
            <Text style={styles.megaSaleSubtitle}>Up to 70% OFF on selected items</Text>
            <TouchableOpacity style={styles.megaSaleButton}>
              <Text style={styles.megaSaleButtonText}>Shop Now</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* === TRENDING NOW === */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Browse', { filter: 'trending' })}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.productsGrid}>
            {products.slice(6, 12).map((product, idx) => (
              <View key={product.shopify_product_id || idx} style={styles.productCardContainer}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* === BOTTOM NAVIGATION === */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom || 10 }]}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIconActive}>
            <Text style={styles.navIcon}>🏠</Text>
          </View>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Browse')}
        >
          <Text style={styles.navIcon}>☰</Text>
          <Text style={styles.navLabel}>Categories</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>✨</Text>
          <Text style={styles.navLabel}>2026 Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Cart')}
        >
          <View>
            <Text style={styles.navIcon}>🛍</Text>
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.navLabel}>Bag</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Account')}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#000',
    borderTopColor: 'transparent',
  },
  
  // Category Tabs
  categoryTabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryTabsScroll: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 8,
  },
  categoryTab: {
    width: 72,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
  },
  categoryTabImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryTabLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  categoryTabText: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  categorySubtext: {
    fontSize: 7,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -2,
  },
  italicText: {
    fontStyle: 'italic',
  },
  categoryTextOnly: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryCircleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
  },
  categoryCircleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Search Row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#fff',
  },
  genderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    minWidth: 90,
    justifyContent: 'space-between',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  genderArrow: {
    fontSize: 10,
    marginLeft: 6,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  cameraIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  wishlistButton: {
    padding: 8,
  },
  heartIcon: {
    fontSize: 24,
  },

  // Gender Dropdown
  genderDropdown: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  genderOptionBorder: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  genderOptionImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  genderOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  genderOptionArrow: {
    fontSize: 20,
    color: '#999',
  },

  // Hero Banner
  heroBanner: {
    height: 420,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBgImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroModelImage: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '55%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroTitleContainer: {
    position: 'absolute',
    top: 40,
    right: 0,
    left: '45%',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontFamily: 'serif',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#fff',
    letterSpacing: 4,
    marginTop: 4,
  },
  heroButton: {
    marginTop: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  heroButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  productCollage: {
    position: 'absolute',
    right: 12,
    top: '35%',
    gap: 8,
  },
  collageItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  collageImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Quick Categories
  quickCategoriesContainer: {
    marginTop: 12,
  },
  quickCategoriesScroll: {
    paddingHorizontal: 8,
    gap: 8,
  },
  quickCategory: {
    width: 110,
    height: 75,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
  },
  quickCategoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Promo Banner
  promoSection: {
    paddingHorizontal: 12,
    marginTop: 12,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
  },
  promoTextContainer: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  promoSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  promoCodeBox: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  promoCodeLabel: {
    fontSize: 9,
    color: '#aaa',
    letterSpacing: 0.5,
  },
  promoCode: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    marginTop: 2,
  },

  // Sports Edit Section
  sportsEditSection: {
    paddingHorizontal: 12,
    marginTop: 12,
  },
  sportsEditBanner: {
    flexDirection: 'row',
    borderRadius: 16,
    height: 180,
    overflow: 'hidden',
  },
  sportsEditContent: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'center',
  },
  sportsEditTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  sportsEditSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    lineHeight: 18,
  },
  sportsEditButton: {
    marginTop: 14,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sportsEditButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sportsEditImage: {
    width: '50%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Sections
  section: {
    marginTop: 20,
    paddingHorizontal: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 13,
    color: '#666',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  productCardContainer: {
    width: (SCREEN_WIDTH - 32) / 2,
    paddingHorizontal: 4,
    marginBottom: 8,
  },

  // Mega Sale
  megaSaleSection: {
    paddingHorizontal: 12,
    marginTop: 16,
  },
  megaSaleBanner: {
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  megaSaleTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
  },
  megaSaleSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  megaSaleButton: {
    marginTop: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
  },
  megaSaleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e11d48',
  },

  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    backgroundColor: '#c4ff00',
    borderRadius: 20,
    padding: 4,
  },
  navIcon: {
    fontSize: 22,
  },
  navLabel: {
    fontSize: 10,
    marginTop: 2,
    color: '#999',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#000',
  },
  cartBadge: {
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
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default HomeScreen;
