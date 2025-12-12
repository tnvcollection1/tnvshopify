import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-[#0f0f0f]">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-[#0f0f0f]">
        {children}
      </div>
    </div>
  );
};

export default Layout;
