/**
 * Search Screen
 * Product search with results
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
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

const SearchScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const initialQuery = route.params?.query || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([
    'Shoes', 'Dresses', 'Bags', 'Watches', 'Sports', 'Formal'
  ]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await api.searchProducts(searchQuery);
      setResults(res.products || []);
    } catch (e) {
      console.log('Search error:', e);
      // Fallback: filter from all products
      try {
        const allRes = await api.getProducts({ limit: 200 });
        const filtered = (allRes.products || []).filter(p =>
          p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setResults(filtered);
      } catch (err) {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (term) => {
    setSearchQuery(term);
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for products, brands..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoFocus={!initialQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : results.length > 0 ? (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {results.length} results for "{searchQuery}"
            </Text>
          </View>
          <FlatList
            data={results}
            numColumns={2}
            keyExtractor={(item) => item.shopify_product_id?.toString()}
            contentContainerStyle={styles.productsContainer}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <ProductCard product={item} style={{ width: PRODUCT_WIDTH }} />
            )}
          />
        </>
      ) : searchQuery ? (
        <View style={styles.noResults}>
          <Text style={styles.noResultsIcon}>🔍</Text>
          <Text style={styles.noResultsTitle}>No results found</Text>
          <Text style={styles.noResultsSubtitle}>
            Try searching with different keywords
          </Text>
        </View>
      ) : (
        <View style={styles.suggestions}>
          <Text style={styles.sectionTitle}>Popular Searches</Text>
          <View style={styles.tags}>
            {recentSearches.map((term, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.tag}
                onPress={() => handleQuickSearch(term)}
              >
                <Text style={styles.tagText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Trending Categories
          </Text>
          <View style={styles.categories}>
            {[
              { name: 'Shoes', emoji: '👟' },
              { name: 'Bags', emoji: '👜' },
              { name: 'Watches', emoji: '⌚' },
              { name: 'Jewelry', emoji: '💍' },
              { name: 'Sports', emoji: '🏃' },
              { name: 'Formal', emoji: '👔' },
            ].map((cat, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.categoryItem}
                onPress={() => handleQuickSearch(cat.name)}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearIcon: {
    fontSize: 16,
    color: '#999',
    padding: 4,
  },
  cancelBtn: {
    marginLeft: 12,
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
  },
  productsContainer: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  noResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noResultsIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  suggestions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 14,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    width: '30%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default SearchScreen;
