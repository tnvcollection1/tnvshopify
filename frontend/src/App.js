import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "@/components/Dashboard";
import Login from "@/components/Login";
import Layout from "@/components/Layout";
import Inventory from "@/components/Inventory";
import Orders from "@/components/Orders";
import DispatchTracker from "@/components/DispatchTracker";
import ConfirmationTracker from "@/components/ConfirmationTracker";
import PurchaseTracker from "@/components/PurchaseTracker";
import Reports from "@/components/Reports";
import Analytics from "@/components/Analytics";
import Settings from "@/components/Settings";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";

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
  
  return <Layout>{children}</Layout>;
}

// Login Route wrapper
function LoginRoute() {
  const { agent, login } = useAuth();
  
  if (agent) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Login onLoginSuccess={login} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/customers" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orders" 
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/tracker" 
        element={
          <ProtectedRoute>
            <DispatchTracker />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/confirmation" 
        element={
          <ProtectedRoute>
            <ConfirmationTracker />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchase" 
        element={
          <ProtectedRoute>
            <PurchaseTracker />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory" 
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics" 
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster position="top-right" />
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;