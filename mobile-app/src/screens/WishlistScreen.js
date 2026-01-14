/**
 * Wishlist Screen
 * Display user's saved items
 * Supports dark mode
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, StatusBar, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import { pullToRefreshHaptic } from '../services/haptics';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import { spacing, typography, borderRadius } from '../theme';

const { width } = Dimensions.get('window');

const WishlistScreen = () => {
  const insets = useSafeAreaInsets();
  const { wishlist, refreshWishlist } = useStore();
  const { colors, statusBarStyle } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    pullToRefreshHaptic();
    setRefreshing(true);
    if (refreshWishlist) {
      await refreshWishlist();
    }
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={statusBarStyle} />
      <Header title="Wishlist" />
      {wishlist.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>❤️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your wishlist is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Save items you love by tapping the heart icon
          </Text>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          numColumns={2}
          keyExtractor={(item) => item.shopify_product_id?.toString()}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <ProductCard product={item} style={{ width: (width - 48) / 2 }} />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  empty: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: { 
    fontSize: 64, 
    marginBottom: spacing.lg,
  },
  emptyTitle: { 
    fontSize: typography.h4, 
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  list: { 
    padding: spacing.md,
  },
  row: { 
    justifyContent: 'space-between', 
    marginBottom: spacing.md,
  },
});

export default WishlistScreen;
