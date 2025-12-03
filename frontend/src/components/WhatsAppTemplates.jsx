import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Copy,
  Send,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WhatsAppTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [testPhone, setTestPhone] = useState("");
  const [templateVariables, setTemplateVariables] = useState([]);
  
  // Create template states
  const [createDialog, setCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "UTILITY",
    language: "en",
    body: "",
    header: "",
    footer: ""
  });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/whatsapp/templates`);
      if (response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const getStatusBadge = (status) => {
    const statusMap = {
      APPROVED: { color: "bg-green-500", icon: CheckCircle, label: "Approved" },
      PENDING: { color: "bg-yellow-500", icon: Clock, label: "Pending" },
      REJECTED: { color: "bg-red-500", icon: XCircle, label: "Rejected" },
      DRAFT: { color: "bg-gray-500", icon: FileText, label: "Draft" },
    };
    const config = statusMap[status] || statusMap.DRAFT;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleTestTemplate = (template) => {
    setSelectedTemplate(template);
    // Count variables in template
    const bodyText = template.components?.find(c => c.type === "BODY")?.text || "";
    const variableCount = (bodyText.match(/{{(\d+)}}/g) || []).length;
    setTemplateVariables(Array(variableCount).fill(""));
    setTestDialog(true);
  };

  const sendTestTemplate = async () => {
    if (!testPhone || !selectedTemplate) {
      toast.error("Please enter a phone number");
      return;
    }

    try {
      const response = await axios.post(`${API}/whatsapp/send-template`, {
        phone: testPhone,
        template_name: selectedTemplate.name,
        language: selectedTemplate.language || "en",
        variables: templateVariables
      });

      if (response.data.success) {
        toast.success("Test message sent successfully!");
        setTestDialog(false);
        setTestPhone("");
        setTemplateVariables([]);
      } else {
        toast.error(`Failed: ${response.data.error}`);
      }
    } catch (error) {
      toast.error("Failed to send test message");
    }
  };

  const copyTemplateCode = (template) => {
    const code = `// Send ${template.name} template
