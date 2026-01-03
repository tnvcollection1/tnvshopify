import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Upload,
  Download,
  Filter,
  X,
  Check,
  Clock,
  Package,
  Truck,
  DollarSign,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ExternalLink,
  ShoppingCart,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StoreSyncPanel from "./StoreSyncPanel";
import { useStore } from "../contexts/StoreContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Country to currency mapping
const COUNTRY_CURRENCIES = {
  'PK': 'PKR',   // Pakistan
  'IN': 'INR',   // India
  'US': 'USD',   // United States
  'CA': 'CAD',   // Canada
  'GB': 'GBP',   // United Kingdom
  'AU': 'AUD',   // Australia
  'NZ': 'NZD',   // New Zealand
  'AE': 'AED',   // UAE
  'SA': 'SAR',   // Saudi Arabia
  'QA': 'QAR',   // Qatar
  'KW': 'KWD',   // Kuwait
  'BH': 'BHD',   // Bahrain
  'OM': 'OMR',   // Oman
  'BD': 'BDT',   // Bangladesh
  'LK': 'LKR',   // Sri Lanka
  'NP': 'NPR',   // Nepal
  'AF': 'AFN',   // Afghanistan
  'CN': 'CNY',   // China
  'JP': 'JPY',   // Japan
  'SG': 'SGD',   // Singapore
  'MY': 'MYR',   // Malaysia
  'TH': 'THB',   // Thailand
  'ID': 'IDR',   // Indonesia
  'PH': 'PHP',   // Philippines
  'VN': 'VND',   // Vietnam
  'TR': 'TRY',   // Turkey
  'EG': 'EGP',   // Egypt
  'ZA': 'ZAR',   // South Africa
  'EU': 'EUR',   // Eurozone
  'DE': 'EUR',   // Germany
  'FR': 'EUR',   // France
  'IT': 'EUR',   // Italy
  'ES': 'EUR',   // Spain
  'PT': 'EUR',   // Portugal
  'NL': 'EUR',   // Netherlands
  'BE': 'EUR',   // Belgium
  'AT': 'EUR',   // Austria
  'BR': 'BRL',   // Brazil
  'MX': 'MXN',   // Mexico
  'AR': 'ARS',   // Argentina
  'CL': 'CLP',   // Chile
  'CO': 'COP',   // Colombia
};

// Country code to phone dial code mapping (ISO 3166-1 alpha-2 to ITU-T E.164)
const COUNTRY_DIAL_CODES = {
  'PK': '92',   // Pakistan
  'IN': '91',   // India
  'US': '1',    // United States
  'CA': '1',    // Canada
  'GB': '44',   // United Kingdom
  'AU': '61',   // Australia
  'NZ': '64',   // New Zealand
  'AE': '971',  // UAE
  'SA': '966',  // Saudi Arabia
  'QA': '974',  // Qatar
  'KW': '965',  // Kuwait
  'BH': '973',  // Bahrain
  'OM': '968',  // Oman
  'BD': '880',  // Bangladesh
  'LK': '94',   // Sri Lanka
  'NP': '977',  // Nepal
  'AF': '93',   // Afghanistan
  'CN': '86',   // China
  'JP': '81',   // Japan
  'SG': '65',   // Singapore
  'MY': '60',   // Malaysia
  'TH': '66',   // Thailand
  'ID': '62',   // Indonesia
  'PH': '63',   // Philippines
  'VN': '84',   // Vietnam
  'TR': '90',   // Turkey
  'EG': '20',   // Egypt
  'ZA': '27',   // South Africa
  'KE': '254',  // Kenya
  'NG': '234',  // Nigeria
  'GH': '233',  // Ghana
  'DE': '49',   // Germany
  'FR': '33',   // France
  'IT': '39',   // Italy
  'ES': '34',   // Spain
  'PT': '351',  // Portugal
  'NL': '31',   // Netherlands
  'BE': '32',   // Belgium
  'CH': '41',   // Switzerland
  'AT': '43',   // Austria
  'SE': '46',   // Sweden
  'NO': '47',   // Norway
  'DK': '45',   // Denmark
  'FI': '358',  // Finland
  'PL': '48',   // Poland
  'RU': '7',    // Russia
  'BR': '55',   // Brazil
  'MX': '52',   // Mexico
  'AR': '54',   // Argentina
  'CL': '56',   // Chile
  'CO': '57',   // Colombia
  'PE': '51',   // Peru
  'BO': '591',  // Bolivia
  'KZ': '7',    // Kazakhstan
  'AL': '355',  // Albania
  'CZ': '420',  // Czech Republic
  'SD': '249',  // Sudan
  'WS': '685',  // Samoa
  'SC': '248',  // Seychelles
  'LA': '856',  // Laos
  'RW': '250',  // Rwanda
  'AW': '297',  // Aruba
  'MZ': '258',  // Mozambique
  'KN': '1869', // Saint Kitts and Nevis
};

