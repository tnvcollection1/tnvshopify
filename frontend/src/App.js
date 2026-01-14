import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Dashboard from "@/components/ShopifyDashboard";
import Login from "@/components/Login";
import Layout from "@/components/Layout";
import LandingPage from "@/components/LandingPage";
import OnboardingWizard from "@/components/OnboardingWizard";
import MetaAdsManager from "@/components/MetaAdsManager";
import Inventory from "@/components/Inventory";
import InventoryOverview from "@/components/InventoryOverview";
import Orders from "@/components/ShopifyOrders";
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
import ShopifyProducts from "@/components/ShopifyProducts";
import Purchase1688Orders from "@/components/Purchase1688Orders";
import ProductScraper from "@/components/ProductScraper";
import WhatsAppInboxStandalone from "@/components/WhatsAppInboxStandalone";
import ImageSearch from "@/components/ImageSearch";
import ProductCollector from "@/components/ProductCollector";
import WhatsAppEmbeddedSignup from "@/components/WhatsAppEmbeddedSignup";
import Alibaba1688Accounts from "@/components/Alibaba1688Accounts";
import InventoryClearance from "@/components/InventoryClearance";
import ProductApproval from "@/components/ProductApproval";
import UserManagement from "@/components/UserManagement";
import TmapiMonitor from "@/components/TmapiMonitor";
import ShopifyHistoricalSync from "@/components/ShopifyHistoricalSync";
import FulfillmentSync from "@/components/FulfillmentSync";
import FulfillmentPipeline from "@/components/FulfillmentPipeline";
import BulkOrder1688 from "@/components/BulkOrder1688";
import PricingPage from "@/components/PricingPage";
import NotificationSettings from "@/components/NotificationSettings";
import NotificationDashboard from "@/components/NotificationDashboard";
import NotificationPreferences from "@/components/NotificationPreferences";
import FacebookLeadAds from "@/components/FacebookLeadAds";
import SuperAdminDashboard from "@/components/SuperAdminDashboard";
import WhatsAppCaseStudy from "@/components/WhatsAppCaseStudy";
import StorefrontOrders from "@/components/StorefrontOrders";
import StorefrontCMS from "@/components/StorefrontCMS";
import StorefrontConfigManager from "@/components/StorefrontConfigManager";
import HeaderConfigManager from "@/components/HeaderConfigManager";
import MenuTagsManager from "@/components/MenuTagsManager";
import StoreManagement from "@/components/StoreManagement";
import SyncDashboard from "@/components/SyncDashboard";
import StockUpload from "@/components/StockUpload";
import SecurityLogs from "@/components/SecurityLogs";
import TaobaoImport from "@/components/TaobaoImport";
import WarehouseScanner from "@/components/WarehouseScanner";
import CompetitorDashboard from "@/components/CompetitorDashboard";
import CompetitorPriceCatalog from "@/components/CompetitorPriceCatalog";
import ScheduledPriceChecks from "@/components/ScheduledPriceChecks";
import AITools1688 from "@/components/AITools1688";
import DWZ56Tracking from "@/components/DWZ56Tracking";
import Merchants1688 from "@/components/Merchants1688";
import AIProductEditor from "@/components/AIProductEditor";
import ProductLinkManager from "@/components/ProductLinkManager";
import Trade1688Dashboard from "@/components/Trade1688Dashboard";
// TNV Store Components (Namshi-inspired)
import { TNVStoreProvider, TNVHeader, TNVFooter } from "@/components/store/TNVStoreLayout";
import TNVHomePage from "@/components/store/TNVHomePage";
import TNVProductListing from "@/components/store/TNVProductListing";
import TNVProductDetail from "@/components/store/TNVProductDetail";
import TNVCart from "@/components/store/TNVCart";
import TNVCheckout from "@/components/store/TNVCheckout";
import TNVOrderConfirmation from "@/components/store/TNVOrderConfirmation";
// Storefront Components
import { StorefrontLayout, CartProvider } from "@/components/storefront/StorefrontLayout";
import StorefrontHome from "@/components/storefront/StorefrontHome";
import ProductListing from "@/components/storefront/ProductListing";
import ProductDetail from "@/components/storefront/ProductDetail";
import ShoppingCart from "@/components/storefront/ShoppingCart";
import Checkout from "@/components/storefront/Checkout";
import OrderConfirmation from "@/components/storefront/OrderConfirmation";
import OrderTracking from "@/components/storefront/OrderTracking";
// Luxury Storefront Components (Stella McCartney Style)
import { LuxuryStorefrontLayout } from "@/components/storefront/LuxuryStorefrontLayout";
import LuxuryStorefrontHome from "@/components/storefront/LuxuryStorefrontHome";
import LuxuryProductListing from "@/components/storefront/LuxuryProductListing";
import LuxuryProductDetail from "@/components/storefront/LuxuryProductDetail";
import LuxuryShoppingCart from "@/components/storefront/LuxuryShoppingCart";
import LuxuryCheckout from "@/components/storefront/LuxuryCheckout";
import LuxuryOrderConfirmation from "@/components/storefront/LuxuryOrderConfirmation";
import LuxuryOrderTracking from "@/components/storefront/LuxuryOrderTracking";
import MobileAppPreview from "@/components/MobileAppPreview";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StoreProvider, useStore } from "@/contexts/StoreContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/LoadingSpinner";

