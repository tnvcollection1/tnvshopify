/**
 * Search Screen
 * Product search with results
 * Supports dark mode
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
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ProductCard from '../components/ProductCard';
import * as api from '../services/api';
import { spacing, borderRadius, typography } from '../theme';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48) / 2;

const SearchScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, statusBarStyle } = useTheme();
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={statusBarStyle} />
      
      {/* Search Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for products, brands..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoFocus={!initialQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearIcon, { color: colors.textTertiary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Searching...</Text>
        </View>
      ) : results.length > 0 ? (
        <>
          <View style={[styles.resultsHeader, { backgroundColor: colors.card }]}>
            <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
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
          <Text style={[styles.noResultsTitle, { color: colors.text }]}>No results found</Text>
          <Text style={[styles.noResultsSubtitle, { color: colors.textSecondary }]}>
            Try searching with different keywords
          </Text>
        </View>
      ) : (
        <View style={styles.suggestions}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Searches</Text>
          <View style={styles.tags}>
            {recentSearches.map((term, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.tag, { backgroundColor: colors.card }]}
                onPress={() => handleQuickSearch(term)}
              >
                <Text style={[styles.tagText, { color: colors.text }]}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: spacing.xl, color: colors.text }]}>
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
                style={[styles.categoryItem, { backgroundColor: colors.card }]}
                onPress={() => handleQuickSearch(cat.name)}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body,
    height: '100%',
  },
  clearIcon: {
    fontSize: 16,
    padding: spacing.xs,
  },
  cancelBtn: {
    marginLeft: spacing.md,
    padding: spacing.sm,
  },
  cancelText: {
    fontSize: typography.body,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
  },
  resultsHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultsCount: {
    fontSize: typography.bodySmall,
  },
  productsContainer: {
    padding: spacing.md,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  noResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  noResultsIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  noResultsTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
  },
  noResultsSubtitle: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  suggestions: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    marginBottom: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: typography.bodySmall,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryItem: {
    width: '30%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
  },
});

export default SearchScreen;
