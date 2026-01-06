import { ShopifySpinner, ShopifyPageLoading, ShopifyStatsSkeleton, ShopifyTableSkeleton } from './ui/ShopifyLoading';

const LoadingSpinner = ({ text = 'Loading...', size = 'default', variant = 'spinner' }) => {
  // For full page loading
  if (variant === 'page') {
    return <ShopifyPageLoading />;
  }

  // For stats cards skeleton
  if (variant === 'stats') {
    return <ShopifyStatsSkeleton count={4} />;
  }

  // For table skeleton
  if (variant === 'table') {
    return <ShopifyTableSkeleton rows={5} cols={4} />;
  }

  // Default spinner
  const sizeMap = {
    small: 'small',
    default: 'default',
    large: 'large',
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <ShopifySpinner size={sizeMap[size]} />
      {text && <p className="mt-3 text-sm text-gray-500">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
