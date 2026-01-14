/**
 * Browse Screen
 * Product listing with filters
 * Supports dark mode
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { pullToRefreshHaptic, successHaptic, selectionHaptic, lightHaptic } from '../services/haptics';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import * as api from '../services/api';
import { spacing, borderRadius, typography } from '../theme';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48) / 2;

const BrowseScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors, statusBarStyle } = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [gridCols, setGridCols] = useState(2);

  useEffect(() => {
    fetchProducts();
  }, [sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts({ limit: 48 });
      let prods = res.products || [];

      // Sort
      switch (sortBy) {
        case 'price-low':
          prods.sort((a, b) => 
            (a.variants?.[0]?.price || 0) - (b.variants?.[0]?.price || 0)
          );
          break;
        case 'price-high':
          prods.sort((a, b) => 
            (b.variants?.[0]?.price || 0) - (a.variants?.[0]?.price || 0)
          );
          break;
      }

      setProducts(prods);
    } catch (e) {
      console.log('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={statusBarStyle} />
      <Header title="Browse" showSearch />

      {/* Sort & Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: colors.background }]}
          onPress={() => setFilterVisible(true)}
        >
          <Text>🔧</Text>
          <Text style={[styles.filterBtnText, { color: colors.text }]}>Filter</Text>
        </TouchableOpacity>

        <View style={styles.sortContainer}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortBtn,
                { backgroundColor: colors.background },
                sortBy === option.value && { backgroundColor: colors.primary },
              ]}
              onPress={() => setSortBy(option.value)}
            >
              <Text
                style={[
                  styles.sortBtnText,
                  { color: colors.textSecondary },
                  sortBy === option.value && { color: colors.textInverse },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Products Grid */}
      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(item) => item.shopify_product_id?.toString()}
        contentContainerStyle={styles.productsContainer}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <ProductCard product={item} style={{ width: PRODUCT_WIDTH }} />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <Text style={{ color: colors.textSecondary }}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={{ color: colors.textSecondary }}>No products found</Text>
            </View>
          )
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.filterModal, { backgroundColor: colors.surface }]}>
          <View style={[styles.filterHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Filters</Text>
            <TouchableOpacity onPress={() => setFilterVisible(false)}>
              <Text style={[styles.closeBtn, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* Size Filter */}
            <View style={[styles.filterSection, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Size</Text>
              <View style={styles.filterOptions}>
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                  <TouchableOpacity 
                    key={size} 
                    style={[styles.filterOption, { backgroundColor: colors.background }]}
                  >
                    <Text style={{ color: colors.text }}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Filter */}
            <View style={[styles.filterSection, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Price Range</Text>
              <View style={styles.filterOptions}>
                {['Under 100', '100-300', '300-500', '500+'].map((range) => (
                  <TouchableOpacity 
                    key={range} 
                    style={[styles.filterOption, { backgroundColor: colors.background }]}
                  >
                    <Text style={{ color: colors.text }}>₹{range}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.filterFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setFilterVisible(false)}
            >
              <Text style={[styles.applyBtnText, { color: colors.textInverse }]}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.md,
  },
  filterBtnText: {
    marginLeft: spacing.sm,
    fontSize: typography.bodySmall,
  },
  sortContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sortBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  sortBtnText: {
    fontSize: typography.caption,
  },
  productsContainer: {
    padding: spacing.md,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  loading: {
    padding: 40,
    alignItems: 'center',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  filterModal: {
    flex: 1,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  filterTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
  },
  closeBtn: {
    fontSize: 20,
  },
  filterContent: {
    flex: 1,
  },
  filterSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  filterSectionTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginBottom: spacing.md,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  filterFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  applyBtn: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
});

export default BrowseScreen;
