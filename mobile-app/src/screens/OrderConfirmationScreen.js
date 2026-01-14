/**
 * Order Confirmation Screen
 * Shows order success after checkout
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../context/StoreContext';
import * as api from '../services/api';

const OrderConfirmationScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { formatPrice } = useStore();
  const { orderId } = route.params;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await api.getOrder(orderId);
      setOrder(res.order || res);
    } catch (e) {
      console.log('Error fetching order:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I just ordered from TNV Collection! Order ID: ${orderId}`,
      });
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  const timeline = [
    { status: 'confirmed', label: 'Order Confirmed', icon: '✓', active: true },
    { status: 'processing', label: 'Processing', icon: '📦', active: false },
    { status: 'shipped', label: 'Shipped', icon: '🚚', active: false },
    { status: 'delivered', label: 'Delivered', icon: '🏠', active: false },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.loading]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Thank you for your order. We'll send you a confirmation email shortly.
          </Text>
        </View>

        {/* Order ID */}
        <View style={styles.orderIdCard}>
          <Text style={styles.orderIdLabel}>Order ID</Text>
          <Text style={styles.orderId}>{orderId}</Text>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Order Status</Text>
          <View style={styles.timeline}>
            {timeline.map((step, idx) => (
              <View key={step.status} style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineIcon,
                    step.active && styles.timelineIconActive,
                  ]}
                >
                  <Text style={styles.timelineEmoji}>{step.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.timelineLabel,
                    step.active && styles.timelineLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
                {idx < timeline.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      step.active && styles.timelineLineActive,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Order Summary */}
        {order && (
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Order Summary</Text>
            {order.items?.map((item, idx) => (
              <View key={idx} style={styles.summaryItem}>
                <View style={styles.summaryItemInfo}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemVariant}>
                    {item.size && `Size: ${item.size}`}
                    {item.color && ` • Color: ${item.color}`}
                    {` • Qty: ${item.quantity}`}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  {formatPrice(item.price * item.quantity)}
                </Text>
              </View>
            ))}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(order.subtotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text
                style={[
                  styles.summaryValue,
                  order.deliveryFee === 0 && styles.freeDelivery,
                ]}
              >
                {order.deliveryFee === 0
                  ? 'FREE'
                  : formatPrice(order.deliveryFee)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
            </View>
          </View>
        )}

        {/* Shipping Info */}
        {order?.shipping_address && (
          <View style={styles.addressCard}>
            <Text style={styles.cardTitle}>Shipping Address</Text>
            <Text style={styles.addressName}>
              {order.customer?.firstName} {order.customer?.lastName}
            </Text>
            <Text style={styles.addressLine}>{order.shipping_address.address}</Text>
            <Text style={styles.addressLine}>
              {order.shipping_address.city}, {order.shipping_address.country}
            </Text>
            <Text style={styles.addressPhone}>{order.customer?.phone}</Text>
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.paymentCard}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.paymentMethod}>
            <Text style={styles.paymentIcon}>💵</Text>
            <Text style={styles.paymentLabel}>Cash on Delivery</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() =>
              navigation.navigate('OrderTracking', { orderId })
            }
          >
            <Text style={styles.trackBtnText}>Track Order</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            })
          }
        >
          <Text style={styles.continueBtnText}>Continue Shopping</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 40,
    color: '#fff',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  orderIdCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  orderIdLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  timelineCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    zIndex: 1,
  },
  timelineIconActive: {
    backgroundColor: '#22c55e',
  },
  timelineEmoji: {
    fontSize: 18,
  },
  timelineLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  timelineLabelActive: {
    color: '#000',
    fontWeight: '600',
  },
  timelineLine: {
    position: 'absolute',
    top: 20,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: '#eee',
    zIndex: 0,
  },
  timelineLineActive: {
    backgroundColor: '#22c55e',
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemVariant: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
  },
  freeDelivery: {
    color: '#22c55e',
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addressCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  paymentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentLabel: {
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  trackBtn: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  trackBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  continueBtnText: {
    fontSize: 16,
    color: '#666',
    textDecorationLine: 'underline',
  },
});

export default OrderConfirmationScreen;
