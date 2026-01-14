/**
 * Enhanced Promo Banner Component
 * Animated promotional banners with gradients
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PromoBanner = ({
  title,
  subtitle,
  code,
  colors: gradientColors = colors.gradientAccent,
  onPress,
  style,
  size = 'md', // sm, md, lg
  animated = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      // Shimmer effect
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [animated]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH * 2],
  });

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: { height: 100, marginHorizontal: spacing.lg },
          title: { fontSize: typography.h4 },
          subtitle: { fontSize: typography.caption },
        };
      case 'lg':
        return {
          container: { height: 200, marginHorizontal: spacing.lg },
          title: { fontSize: typography.h1 },
          subtitle: { fontSize: typography.body },
        };
      default:
        return {
          container: { height: 140, marginHorizontal: spacing.lg },
          title: { fontSize: typography.h2 },
          subtitle: { fontSize: typography.bodySmall },
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={!onPress}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.container, sizeStyles.container, shadows.lg]}
        >
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.decorCircle3} />

          {/* Shimmer effect */}
          {animated && (
            <Animated.View
              style={[
                styles.shimmer,
                { transform: [{ translateX: shimmerTranslate }] },
              ]}
            />
          )}

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.title, sizeStyles.title]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.subtitle, sizeStyles.subtitle]}>{subtitle}</Text>
            )}
            {code && (
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Use code: </Text>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{code}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Arrow indicator if clickable */}
          {onPress && (
            <View style={styles.arrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Compact banner variant
export const CompactBanner = ({ title, icon, color, onPress }) => (
  <TouchableOpacity
    style={[styles.compactBanner, { backgroundColor: color + '15' }]}
    onPress={onPress}
  >
    <Text style={styles.compactIcon}>{icon}</Text>
    <Text style={[styles.compactTitle, { color }]}>{title}</Text>
    <Text style={[styles.compactArrow, { color }]}>→</Text>
  </TouchableOpacity>
);

// Flash sale banner
export const FlashSaleBanner = ({ endTime, onPress }) => {
  const [timeLeft, setTimeLeft] = React.useState('');

  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(endTime);
      const diff = end - now;

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft('ENDED');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <TouchableOpacity style={styles.flashBanner} onPress={onPress}>
      <LinearGradient
        colors={['#FF416C', '#FF4B2B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.flashGradient}
      >
        <View style={styles.flashContent}>
          <Text style={styles.flashIcon}>⚡</Text>
          <View>
            <Text style={styles.flashTitle}>FLASH SALE</Text>
            <Text style={styles.flashTimer}>Ends in: {timeLeft}</Text>
          </View>
        </View>
        <Text style={styles.flashArrow}>SHOP NOW →</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    right: 60,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle3: {
    position: 'absolute',
    top: 20,
    left: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ skewX: '-20deg' }],
    width: 100,
  },
  content: {
    zIndex: 1,
  },
  title: {
    color: colors.white,
    fontWeight: typography.extrabold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: typography.medium,
    marginBottom: spacing.sm,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.caption,
  },
  codeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
  },
  codeText: {
    color: colors.white,
    fontWeight: typography.bold,
    fontSize: typography.caption,
    letterSpacing: 1,
  },
  arrow: {
    position: 'absolute',
    right: spacing.xl,
    top: '50%',
    marginTop: -15,
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: typography.bold,
  },
  // Compact banner styles
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
  },
  compactIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  compactTitle: {
    flex: 1,
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
  },
  compactArrow: {
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
  // Flash sale banner styles
  flashBanner: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  flashGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  flashContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flashIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  flashTitle: {
    color: colors.white,
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    letterSpacing: 1,
  },
  flashTimer: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.caption,
  },
  flashArrow: {
    color: colors.white,
    fontSize: typography.caption,
    fontWeight: typography.bold,
  },
});

export default PromoBanner;
