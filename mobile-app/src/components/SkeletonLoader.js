/**
 * Skeleton Loader Component
 * Animated placeholder for loading states
 * Supports dark mode
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { borderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Shimmer animation component
const ShimmerEffect = ({ style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const { colors, isDark } = useTheme();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View style={[styles.shimmerContainer, style]}>
      <View style={[styles.shimmerBackground, { backgroundColor: colors.border }]} />
      <Animated.View
        style={[
          styles.shimmer,
          { 
            transform: [{ translateX }],
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
          },
        ]}
      />
    </View>
  );
};

// Skeleton shapes
export const SkeletonRect = ({ width, height, style, borderRadius: br = borderRadius.md }) => (
  <ShimmerEffect
    style={[
      styles.skeleton,
      { width, height, borderRadius: br },
      style,
    ]}
  />
);

export const SkeletonCircle = ({ size, style }) => (
  <ShimmerEffect
    style={[
      styles.skeleton,
      { width: size, height: size, borderRadius: size / 2 },
      style,
    ]}
  />
);

export const SkeletonText = ({ width = '100%', lines = 1, style }) => (
  <View style={[styles.textContainer, style]}>
    {Array.from({ length: lines }).map((_, i) => (
      <ShimmerEffect
        key={i}
        style={[
          styles.textLine,
          {
            width: i === lines - 1 && lines > 1 ? '70%' : width,
            marginBottom: i < lines - 1 ? 8 : 0,
          },
        ]}
      />
    ))}
  </View>
);

// Pre-built skeleton layouts
export const ProductCardSkeleton = ({ horizontal }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.productCard, { backgroundColor: colors.card }, horizontal && styles.productCardHorizontal]}>
      <SkeletonRect
        width={horizontal ? 150 : '100%'}
        height={horizontal ? 200 : undefined}
        style={horizontal ? {} : { aspectRatio: 3 / 4 }}
        borderRadius={borderRadius.lg}
      />
      <View style={styles.productCardInfo}>
        <SkeletonText width={60} />
        <SkeletonText width="90%" style={{ marginTop: 8 }} />
        <SkeletonText width="60%" style={{ marginTop: 8 }} />
      </View>
    </View>
  );
};

export const CategoryCircleSkeleton = () => (
  <View style={styles.categoryCircle}>
    <SkeletonCircle size={70} />
    <SkeletonText width={50} style={{ marginTop: 8 }} />
  </View>
);

export const BannerSkeleton = () => (
  <SkeletonRect
    width="100%"
    height={180}
    borderRadius={borderRadius.xl}
    style={{ marginHorizontal: 16 }}
  />
);

export const ProductGridSkeleton = ({ count = 6 }) => (
  <View style={styles.productGrid}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.gridItem}>
        <ProductCardSkeleton />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  shimmerContainer: {
    overflow: 'hidden',
  },
  shimmerBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ skewX: '-20deg' }],
  },
  skeleton: {
    overflow: 'hidden',
  },
  textContainer: {
    width: '100%',
  },
  textLine: {
    height: 14,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  productCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  productCardHorizontal: {
    width: 150,
  },
  productCardInfo: {
    padding: 12,
  },
  categoryCircle: {
    alignItems: 'center',
    marginRight: 16,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  gridItem: {
    width: '50%',
    padding: 4,
  },
});

export default {
  Rect: SkeletonRect,
  Circle: SkeletonCircle,
  Text: SkeletonText,
  ProductCard: ProductCardSkeleton,
  CategoryCircle: CategoryCircleSkeleton,
  Banner: BannerSkeleton,
  ProductGrid: ProductGridSkeleton,
};
