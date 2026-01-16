/**
 * Namshi-Style Home Screen with Swipe Carousel & Infinite Scroll
 * Matching the web storefront design exactly
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  RefreshControl,
  Image,
  StatusBar,
  TextInput,
  ActivityIndicator,
  PanResponder,
  Animated,
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

// Search placeholder options
const SEARCH_PLACEHOLDERS = [
  'Search for Cargo Pants',
  'Search for Hoodies',
  'Search for Sneakers',
  'Search for Dresses',
];

// Category tabs
const CATEGORY_TABS = [
  { name: 'FASHION', bgColor: '#c4ff00', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=150&h=150&fit=crop' },
  { name: 'Beauty', bgColor: '#ff69b4', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=150&h=150&fit=crop', isCircle: true, italic: true },
  { name: 'BABY & KIDS', bgColor: '#7FFFD4', image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=150&h=150&fit=crop' },
  { name: 'HOME', bgColor: '#FFDAB9', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=150&h=150&fit=crop', subtext: 'LIFESTYLE' },
  { name: 'PREMIUM', bgColor: '#f5f5f5', isText: true },
];

// Hero slides for swipe carousel
const HERO_SLIDES = [
  {
    id: 1,
    title: 'WHITE',
    subtitle: 'IN FOCUS',
    bgImage: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&h=600&fit=crop',
    modelImage: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&h=600&fit=crop',
    collage: [
      { image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=120&h=60&fit=crop', width: 80, height: 35 },
      { image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=100&h=100&fit=crop', width: 55, height: 55 },
      { image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=120&h=120&fit=crop', width: 70, height: 70 },
      { image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=140&h=80&fit=crop', width: 90, height: 50 },
    ],
  },
  {
    id: 2,
    title: 'SUMMER',
    subtitle: 'COLLECTION',
    bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
    modelImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=600&fit=crop',
    collage: [
      { image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&h=60&fit=crop', width: 80, height: 35 },
      { image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=120&h=120&fit=crop', width: 70, height: 70 },
    ],
    gradient: ['rgba(0,200,200,0.4)', 'rgba(0,100,200,0.3)'],
  },
  {
    id: 3,
    title: 'STREET',
    subtitle: 'STYLE',
    bgImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop',
    modelImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
    collage: [
      { image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=120&h=60&fit=crop', width: 80, height: 35 },
    ],
    gradient: ['rgba(150,50,200,0.4)', 'rgba(200,50,150,0.3)'],
  },
];

// Quick categories
const QUICK_CATEGORIES = [
  { name: 'Sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop' },
  { name: 'Loafers', image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=300&h=200&fit=crop' },
  { name: 'T-Shirts', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=200&fit=crop' },
  { name: 'Jackets', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=200&fit=crop' },
  { name: 'Watches', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=200&fit=crop' },
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cartCount } = useCart();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [genderOpen, setGenderOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState('MEN');
  const [searchPlaceholder, setSearchPlaceholder] = useState(SEARCH_PLACEHOLDERS[0]);
  
  // Hero carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const autoPlayRef = useRef(null);

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

  // Auto-play carousel
  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, []);

  const startAutoPlay = () => {
    autoPlayRef.current = setInterval(() => {
      setCurrentSlide(prev => {
        const next = (prev + 1) % HERO_SLIDES.length;
        animateToSlide(next);
        return next;
      });
    }, 5000);
  };

  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
  };

  const animateToSlide = (index) => {
    Animated.timing(slideAnim, {
      toValue: -index * SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        stopAutoPlay();
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          // Swipe left - next slide
          const next = Math.min(currentSlide + 1, HERO_SLIDES.length - 1);
          setCurrentSlide(next);
          animateToSlide(next);
        } else if (gestureState.dx > 50) {
          // Swipe right - previous slide
          const prev = Math.max(currentSlide - 1, 0);
          setCurrentSlide(prev);
          animateToSlide(prev);
        }
        startAutoPlay();
      },
    })
  ).current;

  // Go to specific slide
  const goToSlide = (index) => {
    stopAutoPlay();
    setCurrentSlide(index);
    animateToSlide(index);
    startAutoPlay();
  };

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const productsRes = await api.getProducts({ limit: 12, page: 1 });
      setProducts(productsRes.products || []);
      setHasMore((productsRes.products || []).length >= 12);
      setPage(1);
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
    setPage(1);
    setHasMore(true);
    fetchData().then(() => successHaptic());
  };

  // Load more products (infinite scroll)
  const loadMoreProducts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const productsRes = await api.getProducts({ limit: 12, page: nextPage });
      const newProducts = productsRes.products || [];
      
      if (newProducts.length > 0) {
        setProducts(prev => [...prev, ...newProducts]);
        setPage(nextPage);
        setHasMore(newProducts.length >= 12);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.log('Error loading more:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore]);

  // Handle scroll end for infinite loading
  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 500;
    
    if (isCloseToBottom && hasMore && !loadingMore) {
      loadMoreProducts();
    }
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
      <View style={[styles.container, { backgroundColor: '#fff', paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#000" style={{ flex: 1 }} />
      </View>
    );
  }

  const currentHeroSlide = HERO_SLIDES[currentSlide];

  return (
    <View style={[styles.container, { backgroundColor: '#fff' }]}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Category Tabs */}
        <View style={[styles.categoryTabsContainer, { paddingTop: insets.top + 10 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabsScroll}>
            {CATEGORY_TABS.map((item, idx) => <CategoryTab key={idx} item={item} />)}
          </ScrollView>
        </View>

        {/* Search Row */}
        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.genderButton} onPress={() => setGenderOpen(!genderOpen)}>
            <Text style={styles.genderText}>{selectedGender}</Text>
            <Text style={styles.genderArrow}>{genderOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          <View style={styles.searchInput}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput placeholder={searchPlaceholder} placeholderTextColor="#999" style={styles.searchTextInput} />
            <Text style={styles.cameraIcon}>📷</Text>
          </View>

          <TouchableOpacity style={styles.wishlistButton} onPress={() => navigation.navigate('Wishlist')}>
            <Text style={styles.heartIcon}>♡</Text>
          </TouchableOpacity>
        </View>

        {/* Gender Dropdown */}
        {genderOpen && (
          <View style={styles.genderDropdown}>
            <TouchableOpacity style={styles.genderOption} onPress={() => { setSelectedGender('Women'); setGenderOpen(false); }}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=60&h=60&fit=crop' }} style={styles.genderOptionImage} />
              <Text style={styles.genderOptionText}>Women</Text>
              <Text style={styles.genderOptionArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.genderOption, styles.genderOptionBorder]} onPress={() => { setSelectedGender('Men'); setGenderOpen(false); }}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop' }} style={styles.genderOptionImage} />
              <Text style={styles.genderOptionText}>Men</Text>
              <Text style={styles.genderOptionArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Swipeable Hero Carousel */}
        <View style={styles.heroContainer} {...panResponder.panHandlers}>
          <Animated.View style={[styles.heroSlides, { transform: [{ translateX: slideAnim }] }]}>
            {HERO_SLIDES.map((slide, idx) => (
              <View key={slide.id} style={styles.heroSlide}>
                <Image source={{ uri: slide.bgImage }} style={styles.heroBgImage} />
                <LinearGradient colors={slide.gradient || ['transparent', 'rgba(255,255,255,0.2)']} style={styles.heroGradient} />
                
                <Image source={{ uri: slide.modelImage }} style={styles.heroModelImage} />
                
                <View style={styles.heroTitleContainer}>
                  <Text style={styles.heroTitle}>{slide.title}</Text>
                  <Text style={styles.heroSubtitle}>{slide.subtitle}</Text>
                  <TouchableOpacity style={styles.heroButton}>
                    <Text style={styles.heroButtonText}>Shop Now</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.productCollage}>
                  {slide.collage.map((item, cidx) => (
                    <View key={cidx} style={[styles.collageItem, { width: item.width, height: item.height }]}>
                      <Image source={{ uri: item.image }} style={styles.collageImage} />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Animated.View>

          {/* Dots */}
          <View style={styles.heroDots}>
            {HERO_SLIDES.map((_, idx) => (
              <TouchableOpacity key={idx} onPress={() => goToSlide(idx)} style={[styles.heroDot, idx === currentSlide && styles.heroDotActive]} />
            ))}
          </View>
        </View>

        {/* Quick Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickCategoriesContainer} contentContainerStyle={styles.quickCategoriesScroll}>
          {QUICK_CATEGORIES.map((cat, idx) => (
            <TouchableOpacity key={idx} style={styles.quickCategory} onPress={() => navigation.navigate('Category', { category: cat.name.toLowerCase() })}>
              <Image source={{ uri: cat.image }} style={styles.quickCategoryImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 30% Cashback Promo */}
        <View style={styles.promoSection}>
          <LinearGradient colors={['#00d9ff', '#00b894', '#00cec9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoBanner}>
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

        {/* Sports Edit */}
        <View style={styles.sportsEditSection}>
          <LinearGradient colors={['#059669', '#10b981']} style={styles.sportsEditBanner}>
            <View style={styles.sportsEditContent}>
              <Text style={styles.sportsEditTitle}>Sports Edit</Text>
              <Text style={styles.sportsEditSubtitle}>Your Go-To{'\n'}Active Essentials</Text>
              <TouchableOpacity style={styles.sportsEditButton}>
                <Text style={styles.sportsEditButtonText}>Shop Now</Text>
              </TouchableOpacity>
            </View>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop' }} style={styles.sportsEditImage} />
          </LinearGradient>
        </View>

        {/* All Products with Infinite Scroll */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Products</Text>
            <Text style={styles.productCount}>{products.length} items</Text>
          </View>
          <View style={styles.productsGrid}>
            {products.map((product, idx) => (
              <View key={`${product.shopify_product_id}-${idx}`} style={styles.productCardContainer}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
          
          {/* Loading indicator */}
          {loadingMore && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={styles.loadingMoreText}>Loading more products...</Text>
            </View>
          )}
          
          {!hasMore && products.length > 0 && (
            <Text style={styles.endText}>You've seen all products!</Text>
          )}
        </View>

        {/* Mega Sale */}
        <View style={styles.megaSaleSection}>
          <LinearGradient colors={['#f43f5e', '#ec4899', '#d946ef']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.megaSaleBanner}>
            <Text style={styles.megaSaleTitle}>MEGA SALE</Text>
            <Text style={styles.megaSaleSubtitle}>Up to 70% OFF on selected items</Text>
            <TouchableOpacity style={styles.megaSaleButton}>
              <Text style={styles.megaSaleButtonText}>Shop Now</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom || 10 }]}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIconActive}><Text style={styles.navIcon}>🏠</Text></View>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Browse')}>
          <Text style={styles.navIcon}>☰</Text>
          <Text style={styles.navLabel}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>✨</Text>
          <Text style={styles.navLabel}>2026 Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Cart')}>
          <View>
            <Text style={styles.navIcon}>🛍</Text>
            {cartCount > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>}
          </View>
          <Text style={styles.navLabel}>Bag</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Account')}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Category Tabs
  categoryTabsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  categoryTabsScroll: { paddingHorizontal: 8, paddingVertical: 10, gap: 8 },
  categoryTab: { width: 72, height: 80, borderRadius: 12, overflow: 'hidden', marginRight: 8 },
  categoryTabImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  categoryTabLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', paddingVertical: 4, alignItems: 'center' },
  categoryTabText: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  categorySubtext: { fontSize: 7, fontWeight: '700', textAlign: 'center', marginTop: -2 },
  italicText: { fontStyle: 'italic' },
  categoryTextOnly: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  categoryCircleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  categoryCircle: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', borderWidth: 3, borderColor: '#fff' },
  categoryCircleImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  // Search Row
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: '#fff' },
  genderButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, minWidth: 90, justifyContent: 'space-between' },
  genderText: { fontSize: 14, fontWeight: '700' },
  genderArrow: { fontSize: 10, marginLeft: 6, color: '#666' },
  searchInput: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchTextInput: { flex: 1, fontSize: 14, color: '#333' },
  cameraIcon: { fontSize: 18, marginLeft: 8 },
  wishlistButton: { padding: 8 },
  heartIcon: { fontSize: 24 },

  // Gender Dropdown
  genderDropdown: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  genderOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  genderOptionBorder: { borderTopWidth: 1, borderTopColor: '#eee' },
  genderOptionImage: { width: 48, height: 48, borderRadius: 8, marginRight: 12 },
  genderOptionText: { flex: 1, fontSize: 16, fontWeight: '500' },
  genderOptionArrow: { fontSize: 20, color: '#999' },

  // Hero Carousel
  heroContainer: { height: 400, overflow: 'hidden', position: 'relative' },
  heroSlides: { flexDirection: 'row', height: '100%' },
  heroSlide: { width: SCREEN_WIDTH, height: '100%', position: 'relative' },
  heroBgImage: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' },
  heroGradient: { position: 'absolute', width: '100%', height: '100%' },
  heroModelImage: { position: 'absolute', left: 0, bottom: 0, width: '55%', height: '100%', resizeMode: 'cover' },
  heroTitleContainer: { position: 'absolute', top: 40, right: 0, left: '45%', alignItems: 'center' },
  heroTitle: { fontSize: 32, fontFamily: 'serif', color: '#fff', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  heroSubtitle: { fontSize: 12, color: '#fff', letterSpacing: 4, marginTop: 4 },
  heroButton: { marginTop: 12, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  heroButtonText: { fontSize: 12, fontWeight: '600' },
  productCollage: { position: 'absolute', right: 8, top: '32%', gap: 6 },
  collageItem: { backgroundColor: '#fff', borderRadius: 6, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
  collageImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  heroDotActive: { width: 24, backgroundColor: '#fff' },

  // Quick Categories
  quickCategoriesContainer: { marginTop: 12 },
  quickCategoriesScroll: { paddingHorizontal: 8, gap: 8 },
  quickCategory: { width: 100, height: 70, borderRadius: 10, overflow: 'hidden', marginRight: 8 },
  quickCategoryImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  // Promo Banner
  promoSection: { paddingHorizontal: 12, marginTop: 12 },
  promoBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16 },
  promoTextContainer: { flex: 1 },
  promoTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  promoSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  promoCodeBox: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  promoCodeLabel: { fontSize: 8, color: '#aaa', letterSpacing: 0.5 },
  promoCode: { fontSize: 14, fontWeight: '900', color: '#fff', marginTop: 2 },

  // Sports Edit
  sportsEditSection: { paddingHorizontal: 12, marginTop: 12 },
  sportsEditBanner: { flexDirection: 'row', borderRadius: 16, height: 160, overflow: 'hidden' },
  sportsEditContent: { flex: 1, paddingLeft: 16, justifyContent: 'center' },
  sportsEditTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  sportsEditSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 16 },
  sportsEditButton: { marginTop: 12, backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  sportsEditButtonText: { fontSize: 12, fontWeight: '600' },
  sportsEditImage: { width: '50%', height: '100%', resizeMode: 'cover' },

  // Sections
  section: { marginTop: 16, paddingHorizontal: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  productCount: { fontSize: 13, color: '#666' },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  productCardContainer: { width: (SCREEN_WIDTH - 32) / 2, paddingHorizontal: 4, marginBottom: 8 },
  
  // Loading More
  loadingMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 8 },
  loadingMoreText: { fontSize: 13, color: '#666' },
  endText: { textAlign: 'center', color: '#999', fontSize: 13, paddingVertical: 20 },

  // Mega Sale
  megaSaleSection: { paddingHorizontal: 12, marginTop: 16, marginBottom: 20 },
  megaSaleBanner: { borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  megaSaleTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  megaSaleSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  megaSaleButton: { marginTop: 10, backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 8, borderRadius: 16 },
  megaSaleButtonText: { fontSize: 13, fontWeight: '700', color: '#e11d48' },

  // Bottom Navigation
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIconActive: { backgroundColor: '#c4ff00', borderRadius: 20, padding: 4 },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 10, marginTop: 2, color: '#999', fontWeight: '500' },
  navLabelActive: { color: '#000' },
  cartBadge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#e11d48', borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

export default HomeScreen;
