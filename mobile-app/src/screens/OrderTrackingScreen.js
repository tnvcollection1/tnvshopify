/**
 * Order Tracking Screen
 * Track order status and delivery
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
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../services/api';

const OrderTrackingScreen = () => {
  const route = useRoute();
  const insets = useSafeAreaInsets();
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
      // Try regular order fetch as fallback
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
      {
        key: 'confirmed',
        label: 'Order Confirmed',
        description: 'We have received your order',
        icon: '✓',
      },
      {
        key: 'processing',
        label: 'Processing',
        description: 'Your order is being prepared',
        icon: '📦',
      },
      {
        key: 'shipped',
        label: 'Shipped',
        description: 'Your order is on the way',
        icon: '🚚',
      },
      {
        key: 'out_for_delivery',
        label: 'Out for Delivery',
        description: 'Your order will arrive today',
        icon: '🛵',
      },
      {
        key: 'delivered',
        label: 'Delivered',
        description: 'Order has been delivered',
        icon: '🏠',
      },
    ];

    const statusOrder = [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
    ];
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
    const phone = '971501234567'; // Replace with actual support number
    Linking.openURL(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loading]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const statusSteps = getStatusSteps();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderLabel}>Order ID</Text>
            <Text style={styles.orderId}>{orderId}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {order?.status?.replace(/_/g, ' ').toUpperCase() || 'CONFIRMED'}
            </Text>
          </View>
        </View>

        {/* Estimated Delivery */}
        <View style={styles.deliveryCard}>
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
        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Order Progress</Text>
          {statusSteps.map((step, idx) => (
            <View key={step.key} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineIcon,
                    step.completed && styles.timelineIconCompleted,
                    step.active && styles.timelineIconActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.timelineEmoji,
                      step.completed && styles.timelineEmojiCompleted,
                    ]}
                  >
                    {step.completed && !step.active ? '✓' : step.icon}
                  </Text>
                </View>
                {idx < statusSteps.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      step.completed && styles.timelineLineCompleted,
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineLabel,
                    step.completed && styles.timelineLabelCompleted,
                    step.active && styles.timelineLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
                <Text style={styles.timelineDescription}>{step.description}</Text>
                {step.active && order?.status_updated_at && (
                  <Text style={styles.timelineDate}>
                    {new Date(order.status_updated_at).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Courier Info */}
        {order?.courier && (
          <View style={styles.courierCard}>
            <Text style={styles.cardTitle}>Courier Information</Text>
            <View style={styles.courierInfo}>
              <View style={styles.courierIcon}>
                <Text style={styles.courierEmoji}>🚚</Text>
              </View>
              <View style={styles.courierDetails}>
                <Text style={styles.courierName}>{order.courier}</Text>
                {order.tracking_number && (
                  <Text style={styles.courierTracking}>
                    Tracking: {order.tracking_number}
                  </Text>
                )}
              </View>
              {order.courier_tracking_url && (
                <TouchableOpacity
                  style={styles.trackCourierBtn}
                  onPress={() => Linking.openURL(order.courier_tracking_url)}
                >
                  <Text style={styles.trackCourierText}>Track</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Shipping Address */}
        {order?.shipping_address && (
          <View style={styles.addressCard}>
            <Text style={styles.cardTitle}>Delivery Address</Text>
            <Text style={styles.addressName}>
              {order.customer?.firstName} {order.customer?.lastName}
            </Text>
            <Text style={styles.addressLine}>{order.shipping_address.address}</Text>
            <Text style={styles.addressLine}>
              {order.shipping_address.city}, {order.shipping_address.country}
            </Text>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpSubtitle}>
            Our support team is here to assist you
          </Text>
          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={handleWhatsAppSupport}
          >
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
    backgroundColor: '#f5f5f5',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  orderLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  statusBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deliveryCard: {
    backgroundColor: '#000',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  deliveryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  deliveryDate: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  trackingInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  trackingLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  trackingNumber: {
    color: '#fff',
    fontSize: 16,
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
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconCompleted: {
    backgroundColor: '#dcfce7',
  },
  timelineIconActive: {
    backgroundColor: '#22c55e',
  },
  timelineEmoji: {
    fontSize: 18,
  },
  timelineEmojiCompleted: {
    color: '#22c55e',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#eee',
    marginVertical: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#22c55e',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  timelineLabelCompleted: {
    color: '#22c55e',
  },
  timelineLabelActive: {
    color: '#000',
  },
  timelineDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  timelineDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  courierCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  courierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courierIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  courierEmoji: {
    fontSize: 24,
  },
  courierDetails: {
    flex: 1,
  },
  courierName: {
    fontSize: 16,
    fontWeight: '600',
  },
  courierTracking: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  trackCourierBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  trackCourierText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  helpCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  helpSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  whatsappEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  whatsappText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderTrackingScreen;
