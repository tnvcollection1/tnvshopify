import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, DollarSign, Crown, TrendingUp, MessageCircle, Mail, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CustomerSegmentationDashboard = () => {
  const { selectedStore: globalStore, getStoreName } = useStore();
  const [segments, setSegments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [viewingSegment, setViewingSegment] = useState(null);
  const [segmentCustomers, setSegmentCustomers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchSegments = useCallback(async () => {
    try {
      setLoading(true);
      const storeParam = globalStore !== 'all' ? `?store_name=${globalStore}` : '';
      const res = await axios.get(`${API_URL}/api/customers/segments${storeParam}`);
      setSegments(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching segments:', error);
      setLoading(false);
    }
  }, [globalStore]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const getWhatsAppMessage = (segment, customerName = 'Valued Customer') => {
    // Random greeting templates per segment to avoid spam detection
    const templates = {
      vip: [
        `Hello ${customerName}! 🌟\n\nAs our VIP customer, enjoy exclusive 15% OFF + Free Shipping on your next order!\n\nThank you for your continued support!`,
        `Hi ${customerName},\n\nExclusive VIP Offer just for you! 🎁\n\n15% discount + Free delivery on all orders.\n\nShop now and enjoy premium service!`,
        `Hey ${customerName}! 👑\n\nYou're one of our most valued customers!\n\nSpecial VIP discount: 15% OFF + Free Shipping\n\nLimited time offer!`,
        `Dear ${customerName},\n\n🌟 VIP Member Benefits:\n• 15% OFF all products\n• Free Shipping\n• Priority Support\n\nThank you for being with us!`
      ],
      high_value: [
        `Hi ${customerName}! 🎁\n\nThank you for being our loyal customer!\n\nEarly access to new collection + 10% discount waiting for you.\n\nCheck it out now!`,
        `Hello ${customerName},\n\nSpecial preview just for you! 👀\n\n10% OFF on our latest arrivals + priority access.\n\nShop before anyone else!`,
        `Hey ${customerName}! 😊\n\nYou're invited to our exclusive preview!\n\nGet 10% discount + early access to new collection.\n\nDon't miss out!`
      ],
      medium_value: [
        `Hi ${customerName}! 💎\n\nSpecial offer just for you!\n\n15% OFF on your next purchase\nUse code: THANKYOU15\n\nHappy shopping!`,
        `Hello ${customerName},\n\nWe appreciate your business! 🙏\n\nEnjoy 15% discount with code: THANKYOU15\n\nValid on all products!`,
        `Hey ${customerName}! 🎉\n\nThank you for shopping with us!\n\n15% OFF waiting for you\nCode: THANKYOU15\n\nStart shopping now!`
      ],
      low_value: [
        `Hi ${customerName}! 👋\n\nWelcome back!\n\n20% OFF on your next order as our thank you gift.\n\nStart shopping and save big!`,
        `Hello ${customerName},\n\nThank you for choosing us! 🎁\n\n20% discount on your next purchase.\n\nEnjoy amazing deals!`,
        `Hey ${customerName}! 😊\n\nSpecial welcome offer: 20% OFF\n\nUse it on your next order!\n\nHappy shopping!`
      ],
      dormant: [
        `Hi ${customerName}! 💌\n\nWe miss you!\n\nCome back and enjoy 20% OFF your next order.\n\nWe'd love to see you again!`,
        `Hello ${customerName},\n\nIt's been a while! 🥺\n\n20% discount waiting for your return.\n\nWelcome back offer - don't miss it!`,
        `Hey ${customerName}! 👋\n\nLong time no see!\n\nSpecial comeback offer: 20% OFF\n\nWe'd be happy to serve you again!`
      ]
    };
    
    // Get templates for segment or use default
    const segmentTemplates = templates[segment] || [
      `Hello ${customerName}! Check out our latest collection!`,
      `Hi ${customerName}, Special offers waiting for you!`,
      `Hey ${customerName}! 😊 New arrivals just for you!`
    ];
    
    // Random selection
    const randomIndex = Math.floor(Math.random() * segmentTemplates.length);
    return segmentTemplates[randomIndex];
  };

  // Country code mapping (ISO 2-letter to dial code) - Comprehensive list
  const getDialCode = (countryCode) => {
    const dialCodes = {
      'PK': '92',   // Pakistan
      'IN': '91',   // India
      'US': '1',    // USA
      'CA': '1',    // Canada
      'GB': '44',   // UK
      'AE': '971',  // UAE
      'SA': '966',  // Saudi Arabia
      'AU': '61',   // Australia
      'NZ': '64',   // New Zealand
      'SG': '65',   // Singapore
      'MY': '60',   // Malaysia
      'BD': '880',  // Bangladesh
      'LK': '94',   // Sri Lanka
      'AF': '93',   // Afghanistan
      'ZA': '27',   // South Africa
      'EG': '20',   // Egypt
      'KW': '965',  // Kuwait
      'QA': '974',  // Qatar
      'OM': '968',  // Oman
      'FR': '33',   // France
      'DE': '49',   // Germany
      'IT': '39',   // Italy
      'ES': '34',   // Spain
      'PT': '351',  // Portugal
      'ID': '62',   // Indonesia
      'JP': '81',   // Japan
      'CN': '86',   // China
      'KR': '82',   // South Korea
    };
    return dialCodes[countryCode?.toUpperCase()] || '92'; // Default to Pakistan
  };

  const openWhatsAppWeb = (phone, segment, customerName = 'Customer', countryCode = 'PK') => {
    if (!phone) {
      alert('No phone number available for this customer');
      return;
    }
    
    // Clean phone number (remove all non-digits)
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Get correct dial code from country
    const dialCode = getDialCode(countryCode);
    
    // Format phone number properly
    if (cleanPhone.startsWith('00')) {
      // Remove international prefix (00)
      cleanPhone = cleanPhone.substring(2);
    } else if (cleanPhone.startsWith('+')) {
      // Already has +, just clean it
      cleanPhone = cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('0')) {
      // Local number with leading 0, remove it and add country code
      cleanPhone = dialCode + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith(dialCode)) {
      // No country code, add it
      cleanPhone = dialCode + cleanPhone;
    }
    
    // Get randomized message based on segment
    const message = getWhatsAppMessage(segment, customerName);
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // WhatsApp Desktop App link (prioritizes desktop over web)
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
    
    console.log(`WhatsApp: ${phone} (${countryCode}) → ${cleanPhone}`);
    
    // Open WhatsApp (desktop app will be used if installed)
    window.open(whatsappUrl, '_blank');
  };

  const viewSegmentCustomers = async (segment, page = 1) => {
    try {
      setPageLoading(true);
      if (page === 1) setLoading(true);
      
      const storeParam = globalStore !== 'all' ? `store_name=${globalStore}&` : '';
      const res = await axios.get(`${API_URL}/api/customers/export-segment/${segment}?${storeParam}page=${page}&limit=50`);
      
      if (!res.data.customers || res.data.customers.length === 0) {
        if (page === 1) {
          alert(`No customers found in ${segment} segment`);
        }
        setLoading(false);
        setPageLoading(false);
        return;
      }
      
      setSegmentCustomers(res.data.customers);
      setCurrentPage(res.data.page || 1);
      setTotalPages(res.data.total_pages || 1);
      setTotalCount(res.data.total_count || res.data.customers.length);
      setViewingSegment(segment);
      setLoading(false);
      setPageLoading(false);
    } catch (error) {
      console.error('Error fetching customer list:', error);
      alert('❌ Error fetching customer list');
      setLoading(false);
      setPageLoading(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      viewSegmentCustomers(viewingSegment, currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      viewSegmentCustomers(viewingSegment, currentPage - 1);
    }
  };

  const closeCustomerView = () => {
    setViewingSegment(null);
    setSegmentCustomers([]);
    setCurrentPage(1);
    setTotalPages(1);
    setTotalCount(0);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              👥 Customer Segmentation
            </h1>
            <p className="text-gray-400">
              Segment customers by value and behavior for targeted marketing
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
              📍 {getStoreName(globalStore)}
            </div>
          </div>
        </div>
      </div>

      {/* Segment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
            onClick={() => viewSegmentCustomers('vip')}
            className="mt-3 w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            View Customers
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
            onClick={() => viewSegmentCustomers('high_value')}
            className="mt-3 w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            View Customers
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
            onClick={() => viewSegmentCustomers('medium_value')}
            className="mt-3 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            View Customers
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
            onClick={() => viewSegmentCustomers('low_value')}
            className="mt-3 w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            View Customers
          </button>
        </div>

        <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <span className="text-3xl font-bold">{segments?.dormant?.count || 0}</span>
          </div>
          <h3 className="text-red-400 font-semibold mb-1">Dormant Customers</h3>
          <p className="text-xs text-gray-400 mb-2">90+ days inactive</p>
          <p className="text-2xl font-bold text-red-300">
            Rs. {segments?.dormant?.total_value?.toLocaleString() || 0}
          </p>
          <button
            onClick={() => viewSegmentCustomers('dormant')}
            className="mt-3 w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            View Customers
          </button>
        </div>
      </div>

      {/* Dormant Customers Alert */}
      {segments?.dormant && segments.dormant.count > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-400 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-400 mb-2">
                ⚠️ Dormant Customers Alert
              </h3>
              <p className="text-gray-300">
                <span className="font-bold text-red-300">{segments.dormant.count} customers</span> haven't ordered in 90+ days
                (<span className="font-bold text-red-300">Rs. {segments.dormant.total_value?.toLocaleString()}</span> potential revenue)
              </p>
              <p className="text-sm text-gray-400 mt-2">
                💡 Use the Dormant Customers card above to download and message these customers with "We Miss You" offers.
              </p>
            </div>
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
                  onClick={() => openWhatsAppWeb(customer.phone, 'vip', customer.name, customer.country_code)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs transition-colors flex items-center gap-1"
                  title="Open WhatsApp with random greeting"
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
                  onClick={() => openWhatsAppWeb(customer.phone, 'high_value', customer.name, customer.country_code)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs transition-colors flex items-center gap-1"
                  title="Open WhatsApp with random greeting"
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

      {/* Customer List Modal */}
      {viewingSegment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700 flex items-center justify-between bg-gradient-to-r from-purple-600/20 to-pink-600/20">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {viewingSegment === 'vip' && <Crown className="w-6 h-6 text-yellow-400" />}
                  {viewingSegment === 'high_value' && <TrendingUp className="w-6 h-6 text-green-400" />}
                  {viewingSegment === 'medium_value' && <Users className="w-6 h-6 text-blue-400" />}
                  {viewingSegment === 'low_value' && <Users className="w-6 h-6 text-gray-400" />}
                  {viewingSegment === 'dormant' && <AlertCircle className="w-6 h-6 text-red-400" />}
                  {viewingSegment.replace('_', ' ').toUpperCase()} Customers
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {totalCount.toLocaleString()} total customers • Showing page {currentPage} of {totalPages}
                </p>
              </div>
              <button
                onClick={closeCustomerView}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body - Customer List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {segmentCustomers.map((customer, idx) => (
                  <div key={idx} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-purple-500/50 transition-all">
                    {/* Customer Info */}
                    <div className="mb-3">
                      <div className="font-semibold text-lg text-white mb-1">
                        {customer.name || 'Customer'}
                      </div>
                      <div className="text-sm text-gray-400 flex items-center gap-1">
                        📱 {customer.phone || 'No phone'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Order #{customer.order_number || 'N/A'}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-gray-700">
                      <div>
                        <div className="text-xs text-gray-400">Total Spent</div>
                        <div className="text-sm font-bold text-green-400">
                          Rs. {customer.total_spent?.toLocaleString() || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Orders</div>
                        <div className="text-sm font-bold text-blue-400">
                          {customer.orders || 0}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => openWhatsAppWeb(customer.phone, viewingSegment, customer.name, customer.country_code)}
                      disabled={!customer.phone}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        customer.phone
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      {customer.phone ? 'Send WhatsApp' : 'No Phone'}
                    </button>
                  </div>
                ))}
              </div>

              {segmentCustomers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No customers found in this segment</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {((currentPage - 1) * 50) + 1} - {Math.min(currentPage * 50, totalCount)} of {totalCount.toLocaleString()} customers
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1 || pageLoading}
                    className={`px-4 py-2 rounded-lg flex items-center gap-1 transition-colors ${
                      currentPage <= 1 || pageLoading
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="px-4 py-2 bg-gray-800 rounded-lg text-white font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages || pageLoading}
                    className={`px-4 py-2 rounded-lg flex items-center gap-1 transition-colors ${
                      currentPage >= totalPages || pageLoading
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSegmentationDashboard;
