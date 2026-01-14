/**
 * Enhanced Category Circle Component
 * Animated circular category with gradient borders
 * Supports dark mode
 */

import React, { useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { borderRadius, typography, spacing } from '../theme';

const CategoryCircle = ({ 
  name, 
  image, 
  emoji, 
  icon,
  gradient = ['#667eea', '#764ba2'], 
  onPress,
  size = 'md', // sm, md, lg
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hasImage = image && !emoji && !icon;
  const displayIcon = icon?.value || icon || emoji || '📁';

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      damping: 15,
      stiffness: 400,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 400,
    }).start();
  };

  const sizeStyles = {
    sm: { circle: 56, icon: 24, text: typography.tiny, containerWidth: 70 },
    md: { circle: 70, icon: 30, text: typography.caption, containerWidth: 85 },
    lg: { circle: 90, icon: 38, text: typography.bodySmall, containerWidth: 100 },
  };

  const s = sizeStyles[size];

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.container, { width: s.containerWidth }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Gradient Border */}
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBorder, { width: s.circle + 4, height: s.circle + 4, borderRadius: (s.circle + 4) / 2 }]}
        >
          <View style={[styles.innerCircle, { width: s.circle, height: s.circle, borderRadius: s.circle / 2 }]}>
            {hasImage ? (
              <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[gradient[0] + '20', gradient[1] + '20']}
                style={styles.iconBackground}
              >
                <Text style={[styles.icon, { fontSize: s.icon }]}>{displayIcon}</Text>
              </LinearGradient>
            )}
          </View>
        </LinearGradient>

        {/* Name */}
        <Text style={[styles.name, { fontSize: s.text }]} numberOfLines={2}>
          {name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Horizontal scrollable category list
export const CategoryList = ({ categories, onCategoryPress, size = 'md' }) => {
  const defaultGradients = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#fa709a', '#fee140'],
    ['#11998e', '#38ef7d'],
    ['#ee0979', '#ff6a00'],
    ['#a8edea', '#fed6e3'],
    ['#ff416c', '#ff4b2b'],
  ];

  return (
    <View style={styles.listContainer}>
      {categories.map((cat, index) => (
        <CategoryCircle
          key={cat.name || index}
          name={cat.name}
          image={cat.image}
          emoji={cat.emoji}
          icon={cat.icon}
          gradient={cat.gradient || defaultGradients[index % defaultGradients.length]}
          onPress={() => onCategoryPress?.(cat)}
          size={size}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  gradientBorder: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  innerCircle: {
    backgroundColor: colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  iconBackground: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
  },
  name: {
    fontWeight: typography.medium,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  listContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
});

export default CategoryCircle;
