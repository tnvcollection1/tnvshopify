import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useStore } from "../contexts/StoreContext";
import {
  Bell,
  MessageCircle,
  Settings,
  Send,
  Check,
  X,
  RefreshCw,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  Phone,
  ShoppingCart,
  CreditCard,
  Truck,
  XCircle,
  Store,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NotificationSettings = () => {
  const { selectedStore, getStoreName } = useStore();
  
  const [settings, setSettings] = useState({
    enabled: true,
    on_order_created: true,
    on_order_paid: true,
    on_order_fulfilled: true,
    on_order_cancelled: false,
    template_order_created: "order_confirmation",
    template_order_paid: "payment_received",
    template_order_fulfilled: "order_shipped",
    template_order_cancelled: "order_cancelled"
  });
  const [logs, setLogs] = useState([]);
  const [webhookUrls, setWebhookUrls] = useState(null);
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registeringAll, setRegisteringAll] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (selectedStore && selectedStore !== 'all') {
      loadSettings();
      loadLogs();
      loadWebhookStatus();
    }
    loadWebhookUrls();
  }, [selectedStore]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/shopify/notification-settings/${selectedStore}`);
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await axios.get(`${API}/shopify/notification-logs/${selectedStore}?limit=50`);
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  const loadWebhookUrls = async () => {
    try {
      const response = await axios.get(`${API}/shopify/webhook-urls`);
      setWebhookUrls(response.data);
    } catch (error) {
      console.error("Error loading webhook URLs:", error);
    }
  };

  const loadWebhookStatus = async () => {
    try {
      const response = await axios.get(`${API}/shopify/webhook-status/${selectedStore}`);
      setWebhookStatus(response.data);
    } catch (error) {
      console.error("Error loading webhook status:", error);
    }
  };

  const registerWebhooks = async () => {
    if (!selectedStore || selectedStore === 'all') {
      toast.error("Please select a specific store");
      return;
    }

    setRegistering(true);
    try {
      const response = await axios.post(`${API}/shopify/register-webhooks/${selectedStore}`);
      if (response.data.success) {
        toast.success(`Webhooks registered: ${response.data.summary.successful}/${response.data.summary.total}`);
        loadWebhookStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to register webhooks");
    } finally {
      setRegistering(false);
    }
  };

  const registerAllWebhooks = async () => {
    setRegisteringAll(true);
    try {
      const response = await axios.post(`${API}/shopify/register-webhooks-all`);
      if (response.data.success) {
        toast.success(`Webhooks registered for ${response.data.successful}/${response.data.total_stores} stores`);
        loadWebhookStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to register webhooks");
    } finally {
      setRegisteringAll(false);
    }
  };

  const removeWebhooks = async () => {
    if (!confirm("Are you sure you want to remove all webhooks for this store?")) return;
    
    try {
      await axios.delete(`${API}/shopify/webhooks/${selectedStore}`);
      toast.success("Webhooks removed");
      loadWebhookStatus();
    } catch (error) {
      toast.error("Failed to remove webhooks");
    }
  };

  const saveSettings = async () => {
    if (!selectedStore || selectedStore === 'all') {
      toast.error("Please select a specific store");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/shopify/notification-settings/${selectedStore}`, settings);
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };


  const sendTestNotification = async () => {
    if (!testPhone) {
      toast.error("Please enter a phone number");
      return;
    }

    setSendingTest(true);
    try {
      const response = await axios.post(
        `${API}/shopify/test-notification/${selectedStore}?phone=${encodeURIComponent(testPhone)}&template_name=order_confirmation`
      );
      
      if (response.data.success) {
        toast.success("Test notification sent!");
        setTestDialog(false);
        setTestPhone("");
        loadLogs();
      } else {
        toast.error(response.data.error || "Failed to send test");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send test notification");
    } finally {
      setSendingTest(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadge = (status) => {
    const variants = {
      sent: "bg-green-100 text-green-800 border-green-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      skipped: "bg-yellow-100 text-yellow-800 border-yellow-200"
    };
    const icons = {
      sent: <CheckCircle className="w-3 h-3 mr-1" />,
      failed: <XCircle className="w-3 h-3 mr-1" />,
      skipped: <AlertCircle className="w-3 h-3 mr-1" />
    };
    return (
      <Badge variant="outline" className={variants[status] || "bg-gray-100"}>
        {icons[status]}
        {status}
      </Badge>
    );
  };

  if (!selectedStore || selectedStore === 'all') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Store</h3>
            <p className="text-gray-500">Please select a specific store to configure notification settings</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-blue-600" />
              Order Notifications
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Automatically send WhatsApp notifications when orders are placed
              <span className="ml-2 inline-flex items-center gap-1 text-blue-600 font-medium">
                <Store className="w-3 h-3" />
                {getStoreName(selectedStore)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setTestDialog(true)}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Test
            </Button>
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="webhooks">Webhook Setup</TabsTrigger>
            <TabsTrigger value="logs">Notification Logs</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Main Toggle */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Global Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Enable Notifications</Label>
                      <p className="text-sm text-gray-500">Turn on/off all WhatsApp notifications for this store</p>
                    </div>
                    <Switch
                      checked={settings.enabled}
                      onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Event Toggles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notification Events</CardTitle>
                  <CardDescription>Choose which events trigger notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <ShoppingCart className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Order Created</Label>
                        <p className="text-xs text-gray-500">When a new order is placed</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.on_order_created}
                      onCheckedChange={(checked) => setSettings({ ...settings, on_order_created: checked })}
                      disabled={!settings.enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Payment Received</Label>
                        <p className="text-xs text-gray-500">When payment is confirmed</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.on_order_paid}
                      onCheckedChange={(checked) => setSettings({ ...settings, on_order_paid: checked })}
                      disabled={!settings.enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Truck className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Order Shipped</Label>
                        <p className="text-xs text-gray-500">When order is fulfilled/shipped</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.on_order_fulfilled}
                      onCheckedChange={(checked) => setSettings({ ...settings, on_order_fulfilled: checked })}
                      disabled={!settings.enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <XCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Order Cancelled</Label>
                        <p className="text-xs text-gray-500">When order is cancelled</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.on_order_cancelled}
                      onCheckedChange={(checked) => setSettings({ ...settings, on_order_cancelled: checked })}
                      disabled={!settings.enabled}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Template Names */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Message Templates</CardTitle>
                  <CardDescription>WhatsApp template names for each event</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">Order Created Template</Label>
                    <Input
                      value={settings.template_order_created}
                      onChange={(e) => setSettings({ ...settings, template_order_created: e.target.value })}
                      placeholder="order_confirmation"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Payment Received Template</Label>
                    <Input
                      value={settings.template_order_paid}
                      onChange={(e) => setSettings({ ...settings, template_order_paid: e.target.value })}
                      placeholder="payment_received"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Order Shipped Template</Label>
                    <Input
                      value={settings.template_order_fulfilled}
                      onChange={(e) => setSettings({ ...settings, template_order_fulfilled: e.target.value })}
                      placeholder="order_shipped"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Order Cancelled Template</Label>
                    <Input
                      value={settings.template_order_cancelled}
                      onChange={(e) => setSettings({ ...settings, template_order_cancelled: e.target.value })}
                      placeholder="order_cancelled"
                      className="mt-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Templates must be created and approved in WhatsApp Business Manager before use.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks">
            <div className="space-y-6">
              {/* Auto Registration Card */}
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-600" />
                    Auto-Register Webhooks
                  </CardTitle>
                  <CardDescription>
                    Automatically configure webhooks in Shopify using the Admin API
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-3">
                        Click to automatically register all required webhooks for this store. 
                        This requires Shopify API credentials to be configured.
                      </p>
                      {webhookStatus && (
                        <div className="mb-3">
                          {webhookStatus.configured ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {webhookStatus.total_webhooks} webhooks active
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              No webhooks configured
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={registerWebhooks}
                        disabled={registering}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {registering ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" />
                        )}
                        Register for This Store
                      </Button>
                      <Button
                        variant="outline"
                        onClick={registerAllWebhooks}
                        disabled={registeringAll}
                      >
                        {registeringAll ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Store className="w-4 h-4 mr-2" />
                        )}
                        Register for All Stores
                      </Button>
                      {webhookStatus?.configured && (
                        <Button
                          variant="ghost"
                          onClick={removeWebhooks}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove Webhooks
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Manual Setup Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Manual Webhook Configuration</CardTitle>
                  <CardDescription>
                    Or configure these webhooks manually in your Shopify Admin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {webhookUrls ? (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Manual Setup Instructions</h4>
                        <ol className="text-sm text-blue-800 space-y-1">
                          {webhookUrls.instructions?.map((instruction, idx) => (
                            <li key={idx}>{instruction}</li>
                          ))}
                        </ol>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Webhook URL</TableHead>
                            <TableHead className="w-20">Copy</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(webhookUrls.webhooks || {}).map(([event, url]) => (
                            <TableRow key={event}>
                              <TableCell className="font-medium">
                                {event.replace('/', ' → ')}
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                                  {url}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(url)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          onClick={() => window.open('https://admin.shopify.com', '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open Shopify Admin
                        </Button>
                      </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading webhook URLs...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Notification Logs</CardTitle>
                  <CardDescription>Recent notification attempts for this store</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadLogs}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
                    <p>Notification logs will appear here when orders are placed</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">{log.order_number}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {log.customer_phone || "—"}
                            </div>
                          </TableCell>
                          <TableCell>{log.template_name || "—"}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Test Notification Dialog */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Notification</DialogTitle>
            <DialogDescription>
              Send a test WhatsApp notification to verify your setup
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Phone Number</Label>
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-2">
              Enter the phone number with country code
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendTestNotification}
              disabled={sendingTest || !testPhone}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendingTest ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationSettings;
