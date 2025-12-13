import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MessageCircle,
  Phone,
  Check,
  X,
  RefreshCw,
  Settings,
  Send,
  Users,
  BarChart3,
  Smartphone,
  Link2,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Trash2,
  FileText,
  Plus,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
// Production domain for setup guide
const PRODUCTION_DOMAIN = "https://importbaba.com";

const WhatsAppEmbeddedSignup = () => {
  // State
  const [config, setConfig] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  
  // Dialog states
  const [sendMessageDialog, setSendMessageDialog] = useState(false);
  const [createTemplateDialog, setCreateTemplateDialog] = useState(false);
  const [setupGuideDialog, setSetupGuideDialog] = useState(false);
  
  // Form states
  const [messageForm, setMessageForm] = useState({
    templateName: "",
    recipients: "",
    params: ""
  });
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "MARKETING",
    language: "en",
    headerText: "",
    bodyText: "",
    footerText: "",
    buttonText: ""
  });

  // Configuration IDs for different features
  const CONFIG_IDS = {
    WHATSAPP_EMBEDDED_SIGNUP: '1354082849829675', // WhatsApp embedded sign-up with 60-day expiry
    WHATSAPP_MEASUREMENT_PARTNER: '1202735115144355', // WhatsApp measurement partner (read-only)
    WHATSAPP_MEASUREMENT_PARTNER_2: '2518614531733292', // WhatsApp measurement partner alternate
    INSTAGRAM_ONBOARDING: '786585054404607' // Instagram onboarding
  };

  // State for selected signup type
  const [signupType, setSignupType] = useState('embedded'); // 'embedded', 'measurement', 'instagram'
  const [showSignupOptions, setShowSignupOptions] = useState(false);

  useEffect(() => {
    loadConfig();
    loadAccounts();
    loadFacebookSDK();
    setupMessageEventListener();
    
    return () => {
      // Cleanup message event listener
      window.removeEventListener('message', handleMessageEvent);
    };
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadTemplates(selectedAccount.waba_id);
    }
  }, [selectedAccount]);

  // Load Facebook SDK according to official documentation
  const loadFacebookSDK = () => {
    // Check if SDK is already loaded
    if (window.FB) {
      setSdkLoaded(true);
      return;
    }

    // SDK initialization function
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: config?.app_id || '1242155554406508', // Your App ID
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0' // Graph API version
      });
      setSdkLoaded(true);
      console.log('Facebook SDK initialized');
    };

    // Load SDK script asynchronously
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
  };

  // Re-initialize SDK when config is loaded
  useEffect(() => {
    if (config?.app_id && window.FB) {
      window.FB.init({
        appId: config.app_id,
        autoLogAppEvents: true,
        xfbml: true,
        version: config.graph_api_version || 'v21.0'
      });
    }
  }, [config]);

  // Session logging message event listener (as per official Meta docs)
  // This captures: asset IDs on success, abandoned screen name, or error details
  const handleMessageEvent = (event) => {
    // Only accept messages from Facebook
    if (!event.origin.endsWith('facebook.com')) return;
    
    try {
      const data = JSON.parse(event.data);
      
      // Handle WA_EMBEDDED_SIGNUP message type
      if (data.type === 'WA_EMBEDDED_SIGNUP') {
        console.log('WhatsApp Embedded Signup message event:', data);
        
        // Handle different flow completion types
        if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
          // Successful flow completion
          // FINISH = Cloud API flow completed
          // FINISH_ONLY_WABA = Completed without phone number
          // FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING = Coexistence - user completed with WhatsApp Business App number
          const { phone_number_id, waba_id, business_id } = data.data;
          console.log('Signup completed:', { 
            phone_number_id, 
            waba_id, 
            business_id, 
            event: data.event,
            isCoexistence: data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
          });
          
          // Store the session data for later use with token exchange
          window.waEmbeddedSignupData = {
            phone_number_id,
            waba_id,
            business_id,
            event_type: data.event
          };
          
          if (data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
            toast.success("WhatsApp Business App connected via Coexistence!");
          } else {
            toast.success("WhatsApp Business signup completed! Processing...");
          }
        } else if (data.event === 'CANCEL') {
          // Flow was cancelled or error occurred
          if (data.data?.current_step) {
            // User abandoned the flow
            console.log('Signup cancelled at step:', data.data.current_step);
            toast.info(`Signup cancelled at: ${data.data.current_step}`);
          } else if (data.data?.error_message) {
            // User reported an error
            console.error('Signup error:', {
              message: data.data.error_message,
              error_id: data.data.error_id,
              session_id: data.data.session_id,
              timestamp: data.data.timestamp
            });
            toast.error(`Error: ${data.data.error_message}`);
          }
          setConnecting(false);
        }
      }
      
      // Alternative event format (direct event property)
      if (data.event === 'FINISH' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
        console.log('Direct event - WABA ID:', data.data?.waba_id);
        console.log('Direct event - Phone Number ID:', data.data?.phone_number_id);
        console.log('Direct event - Business ID:', data.data?.business_id);
        
        window.waEmbeddedSignupData = {
          phone_number_id: data.data?.phone_number_id,
          waba_id: data.data?.waba_id,
          business_id: data.data?.business_id,
          event_type: data.event
        };
      }
    } catch (e) {
      // Non-JSON message or not our message type
      console.log('Non-JSON message event:', event.data);
    }
  };

  const setupMessageEventListener = () => {
    window.addEventListener('message', handleMessageEvent);
  };

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API}/whatsapp-business/config`);
      setConfig(response.data);
      
      if (!response.data.is_configured) {
        setSetupGuideDialog(true);
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/whatsapp-business/accounts/${tenantId}`);
      setAccounts(response.data.accounts || []);
      
      if (response.data.accounts?.length > 0) {
        setSelectedAccount(response.data.accounts[0]);
        loadAnalytics();
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async (wabaId) => {
    try {
      const response = await axios.get(`${API}/whatsapp-business/templates/${wabaId}?tenant_id=${tenantId}`);
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      setTemplates([]);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/whatsapp-business/analytics/${tenantId}?days=30`);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  // Response callback (as per official docs)
  const fbLoginCallback = (response) => {
    if (response.authResponse) {
      const code = response.authResponse.code;
      console.log('Facebook login response - code:', code);
      
      // Get the session data from the message event
      const sessionData = window.waEmbeddedSignupData;
      
      if (sessionData && code) {
        // Exchange the code for access token
        exchangeToken(code, sessionData.waba_id, sessionData.phone_number_id);
      } else if (code) {
        // We have the code but need to wait for session data
        toast.info("Processing WhatsApp connection...");
        
        // Wait a bit for the message event to arrive
        setTimeout(() => {
          const delayedSessionData = window.waEmbeddedSignupData;
          if (delayedSessionData) {
            exchangeToken(code, delayedSessionData.waba_id, delayedSessionData.phone_number_id);
          } else {
            toast.error("Could not complete signup. Please try again.");
            setConnecting(false);
          }
        }, 2000);
      }
    } else {
      console.log('Facebook login cancelled or failed:', response);
      toast.error("Connection cancelled or failed");
      setConnecting(false);
    }
  };

  // Launch WhatsApp Embedded Signup (as per official docs)
  const launchWhatsAppSignup = () => {
    if (!config?.is_configured) {
      setSetupGuideDialog(true);
      return;
    }

    if (!window.FB) {
      toast.error("Facebook SDK not loaded. Please refresh the page.");
      return;
    }

    setConnecting(true);
    
    // Clear any previous session data
    window.waEmbeddedSignupData = null;

    // Launch Facebook Login for Business with WhatsApp Embedded Signup configuration
    // Based on official Meta documentation:
    // https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/#invoke-a-login-dialog
    // https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users
    window.FB.login(fbLoginCallback, {
      config_id: '1354082849829675', // WhatsApp Embedded Signup configuration ID
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        featureType: 'whatsapp_business_app_onboarding', // Triggers WhatsApp Business App onboarding (Coexistence)
        sessionInfoVersion: '3'
      }
    });
  };

  const exchangeToken = async (code, wabaId, phoneNumberId) => {
    try {
      const response = await axios.post(`${API}/whatsapp-business/exchange-token?tenant_id=${tenantId}`, {
        code,
        waba_id: wabaId,
        phone_number_id: phoneNumberId
      });

      if (response.data.success) {
        toast.success("WhatsApp Business connected successfully!");
        loadAccounts();
        // Clear session data
        window.waEmbeddedSignupData = null;
      } else {
        throw new Error(response.data.message || "Connection failed");
      }
    } catch (error) {
      console.error("Token exchange error:", error);
      toast.error(error.response?.data?.detail || "Failed to connect WhatsApp Business");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectAccount = async (wabaId) => {
    if (!confirm("Are you sure you want to disconnect this WhatsApp Business account?")) {
      return;
    }

    try {
      await axios.delete(`${API}/whatsapp-business/accounts/${tenantId}/${wabaId}`);
      toast.success("Account disconnected");
      loadAccounts();
    } catch (error) {
      toast.error("Failed to disconnect account");
    }
  };

  const sendMarketingMessage = async () => {
    if (!selectedAccount || !messageForm.templateName || !messageForm.recipients) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const recipients = messageForm.recipients.split(',').map(r => r.trim()).filter(Boolean);
      const params = messageForm.params ? { body: messageForm.params.split(',').map(p => p.trim()) } : null;

      const response = await axios.post(
        `${API}/whatsapp-business/send-marketing/${selectedAccount.waba_id}?tenant_id=${tenantId}`,
        {
          template_name: messageForm.templateName,
          recipients,
          template_params: params
        }
      );

      if (response.data.success) {
        toast.success(`Sent to ${response.data.summary.successful}/${response.data.summary.total} recipients`);
        setSendMessageDialog(false);
        setMessageForm({ templateName: "", recipients: "", params: "" });
        loadAnalytics();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send messages");
    }
  };

  const createTemplate = async () => {
    if (!selectedAccount || !templateForm.name || !templateForm.bodyText) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const components = [];
      
      if (templateForm.headerText) {
        components.push({
          type: "HEADER",
          format: "TEXT",
          text: templateForm.headerText
        });
      }
      
      components.push({
        type: "BODY",
        text: templateForm.bodyText
      });
      
      if (templateForm.footerText) {
        components.push({
          type: "FOOTER",
          text: templateForm.footerText
        });
      }
      
      if (templateForm.buttonText) {
        components.push({
          type: "BUTTONS",
          buttons: [{
            type: "QUICK_REPLY",
            text: templateForm.buttonText
          }]
        });
      }

      const response = await axios.post(
        `${API}/whatsapp-business/templates/${selectedAccount.waba_id}?tenant_id=${tenantId}`,
        {
          name: templateForm.name.toLowerCase().replace(/\s+/g, '_'),
          language: templateForm.language,
          category: templateForm.category,
          components
        }
      );

      if (response.data.success) {
        toast.success("Template submitted for review");
        setCreateTemplateDialog(false);
        setTemplateForm({
          name: "",
          category: "MARKETING",
          language: "en",
          headerText: "",
          bodyText: "",
          footerText: "",
          buttonText: ""
        });
        loadTemplates(selectedAccount.waba_id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create template");
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      APPROVED: "bg-green-100 text-green-800 border-green-200",
      PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      REJECTED: "bg-red-100 text-red-800 border-red-200",
      connected: "bg-green-100 text-green-800 border-green-200",
      GREEN: "bg-green-100 text-green-800 border-green-200",
      YELLOW: "bg-yellow-100 text-yellow-800 border-yellow-200",
      RED: "bg-red-100 text-red-800 border-red-200",
    };
    const variant = variants[status] || "bg-gray-100 text-gray-800 border-gray-200";
    return <Badge variant="outline" className={`${variant} font-medium text-xs`}>{status || "Unknown"}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-green-600" />
              WhatsApp Business Platform
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Connect WhatsApp Business accounts and send marketing messages
            </p>
          </div>
          <div className="flex items-center gap-3">
            {config?.is_configured ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <AlertCircle className="w-3 h-3 mr-1" />
                Setup Required
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={() => setSetupGuideDialog(true)}
              className="h-9 text-sm"
            >
              <Settings className="w-4 h-4 mr-2" />
              Setup Guide
            </Button>
            <Button
              onClick={launchWhatsAppSignup}
              disabled={connecting || !config?.is_configured}
              className="h-9 text-sm bg-green-600 hover:bg-green-700"
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect WhatsApp
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Smartphone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Connected Accounts</p>
                  <p className="text-2xl font-semibold text-gray-900">{accounts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Send className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Messages Sent (30d)</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics?.messages_sent || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Inbound Messages</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics?.inbound_messages || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Delivery Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics?.delivery_rate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList className="bg-white border">
            <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
            <TabsTrigger value="templates">Message Templates</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          </TabsList>

          {/* Connected Accounts Tab */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">WhatsApp Business Accounts</CardTitle>
                <CardDescription>
                  Manage connected WhatsApp Business accounts for your customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12 text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading accounts...
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No WhatsApp accounts connected</h3>
                    <p className="text-gray-500 mb-4">Connect your first WhatsApp Business account to start sending messages</p>
                    <Button onClick={launchWhatsAppSignup} disabled={!config?.is_configured} className="bg-green-600 hover:bg-green-700">
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect WhatsApp Business
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Quality Rating</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Connected</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow key={account.waba_id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-green-600" />
                              {account.phone_number || "Not verified"}
                            </div>
                          </TableCell>
                          <TableCell>{account.verified_name || "—"}</TableCell>
                          <TableCell>{getStatusBadge(account.quality_rating || "GREEN")}</TableCell>
                          <TableCell>{getStatusBadge("connected")}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {account.connected_at ? new Date(account.connected_at).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAccount(account);
                                  setSendMessageDialog(true);
                                }}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Send
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => disconnectAccount(account.waba_id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Message Templates</CardTitle>
                  <CardDescription>
                    Pre-approved templates for sending marketing messages
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setCreateTemplateDialog(true)}
                  disabled={!selectedAccount}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </CardHeader>
              <CardContent>
                {!selectedAccount ? (
                  <div className="text-center py-12 text-gray-500">
                    Connect a WhatsApp account to view templates
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
                    <p className="text-gray-500 mb-4">Create your first message template to start campaigns</p>
                    <Button onClick={() => setCreateTemplateDialog(true)} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Template Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template, idx) => (
                        <TableRow key={idx} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-800">
                              {template.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{template.language}</TableCell>
                          <TableCell>{getStatusBadge(template.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setMessageForm({ ...messageForm, templateName: template.name });
                                setSendMessageDialog(true);
                              }}
                              disabled={template.status !== "APPROVED"}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Use
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign History</CardTitle>
                <CardDescription>
                  Track your WhatsApp marketing campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Zap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Campaign analytics coming soon</h3>
                  <p>Detailed campaign tracking will be available here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Send Message Dialog */}
      <Dialog open={sendMessageDialog} onOpenChange={setSendMessageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Marketing Message</DialogTitle>
            <DialogDescription>
              Send a template message to multiple recipients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Template Name</label>
              <Select
                value={messageForm.templateName}
                onValueChange={(v) => setMessageForm({ ...messageForm, templateName: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.status === "APPROVED").map((t, idx) => (
                    <SelectItem key={idx} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Recipients (comma-separated phone numbers)</label>
              <Textarea
                value={messageForm.recipients}
                onChange={(e) => setMessageForm({ ...messageForm, recipients: e.target.value })}
                placeholder="+1234567890, +0987654321"
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Template Parameters (optional, comma-separated)</label>
              <Input
                value={messageForm.params}
                onChange={(e) => setMessageForm({ ...messageForm, params: e.target.value })}
                placeholder="John, Order #123"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendMessageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendMarketingMessage} className="bg-green-600 hover:bg-green-700">
              <Send className="w-4 h-4 mr-2" />
              Send Messages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={createTemplateDialog} onOpenChange={setCreateTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Message Template</DialogTitle>
            <DialogDescription>
              Templates must be approved by Meta before they can be used
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Template Name</label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="order_confirmation"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <Select
                  value={templateForm.category}
                  onValueChange={(v) => setTemplateForm({ ...templateForm, category: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Header Text (optional)</label>
              <Input
                value={templateForm.headerText}
                onChange={(e) => setTemplateForm({ ...templateForm, headerText: e.target.value })}
                placeholder="🎉 Special Offer!"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Body Text *</label>
              <Textarea
                value={templateForm.bodyText}
                onChange={(e) => setTemplateForm({ ...templateForm, bodyText: e.target.value })}
                placeholder="Hello {{1}}! Your order {{2}} has been confirmed."
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Use {"{{1}}"}, {"{{2}}"} for dynamic parameters</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Footer Text (optional)</label>
              <Input
                value={templateForm.footerText}
                onChange={(e) => setTemplateForm({ ...templateForm, footerText: e.target.value })}
                placeholder="Reply STOP to unsubscribe"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Quick Reply Button (optional)</label>
              <Input
                value={templateForm.buttonText}
                onChange={(e) => setTemplateForm({ ...templateForm, buttonText: e.target.value })}
                placeholder="Shop Now"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createTemplate} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Submit for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setup Guide Dialog */}
      <Dialog open={setupGuideDialog} onOpenChange={setSetupGuideDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-green-600" />
              WhatsApp Business Platform Setup
            </DialogTitle>
            <DialogDescription>
              Follow these steps to enable WhatsApp Embedded Signup
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Step 1 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm flex items-center justify-center">1</span>
                Create a Meta Developer App
              </h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>1. Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="w-3 h-3" /></a></p>
                <p>2. Click <strong>"Create App"</strong></p>
                <p>3. Select <strong>"Other"</strong> as use case, then <strong>"Business"</strong> as app type</p>
                <p>4. Enter your app name and select your Business Portfolio</p>
                <p>5. In the app dashboard, add the <strong>"WhatsApp"</strong> product</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm flex items-center justify-center">2</span>
                Configure Facebook Login for Business
              </h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>1. In your app, go to <strong>App Settings → Basic</strong></p>
                <p>2. Copy your <strong>App ID</strong> and <strong>App Secret</strong></p>
                <p>3. Add <strong>Facebook Login for Business</strong> product</p>
                <p>4. In Facebook Login → Settings, configure:</p>
                <div className="bg-gray-100 p-3 rounded mt-2 space-y-2">
                  <p><strong>Client OAuth Login:</strong> Yes</p>
                  <p><strong>Web OAuth Login:</strong> Yes</p>
                  <p><strong>Enforce HTTPS:</strong> Yes</p>
                  <p><strong>Valid OAuth Redirect URIs:</strong></p>
                  <code className="block text-xs break-all bg-white p-2 rounded">
                    {`${PRODUCTION_DOMAIN}/api/whatsapp-business/callback`}
                  </code>
                  <p><strong>Allowed Domains for the JavaScript SDK:</strong></p>
                  <code className="block text-xs break-all bg-white p-2 rounded">
                    {PRODUCTION_DOMAIN}
                  </code>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm flex items-center justify-center">3</span>
                Set Up Webhooks
              </h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>1. Go to <strong>WhatsApp → Configuration</strong></p>
                <p>2. Click <strong>"Edit"</strong> in the Webhook section</p>
                <p>3. Enter the following:</p>
                <div className="bg-gray-100 p-3 rounded mt-2 space-y-2">
                  <p><strong>Callback URL:</strong></p>
                  <code className="block text-xs break-all">
                    {`${PRODUCTION_DOMAIN}/api/whatsapp-business/webhook`}
                  </code>
                  <p className="mt-2"><strong>Verify Token:</strong></p>
                  <code className="block text-xs">omnisales123</code>
                </div>
                <p className="mt-2">4. Subscribe to: <strong>messages</strong>, <strong>message_template_status_update</strong></p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm flex items-center justify-center">4</span>
                Create Facebook Login Configuration
              </h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>1. Go to <strong>Facebook Login for Business → Configurations</strong></p>
                <p>2. Click <strong>"Create from template"</strong></p>
                <p>3. Select <strong>"WhatsApp Embedded Signup Configuration"</strong></p>
                <p>4. Copy the <strong>Configuration ID</strong> - you'll need this</p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm flex items-center justify-center">5</span>
                Add Environment Variables
              </h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>Add these to your backend <code className="bg-gray-100 px-1 rounded">.env</code> file:</p>
                <div className="bg-gray-900 text-green-400 p-3 rounded mt-2 font-mono text-xs">
                  <p>META_APP_ID=your_app_id_here</p>
                  <p>META_APP_SECRET=your_app_secret_here</p>
                </div>
              </div>
            </div>

            {/* Step 6 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm flex items-center justify-center">6</span>
                Complete App Review (for Production)
              </h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>For <strong>Development Mode</strong> (testing), you can start immediately with test users.</p>
                <p className="mt-2">For <strong>Live Mode</strong>, you need to:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Complete Business Verification</li>
                  <li>Submit for App Review with these permissions:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>whatsapp_business_management</li>
                      <li>whatsapp_business_messaging</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Important Notes
              </h4>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>• In Development Mode, only app admins and testers can connect</li>
                <li>• You can onboard up to 10 businesses per week (200 after verification)</li>
                <li>• Customers will own their WhatsApp assets and can access WhatsApp Manager</li>
                <li>• The exchangeable token code expires in 30 seconds</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupGuideDialog(false)}>
              Close
            </Button>
            <Button
              onClick={() => window.open('https://developers.facebook.com/apps', '_blank')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Meta for Developers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppEmbeddedSignup;
