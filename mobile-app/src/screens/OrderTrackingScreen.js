/**
 * Order Tracking Screen
 * Track order status and delivery
 * Supports dark mode
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import * as api from '../services/api';
import { spacing, borderRadius, typography } from '../theme';

const OrderTrackingScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, statusBarStyle, isDark } = useTheme();
  const { orderId } = route.params;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTracking();
  }, [orderId]);

  const fetchTracking = async () => {
    try {
      const res = await api.trackOrder(orderId);
      setOrder(res.order || res);
    } catch (e) {
      console.log('Error fetching tracking:', e);
      try {
        const orderRes = await api.getOrder(orderId);
        setOrder(orderRes.order || orderRes);
      } catch (err) {
        console.log('Fallback error:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTracking();
  };

  const getStatusSteps = () => {
    const allSteps = [
      { key: 'confirmed', label: 'Order Confirmed', description: 'We have received your order', icon: '✓' },
      { key: 'processing', label: 'Processing', description: 'Your order is being prepared', icon: '📦' },
      { key: 'shipped', label: 'Shipped', description: 'Your order is on the way', icon: '🚚' },
      { key: 'out_for_delivery', label: 'Out for Delivery', description: 'Your order will arrive today', icon: '🛵' },
      { key: 'delivered', label: 'Delivered', description: 'Order has been delivered', icon: '🏠' },
    ];

    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
    const currentStatus = order?.status || 'confirmed';
    const currentIndex = statusOrder.indexOf(currentStatus);

    return allSteps.map((step, idx) => {
      const stepIndex = statusOrder.indexOf(step.key);
      return {
        ...step,
        completed: stepIndex <= currentIndex,
        active: stepIndex === currentIndex,
      };
    });
  };

  const handleWhatsAppSupport = () => {
    const message = `Hi! I need help with my order ${orderId}`;
    const phone = '971501234567';
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <StatusBar barStyle={statusBarStyle} />
        <Header title="Order Tracking" />
        <View style={styles.loading}>
          <Text style={{ color: colors.textSecondary }}>Loading...</Text>
        </View>
      </View>
    );
  }

  const statusSteps = getStatusSteps();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      <StatusBar barStyle={statusBarStyle} />
      <Header title="Order Tracking" />
      
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Header */}
        <View style={[styles.orderHeader, { backgroundColor: colors.card }]}>
          <View>
            <Text style={[styles.orderLabel, { color: colors.textSecondary }]}>Order ID</Text>
            <Text style={[styles.orderId, { color: colors.text }]}>{orderId}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.statusText}>
              {order?.status?.replace(/_/g, ' ').toUpperCase() || 'CONFIRMED'}
            </Text>
          </View>
        </View>

        {/* Estimated Delivery */}
        <View style={[styles.deliveryCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.deliveryLabel}>Estimated Delivery</Text>
          <Text style={styles.deliveryDate}>
            {order?.estimated_delivery || '3-5 business days'}
          </Text>
          {order?.tracking_number && (
            <View style={styles.trackingInfo}>
              <Text style={styles.trackingLabel}>Tracking Number</Text>
              <Text style={styles.trackingNumber}>{order.tracking_number}</Text>
            </View>
          )}
        </View>

        {/* Status Timeline */}
        <View style={[styles.timelineCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Order Progress</Text>
          {statusSteps.map((step, idx) => (
            <View key={step.key} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineIcon,
                    { backgroundColor: colors.background },
                    step.completed && { backgroundColor: isDark ? colors.success + '30' : '#dcfce7' },
                    step.active && { backgroundColor: colors.success },
                  ]}
                >
                  <Text style={[
                    styles.timelineEmoji,
                    step.completed && { color: colors.success },
                    step.active && { color: '#FFFFFF' },
                  ]}>
                    {step.completed && !step.active ? '✓' : step.icon}
                  </Text>
                </View>
                {idx < statusSteps.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      { backgroundColor: colors.border },
                      step.completed && { backgroundColor: colors.success },
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[
                  styles.timelineLabel,
                  { color: colors.textTertiary },
                  step.completed && { color: colors.success },
                  step.active && { color: colors.text },
                ]}>
                  {step.label}
                </Text>
                <Text style={[styles.timelineDescription, { color: colors.textSecondary }]}>{step.description}</Text>
                {step.active && order?.status_updated_at && (
                  <Text style={[styles.timelineDate, { color: colors.textTertiary }]}>
                    {new Date(order.status_updated_at).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Courier Info */}
        {order?.courier && (
          <View style={[styles.courierCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Courier Information</Text>
            <View style={styles.courierInfo}>
              <View style={[styles.courierIcon, { backgroundColor: colors.background }]}>
                <Text style={styles.courierEmoji}>🚚</Text>
              </View>
              <View style={styles.courierDetails}>
                <Text style={[styles.courierName, { color: colors.text }]}>{order.courier}</Text>
                {order.tracking_number && (
                  <Text style={[styles.courierTracking, { color: colors.textSecondary }]}>
                    Tracking: {order.tracking_number}
                  </Text>
                )}
              </View>
              {order.courier_tracking_url && (
                <TouchableOpacity
                  style={[styles.trackCourierBtn, { backgroundColor: colors.primary }]}
                  onPress={() => Linking.openURL(order.courier_tracking_url)}
                >
                  <Text style={[styles.trackCourierText, { color: colors.textInverse }]}>Track</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Shipping Address */}
        {order?.shipping_address && (
          <View style={[styles.addressCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Delivery Address</Text>
            <Text style={[styles.addressName, { color: colors.text }]}>
              {order.customer?.firstName} {order.customer?.lastName}
            </Text>
            <Text style={[styles.addressLine, { color: colors.textSecondary }]}>{order.shipping_address.address}</Text>
            <Text style={[styles.addressLine, { color: colors.textSecondary }]}>
              {order.shipping_address.city}, {order.shipping_address.country}
            </Text>
          </View>
        )}

        {/* Help Section */}
        <View style={[styles.helpCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.helpTitle, { color: colors.text }]}>Need Help?</Text>
          <Text style={[styles.helpSubtitle, { color: colors.textSecondary }]}>
            Our support team is here to assist you
          </Text>
          <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsAppSupport}>
            <Text style={styles.whatsappEmoji}>💬</Text>
            <Text style={styles.whatsappText}>Chat on WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  orderLabel: {
    fontSize: typography.caption,
    marginBottom: spacing.xs,
  },
  orderId: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: typography.caption,
    fontWeight: typography.bold,
  },
  deliveryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  deliveryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.bodySmall,
    marginBottom: spacing.xs,
  },
  deliveryDate: {
    color: '#FFFFFF',
    fontSize: typography.h4,
    fontWeight: typography.bold,
  },
  trackingInfo: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  trackingLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.caption,
    marginBottom: spacing.xs,
  },
  trackingNumber: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontFamily: 'monospace',
  },
  timelineCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    marginBottom: spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineEmoji: {
    fontSize: 18,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  timelineLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
  },
  timelineDescription: {
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  timelineDate: {
    fontSize: typography.tiny,
    marginTop: spacing.xs,
  },
  courierCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  courierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courierIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  courierEmoji: {
    fontSize: 24,
  },
  courierDetails: {
    flex: 1,
  },
  courierName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  courierTracking: {
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  trackCourierBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  trackCourierText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
  },
  addressCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  addressName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  addressLine: {
    fontSize: typography.bodySmall,
    marginBottom: spacing.xs,
  },
  helpCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  helpTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  helpSubtitle: {
    fontSize: typography.bodySmall,
    marginBottom: spacing.lg,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  whatsappEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  whatsappText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
});

export default OrderTrackingScreen;