// Dynamic Storefront Wrapper for store-specific routes
function StorefrontWrapper({ page = 'home' }) {
  const { storeName, productId, orderId } = useParams();
  
  // Map store names to display names
  const storeDisplayNames = {
    'tnvcollection': 'TNC Collection',
    'tnvcollectionpk': 'TNC Collection PK'
  };
  
  const displayName = storeDisplayNames[storeName] || storeName;
  
  return (
    <StorefrontLayout storeName={displayName}>
      {page === 'home' && <StorefrontHome storeName={storeName} />}
      {page === 'listing' && <ProductListing storeName={storeName} />}
      {page === 'detail' && <ProductDetail storeName={storeName} />}
      {page === 'cart' && <ShoppingCart />}
      {page === 'checkout' && <Checkout storeName={storeName} />}
      {page === 'confirmation' && <OrderConfirmation />}
    </StorefrontLayout>
  );
}

// Luxury Storefront Wrapper (Stella McCartney Style)
function LuxuryStorefrontWrapper({ page = 'home' }) {
  return (
    <LuxuryStorefrontLayout>
      {page === 'home' && <LuxuryStorefrontHome />}
      {page === 'listing' && <LuxuryProductListing />}
      {page === 'detail' && <LuxuryProductDetail />}
      {page === 'cart' && <LuxuryShoppingCart />}
      {page === 'checkout' && <LuxuryCheckout />}
      {page === 'confirmation' && <LuxuryOrderConfirmation />}
      {page === 'tracking' && <LuxuryOrderTracking />}
    </LuxuryStorefrontLayout>
  );
}

// TNV Store Wrapper (Namshi-inspired)
function TNVStoreWrapper({ children }) {
  return (
    <TNVStoreProvider storeName="tnvcollection">
      <TNVHeader />
      <main className="min-h-screen">
        {children}
      </main>
      <TNVFooter />
    </TNVStoreProvider>
  );
}

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

