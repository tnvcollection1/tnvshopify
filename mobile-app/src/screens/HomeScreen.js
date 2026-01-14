/**
 * Home Screen
 * Main landing page with banners, categories, and products
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import CategoryCircle from '../components/CategoryCircle';
import PromoBanner from '../components/PromoBanner';
import * as api from '../services/api';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const bannerRef = useRef(null);

  const categories = [
    { name: 'New In', image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=200' },
    { name: 'Dresses', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200' },
    { name: 'Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200' },
    { name: 'Bags', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200' },
    { name: 'Sports', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200' },
    { name: 'Watches', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % banners.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [banners]);

  const fetchData = async () => {
    try {
      const [productsRes, bannersRes] = await Promise.all([
        api.getProducts({ limit: 20 }),
        api.getBanners(),
      ]);
      setProducts(productsRes.products || []);
      setBanners(bannersRes.banners || []);
    } catch (e) {
      console.log('Error fetching data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header showSearch />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Gender Selection Banner */}
        <View style={styles.genderBanner}>
          <TouchableOpacity
            style={[styles.genderCard, { backgroundColor: '#faf6f3' }]}
            onPress={() => navigation.navigate('Category', { category: 'women' })}
          >
            <Text style={styles.genderTitle}>WOMEN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderCard, { backgroundColor: '#f3f6fa' }]}
            onPress={() => navigation.navigate('Category', { category: 'men' })}
          >
            <Text style={styles.genderTitle}>MEN</Text>
          </TouchableOpacity>
        </View>

        {/* Promo Banner */}
        <PromoBanner
          title="30% CASHBACK"
          subtitle="On Sports Apparel & Footwear"
          code="SPORTS30"
          colors={['#10b981', '#14b8a6', '#06b6d4']}
        />

        {/* Category Circles */}
        <View style={styles.section}>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item.name}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
            renderItem={({ item }) => (
              <CategoryCircle
                name={item.name}
                image={item.image}
                onPress={() => navigation.navigate('Category', { category: item.name.toLowerCase() })}
              />
            )}
          />
        </View>

        {/* Today's Picks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Picks</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Browse')}>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={products.slice(0, 8)}
            keyExtractor={(item) => item.shopify_product_id?.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsContainer}
            renderItem={({ item }) => (
              <ProductCard product={item} horizontal />
            )}
          />
        </View>

        {/* Mega Sale Banner */}
        <PromoBanner
          title="MEGA SALE"
          subtitle="Up to 70% OFF"
          colors={['#f43f5e', '#ec4899', '#d946ef']}
          onPress={() => navigation.navigate('Category', { category: 'sale' })}
        />

        {/* New Arrivals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New Arrivals</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.productsGrid}>
            {products.slice(0, 6).map((product) => (
              <ProductCard
                key={product.shopify_product_id}
                product={product}
                style={styles.gridProduct}
              />
            ))}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  genderBanner: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  genderCard: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAll: {
    fontSize: 14,
    color: '#666',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  productsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  gridProduct: {
    width: (width - 48) / 2,
    marginHorizontal: 4,
    marginBottom: 12,
  },
});

export default HomeScreen;
