/**
 * Category Screen
 * Products filtered by category
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductCard from '../components/ProductCard';
import * as api from '../services/api';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48) / 2;

const CategoryScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { category } = route.params;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  // Category display info
  const categoryInfo = {
    women: { title: "Women's Fashion", emoji: '👗', banner: '#faf6f3' },
    men: { title: "Men's Fashion", emoji: '👔', banner: '#f3f6fa' },
    kids: { title: "Kids' Fashion", emoji: '🧒', banner: '#f6faf3' },
    sale: { title: 'Sale', emoji: '🔥', banner: '#faf3f3' },
    'new in': { title: 'New Arrivals', emoji: '✨', banner: '#f3faf6' },
    shoes: { title: 'Shoes', emoji: '👟', banner: '#f5f5f5' },
    bags: { title: 'Bags', emoji: '👜', banner: '#f5f5f5' },
    watches: { title: 'Watches', emoji: '⌚', banner: '#f5f5f5' },
    sports: { title: 'Sports', emoji: '🏃', banner: '#f5f5f5' },
    dresses: { title: 'Dresses', emoji: '👗', banner: '#faf6f3' },
  };

  const info = categoryInfo[category?.toLowerCase()] || {
    title: category?.charAt(0).toUpperCase() + category?.slice(1) || 'Products',
    emoji: '🛍️',
    banner: '#f5f5f5',
  };

  useEffect(() => {
    navigation.setOptions({ headerTitle: info.title });
    fetchProducts();
  }, [category, sortBy]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.getProducts({ limit: 100 });
      let prods = res.products || [];

      // Filter by category
      if (category && category !== 'all') {
        const cat = category.toLowerCase();
        prods = prods.filter((p) => {
          const title = p.title?.toLowerCase() || '';
          const vendor = p.vendor?.toLowerCase() || '';
          const tags = p.tags?.toLowerCase() || '';
          const productType = p.product_type?.toLowerCase() || '';

          if (cat === 'women') {
            return title.includes('women') || productType.includes('women');
          }
          if (cat === 'men') {
            return title.includes('men') || productType.includes('men');
          }
          if (cat === 'kids') {
            return title.includes('kid') || productType.includes('kid');
          }
          if (cat === 'sale') {
            return p.variants?.some(v => v.compare_at_price && v.price < v.compare_at_price);
          }
          if (cat === 'new in') {
            // Return first 20 products as "new"
            return true;
          }

          return (
            title.includes(cat) ||
            vendor.includes(cat) ||
            tags.includes(cat) ||
            productType.includes(cat)
          );
        });
      }

      // Sort
      switch (sortBy) {
        case 'price-low':
          prods.sort(
            (a, b) =>
              (a.variants?.[0]?.price || 0) - (b.variants?.[0]?.price || 0)
          );
          break;
        case 'price-high':
          prods.sort(
            (a, b) =>
              (b.variants?.[0]?.price || 0) - (a.variants?.[0]?.price || 0)
          );
          break;
        case 'name':
          prods.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
          break;
      }

      // Limit for "new in"
      if (category?.toLowerCase() === 'new in') {
        prods = prods.slice(0, 20);
      }

      setProducts(prods);
    } catch (e) {
      console.log('Error fetching category products:', e);
    } finally {
      setLoading(false);
    }
  };

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-low', label: 'Low-High' },
    { value: 'price-high', label: 'High-Low' },
    { value: 'name', label: 'A-Z' },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Category Banner */}
      <View style={[styles.banner, { backgroundColor: info.banner }]}>
        <Text style={styles.bannerEmoji}>{info.emoji}</Text>
        <Text style={styles.bannerTitle}>{info.title}</Text>
        <Text style={styles.bannerCount}>
          {loading ? '...' : `${products.length} products`}
        </Text>
      </View>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortOptions}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortBtn,
                sortBy === option.value && styles.sortBtnActive,
              ]}
              onPress={() => setSortBy(option.value)}
            >
              <Text
                style={[
                  styles.sortBtnText,
                  sortBy === option.value && styles.sortBtnTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Products */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtitle}>
            Check back later for new arrivals
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.shopify_product_id?.toString()}
          contentContainerStyle={styles.productsContainer}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <ProductCard product={item} style={{ width: PRODUCT_WIDTH }} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  banner: {
    padding: 24,
    alignItems: 'center',
  },
  bannerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerCount: {
    fontSize: 14,
    color: '#666',
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  sortOptions: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  sortBtnActive: {
    backgroundColor: '#000',
  },
  sortBtnText: {
    fontSize: 12,
    color: '#666',
  },
  sortBtnTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  productsContainer: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});

export default CategoryScreen;
