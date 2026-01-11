import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const API = process.env.REACT_APP_BACKEND_URL;

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
  const [agent, setAgent] = useState(() => {
    // Initialize from localStorage synchronously to prevent flash
    try {
      const storedAgent = localStorage.getItem('agent');
      if (storedAgent) {
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
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse stored agent:', e);
      localStorage.removeItem('agent');
    }
    return null;
  });
  const [loading, setLoading] = useState(true); // Start as true to show loading while validating
  const [sessionValidated, setSessionValidated] = useState(false);

  // Validate session against backend on app load
  const validateSession = useCallback(async () => {
    const storedAgent = localStorage.getItem('agent');
    if (!storedAgent) {
      setLoading(false);
      setSessionValidated(true);
      return;
    }

    try {
      const parsed = JSON.parse(storedAgent);
      if (!parsed.id) {
        // Invalid stored data - clear and redirect
        localStorage.removeItem('agent');
        setAgent(null);
        setLoading(false);
        setSessionValidated(true);
        return;
      }

      // Validate session with backend
      const response = await fetch(`${API}/api/users/me?user_id=${encodeURIComponent(parsed.id)}`);
      
      if (!response.ok) {
        // Session invalid - clear localStorage and set agent to null
        console.warn('Session validation failed - logging out');
        localStorage.removeItem('agent');
        setAgent(null);
      } else {
        const data = await response.json();
        if (data.success && data.user) {
          // Update local storage with fresh data from server
          const updatedAgent = data.user;
          localStorage.setItem('agent', JSON.stringify(updatedAgent));
          setAgent(updatedAgent);
        }
      }
    } catch (error) {
      console.error('Session validation error:', error);
      // On network error, don't log out - keep existing session
      // This prevents logout due to temporary network issues
    } finally {
      setLoading(false);
      setSessionValidated(true);
    }
  }, []);

  // Validate session on mount
  useEffect(() => {
    validateSession();
  }, [validateSession]);

  // Listen for storage changes (for cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'agent') {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setAgent(parsed);
          } catch (err) {
            console.error('Failed to parse agent from storage event:', err);
          }
        } else {
          setAgent(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
