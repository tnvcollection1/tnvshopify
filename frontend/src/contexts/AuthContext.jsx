import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if agent is logged in (from localStorage)
    const storedAgent = localStorage.getItem('agent');
    if (storedAgent) {
      try {
        setAgent(JSON.parse(storedAgent));
      } catch (e) {
        console.error('Failed to parse stored agent:', e);
        localStorage.removeItem('agent');
      }
    }
    setLoading(false);
  }, []);

  const login = (agentData) => {
    setAgent(agentData);
    localStorage.setItem('agent', JSON.stringify(agentData));
  };

  const logout = () => {
    setAgent(null);
    localStorage.removeItem('agent');
  };

  return (
    <AuthContext.Provider value={{ agent, login, logout, loading }}>
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
