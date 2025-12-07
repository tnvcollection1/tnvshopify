import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, DollarSign, Crown, TrendingUp, MessageCircle, Mail } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CustomerSegmentationDashboard = () => {
  const [segments, setSegments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState('all');

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/customers/segments`);
      setSegments(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching segments:', error);
      setLoading(false);
    }
  };

  const getWhatsAppMessage = (segment) => {
    const messages = {
      vip: "🌟 Exclusive VIP Offer! As one of our most valued customers, enjoy 15% OFF + Free Shipping on your next order. Shop now: [Your Store Link]",
      high_value: "🎁 Special Preview Access! Thank you for being a loyal customer. Get early access to our new collection + 10% discount. Limited time!",
      medium_value: "💎 Special Offer Just For You! Enjoy 15% OFF on your next purchase. Use code: THANKYOU15",
      low_value: "👋 Welcome! Get 20% OFF your next order as a thank you for choosing us. Start shopping now!",
      dormant: "💌 We Miss You! It's been a while. Come back and enjoy 20% OFF your next order. We'd love to see you again!"
    };
    return messages[segment] || "Hello! Check out our latest collection.";
  };

  const openWhatsAppWeb = (phone, segment) => {
    if (!phone) {
      alert('No phone number available for this customer');
      return;
    }
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Get pre-filled message based on segment
    const message = getWhatsAppMessage(segment);
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // WhatsApp Web link
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    // Open in new tab
    window.open(whatsappUrl, '_blank');
  };

  const downloadCustomerList = (segment) => {
    // Create CSV of customer list for that segment
    alert(`This will download ${segment} customer list with phone numbers for bulk messaging`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          👥 Customer Segmentation
        </h1>
        <p className="text-gray-400">
          Segment customers by value and behavior for targeted marketing
        </p>
      </div>

      {/* Segment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Crown className="w-8 h-8 text-yellow-400" />
            <span className="text-3xl font-bold">{segments?.vip?.count || 0}</span>
          </div>
          <h3 className="text-yellow-400 font-semibold mb-1">VIP Customers</h3>
          <p className="text-xs text-gray-400 mb-2">Rs. 10K+ spent</p>
          <p className="text-2xl font-bold text-yellow-300">
            Rs. {segments?.vip?.total_value?.toLocaleString() || 0}
          </p>
          <button
            onClick={() => downloadCustomerList('vip')}
            className="mt-3 w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm transition-colors"
          >
            Download VIP List
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <span className="text-3xl font-bold">{segments?.high_value?.count || 0}</span>
          </div>
          <h3 className="text-green-400 font-semibold mb-1">High Value</h3>
          <p className="text-xs text-gray-400 mb-2">Rs. 5-10K spent</p>
          <p className="text-2xl font-bold text-green-300">
            Rs. {segments?.high_value?.total_value?.toLocaleString() || 0}
          </p>
          <button
            onClick={() => downloadCustomerList('high_value')}
            className="mt-3 w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors"
          >
            Download High Value List
          </button>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-blue-400" />
            <span className="text-3xl font-bold">{segments?.medium_value?.count || 0}</span>
          </div>
          <h3 className="text-blue-400 font-semibold mb-1">Medium Value</h3>
          <p className="text-xs text-gray-400 mb-2">Rs. 2-5K spent</p>
          <p className="text-2xl font-bold text-blue-300">
            Rs. {segments?.medium_value?.total_value?.toLocaleString() || 0}
          </p>
          <button
            onClick={() => downloadCustomerList('medium_value')}
            className="mt-3 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
          >
            Download Medium Value List
          </button>
        </div>

        <div className="bg-gradient-to-br from-gray-500/20 to-gray-600/20 border border-gray-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-gray-400" />
            <span className="text-3xl font-bold">{segments?.low_value?.count || 0}</span>
          </div>
          <h3 className="text-gray-400 font-semibold mb-1">New/Low Value</h3>
          <p className="text-xs text-gray-400 mb-2">Under Rs. 2K spent</p>
          <p className="text-2xl font-bold text-gray-300">
            Rs. {segments?.low_value?.total_value?.toLocaleString() || 0}
          </p>
          <button
            onClick={() => downloadCustomerList('low_value')}
            className="mt-3 w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Download New Customer List
          </button>
        </div>
      </div>

      {/* Dormant Customers Alert */}
      {segments?.dormant && segments.dormant.count > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-red-400 mb-2">
                ⚠️ Dormant Customers Alert
              </h3>
              <p className="text-gray-300">
                {segments.dormant.count} customers haven't ordered in 90+ days
                (Rs. {segments.dormant.total_value?.toLocaleString()} potential revenue)
              </p>
            </div>
            <button
              onClick={() => downloadCustomerList('dormant')}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Download Dormant Customer List
            </button>
          </div>
        </div>
      )}

      {/* Detailed Customer Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VIP Customers */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700 bg-yellow-500/10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              VIP Customers (Top Spenders)
            </h2>
          </div>
          <div className="p-6">
            {segments?.vip?.customers?.slice(0, 5).map((customer, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg mb-3">
                <div className="flex-1">
                  <div className="font-semibold">{customer.name}</div>
                  <div className="text-sm text-gray-400">{customer.phone}</div>
                  <div className="text-xs text-gray-500 mt-1">Order: {customer.order_number}</div>
                </div>
                <div className="text-right mr-3">
                  <div className="text-lg font-bold text-yellow-400">
                    Rs. {customer.total_spent?.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">{customer.order_count} orders</div>
                </div>
                <button
                  onClick={() => openWhatsAppWeb(customer.phone, 'vip')}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs transition-colors flex items-center gap-1"
                  title="Open WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* High Value Customers */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700 bg-green-500/10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              High Value Customers
            </h2>
          </div>
          <div className="p-6">
            {segments?.high_value?.customers?.slice(0, 5).map((customer, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg mb-3">
                <div className="flex-1">
                  <div className="font-semibold">{customer.name}</div>
                  <div className="text-sm text-gray-400">{customer.phone}</div>
                  <div className="text-xs text-gray-500 mt-1">Order: {customer.order_number}</div>
                </div>
                <div className="text-right mr-3">
                  <div className="text-lg font-bold text-green-400">
                    Rs. {customer.total_spent?.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">{customer.order_count} orders</div>
                </div>
                <button
                  onClick={() => openWhatsAppWeb(customer.phone, 'high_value')}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs transition-colors flex items-center gap-1"
                  title="Open WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4">📊 Insights & Recommendations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <h3 className="font-semibold text-yellow-400 mb-2">Focus on VIPs</h3>
            <p className="text-sm text-gray-300">
              Your top {segments?.vip?.count || 0} customers generate {
                segments?.vip?.total_value && segments?.total_value
                  ? ((segments.vip.total_value / segments.total_value) * 100).toFixed(0)
                  : 0
              }% of revenue. Give them exclusive treatment!
            </p>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="font-semibold text-blue-400 mb-2">Grow Medium Segment</h3>
            <p className="text-sm text-gray-300">
              Nurture {segments?.medium_value?.count || 0} medium-value customers to become high-value with loyalty rewards.
            </p>
          </div>
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <h3 className="font-semibold text-red-400 mb-2">Win Back Dormant</h3>
            <p className="text-sm text-gray-300">
              Re-engage {segments?.dormant?.count || 0} dormant customers with "We miss you" offers (20% off).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSegmentationDashboard;