await axios.post('${API}/whatsapp/send-template', {
  phone: "923001234567",
  template_name: "${template.name}",
  language: "${template.language || 'en'}",
  variables: ["Variable 1", "Variable 2", ...]
});`;
    
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.body) {
      toast.error("Template name and body are required");
      return;
    }

    // Validate name format
    const nameRegex = /^[a-z][a-z0-9_]*$/;
    if (!nameRegex.test(newTemplate.name)) {
      toast.error("Template name must be lowercase with underscores only (e.g., order_update)");
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/whatsapp/templates/create`, newTemplate);
      
      if (response.data.success) {
        toast.success(`✅ Template "${newTemplate.name}" submitted for approval!`);
        toast.info("Approval typically takes 15 mins - 24 hours for UTILITY, 1-3 days for MARKETING");
        setCreateDialog(false);
        setNewTemplate({
          name: "",
          category: "UTILITY",
          language: "en",
          body: "",
          header: "",
          footer: ""
        });
        // Refresh templates
        setTimeout(() => fetchTemplates(), 2000);
      } else {
        toast.error(`Failed: ${response.data.error}`);
      }
    } catch (error) {
      console.error("Template creation error:", error);
      toast.error(error.response?.data?.detail || "Failed to create template");
    } finally {
      setCreating(false);
    }
  };

  const useRecommendedTemplate = (template) => {
    setNewTemplate({
      name: template.name,
      category: template.category,
      language: "en",
      body: template.body,
      header: "",
      footer: ""
    });
    setCreateDialog(true);
  };

  const utilityTemplates = [
    {
      name: "order_confirmation",
      category: "UTILITY",
      type: "Transactional",
      description: "Send when customer places an order",
      body: `Hello {{1}},

Thank you for your order! 🎉

Order Number: #{{2}}
Order Date: {{3}}
Total Amount: Rs. {{4}}

We'll notify you once your order is dispatched.

Thank you for shopping with TNV Collection!`,
      variables: ["Customer Name", "Order Number", "Order Date", "Total Amount"]
    },
    {
      name: "order_dispatched",
      category: "UTILITY",
      type: "Transactional",
      description: "Send when order is shipped",
      body: `Hi {{1}},

Great news! Your order #{{2}} has been dispatched! 📦

Tracking Number: {{3}}
Courier: TCS Express
Expected Delivery: {{4}}

TNV Collection`,
      variables: ["Customer Name", "Order Number", "Tracking Number", "Expected Delivery"]
    },
    {
      name: "delivery_update",
      category: "UTILITY",
      type: "Transactional",
      description: "Send status updates during delivery",
      body: `Hello {{1}},

Your order #{{2}} update:

Status: {{3}}
Location: {{4}}
Updated: {{5}}

Tracking: {{6}}

TNV Collection`,
      variables: ["Customer Name", "Order Number", "Status", "Location", "Update Time", "Tracking"]
    },
    {
      name: "payment_reminder",
      category: "UTILITY",
      type: "Transactional",
      description: "Remind customers about COD payment",
      body: `Hello {{1}},

Reminder: COD payment for order #{{2}}

Amount to Pay: Rs. {{3}}
Delivery Charges: Rs. {{4}}
Total: Rs. {{5}}

Please keep the exact amount ready.

TNV Collection`,
      variables: ["Customer Name", "Order Number", "COD Amount", "Delivery Charges", "Total"]
    },
    {
      name: "order_delivered",
      category: "UTILITY",
      type: "Transactional",
      description: "Confirm successful delivery",
      body: `Hi {{1}},

Your order #{{2}} has been delivered! ✅

Delivered on: {{3}}
Payment: {{4}}

Thank you for choosing TNV Collection!`,
      variables: ["Customer Name", "Order Number", "Delivery Date", "Payment Status"]
    }
  ];

  const marketingTemplates = [
    {
      name: "flash_sale_alert",
      category: "MARKETING",
      type: "Promotional",
      description: "Alert customers about limited-time sales",
      body: `🔥 FLASH SALE ALERT! 🔥

Hi {{1}},

Special {{2}} OFF on {{3}}!

⏰ Hurry! Only {{4}} hours left!

Shop now: {{5}}

Limited stock available!

TNV Collection`,
      variables: ["Customer Name", "Discount %", "Product Category", "Hours", "Shop Link"]
    },
    {
      name: "new_product_launch",
      category: "MARKETING",
      type: "Promotional",
      description: "Announce new product arrivals",
      body: `✨ NEW ARRIVALS! ✨

Hello {{1}},

Check out our latest {{2}} collection!

🎁 Special launch offer: {{3}}

Shop now: {{4}}

Be the first to get yours!

TNV Collection`,
      variables: ["Customer Name", "Collection Name", "Offer", "Shop Link"]
    },
    {
      name: "seasonal_promotion",
      category: "MARKETING",
      type: "Promotional",
      description: "Seasonal sales and special offers",
      body: `🎉 {{1}} SPECIAL OFFER! 🎉

Hi {{2}},

Get {{3}} OFF on entire store!

💰 Use code: {{4}}

Valid till: {{5}}

Shop now: {{6}}

TNV Collection`,
      variables: ["Season", "Customer Name", "Discount", "Promo Code", "Validity", "Link"]
    },
    {
      name: "cart_reminder",
      category: "MARKETING",
      type: "Re-engagement",
      description: "Recover abandoned shopping carts",
      body: `👋 Hi {{1}},

You left {{2}} items in your cart!

Complete your order now and get {{3}} OFF!

Your cart: {{4}}

Offer expires in {{5}} hours.

TNV Collection`,
      variables: ["Customer Name", "Item Count", "Discount", "Cart Link", "Hours"]
    },
    {
      name: "vip_exclusive",
      category: "MARKETING",
      type: "Loyalty",
      description: "VIP customer exclusive offers",
      body: `💎 VIP EXCLUSIVE OFFER 💎

Dear {{1}},

As our valued customer, enjoy {{2}} OFF!

Plus FREE shipping on all orders!

Code: {{3}}

Valid for {{4}} days only.

Shop now: {{5}}

TNV Collection`,
      variables: ["Customer Name", "Discount", "VIP Code", "Days", "Shop Link"]
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              WhatsApp Message Templates
            </h1>
            <p className="text-gray-600 mt-1">
              Create and manage pre-approved message templates
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowGuide(!showGuide)}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {showGuide ? "Hide Guide" : "Show Guide"}
            </Button>
            <Button
              onClick={() => setCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
            <Button
              onClick={() => window.open("https://business.facebook.com/wa/manage/message-templates/", "_blank")}
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              Open Meta Manager
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      {showGuide && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">📋 How to Create Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Step 1: Go to Meta Business Manager</h3>
              <p className="text-sm text-gray-600 mb-2">
                Visit: <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Meta Message Templates</a>
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Step 2: Create Template</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Click "Create Template"</li>
                <li>Name: Use lowercase with underscores (e.g., order_confirmation)</li>
                <li>Category: Choose UTILITY for transactional messages</li>
                <li>Language: Select English</li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Step 3: Add Message Content</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Body: Your message text with variables like {`{{1}}, {{2}}, etc.`}</li>
                <li>Keep it clear and professional</li>
                <li>Use the recommended templates below as examples</li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Step 4: Submit & Wait</h3>
              <p className="text-sm text-gray-600">
                ⏱ Approval time: 15 minutes to 24 hours (usually quick for UTILITY templates)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Templates</p>
              <p className="text-2xl font-bold text-gray-800">{templates.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {templates.filter(t => t.status === "APPROVED").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {templates.filter(t => t.status === "PENDING").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">
                {templates.filter(t => t.status === "REJECTED").length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Your Templates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Templates</span>
            <Button onClick={fetchTemplates} variant="outline" size="sm">
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-2">No templates created yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Create your first template in Meta Business Manager
              </p>
              <Button
                onClick={() => window.open("https://business.facebook.com/wa/manage/message-templates/", "_blank")}
                className="bg-green-600 hover:bg-green-700"
              >
                Create Template
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-gray-800">{template.name}</h3>
                        {getStatusBadge(template.status)}
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">Language: {template.language}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyTemplateCode(template)}
                        title="Copy Code"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {template.status === "APPROVED" && (
                        <Button
                          size="sm"
                          onClick={() => handleTestTemplate(template)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Test
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap">
                    {template.components?.find(c => c.type === "BODY")?.text || "No body text"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Utility Templates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📋 Utility Templates (Transactional Messages)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            <strong>For:</strong> Order updates, shipping notifications, customer service messages.
            <br />
            <strong>Approval:</strong> Usually approved within 15 minutes to 24 hours.
          </p>
          <div className="space-y-4">
            {utilityTemplates.map((template, index) => (
              <div key={index} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{template.name}</h3>
                    <p className="text-sm text-gray-600">{template.description}</p>
                    <Badge variant="outline" className="mt-1">{template.category}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => useRecommendedTemplate(template)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Use Template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(template.body);
                        toast.success("Template copied to clipboard!");
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="bg-white p-3 rounded text-sm text-gray-700 whitespace-pre-wrap mt-2">
                  {template.body}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-600">Variables:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.variables.map((v, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {`{{${i + 1}}}`} = {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* Marketing Templates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Marketing Templates (Promotional Campaigns)
            <Badge className="bg-purple-500">AI-Optimized</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Marketing Messages Lite API Features:</strong>
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>✨ <strong>AI-optimized delivery</strong> - Up to 9% higher delivery rates</li>
              <li>🎯 <strong>Smart targeting</strong> - Prioritizes engaged users</li>
              <li>💰 <strong>Cost-efficient</strong> - Pay only for delivered messages</li>
              <li>📊 <strong>Performance tracking</strong> - Detailed analytics in Meta Ads Manager</li>
              <li>⚡ <strong>Dynamic limits</strong> - Expands reach for high-performing content</li>
            </ul>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            <strong>For:</strong> Promotional campaigns, product launches, flash sales, seasonal offers.
            <br />
            <strong>Approval:</strong> May take 1-3 business days. Ensure content complies with WhatsApp policies.
          </p>
          <div className="space-y-4">
            {marketingTemplates.map((template, index) => (
              <div key={index} className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{template.name}</h3>
                    <p className="text-sm text-gray-600">{template.description}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{template.category}</Badge>
                      <Badge className="text-xs bg-purple-600">{template.type}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => useRecommendedTemplate(template)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Use Template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(template.body);
                        toast.success("Template copied to clipboard!");
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="bg-white p-3 rounded text-sm text-gray-700 whitespace-pre-wrap mt-2">
                  {template.body}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-600">Variables:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.variables.map((v, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {`{{${i + 1}}}`} = {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* Test Template Dialog */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Template: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                placeholder="923001234567"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            {templateVariables.map((_, index) => (
              <div key={index}>
                <label className="text-sm font-medium">Variable {index + 1}</label>
                <Input
                  placeholder={`Enter value for {{${index + 1}}}`}
                  value={templateVariables[index]}
                  onChange={(e) => {
                    const newVars = [...templateVariables];
                    newVars[index] = e.target.value;
                    setTemplateVariables(newVars);
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendTestTemplate} className="bg-green-600 hover:bg-green-700">
              <Send className="w-4 h-4 mr-2" />
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppTemplates;
