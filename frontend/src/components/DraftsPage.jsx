import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Filter,
  Package,
  FileText,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ExternalLink,
  Clock,
  AlertCircle,
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
import { useStore } from "../contexts/StoreContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Currency formatting
const CURRENCIES = {
  'PK': 'PKR', 'IN': 'INR', 'US': 'USD', 'GB': 'GBP', 'AE': 'AED'
};

const formatCurrency = (amount, countryCode = 'IN') => {
  const currency = CURRENCIES[countryCode] || 'INR';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const DraftsPage = () => {
  const { selectedStore: globalStore, getStoreName, syncStoreData } = useStore();
  const [activeTab, setActiveTab] = useState("drafts");
  const [drafts, setDrafts] = useState([]);
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalDrafts: 0,
    totalDraftValue: 0,
    totalAbandoned: 0,
    totalAbandonedValue: 0,
  });

  useEffect(() => {
    if (activeTab === "drafts") {
      fetchDrafts();
    } else {
      fetchAbandonedCarts();
    }
  }, [activeTab, globalStore, currentPage]);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const storeParam = globalStore !== 'all' ? `?store_name=${globalStore}` : '';
      const response = await axios.get(`${API}/shopify/draft-orders${storeParam}`);
      setDrafts(response.data.drafts || []);
      setStats(prev => ({
        ...prev,
        totalDrafts: response.data.total || 0,
        totalDraftValue: response.data.total_value || 0
      }));
    } catch (error) {
      console.error("Error fetching drafts:", error);
      // Show empty state if no endpoint exists yet
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAbandonedCarts = async () => {
    setLoading(true);
    try {
      const storeParam = globalStore !== 'all' ? `?store_name=${globalStore}` : '';
      const response = await axios.get(`${API}/customers${storeParam}&abandoned_checkout=true&limit=100`);
      const customers = response.data.customers || response.data || [];
      const abandoned = customers.filter(c => c.abandoned_checkout === true);
      setAbandonedCarts(abandoned);
      setStats(prev => ({
        ...prev,
        totalAbandoned: abandoned.length,
        totalAbandonedValue: abandoned.reduce((sum, c) => sum + (c.abandoned_checkout_value || 0), 0)
      }));
    } catch (error) {
      console.error("Error fetching abandoned carts:", error);
      setAbandonedCarts([]);
    } finally {
      setLoading(false);
    }
  };

  const syncDrafts = async () => {
    if (globalStore === 'all') {
      toast.error('Please select a specific store to sync');
      return;
    }
    setSyncing(true);
    try {
      const response = await axios.post(`${API}/shopify/sync-drafts/${globalStore}`);
      toast.success(`Synced ${response.data.drafts_synced || 0} draft orders`);
      fetchDrafts();
    } catch (error) {
      console.error("Error syncing drafts:", error);
      toast.error("Failed to sync draft orders");
    } finally {
      setSyncing(false);
    }
  };

  const syncAbandonedCarts = async () => {
    if (globalStore === 'all') {
      toast.error('Please select a specific store to sync');
      return;
    }
    setSyncing(true);
    try {
      const response = await axios.post(`${API}/shopify/sync-abandoned-checkouts/${globalStore}?days_back=30`);
      toast.success(`Synced ${response.data.checkouts_synced || 0} abandoned checkouts`);
      fetchAbandonedCarts();
    } catch (error) {
      console.error("Error syncing abandoned carts:", error);
      toast.error("Failed to sync abandoned checkouts");
    } finally {
      setSyncing(false);
    }
  };

  const sendRecoveryMessage = (customer) => {
    const phone = customer.phone?.replace(/\D/g, '');
    if (!phone) {
      toast.error("No phone number available");
      return;
    }
    const message = encodeURIComponent(
      `Hi ${customer.first_name || 'there'}! 👋\n\nWe noticed you left some items in your cart. Complete your order now and get free shipping!\n\n🛒 Your cart is waiting for you.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {activeTab === "drafts" ? "Draft Orders" : "Abandoned Checkouts"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === "drafts" 
                ? "Manage orders that haven't been completed yet"
                : "Recover potential lost sales from abandoned carts"
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600">
              📍 {getStoreName(globalStore)}
            </div>
            <Button 
              variant="outline"
              onClick={activeTab === "drafts" ? syncDrafts : syncAbandonedCarts} 
              disabled={syncing || globalStore === 'all'}
              className="h-9 text-sm border-gray-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync from Shopify'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("drafts")}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "drafts"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Draft Orders
            {stats.totalDrafts > 0 && (
              <Badge variant="secondary" className="ml-2 bg-gray-100">
                {stats.totalDrafts}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab("abandoned")}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "abandoned"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <ShoppingCart className="w-4 h-4 inline mr-2" />
            Abandoned Checkouts
            {stats.totalAbandoned > 0 && (
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                {stats.totalAbandoned}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Drafts</p>
                <p className="text-xl font-semibold text-gray-900">{stats.totalDrafts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Draft Value</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.totalDraftValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Abandoned Carts</p>
                <p className="text-xl font-semibold text-gray-900">{stats.totalAbandoned}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Lost Revenue</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.totalAbandonedValue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={activeTab === "drafts" ? "Search drafts..." : "Search abandoned carts..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 bg-white"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : activeTab === "drafts" ? (
          /* Drafts Table */
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {drafts.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No draft orders</h3>
                <p className="text-gray-500 mb-4">
                  {globalStore === 'all' 
                    ? 'Select a store and sync to see draft orders'
                    : 'Click "Sync from Shopify" to import draft orders'
                  }
                </p>
                {globalStore !== 'all' && (
                  <Button onClick={syncDrafts} disabled={syncing}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Draft Orders
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-medium">Draft #</TableHead>
                    <TableHead className="font-medium">Customer</TableHead>
                    <TableHead className="font-medium">Items</TableHead>
                    <TableHead className="font-medium">Total</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Created</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((draft) => (
                    <TableRow key={draft.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">#{draft.name || draft.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{draft.customer?.first_name} {draft.customer?.last_name}</p>
                          <p className="text-sm text-gray-500">{draft.customer?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{draft.line_items?.length || 0} items</TableCell>
                      <TableCell className="font-medium">{formatCurrency(draft.total_price)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Draft
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ) : (
          /* Abandoned Carts Table */
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {abandonedCarts.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No abandoned checkouts</h3>
                <p className="text-gray-500 mb-4">
                  {globalStore === 'all' 
                    ? 'Select a store and sync to see abandoned carts'
                    : 'Click "Sync from Shopify" to import abandoned checkouts'
                  }
                </p>
                {globalStore !== 'all' && (
                  <Button onClick={syncAbandonedCarts} disabled={syncing}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Abandoned Checkouts
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-medium">Customer</TableHead>
                    <TableHead className="font-medium">Phone</TableHead>
                    <TableHead className="font-medium">Cart Value</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Last Activity</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abandonedCarts.map((customer) => (
                    <TableRow key={customer.customer_id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                          <p className="text-sm text-gray-500">{customer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{customer.phone || '-'}</TableCell>
                      <TableCell className="font-medium text-orange-600">
                        {formatCurrency(customer.abandoned_checkout_value, customer.country_code)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Abandoned
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {customer.last_order_date 
                          ? new Date(customer.last_order_date).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => sendRecoveryMessage(customer)}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Recover
                          </Button>
                          {customer.abandoned_checkout_url && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => window.open(customer.abandoned_checkout_url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftsPage;
