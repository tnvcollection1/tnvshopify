import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Search, MessageCircle, Users, Filter, ExternalLink, Plus, Trash2, Store as StoreIcon, LogOut, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { agent, logout } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [shoeSizes, setShoeSizes] = useState([]);
  const [selectedSize, setSelectedSize] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("all");
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreUrl, setNewStoreUrl] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const customersPerPage = 50; // Load 50 at a time for faster initial load
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [messagedFilter, setMessagedFilter] = useState("all");
  const [sendingMessages, setSendingMessages] = useState(false);
  const [messageQueue, setMessageQueue] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [stats, setStats] = useState({
    totalCustomers: 0,
    uniqueSizes: 0,
    filteredCount: 0
  });
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const handleShopifySync = async (storeName) => {
    setSyncing(true);
    try {
      toast.info(`Syncing orders from Shopify for ${storeName}...`, { duration: 3000 });
      const response = await axios.post(`${API}/shopify/sync/${storeName}?days_back=30`);
      
      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\n${response.data.customers_created} new, ${response.data.customers_updated} updated`);
        await fetchCustomers(); // Refresh customer list
        await fetchShoeSizes();
      }
    } catch (error) {
      console.error("Shopify sync error:", error);
      if (error.response?.status === 400) {
        toast.error("Shopify not configured for this store. Please configure credentials first.");
      } else {
        toast.error("Failed to sync orders from Shopify");
      }
    } finally {
      setSyncing(false);
    }
  };
  
  const handleAbandonedCheckoutSync = async (storeName) => {
    setSyncing(true);
    try {
      toast.info(`Syncing abandoned checkouts from Shopify for ${storeName}...`, { duration: 3000 });
      const response = await axios.post(`${API}/shopify/sync-abandoned-checkouts/${storeName}?days_back=30`);
      
      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\n${response.data.new_customers} new, ${response.data.existing_updated} updated`);
        await fetchCustomers(); // Refresh customer list
      }
    } catch (error) {
      console.error("Abandoned checkout sync error:", error);
      toast.error("Failed to sync abandoned checkouts from Shopify");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStores();
    fetchShoeSizes();
    fetchCountries();
    fetchAgents();
    fetchCustomers();
  }, []);
  
  // Infinite scroll - load more when reaching bottom
  useEffect(() => {
    const handleScroll = () => {
      // Check if user scrolled near bottom (within 200px)
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
      
      if (scrolledToBottom && !isLoadingMore && !loading && hasMore) {
        // Load next page
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchCustomers(selectedSize, nextPage, true);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage, isLoadingMore, loading, hasMore, selectedSize]);
  
  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API}/agents`);
      setAgents(response.data);
    } catch (error) {
      console.error("Fetch agents error:", error);
    }
  };

  useEffect(() => {
    const updateStoreData = async () => {
      setCurrentPage(1);
      setSelectedSize("all");
      setSelectedCustomers([]);
      setSelectedCountry("all");
      setMessagedFilter("all");
      setStockFilter("all"); // Reset stock filter when changing stores
      setFulfillmentFilter("all");
      setDeliveryFilter("all");
      setPaymentFilter("all");
      setHasMore(true);
      await Promise.all([
        fetchShoeSizes(),
        fetchCountries(),
        fetchCustomers("all", 1, false)
      ]);
    };
    updateStoreData();
  }, [selectedStore]);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCustomers([]);
    setHasMore(true);
    fetchCustomers(selectedSize, 1, false);
  }, [selectedSize]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCustomers([]);
    setHasMore(true);
    fetchCustomers(selectedSize, 1, false);
  }, [messagedFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCustomers([]);
    setHasMore(true);
    fetchCustomers(selectedSize, 1, false);
  }, [selectedCountry]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCustomers([]);
    setHasMore(true);
    fetchCustomers(selectedSize, 1, false);
  }, [selectedAgent]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCustomers([]);
    setHasMore(true);
    fetchCustomers(selectedSize, 1, false);
  }, [stockFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCustomers([]);
    setHasMore(true);
    fetchCustomers(selectedSize, 1, false);
  }, [fulfillmentFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCustomers([]);
    setHasMore(true);
    fetchCustomers(selectedSize, 1, false);
  }, [deliveryFilter]);

  const syncShopifyData = async () => {
    setSyncing(true);
    try {
      toast.info("Syncing all customers... This may take a minute", { duration: 5000 });
      
      const response = await axios.post(`${API}/shopify/sync-all`, {
        shop_url: "ashmiaa.myshopify.com",
        access_token: "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"
      });
      
      toast.success(response.data.message);
      await fetchCustomers();
      await fetchShoeSizes();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync data from Shopify");
    } finally {
      setSyncing(false);
    }
  };

  const addStore = async () => {
    if (!newStoreName.trim()) {
      toast.error("Please enter a store name");
      return;
    }

    try {
      await axios.post(`${API}/stores`, {
        store_name: newStoreName.trim(),
        shop_url: newStoreUrl.trim() || `${newStoreName.toLowerCase().replace(/\s+/g, '-')}.myshopify.com`
      });
      
      toast.success(`✅ Store "${newStoreName}" added`);
      setNewStoreName("");
      setNewStoreUrl("");
      setShowAddStore(false);
      await fetchStores();
    } catch (error) {
      console.error("Add store error:", error);
      toast.error(error.response?.data?.detail || "Failed to add store");
    }
  };

  const deleteStore = async (storeId, storeName) => {
    if (!confirm(`Delete store "${storeName}" and all its customers?`)) return;

    try {
      await axios.delete(`${API}/stores/${storeId}`);
      toast.success(`✅ Deleted store "${storeName}"`);
      await fetchStores();
      await fetchCustomers();
      await fetchShoeSizes();
      if (selectedStore === storeName) {
        setSelectedStore("all");
      }
    } catch (error) {
      console.error("Delete store error:", error);
      toast.error("Failed to delete store");
    }
  };

  const handleCSVUpload = async (event, storeName = null) => {
    const file = event.target.files[0];
    if (!file) return;

    // Use provided store name or ask for one
    let uploadStoreName = storeName;
    if (!uploadStoreName) {
      uploadStoreName = prompt("Enter store name for this data:", selectedStore !== "all" ? selectedStore : "Store 1");
      if (!uploadStoreName) {
        event.target.value = '';
        return;
      }
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.info("Uploading CSV... This may take a moment", { duration: 3000 });
      const response = await axios.post(`${API}/upload-csv?store_name=${encodeURIComponent(uploadStoreName)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`✅ ${response.data.message}`);
      await fetchStores();
      await fetchCustomers();
      await fetchShoeSizes();
    } catch (error) {
      console.error("CSV upload error:", error);
      toast.error(error.response?.data?.detail || "Failed to upload CSV. Please check the file format.");
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleStockUpload = async (event, storeName) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.info("Uploading stock file... Processing SKUs", { duration: 3000 });
      const response = await axios.post(`${API}/upload-stock?store_name=${encodeURIComponent(storeName)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`✅ ${response.data.message}\n${response.data.unique_skus} unique SKUs stored`);
      await fetchCustomers(); // Refresh to show stock status
    } catch (error) {
      console.error("Stock upload error:", error);
      toast.error(error.response?.data?.detail || "Failed to upload stock file. Please check the file format (Excel required).");
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/stores`);
      setStores(response.data);
    } catch (error) {
      console.error("Fetch stores error:", error);
    }
  };

  const fetchCustomersCount = async () => {
    try {
      let url = `${API}/customers/count?`;
      if (selectedSize && selectedSize !== "all") {
        url += `shoe_size=${selectedSize}&`;
      }
      if (selectedStore && selectedStore !== "all") {
        url += `store_name=${selectedStore}`;
      }
      const response = await axios.get(url);
      setTotalCount(response.data.total);
      setStats(prev => ({ ...prev, totalCustomers: response.data.total }));
    } catch (error) {
      console.error("Fetch count error:", error);
    }
  };

  const fetchCustomers = async (size = null, page = currentPage, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Build URL for customers
      let url = `${API}/customers?page=${page}&limit=${customersPerPage}&`;
      if (size && size !== "all") {
        url += `shoe_size=${size}&`;
      }
      if (selectedStore && selectedStore !== "all") {
        url += `store_name=${selectedStore}&`;
      }
      if (messagedFilter && messagedFilter !== "all") {
        url += `messaged=${messagedFilter}&`;
      }
      if (selectedCountry && selectedCountry !== "all") {
        url += `country_code=${selectedCountry}&`;
      }
      if (selectedAgent && selectedAgent !== "all") {
        url += `agent_username=${selectedAgent}&`;
      }
      if (stockFilter && stockFilter !== "all") {
        url += `stock_availability=${stockFilter}&`;
      }
      if (fulfillmentFilter && fulfillmentFilter !== "all") {
        url += `fulfillment_status=${fulfillmentFilter}&`;
      }
      if (deliveryFilter && deliveryFilter !== "all") {
        url += `delivery_status=${deliveryFilter}&`;
      }
      
      // Build URL for count (only fetch on first load)
      let countUrl = `${API}/customers/count?`;
      if (size && size !== "all") {
        countUrl += `shoe_size=${size}&`;
      }
      if (selectedStore && selectedStore !== "all") {
        countUrl += `store_name=${selectedStore}&`;
      }
      if (messagedFilter && messagedFilter !== "all") {
        countUrl += `messaged=${messagedFilter}&`;
      }
      if (selectedCountry && selectedCountry !== "all") {
        countUrl += `country_code=${selectedCountry}&`;
      }
      if (selectedAgent && selectedAgent !== "all") {
        countUrl += `agent_username=${selectedAgent}&`;
      }
      if (stockFilter && stockFilter !== "all") {
        countUrl += `stock_availability=${stockFilter}&`;
      }
      if (fulfillmentFilter && fulfillmentFilter !== "all") {
        countUrl += `fulfillment_status=${fulfillmentFilter}&`;
      }
      if (deliveryFilter && deliveryFilter !== "all") {
        countUrl += `delivery_status=${deliveryFilter}&`;
      }
      
      // Fetch customers and count (count only on first page)
      const customersResponse = await axios.get(url);
      const newCustomers = customersResponse.data;
      
      if (append) {
        // Append to existing customers
        setCustomers(prev => [...prev, ...newCustomers]);
        setHasMore(newCustomers.length === customersPerPage);
      } else {
        // Replace customers
        setCustomers(newCustomers);
        setHasMore(newCustomers.length === customersPerPage);
        
        // Fetch count on first load
        const countResponse = await axios.get(countUrl);
        setTotalCount(countResponse.data.total);
        setStats(prev => ({ ...prev, totalCustomers: countResponse.data.total }));
      }
    } catch (error) {
      console.error("Fetch customers error:", error);
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const fetchShoeSizes = async () => {
    try {
      let url = `${API}/shoe-sizes?`;
      if (selectedStore && selectedStore !== "all") {
        url += `store_name=${selectedStore}`;
      }
      const response = await axios.get(url);
      setShoeSizes(response.data.shoe_sizes);
      setStats(prev => ({ ...prev, uniqueSizes: response.data.shoe_sizes.length }));
    } catch (error) {
      console.error("Fetch sizes error:", error);
    }
  };

  const fetchCountries = async () => {
    try {
      let url = `${API}/countries?`;
      if (selectedStore && selectedStore !== "all") {
        url += `store_name=${selectedStore}`;
      }
      const response = await axios.get(url);
      setCountries(response.data.countries);
    } catch (error) {
      console.error("Fetch countries error:", error);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Only apply client-side search filter (size filter is server-side now)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(customer => {
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
        const email = customer.email?.toLowerCase() || "";
        const phone = customer.phone?.toLowerCase() || "";
        return fullName.includes(query) || email.includes(query) || phone.includes(query);
      });
    }

    setFilteredCustomers(filtered);
    setStats(prev => ({ ...prev, filteredCount: searchQuery ? filtered.length : totalCount }));
  };

  const getRandomGreeting = async () => {
    try {
      const response = await axios.get(`${API}/message-greetings`);
      return response.data.greeting;
    } catch (error) {
      return "Hello"; // Fallback
    }
  };

  const markCustomerMessaged = async (customerId) => {
    try {
      await axios.post(`${API}/customers/${customerId}/mark-messaged`, null, {
        params: { agent_username: agent?.username }
      });
    } catch (error) {
      console.error("Error marking customer:", error);
    }
  };

  const openWhatsApp = async (phone, countryCode, customerId, customerName) => {
    if (!phone) {
      toast.error("No phone number available");
      return;
    }
    
    let cleanedPhone = phone.replace(/\D/g, '');
    
    // Country dial codes mapping
    const countryDialCodes = {
      'US': '1', 'IN': '91', 'GB': '44', 'AE': '971', 'SA': '966',
      'CA': '1', 'AU': '61', 'PK': '92', 'BD': '880', 'DE': '49',
      'FR': '33', 'IT': '39', 'ES': '34', 'BR': '55', 'MX': '52', 'PK': '92'
    };
    
    if (countryCode && !cleanedPhone.startsWith(countryDialCodes[countryCode] || '')) {
      const dialCode = countryDialCodes[countryCode];
      if (dialCode) {
        cleanedPhone = dialCode + cleanedPhone;
      }
    }
    
    // Get random greeting
    const greeting = await getRandomGreeting();
    const message = encodeURIComponent(`${greeting} ${customerName}!`);
    
    window.open(`https://wa.me/${cleanedPhone}?text=${message}`, '_blank');
    
    // Mark as messaged
    await markCustomerMessaged(customerId);
    
    // Refresh customers to update status
    setTimeout(() => fetchCustomers(selectedSize, currentPage), 2000);
  };

  const toggleSelectCustomer = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const toggleSelectAll = () => {
    const customersWithPhone = filteredCustomers.filter(c => c.phone);
    if (selectedCustomers.length === customersWithPhone.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customersWithPhone.map(c => c.customer_id));
    }
  };

  const openBulkWhatsApp = async () => {
    // Get selected customers with phone numbers
    const selectedWithPhones = filteredCustomers.filter(c => 
      selectedCustomers.includes(c.customer_id) && c.phone
    );
    
    if (selectedWithPhones.length === 0) {
      toast.error("Please select customers with phone numbers");
      return;
    }

    if (!confirm(`Send WhatsApp messages to ${selectedWithPhones.length} selected customers? Messages will be sent with 8-second delays to avoid blocking.`)) {
      return;
    }

    setSendingMessages(true);
    toast.info(`Starting message queue for ${selectedWithPhones.length} customers...`);
    
    for (let i = 0; i < selectedWithPhones.length; i++) {
      const customer = selectedWithPhones[i];
      const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer';
      
      toast.info(`Sending message ${i + 1}/${selectedWithPhones.length} to ${customerName}...`);
      
      await openWhatsApp(customer.phone, customer.country_code, customer.customer_id, customerName);
      
      // Wait 8 seconds between messages to avoid WhatsApp ban
      if (i < selectedWithPhones.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 8000));
      }
    }
    
    setSendingMessages(false);
    setSelectedCustomers([]);
    toast.success(`✅ Completed sending messages to ${selectedWithPhones.length} customers!`);
    fetchCustomers(selectedSize, currentPage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk' }}>
                Ashmiaa Customer Manager
              </h1>
              <p className="text-slate-600 mt-1">Manage your shoe customers and WhatsApp messaging</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                <User className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">{agent?.full_name}</span>
                <Badge variant="secondary" className="text-xs">{agent?.role}</Badge>
              </div>
              <Badge variant="outline" className="text-base px-3 py-1">
                {stores.length} / 3 Stores
              </Badge>
              <Button 
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Store Management */}
        <Card className="mb-8 border-none shadow-lg bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                  <StoreIcon className="h-6 w-6" />
                  Manage Stores
                </CardTitle>
                <CardDescription>Add your 3 Shopify stores and upload customer data for each</CardDescription>
              </div>
              <Button
                onClick={() => setShowAddStore(!showAddStore)}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="add-store-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Store
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddStore && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold mb-3">Add New Store</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Store Name (e.g., Main Store, Store 2)"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    data-testid="store-name-input"
                  />
                  <Input
                    placeholder="Shopify URL (e.g., mystore.myshopify.com)"
                    value={newStoreUrl}
                    onChange={(e) => setNewStoreUrl(e.target.value)}
                    data-testid="store-url-input"
                  />
                  <Button onClick={addStore} className="bg-green-600 hover:bg-green-700" data-testid="save-store-btn">
                    Save Store
                  </Button>
                </div>
              </div>
            )}

            {stores.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <StoreIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No stores added yet. Click "Add Store" to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stores.map((store) => (
                  <Card key={store.id} className="border border-slate-200 hover:border-indigo-300 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{store.store_name}</h3>
                          <p className="text-sm text-slate-500">{store.shop_url}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteStore(store.id, store.store_name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`delete-store-${store.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <input
                        id={`csv-upload-${store.id}`}
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleCSVUpload(e, store.store_name)}
                        className="hidden"
                      />
                      <label 
                        htmlFor={`csv-upload-${store.id}`}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white cursor-pointer mb-2"
                        data-testid={`upload-csv-${store.id}`}
                      >
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload Orders CSV
                      </label>
                      
                      {/* Stock upload available for all stores */}
                      <input
                        id={`stock-upload-${store.id}`}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleStockUpload(e, store.store_name)}
                        className="hidden"
                      />
                      <label 
                        htmlFor={`stock-upload-${store.id}`}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer mb-2"
                        data-testid={`upload-stock-${store.id}`}
                      >
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Upload Stock Excel
                      </label>
                      
                      {/* Shopify Sync for tnvcollectionpk */}
                      {store.store_name === 'tnvcollectionpk' && (
                        <>
                          <Button
                            onClick={() => handleShopifySync(store.store_name)}
                            disabled={syncing}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 mb-2"
                            data-testid={`shopify-sync-${store.id}`}
                          >
                            {syncing ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Sync Shopify Orders
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleAbandonedCheckoutSync(store.store_name)}
                            disabled={syncing}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                            data-testid={`abandoned-checkout-sync-${store.id}`}
                          >
                            {syncing ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                🛒 Sync Abandoned Checkouts
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-100">
                {selectedStore !== "all" ? `${selectedStore} Customers` : "Total Customers"}
              </CardDescription>
              <CardTitle className="text-4xl font-bold">{stats.totalCustomers}</CardTitle>
            </CardHeader>
            <CardContent>
              <Users className="h-8 w-8 opacity-80" />
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-100">
                {selectedStore !== "all" ? `${selectedStore} Sizes` : "Unique Sizes"}
              </CardDescription>
              <CardTitle className="text-4xl font-bold">{stats.uniqueSizes}</CardTitle>
            </CardHeader>
            <CardContent>
              <Filter className="h-8 w-8 opacity-80" />
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-100">Current Page</CardDescription>
              <CardTitle className="text-4xl font-bold">{filteredCustomers.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <Search className="h-8 w-8 opacity-80" />
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8 border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl" style={{ fontFamily: 'Space Grotesk' }}>Filter Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Store</label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger className="w-full" data-testid="store-filter">
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent data-testid="store-filter-content">
                    <SelectItem value="all" data-testid="store-option-all">All Stores</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.store_name} data-testid={`store-option-${store.store_name}`}>{store.store_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Country</label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-full" data-testid="country-filter">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Clothing Size</label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="w-full" data-testid="shoe-size-filter">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sizes</SelectItem>
                    {shoeSizes.map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Message Status</label>
                <Select value={messagedFilter} onValueChange={setMessagedFilter}>
                  <SelectTrigger className="w-full" data-testid="messaged-filter">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="no">Not Messaged</SelectItem>
                    <SelectItem value="yes">Messaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Agent</label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="w-full" data-testid="agent-filter">
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.username} data-testid={`agent-option-${agent.username}`}>{agent.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Stock Status {selectedStore === "all" && <span className="text-xs text-orange-600">(Select a store first)</span>}
                </label>
                <Select 
                  value={stockFilter} 
                  onValueChange={setStockFilter}
                  disabled={selectedStore === "all"}
                >
                  <SelectTrigger className="w-full" data-testid="stock-filter">
                    <SelectValue placeholder="Select stock status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="in_stock">✅ In Stock</SelectItem>
                    <SelectItem value="out_of_stock">❌ Out of Stock</SelectItem>
                    <SelectItem value="partial">⚠️ Partial Stock</SelectItem>
                    <SelectItem value="unknown">❓ Unknown (No SKU Data)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Fulfillment Status</label>
                <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
                  <SelectTrigger className="w-full" data-testid="fulfillment-filter">
                    <SelectValue placeholder="Select fulfillment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="fulfilled">✅ Fulfilled</SelectItem>
                    <SelectItem value="unfulfilled">⏳ Unfulfilled</SelectItem>
                    <SelectItem value="partially_fulfilled">⚠️ Partially Fulfilled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Delivery Status</label>
                <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                  <SelectTrigger className="w-full" data-testid="delivery-filter">
                    <SelectValue placeholder="Select delivery status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="DELIVERED">✅ Delivered</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">🚚 Out for Delivery</SelectItem>
                    <SelectItem value="IN_TRANSIT">📦 In Transit</SelectItem>
                    <SelectItem value="PICKED_UP">📋 Picked Up</SelectItem>
                    <SelectItem value="PENDING">⏳ Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Cart Status</label>
                <Select value={messagedFilter} onValueChange={setMessagedFilter}>
                  <SelectTrigger className="w-full" data-testid="cart-status-filter">
                    <SelectValue placeholder="Select cart status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="abandoned">🛒 Abandoned Checkouts</SelectItem>
                    <SelectItem value="completed">✅ Completed Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex items-end gap-2">
                <Button 
                  onClick={openBulkWhatsApp}
                  disabled={selectedCustomers.length === 0 || sendingMessages}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium shadow-lg shadow-green-200 transition-all hover:shadow-xl"
                  data-testid="bulk-whatsapp-btn"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {sendingMessages ? 'Sending Messages...' : selectedCustomers.length > 0 ? `Message ${selectedCustomers.length} Selected (8s delay)` : 'Select customers to message'}
                </Button>
                {selectedCustomers.length > 0 && (
                  <Button 
                    onClick={() => setSelectedCustomers([])}
                    variant="outline"
                    size="sm"
                    className="text-slate-600"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card className="border-none shadow-lg bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                  Customers
                  {selectedStore !== "all" && (
                    <Badge className="bg-indigo-100 text-indigo-700 text-sm font-normal">
                      {selectedStore}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {loading ? 'Loading customers...' : `Showing ${filteredCustomers.length} customer(s) on this page`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No customers found</p>
                <p className="text-sm mt-2">Try syncing data from Shopify or adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.length === filteredCustomers.filter(c => c.phone).length && filteredCustomers.filter(c => c.phone).length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300"
                          data-testid="select-all-checkbox"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone / Email</TableHead>
                      <TableHead>Sizes</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Last Order</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.customer_id} data-testid={`customer-row-${customer.customer_id}`}>
                        <TableCell>
                          {customer.phone ? (
                            <input
                              type="checkbox"
                              checked={selectedCustomers.includes(customer.customer_id)}
                              onChange={() => toggleSelectCustomer(customer.customer_id)}
                              className="w-4 h-4 rounded border-slate-300"
                              data-testid={`select-customer-${customer.customer_id}`}
                            />
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {(customer.first_name || customer.last_name) ? 
                            `${customer.first_name} ${customer.last_name}`.trim() : 
                            <span className="text-slate-400">N/A</span>
                          }
                        </TableCell>
                        <TableCell className="text-slate-600 font-mono">
                          {customer.phone ? (
                            <div className="flex items-center gap-1">
                              <span className="text-green-600">📱</span>
                              <span>{customer.phone}</span>
                            </div>
                          ) : customer.email ? (
                            <div className="flex items-center gap-1">
                              <span className="text-blue-600">✉️</span>
                              <span className="text-sm">{customer.email}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">No contact</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {customer.shoe_sizes.slice(0, 3).map((size, idx) => (
                              <Badge key={idx} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                                {size}
                              </Badge>
                            ))}
                            {customer.shoe_sizes.length > 3 && (
                              <Badge variant="outline">+{customer.shoe_sizes.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{customer.order_count}</Badge>
                        </TableCell>
                        <TableCell>
                          {customer.order_number ? (
                            <div className="text-sm font-mono text-blue-600">
                              #{customer.order_number}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.last_order_date ? (
                            <div className="text-sm text-slate-600">
                              {new Date(customer.last_order_date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50">
                            {customer.store_name || 'Default'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {customer.stock_status === "in_stock" && (
                            <Badge className="bg-green-100 text-green-700">
                              ✅ In Stock
                            </Badge>
                          )}
                          {customer.stock_status === "out_of_stock" && (
                            <Badge className="bg-red-100 text-red-700">
                              ❌ Out of Stock
                            </Badge>
                          )}
                          {customer.stock_status === "partial" && (
                            <Badge className="bg-yellow-100 text-yellow-700">
                              ⚠️ Partial
                            </Badge>
                          )}
                          {(!customer.stock_status || customer.stock_status === "unknown") && (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.fulfillment_status === "fulfilled" && (
                            <Badge className="bg-green-100 text-green-700">
                              ✓ Fulfilled
                            </Badge>
                          )}
                          {customer.fulfillment_status === "unfulfilled" && (
                            <Badge className="bg-orange-100 text-orange-700">
                              ⏳ Pending
                            </Badge>
                          )}
                          {customer.fulfillment_status === "partially_fulfilled" && (
                            <Badge className="bg-yellow-100 text-yellow-700">
                              ⚠ Partial
                            </Badge>
                          )}
                          {!customer.fulfillment_status && (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.tracking_number ? (
                            <a 
                              href={customer.tracking_url || `https://www.tcsexpress.com/track-shipment?tracking_id=${customer.tracking_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>{customer.tracking_number.substring(0, 12)}...</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.messaged ? (
                            <Badge className="bg-green-100 text-green-700">
                              ✓ Messaged {customer.message_count && `(${customer.message_count}x)`}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500">
                              Not Messaged
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.messaged_by ? (
                            <div className="text-sm text-slate-600 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{customer.messaged_by}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openWhatsApp(customer.phone, customer.country_code, customer.customer_id, `${customer.first_name} ${customer.last_name}`.trim())}
                            disabled={!customer.phone || sendingMessages}
                            className="hover:bg-green-50 hover:text-green-700"
                            data-testid={`whatsapp-btn-${customer.customer_id}`}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            WhatsApp
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Infinite Scroll Loading Indicator */}
            {!loading && filteredCustomers.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="text-sm text-slate-600 text-center mb-4">
                  Showing {filteredCustomers.length} of {totalCount} customers
                </div>
                
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
                    <span className="text-slate-600">Loading more customers...</span>
                  </div>
                )}
                
                {!hasMore && filteredCustomers.length > 0 && (
                  <div className="text-center py-4 text-slate-500">
                    <span>✓ All customers loaded</span>
                  </div>
                )}
                
                {hasMore && !isLoadingMore && (
                  <div className="text-center py-4 text-slate-400 text-sm">
                    Scroll down to load more...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;