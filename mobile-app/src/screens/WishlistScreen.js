// Placeholder screens - Implement based on specifications

// WishlistScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../context/StoreContext';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import { FlatList, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const WishlistScreen = () => {
  const insets = useSafeAreaInsets();
  const { wishlist } = useStore();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Wishlist" />
      {wishlist.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>❤️</Text>
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          numColumns={2}
          keyExtractor={(item) => item.shopify_product_id?.toString()}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <ProductCard product={item} style={{ width: (width - 48) / 2 }} />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold' },
  list: { padding: 12 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
});

export default WishlistScreen;
