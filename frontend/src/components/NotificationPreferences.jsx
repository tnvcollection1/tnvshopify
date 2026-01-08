import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Loader2, Phone, Shield, Package, Truck, MessageSquare, Tag, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NotificationPreferences = ({ storeName, customerId, customerPhone, customerName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [preferences, setPreferences] = useState({});
  const [notificationTypes, setNotificationTypes] = useState({});
  const [verificationStep, setVerificationStep] = useState(null); // 'phone', 'otp', null
  const [phoneNumber, setPhoneNumber] = useState(customerPhone || '');
  const [otp, setOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  useEffect(() => {
    loadNotificationTypes();
    if (customerPhone) {
      loadPreferences(customerPhone);
    }
  }, [customerPhone, storeName]);

  const loadNotificationTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/types`);
      const data = await response.json();
      if (data.success) {
        setNotificationTypes(data.notification_types);
      }
    } catch (error) {
      console.error('Error loading notification types:', error);
    }
  };

  const loadPreferences = async (phone) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/preferences?phone_number=${encodeURIComponent(phone)}&store_name=${storeName}`
      );
      const data = await response.json();
      
      if (data.success && data.subscribed) {
        setSubscription(data);
        setPreferences(data.preferences || {});
        
        if (!data.whatsapp_verified) {
          setVerificationStep('otp');
        }
      } else {
        // Not subscribed yet
        setSubscription(null);
        setVerificationStep('phone');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setOtpSending(true);
    try {
      // First subscribe
      await fetch(`${API_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
          store_name: storeName,
          customer_id: customerId,
          customer_name: customerName,
        }),
      });

      // Then send OTP
      const otpResponse = await fetch(`${API_URL}/api/whatsapp-otp/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
          customer_id: customerId || 'guest',
          store_name: storeName,
        }),
      });

      const otpData = await otpResponse.json();
      
      if (otpData.success) {
        toast.success('Verification code sent to your WhatsApp!');
        setVerificationStep('otp');
        
        // For debug mode - auto-fill OTP
        if (otpData.debug_otp) {
          setOtp(otpData.debug_otp);
        }
      } else {
        toast.error(otpData.detail || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setOtpVerifying(true);
    try {
      const response = await fetch(`${API_URL}/api/whatsapp-otp/notifications/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
          otp: otp,
          customer_id: customerId || 'guest',
          store_name: storeName,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('WhatsApp notifications enabled!');
        setVerificationStep(null);
        loadPreferences(phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`);
      } else {
        toast.error(data.detail || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleTogglePreference = async (key) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(newPreferences);

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
          store_name: storeName,
          preferences: newPreferences,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Preferences updated');
      } else {
        // Revert on error
        setPreferences(preferences);
        toast.error('Failed to update preferences');
      }
    } catch (error) {
      setPreferences(preferences);
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!window.confirm('Are you sure you want to unsubscribe from all notifications?')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/notifications/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
          store_name: storeName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Successfully unsubscribed');
        setSubscription(null);
        setVerificationStep('phone');
      }
    } catch (error) {
      toast.error('Failed to unsubscribe');
    } finally {
      setSaving(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order_confirmed':
        return <Package className="w-5 h-5" />;
      case 'order_shipped':
      case 'order_out_for_delivery':
        return <Truck className="w-5 h-5" />;
      case 'order_delivered':
        return <Check className="w-5 h-5" />;
      case 'payment_reminder':
        return <RefreshCw className="w-5 h-5" />;
      case 'promotional':
      case 'price_drop':
        return <Tag className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  // Phone number input step
  if (verificationStep === 'phone') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Bell className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">WhatsApp Notifications</h2>
            <p className="text-sm text-gray-500">Get order updates on WhatsApp</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number
            </label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 bg-gray-100 rounded-l-lg border border-r-0 border-gray-300">
                <span className="text-gray-600">+91</span>
              </div>
              <input
                type="tel"
                value={phoneNumber.replace('+91', '')}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter your number"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                maxLength={10}
              />
            </div>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={otpSending || phoneNumber.length < 10}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {otpSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                Send Verification Code
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            We'll send a verification code to your WhatsApp
          </p>
        </div>
      </div>
    );
  }

  // OTP verification step
  if (verificationStep === 'otp') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Verify Your Number</h2>
            <p className="text-sm text-gray-500">Enter the code sent to WhatsApp</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              maxLength={6}
            />
          </div>

          <button
            onClick={handleVerifyOtp}
            disabled={otpVerifying || otp.length !== 6}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {otpVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Verify & Enable
              </>
            )}
          </button>

          <button
            onClick={() => {
              setOtp('');
              handleSubscribe();
            }}
            disabled={otpSending}
            className="w-full py-2 text-green-600 hover:text-green-700 text-sm"
          >
            Resend Code
          </button>
        </div>
      </div>
    );
  }

  // Preferences management
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Bell className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Check className="w-4 h-4 text-green-500" />
              WhatsApp verified
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {Object.entries(notificationTypes).map(([key, type]) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                preferences[key] ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
              }`}>
                {getNotificationIcon(key)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{type.name}</p>
                <p className="text-xs text-gray-500">{type.description}</p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePreference(key)}
              disabled={saving}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                preferences[key] ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences[key] ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={handleUnsubscribe}
          disabled={saving}
          className="w-full py-2 text-red-600 hover:text-red-700 text-sm flex items-center justify-center gap-2"
        >
          <BellOff className="w-4 h-4" />
          Unsubscribe from all notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationPreferences;
