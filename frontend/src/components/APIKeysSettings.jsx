import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Key,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Save,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Lock,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const APIKeysSettings = () => {
  const [definitions, setDefinitions] = useState({});
  const [storedKeys, setStoredKeys] = useState({});
  const [configuredKeys, setConfiguredKeys] = useState([]);
  const [keyValues, setKeyValues] = useState({});
  const [showValues, setShowValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      setLoading(true);
      const [defsResponse, keysResponse] = await Promise.all([
        axios.get(`${API}/api-keys/definitions`),
        axios.get(`${API}/api-keys/`)
      ]);

      setDefinitions(defsResponse.data.definitions || {});
      setStoredKeys(keysResponse.data.keys || {});
      setConfiguredKeys(keysResponse.data.configured || []);
      setLastUpdated(keysResponse.data.last_updated);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyChange = (keyName, value) => {
    setKeyValues(prev => ({ ...prev, [keyName]: value }));
  };

  const toggleShowValue = (keyName) => {
    setShowValues(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  const saveKey = async (keyName) => {
    const value = keyValues[keyName];
    if (!value || !value.trim()) {
      toast.error('Please enter a value');
      return;
    }

    try {
      setSaving(prev => ({ ...prev, [keyName]: true }));
      await axios.post(`${API}/api-keys/update`, {
        key_name: keyName,
        key_value: value
      });
      toast.success(`${keyName} saved successfully`);
      setKeyValues(prev => ({ ...prev, [keyName]: '' }));
      fetchAPIKeys();
    } catch (error) {
      console.error('Error saving key:', error);
      toast.error(error.response?.data?.detail || 'Failed to save key');
    } finally {
      setSaving(prev => ({ ...prev, [keyName]: false }));
    }
  };

  const deleteKey = async (keyName) => {
    if (!window.confirm(`Are you sure you want to delete ${keyName}?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/api-keys/${keyName}`);
      toast.success(`${keyName} deleted successfully`);
      fetchAPIKeys();
    } catch (error) {
      console.error('Error deleting key:', error);
      toast.error('Failed to delete key');
    }
  };

  const getServiceStatus = (serviceKey) => {
    const service = definitions[serviceKey];
    if (!service) return { configured: false, partial: false };

    const serviceKeys = service.keys.map(k => k.key);
    const configuredCount = serviceKeys.filter(k => configuredKeys.includes(k)).length;

    return {
      configured: configuredCount === serviceKeys.length,
      partial: configuredCount > 0 && configuredCount < serviceKeys.length,
      count: configuredCount,
      total: serviceKeys.length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading API keys...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <Alert className="bg-green-50 border-green-200">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>🔒 Secure Storage:</strong> All API keys are encrypted with AES-256 before storage. 
          Your keys are never stored in plain text and cannot be viewed after saving.
        </AlertDescription>
      </Alert>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Integration Status
          </CardTitle>
          <CardDescription>
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'No keys configured yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(definitions).map(([serviceKey, service]) => {
              const status = getServiceStatus(serviceKey);
              return (
                <div
                  key={serviceKey}
                  className={`p-3 rounded-lg border ${status.configured
                      ? 'bg-green-50 border-green-200'
                      : status.partial
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {status.configured ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : status.partial ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">{service.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {status.count}/{status.total} keys configured
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* API Keys Configuration */}
      <Accordion type="multiple" className="space-y-4">
        {Object.entries(definitions).map(([serviceKey, service]) => {
          const status = getServiceStatus(serviceKey);
          return (
            <AccordionItem
              key={serviceKey}
              value={serviceKey}
              className="border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                <div className="flex items-center gap-3 w-full">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    status.configured
                      ? 'bg-green-100'
                      : status.partial
                        ? 'bg-yellow-100'
                        : 'bg-gray-100'
                  }`}>
                    <Lock className={`w-5 h-5 ${
                      status.configured
                        ? 'text-green-600'
                        : status.partial
                          ? 'text-yellow-600'
                          : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-sm text-gray-500">{service.description}</p>
                  </div>
                  <Badge variant={status.configured ? 'success' : status.partial ? 'warning' : 'secondary'}>
                    {status.configured ? 'Configured' : status.partial ? 'Partial' : 'Not Configured'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Documentation Link */}
                  {service.docs_url && (
                    <a
                      href={service.docs_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View API Documentation
                    </a>
                  )}

                  {/* Key Fields */}
                  <div className="grid gap-4">
                    {service.keys.map((keyDef) => {
                      const isConfigured = configuredKeys.includes(keyDef.key);
                      const maskedValue = storedKeys[keyDef.key];

                      return (
                        <div key={keyDef.key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={keyDef.key} className="flex items-center gap-2">
                              {keyDef.label}
                              {isConfigured && (
                                <Badge variant="outline" className="text-green-600 border-green-300">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Set
                                </Badge>
                              )}
                            </Label>
                            {isConfigured && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 h-7"
                                onClick={() => deleteKey(keyDef.key)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Remove
                              </Button>
                            )}
                          </div>

                          {/* Show masked value if configured */}
                          {isConfigured && maskedValue && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                              <Lock className="w-4 h-4" />
                              <code className="font-mono">{maskedValue}</code>
                            </div>
                          )}

                          {/* Input for new/update value */}
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                id={keyDef.key}
                                type={showValues[keyDef.key] ? 'text' : 'password'}
                                value={keyValues[keyDef.key] || ''}
                                onChange={(e) => handleKeyChange(keyDef.key, e.target.value)}
                                placeholder={isConfigured ? 'Enter new value to update' : keyDef.placeholder}
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => toggleShowValue(keyDef.key)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showValues[keyDef.key] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            <Button
                              onClick={() => saveKey(keyDef.key)}
                              disabled={!keyValues[keyDef.key] || saving[keyDef.key]}
                              className="min-w-[100px]"
                            >
                              {saving[keyDef.key] ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-1" />
                                  {isConfigured ? 'Update' : 'Save'}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Security Info */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-gray-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-800">Security Best Practices</h4>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• Keys are encrypted with AES-256 before storage</li>
                <li>• Original values cannot be retrieved after saving</li>
                <li>• Only the last 4 characters are shown for verification</li>
                <li>• Use separate API keys for development and production</li>
                <li>• Rotate keys periodically for enhanced security</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default APIKeysSettings;
