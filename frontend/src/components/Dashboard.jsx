import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Search, MessageCircle, Users, Filter, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [shoeSizes, setShoeSizes] = useState([]);
  const [selectedSize, setSelectedSize] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    uniqueSizes: 0,
    filteredCount: 0
  });

  useEffect(() => {
    fetchShoeSizes();
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, selectedSize, searchQuery]);

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

  const fetchCustomers = async (size = null) => {
    setLoading(true);
    try {
      const url = size && size !== "all" ? `${API}/customers?shoe_size=${size}` : `${API}/customers`;
      const response = await axios.get(url);
      setCustomers(response.data);
      setStats(prev => ({ ...prev, totalCustomers: response.data.length }));
    } catch (error) {
      console.error("Fetch customers error:", error);
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const fetchShoeSizes = async () => {
    try {
      const response = await axios.get(`${API}/shoe-sizes`);
      setShoeSizes(response.data.shoe_sizes);
      setStats(prev => ({ ...prev, uniqueSizes: response.data.shoe_sizes.length }));
    } catch (error) {
      console.error("Fetch sizes error:", error);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Filter by shoe size
    if (selectedSize && selectedSize !== "all") {
      filtered = filtered.filter(customer => 
        customer.shoe_sizes.includes(selectedSize)
      );
    }

    // Filter by search query
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
    setStats(prev => ({ ...prev, filteredCount: filtered.length }));
  };

  const openWhatsApp = (phone, countryCode) => {
    if (!phone) {
      toast.error("No phone number available");
      return;
    }
    
    let cleanedPhone = phone.replace(/\D/g, '');
    
    // Country dial codes mapping
    const countryDialCodes = {
      'US': '1', 'IN': '91', 'GB': '44', 'AE': '971', 'SA': '966',
      'CA': '1', 'AU': '61', 'PK': '92', 'BD': '880', 'DE': '49',
      'FR': '33', 'IT': '39', 'ES': '34', 'BR': '55', 'MX': '52'
    };
    
    if (countryCode && !cleanedPhone.startsWith(countryDialCodes[countryCode] || '')) {
      const dialCode = countryDialCodes[countryCode];
      if (dialCode) {
        cleanedPhone = dialCode + cleanedPhone;
      }
    }
    
    window.open(`https://wa.me/${cleanedPhone}`, '_blank');
  };

  const openBulkWhatsApp = () => {
    const validPhones = filteredCustomers.filter(c => c.phone);
    
    if (validPhones.length === 0) {
      toast.error("No customers with phone numbers in this selection");
      return;
    }

    toast.success(`Opening WhatsApp for ${validPhones.length} customers`);
    
    validPhones.forEach((customer, index) => {
      setTimeout(() => {
        openWhatsApp(customer.phone, customer.country_code);
      }, index * 1000); // Delay to avoid blocking
    });
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
            <Button 
              onClick={syncShopifyData} 
              disabled={syncing}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 shadow-lg shadow-indigo-200 transition-all hover:shadow-xl"
              data-testid="sync-shopify-btn"
            >
              <RefreshCw className={`mr-2 h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Shopify Data'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-100">Total Customers</CardDescription>
              <CardTitle className="text-4xl font-bold">{stats.totalCustomers}</CardTitle>
            </CardHeader>
            <CardContent>
              <Users className="h-8 w-8 opacity-80" />
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-100">Unique Shoe Sizes</CardDescription>
              <CardTitle className="text-4xl font-bold">{stats.uniqueSizes}</CardTitle>
            </CardHeader>
            <CardContent>
              <Filter className="h-8 w-8 opacity-80" />
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-100">Filtered Results</CardDescription>
              <CardTitle className="text-4xl font-bold">{stats.filteredCount}</CardTitle>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Shoe Size</label>
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

              <div className="flex items-end">
                <Button 
                  onClick={openBulkWhatsApp}
                  disabled={filteredCustomers.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium shadow-lg shadow-green-200 transition-all hover:shadow-xl"
                  data-testid="bulk-whatsapp-btn"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message {filteredCustomers.length} Customers
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card className="border-none shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-2xl" style={{ fontFamily: 'Space Grotesk' }}>Customers</CardTitle>
            <CardDescription>
              {loading ? 'Loading customers...' : `Showing ${filteredCustomers.length} customer(s)`}
            </CardDescription>
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
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Shoe Sizes</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.customer_id} data-testid={`customer-row-${customer.customer_id}`}>
                        <TableCell className="font-medium">
                          {customer.first_name} {customer.last_name}
                        </TableCell>
                        <TableCell className="text-slate-600">{customer.email || 'N/A'}</TableCell>
                        <TableCell className="text-slate-600">{customer.phone || 'N/A'}</TableCell>
                        <TableCell>
                          {customer.country_code ? (
                            <Badge variant="outline">{customer.country_code}</Badge>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {customer.shoe_sizes.map((size, idx) => (
                              <Badge key={idx} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                                {size}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{customer.order_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openWhatsApp(customer.phone, customer.country_code)}
                            disabled={!customer.phone}
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;