import { toast } from 'sonner';

/**
 * Enhanced toast notifications with consistent styling
 */
export const showToast = {
  success: (message, options = {}) => {
    toast.success(message, {
      duration: 3000,
      ...options,
    });
  },

  error: (message, options = {}) => {
    toast.error(message, {
      duration: 5000,
      ...options,
    });
  },

  info: (message, options = {}) => {
    toast.info(message, {
      duration: 3000,
      ...options,
    });
  },

  loading: (message, options = {}) => {
    return toast.loading(message, options);
  },

  promise: (promise, messages) => {
    return toast.promise(promise, {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong',
    });
  },

  // Shopify sync specific
  syncProgress: (storeName, stats) => {
    toast.success(
      `✅ Synced ${storeName}: ${stats.created} new, ${stats.updated} updated`,
      { duration: 4000 }
    );
  },

  // CSV upload specific
  csvUploaded: (ordersCount) => {
    toast.success(
      `✅ Successfully imported ${ordersCount} orders from CSV`,
      { duration: 4000 }
    );
  },
};

/**
 * Error message extractor from API responses
 */
export const getErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
