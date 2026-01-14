/**
 * Theme Context
 * Manages light/dark mode state and provides theme colors throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, shadows, darkShadows, gradients } from '../theme';

const THEME_STORAGE_KEY = 'app_theme_mode';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === 'system') {
        // Force re-render when system theme changes
        setThemeMode('system');
      }
    });

    return () => subscription?.remove();
  }, [themeMode]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.log('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (mode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setTheme(newMode);
  };

  // Determine if dark mode is active
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  // Get current colors based on theme
  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  // Get current shadows based on theme
  const currentShadows = useMemo(() => {
    return isDark ? darkShadows : shadows;
  }, [isDark]);

  // Get themed gradients (some may need adjustment for dark mode)
  const themedGradients = useMemo(() => {
    return {
      ...gradients,
      primary: isDark ? gradients.primaryDark : gradients.primary,
    };
  }, [isDark]);

  const value = {
    // Theme state
    themeMode,
    isDark,
    isLoading,
    
    // Theme setters
    setTheme,
    toggleTheme,
    
    // Theme values
    colors,
    shadows: currentShadows,
    gradients: themedGradients,
    
    // Convenience method for status bar
    statusBarStyle: colors.statusBar,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// HOC for class components
export const withTheme = (Component) => {
  return function ThemedComponent(props) {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
};

export default ThemeContext;
