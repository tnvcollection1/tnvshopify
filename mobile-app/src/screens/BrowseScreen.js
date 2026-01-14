/**
 * Browse Screen
 * Product listing with filters
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import * as api from '../services/api';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48) / 2;

const BrowseScreen = () => {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Browse" showSearch />

      {/* Sort & Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFilterVisible(true)}
        >
          <Text>🔧</Text>
          <Text style={styles.filterBtnText}>Filter</Text>
        </TouchableOpacity>

        <View style={styles.sortContainer}>
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
              <Text>Loading...</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text>No products found</Text>
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
        <View style={styles.filterModal}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setFilterVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* Size Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Size</Text>
              <View style={styles.filterOptions}>
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                  <TouchableOpacity key={size} style={styles.filterOption}>
                    <Text>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.filterOptions}>
                {['Under 100', '100-300', '300-500', '500+'].map((range) => (
                  <TouchableOpacity key={range} style={styles.filterOption}>
                    <Text>AED {range}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterFooter}>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setFilterVisible(false)}
            >
              <Text style={styles.applyBtnText}>Apply Filters</Text>
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
    backgroundColor: '#f5f5f5',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 12,
  },
  filterBtnText: {
    marginLeft: 6,
    fontSize: 14,
  },
  sortContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
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
  productsContainer: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
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
    backgroundColor: '#fff',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    fontSize: 20,
    color: '#666',
  },
  filterContent: {
    flex: 1,
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  applyBtn: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BrowseScreen;
