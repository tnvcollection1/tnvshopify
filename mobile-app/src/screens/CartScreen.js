/**
 * Cart Screen
 * Shopping bag with items and checkout
 * Supports dark mode
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { spacing, borderRadius, typography } from '../theme';

const CartScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { cart, cartTotal, removeFromCart, updateQuantity } = useCart();
  const { formatPrice } = useStore();
  const { colors, shadows, statusBarStyle } = useTheme();

  const deliveryFee = cartTotal >= 500 ? 0 : 50;
  const total = cartTotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <StatusBar barStyle={statusBarStyle} />
        <Header title="Shopping Bag" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your bag is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Looks like you haven't added anything yet
          </Text>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.shopBtnText, { color: colors.textInverse }]}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={statusBarStyle} />
      <Header title={`Shopping Bag (${cart.length})`} />

      <ScrollView style={styles.content}>
        {/* Cart Items */}
        {cart.map((item, idx) => (
          <View key={`${item.productId}-${item.variantId}`} style={[styles.cartItem, { backgroundColor: colors.card }, shadows.sm]}>
            <Image
              source={{ uri: item.image }}
              style={[styles.itemImage, { backgroundColor: colors.background }]}
              resizeMode="cover"
            />
            <View style={styles.itemInfo}>
              <Text style={[styles.itemBrand, { color: colors.textSecondary }]}>TNV Collection</Text>
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.itemVariants}>
                {item.size && (
                  <Text style={[styles.variant, { backgroundColor: colors.background, color: colors.textSecondary }]}>Size: {item.size}</Text>
                )}
                {item.color && (
                  <Text style={[styles.variant, { backgroundColor: colors.background, color: colors.textSecondary }]}>Color: {item.color}</Text>
                )}
              </View>
              <View style={styles.itemActions}>
                <View style={[styles.quantityContainer, { borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() =>
                      updateQuantity(item.productId, item.variantId, item.quantity - 1)
                    }
                  >
                    <Text style={[styles.qtyBtnText, { color: colors.text }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.quantity, { color: colors.text }]}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() =>
                      updateQuantity(item.productId, item.variantId, item.quantity + 1)
                    }
                  >
                    <Text style={[styles.qtyBtnText, { color: colors.text }]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.itemPrice, { color: colors.text }]}>
                  {formatPrice(item.price * item.quantity)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeFromCart(item.productId, item.variantId)}
            >
              <Text style={styles.removeIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Order Summary */}
      <View style={[styles.summary, { paddingBottom: insets.bottom + 16, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{formatPrice(cartTotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Delivery</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: colors.text },
              deliveryFee === 0 && styles.freeDelivery,
            ]}
          >
            {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>{formatPrice(total)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={[styles.checkoutBtnText, { color: colors.textInverse }]}>Checkout →</Text>
        </TouchableOpacity>

        <View style={styles.trustBadges}>
          <Text style={[styles.trustBadge, { color: colors.textSecondary }]}>🚚 Free delivery over ₹500</Text>
          <Text style={[styles.trustBadge, { color: colors.textSecondary }]}>🔒 Secure checkout</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
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
    marginBottom: spacing.xl,
  },
  shopBtn: {
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  shopBtnText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
  content: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  itemImage: {
    width: 80,
    height: 100,
    borderRadius: borderRadius.md,
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemBrand: {
    fontSize: typography.tiny,
  },
  itemTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
    marginTop: 2,
  },
  itemVariants: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  variant: {
    fontSize: typography.tiny,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: typography.medium,
  },
  quantity: {
    width: 32,
    textAlign: 'center',
    fontWeight: typography.semibold,
  },
  itemPrice: {
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
  removeBtn: {
    padding: spacing.xs,
  },
  removeIcon: {
    fontSize: 18,
  },
  summary: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.bodySmall,
  },
  summaryValue: {
    fontSize: typography.bodySmall,
  },
  freeDelivery: {
    color: '#22c55e',
    fontWeight: typography.semibold,
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
  totalValue: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
  },
  checkoutBtn: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  checkoutBtnText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  trustBadge: {
    fontSize: typography.tiny,
  },
});

export default CartScreen;
