/**
 * Login Screen
 * User sign in form
 * Supports dark mode
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';

const LoginScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { colors, statusBarStyle } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigation.goBack();
    } else {
      Alert.alert('Login Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={statusBarStyle} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.text }]}>TNV</Text>
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>COLLECTION</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue shopping</Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Enter your email"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
            <View style={[styles.passwordContainer, { backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={[styles.forgotText, { color: colors.text }]}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary }, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={[styles.loginBtnText, { color: colors.textInverse }]}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Social Login */}
        <View style={styles.socialBtns}>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: colors.background }]}>
            <Text style={styles.socialIcon}>🍎</Text>
            <Text style={[styles.socialText, { color: colors.text }]}>Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: colors.background }]}>
            <Text style={styles.socialIcon}>G</Text>
            <Text style={[styles.socialText, { color: colors.text }]}>Google</Text>
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={[styles.registerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.registerLink, { color: colors.primary }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxxl,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xl,
    marginLeft: spacing.sm,
  },
  badgeText: {
    color: '#fff',
    fontSize: typography.tiny,
    fontWeight: typography.bold,
  },
  title: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
  },
  input: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body,
  },
  eyeBtn: {
    padding: spacing.md,
  },
  eyeIcon: {
    fontSize: 20,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
  },
  forgotText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  loginBtn: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: spacing.lg,
    fontSize: typography.bodySmall,
  },
  socialBtns: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  socialIcon: {
    fontSize: 20,
  },
  socialText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    fontSize: typography.bodySmall,
  },
  registerLink: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
  },
});

export default LoginScreen;
