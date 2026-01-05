import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "@/components/DashboardOptimized";
import Login from "@/components/Login";
import Layout from "@/components/Layout";
import LandingPage from "@/components/LandingPage";
import OnboardingWizard from "@/components/OnboardingWizard";
import MetaAdsManager from "@/components/MetaAdsManager";
import Inventory from "@/components/Inventory";
import InventoryOverview from "@/components/InventoryOverview";
import Orders from "@/components/Orders";
import DraftsPage from "@/components/DraftsPage";
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
import DTDCReconciliation from "@/components/DTDCReconciliation";
import DWZ56Shipping from "@/components/DWZ56Shipping";
import DWZ56Purchase from "@/components/DWZ56Purchase";
import Products1688 from "@/components/Products1688";
import FulfillmentDashboard from "@/components/FulfillmentDashboard";
import ProductsCatalog from "@/components/ProductsCatalog";
import Purchase1688Orders from "@/components/Purchase1688Orders";
import ProductScraper from "@/components/ProductScraper";
import WhatsAppInboxStandalone from "@/components/WhatsAppInboxStandalone";
import ImageSearch from "@/components/ImageSearch";
import ProductCollector from "@/components/ProductCollector";
import WhatsAppEmbeddedSignup from "@/components/WhatsAppEmbeddedSignup";
import Alibaba1688Accounts from "@/components/Alibaba1688Accounts";
import InventoryClearance from "@/components/InventoryClearance";
import UserManagement from "@/components/UserManagement";
import TmapiMonitor from "@/components/TmapiMonitor";
import PricingPage from "@/components/PricingPage";
import NotificationSettings from "@/components/NotificationSettings";
import FacebookLeadAds from "@/components/FacebookLeadAds";
import SuperAdminDashboard from "@/components/SuperAdminDashboard";
import WhatsAppCaseStudy from "@/components/WhatsAppCaseStudy";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/LoadingSpinner";

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { agent, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
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

// Landing page route - shows landing for non-auth, redirects to dashboard for auth
function LandingRoute() {
  const { agent, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <LoadingSpinner text="Loading..." size="large" />
      </div>
    );
  }
  
  if (agent) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <LandingPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/meta-ads" 
        element={
          <ProtectedRoute>
            <MetaAdsManager />
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
            <DraftsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/drafts" 
        element={
          <ProtectedRoute>
            <DraftsPage />
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
        path="/whatsapp-business" 
        element={
          <ProtectedRoute>
            <WhatsAppEmbeddedSignup />
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
      <Route 
        path="/dtdc-reconciliation" 
        element={
          <ProtectedRoute>
            <DTDCReconciliation />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dwz56-shipping" 
        element={
          <ProtectedRoute>
            <DWZ56Shipping />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dwz56-purchase" 
        element={
          <ProtectedRoute>
            <DWZ56Purchase />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/1688-products" 
        element={
          <ProtectedRoute>
            <Products1688 />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/fulfillment" 
        element={
          <ProtectedRoute>
            <FulfillmentDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/products" 
        element={
          <ProtectedRoute>
            <ProductsCatalog />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchase-1688" 
        element={
          <ProtectedRoute>
            <Purchase1688Orders />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/product-scraper" 
        element={
          <ProtectedRoute>
            <ProductScraper />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/image-search" 
        element={
          <ProtectedRoute>
            <ImageSearch />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/product-collector" 
        element={
          <ProtectedRoute>
            <ProductCollector />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/1688-accounts" 
        element={
          <ProtectedRoute>
            <Alibaba1688Accounts />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventory-clearance" 
        element={
          <ProtectedRoute>
            <InventoryClearance />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users" 
        element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pricing" 
        element={
          <ProtectedRoute>
            <PricingPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/notifications" 
        element={
          <ProtectedRoute>
            <NotificationSettings />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/lead-ads" 
        element={
          <ProtectedRoute>
            <FacebookLeadAds />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/super-admin" 
        element={
          <ProtectedRoute>
            <SuperAdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/whatsapp-case-study" 
        element={<WhatsAppCaseStudy />}
      />
      <Route 
        path="/tmapi-monitor" 
        element={
          <ProtectedRoute>
            <TmapiMonitor />
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
          <StoreProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <Toaster position="top-right" />
            <HotToaster position="top-right" />
          </StoreProvider>
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;