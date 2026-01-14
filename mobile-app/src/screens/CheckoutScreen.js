/**
 * Checkout Screen
 * Multi-step checkout flow
 * Supports dark mode
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import * as api from '../services/api';
import { spacing, borderRadius, typography } from '../theme';

const CheckoutScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { cart, cartTotal, clearCart } = useCart();
  const { formatPrice } = useStore();
  const { colors, statusBarStyle } = useTheme();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', country: 'UAE',
    paymentMethod: 'cod'
  });

  const deliveryFee = cartTotal >= 500 ? 0 : 50;
  const total = cartTotal + deliveryFee;

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const orderData = {
        customer: { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone },
        shipping_address: { address: form.address, city: form.city, country: form.country },
        items: cart.map(item => ({
          productId: item.productId, variantId: item.variantId, title: item.title,
          price: item.price, quantity: item.quantity, size: item.size, color: item.color
        })),
        subtotal: cartTotal, deliveryFee, total,
        paymentMethod: form.paymentMethod, currency: 'AED'
      };

      const res = await api.createOrder(orderData);
      clearCart();
      navigation.replace('OrderConfirmation', { orderId: res.order_id });
    } catch (e) {
      alert('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      <StatusBar barStyle={statusBarStyle} />
      
      {/* Progress */}
      <View style={[styles.progress, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {['Shipping', 'Payment', 'Review'].map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[
              styles.progressDot, 
              { backgroundColor: colors.border },
              step > i && { backgroundColor: colors.primary }
            ]} />
            <Text style={[
              styles.progressLabel, 
              { color: colors.textTertiary },
              step > i && { color: colors.text }
            ]}>{s}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {step === 1 && (
          <View style={[styles.form, { backgroundColor: colors.card }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Shipping Address</Text>
            <View style={styles.row}>
              <TextInput 
                style={[styles.input, styles.halfInput, { backgroundColor: colors.background, color: colors.text }]} 
                placeholder="First Name" 
                placeholderTextColor={colors.textTertiary}
                value={form.firstName} 
                onChangeText={v => setForm({...form, firstName: v})} 
              />
              <TextInput 
                style={[styles.input, styles.halfInput, { backgroundColor: colors.background, color: colors.text }]} 
                placeholder="Last Name" 
                placeholderTextColor={colors.textTertiary}
                value={form.lastName} 
                onChangeText={v => setForm({...form, lastName: v})} 
              />
            </View>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} 
              placeholder="Email" 
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address" 
              value={form.email} 
              onChangeText={v => setForm({...form, email: v})} 
            />
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} 
              placeholder="Phone" 
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad" 
              value={form.phone} 
              onChangeText={v => setForm({...form, phone: v})} 
            />
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} 
              placeholder="Address" 
              placeholderTextColor={colors.textTertiary}
              value={form.address} 
              onChangeText={v => setForm({...form, address: v})} 
            />
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} 
              placeholder="City" 
              placeholderTextColor={colors.textTertiary}
              value={form.city} 
              onChangeText={v => setForm({...form, city: v})} 
            />
          </View>
        )}

        {step === 2 && (
          <View style={[styles.form, { backgroundColor: colors.card }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Payment Method</Text>
            {['cod', 'card'].map(method => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentOption, 
                  { borderColor: colors.border },
                  form.paymentMethod === method && { borderColor: colors.primary, backgroundColor: colors.background }
                ]}
                onPress={() => setForm({...form, paymentMethod: method})}
              >
                <Text style={styles.paymentIcon}>{method === 'cod' ? '💵' : '💳'}</Text>
                <Text style={[styles.paymentLabel, { color: colors.text }]}>
                  {method === 'cod' ? 'Cash on Delivery' : 'Credit/Debit Card'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 3 && (
          <View style={[styles.form, { backgroundColor: colors.card }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Order Summary</Text>
            <View style={styles.summaryItem}>
              <Text style={{ color: colors.textSecondary }}>Subtotal</Text>
              <Text style={{ color: colors.text }}>{formatPrice(cartTotal)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={{ color: colors.textSecondary }}>Delivery</Text>
              <Text style={{ color: deliveryFee === 0 ? colors.success : colors.text }}>
                {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
              </Text>
            </View>
            <View style={[styles.summaryItem, styles.totalItem, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>{formatPrice(total)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {step > 1 && (
          <TouchableOpacity 
            style={[styles.backBtn, { borderColor: colors.primary }]} 
            onPress={() => setStep(step - 1)}
          >
            <Text style={[styles.backBtnText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primary }, step > 1 && { flex: 1 }]}
          onPress={() => step < 3 ? setStep(step + 1) : handlePlaceOrder()}
          disabled={loading}
        >
          <Text style={[styles.nextBtnText, { color: colors.textInverse }]}>
            {loading ? 'Processing...' : step < 3 ? 'Continue' : `Place Order - ${formatPrice(total)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  progress: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    padding: spacing.lg, 
    borderBottomWidth: 1,
  },
  progressItem: { 
    alignItems: 'center', 
    marginHorizontal: spacing.xl,
  },
  progressDot: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    marginBottom: spacing.xs,
  },
  progressLabel: { 
    fontSize: typography.caption,
  },
  content: { 
    flex: 1,
  },
  form: { 
    margin: spacing.lg, 
    padding: spacing.lg, 
    borderRadius: borderRadius.lg,
  },
  formTitle: { 
    fontSize: typography.h4, 
    fontWeight: typography.bold, 
    marginBottom: spacing.lg,
  },
  row: { 
    flexDirection: 'row', 
    gap: spacing.md,
  },
  input: { 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.md, 
    borderRadius: borderRadius.md, 
    fontSize: typography.body, 
    marginBottom: spacing.md,
  },
  halfInput: { 
    flex: 1,
  },
  paymentOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing.lg, 
    borderWidth: 2, 
    borderRadius: borderRadius.lg, 
    marginBottom: spacing.md,
  },
  paymentIcon: { 
    fontSize: 24, 
    marginRight: spacing.md,
  },
  paymentLabel: { 
    fontSize: typography.body, 
    fontWeight: typography.medium,
  },
  summaryItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: spacing.sm,
  },
  totalItem: { 
    borderTopWidth: 1, 
    marginTop: spacing.sm, 
    paddingTop: spacing.lg,
  },
  totalLabel: { 
    fontSize: typography.h4, 
    fontWeight: typography.bold,
  },
  totalValue: { 
    fontSize: typography.h3, 
    fontWeight: typography.bold,
  },
  footer: { 
    flexDirection: 'row', 
    padding: spacing.lg, 
    borderTopWidth: 1, 
    gap: spacing.md,
  },
  backBtn: { 
    paddingVertical: spacing.lg, 
    paddingHorizontal: spacing.xl, 
    borderWidth: 2, 
    borderRadius: borderRadius.full,
  },
  backBtnText: { 
    fontSize: typography.body, 
    fontWeight: typography.bold,
  },
  nextBtn: { 
    flex: 2, 
    paddingVertical: spacing.lg, 
    borderRadius: borderRadius.full, 
    alignItems: 'center',
  },
  nextBtnText: { 
    fontSize: typography.body, 
    fontWeight: typography.bold,
  },
});

export default CheckoutScreen;
