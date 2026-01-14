// CheckoutScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import * as api from '../services/api';

const CheckoutScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { cart, cartTotal, clearCart } = useCart();
  const { formatPrice } = useStore();
  
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
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Progress */}
      <View style={styles.progress}>
        {['Shipping', 'Payment', 'Review'].map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[styles.progressDot, step > i && styles.progressDotActive]} />
            <Text style={[styles.progressLabel, step > i && styles.progressLabelActive]}>{s}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {step === 1 && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Shipping Address</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.halfInput]} placeholder="First Name" value={form.firstName} onChangeText={v => setForm({...form, firstName: v})} />
              <TextInput style={[styles.input, styles.halfInput]} placeholder="Last Name" value={form.lastName} onChangeText={v => setForm({...form, lastName: v})} />
            </View>
            <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" value={form.email} onChangeText={v => setForm({...form, email: v})} />
            <TextInput style={styles.input} placeholder="Phone" keyboardType="phone-pad" value={form.phone} onChangeText={v => setForm({...form, phone: v})} />
            <TextInput style={styles.input} placeholder="Address" value={form.address} onChangeText={v => setForm({...form, address: v})} />
            <TextInput style={styles.input} placeholder="City" value={form.city} onChangeText={v => setForm({...form, city: v})} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Payment Method</Text>
            {['cod', 'card'].map(method => (
              <TouchableOpacity
                key={method}
                style={[styles.paymentOption, form.paymentMethod === method && styles.paymentOptionActive]}
                onPress={() => setForm({...form, paymentMethod: method})}
              >
                <Text style={styles.paymentIcon}>{method === 'cod' ? '💵' : '💳'}</Text>
                <Text style={styles.paymentLabel}>
                  {method === 'cod' ? 'Cash on Delivery' : 'Credit/Debit Card'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Order Summary</Text>
            <View style={styles.summaryItem}>
              <Text>Subtotal</Text><Text>{formatPrice(cartTotal)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text>Delivery</Text><Text>{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</Text>
            </View>
            <View style={[styles.summaryItem, styles.totalItem]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, step > 1 && { flex: 1 }]}
          onPress={() => step < 3 ? setStep(step + 1) : handlePlaceOrder()}
          disabled={loading}
        >
          <Text style={styles.nextBtnText}>
            {loading ? 'Processing...' : step < 3 ? 'Continue' : `Place Order - ${formatPrice(total)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  progress: { flexDirection: 'row', justifyContent: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  progressItem: { alignItems: 'center', marginHorizontal: 20 },
  progressDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ddd', marginBottom: 4 },
  progressDotActive: { backgroundColor: '#000' },
  progressLabel: { fontSize: 12, color: '#999' },
  progressLabelActive: { color: '#000', fontWeight: '600' },
  content: { flex: 1 },
  form: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12 },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  input: { backgroundColor: '#f5f5f5', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 8, fontSize: 16, marginBottom: 12 },
  halfInput: { flex: 1 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 2, borderColor: '#eee', borderRadius: 12, marginBottom: 12 },
  paymentOptionActive: { borderColor: '#000', backgroundColor: '#f8f8f8' },
  paymentIcon: { fontSize: 24, marginRight: 12 },
  paymentLabel: { fontSize: 16, fontWeight: '500' },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  totalItem: { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 8, paddingTop: 16 },
  totalLabel: { fontSize: 18, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold' },
  footer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', gap: 12 },
  backBtn: { paddingVertical: 16, paddingHorizontal: 24, borderWidth: 2, borderColor: '#000', borderRadius: 30 },
  backBtnText: { fontSize: 16, fontWeight: 'bold' },
  nextBtn: { flex: 2, backgroundColor: '#000', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default CheckoutScreen;
