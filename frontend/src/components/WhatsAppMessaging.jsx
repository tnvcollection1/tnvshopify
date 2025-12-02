import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, MessageCircle, Search, Filter, Download, Users, Send } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WhatsAppMessaging = () => {
  const { agent } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    agent: 'all',
    store: 'all'
  });
  const [stores, setStores] = useState([]);
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    messaged: 0,
    notMessaged: 0,
    myMessages: 0
  });
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetchContacts();
    fetchAgents();
    fetchStores();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [contacts, searchQuery, filters]);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API}/agents`);
      setAgents(response.data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/stores`);
      setStores(response.data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/whatsapp/contacts`);
      const contactsData = response.data.contacts || [];
      setContacts(contactsData);
      
      // Calculate stats
      const total = contactsData.length;
      const messaged = contactsData.filter(c => c.whatsapp_messaged).length;
      const notMessaged = total - messaged;
      const myMessages = contactsData.filter(c => c.whatsapp_messaged_by === agent?.username).length;
      
      setStats({ total, messaged, notMessaged, myMessages });
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...contacts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name?.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filters.status === 'messaged') {
      filtered = filtered.filter(c => c.whatsapp_messaged);
    } else if (filters.status === 'not_messaged') {
      filtered = filtered.filter(c => !c.whatsapp_messaged);
    }

    // Agent filter
    if (filters.agent !== 'all') {
      filtered = filtered.filter(c => c.whatsapp_messaged_by === filters.agent);
    }

    // Store filter
    if (filters.store !== 'all') {
      filtered = filtered.filter(c => c.store_name === filters.store);
    }

    setFilteredContacts(filtered);
  };

  const handleImportFromCustomers = async () => {
    setImporting(true);
    try {
      const response = await axios.post(`${API}/whatsapp/import-from-customers`, null, {
        params: {
          store_name: filters.store !== 'all' ? filters.store : null,
          limit: 5000
        }
      });

      toast.success(
        `Imported ${response.data.imported + response.data.updated} contacts from dashboard`
      );
      fetchContacts();
    } catch (error) {
      console.error('Error importing customers:', error);
      toast.error(error.response?.data?.detail || 'Failed to import customers');
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
      } else {
        toast.error('Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API}/whatsapp/upload-contacts`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(response.data.message || 'Contacts uploaded successfully');
      setSelectedFile(null);
      fetchContacts();
    } catch (error) {
      console.error('Error uploading contacts:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload contacts');
    } finally {
      setUploading(false);
    }
  };

  const openWhatsApp = async (contact) => {
    try {
      const phone = contact.phone?.replace(/[^0-9+]/g, '');
      if (!phone) {
        toast.error('Invalid phone number');
        return;
      }

      // Generate WhatsApp link
      const response = await axios.post(`${API}/whatsapp/generate-link`, {
        phone: phone,
        country_code: contact.country_code || 'PK'
      });

      const whatsappUrl = response.data.whatsapp_url;

      // Mark as messaged
      await axios.post(`${API}/whatsapp/mark-messaged/${contact.id}`, {
        agent_username: agent.username
      });

      // Open WhatsApp
      window.open(whatsappUrl, '_blank');

      toast.success('WhatsApp opened. Contact marked as messaged.');
      fetchContacts();
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      toast.error('Failed to open WhatsApp');
    }
  };

  const exportReport = async () => {
    try {
      const response = await axios.get(`${API}/whatsapp/export-report`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `whatsapp_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Messaging</h1>
          <p className="text-gray-500 mt-1">Upload contacts and send WhatsApp messages</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleImportFromCustomers} disabled={importing} variant="default">
            <Users className="h-4 w-4 mr-2" />
            {importing ? 'Importing...' : 'Import from Dashboard'}
          </Button>
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Messaged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.messaged}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Not Messaged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.notMessaged}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">My Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.myMessages}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList>
          <TabsTrigger value="contacts">
            <Users className="h-4 w-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="reports">
            <Download className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contact List</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search contacts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="messaged">Messaged</SelectItem>
                      <SelectItem value="not_messaged">Not Messaged</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.agent} onValueChange={(v) => setFilters({ ...filters, agent: v })}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.username} value={a.username}>
                          {a.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.store} onValueChange={(v) => setFilters({ ...filters, store: v })}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Store" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stores</SelectItem>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.store_name}>
                          {s.store_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Sizes</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Messaged By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading contacts...
                        </TableCell>
                      </TableRow>
                    ) : filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No contacts found. Import from dashboard or upload an Excel file.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{contact.name || 'N/A'}</TableCell>
                          <TableCell>{contact.phone || 'N/A'}</TableCell>
                          <TableCell>
                            {contact.order_number ? (
                              <span className="text-xs font-mono">#{contact.order_number}</span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {contact.sizes && contact.sizes.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {contact.sizes.map((size, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {size}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{contact.store_name || '-'}</TableCell>
                          <TableCell>
                            {contact.whatsapp_messaged ? (
                              <Badge variant="success">Messaged</Badge>
                            ) : (
                              <Badge variant="secondary">Not Messaged</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{contact.whatsapp_messaged_by || '-'}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => openWhatsApp(contact)}
                              className="gap-2"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Message
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Contacts</CardTitle>
              <CardDescription>
                Upload an Excel file with customer contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Upload Excel File</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Expected columns: Name, Phone, Email, Country Code (optional)
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="max-w-md mx-auto mb-4"
                />
                {selectedFile && (
                  <div className="text-sm text-gray-600 mb-4">
                    Selected: {selectedFile.name}
                  </div>
                )}
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload Contacts'}
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Excel Format Guide</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Column 1:</strong> Name (Full name of contact)</p>
                  <p><strong>Column 2:</strong> Phone (Phone number with country code)</p>
                  <p><strong>Column 3:</strong> Email (Email address)</p>
                  <p><strong>Column 4:</strong> Country Code (Optional, e.g., PK, US)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Agent-wise Messaging Report</CardTitle>
              <CardDescription>
                View messaging statistics by agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentReport agents={agents} contacts={contacts} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Agent Report Component
const AgentReport = ({ agents, contacts }) => {
  const agentStats = agents.map(agent => {
    const messaged = contacts.filter(c => c.whatsapp_messaged_by === agent.username).length;
    return {
      ...agent,
      messaged
    };
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Messages Sent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agentStats.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8">
                No agents found
              </TableCell>
            </TableRow>
          ) : (
            agentStats.map((agent) => (
              <TableRow key={agent.username}>
                <TableCell className="font-medium">{agent.full_name}</TableCell>
                <TableCell>{agent.username}</TableCell>
                <TableCell>
                  <Badge variant="outline">{agent.messaged}</Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default WhatsAppMessaging;
