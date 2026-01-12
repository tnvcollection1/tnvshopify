import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Layout & Pages
import { LuxuryStorefrontLayout } from './components/LuxuryStorefrontLayout';
import LuxuryStorefrontHome from './components/LuxuryStorefrontHome';
import LuxuryProductListing from './components/LuxuryProductListing';
import LuxuryProductDetail from './components/LuxuryProductDetail';
import LuxuryShoppingCart from './components/LuxuryShoppingCart';
import LuxuryCheckout from './components/LuxuryCheckout';
import LuxuryOrderConfirmation from './components/LuxuryOrderConfirmation';
import LuxuryOrderTracking from './components/LuxuryOrderTracking';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main storefront routes */}
        <Route path="/" element={
          <LuxuryStorefrontLayout>
            <LuxuryStorefrontHome />
          </LuxuryStorefrontLayout>
        } />
        
        <Route path="/products" element={
          <LuxuryStorefrontLayout>
            <LuxuryProductListing />
          </LuxuryStorefrontLayout>
        } />
        
        <Route path="/product/:productId" element={
          <LuxuryStorefrontLayout>
            <LuxuryProductDetail />
          </LuxuryStorefrontLayout>
        } />
        
        <Route path="/cart" element={
          <LuxuryStorefrontLayout>
            <LuxuryShoppingCart />
          </LuxuryStorefrontLayout>
        } />
        
        <Route path="/checkout" element={
          <LuxuryStorefrontLayout>
            <LuxuryCheckout />
          </LuxuryStorefrontLayout>
        } />
        
        <Route path="/order-confirmation/:orderId" element={
          <LuxuryStorefrontLayout>
            <LuxuryOrderConfirmation />
          </LuxuryStorefrontLayout>
        } />
        
        <Route path="/track" element={
          <LuxuryStorefrontLayout>
            <LuxuryOrderTracking />
          </LuxuryStorefrontLayout>
        } />

        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
