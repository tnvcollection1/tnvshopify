import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Default permissions for viewer role
const DEFAULT_PERMISSIONS = {
  can_view: true,
  can_edit: false,
  can_delete: false,
  can_sync_shopify: false,
  can_manage_users: false,
  can_view_revenue: false,
  can_view_phone: false,
  can_export: false,
  can_send_messages: false,
};

export const AuthProvider = ({ children }) => {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if agent is logged in (from localStorage)
    const storedAgent = localStorage.getItem('agent');
    if (storedAgent) {
      try {
        const parsed = JSON.parse(storedAgent);
        // Ensure permissions exist (for backward compatibility)
        if (!parsed.permissions) {
          parsed.permissions = DEFAULT_PERMISSIONS;
          if (parsed.role === 'admin') {
            parsed.permissions = {
              can_view: true,
              can_edit: true,
              can_delete: true,
              can_sync_shopify: true,
              can_manage_users: true,
              can_view_revenue: true,
              can_view_phone: true,
              can_export: true,
              can_send_messages: true,
            };
          } else if (parsed.role === 'manager') {
            parsed.permissions = {
              can_view: true,
              can_edit: true,
              can_delete: false,
              can_sync_shopify: false,
              can_manage_users: false,
              can_view_revenue: true,
              can_view_phone: true,
              can_export: true,
              can_send_messages: true,
            };
          }
        }
        setAgent(parsed);
      } catch (e) {
        console.error('Failed to parse stored agent:', e);
        localStorage.removeItem('agent');
      }
    }
    setLoading(false);
  }, []);

  const login = (agentData) => {
    // Ensure permissions are set
    if (!agentData.permissions) {
      agentData.permissions = DEFAULT_PERMISSIONS;
    }
    setAgent(agentData);
    localStorage.setItem('agent', JSON.stringify(agentData));
  };

  const logout = () => {
    setAgent(null);
    localStorage.removeItem('agent');
  };

  // Helper function to check permissions
  const hasPermission = (permission) => {
    if (!agent || !agent.permissions) return false;
    return agent.permissions[permission] === true;
  };

  // Check if user is admin
  const isAdmin = () => agent?.role === 'admin';
  
  // Check if user can edit
  const canEdit = () => hasPermission('can_edit');
  
  // Check if user can view revenue
  const canViewRevenue = () => hasPermission('can_view_revenue');

  return (
    <AuthContext.Provider value={{ 
      agent, 
      login, 
      logout, 
      loading,
      hasPermission,
      isAdmin,
      canEdit,
      canViewRevenue
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
