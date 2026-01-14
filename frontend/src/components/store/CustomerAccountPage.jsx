import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, Package, Heart, Star, MapPin, Settings, LogOut, 
  ChevronRight, Edit2, Plus, Trash2, Check, X, RefreshCw,
  ShoppingBag, Clock, Truck, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from './TNVStoreLayout';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Get or create customer ID
const getCustomerId = () => {
  let id = localStorage.getItem('customer_id');
  if (!id) {
    id = 'cust_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('customer_id', id);
  }
  return id;
};

// Dashboard Summary Card
const SummaryCard = ({ icon: Icon, label, value, link, color = 'gray' }) => {
  const colors = {
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };
  
  return (
    <Link 
      to={link}
      className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
      data-testid={`summary-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </Link>
  );
};

// Order Status Badge
const StatusBadge = ({ status }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100'}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

// Recent Order Card
const RecentOrderCard = ({ order, formatPrice, baseUrl }) => {
  return (
    <Link
      to={`${baseUrl}/track/${order.order_id}`}
      className="block bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
      data-testid="recent-order-card"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{order.order_id}</span>
        <StatusBadge status={order.order_status} />
      </div>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{new Date(order.created_at).toLocaleDateString()}</span>
        <span className="font-medium text-black">{formatPrice(order.total)}</span>
      </div>
    </Link>
  );
};

// Address Card
const AddressCard = ({ address, isDefault, onEdit, onDelete, onSetDefault }) => {
  return (
    <div className={`border rounded-xl p-4 ${isDefault ? 'border-black' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{address.label}</span>
          {isDefault && (
            <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">Default</span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(address)} className="p-1 hover:bg-gray-100 rounded">
            <Edit2 className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={() => onDelete(address.id)} className="p-1 hover:bg-gray-100 rounded">
            <Trash2 className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600">{address.full_name}</p>
      <p className="text-sm text-gray-600">{address.address_line1}</p>
      {address.address_line2 && <p className="text-sm text-gray-600">{address.address_line2}</p>}
      <p className="text-sm text-gray-600">
        {address.city}, {address.state} {address.postal_code}
      </p>
      <p className="text-sm text-gray-600">{address.country}</p>
      <p className="text-sm text-gray-500 mt-2">{address.phone}</p>
      
      {!isDefault && (
        <button
          onClick={() => onSetDefault(address.id)}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          Set as default
        </button>
      )}
    </div>
  );
};

// Address Form Modal
const AddressFormModal = ({ address, onSave, onClose }) => {
  const [form, setForm] = useState(address || {
    label: 'Home',
    full_name: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false
  });
  const [saving, setSaving] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error('Failed to save address');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{address ? 'Edit Address' : 'Add New Address'}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <select
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="Home">Home</option>
              <option value="Office">Office</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">Phone *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          
          {/* Address Line 1 */}
          <div>
            <label className="block text-sm font-medium mb-1">Address Line 1 *</label>
            <input
              type="text"
              value={form.address_line1}
              onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
              placeholder="House/Flat No., Building Name"
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          
          {/* Address Line 2 */}
          <div>
            <label className="block text-sm font-medium mb-1">Address Line 2</label>
            <input
              type="text"
              value={form.address_line2}
              onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
              placeholder="Street, Area, Landmark"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          
          {/* City & State */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City *</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State *</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
          </div>
          
          {/* Postal Code & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Postal Code *</label>
              <input
                type="text"
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country *</label>
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              >
                <option value="India">India</option>
                <option value="Pakistan">Pakistan</option>
              </select>
            </div>
          </div>
          
          {/* Default Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Set as default address</span>
          </label>
          
          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border-2 rounded-xl font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50"
              data-testid="save-address-btn"
            >
              {saving ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Customer Account Page
const CustomerAccountPage = () => {
  const { formatPrice, storeConfig, storeName } = useStore();
  const baseUrl = storeConfig?.baseUrl || '/tnv';
  const navigate = useNavigate();
  const customerId = getCustomerId();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, addrRes] = await Promise.all([
        fetch(`${API}/api/ecommerce/customer/${customerId}/dashboard?store=${storeName}`),
        fetch(`${API}/api/ecommerce/customer/${customerId}/addresses`)
      ]);
      
      if (dashRes.ok) {
        setDashboard(await dashRes.json());
      }
      if (addrRes.ok) {
        const addrData = await addrRes.json();
        setAddresses(addrData.addresses || []);
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveAddress = async (addressData) => {
    const method = addressData.id ? 'PUT' : 'POST';
    const url = addressData.id 
      ? `${API}/api/ecommerce/customer/${customerId}/addresses/${addressData.id}`
      : `${API}/api/ecommerce/customer/${customerId}/addresses`;
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addressData)
    });
    
    if (res.ok) {
      toast.success(addressData.id ? 'Address updated!' : 'Address added!');
      fetchData();
    } else {
      throw new Error('Failed to save');
    }
  };
  
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    
    try {
      await fetch(`${API}/api/ecommerce/customer/${customerId}/addresses/${addressId}`, {
        method: 'DELETE'
      });
      setAddresses(addresses.filter(a => a.id !== addressId));
      toast.success('Address deleted');
    } catch (e) {
      toast.error('Failed to delete address');
    }
  };
  
  const handleSetDefault = async (addressId) => {
    const addr = addresses.find(a => a.id === addressId);
    if (addr) {
      await handleSaveAddress({ ...addr, is_default: true });
    }
  };
  
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: User },
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-8">My Account</h1>
        
        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <nav className="space-y-1">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === id 
                        ? 'bg-black text-white' 
                        : 'hover:bg-gray-100'
                    }`}
                    data-testid={`tab-${id}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                  </button>
                ))}
              </nav>
              
              <hr className="my-4" />
              
              <Link
                to={`${baseUrl}/wishlist`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100"
              >
                <Heart className="w-5 h-5" />
                <span className="font-medium">Wishlist</span>
                {dashboard?.wishlist_count > 0 && (
                  <span className="ml-auto text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {dashboard.wishlist_count}
                  </span>
                )}
              </Link>
            </div>
          </div>
          
          {/* Content */}
          <div className="md:col-span-3">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryCard 
                    icon={ShoppingBag} 
                    label="Total Orders" 
                    value={dashboard?.orders_count || 0}
                    link={`${baseUrl}/account`}
                    color="blue"
                  />
                  <SummaryCard 
                    icon={Clock} 
                    label="Pending" 
                    value={dashboard?.pending_orders || 0}
                    link={`${baseUrl}/account`}
                    color="yellow"
                  />
                  <SummaryCard 
                    icon={Heart} 
                    label="Wishlist" 
                    value={dashboard?.wishlist_count || 0}
                    link={`${baseUrl}/wishlist`}
                    color="red"
                  />
                  <SummaryCard 
                    icon={Star} 
                    label="Reviews" 
                    value={dashboard?.reviews_count || 0}
                    link={`${baseUrl}/account`}
                    color="green"
                  />
                </div>
                
                {/* Recent Orders */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Recent Orders</h2>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  
                  {dashboard?.recent_orders?.length > 0 ? (
                    <div className="space-y-3">
                      {dashboard.recent_orders.map(order => (
                        <RecentOrderCard 
                          key={order.order_id}
                          order={order}
                          formatPrice={formatPrice}
                          baseUrl={baseUrl}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No orders yet</p>
                      <Link
                        to={baseUrl}
                        className="inline-block mt-4 px-6 py-2 bg-black text-white rounded-full font-medium"
                      >
                        Start Shopping
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-6">My Orders</h2>
                
                {dashboard?.recent_orders?.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.recent_orders.map(order => (
                      <Link
                        key={order.order_id}
                        to={`${baseUrl}/track/${order.order_id}`}
                        className="block border rounded-xl p-4 hover:border-black transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold">{order.order_id}</span>
                          <StatusBadge status={order.order_status} />
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          <span className="font-medium text-black">{formatPrice(order.total)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
                          <span>View Details</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                    <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
                    <Link
                      to={baseUrl}
                      className="inline-block px-6 py-3 bg-black text-white rounded-full font-medium"
                    >
                      Browse Products
                    </Link>
                  </div>
                )}
              </div>
            )}
            
            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold">My Addresses</h2>
                  <button
                    onClick={() => {
                      setEditingAddress(null);
                      setShowAddressForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-medium"
                    data-testid="add-address-btn"
                  >
                    <Plus className="w-4 h-4" />
                    Add New
                  </button>
                </div>
                
                {addresses.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {addresses.map(addr => (
                      <AddressCard
                        key={addr.id}
                        address={addr}
                        isDefault={addr.is_default}
                        onEdit={(a) => {
                          setEditingAddress(a);
                          setShowAddressForm(true);
                        }}
                        onDelete={handleDeleteAddress}
                        onSetDefault={handleSetDefault}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No addresses saved</h3>
                    <p className="text-gray-500 mb-6">Add an address for faster checkout</p>
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="inline-block px-6 py-3 bg-black text-white rounded-full font-medium"
                    >
                      Add Address
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-6">Account Settings</h2>
                
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="font-medium mb-2">Customer ID</h3>
                    <p className="text-sm text-gray-600 font-mono">{customerId}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      This ID is used to track your orders and wishlist
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="font-medium mb-2">Store</h3>
                    <p className="text-sm text-gray-600">{storeName}</p>
                  </div>
                  
                  <div className="border-t pt-6">
                    <h3 className="font-medium mb-4">Quick Links</h3>
                    <div className="space-y-2">
                      <Link
                        to={`${baseUrl}/track`}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-gray-500" />
                          <span>Track Order</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </Link>
                      <Link
                        to={`${baseUrl}/wishlist`}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <Heart className="w-5 h-5 text-gray-500" />
                          <span>My Wishlist</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Address Form Modal */}
        {showAddressForm && (
          <AddressFormModal
            address={editingAddress}
            onSave={handleSaveAddress}
            onClose={() => {
              setShowAddressForm(false);
              setEditingAddress(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerAccountPage;
