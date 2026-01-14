/**
 * Register Screen
 * User sign up form
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (!agreeToTerms) {
      Alert.alert('Error', 'Please agree to the terms and conditions');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const result = await register({
      name: `${form.firstName} ${form.lastName}`,
      email: form.email,
      phone: form.phone,
      password: form.password,
    });
    setLoading(false);

    if (result.success) {
      navigation.goBack();
      navigation.goBack(); // Go back to main app
    } else {
      Alert.alert('Registration Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join TNV Collection today</Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John"
                value={form.firstName}
                onChangeText={(v) => updateForm('firstName', v)}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                value={form.lastName}
                onChangeText={(v) => updateForm('lastName', v)}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="john@example.com"
              value={form.email}
              onChangeText={(v) => updateForm('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+971 50 123 4567"
              value={form.phone}
              onChangeText={(v) => updateForm('phone', v)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a password"
                value={form.password}
                onChangeText={(v) => updateForm('password', v)}
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

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChangeText={(v) => updateForm('confirmPassword', v)}
              secureTextEntry={!showPassword}
            />
          </View>

          {/* Terms Checkbox */}
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setAgreeToTerms(!agreeToTerms)}
          >
            <View
              style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}
            >
              {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerBtnText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login */}
        <View style={styles.socialBtns}>
          <TouchableOpacity style={styles.socialBtn}>
            <Text style={styles.socialIcon}>🍎</Text>
            <Text style={styles.socialText}>Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}>
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialText}>Google</Text>
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    marginBottom: 20,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeBtn: {
    padding: 14,
  },
  eyeIcon: {
    fontSize: 20,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termsLink: {
    color: '#000',
    fontWeight: '600',
  },
  registerBtn: {
    backgroundColor: '#000',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerBtnDisabled: {
    backgroundColor: '#999',
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#999',
  },
  socialBtns: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  socialIcon: {
    fontSize: 20,
  },
  socialText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
});

export default RegisterScreen;
