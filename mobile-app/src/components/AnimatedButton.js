/**
 * Animated Button Component
 * Button with press animations and various styles
 * Supports dark mode
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { mediumHaptic, heavyHaptic } from '../services/haptics';
import { borderRadius, typography } from '../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const AnimatedButton = ({
  title,
  onPress,
  variant = 'primary', // primary, secondary, outline, ghost, gradient
  size = 'md', // sm, md, lg
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  gradient,
  style,
  textStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { colors, shadows, gradients } = useTheme();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  const handlePress = () => {
    // Trigger haptic feedback based on variant
    if (variant === 'primary' || variant === 'gradient') {
      heavyHaptic();
    } else {
      mediumHaptic();
    }
    onPress && onPress();
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          button: { paddingVertical: 8, paddingHorizontal: 16 },
          text: { fontSize: typography.caption },
          icon: 16,
        };
      case 'lg':
        return {
          button: { paddingVertical: 18, paddingHorizontal: 32 },
          text: { fontSize: typography.body },
          icon: 24,
        };
      default:
        return {
          button: { paddingVertical: 14, paddingHorizontal: 24 },
          text: { fontSize: typography.bodySmall },
          icon: 20,
        };
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          button: { backgroundColor: colors.background },
          text: { color: colors.text },
        };
      case 'outline':
        return {
          button: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: colors.primary,
          },
          text: { color: colors.primary },
        };
      case 'ghost':
        return {
          button: { backgroundColor: 'transparent' },
          text: { color: colors.primary },
        };
      case 'gradient':
        return {
          button: { backgroundColor: 'transparent' },
          text: { color: '#FFFFFF' },
        };
      case 'danger':
        return {
          button: { backgroundColor: colors.error },
          text: { color: '#FFFFFF' },
        };
      default:
        return {
          button: { backgroundColor: colors.primary },
          text: { color: colors.textInverse },
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

  const buttonContent = (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator
          color={variantStyles.text.color}
          size="small"
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text
            style={[
              styles.text,
              sizeStyles.text,
              variantStyles.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </>
      )}
    </View>
  );

  const buttonStyles = [
    styles.button,
    sizeStyles.button,
    variantStyles.button,
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    variant === 'primary' && shadows.md,
    style,
  ];

  if (variant === 'gradient') {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && styles.fullWidth]}
      >
        <LinearGradient
          colors={gradient || gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[buttonStyles, { backgroundColor: undefined }]}
        >
          {buttonContent}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.9}
      style={[buttonStyles, { transform: [{ scale: scaleAnim }] }]}
    >
      {buttonContent}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: typography.semibold,
    letterSpacing: 0.5,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default AnimatedButton;
