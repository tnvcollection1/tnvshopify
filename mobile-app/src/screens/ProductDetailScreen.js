// ProductDetailScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import * as api from '../services/api';

const { width } = Dimensions.get('window');

const ProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { formatPrice, toggleWishlist, isInWishlist } = useStore();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await api.getProduct(productId);
      setProduct(res.product || res);
      if (res.product?.variants?.[0] || res.variants?.[0]) {
        setSelectedVariant((res.product || res).variants[0]);
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
      // Show confirmation or navigate to cart
    }
  };

  if (loading || !product) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const images = product.images || [];
  const price = selectedVariant?.price || product.price || 0;
  const comparePrice = selectedVariant?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Image Gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
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

        {/* Image Dots */}
        <View style={styles.dots}>
          {images.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, currentImage === idx && styles.dotActive]}
            />
          ))}
        </View>

        {/* Wishlist Button */}
        <TouchableOpacity
          style={styles.wishlistBtn}
          onPress={() => toggleWishlist(product)}
        >
          <Text style={styles.wishlistIcon}>
            {isInWishlist(product.shopify_product_id) ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>

        {/* Product Info */}
        <View style={styles.info}>
          <Text style={styles.brand}>{product.vendor || 'TNV Collection'}</Text>
          <Text style={styles.title}>{product.title}</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(price)}</Text>
            {comparePrice && (
              <Text style={styles.comparePrice}>{formatPrice(comparePrice)}</Text>
            )}
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
          </View>

          {/* Size Selector */}
          {product.options?.find(o => o.name.toLowerCase() === 'size') && (
            <View style={styles.optionSection}>
              <Text style={styles.optionTitle}>Size</Text>
              <View style={styles.optionRow}>
                {product.options.find(o => o.name.toLowerCase() === 'size').values.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.optionBtn,
                      selectedVariant?.option1 === size && styles.optionBtnActive,
                    ]}
                  >
                    <Text style={selectedVariant?.option1 === size ? styles.optionTextActive : styles.optionText}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quantity */}
          <View style={styles.optionSection}>
            <Text style={styles.optionTitle}>Quantity</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.quantity}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delivery Info */}
          <View style={styles.deliveryInfo}>
            <Text style={styles.deliveryIcon}>🚚</Text>
            <View>
              <Text style={styles.deliveryTitle}>Free Delivery</Text>
              <Text style={styles.deliverySubtitle}>Get it by Tomorrow</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.description}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {product.body_html?.replace(/<[^>]*>/g, '') || 'No description available.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart}>
          <Text style={styles.addToCartText}>Add to Bag - {formatPrice(price * quantity)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  productImage: { width, height: width * 1.2 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd', marginHorizontal: 4 },
  dotActive: { backgroundColor: '#000' },
  wishlistBtn: { position: 'absolute', top: 16, right: 16, width: 44, height: 44, backgroundColor: '#fff', borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  wishlistIcon: { fontSize: 22 },
  info: { padding: 16 },
  brand: { fontSize: 14, color: '#666', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  price: { fontSize: 24, fontWeight: 'bold', marginRight: 12 },
  comparePrice: { fontSize: 18, color: '#999', textDecorationLine: 'line-through', marginRight: 12 },
  discountBadge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  discountText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  optionSection: { marginBottom: 20 },
  optionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  optionBtnActive: { borderColor: '#000', backgroundColor: '#000' },
  optionText: { fontSize: 14 },
  optionTextActive: { color: '#fff' },
  quantityRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 44, height: 44, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 20, fontWeight: '500' },
  quantity: { width: 60, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  deliveryInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', padding: 16, borderRadius: 12, marginBottom: 20 },
  deliveryIcon: { fontSize: 28, marginRight: 12 },
  deliveryTitle: { fontSize: 14, fontWeight: '600' },
  deliverySubtitle: { fontSize: 12, color: '#22c55e' },
  description: { marginBottom: 20 },
  descriptionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  descriptionText: { fontSize: 14, color: '#666', lineHeight: 22 },
  bottomCta: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  addToCartBtn: { backgroundColor: '#000', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  addToCartText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ProductDetailScreen;
