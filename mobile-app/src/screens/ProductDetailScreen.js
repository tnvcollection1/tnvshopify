/**
 * Enhanced Product Detail Screen
 * Beautiful product page with animations and modern design
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import AnimatedButton from '../components/AnimatedButton';
import Skeleton from '../components/SkeletonLoader';
import * as api from '../services/api';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.55;

const ProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { formatPrice, toggleWishlist, isInWishlist } = useStore();
  const { addToCart } = useCart();
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const wishlistAnim = useRef(new Animated.Value(1)).current;
  const addToCartAnim = useRef(new Animated.Value(0)).current;
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await api.getProduct(productId);
      const prod = res.product || res;
      setProduct(prod);
      if (prod.variants?.[0]) {
        setSelectedVariant(prod.variants[0]);
        setSelectedSize(prod.variants[0].option1);
      }
    } catch (e) {
      console.log('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, selectedVariant, quantity);
      setAddedToCart(true);
      
      // Animation
      Animated.sequence([
        Animated.timing(addToCartAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(addToCartAnim, {
          toValue: 0,
          duration: 200,
          delay: 1500,
          useNativeDriver: true,
        }),
      ]).start(() => setAddedToCart(false));
    }
  };

  const handleWishlistPress = () => {
    Animated.sequence([
      Animated.spring(wishlistAnim, {
        toValue: 1.4,
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

  // Header animations
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, IMAGE_HEIGHT - 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.5, 1],
    extrapolate: 'clamp',
  });

  const imageTranslate = scrollY.interpolate({
    inputRange: [0, IMAGE_HEIGHT],
    outputRange: [0, -IMAGE_HEIGHT / 2],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Skeleton.Rect width={SCREEN_WIDTH} height={IMAGE_HEIGHT} borderRadius={0} />
        <View style={{ padding: spacing.lg }}>
          <Skeleton.Text width={100} />
          <Skeleton.Text width="80%" style={{ marginTop: spacing.md }} />
          <Skeleton.Text width={150} style={{ marginTop: spacing.lg }} />
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton.Rect key={i} width={60} height={44} borderRadius={borderRadius.md} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <AnimatedButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="outline"
        />
      </View>
    );
  }

  const images = product.images || [];
  const price = selectedVariant?.price || product.price || 0;
  const comparePrice = selectedVariant?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;
  const inWishlist = isInWishlist(product.shopify_product_id);

  // Get size options
  const sizeOption = product.options?.find(o => o.name.toLowerCase() === 'size');
  const colorOption = product.options?.find(o => o.name.toLowerCase() === 'color');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity, paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{product.title}</Text>
          <TouchableOpacity style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>🔗</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Back Button (visible when header is transparent) */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + spacing.sm }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Image Gallery */}
        <View style={styles.imageGalleryContainer}>
          <Animated.View
            style={[
              styles.imageGallery,
              {
                transform: [
                  { scale: imageScale },
                  { translateY: imageTranslate },
                ],
              },
            ]}
          >
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImage(idx);
              }}
              scrollEventThrottle={16}
            >
              {images.map((img, idx) => (
                <Image
                  key={idx}
                  source={{ uri: img.src }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </Animated.View>

          {/* Image Indicators */}
          <View style={styles.imageIndicators}>
            {images.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.indicator,
                  currentImage === idx && styles.indicatorActive,
                ]}
              />
            ))}
          </View>

          {/* Wishlist Button */}
          <Animated.View
            style={[
              styles.wishlistBtn,
              { top: insets.top + spacing.sm, transform: [{ scale: wishlistAnim }] },
            ]}
          >
            <TouchableOpacity
              onPress={handleWishlistPress}
              style={[styles.wishlistTouchable, inWishlist && styles.wishlistActive]}
            >
              <Text style={styles.wishlistIcon}>{inWishlist ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Discount Badge */}
          {discount > 0 && (
            <LinearGradient
              colors={colors.gradientSale}
              style={[styles.discountBadge, { top: insets.top + spacing.sm }]}
            >
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </LinearGradient>
          )}
        </View>

        {/* Product Info Card */}
        <View style={styles.infoCard}>
          {/* Brand & Title */}
          <Text style={styles.brand}>{product.vendor || 'TNV Collection'}</Text>
          <Text style={styles.title}>{product.title}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Text key={star} style={styles.star}>⭐</Text>
              ))}
            </View>
            <Text style={styles.ratingText}>4.5</Text>
            <Text style={styles.reviewCount}>(128 reviews)</Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatPrice(price)}</Text>
            {comparePrice && (
              <>
                <Text style={styles.comparePrice}>{formatPrice(comparePrice)}</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>Save {formatPrice(comparePrice - price)}</Text>
                </View>
              </>
            )}
          </View>

          {/* Size Selector */}
          {sizeOption && (
            <View style={styles.optionSection}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>Select Size</Text>
                <TouchableOpacity onPress={() => setShowSizeGuide(true)}>
                  <Text style={styles.sizeGuideLink}>📏 Size Guide</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.optionGrid}>
                {sizeOption.values.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      style={[styles.sizeBtn, isSelected && styles.sizeBtnActive]}
                      onPress={() => setSelectedSize(size)}
                    >
                      <Text style={[styles.sizeBtnText, isSelected && styles.sizeBtnTextActive]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Color Selector */}
          {colorOption && (
            <View style={styles.optionSection}>
              <Text style={styles.optionTitle}>Select Color</Text>
              <View style={styles.colorGrid}>
                {colorOption.values.map((color) => {
                  const isSelected = selectedColor === color;
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorBtn, isSelected && styles.colorBtnActive]}
                      onPress={() => setSelectedColor(color)}
                    >
                      <View style={[styles.colorSwatch, { backgroundColor: color.toLowerCase() }]} />
                      <Text style={styles.colorName}>{color}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Quantity Selector */}
          <View style={styles.optionSection}>
            <Text style={styles.optionTitle}>Quantity</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.qtyDisplay}>
                <Text style={styles.qtyText}>{quantity}</Text>
              </View>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delivery Info */}
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryIcon}>🚚</Text>
              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryTitle}>Free Express Delivery</Text>
                <Text style={styles.deliverySubtitle}>
                  Get it by <Text style={styles.deliveryHighlight}>Tomorrow</Text>
                </Text>
              </View>
            </View>
            <View style={styles.deliveryDivider} />
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryIcon}>↩️</Text>
              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryTitle}>Easy 30 Days Return</Text>
                <Text style={styles.deliverySubtitle}>Free returns on all orders</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>Product Details</Text>
            <Text style={styles.descriptionText}>
              {product.body_html?.replace(/<[^>]*>/g, '') || 'Premium quality product from TNV Collection. Made with the finest materials for comfort and style.'}
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✨</Text>
              <Text style={styles.featureText}>Premium Quality</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🌿</Text>
              <Text style={styles.featureText}>Eco-Friendly</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🔒</Text>
              <Text style={styles.featureText}>Secure Payment</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>💯</Text>
              <Text style={styles.featureText}>Authentic</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.bottomPriceContainer}>
          <Text style={styles.bottomPriceLabel}>Total</Text>
          <Text style={styles.bottomPrice}>{formatPrice(price * quantity)}</Text>
        </View>
        <View style={styles.bottomButtons}>
          <AnimatedButton
            title={addedToCart ? "✓ Added!" : "Add to Bag"}
            onPress={handleAddToCart}
            variant={addedToCart ? "secondary" : "primary"}
            size="lg"
            fullWidth
            style={styles.addToCartBtn}
          />
        </View>
      </View>

      {/* Added to Cart Success Overlay */}
      <Animated.View
        style={[
          styles.successOverlay,
          {
            opacity: addToCartAnim,
            transform: [{
              translateY: addToCartAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.successContent}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>Added to bag!</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.h4,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: 24,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.semibold,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  backBtn: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
    width: 44,
    height: 44,
    backgroundColor: colors.white,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  backBtnText: {
    fontSize: 24,
    color: colors.text,
  },
  imageGalleryContainer: {
    height: IMAGE_HEIGHT,
    backgroundColor: colors.background,
  },
  imageGallery: {
    height: IMAGE_HEIGHT,
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorActive: {
    width: 24,
    backgroundColor: colors.white,
  },
  wishlistBtn: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 10,
  },
  wishlistTouchable: {
    width: 48,
    height: 48,
    backgroundColor: colors.white,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  wishlistActive: {
    backgroundColor: '#FFF0F3',
  },
  wishlistIcon: {
    fontSize: 24,
  },
  discountBadge: {
    position: 'absolute',
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  discountText: {
    color: colors.white,
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    marginTop: -borderRadius.xxl,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    ...shadows.lg,
  },
  brand: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: typography.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 28,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  stars: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 14,
  },
  ratingText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    marginLeft: spacing.sm,
  },
  reviewCount: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
  },
  comparePrice: {
    fontSize: typography.h4,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
    marginLeft: spacing.md,
  },
  saveBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.md,
  },
  saveText: {
    fontSize: typography.caption,
    color: colors.error,
    fontWeight: typography.semibold,
  },
  optionSection: {
    marginTop: spacing.xl,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  optionTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  sizeGuideLink: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sizeBtn: {
    minWidth: 60,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  sizeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  sizeBtnText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
    color: colors.text,
  },
  sizeBtnTextActive: {
    color: colors.white,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  colorBtn: {
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: borderRadius.lg,
  },
  colorBtnActive: {
    borderColor: colors.primary,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorName: {
    fontSize: typography.caption,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 24,
    fontWeight: typography.medium,
    color: colors.text,
  },
  qtyDisplay: {
    width: 60,
    alignItems: 'center',
  },
  qtyText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
  },
  deliveryCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  deliverySubtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  deliveryHighlight: {
    color: colors.success,
    fontWeight: typography.bold,
  },
  deliveryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  descriptionSection: {
    marginTop: spacing.xl,
  },
  descriptionTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  featureItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  featureText: {
    fontSize: typography.bodySmall,
    color: colors.text,
    fontWeight: typography.medium,
  },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomPriceContainer: {
    marginRight: spacing.lg,
  },
  bottomPriceLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  bottomPrice: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: colors.text,
  },
  bottomButtons: {
    flex: 1,
  },
  addToCartBtn: {
    flex: 1,
  },
  successOverlay: {
    position: 'absolute',
    bottom: 120,
    left: spacing.lg,
    right: spacing.lg,
  },
  successContent: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    ...shadows.lg,
  },
  successIcon: {
    fontSize: 20,
    color: colors.white,
    marginRight: spacing.sm,
  },
  successText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
});

export default ProductDetailScreen;
