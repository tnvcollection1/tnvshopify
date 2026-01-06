import React from 'react';
import ShopifySidebar from './ShopifySidebar';
import '../styles/shopify-theme.css';

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <ShopifySidebar />
      <div className="flex-1 ml-60 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
