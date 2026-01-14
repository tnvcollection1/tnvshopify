/**
 * Theme Configuration
 * Centralized design tokens for consistent styling
 */

export const colors = {
  // Primary
  primary: '#000000',
  primaryLight: '#333333',
  
  // Accent
  accent: '#FF3366',
  accentLight: '#FF6B8A',
  
  // Success/Error
  success: '#22C55E',
  successLight: '#4ADE80',
  error: '#EF4444',
  errorLight: '#F87171',
  warning: '#F59E0B',
  
  // Neutrals
  white: '#FFFFFF',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  
  // Text
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textLight: '#CCCCCC',
  
  // Gradients (as arrays)
  gradientPrimary: ['#000000', '#333333'],
  gradientAccent: ['#FF3366', '#FF6B8A', '#FF8FA3'],
  gradientSuccess: ['#22C55E', '#4ADE80'],
  gradientSale: ['#F43F5E', '#EC4899', '#D946EF'],
  gradientBlue: ['#3B82F6', '#60A5FA', '#93C5FD'],
  gradientGold: ['#F59E0B', '#FBBF24', '#FCD34D'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const typography = {
  // Font sizes
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
  tiny: 10,
  
  // Font weights (for system fonts)
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
  
  spring: {
    damping: 15,
    stiffness: 150,
  },
  
  springBouncy: {
    damping: 10,
    stiffness: 100,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  animations,
};
