import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "@/components/DashboardOptimized";
import Login from "@/components/Login";
import Layout from "@/components/Layout";
import Inventory from "@/components/Inventory";
import InventoryOverview from "@/components/InventoryOverview";
import Orders from "@/components/Orders";
import DispatchTracker from "@/components/DispatchTracker";
import ConfirmationTracker from "@/components/ConfirmationTracker";
import PurchaseTracker from "@/components/PurchaseTracker";
import Reports from "@/components/Reports";
import Analytics from "@/components/Analytics";
import Settings from "@/components/Settings";
import WhatsAppMessaging from "@/components/WhatsAppMessaging";
import WhatsAppInbox from "@/components/WhatsAppInbox";
import WhatsAppTemplates from "@/components/WhatsAppTemplates";
import WhatsAppTemplateManager from "@/components/WhatsAppTemplateManager";
import WhatsAppCampaignManager from "@/components/WhatsAppCampaignManager";
import WhatsAppAnalytics from "@/components/WhatsAppAnalytics";
import TrackingPage from "@/components/TrackingPage";
import MarketingDashboard from "@/components/MarketingDashboard";
import FacebookMarketing from "@/components/FacebookMarketing";
import PerformanceComparison from "@/components/PerformanceComparison";
import InventoryCampaignManager from "@/components/InventoryCampaignManager";
import CampaignManager from "@/components/CampaignManager";
import FlashSaleManager from "@/components/FlashSaleManager";
import CustomerSegmentation from "@/components/CustomerSegmentation";
import CustomerSegmentationDashboard from "@/components/CustomerSegmentationDashboard";
import BundleCreator from "@/components/BundleCreator";
import DynamicPricingDashboard from "@/components/DynamicPricingDashboard";
import InventoryHealthDashboard from "@/components/InventoryHealthDashboard";
import FinanceReconciliation from "@/components/FinanceReconciliation";
import WhatsAppInboxStandalone from "@/components/WhatsAppInboxStandalone";
import InventoryClearance from "@/components/InventoryClearance";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/LoadingSpinner";

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { agent, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading application..." size="large" />
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
        path="/dispatch-tracker" 
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
        path="/inventory-overview" 
        element={
          <ProtectedRoute>
            <InventoryOverview />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/marketing" 
        element={
          <ProtectedRoute>
            <MarketingDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/facebook-marketing" 
        element={
          <ProtectedRoute>
            <FacebookMarketing />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/performance-comparison" 
        element={
          <ProtectedRoute>
            <PerformanceComparison />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/campaigns" 
        element={
          <ProtectedRoute>
            <CampaignManager />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/flash-sales" 
        element={
          <ProtectedRoute>
            <FlashSaleManager />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/segments" 
        element={
          <ProtectedRoute>
            <CustomerSegmentationDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/bundles" 
        element={
          <ProtectedRoute>
            <BundleCreator />
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
      <Route 
        path="/whatsapp" 
        element={
          <ProtectedRoute>
            <WhatsAppMessaging />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/whatsapp-inbox" 
        element={
          <ProtectedRoute>
            <WhatsAppInbox />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inbox" 
        element={<WhatsAppInboxStandalone />} 
      />
      <Route 
        path="/whatsapp-templates" 
        element={
          <ProtectedRoute>
            <WhatsAppTemplateManager />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/whatsapp-campaigns" 
        element={
          <ProtectedRoute>
            <WhatsAppCampaignManager />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/whatsapp-analytics" 
        element={
          <ProtectedRoute>
            <WhatsAppAnalytics />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/tracking/:identifier" 
        element={<TrackingPage />}
      />
      <Route 
        path="/dynamic-pricing" 
        element={
          <ProtectedRoute>
            <DynamicPricingDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory-health" 
        element={
          <ProtectedRoute>
            <InventoryHealthDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/finance-reconciliation" 
        element={
          <ProtectedRoute>
            <FinanceReconciliation />
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
          <HotToaster position="top-right" />
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;