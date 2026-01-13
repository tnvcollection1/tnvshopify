import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, UserPlus, Shield, Eye, Edit3, Trash2, 
  RefreshCw, CheckCircle, XCircle, AlertCircle,
  Lock, Mail, Store, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'viewer',
    stores: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchStores();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/users?include_inactive=true`);
      setUsers(res.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users/roles`);
      setRoles(res.data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/stores`);
      setStores(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const params = new URLSearchParams({
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role,
      });
      if (formData.email) params.append('email', formData.email);
      if (formData.stores) params.append('stores', formData.stores);
      
      const res = await axios.post(`${API_URL}/api/users?${params.toString()}`);
      
      if (res.data.success) {
        alert(`✅ User "${formData.username}" created successfully!`);
        setShowCreateModal(false);
        resetForm();
        fetchUsers();
      }
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleUpdateUser = async () => {
    try {
      const params = new URLSearchParams();
      if (formData.full_name) params.append('full_name', formData.full_name);
      if (formData.email) params.append('email', formData.email);
      if (formData.role) params.append('role', formData.role);
      if (formData.status) params.append('status', formData.status);
      if (formData.stores !== undefined) params.append('stores', formData.stores);
      
      const res = await axios.put(`${API_URL}/api/users/${selectedUser.id}?${params.toString()}`);
      
      if (res.data.success) {
        alert(`✅ User updated successfully!`);
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
      }
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to deactivate user "${user.username}"?`)) {
      return;
    }
    
    try {
      const res = await axios.delete(`${API_URL}/api/users/${user.id}`);
      if (res.data.success) {
        alert(`✅ User deactivated`);
        fetchUsers();
      }
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleResetPassword = async () => {
    try {
      const params = new URLSearchParams({ new_password: formData.password });
      const res = await axios.post(`${API_URL}/api/users/${selectedUser.id}/reset-password?${params.toString()}`);
      
      if (res.data.success) {
        alert(`✅ Password reset successfully!`);
        setShowResetPassword(false);
        setSelectedUser(null);
        resetForm();
      }
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      full_name: '',
      email: '',
      role: 'viewer',
      stores: '',
      status: 'active'
    });
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'viewer',
      stores: (user.stores || []).join(', '),
      status: user.status || 'active'
    });
    setShowEditModal(true);
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-red-500/20 text-red-300 border-red-500/50',
      merchant: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
      manager: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      viewer: 'bg-green-500/20 text-green-300 border-green-500/50'
    };
    const icons = {
      admin: <Shield className="w-3 h-3" />,
      merchant: <Store className="w-3 h-3" />,
      manager: <Edit3 className="w-3 h-3" />,
      viewer: <Eye className="w-3 h-3" />
    };
    const labels = {
      admin: 'Admin',
      merchant: 'Merchant',
      manager: 'Manager',
      viewer: 'Viewer'
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${styles[role] || styles.viewer}`}>
        {icons[role] || icons.viewer} {labels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="inline-flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3 h-3" /> Active</span>;
    } else if (status === 'inactive') {
      return <span className="inline-flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3 h-3" /> Inactive</span>;
    } else {
      return <span className="inline-flex items-center gap-1 text-yellow-400 text-xs"><AlertCircle className="w-3 h-3" /> Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
            <Users className="w-10 h-10 text-blue-400" />
            User Management
          </h1>
          <p className="text-gray-400">
            Manage users and their access permissions
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={fetchUsers}
            variant="outline"
            className="border-gray-700 hover:bg-gray-700 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {roles.map((role) => (
          <div key={role.id} className={`p-6 rounded-xl border ${
            role.id === 'admin' ? 'bg-red-500/10 border-red-500/30' :
            role.id === 'manager' ? 'bg-blue-500/10 border-blue-500/30' :
            'bg-green-500/10 border-green-500/30'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">{role.name}</h3>
              {getRoleBadge(role.id)}
            </div>
            <p className="text-sm text-gray-400 mb-4">{role.description}</p>
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                {role.permissions.can_edit ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                <span>Edit Data</span>
              </div>
              <div className="flex items-center gap-2">
                {role.permissions.can_sync_shopify ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                <span>Sync to Shopify</span>
              </div>
              <div className="flex items-center gap-2">
                {role.permissions.can_view_revenue ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                <span>View Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                {role.permissions.can_manage_users ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                <span>Manage Users</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <span className="text-2xl font-bold">
                {users.filter(u => u.role === role.id && u.status === 'active').length}
              </span>
              <span className="text-gray-400 ml-2">active users</span>
            </div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold">All Users ({users.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Store Access</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Last Login</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-700/30 transition-colors ${user.status === 'inactive' ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-white">{user.full_name || user.username}</div>
                      <div className="text-sm text-gray-400">@{user.username}</div>
                      {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4">
                    {user.stores && user.stores.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.stores.map((store, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-gray-700 rounded">{store}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">All Stores</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-xs px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded transition-colors"
                        title="Edit User"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => { setSelectedUser(user); setShowResetPassword(true); }}
                        className="text-xs px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded transition-colors"
                        title="Reset Password"
                      >
                        <Lock className="w-3 h-3" />
                      </button>
                      {user.username !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-xs px-3 py-1 bg-red-700 hover:bg-red-600 rounded transition-colors"
                          title="Deactivate User"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-400" />
              Create New User
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username *</label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="Enter username"
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password *</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Enter password"
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name *</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Enter full name"
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email (optional)</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Enter email"
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                >
                  <option value="viewer">👁️ Viewer - Read-only access</option>
                  <option value="merchant">🏪 Merchant - Manage assigned stores</option>
                  <option value="manager">✏️ Manager - View & Edit all</option>
                  <option value="admin">🛡️ Admin - Full access</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Store Access {formData.role === 'merchant' ? '*' : '(optional)'}
                </label>
                <Input
                  value={formData.stores}
                  onChange={(e) => setFormData({...formData, stores: e.target.value})}
                  placeholder="store1, store2 (leave empty for all)"
                  className="bg-gray-700 border-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.role === 'merchant' 
                    ? '⚠️ Required for merchants. Comma-separated store names.'
                    : 'Comma-separated store names. Empty = access to all stores.'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                variant="outline"
                className="flex-1 border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!formData.username || !formData.password || !formData.full_name}
              >
                Create User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Edit3 className="w-6 h-6 text-blue-400" />
              Edit User: {selectedUser.username}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Enter full name"
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Enter email"
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  disabled={selectedUser.username === 'admin'}
                >
                  <option value="viewer">👁️ Viewer - Read-only access</option>
                  <option value="manager">✏️ Manager - View & Edit</option>
                  <option value="admin">🛡️ Admin - Full access</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  disabled={selectedUser.username === 'admin'}
                >
                  <option value="active">✅ Active</option>
                  <option value="inactive">❌ Inactive</option>
                  <option value="pending">⏳ Pending</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Store Access</label>
                <Input
                  value={formData.stores}
                  onChange={(e) => setFormData({...formData, stores: e.target.value})}
                  placeholder="store1, store2 (leave empty for all)"
                  className="bg-gray-700 border-gray-600"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
                variant="outline"
                className="flex-1 border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateUser}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Lock className="w-6 h-6 text-yellow-400" />
              Reset Password: {selectedUser.username}
            </h2>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">New Password *</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter new password"
                className="bg-gray-700 border-gray-600"
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => { setShowResetPassword(false); setSelectedUser(null); resetForm(); }}
                variant="outline"
                className="flex-1 border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                disabled={!formData.password || formData.password.length < 4}
              >
                Reset Password
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
