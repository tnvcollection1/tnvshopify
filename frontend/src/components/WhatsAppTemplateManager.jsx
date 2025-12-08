import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Plus, RefreshCw, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const WhatsAppTemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/whatsapp/templates`);
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeSamples = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/whatsapp/templates/init-samples`);
      alert(response.data.message);
      fetchTemplates();
    } catch (error) {
      console.error('Error initializing templates:', error);
      alert('Failed to initialize templates');
    } finally {
      setLoading(false);
    }
  };

  const syncFromMeta = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/whatsapp/templates/sync`);
      alert(response.data.message);
      fetchTemplates();
    } catch (error) {
      console.error('Error syncing templates:', error);
      alert('Failed to sync templates from Meta');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'APPROVED': { variant: 'default', icon: CheckCircle, className: 'bg-green-600' },
      'PENDING': { variant: 'secondary', icon: Clock, className: 'bg-yellow-600' },
      'REJECTED': { variant: 'destructive', icon: XCircle, className: 'bg-red-600' },
      'DRAFT': { variant: 'outline', icon: FileText, className: 'border-gray-400' }
    };
    const config = statusMap[status] || statusMap['DRAFT'];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getCategoryColor = (category) => {
    return category === 'UTILITY' ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50';
  };

  const filteredTemplates = templates.filter(t => {
    if (activeTab === 'all') return true;
    if (activeTab === 'utility') return t.category === 'UTILITY';
    if (activeTab === 'marketing') return t.category === 'MARKETING';
    return true;
  });

  const renderTemplatePreview = (template) => {
    const components = template.components || [];
    const header = components.find(c => c.type === 'header');
    const body = components.find(c => c.type === 'body');
    const footer = components.find(c => c.type === 'footer');
    const buttons = components.find(c => c.type === 'buttons');

    return (
      <div className="border rounded-lg p-4 bg-white max-w-sm">
        {header && (
          <div className="font-bold text-lg mb-2">
            {header.text}
          </div>
        )}
        {body && (
          <div className="text-gray-700 mb-2 whitespace-pre-wrap">
            {body.text}
          </div>
        )}
        {footer && (
          <div className="text-sm text-gray-500 mb-3">
            {footer.text}
          </div>
        )}
        {buttons && buttons.buttons && (
          <div className="space-y-2">
            {buttons.buttons.map((btn, idx) => (
              <button
                key={idx}
                className="w-full py-2 px-4 border rounded-lg text-sm text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                {btn.text}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Templates</h1>
          <p className="text-gray-600 mt-1">Manage your WhatsApp message templates</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={initializeSamples} variant="outline" disabled={loading}>
            <Plus className="w-4 h-4 mr-2" />
            Initialize Samples
          </Button>
          <Button onClick={syncFromMeta} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sync from Meta
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-sm text-gray-600">Total Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {templates.filter(t => t.status === 'APPROVED').length}
            </div>
            <p className="text-sm text-gray-600">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {templates.filter(t => t.status === 'PENDING').length}
            </div>
            <p className="text-sm text-gray-600">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {templates.filter(t => t.category === 'UTILITY').length}
            </div>
            <p className="text-sm text-gray-600">Utility Templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="utility">Utility ({templates.filter(t => t.category === 'UTILITY').length})</TabsTrigger>
          <TabsTrigger value="marketing">Marketing ({templates.filter(t => t.category === 'MARKETING').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading && templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 mb-4">No templates found</p>
                <Button onClick={initializeSamples}>
                  <Plus className="w-4 h-4 mr-2" />
                  Initialize Sample Templates
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{template.name}</h3>
                          {getStatusBadge(template.status)}
                          <Badge className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">Language: {template.language}</p>
                        
                        {/* Template Components Summary */}
                        <div className="flex gap-4 text-sm text-gray-600 mb-4">
                          {template.components?.find(c => c.type === 'header') && (
                            <span>📋 Header</span>
                          )}
                          {template.components?.find(c => c.type === 'body') && (
                            <span>📝 Body</span>
                          )}
                          {template.components?.find(c => c.type === 'footer') && (
                            <span>👣 Footer</span>
                          )}
                          {template.components?.find(c => c.type === 'buttons') && (
                            <span>🔘 Buttons</span>
                          )}
                        </div>

                        {template.status === 'DRAFT' && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                            <p className="font-semibold text-yellow-800">⚠️ Action Required</p>
                            <p className="text-yellow-700 mt-1">
                              This template needs to be created in Meta Business Manager for approval.
                            </p>
                          </div>
                        )}

                        {template.status === 'PENDING' && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                            <p className="font-semibold text-blue-800">⏳ Pending Approval</p>
                            <p className="text-blue-700 mt-1">
                              Template is under review by Meta. Typically takes 24-48 hours.
                            </p>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedTemplate(null)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{selectedTemplate.name}</h3>
                <div className="flex gap-2 mt-2">
                  {getStatusBadge(selectedTemplate.status)}
                  <Badge className={getCategoryColor(selectedTemplate.category)}>
                    {selectedTemplate.category}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setSelectedTemplate(null)}>✕</Button>
            </div>
            
            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-4">Template Preview:</p>
              {renderTemplatePreview(selectedTemplate)}
            </div>

            <div className="mt-6 bg-gray-50 rounded p-4 text-sm">
              <p className="font-semibold mb-2">Usage Instructions:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Parameters in {{curly_braces}} will be replaced with actual values</li>
                <li>Template must be APPROVED before you can send messages</li>
                <li>Create this template in Meta Business Manager if status is DRAFT</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>📚 How to Get Templates Approved</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Go to Meta Business Manager → WhatsApp Manager</li>
            <li>Navigate to Message Templates section</li>
            <li>Click "Create Template" and use the details from DRAFT templates above</li>
            <li>Submit for approval (usually takes 24-48 hours)</li>
            <li>Once approved, click "Sync from Meta" button to update status</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Utility templates are approved faster than marketing templates. Start with order confirmation and shipping updates!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppTemplateManager;
