import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Plus,
  Trash2,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Loader2,
  Shield,
  Key,
  User,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const Alibaba1688Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [testingAccount, setTestingAccount] = useState(null);
  
  // Form state for manual token add
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccessToken, setNewAccessToken] = useState('');
  const [newMemberId, setNewMemberId] = useState('');

  // Check for URL params (success/error from OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      toast.success(`Account "${params.get('account')}" authorized successfully!`);
      window.history.replaceState({}, '', '/1688-accounts');
    }
    if (params.get('error')) {
      toast.error(`Authorization failed: ${params.get('error')}`);
      window.history.replaceState({}, '', '/1688-accounts');
    }
  }, []);

  // Load accounts
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/1688/accounts`);
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start OAuth authorization
  const startOAuthAuthorization = async () => {
    const accountName = prompt('Enter a name for this 1688 account:', 'My 1688 Account');
    if (!accountName) return;

    try {
      const res = await fetch(`${API}/api/1688/accounts/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: accountName,
          redirect_uri: `${window.location.origin}/api/1688/accounts/callback`,
        }),
      });
      const data = await res.json();
      
      if (data.success && data.auth_url) {
        // Open 1688 authorization page
        window.location.href = data.auth_url;
      } else {
        toast.error(data.error || 'Failed to start authorization');
      }
    } catch (error) {
      toast.error('Failed to start authorization');
    }
  };

  // Add account manually with token
  const addAccountManually = async () => {
    if (!newAccountName.trim() || !newAccessToken.trim()) {
      toast.error('Please enter account name and access token');
      return;
    }

    setAddingAccount(true);
    try {
      const res = await fetch(`${API}/api/1688/accounts/add-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: newAccountName,
          access_token: newAccessToken,
          member_id: newMemberId || null,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Account added successfully!');
        setShowAddModal(false);
        setNewAccountName('');
        setNewAccessToken('');
        setNewMemberId('');
        loadAccounts();
      } else {
        toast.error(data.error || 'Failed to add account');
      }
    } catch (error) {
      toast.error('Failed to add account');
    } finally {
      setAddingAccount(false);
    }
  };

  // Test account token
  const testAccount = async (accountId) => {
    setTestingAccount(accountId);
    try {
      const res = await fetch(`${API}/api/1688/accounts/${accountId}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success && data.status === 'valid') {
        toast.success('Token is valid and working!');
      } else {
        toast.error(data.message || 'Token is invalid or expired');
      }
      loadAccounts();
    } catch (error) {
      toast.error('Failed to test account');
    } finally {
      setTestingAccount(null);
    }
  };

  // Set default account
  const setDefaultAccount = async (accountId) => {
    try {
      const res = await fetch(`${API}/api/1688/accounts/${accountId}/set-default`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        loadAccounts();
      } else {
        toast.error(data.error || 'Failed to set default');
      }
    } catch (error) {
      toast.error('Failed to set default account');
    }
  };

  // Delete account
  const deleteAccount = async (accountId, accountName) => {
    if (!confirm(`Are you sure you want to delete "${accountName}"?`)) return;

    try {
      const res = await fetch(`${API}/api/1688/accounts/${accountId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Account deleted');
        loadAccounts();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="1688-accounts-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">1688 Accounts</h1>
          <p className="text-gray-500">Manage your 1688.com authorized accounts for ordering</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAccounts} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={startOAuthAuthorization} className="bg-orange-500 hover:bg-orange-600 gap-2">
            <Plus className="w-4 h-4" />
            Connect 1688 Account
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">How 1688 Authorization Works</h3>
              <p className="text-sm text-blue-700 mt-1">
                Click Connect 1688 Account to authorize via 1688.com OAuth. You will be redirected to 1688 to login and verify with SMS. 
                After authorization, you can use this account to place orders on 1688 directly from WaMerce.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700">No 1688 Accounts Connected</h3>
            <p className="text-gray-500 mt-1">Connect your 1688 account to start placing orders</p>
            <div className="flex gap-3 justify-center mt-6">
              <Button onClick={startOAuthAuthorization} className="bg-orange-500 hover:bg-orange-600 gap-2">
                <Plus className="w-4 h-4" />
                Connect via OAuth
              </Button>
              <Button onClick={() => setShowAddModal(true)} variant="outline" className="gap-2">
                <Key className="w-4 h-4" />
                Add Token Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card key={account.account_id} className={account.is_default ? 'ring-2 ring-orange-500' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{account.account_name}</h3>
                        {account.is_default && (
                          <Badge className="bg-orange-500">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        )}
                        {account.is_active ? (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        {account.member_id && (
                          <span>Member ID: {account.member_id}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Authorized: {new Date(account.authorized_at).toLocaleDateString()}
                        </span>
                        {account.expires_at && (
                          <span>
                            Expires: {new Date(account.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testAccount(account.account_id)}
                      disabled={testingAccount === account.account_id}
                    >
                      {testingAccount === account.account_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Test
                    </Button>
                    {!account.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultAccount(account.account_id)}
                      >
                        <Star className="w-4 h-4" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => deleteAccount(account.account_id, account.account_name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Manual Token Button */}
      {accounts.length > 0 && (
        <div className="flex justify-center">
          <Button onClick={() => setShowAddModal(true)} variant="outline" className="gap-2">
            <Key className="w-4 h-4" />
            Add Token Manually
          </Button>
        </div>
      )}

      {/* Manual Token Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Add 1688 Account Manually
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Account Name *</label>
                <Input
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="e.g., My Main 1688 Account"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Access Token *</label>
                <Input
                  value={newAccessToken}
                  onChange={(e) => setNewAccessToken(e.target.value)}
                  placeholder="Paste your 1688 access token"
                  type="password"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get this from 1688 Open Platform → Your App → Authorization Management
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Member ID (Optional)</label>
                <Input
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  placeholder="e.g., b2b-123456789"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={addAccountManually}
                  disabled={addingAccount}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {addingAccount ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Add Account
                </Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Alibaba1688Accounts;
