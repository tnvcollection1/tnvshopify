/**
 * Enhanced Product Card Component
 * Beautiful product display with animations and effects
 * Supports dark mode
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import { wishlistHaptic, addToCartHaptic, lightHaptic } from '../services/haptics';
import { borderRadius, typography, spacing, gradients } from '../theme';

const { width } = Dimensions.get('window');

const ProductCard = ({ product, horizontal, style, showQuickAdd = false }) => {
  const navigation = useNavigation();
  const { formatPrice, toggleWishlist, isInWishlist } = useStore();
  const { colors, shadows } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const wishlistAnim = useRef(new Animated.Value(1)).current;
  const [imageLoaded, setImageLoaded] = useState(false);

  const image = product.images?.[0]?.src;
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;
  const inWishlist = isInWishlist(product.shopify_product_id);

  // Delivery estimation
  const deliveryOptions = [
    { label: 'TODAY', color: colors.success },
    { label: 'TOMORROW', color: colors.warning },
  ];
  const delivery = deliveryOptions[Math.floor(Math.random() * 2)];

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

  const handlePress = () => {
    navigation.navigate('ProductDetail', {
      productId: product.shopify_product_id,
    });
  };

  const handleWishlistPress = () => {
    // Bounce animation
    Animated.sequence([
      Animated.spring(wishlistAnim, {
        toValue: 1.3,
        useNativeDriver: true,
        damping: 10,
        stiffness: 400,
      }),
      Animated.spring(wishlistAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 400,
      }),
    ]).start();
    
    toggleWishlist(product);
  };

  const cardStyle = horizontal
    ? [styles.containerHorizontal, { backgroundColor: colors.card }, shadows.md, style]
    : [styles.container, { backgroundColor: colors.card }, shadows.md, style];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={cardStyle}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Image Container */}
        <View style={[horizontal ? styles.imageContainerH : styles.imageContainer, { backgroundColor: colors.background }]}>
          {/* Placeholder gradient while loading */}
          {!imageLoaded && (
            <LinearGradient
              colors={[colors.background, colors.border, colors.background]}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.image}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <View style={[styles.image, styles.placeholder, { backgroundColor: colors.background }]}>
              <Text style={styles.placeholderText}>📷</Text>
            </View>
          )}

          {/* Discount Badge */}
          {discount > 0 && (
            <LinearGradient
              colors={gradients.sale}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.discountBadge}
            >
              <Text style={styles.discountText}>-{discount}%</Text>
            </LinearGradient>
          )}

          {/* New Badge */}
          {!discount && product.tags?.includes('new') && (
            <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}

          {/* Wishlist Button */}
          <Animated.View style={{ transform: [{ scale: wishlistAnim }] }}>
            <TouchableOpacity
              style={[styles.wishlistBtn, { backgroundColor: colors.card }, shadows.md, inWishlist && { backgroundColor: '#FFF0F3' }]}
              onPress={handleWishlistPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.wishlistIcon}>
                {inWishlist ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Quick Add Button */}
          {showQuickAdd && (
            <TouchableOpacity style={[styles.quickAddBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.quickAddText, { color: colors.textInverse }]}>+ ADD</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.info}>
          {/* Brand */}
          <Text style={[styles.brand, { color: colors.textSecondary }]} numberOfLines={1}>
            {product.vendor || 'TNV Collection'}
          </Text>
          
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {product.title}
          </Text>

          {/* Price Row */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.text }]}>{formatPrice(price)}</Text>
            {comparePrice && (
              <Text style={[styles.comparePrice, { color: colors.textTertiary }]}>{formatPrice(comparePrice)}</Text>
            )}
            {discount > 0 && (
              <View style={styles.discountPill}>
                <Text style={styles.discountPillText}>{discount}% OFF</Text>
              </View>
            )}
          </View>

          {/* Delivery Info */}
          <View style={styles.deliveryRow}>
            <Text style={[styles.deliveryText, { color: colors.textSecondary }]}>Free delivery • Get it </Text>
            <Text style={[styles.deliveryHighlight, { color: delivery.color }]}>
              {delivery.label}
            </Text>
          </View>

          {/* Rating (if available) */}
          {product.rating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStar}>⭐</Text>
              <Text style={[styles.ratingText, { color: colors.text }]}>{product.rating}</Text>
              <Text style={[styles.ratingCount, { color: colors.textTertiary }]}>({product.reviewCount || 0})</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  containerHorizontal: {
    width: 165,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  imageContainer: {
    aspectRatio: 3 / 4,
    position: 'relative',
  },
  imageContainerH: {
    width: 165,
    height: 220,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
    opacity: 0.3,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: typography.tiny,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  newBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: typography.tiny,
    fontWeight: typography.bold,
    letterSpacing: 1,
  },
  wishlistBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistBtnActive: {
    backgroundColor: '#FFF0F3',
  },
  wishlistIcon: {
    fontSize: 18,
  },
  quickAddBtn: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  quickAddText: {
    fontSize: typography.tiny,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  info: {
    padding: spacing.md,
  },
  brand: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    marginRight: spacing.sm,
  },
  comparePrice: {
    fontSize: typography.bodySmall,
    textDecorationLine: 'line-through',
    marginRight: spacing.sm,
  },
  discountPill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountPillText: {
    fontSize: typography.tiny,
    fontWeight: typography.semibold,
    color: '#EF4444',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: typography.caption,
  },
  deliveryHighlight: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ratingStar: {
    fontSize: 12,
    marginRight: 4,
  },
  ratingText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
  },
  ratingCount: {
    fontSize: typography.caption,
    marginLeft: 4,
  },
});

export default ProductCard;
