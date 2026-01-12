import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// MR PORTER Style Layout & Home
import { MrPorterLayout } from './components/MrPorterLayout';
import MrPorterHome from './components/MrPorterHome';

// Existing Pages (will work with new layout)
import LuxuryProductListing from './components/LuxuryProductListing';
import LuxuryProductDetail from './components/LuxuryProductDetail';
import LuxuryShoppingCart from './components/LuxuryShoppingCart';
import LuxuryCheckout from './components/LuxuryCheckout';
import LuxuryOrderConfirmation from './components/LuxuryOrderConfirmation';
import LuxuryOrderTracking from './components/LuxuryOrderTracking';
import CollectionsPage from './components/CollectionsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main storefront routes - MR PORTER Style */}
        <Route path="/" element={
          <MrPorterLayout>
            <MrPorterHome />
          </MrPorterLayout>
        } />
        
        {/* Collections Page */}
        <Route path="/collections" element={
          <MrPorterLayout>
            <CollectionsPage />
          </MrPorterLayout>
        } />
        
        <Route path="/products" element={
          <MrPorterLayout>
            <LuxuryProductListing />
          </MrPorterLayout>
        } />
        
        <Route path="/product/:productId" element={
          <MrPorterLayout>
            <LuxuryProductDetail />
          </MrPorterLayout>
        } />
        
        <Route path="/cart" element={
          <MrPorterLayout>
            <LuxuryShoppingCart />
          </MrPorterLayout>
        } />
        
        <Route path="/checkout" element={
          <MrPorterLayout>
            <LuxuryCheckout />
          </MrPorterLayout>
        } />
        
        <Route path="/order-confirmation/:orderId" element={
          <MrPorterLayout>
            <LuxuryOrderConfirmation />
          </MrPorterLayout>
        } />
        
        <Route path="/track" element={
          <MrPorterLayout>
            <LuxuryOrderTracking />
          </MrPorterLayout>
        } />

        {/* Legacy routes - redirect to new paths */}
        <Route path="/store/:storeSlug" element={<Navigate to="/" replace />} />
        <Route path="/store/:storeSlug/*" element={<Navigate to="/" replace />} />

        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  );
}

export default App;
