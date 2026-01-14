/**
 * Product Card Component
 * Displays product information in a card format
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../context/StoreContext';

const { width } = Dimensions.get('window');

const ProductCard = ({ product, horizontal, style }) => {
  const navigation = useNavigation();
  const { formatPrice, toggleWishlist, isInWishlist } = useStore();

  const image = product.images?.[0]?.src;
  const price = product.variants?.[0]?.price || product.price || 0;
  const comparePrice = product.variants?.[0]?.compare_at_price;
  const discount = comparePrice
    ? Math.round((1 - price / comparePrice) * 100)
    : 0;

  // Random delivery for demo
  const deliveryOptions = ['TODAY', 'TOMORROW'];
  const delivery = deliveryOptions[Math.floor(Math.random() * 2)];

  const handlePress = () => {
    navigation.navigate('ProductDetail', {
      productId: product.shopify_product_id,
    });
  };

  const cardStyle = horizontal
    ? [styles.containerHorizontal, style]
    : [styles.container, style];

  return (
    <TouchableOpacity style={cardStyle} onPress={handlePress} activeOpacity={0.9}>
      {/* Image */}
      <View style={horizontal ? styles.imageContainerH : styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {/* Discount Badge */}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}

        {/* Wishlist Button */}
        <TouchableOpacity
          style={styles.wishlistBtn}
          onPress={() => toggleWishlist(product)}
        >
          <Text style={styles.wishlistIcon}>
            {isInWishlist(product.shopify_product_id) ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.vendor || 'TNV Collection'}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(price)}</Text>
          {comparePrice && (
            <Text style={styles.comparePrice}>{formatPrice(comparePrice)}</Text>
          )}
          {discount > 0 && (
            <Text style={styles.discountLabel}>-{discount}%</Text>
          )}
        </View>

        <Text style={styles.delivery}>Free delivery</Text>
        <Text style={styles.eta}>
          GET IT{' '}
          <Text
            style={[
              styles.etaHighlight,
              delivery === 'TODAY' ? styles.etaToday : styles.etaTomorrow,
            ]}
          >
            {delivery}
          </Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  containerHorizontal: {
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    aspectRatio: 3 / 4,
    backgroundColor: '#f5f5f5',
  },
  imageContainerH: {
    width: 150,
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wishlistIcon: {
    fontSize: 16,
  },
  info: {
    padding: 10,
  },
  brand: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    minHeight: 32,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
  comparePrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  discountLabel: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  delivery: {
    fontSize: 11,
    color: '#666',
  },
  eta: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  etaHighlight: {
    fontWeight: 'bold',
  },
  etaToday: {
    color: '#22c55e',
  },
  etaTomorrow: {
    color: '#f97316',
  },
});

export default ProductCard;