// NotificationDashboard wrapper that gets store from context
function NotificationDashboardWrapper() {
  const { selectedStore, getStoreName } = useStore();
  const storeName = selectedStore && selectedStore !== 'all' ? selectedStore : '';
  
  return <NotificationDashboard storeName={storeName} />;
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
            <Orders />
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
        path="/product-approval" 
        element={
          <ProtectedRoute>
            <ProductApproval />
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
        path="/whatsapp-notifications" 
        element={
          <ProtectedRoute>
            <NotificationDashboardWrapper />
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
        path="/1688-merchants" 
        element={
          <ProtectedRoute>
            <Merchants1688 />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/1688-trade" 
        element={
          <ProtectedRoute>
            <Trade1688Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/1688-trade-center" 
        element={
          <ProtectedRoute>
            <Trade1688Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/ai-product-editor" 
        element={
          <ProtectedRoute>
            <AIProductEditor />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/product-link-manager" 
        element={
          <ProtectedRoute>
            <ProductLinkManager />
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
            <ShopifyProducts />
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
        path="/shopify-sync" 
        element={
          <ProtectedRoute>
            <ShopifyHistoricalSync />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/fulfillment-sync" 
        element={
          <ProtectedRoute>
            <FulfillmentSync />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/fulfillment-pipeline" 
        element={
          <ProtectedRoute>
            <FulfillmentPipeline />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dwz56-tracking" 
        element={
          <ProtectedRoute>
            <DWZ56Tracking />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/storefront-orders" 
        element={
          <ProtectedRoute>
            <StorefrontOrders />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/storefront-config" 
        element={
          <ProtectedRoute>
            <StorefrontConfigManager />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/header-config" 
        element={
          <ProtectedRoute>
            <HeaderConfigManager />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/menu-tags" 
        element={
          <ProtectedRoute>
            <MenuTagsManager />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/store-management" 
        element={
          <ProtectedRoute>
            <StoreManagement />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/storefront-cms" 
        element={
          <ProtectedRoute>
            <StorefrontCMS />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/bulk-order-1688" 
        element={
          <ProtectedRoute>
            <BulkOrder1688 />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sync-dashboard" 
        element={
          <ProtectedRoute>
            <SyncDashboard />
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
      <Route 
        path="/stock-upload" 
        element={
          <ProtectedRoute>
            <StockUpload />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/security-logs" 
        element={
          <ProtectedRoute>
            <SecurityLogs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/taobao-import" 
        element={
          <ProtectedRoute>
            <TaobaoImport />
          </ProtectedRoute>
        } 
      />
      
      {/* Warehouse Scanner - PIN Protected (No Login Required) */}
      <Route 
        path="/warehouse" 
        element={<WarehouseScanner />} 
      />
      <Route 
        path="/warehouse/scan" 
        element={<WarehouseScanner />} 
      />
      
      {/* Competitor Price Dashboard */}
      <Route 
        path="/competitor-dashboard" 
        element={
          <ProtectedRoute>
            <CompetitorDashboard />
          </ProtectedRoute>
        } 
      />

      {/* Competitor Price Catalog - Product Comparison View */}
      <Route 
        path="/price-comparison" 
        element={
          <ProtectedRoute>
            <CompetitorPriceCatalog />
          </ProtectedRoute>
        } 
      />

      {/* Scheduled Price Checks */}
      <Route 
        path="/scheduled-price-checks" 
        element={
          <ProtectedRoute>
            <ScheduledPriceChecks />
          </ProtectedRoute>
        } 
      />

      {/* 1688 AI Tools - Translation & Title Generation */}
      <Route 
        path="/1688-ai-tools" 
        element={
          <ProtectedRoute>
            <AITools1688 />
          </ProtectedRoute>
        } 
      />
      
      {/* Public Storefront Routes - No Auth Required */}
      <Route 
        path="/shop" 
        element={
          <StorefrontLayout storeName="TNC Collection">
            <StorefrontHome storeName="tnvcollection" />
          </StorefrontLayout>
        } 
      />
      <Route 
        path="/shop/products" 
        element={
          <StorefrontLayout storeName="TNC Collection">
            <ProductListing storeName="tnvcollection" />
          </StorefrontLayout>
        } 
      />
      <Route 
        path="/shop/product/:productId" 
        element={
          <StorefrontLayout storeName="TNC Collection">
            <ProductDetail storeName="tnvcollection" />
          </StorefrontLayout>
        } 
      />
      <Route 
        path="/shop/cart" 
        element={
          <StorefrontLayout storeName="TNC Collection">
            <ShoppingCart />
          </StorefrontLayout>
        } 
      />
      <Route 
        path="/shop/checkout" 
        element={
          <StorefrontLayout storeName="TNC Collection">
            <Checkout storeName="tnvcollection" />
          </StorefrontLayout>
        } 
      />
      <Route 
        path="/shop/order-confirmation/:orderId" 
        element={
          <StorefrontLayout storeName="TNC Collection">
            <OrderConfirmation />
          </StorefrontLayout>
        } 
      />
      <Route 
        path="/shop/track" 
        element={
          <StorefrontLayout storeName="TNC Collection">
            <OrderTracking />
          </StorefrontLayout>
        } 
      />
      <Route 
        path="/shop/track/:orderId" 
        element={
          <StorefrontLayout storeName="TNC Collection">
            <OrderTracking />
          </StorefrontLayout>
        } 
      />
      <Route 
        path="/shop/:category" 
        element={
          <StorefrontLayout storeName="TNC Collection">
            <ProductListing storeName="tnvcollection" />
          </StorefrontLayout>
        } 
      />
      
      {/* Store-Specific Storefront Routes - Using Luxury Layout (Stella McCartney Style) */}
      <Route 
        path="/store/:storeSlug" 
        element={<LuxuryStorefrontWrapper />} 
      />
      <Route 
        path="/store/:storeSlug/products" 
        element={<LuxuryStorefrontWrapper page="listing" />} 
      />
      <Route 
        path="/store/:storeSlug/product/:productId" 
        element={<LuxuryStorefrontWrapper page="detail" />} 
      />
      <Route 
        path="/store/:storeSlug/cart" 
        element={<LuxuryStorefrontWrapper page="cart" />} 
      />
      <Route 
        path="/store/:storeSlug/checkout" 
        element={<LuxuryStorefrontWrapper page="checkout" />} 
      />
      <Route 
        path="/store/:storeSlug/order-confirmation/:orderId" 
        element={<LuxuryStorefrontWrapper page="confirmation" />} 
      />
      <Route 
        path="/store/:storeSlug/track" 
        element={<LuxuryStorefrontWrapper page="tracking" />} 
      />

      {/* TNV Store Routes - Namshi-inspired Design */}
      <Route path="/tnv" element={<TNVStoreWrapper><TNVHomePage /></TNVStoreWrapper>} />
      <Route path="/tnv/products" element={<TNVStoreWrapper><TNVProductListing /></TNVStoreWrapper>} />
      <Route path="/tnv/:category" element={<TNVStoreWrapper><TNVProductListing /></TNVStoreWrapper>} />
      <Route path="/tnv/:category/:subcategory" element={<TNVStoreWrapper><TNVProductListing /></TNVStoreWrapper>} />
      <Route path="/tnv/product/:productId" element={<TNVStoreWrapper><TNVProductDetail /></TNVStoreWrapper>} />
      <Route path="/tnv/collection/:collectionId" element={<TNVStoreWrapper><TNVProductListing /></TNVStoreWrapper>} />
      <Route path="/tnv/brand/:brandName" element={<TNVStoreWrapper><TNVProductListing /></TNVStoreWrapper>} />
      <Route path="/tnv/category/:categoryName" element={<TNVStoreWrapper><TNVProductListing /></TNVStoreWrapper>} />
      <Route path="/tnv/cart" element={<TNVStoreWrapper><TNVCart /></TNVStoreWrapper>} />
      <Route path="/tnv/checkout" element={<TNVStoreWrapper><TNVCheckout /></TNVStoreWrapper>} />
      <Route path="/tnv/order-confirmation/:orderId" element={<TNVStoreWrapper><TNVOrderConfirmation /></TNVStoreWrapper>} />
      <Route path="/tnv/track/:orderId" element={<TNVStoreWrapper><TNVOrderConfirmation /></TNVStoreWrapper>} />
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