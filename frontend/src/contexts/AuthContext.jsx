import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);
const API = process.env.REACT_APP_BACKEND_URL;

// Session validation interval (only validate once every 15 minutes for regular sessions)
const SESSION_VALIDATION_INTERVAL = 15 * 60 * 1000; // 15 minutes
// For "Remember me" sessions, validate less frequently (every 48 hours)
const REMEMBER_ME_VALIDATION_INTERVAL = 48 * 60 * 60 * 1000; // 48 hours
// Max retry attempts before giving up (increased for better resilience)
const MAX_VALIDATION_RETRIES = 5;

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
  const validationRetriesRef = useRef(0);
  
  const [agent, setAgent] = useState(() => {
    // Initialize from localStorage synchronously to prevent flash
    try {
      const storedAgent = localStorage.getItem('agent');
      if (storedAgent) {
        const parsed = JSON.parse(storedAgent);
        
        // Check if session has expired (for "Remember me" sessions)
        if (parsed.sessionExpiry && Date.now() > parsed.sessionExpiry) {
          console.log('Session expired - clearing stored agent');
          localStorage.removeItem('agent');
          return null;
        }
        
        // Ensure permissions exist (for backward compatibility)
        if (!parsed.permissions) {
          parsed.permissions = getPermissionsForRole(parsed.role);
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
        // Invalid stored data - clear and redirect
        localStorage.removeItem('agent');
        setAgent(null);
        setLoading(false);
        setSessionValidated(true);
        return;
      }

      // Check if session has expired
      if (parsed.sessionExpiry && Date.now() > parsed.sessionExpiry) {
        console.log('Session expired - logging out');
        localStorage.removeItem('agent');
        setAgent(null);
        setLoading(false);
        setSessionValidated(true);
        return;
      }

      // Determine validation interval based on "Remember me" setting
      const validationInterval = parsed.rememberMe 
        ? REMEMBER_ME_VALIDATION_INTERVAL 
        : SESSION_VALIDATION_INTERVAL;

      // Skip validation if we validated recently (unless forced)
      const now = Date.now();
      if (!forceValidation && lastValidationRef.current > 0 && 
          (now - lastValidationRef.current) < validationInterval) {
        console.log('Skipping session validation - validated recently');
        setLoading(false);
        setSessionValidated(true);
        return;
      }

      // Validate session with backend (with timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `${API}/api/users/me?user_id=${encodeURIComponent(parsed.id)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Increment retry counter
        validationRetriesRef.current += 1;
        console.warn(`Session validation failed with status ${response.status} (attempt ${validationRetriesRef.current}/${MAX_VALIDATION_RETRIES})`);
        
        // Only log out on explicit 401 (unauthorized) after multiple failures
        // For other errors (500, network, etc.), keep session and retry later
        if (response.status === 401 && validationRetriesRef.current >= MAX_VALIDATION_RETRIES) {
          console.warn('Session explicitly invalidated by server - logging out');
          localStorage.removeItem('agent');
          setAgent(null);
          validationRetriesRef.current = 0;
        } else if (response.status !== 401) {
          // For non-401 errors (server errors), don't count toward logout
          // Just log and keep session
          console.warn('Server error during validation - keeping session');
          validationRetriesRef.current = Math.max(0, validationRetriesRef.current - 1);
        }
        // Otherwise keep the session alive
      } else {
        const data = await response.json();
        if (data.success && data.user) {
          // Update local storage with fresh data from server, preserving session settings
          const updatedAgent = {
            ...data.user,
            rememberMe: parsed.rememberMe,
            sessionExpiry: parsed.sessionExpiry
          };
          localStorage.setItem('agent', JSON.stringify(updatedAgent));
          setAgent(updatedAgent);
          // Reset retry counter on success
          validationRetriesRef.current = 0;
          lastValidationRef.current = now;
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Session validation timed out - keeping session');
      } else {
        console.error('Session validation error:', error);
      }
      // On network error/timeout, don't log out - keep existing session
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
