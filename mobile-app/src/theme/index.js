/**
 * Enhanced Theme Configuration
 * Supports light and dark mode with dynamic color switching
 */

// Light mode colors
export const lightColors = {
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
  
  // Backgrounds
  background: '#FAFAFA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  // Borders
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  
  // Text
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textLight: '#CCCCCC',
  textInverse: '#FFFFFF',
  
  // Special
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  
  // Status bar
  statusBar: 'dark-content',
};

// Dark mode colors
export const darkColors = {
  // Primary
  primary: '#FFFFFF',
  primaryLight: '#E0E0E0',
  
  // Accent
  accent: '#FF6B8A',
  accentLight: '#FF8FA3',
  
  // Success/Error
  success: '#4ADE80',
  successLight: '#86EFAC',
  error: '#F87171',
  errorLight: '#FCA5A5',
  warning: '#FBBF24',
  
  // Backgrounds
  background: '#0A0A0A',
  surface: '#1A1A1A',
  card: '#242424',
  
  // Borders
  border: '#333333',
  borderLight: '#2A2A2A',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#707070',
  textLight: '#505050',
  textInverse: '#000000',
  
  // Special
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
  
  // Status bar
  statusBar: 'light-content',
};

// Gradients (same for both modes)
export const gradients = {
  primary: ['#000000', '#333333'],
  primaryDark: ['#FFFFFF', '#E0E0E0'],
  accent: ['#FF3366', '#FF6B8A', '#FF8FA3'],
  success: ['#22C55E', '#4ADE80'],
  sale: ['#F43F5E', '#EC4899', '#D946EF'],
  blue: ['#3B82F6', '#60A5FA', '#93C5FD'],
  gold: ['#F59E0B', '#FBBF24', '#FCD34D'],
  purple: ['#667eea', '#764ba2'],
  pink: ['#f093fb', '#f5576c'],
  cyan: ['#4facfe', '#00f2fe'],
  orange: ['#fa709a', '#fee140'],
  green: ['#11998e', '#38ef7d'],
  red: ['#ee0979', '#ff6a00'],
  teal: ['#a8edea', '#fed6e3'],
  fire: ['#ff416c', '#ff4b2b'],
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
  
  // Font weights
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

// Dark mode specific shadows
export const darkShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
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

// Default export for backward compatibility
export const colors = lightColors;

export default {
  lightColors,
  darkColors,
  gradients,
  spacing,
  borderRadius,
  typography,
  shadows,
  darkShadows,
  animations,
};
