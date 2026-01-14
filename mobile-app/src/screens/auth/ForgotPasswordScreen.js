/**
 * Forgot Password Screen
 * Password reset request form
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
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1500);
  };

  if (sent) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>📧</Text>
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successSubtitle}>
            We've sent a password reset link to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
          
          <TouchableOpacity
            style={styles.returnBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.returnBtnText}>Return to Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.resendBtn}
            onPress={() => {
              setSent(false);
              handleResetPassword();
            }}
          >
            <Text style={styles.resendBtnText}>Didn't receive it? Resend</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔐</Text>
        </View>

        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          No worries! Enter your email address and we'll send you a link to reset
          your password.
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.resetBtn, loading && styles.resetBtnDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.resetBtnText}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back to Login */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.backBtnText}>← Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  resetBtn: {
    backgroundColor: '#000',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  resetBtnDisabled: {
    backgroundColor: '#999',
  },
  resetBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backBtn: {
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 16,
    color: '#666',
  },
  // Success state
  successContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emailHighlight: {
    color: '#000',
    fontWeight: '600',
  },
  returnBtn: {
    backgroundColor: '#000',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginBottom: 16,
  },
  returnBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendBtn: {
    padding: 12,
  },
  resendBtnText: {
    fontSize: 14,
    color: '#666',
  },
});

export default ForgotPasswordScreen;
