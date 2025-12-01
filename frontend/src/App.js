import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "@/components/Dashboard";
import Login from "@/components/Login";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { agent, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading...</div>
      </div>
    );
  }
  
  if (!agent) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Login Route wrapper
function LoginRoute() {
  const { agent, login } = useAuth();
  
  if (agent) {
    return <Navigate to="/" replace />;
  }
  
  return <Login onLoginSuccess={login} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </div>
  );
}

export default App;