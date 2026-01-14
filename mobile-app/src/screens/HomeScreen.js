/**
 * Enhanced Home Screen
 * Beautiful landing page with animations and modern design
 * Supports light/dark mode
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import CategoryCircle from '../components/CategoryCircle';
import PromoBanner, { FlashSaleBanner, CompactBanner } from '../components/PromoBanner';
import Skeleton from '../components/SkeletonLoader';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import * as api from '../services/api';
import { borderRadius, typography, spacing, gradients } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default categories with gradients
const defaultCategories = [
  { name: 'New In', icon: '✨', gradient: gradients.purple },
  { name: 'Dresses', icon: '👗', gradient: gradients.pink },
  { name: 'Shoes', icon: '👟', gradient: gradients.cyan },
  { name: 'Bags', icon: '👜', gradient: gradients.orange },
  { name: 'Sports', icon: '🏃', gradient: gradients.green },
  { name: 'Watches', icon: '⌚', gradient: gradients.red },
  { name: 'Beauty', icon: '💄', gradient: gradients.teal },
  { name: 'Sale', icon: '🔥', gradient: gradients.fire },
];

// Section Header Component
const SectionHeader = ({ title, subtitle, onViewAll, style }) => (
  <View style={[styles.sectionHeader, style]}>
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll} style={styles.viewAllBtn}>
        <Text style={styles.viewAllText}>View All</Text>
        <Text style={styles.viewAllArrow}>→</Text>
      </TouchableOpacity>
    )}
  </View>
);

// Gender Card Component
const GenderCard = ({ title, image, gradient, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  return (
    <Animated.View style={[styles.genderCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.genderTouchable}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.genderGradient}
        >
          <View style={styles.genderOverlay} />
          <Text style={styles.genderTitle}>{title}</Text>
          <Text style={styles.genderSubtitle}>SHOP NOW →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Category Pill Component
const CategoryPill = ({ name, icon, gradient, onPress, index }) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      <TouchableOpacity onPress={onPress} style={styles.categoryPill}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryPillGradient}
        >
          <Text style={styles.categoryPillIcon}>{icon}</Text>
        </LinearGradient>
        <Text style={styles.categoryPillName}>{name}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Trending Badge
const TrendingBadge = () => (
  <View style={styles.trendingBadge}>
    <Text style={styles.trendingIcon}>🔥</Text>
    <Text style={styles.trendingText}>TRENDING</Text>
  </View>
);

const HomeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { navConfig, isLoading: configLoading } = useStore();
  const { colors, shadows, isDark, statusBarStyle } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const categories = navConfig?.categories?.filter(c => c.active !== false) || defaultCategories;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, bannersRes] = await Promise.all([
        api.getProducts({ limit: 20 }),
        api.getBanners(),
      ]);
      setProducts(productsRes.products || []);
      setBanners(bannersRes.banners || []);
    } catch (e) {
      console.log('Error fetching data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Header background opacity based on scroll
  const headerBg = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <StatusBar barStyle={statusBarStyle} />
        <Header showSearch />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Skeleton loaders */}
          <View style={styles.genderBanner}>
            <Skeleton.Rect width={(SCREEN_WIDTH - 48) / 2} height={200} borderRadius={borderRadius.xl} />
            <Skeleton.Rect width={(SCREEN_WIDTH - 48) / 2} height={200} borderRadius={borderRadius.xl} />
          </View>
          <View style={{ marginTop: spacing.xl, paddingHorizontal: spacing.lg }}>
            <Skeleton.Banner />
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton.CategoryCircle key={i} />
            ))}
          </View>
          <Skeleton.ProductGrid count={4} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={statusBarStyle} />
      <Header showSearch />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Gender Selection Cards */}
        <View style={styles.genderBanner}>
          <GenderCard
            title="WOMEN"
            gradient={isDark ? ['#4a3728', '#3d2a1f'] : ['#ffecd2', '#fcb69f']}
            onPress={() => navigation.navigate('Category', { category: 'women' })}
          />
          <GenderCard
            title="MEN"
            gradient={['#a1c4fd', '#c2e9fb']}
            onPress={() => navigation.navigate('Category', { category: 'men' })}
          />
        </View>

        {/* Flash Sale Banner */}
        <View style={{ marginTop: spacing.lg }}>
          <FlashSaleBanner
            endTime={new Date(Date.now() + 6 * 60 * 60 * 1000)}
            onPress={() => navigation.navigate('Category', { category: 'sale' })}
          />
        </View>

        {/* Main Promo Banner */}
        <View style={{ marginTop: spacing.xl }}>
          <PromoBanner
            title="30% CASHBACK"
            subtitle="On Sports Apparel & Footwear"
            code="SPORTS30"
            colors={['#11998e', '#38ef7d']}
            onPress={() => navigation.navigate('Category', { category: 'sports' })}
          />
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <SectionHeader title="Shop by Category" />
          <FlatList
            horizontal
            data={categories.slice(0, 8)}
            keyExtractor={(item, idx) => item.name || idx.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
            renderItem={({ item, index }) => (
              <CategoryPill
                name={item.name}
                icon={item.icon?.value || item.icon}
                gradient={item.gradient || defaultCategories[index % defaultCategories.length].gradient}
                index={index}
                onPress={() => navigation.navigate('Category', { category: item.name.toLowerCase() })}
              />
            )}
          />
        </View>

        {/* Compact Banners Row */}
        <View style={styles.compactBannersRow}>
          <CompactBanner
            title="Free Shipping on ₹999+"
            icon="🚚"
            color="#22C55E"
            onPress={() => {}}
          />
        </View>

        {/* Today's Picks - Horizontal */}
        <View style={styles.section}>
          <SectionHeader
            title="Today's Picks"
            subtitle="Curated just for you"
            onViewAll={() => navigation.navigate('Browse')}
          />
          <FlatList
            horizontal
            data={products.slice(0, 8)}
            keyExtractor={(item) => item.shopify_product_id?.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsContainer}
            renderItem={({ item }) => (
              <ProductCard product={item} horizontal />
            )}
          />
        </View>

        {/* Sale Banner */}
        <View style={{ marginTop: spacing.xl }}>
          <PromoBanner
            title="MEGA SALE"
            subtitle="Up to 70% OFF on selected items"
            colors={colors.gradientSale}
            size="lg"
            onPress={() => navigation.navigate('Category', { category: 'sale' })}
          />
        </View>

        {/* Trending Now */}
        <View style={styles.section}>
          <View style={styles.trendingHeader}>
            <SectionHeader
              title="Trending Now"
              subtitle="What everyone's buying"
              onViewAll={() => navigation.navigate('Browse', { filter: 'trending' })}
            />
            <TrendingBadge />
          </View>
          <View style={styles.productsGrid}>
            {products.slice(0, 4).map((product, index) => (
              <View key={product.shopify_product_id} style={styles.gridProduct}>
                <ProductCard product={product} showQuickAdd />
              </View>
            ))}
          </View>
        </View>

        {/* New Arrivals */}
        <View style={styles.section}>
          <SectionHeader
            title="New Arrivals"
            subtitle="Fresh drops this week"
            onViewAll={() => navigation.navigate('Browse', { filter: 'new' })}
          />
          <View style={styles.productsGrid}>
            {products.slice(4, 10).map((product) => (
              <View key={product.shopify_product_id} style={styles.gridProduct}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Promo */}
        <View style={{ marginTop: spacing.xl, marginBottom: spacing.xxxl }}>
          <PromoBanner
            title="PREMIUM MEMBER"
            subtitle="Get exclusive access to deals"
            colors={['#667eea', '#764ba2']}
            size="md"
          />
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  genderBanner: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  genderCard: {
    flex: 1,
    height: 200,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  genderTouchable: {
    flex: 1,
  },
  genderGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  genderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  genderTitle: {
    fontSize: typography.h2,
    fontWeight: typography.extrabold,
    color: colors.text,
    letterSpacing: 2,
  },
  genderSubtitle: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  viewAllArrow: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  categoryPill: {
    alignItems: 'center',
    width: 70,
  },
  categoryPillGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  categoryPillIcon: {
    fontSize: 26,
  },
  categoryPillName: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  compactBannersRow: {
    marginTop: spacing.xl,
  },
  productsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  gridProduct: {
    width: (SCREEN_WIDTH - spacing.md * 3) / 2,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.lg,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  trendingIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  trendingText: {
    fontSize: typography.tiny,
    fontWeight: typography.bold,
    color: '#D97706',
    letterSpacing: 0.5,
  },
});

export default HomeScreen;
