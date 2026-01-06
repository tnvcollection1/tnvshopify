import React from 'react';

// Shopify-style Spinner
export const ShopifySpinner = ({ size = 'default', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    default: 'w-5 h-5 border-2',
    large: 'w-11 h-11 border-3',
  };

  return (
    <div
      className={`inline-block rounded-full border-gray-200 border-t-[#008060] animate-spin ${sizeClasses[size]} ${className}`}
      style={{ borderTopColor: '#008060' }}
    />
  );
};

// Shopify-style Skeleton Loading
export const ShopifySkeleton = ({ className = '', variant = 'text' }) => {
  const variants = {
    text: 'h-4 w-full',
    title: 'h-6 w-2/5',
    card: 'h-32 w-full',
    circle: 'w-10 h-10 rounded-full',
    thumbnail: 'w-16 h-16 rounded-lg',
    button: 'h-9 w-24 rounded-lg',
  };

  return (
    <div
      className={`bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded ${variants[variant]} ${className}`}
      style={{
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
};

// Full page loading state
export const ShopifyPageLoading = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <ShopifySpinner size="large" />
      <p className="mt-4 text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
);

// Table skeleton
export const ShopifyTableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
    <div className="p-4 border-b border-gray-100">
      <ShopifySkeleton variant="title" />
    </div>
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50">
          {Array(cols).fill(0).map((_, i) => (
            <th key={i} className="px-4 py-3">
              <ShopifySkeleton className="h-4 w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array(rows).fill(0).map((_, rowIdx) => (
          <tr key={rowIdx} className="border-b border-gray-100">
            {Array(cols).fill(0).map((_, colIdx) => (
              <td key={colIdx} className="px-4 py-3">
                <ShopifySkeleton className="h-4 w-full" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Card skeleton
export const ShopifyCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm p-5">
    <ShopifySkeleton variant="title" className="mb-4" />
    <ShopifySkeleton className="mb-2" />
    <ShopifySkeleton className="mb-2" />
    <ShopifySkeleton className="w-3/4" />
  </div>
);

// Stats grid skeleton
export const ShopifyStatsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array(count).fill(0).map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-sm p-5">
        <ShopifySkeleton className="h-4 w-24 mb-2" />
        <ShopifySkeleton className="h-8 w-32 mb-2" />
        <ShopifySkeleton className="h-3 w-16" />
      </div>
    ))}
  </div>
);

// Add shimmer keyframes to head if not exists
if (typeof document !== 'undefined') {
  const styleId = 'shopify-skeleton-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default ShopifySpinner;
