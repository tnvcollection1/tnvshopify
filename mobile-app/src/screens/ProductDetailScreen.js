/**
 * Enhanced Product Detail Screen
 * Beautiful product page with animations and modern design
 * Supports dark mode
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
import { useTheme } from '../context/ThemeContext';
import { addToCartHaptic, wishlistHaptic, selectionHaptic, lightHaptic } from '../services/haptics';
import AnimatedButton from '../components/AnimatedButton';
import Skeleton from '../components/SkeletonLoader';
import * as api from '../services/api';
import { borderRadius, typography, spacing, gradients } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.55;

const ProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { formatPrice, toggleWishlist, isInWishlist } = useStore();
  const { addToCart } = useCart();
  const { colors, shadows, isDark, statusBarStyle } = useTheme();
  
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
      // Trigger celebratory haptic
      addToCartHaptic();
      
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
    // Trigger heartbeat haptic
    wishlistHaptic();
    
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
  
  const handleSizeSelect = (size) => {
    selectionHaptic();
    setSelectedSize(size);
  };
  
  const handleColorSelect = (color) => {
    selectionHaptic();
    setSelectedColor(color);
  };
  
  const handleQuantityChange = (delta) => {
    lightHaptic();
    setQuantity(Math.max(1, quantity + delta));
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Product not found</Text>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity, paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{product.title}</Text>
          <TouchableOpacity style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: colors.text }]}>🔗</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Back Button (visible when header is transparent) */}
      <TouchableOpacity
        style={[styles.backBtn, shadows.lg, { top: insets.top + spacing.sm, backgroundColor: colors.surface }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
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
        <View style={[styles.imageGalleryContainer, { backgroundColor: colors.background }]}>
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
              style={[styles.wishlistTouchable, shadows.lg, { backgroundColor: colors.surface }, inWishlist && styles.wishlistActive]}
            >
              <Text style={styles.wishlistIcon}>{inWishlist ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Discount Badge */}
          {discount > 0 && (
            <LinearGradient
              colors={gradients.sale}
              style={[styles.discountBadge, { top: insets.top + spacing.sm }]}
            >
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </LinearGradient>
          )}
        </View>

        {/* Product Info Card */}
        <View style={[styles.infoCard, shadows.lg, { backgroundColor: colors.surface }]}>
          {/* Brand & Title */}
          <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.vendor || 'TNV Collection'}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{product.title}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Text key={star} style={styles.star}>⭐</Text>
              ))}
            </View>
            <Text style={[styles.ratingText, { color: colors.text }]}>4.5</Text>
            <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>(128 reviews)</Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: colors.text }]}>{formatPrice(price)}</Text>
            {comparePrice && (
              <>
                <Text style={[styles.comparePrice, { color: colors.textTertiary }]}>{formatPrice(comparePrice)}</Text>
                <View style={[styles.saveBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2' }]}>
                  <Text style={styles.saveText}>Save {formatPrice(comparePrice - price)}</Text>
                </View>
              </>
            )}
          </View>

          {/* Size Selector */}
          {sizeOption && (
            <View style={styles.optionSection}>
              <View style={styles.optionHeader}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Select Size</Text>
                <TouchableOpacity onPress={() => setShowSizeGuide(true)}>
                  <Text style={[styles.sizeGuideLink, { color: colors.textSecondary }]}>📏 Size Guide</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.optionGrid}>
                {sizeOption.values.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeBtn, 
                        { borderColor: colors.border },
                        isSelected && { borderColor: colors.primary, backgroundColor: colors.primary }
                      ]}
                      onPress={() => setSelectedSize(size)}
                    >
                      <Text style={[
                        styles.sizeBtnText, 
                        { color: colors.text },
                        isSelected && { color: colors.textInverse }
                      ]}>
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
              <Text style={[styles.optionTitle, { color: colors.text }]}>Select Color</Text>
              <View style={styles.colorGrid}>
                {colorOption.values.map((color) => {
                  const isSelected = selectedColor === color;
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorBtn,
                        isSelected && { borderColor: colors.primary }
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      <View style={[styles.colorSwatch, { backgroundColor: color.toLowerCase(), borderColor: colors.border }]} />
                      <Text style={[styles.colorName, { color: colors.textSecondary }]}>{color}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Quantity Selector */}
          <View style={styles.optionSection}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Quantity</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={[styles.qtyBtn, { borderColor: colors.border }]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Text style={[styles.qtyBtnText, { color: colors.text }]}>−</Text>
              </TouchableOpacity>
              <View style={styles.qtyDisplay}>
                <Text style={[styles.qtyText, { color: colors.text }]}>{quantity}</Text>
              </View>
              <TouchableOpacity
                style={[styles.qtyBtn, { borderColor: colors.border }]}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Text style={[styles.qtyBtnText, { color: colors.text }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delivery Info */}
          <View style={[styles.deliveryCard, { backgroundColor: colors.background }]}>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryIcon}>🚚</Text>
              <View style={styles.deliveryInfo}>
                <Text style={[styles.deliveryTitle, { color: colors.text }]}>Free Express Delivery</Text>
                <Text style={[styles.deliverySubtitle, { color: colors.textSecondary }]}>
                  Get it by <Text style={[styles.deliveryHighlight, { color: colors.success }]}>Tomorrow</Text>
                </Text>
              </View>
            </View>
            <View style={[styles.deliveryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryIcon}>↩️</Text>
              <View style={styles.deliveryInfo}>
                <Text style={[styles.deliveryTitle, { color: colors.text }]}>Easy 30 Days Return</Text>
                <Text style={[styles.deliverySubtitle, { color: colors.textSecondary }]}>Free returns on all orders</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={[styles.descriptionTitle, { color: colors.text }]}>Product Details</Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {product.body_html?.replace(/<[^>]*>/g, '') || 'Premium quality product from TNV Collection. Made with the finest materials for comfort and style.'}
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresGrid}>
            <View style={[styles.featureItem, { backgroundColor: colors.background }]}>
              <Text style={styles.featureIcon}>✨</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Premium Quality</Text>
            </View>
            <View style={[styles.featureItem, { backgroundColor: colors.background }]}>
              <Text style={styles.featureIcon}>🌿</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Eco-Friendly</Text>
            </View>
            <View style={[styles.featureItem, { backgroundColor: colors.background }]}>
              <Text style={styles.featureIcon}>🔒</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Secure Payment</Text>
            </View>
            <View style={[styles.featureItem, { backgroundColor: colors.background }]}>
              <Text style={styles.featureIcon}>💯</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Authentic</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.bottomPriceContainer}>
          <Text style={[styles.bottomPriceLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.bottomPrice, { color: colors.text }]}>{formatPrice(price * quantity)}</Text>
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
        <View style={[styles.successContent, shadows.lg, { backgroundColor: colors.success }]}>
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
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.h4,
    marginBottom: spacing.xl,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
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
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 24,
  },
  imageGalleryContainer: {
    height: IMAGE_HEIGHT,
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
    backgroundColor: '#FFFFFF',
  },
  wishlistBtn: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 10,
  },
  wishlistTouchable: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#FFFFFF',
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  infoCard: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    marginTop: -borderRadius.xxl,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  brand: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
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
  },
  comparePrice: {
    fontSize: typography.h4,
    textDecorationLine: 'line-through',
    marginLeft: spacing.md,
  },
  saveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.md,
  },
  saveText: {
    fontSize: typography.caption,
    color: '#EF4444',
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
  },
  sizeGuideLink: {
    fontSize: typography.bodySmall,
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
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  sizeBtnText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
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
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  colorName: {
    fontSize: typography.caption,
    marginTop: spacing.xs,
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
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 24,
    fontWeight: typography.medium,
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
  },
  deliverySubtitle: {
    fontSize: typography.bodySmall,
    marginTop: spacing.xs,
  },
  deliveryHighlight: {
    fontWeight: typography.bold,
  },
  deliveryDivider: {
    height: 1,
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
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  featureText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
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
  },
  bottomPrice: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  successIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginRight: spacing.sm,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
});

export default ProductDetailScreen;