const Orders = () => {
  const { selectedStore: globalStore, getStoreName } = useStore();
  const [searchParams] = useSearchParams();
  const storeFromUrl = searchParams.get('store');
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [filters, setFilters] = useState({
    fulfillment: "all",
    delivery: "all",
    payment: "all",
    sort: "order_desc", // Default: highest order number first
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    inTransit: 0,
    pending: 0,
    returned: 0,
  });
  const [uploading, setUploading] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms delay
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, filters, debouncedSearch, globalStore]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.fulfillment !== "all") params.append("fulfillment_status", filters.fulfillment);
      if (filters.delivery !== "all") params.append("delivery_status", filters.delivery);
      if (filters.payment !== "all") params.append("payment_status", filters.payment);
      // Use global store from context
      if (globalStore !== "all") params.append("store_name", globalStore);
      if (filters.sort) params.append("sort_by", filters.sort);
      if (debouncedSearch) params.append("search", debouncedSearch);
      params.append("page", currentPage);
      params.append("limit", "50");

      const response = await axios.get(`${API}/customers?${params.toString()}`);
      // Handle response structure properly - API returns {customers: [], total: X}
      const customersData = response.data?.customers || response.data || [];
      const ordersArray = Array.isArray(customersData) ? customersData : [];
      setOrders(ordersArray);
      
      // Use total from response if available, otherwise calculate from array
      const totalCount = response.data?.total || ordersArray.length;
      setStats({
        total: totalCount,
        delivered: ordersArray.filter(c => c.delivery_status === "DELIVERED").length || 0,
        inTransit: ordersArray.filter(c => c.delivery_status === "IN_TRANSIT").length || 0,
        pending: ordersArray.filter(c => !c.delivery_status || c.delivery_status === "PENDING").length || 0,
        returned: ordersArray.filter(c => c.delivery_status === "RETURNED").length || 0,
      });
      setTotalPages(response.data?.pages || Math.ceil(totalCount / 50));
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppNotification = async (order) => {
    try {
      // Extract phone number
      let phone = order.phone || order.default_address?.phone;
      if (!phone) {
        toast.error("No phone number found for this customer");
        return;
      }

      // Clean phone number (remove spaces, dashes, etc.)
      phone = phone.replace(/[\s-()]/g, '');
      
      // Add country code if not present (assuming Pakistan +92)
      if (!phone.startsWith('+') && !phone.startsWith('92')) {
        phone = '92' + phone;
      } else if (phone.startsWith('+')) {
        phone = phone.substring(1);
      }

      toast.info("Sending WhatsApp notification...");

      const response = await axios.post(`${API}/whatsapp/send-template`, {
        phone: phone,
        template_name: "order_confirmation_ashmiaa",
        language_code: "en_US",
        body_params: [
          { type: "text", text: `${order.first_name} ${order.last_name}` },
          { type: "text", text: order.order_number || "N/A" },
          { type: "text", text: order.tracking_number || "Will be updated soon" }
        ]
      });

      if (response.data.success) {
        toast.success(`✅ WhatsApp sent to ${order.first_name}!`);
        // Mark message as sent in database
        try {
          await axios.post(`${API}/customers/${order.customer_id}/mark-messaged`);
          // Refresh orders to show updated status
          fetchOrders();
        } catch (markError) {
          console.error(`Failed to mark order as messaged:`, markError);
        }
      } else {
        toast.error("Failed to send WhatsApp notification");
      }
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || "Failed to send WhatsApp";
      toast.error(errorMsg);
    }
  };

  const toggleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.customer_id));
    }
  };

  const getRandomGreeting = () => {
    const greetings = [
      "Hello",
      "Hi",
      "Hey",
      "Greetings",
      "Hi there",
      "Hello there"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  // Copy all messages to clipboard for bulk sending
  const copyAllMessagesToClipboard = async (ordersToSend) => {
    let allMessages = [];
    
    for (let idx = 0; idx < ordersToSend.length; idx++) {
      const order = ordersToSend[idx];
      try {
        const rawPhone = order.phone || order.default_address?.phone;
        const countryCode = order.country_code || order.default_address?.country_code || 'PK';
        
        if (!rawPhone) continue;
        
        const phone = formatPhoneWithCountryCode(rawPhone, countryCode);
        if (!phone) continue;
        
        // Get order details
        const orderNumber = order.order_number || order.name || "N/A";
        const storeUrl = order.store_name === 'tnvcollectionpk' || order.store_name === 'tnvcollection'
          ? 'https://tnvcollection.com'
          : order.store_name === 'ashmiaa'
          ? 'https://ashmiaa.com'
          : 'https://tnvcollection.com';

        let productList = '';
        if (order.line_items && order.line_items.length > 0) {
          // Use line_items with search links (works with SKU or product name)
          productList = order.line_items
            .map((item, index) => {
              const productName = item.name || item.title || 'Product';
              const qty = item.quantity ? ` (x${item.quantity})` : '';
              const sku = item.sku || '';
              // Create search link using SKU if available, otherwise product name
              const searchQuery = sku || productName.split('/')[0].trim();
              const searchLink = `${storeUrl}/search?q=${encodeURIComponent(searchQuery)}`;
              return `${index + 1}. ${productName}${qty}\n   🔗 ${searchLink}`;
            })
            .join('\n\n');
        } else if (order.order_skus && order.order_skus.length > 0) {
          // Fallback to SKUs with search links
          productList = order.order_skus
            .map((sku, index) => {
              const searchLink = `${storeUrl}/search?q=${encodeURIComponent(sku)}`;
              return `${index + 1}. ${sku}\n   🔗 ${searchLink}`;
            })
            .join('\n\n');
        }

        const totalAmount = order.total_spent || order.total_price || 0;
        const currency = order.currency || COUNTRY_CURRENCIES[countryCode] || 'PKR';
        const customerName = order.first_name || 'Customer';
        
        const message = generateOrderMessage(
          customerName,
          orderNumber,
          productList,
          totalAmount.toLocaleString(),
          currency,
          idx // Pass index for variety
        );
        
        allMessages.push({
          phone: phone,
          name: customerName,
          message: message,
          waLink: `https://wa.me/${phone}`
        });
      } catch (error) {
        console.error('Error processing order:', error);
      }
    }
    
    // Create formatted text for clipboard
    let clipboardText = '📱 WHATSAPP BULK MESSAGES\n';
    clipboardText += `Total: ${allMessages.length} messages\n`;
    clipboardText += `Generated: ${new Date().toLocaleString()}\n\n`;
    clipboardText += '=' .repeat(50) + '\n\n';
    
    allMessages.forEach((msg, index) => {
      clipboardText += `[${index + 1}/${allMessages.length}] ${msg.name} (+${msg.phone})\n`;
      clipboardText += `Link: ${msg.waLink}\n\n`;
      clipboardText += msg.message + '\n\n';
      clipboardText += '-'.repeat(50) + '\n\n';
    });
    
    // Create HTML version with clickable buttons
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Messages - ${allMessages.length} customers</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
    .header { background: #25D366; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .message-card { background: white; padding: 20px; margin-bottom: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .customer-info { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
    .phone { color: #666; font-size: 14px; }
    .message-text { background: #E8F5E9; padding: 15px; border-radius: 8px; white-space: pre-wrap; margin: 15px 0; font-size: 14px; line-height: 1.6; }
    .send-btn { background: #25D366; color: white; border: none; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%; }
    .send-btn:hover { background: #20BA5A; }
    .copy-btn { background: #2196F3; color: white; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-size: 14px; margin-top: 10px; }
    .copy-btn:hover { background: #1976D2; }
    .counter { color: #888; font-size: 14px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📱 WhatsApp Bulk Messages</h1>
    <p>Total: ${allMessages.length} customers | Generated: ${new Date().toLocaleString()}</p>
  </div>
`;

    allMessages.forEach((msg, index) => {
      htmlContent += `
  <div class="message-card">
    <div class="counter">[${index + 1}/${allMessages.length}]</div>
    <div class="customer-info">${msg.name}</div>
    <div class="phone">+${msg.phone}</div>
    <div class="message-text">${msg.message.replace(/\n/g, '<br>')}</div>
    <button class="send-btn" onclick="window.location.href='whatsapp://send?phone=${msg.phone}&text=${encodeURIComponent(msg.message)}'">
      🚀 Open in WhatsApp Desktop
    </button>
    <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${msg.message.replace(/`/g, '\\`')}\`).then(() => alert('Message copied!'))">
      📋 Copy Message
    </button>
  </div>
`;
    });

    htmlContent += `
  <div style="text-align: center; color: #888; margin-top: 40px; padding: 20px;">
    <p>💡 Tip: Click "Open in WhatsApp" to open the chat, then paste the message and send.</p>
    <p>✨ Each message uses a different template to avoid spam detection.</p>
  </div>
</body>
</html>`;
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(clipboardText);
      
      // Download HTML file
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const htmlUrl = URL.createObjectURL(htmlBlob);
      const htmlLink = document.createElement('a');
      htmlLink.href = htmlUrl;
      htmlLink.download = `whatsapp-messages-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(htmlLink);
      htmlLink.click();
      document.body.removeChild(htmlLink);
      URL.revokeObjectURL(htmlUrl);
      
      // Also download text file
      const txtBlob = new Blob([clipboardText], { type: 'text/plain' });
      const txtUrl = URL.createObjectURL(txtBlob);
      const txtLink = document.createElement('a');
      txtLink.href = txtUrl;
      txtLink.download = `whatsapp-messages-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(txtLink);
      txtLink.click();
      document.body.removeChild(txtLink);
      URL.revokeObjectURL(txtUrl);
      
      toast.success(`✅ Downloaded ${allMessages.length} messages as HTML file!`, {
        duration: 5000
      });
    } catch (error) {
      toast.error('Failed to prepare messages');
      console.error(error);
    }
  };

  // Generate varied message templates to avoid spam detection
  const generateOrderMessage = (customerName, orderNumber, productList, totalAmount, currency, templateIndex = null) => {
    const templates = [
      // Template 1 - Friendly & Casual
      () => {
        let msg = `Hello ${customerName}! 👋\n\n`;
        msg += `Your order #${orderNumber} has been received and is being processed.\n\n`;
        msg += `Order Details:\n${productList}\n\n`;
        msg += `Total: ${currency} ${totalAmount}\n\n`;
        msg += `Please confirm by replying:\n`;
        msg += `✅ Type CONFIRM to proceed\n`;
        msg += `❌ Type CANCEL to cancel\n\n`;
        msg += `Thank you for choosing us!`;
        return msg;
      },
      // Template 2 - Professional
      () => {
        let msg = `Hi ${customerName},\n\n`;
        msg += `We've received your order #${orderNumber} successfully!\n\n`;
        msg += `Items ordered:\n${productList}\n\n`;
        msg += `Amount: ${currency} ${totalAmount}\n\n`;
        msg += `Kindly confirm your order by replying:\n`;
        msg += `• CONFIRM to accept\n`;
        msg += `• CANCEL to decline\n\n`;
        msg += `Thanks for shopping with us! 🛍️`;
        return msg;
      },
      // Template 3 - Warm & Welcoming
      () => {
        let msg = `Hey ${customerName}! 😊\n\n`;
        msg += `Great news! Your order #${orderNumber} is ready for processing.\n\n`;
        msg += `Products:\n${productList}\n\n`;
        msg += `Total Amount: ${currency} ${totalAmount}\n\n`;
        msg += `Action needed:\n`;
        msg += `Reply CONFIRM ✓\n`;
        msg += `Reply CANCEL ✗\n\n`;
        msg += `Looking forward to serving you!`;
        return msg;
      },
      // Template 4 - Formal & Polite
      () => {
        let msg = `Dear ${customerName},\n\n`;
        msg += `Thank you for placing order #${orderNumber} with us.\n\n`;
        msg += `Order Summary:\n${productList}\n\n`;
        msg += `Payment: ${currency} ${totalAmount}\n\n`;
        msg += `Please respond to confirm:\n`;
        msg += `Type CONFIRM to proceed ✓\n`;
        msg += `Type CANCEL to reject ✗\n\n`;
        msg += `We appreciate your trust!`;
        return msg;
      },
      // Template 5 - Enthusiastic
      () => {
        let msg = `Hi there ${customerName}! 🎉\n\n`;
        msg += `Your order (#${orderNumber}) is awaiting confirmation!\n\n`;
        msg += `What you ordered:\n${productList}\n\n`;
        msg += `Total: ${currency} ${totalAmount}\n\n`;
        msg += `Quick action needed:\n`;
        msg += `✓ CONFIRM - Yes, proceed!\n`;
        msg += `✗ CANCEL - No thanks\n\n`;
        msg += `Thank you for your order!`;
        return msg;
      },
      // Template 6 - Simple & Direct
      () => {
        let msg = `Hello ${customerName},\n\n`;
        msg += `Order #${orderNumber} confirmation required.\n\n`;
        msg += `Items:\n${productList}\n\n`;
        msg += `Amount: ${currency} ${totalAmount}\n\n`;
        msg += `Reply with:\n`;
        msg += `CONFIRM ✅\n`;
        msg += `CANCEL ❌\n\n`;
        msg += `Thanks!`;
        return msg;
      },
      // Template 7 - Personable
      () => {
        let msg = `Hi ${customerName}! 👋\n\n`;
        msg += `Just checking in about your order #${orderNumber}.\n\n`;
        msg += `Your items:\n${productList}\n\n`;
        msg += `Total: ${currency} ${totalAmount}\n\n`;
        msg += `Would you like to:\n`;
        msg += `✓ CONFIRM - Process my order\n`;
        msg += `✗ CANCEL - Cancel it\n\n`;
        msg += `We're here to help! 😊`;
        return msg;
      },
      // Template 8 - Business-like
      () => {
        let msg = `Good day ${customerName}!\n\n`;
        msg += `Order #${orderNumber} status: Awaiting confirmation\n\n`;
        msg += `Order details:\n${productList}\n\n`;
        msg += `Total: ${currency} ${totalAmount}\n\n`;
        msg += `Please confirm:\n`;
        msg += `→ CONFIRM to continue\n`;
        msg += `→ CANCEL to stop\n\n`;
        msg += `Best regards!`;
        return msg;
      }
    ];
    
    // Pick template - use provided index or random
    let templateIdx;
    if (templateIndex !== null && templateIndex !== undefined && templateIndex >= 0) {
      // Use index-based selection to ensure variety
      templateIdx = templateIndex % templates.length;
      console.log(`Template ${templateIdx + 1}/8 selected (index-based)`);
    } else {
      // Random selection
      templateIdx = Math.floor(Math.random() * templates.length);
      console.log(`Template ${templateIdx + 1}/8 selected (random)`);
    }
    
    const template = templates[templateIdx];
    return template();
  };

  // Generate cancellation message templates (for no response)
  const generateCancellationMessage = (customerName, orderNumber, templateIndex = null) => {
    const templates = [
      // Template 1 - Polite & Understanding
      () => {
        let msg = `Hi ${customerName},\n\n`;
        msg += `We haven't received confirmation for order #${orderNumber}.\n\n`;
        msg += `If you're no longer interested, we understand! 😊\n\n`;
        msg += `Your order will be cancelled within 24 hours if we don't hear from you.\n\n`;
        msg += `Reply CONFIRM if you still want to proceed.\n\n`;
        msg += `Thank you!`;
        return msg;
      },
      // Template 2 - Gentle Reminder
      () => {
        let msg = `Hello ${customerName},\n\n`;
        msg += `Just following up on order #${orderNumber}.\n\n`;
        msg += `We noticed we didn't get your confirmation yet.\n\n`;
        msg += `If you'd still like to proceed, please reply CONFIRM.\n`;
        msg += `Otherwise, we'll cancel it automatically.\n\n`;
        msg += `Thanks for understanding! 🙏`;
        return msg;
      },
      // Template 3 - Professional
      () => {
        let msg = `Dear ${customerName},\n\n`;
        msg += `Order #${orderNumber} - Cancellation Notice\n\n`;
        msg += `We haven't received your confirmation.\n\n`;
        msg += `This order will be cancelled unless confirmed within 24 hours.\n\n`;
        msg += `Reply CONFIRM to proceed with your order.\n\n`;
        msg += `Best regards`;
        return msg;
      },
      // Template 4 - Friendly & Casual
      () => {
        let msg = `Hey ${customerName}! 👋\n\n`;
        msg += `Still interested in order #${orderNumber}?\n\n`;
        msg += `We haven't heard back from you yet.\n\n`;
        msg += `No worries if plans changed! Just let us know or we'll cancel it soon.\n\n`;
        msg += `Reply CONFIRM if you want it.\n\n`;
        msg += `Cheers! 😊`;
        return msg;
      },
      // Template 5 - Direct & Clear
      () => {
        let msg = `Hi ${customerName},\n\n`;
        msg += `Order #${orderNumber} - Awaiting Response\n\n`;
        msg += `No confirmation received yet.\n\n`;
        msg += `Action: Reply CONFIRM to keep your order\n\n`;
        msg += `If we don't hear from you, we'll proceed with cancellation.\n\n`;
        msg += `Thanks!`;
        return msg;
      },
      // Template 6 - Empathetic
      () => {
        let msg = `Hello ${customerName},\n\n`;
        msg += `Hope you're doing well! 😊\n\n`;
        msg += `We're checking on order #${orderNumber}.\n\n`;
        msg += `Haven't received your confirmation yet. Plans change, and that's okay!\n\n`;
        msg += `Let us know if you'd like to proceed - just reply CONFIRM.\n\n`;
        msg += `Thank you for your time!`;
        return msg;
      }
    ];
    
    // Pick template - use provided index or random
    let templateIdx;
    if (templateIndex !== null && templateIndex !== undefined && templateIndex >= 0) {
      templateIdx = templateIndex % templates.length;
      console.log(`Cancellation template ${templateIdx + 1}/6 selected (index-based)`);
    } else {
      templateIdx = Math.floor(Math.random() * templates.length);
      console.log(`Cancellation template ${templateIdx + 1}/6 selected (random)`);
    }
    
    const template = templates[templateIdx];
    return template();
  };

  // Helper function to format phone number with correct country code
  const formatPhoneWithCountryCode = (phone, countryCode) => {
    if (!phone) return null;
    
    // Clean phone number (remove spaces, dashes, parentheses, dots)
    let cleanPhone = phone.replace(/[\s\-().]/g, '');
    
    // Remove leading + if present
    if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // Remove leading 0 if present (common in local phone numbers)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // Get the dial code for this country
    const dialCode = COUNTRY_DIAL_CODES[countryCode] || '92'; // Default to Pakistan if not found
    
    // Check if phone already starts with the correct dial code
    if (cleanPhone.startsWith(dialCode)) {
      return cleanPhone;
    }
    
    // Check if it starts with any other country code (first 1-3 digits)
    const hasCountryCode = Object.values(COUNTRY_DIAL_CODES).some(code => 
      cleanPhone.startsWith(code)
    );
    
    // If no country code detected, add the correct one based on Shopify country
    if (!hasCountryCode) {
      return dialCode + cleanPhone;
    }
    
    // If it has a different country code, keep it as is (might be correct)
    return cleanPhone;
  };

  const sendBulkWhatsAppToSelected = async () => {
    const ordersToSend = orders.filter(o => 
      selectedOrders.includes(o.customer_id) && (o.phone || o.default_address?.phone)
    );
    
    if (ordersToSend.length === 0) {
      toast.error("No selected orders with phone numbers found");
      return;
    }

    // Ask user which method they prefer
    const autoOpen = window.confirm(
      `🚀 AUTOMATIC BULK SEND\n\n` +
      `Send to ${ordersToSend.length} customers automatically?\n\n` +
      `✅ OK = AUTO-SEND (opens every 20 seconds)\n` +
      `   • Opens WhatsApp for customer 1\n` +
      `   • Wait 20 seconds\n` +
      `   • Opens WhatsApp for customer 2\n` +
      `   • Wait 20 seconds\n` +
      `   • Continues automatically...\n\n` +
      `❌ Cancel = Download HTML file instead\n\n` +
      `Note: First time you may need to allow popups.`
    );
    
    if (!autoOpen) {
      // Use HTML file method
      toast.info(`Preparing ${ordersToSend.length} WhatsApp messages...`, {
        duration: 3000
      });
      await copyAllMessagesToClipboard(ordersToSend);
      setTimeout(() => {
        toast.success(
          `📥 HTML file downloaded!\n\n` +
          `Open it in your browser and click the buttons to send.`,
          { duration: 5000 }
        );
      }, 1000);
      return;
    }

    // Auto-open method
    toast.success(
      `🚀 AUTOMATIC SENDING STARTED!\n\n` +
      `Opening ${ordersToSend.length} WhatsApp chats automatically.\n` +
      `20 seconds between each customer.\n\n` +
      `Just send each message as it opens!`,
      { duration: 8000 }
    );
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < ordersToSend.length; i++) {
      const order = ordersToSend[i];
      try {
        // Get random greeting for each customer
        const greeting = getRandomGreeting();
        
        // Get phone number and country code from order
        const rawPhone = order.phone || order.default_address?.phone;
        const countryCode = order.country_code || order.default_address?.country_code || 'PK';
        
        if (!rawPhone) {
          failCount++;
          console.error(`No phone number for order ${order.order_number}`);
          toast.error(`❌ No phone number for ${order.first_name || 'customer'}`);
          continue;
        }
        
        // Format phone with correct country code based on Shopify country
        const phone = formatPhoneWithCountryCode(rawPhone, countryCode);
        
        if (!phone) {
          failCount++;
          console.error(`Invalid phone number for order ${order.order_number}: ${rawPhone}`);
          toast.error(`❌ Invalid phone for ${order.first_name || 'customer'}`);
          continue;
        }

        // Get order details
        const orderNumber = order.order_number || order.name || "N/A";
        const trackingLink = order.tracking_number 
          ? `https://track.aftership.com/${order.tracking_number}`
          : `#`;

        // Get store website URL
        const storeUrl = order.store_name === 'tnvcollectionpk' || order.store_name === 'tnvcollection'
          ? 'https://tnvcollection.com'
          : order.store_name === 'ashmiaa'
          ? 'https://ashmiaa.com'
          : 'https://tnvcollection.com';

        // Get product names with links from order_skus or line_items
        let productList = '';
        if (order.line_items && order.line_items.length > 0) {
          // Use line_items with search links (works with SKU or product name)
          productList = order.line_items
            .map((item, index) => {
              const productName = item.name || item.title || 'Product';
              const qty = item.quantity ? ` (x${item.quantity})` : '';
              const sku = item.sku || '';
              // Create search link using SKU if available, otherwise product name
              const searchQuery = sku || productName.split('/')[0].trim();
              const searchLink = `${storeUrl}/search?q=${encodeURIComponent(searchQuery)}`;
              return `${index + 1}. ${productName}${qty}\n   🔗 ${searchLink}`;
            })
            .join('\n\n');
        } else if (order.order_skus && order.order_skus.length > 0) {
          // Fallback to SKUs with search links
          productList = order.order_skus
            .map((sku, index) => {
              const searchLink = `${storeUrl}/search?q=${encodeURIComponent(sku)}`;
              return `${index + 1}. ${sku}\n   🔗 ${searchLink}`;
            })
            .join('\n\n');
        }

        // Get total amount and currency
        const totalAmount = order.total_spent || order.total_price || 0;
        // Get currency from order, or map from country code
        const currency = order.currency || COUNTRY_CURRENCIES[countryCode] || 'PKR';

        // Customer name
        const customerName = order.first_name || 'Customer';
        
        // Generate randomized message using template system (use index for variety)
        const message = generateOrderMessage(
          customerName,
          orderNumber,
          productList,
          totalAmount.toLocaleString(),
          currency,
          i // Pass index to ensure different templates
        );

        // Use whatsapp:// protocol to force desktop app
        const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
        
        // Try to open desktop app
        window.location.href = whatsappUrl;
        
        // Small delay to let the protocol handler work
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const newWindow = true; // Protocol handlers don't return window object
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          // Popup was blocked - show error and offer to download HTML file
          toast.error(
            `❌ Popup blocked after ${successCount} messages!\n\n` +
            `Please:\n` +
            `1. Click the popup icon in address bar\n` +
            `2. Select "Always allow popups"\n` +
            `3. Try again\n\n` +
            `Or use the HTML file method (click Cancel next time)`,
            { duration: 8000 }
          );
          failCount += (ordersToSend.length - i);
          break; // Stop the loop if popup is blocked
        }
        
        successCount++;
        toast.success(`✅ ${successCount}/${ordersToSend.length}: ${customerName}`, {
          duration: 3000
        });
        
        // Mark message as sent in database
        try {
          await axios.post(`${API}/customers/${order.customer_id}/mark-messaged`);
        } catch (markError) {
          console.error(`Failed to mark order ${order.order_number} as messaged:`, markError);
        }
        
        // Automatic delay before opening next window (20 seconds to allow sending)
        if (i < ordersToSend.length - 1) {
          const nextCustomer = ordersToSend[i + 1].first_name || 'Customer';
          toast.info(`⏳ Next: ${nextCustomer} in 20 seconds...`, {
            duration: 20000
          });
          await new Promise(resolve => setTimeout(resolve, 20000)); // 20 second delay
        }
      } catch (error) {
        failCount++;
        console.error(`Error for order ${order.order_number}:`, error);
      }
    }

    toast.success(`✅ Opened ${successCount} WhatsApp chats! ${failCount > 0 ? `${failCount} failed.` : ''}`);
    setSelectedOrders([]); // Clear selection after sending
    // Refresh orders to show updated WhatsApp status
    fetchOrders();
  };

  // Send bulk cancellation messages to selected orders (no response)
  const sendBulkCancellationToSelected = async () => {
    const ordersToSend = orders.filter(o => selectedOrders.includes(o.customer_id));
    
    if (ordersToSend.length === 0) {
      toast.error("No orders selected");
      return;
    }

    // Confirm action
    const confirmed = window.confirm(
      `Send cancellation messages to ${ordersToSend.length} customers?\n\nThis will notify them that their order will be cancelled due to no response.`
    );

    if (!confirmed) {
      toast.info("Cancellation sending cancelled");
      return;
    }

    toast.info(`📤 Opening cancellation messages for ${ordersToSend.length} customers...`, {
      duration: 5000
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < ordersToSend.length; i++) {
      const order = ordersToSend[i];
      
      try {
        // Get phone and country code
        const rawPhone = order.phone || order.default_address?.phone;
        const countryCode = order.country_code || order.default_address?.country_code || 'PK';
        
        if (!rawPhone) {
          failCount++;
          toast.error(`❌ No phone for ${order.first_name}`);
          continue;
        }

        // Format phone with correct country code
        const phone = formatPhoneWithCountryCode(rawPhone, countryCode);
        
        if (!phone) {
          failCount++;
          toast.error(`❌ Invalid phone for ${order.first_name}`);
          continue;
        }

        // Customer details
        const customerName = order.first_name || 'Customer';
        const orderNumber = order.order_number || 'N/A';
        
        // Generate randomized cancellation message (use index for variety)
        const message = generateCancellationMessage(
          customerName,
          orderNumber,
          i // Pass index to ensure different templates
        );

        // Create WhatsApp URL with encoded message
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;

        // Open WhatsApp (prioritize desktop app)
        window.open(whatsappUrl, '_blank');

        successCount++;
        toast.success(`✅ ${successCount}/${ordersToSend.length}: ${customerName} (Cancellation)`, {
          duration: 3000
        });
        
        // Automatic delay before opening next window (15 seconds)
        if (i < ordersToSend.length - 1) {
          const nextCustomer = ordersToSend[i + 1].first_name || 'Customer';
          toast.info(`⏳ Next: ${nextCustomer} in 15 seconds...`, {
            duration: 15000
          });
          await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
        }
      } catch (error) {
        failCount++;
        console.error(`Error for order ${order.order_number}:`, error);
      }
    }

    toast.success(`✅ Opened ${successCount} cancellation messages! ${failCount > 0 ? `${failCount} failed.` : ''}`);
    setSelectedOrders([]); // Clear selection after sending
  };

  const openWhatsAppWeb = () => {
    window.open('https://web.whatsapp.com/', '_blank');
  };

  // Send individual cancellation message (no response)
  const sendCancellationMessage = (order) => {
    // Get phone and country code
    const rawPhone = order.phone || order.default_address?.phone;
    const countryCode = order.country_code || order.default_address?.country_code || 'PK';
    
    if (!rawPhone) {
      toast.error("No phone number found for this customer");
      return;
    }

    // Format phone with correct country code
    const phone = formatPhoneWithCountryCode(rawPhone, countryCode);
    
    if (!phone) {
      toast.error("Invalid phone number format");
      return;
    }

    // Customer details
    const customerName = order.first_name || 'Customer';
    const orderNumber = order.order_number || 'N/A';
    
    // Generate random cancellation message
    const message = generateCancellationMessage(customerName, orderNumber);

    // Create WhatsApp URL with encoded message
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;

    // Open WhatsApp (prioritize desktop app)
    window.open(whatsappUrl, '_blank');
    
    toast.success(`📤 Cancellation message opened for ${customerName}`);
  };

  const openWhatsAppWebWithNumber = (order) => {
    // Get phone number and country code from order
    const rawPhone = order.phone || order.default_address?.phone;
    const countryCode = order.country_code || order.default_address?.country_code || 'PK';
    
    if (!rawPhone) {
      toast.error("No phone number found for this customer");
      return;
    }

    // Format phone with correct country code based on Shopify country
    const phone = formatPhoneWithCountryCode(rawPhone, countryCode);
    
    if (!phone) {
      toast.error("Invalid phone number format");
      return;
    }

    // Use whatsapp:// protocol to open desktop app directly
    const url = `whatsapp://send?phone=${phone}`;
    window.location.href = url;
    toast.success(`Opening WhatsApp chat with ${order.first_name || 'Customer'} ${order.last_name || ''}`);
  };

  const handleShopifySync = async () => {
    try {
      setLoading(true);
      toast.info("Syncing orders from Shopify...");

      // Sync all stores
      const stores = ["tnvcollection", "tnvcollectionpk", "asmia"];
      let totalSynced = 0;

      for (const store of stores) {
        try {
          const response = await axios.post(`${API}/shopify/sync-fast/${store}`, null, {
            params: { days_back: 30 }
          });
          
          if (response.data.success) {
            totalSynced += response.data.total_synced || 0;
            toast.success(`✅ ${store}: ${response.data.total_synced || 0} orders synced`);
          }
        } catch (error) {
          console.error(`Error syncing ${store}:`, error);
          const errorMsg = error.response?.data?.detail || `Failed to sync ${store}`;
          toast.error(errorMsg);
        }
      }

      toast.success(`🎉 Total: ${totalSynced} orders synced from all stores!`);
      await fetchOrders(); // Refresh the orders list
    } catch (error) {
      console.error("Error syncing Shopify:", error);
      toast.error("Failed to sync orders from Shopify");
    } finally {
      setLoading(false);
    }
  };

  const handleDTDCSync = async () => {
    try {
      setLoading(true);
      toast.info("Syncing DTDC tracking for all orders...");

      const response = await axios.post(`${API}/dtdc/sync-all-tracking`);
      
      if (response.data.success) {
        toast.success(`✅ ${response.data.updated} orders updated! ${response.data.failed} failed.`);
        await fetchOrders(); // Refresh the orders list
      }
    } catch (error) {
      console.error("Error syncing DTDC:", error);
      toast.error(error.response?.data?.detail || "Failed to sync DTDC tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleTCSPaymentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.info("Uploading TCS payment data...");
      const response = await axios.post(`${API}/tcs/upload-payment`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\n${response.data.matched} orders updated`);
        await fetchOrders();
      }
    } catch (error) {
      console.error("TCS payment upload error:", error);
      toast.error("Failed to upload TCS payment data");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSyncTCS = async () => {
    try {
      toast.info("Syncing TCS delivery status...");
      const response = await axios.post(`${API}/tcs/sync-all`);
      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\n${response.data.synced_count} orders updated`);
        await fetchOrders();
      }
    } catch (error) {
      console.error("TCS sync error:", error);
      toast.error("Failed to sync TCS status");
    }
  };

  const getStatusBadge = (status, type) => {
    const variants = {
      fulfillment: {
        fulfilled: "bg-green-100 text-green-800 border-green-200",
        unfulfilled: "bg-yellow-100 text-yellow-800 border-yellow-200",
        partially_fulfilled: "bg-blue-100 text-blue-800 border-blue-200",
      },
      delivery: {
        DELIVERED: "bg-green-100 text-green-800 border-green-200",
        IN_TRANSIT: "bg-blue-100 text-blue-800 border-blue-200",
        OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 border-purple-200",
        PENDING: "bg-gray-100 text-gray-800 border-gray-200",
        RETURNED: "bg-red-100 text-red-800 border-red-200",
      },
      payment: {
        paid: "bg-green-100 text-green-800 border-green-200",
        pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
        refunded: "bg-red-100 text-red-800 border-red-200",
        partially_refunded: "bg-orange-100 text-orange-800 border-orange-200",
      },
    };

    const variant = variants[type]?.[status] || "bg-gray-100 text-gray-800 border-gray-200";
    return <Badge variant="outline" className={`${variant} font-medium`}>{status || "N/A"}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and track all your orders</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedOrders.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">
                  {selectedOrders.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrders([])}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              onClick={openWhatsAppWeb}
              className="border-green-300 hover:bg-green-50 text-green-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open WhatsApp Web
            </Button>
            <Button
              variant="outline"
              onClick={sendBulkWhatsAppToSelected}
              disabled={loading || selectedOrders.length === 0}
              className="border-green-500 hover:bg-green-600 bg-green-500 text-white hover:text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Send to Selected ({selectedOrders.length})
            </Button>
            <Button
              variant="outline"
              onClick={sendBulkCancellationToSelected}
              disabled={loading || selectedOrders.length === 0}
              className="border-red-500 hover:bg-red-600 bg-red-500 text-white hover:text-white"
            >
              <X className="w-4 h-4 mr-2" />
              Send Cancellation ({selectedOrders.length})
            </Button>
            <Button
              variant="outline"
              onClick={handleShopifySync}
              disabled={loading}
              className="border-blue-500 hover:bg-blue-50 text-blue-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Sync Shopify Orders
            </Button>
            <Button
              variant="outline"
              onClick={handleDTDCSync}
              disabled={loading}
              className="border-purple-500 hover:bg-purple-50 text-purple-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Sync DTDC Tracking
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncTCS}
              disabled={loading}
              className="border-gray-300 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Sync TCS Status
            </Button>
            <label htmlFor="tcs-payment-upload">
              <Button
                variant="outline"
                disabled={uploading}
                className="border-gray-300 hover:bg-gray-50"
                onClick={() => document.getElementById("tcs-payment-upload").click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload TCS Payment
              </Button>
            </label>
            <input
              id="tcs-payment-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleTCSPaymentUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Store & Courier Sync Panel */}
      <div className="px-8 py-6">
        <StoreSyncPanel onSyncComplete={fetchOrders} />
      </div>

      {/* Content Section */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Delivered</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.delivered}</p>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">In Transit</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inTransit}</p>
                </div>
                <Truck className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Returned</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{stats.returned}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by order #, customer name, tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && fetchOrders()}
              className="pl-10 border-gray-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-600 min-w-[140px]">
              📍 {globalStore === 'all' ? 'All Stores' : getStoreName(globalStore)}
            </div>
            <Select value={filters.fulfillment} onValueChange={(v) => setFilters({ ...filters, fulfillment: v })}>
              <SelectTrigger className="w-40 border-gray-300">
                <SelectValue placeholder="Fulfillment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fulfillment</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                <SelectItem value="partially_fulfilled">Partially Fulfilled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.delivery} onValueChange={(v) => setFilters({ ...filters, delivery: v })}>
              <SelectTrigger className="w-36 border-gray-300">
                <SelectValue placeholder="Delivery" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Delivery</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.payment} onValueChange={(v) => setFilters({ ...filters, payment: v })}>
              <SelectTrigger className="w-32 border-gray-300">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sort} onValueChange={(v) => setFilters({ ...filters, sort: v })}>
              <SelectTrigger className="w-48 border-gray-300 bg-blue-50">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">📅 Newest Date First</SelectItem>
                <SelectItem value="date_asc">📅 Oldest Date First</SelectItem>
                <SelectItem value="order_desc">#️⃣ Highest Order # First</SelectItem>
                <SelectItem value="order_asc">#️⃣ Lowest Order # First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="p-8">
        <Card className="border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700 w-12">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === orders.length && orders.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">Order #</TableHead>
                    <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                    <TableHead className="font-semibold text-gray-700">Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Store</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tracking #</TableHead>
                    <TableHead className="font-semibold text-gray-700">Fulfillment</TableHead>
                    <TableHead className="font-semibold text-gray-700">Delivery</TableHead>
                    <TableHead className="font-semibold text-gray-700">Payment</TableHead>
                    <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">WhatsApp</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Loading orders...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow 
                        key={order.customer_id} 
                        className={`hover:bg-gray-50 ${selectedOrders.includes(order.customer_id) ? 'bg-green-50' : ''}`}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.customer_id)}
                            onChange={() => toggleSelectOrder(order.customer_id)}
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {order.order_number || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">
                              {order.first_name} {order.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{order.email}</p>
                            {order.phone && (
                              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                <MessageCircle className="w-3 h-3" />
                                {order.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {order.last_order_date
                            ? new Date(order.last_order_date).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {order.store_name || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-gray-600">
                          {order.tracking_number || "N/A"}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.fulfillment_status, "fulfillment")}</TableCell>
                        <TableCell>{getStatusBadge(order.delivery_status, "delivery")}</TableCell>
                        <TableCell>{getStatusBadge(order.payment_status, "payment")}</TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          ${order.total_spent?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {order.messaged ? (
                              <div className="flex items-center gap-1 text-green-600" title={`Message sent${order.message_sent_at ? ` on ${new Date(order.message_sent_at).toLocaleDateString()}` : ''}`}>
                                <Check className="w-5 h-5" />
                                <span className="text-xs font-medium">Sent</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-400" title="Message not sent">
                                <X className="w-5 h-5" />
                                <span className="text-xs font-medium">Not Sent</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendWhatsAppNotification(order)}
                              disabled={!order.phone && !order.default_address?.phone}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title={order.phone || order.default_address?.phone ? "Send confirmation message" : "No phone number"}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendCancellationMessage(order)}
                              disabled={!order.phone && !order.default_address?.phone}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title={order.phone || order.default_address?.phone ? "Send cancellation message" : "No phone number"}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openWhatsAppWebWithNumber(order)}
                              disabled={!order.phone && !order.default_address?.phone}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title={order.phone || order.default_address?.phone ? "Open WhatsApp Web chat" : "No phone number"}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Showing page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-gray-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="border-gray-300"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
