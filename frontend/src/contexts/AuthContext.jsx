import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);
const API = process.env.REACT_APP_BACKEND_URL;

// SIMPLIFIED SESSION HANDLING - Never auto-logout unless explicitly requested
// Session validation is DISABLED by default to prevent premature logouts
const ENABLE_BACKEND_VALIDATION = false; // Set to true to re-enable server-side session checks
const SESSION_VALIDATION_INTERVAL = 60 * 60 * 1000; // 1 hour (only if validation enabled)

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

// Get permissions based on role
const getPermissionsForRole = (role) => {
  if (role === 'admin') {
    return {
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
  } else if (role === 'manager') {
    return {
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
  return DEFAULT_PERMISSIONS;
};

export const AuthProvider = ({ children }) => {
  const lastValidationRef = useRef(0);
  
  const [agent, setAgent] = useState(() => {
    // Initialize from localStorage synchronously to prevent flash
    try {
      const storedAgent = localStorage.getItem('agent');
      if (storedAgent) {
        const parsed = JSON.parse(storedAgent);
        
        // Only check expiry if sessionExpiry is explicitly set AND is in the past
        // Default: sessions NEVER expire automatically (user must click logout)
        if (parsed.sessionExpiry && parsed.sessionExpiry > 0 && Date.now() > parsed.sessionExpiry) {
          console.log('Session explicitly expired - clearing stored agent');
          localStorage.removeItem('agent');
          return null;
        }
        
        // Ensure permissions exist (for backward compatibility)
        if (!parsed.permissions) {
          parsed.permissions = getPermissionsForRole(parsed.role);
        }
        
        // Extend session expiry on every app load to prevent unexpected logouts
        // This ensures active users stay logged in
        if (!parsed.sessionExpiry || parsed.sessionExpiry < Date.now() + (7 * 24 * 60 * 60 * 1000)) {
          parsed.sessionExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000); // Extend to 30 days
          localStorage.setItem('agent', JSON.stringify(parsed));
        }
        
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse stored agent:', e);
      localStorage.removeItem('agent');
    }
    return null;
  });
  const [loading, setLoading] = useState(false); // Start as false - don't block UI
  const [sessionValidated, setSessionValidated] = useState(true); // Start as true - trust localStorage

  // Validate session against backend (DISABLED by default to prevent premature logouts)
  const validateSession = useCallback(async (forceValidation = false) => {
    const storedAgent = localStorage.getItem('agent');
    if (!storedAgent) {
      setLoading(false);
      setSessionValidated(true);
      return;
    }

    try {
      const parsed = JSON.parse(storedAgent);
      if (!parsed.id) {
        // Invalid stored data - clear
        localStorage.removeItem('agent');
        setAgent(null);
        setLoading(false);
        setSessionValidated(true);
        return;
      }

      // Skip backend validation unless explicitly enabled or forced
      if (!ENABLE_BACKEND_VALIDATION && !forceValidation) {
        console.log('Backend validation disabled - trusting localStorage session');
        setAgent(parsed);
        setLoading(false);
        setSessionValidated(true);
        return;
      }

      // Skip if validated recently
      const now = Date.now();
      if (!forceValidation && lastValidationRef.current > 0 && 
          (now - lastValidationRef.current) < SESSION_VALIDATION_INTERVAL) {
        console.log('Skipping validation - validated recently');
        setLoading(false);
        setSessionValidated(true);
        return;
      }

      // Validate session with backend (with timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(
          `${API}/api/users/me?user_id=${encodeURIComponent(parsed.id)}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // Update local storage with fresh data, preserving session settings
            const updatedAgent = {
              ...data.user,
              rememberMe: parsed.rememberMe ?? true,
              sessionExpiry: Date.now() + (30 * 24 * 60 * 60 * 1000) // Always extend to 30 days on successful validation
            };
            localStorage.setItem('agent', JSON.stringify(updatedAgent));
            setAgent(updatedAgent);
            lastValidationRef.current = now;
          }
        }
        // On ANY error (401, 500, network), KEEP the session - don't log out
        // Users should only be logged out when they explicitly click logout
        // This prevents frustrating session losses during testing/development
      } catch (fetchError) {
        console.warn('Session validation fetch error - keeping session:', fetchError.message);
        // Keep session on network errors
      }
    } catch (error) {
      console.error('Session validation error:', error);
      // Keep session on parse errors too
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
      agentData.permissions = getPermissionsForRole(agentData.role);
    }
    setAgent(agentData);
    localStorage.setItem('agent', JSON.stringify(agentData));
    setSessionValidated(true);
    // Reset validation tracking on login
    lastValidationRef.current = Date.now();
    validationRetriesRef.current = 0;
  };

  const logout = () => {
    setAgent(null);
    localStorage.removeItem('agent');
    setSessionValidated(true);
    // Reset validation tracking on logout
    lastValidationRef.current = 0;
    validationRetriesRef.current = 0;
  };

  // Force re-validate session (useful for components that detect auth issues)
  const refreshSession = () => {
    setSessionValidated(false);
    setLoading(true);
    validateSession(true); // Force validation
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
      sessionValidated,
      refreshSession,
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
