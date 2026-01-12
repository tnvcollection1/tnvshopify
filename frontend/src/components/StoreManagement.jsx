import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Eye, EyeOff, Store, Search, 
  Globe, Mail, Phone, ExternalLink, Copy, Check, X,
  Save, Users, ShoppingBag, DollarSign, Loader2, RefreshCw
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';
const STORES_API = `${API}/api/wamerce/stores`;

const CURRENCY_OPTIONS = [
  { code: "PKR", symbol: "Rs", name: "Pakistani Rupee" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "ر.س", name: "Saudi Riyal" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
];

const COUNTRY_OPTIONS = [
  "Pakistan", "India", "United States", "United Kingdom", "UAE", 
  "Saudi Arabia", "Bangladesh", "Malaysia", "Singapore", "Australia", "Canada"
];

const StoreManagement = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/stores?limit=100`);
      const data = await res.json();
      setStores(data.stores || []);
    } catch (e) {
      console.error('Failed to fetch stores:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (storeId) => {
    if (!window.confirm('Are you sure you want to deactivate this store?')) return;
    
    try {
      await fetch(`${API}/api/stores/${storeId}`, { method: 'DELETE' });
      fetchStores();
    } catch (e) {
      console.error('Failed to delete store:', e);
    }
  };

  const handleActivate = async (storeId) => {
    try {
      await fetch(`${API}/api/stores/${storeId}/activate`, { method: 'POST' });
      fetchStores();
    } catch (e) {
      console.error('Failed to activate store:', e);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredStores = stores.filter(store => 
    store.name?.toLowerCase().includes(search.toLowerCase()) ||
    store.subdomain?.toLowerCase().includes(search.toLowerCase()) ||
    store.contact?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6" data-testid="store-management">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Store Management</h1>
            <p className="text-gray-500 mt-1">Manage all Wamerce stores and merchants</p>
          </div>
          <button
            onClick={() => {
              setEditingStore(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            data-testid="create-store-btn"
          >
            <Plus className="w-4 h-4" />
            Create Store
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            icon={Store}
            label="Total Stores"
            value={stores.length}
            color="bg-blue-500"
          />
          <StatsCard
            icon={Eye}
            label="Active Stores"
            value={stores.filter(s => s.is_active).length}
            color="bg-green-500"
          />
          <StatsCard
            icon={EyeOff}
            label="Inactive"
            value={stores.filter(s => !s.is_active).length}
            color="bg-gray-500"
          />
          <StatsCard
            icon={Globe}
            label="Custom Domains"
            value={stores.filter(s => s.custom_domain).length}
            color="bg-purple-500"
          />
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stores by name, subdomain, or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>

        {/* Stores Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No stores found. Create your first store to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onEdit={() => {
                  setEditingStore(store);
                  setShowModal(true);
                }}
                onDelete={() => handleDelete(store.id)}
                onActivate={() => handleActivate(store.id)}
                onCopy={copyToClipboard}
                copiedId={copiedId}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <StoreModal
            store={editingStore}
            onSave={() => {
              fetchStores();
              setShowModal(false);
              setEditingStore(null);
            }}
            onClose={() => {
              setShowModal(false);
              setEditingStore(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl p-4 border border-gray-200">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  </div>
);

// Store Card Component
const StoreCard = ({ store, onEdit, onDelete, onActivate, onCopy, copiedId }) => {
  const storeUrl = `https://${store.subdomain}.wamerce.com`;
  
  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition ${
      store.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold ${
              store.is_active ? 'bg-black' : 'bg-gray-400'
            }`}>
              {store.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{store.name}</h3>
              <p className="text-sm text-gray-500">{store.subdomain}.wamerce.com</p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${
            store.is_active 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {store.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Store URL */}
        <div className="flex items-center gap-2 text-sm">
          <Globe className="w-4 h-4 text-gray-400" />
          <a 
            href={storeUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate flex-1"
          >
            {storeUrl}
          </a>
          <button
            onClick={() => onCopy(storeUrl, store.id)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {copiedId === store.id ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        {/* Custom Domain */}
        {store.custom_domain && (
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{store.custom_domain}</span>
          </div>
        )}

        {/* Contact */}
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 truncate">{store.contact?.email || 'No email'}</span>
        </div>

        {/* Currency & Country */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{store.currency?.symbol} {store.currency?.code}</span>
          <span>•</span>
          <span>{store.country}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-sm">
          <div className="flex items-center gap-1 text-gray-500">
            <ShoppingBag className="w-4 h-4" />
            <span>{store.total_products || 0} products</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <DollarSign className="w-4 h-4" />
            <span>{store.total_orders || 0} orders</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
            title="Visit Store"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        {store.is_active ? (
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
            title="Deactivate"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onActivate}
            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
            title="Activate"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Store Modal Component
const StoreModal = ({ store, onSave, onClose }) => {
  const isEdit = !!store;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState(null);
  
  const [formData, setFormData] = useState({
    name: store?.name || '',
    subdomain: store?.subdomain || '',
    tagline: store?.tagline || '',
    description: store?.description || '',
    country: store?.country || 'Pakistan',
    currency: store?.currency || CURRENCY_OPTIONS[0],
    contact: {
      email: store?.contact?.email || '',
      phone: store?.contact?.phone || '',
      whatsapp: store?.contact?.whatsapp || '',
      support_hours: store?.contact?.support_hours || '10 AM - 7 PM'
    },
    shipping_message: store?.shipping_message || 'Free shipping on orders over Rs 5000',
    free_shipping_threshold: store?.free_shipping_threshold || 5000,
    shipping_cost: store?.shipping_cost || 250,
    promo_code: store?.promo_code || 'WELCOME10',
    custom_domain: store?.custom_domain || '',
    theme: store?.theme || {
      primary: '#000000',
      accent: '#c9a050',
      background: '#ffffff'
    },
    is_active: store?.is_active !== false
  });

  const checkSubdomain = async (subdomain) => {
    if (!subdomain || subdomain.length < 3 || isEdit) return;
    
    setSubdomainChecking(true);
    try {
      const res = await fetch(`${API}/api/stores/check-subdomain/${subdomain}`);
      const data = await res.json();
      setSubdomainAvailable(data.available);
    } catch (e) {
      setSubdomainAvailable(null);
    } finally {
      setSubdomainChecking(false);
    }
  };

  const handleSubdomainChange = (value) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, subdomain: cleaned }));
    setSubdomainAvailable(null);
    
    // Debounce check
    clearTimeout(window.subdomainCheckTimeout);
    window.subdomainCheckTimeout = setTimeout(() => checkSubdomain(cleaned), 500);
  };

  const handleCurrencyChange = (code) => {
    const currency = CURRENCY_OPTIONS.find(c => c.code === code) || CURRENCY_OPTIONS[0];
    setFormData(prev => ({ ...prev, currency }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit 
        ? `${API}/api/stores/${store.id}`
        : `${API}/api/stores`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save store');
      }

      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Store' : 'Create New Store'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Store Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="My Awesome Store"
                required
              />
            </div>

            {/* Subdomain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain *</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={formData.subdomain}
                    onChange={(e) => handleSubdomainChange(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      subdomainAvailable === false ? 'border-red-300' : 
                      subdomainAvailable === true ? 'border-green-300' : 'border-gray-300'
                    }`}
                    placeholder="mystore"
                    required
                    disabled={isEdit}
                  />
                  {subdomainChecking && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                  )}
                  {!subdomainChecking && subdomainAvailable === true && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                  {!subdomainChecking && subdomainAvailable === false && (
                    <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                  )}
                </div>
                <span className="text-gray-500">.wamerce.com</span>
              </div>
              {subdomainAvailable === false && (
                <p className="text-red-500 text-xs mt-1">This subdomain is not available</p>
              )}
              {subdomainAvailable === true && (
                <p className="text-green-500 text-xs mt-1">✓ Available</p>
              )}
            </div>

            {/* Country & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={formData.currency.code}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  {CURRENCY_OPTIONS.map(c => (
                    <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact Email & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                <input
                  type="email"
                  value={formData.contact.email}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contact: { ...prev.contact, email: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="store@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.contact.phone}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contact: { ...prev.contact, phone: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="+92-300-1234567"
                />
              </div>
            </div>

            {/* Custom Domain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain (optional)</label>
              <input
                type="text"
                value={formData.custom_domain}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_domain: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="mystore.com"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to use subdomain.wamerce.com only</p>
            </div>

            {/* Shipping */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Free Shipping Threshold</label>
                <input
                  type="number"
                  value={formData.free_shipping_threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, free_shipping_threshold: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost</label>
                <input
                  type="number"
                  value={formData.shipping_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, shipping_cost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>

            {/* Promo Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Promo Code</label>
              <input
                type="text"
                value={formData.promo_code}
                onChange={(e) => setFormData(prev => ({ ...prev, promo_code: e.target.value.toUpperCase() }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="WELCOME10"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-sm font-medium text-gray-700">Store is Active</span>
              </label>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!isEdit && subdomainAvailable === false)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEdit ? 'Save Changes' : 'Create Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreManagement;
