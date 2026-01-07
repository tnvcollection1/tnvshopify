import React, { useState, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Package,
  RefreshCw,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '../contexts/StoreContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Upload Card Component
const UploadCard = ({ title, description, icon: Icon, onUpload, accept, uploading, progress }) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }, [onUpload]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`bg-white rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer
        ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handleFileSelect}
      />
      <Icon className={`w-12 h-12 mx-auto mb-4 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      {uploading ? (
        <div className="space-y-2">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-blue-500" />
          {progress > 0 && <Progress value={progress} className="h-2" />}
        </div>
      ) : (
        <p className="text-xs text-gray-400">Click or drag file to upload</p>
      )}
    </div>
  );
};

// Result Card Component
const ResultCard = ({ result }) => {
  if (!result) return null;

  const isSuccess = result.success;
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <div className={`mt-4 p-4 rounded-lg ${isSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${isSuccess ? 'text-green-600' : 'text-red-600'}`} />
        <div className="flex-1">
          <h4 className={`font-medium ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
            {isSuccess ? 'Upload Successful' : 'Upload Failed'}
          </h4>
          <p className="text-sm mt-1">
            {result.message || (isSuccess ? `Processed ${result.processed || 0} records` : 'An error occurred')}
          </p>
          {result.details && (
            <div className="mt-2 text-xs space-y-1">
              {result.details.created && <p>✓ Created: {result.details.created}</p>}
              {result.details.updated && <p>✓ Updated: {result.details.updated}</p>}
              {result.details.skipped && <p>⚠ Skipped: {result.details.skipped}</p>}
              {result.details.errors && <p>✗ Errors: {result.details.errors}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Template Download Button
const TemplateButton = ({ label, onClick }) => (
  <Button variant="outline" size="sm" onClick={onClick} className="gap-2">
    <Download className="w-4 h-4" />
    {label}
  </Button>
);

// Main Component
const StockUpload = () => {
  const { selectedStore, getStoreName } = useStore();
  const [activeTab, setActiveTab] = useState('stock');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  // Download template
  const downloadTemplate = (type) => {
    let csvContent = '';
    let filename = '';

    if (type === 'stock') {
      csvContent = 'sku,quantity,location\nSKU001,100,Warehouse A\nSKU002,50,Warehouse B';
      filename = 'stock_template.csv';
    } else if (type === 'orders') {
      csvContent = 'order_number,customer_name,phone,email,address,city,state,zip,country,product_sku,quantity,price\n1001,John Doe,+1234567890,john@example.com,123 Main St,New York,NY,10001,USA,SKU001,2,29.99';
      filename = 'orders_template.csv';
    } else if (type === 'products') {
      csvContent = 'title,sku,price,compare_at_price,inventory_quantity,vendor,product_type,tags\nProduct Name,SKU001,29.99,39.99,100,Vendor Name,Category,tag1|tag2';
      filename = 'products_template.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Upload stock
  const handleStockUpload = async (file) => {
    if (!selectedStore) {
      toast.error('Please select a store first');
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('store_name', selectedStore);

    try {
      const response = await axios.post(`${API}/api/inventory/upload-stock`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total))
      });
      setResult({ success: true, ...response.data });
      toast.success('Stock uploaded successfully');
    } catch (error) {
      setResult({ success: false, message: error.response?.data?.detail || 'Upload failed' });
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Upload orders
  const handleOrdersUpload = async (file) => {
    if (!selectedStore) {
      toast.error('Please select a store first');
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('store_name', selectedStore);

    try {
      const response = await axios.post(`${API}/api/upload-orders-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total))
      });
      setResult({ success: true, ...response.data });
      toast.success('Orders uploaded successfully');
    } catch (error) {
      setResult({ success: false, message: error.response?.data?.detail || 'Upload failed' });
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Upload products
  const handleProductsUpload = async (file) => {
    if (!selectedStore) {
      toast.error('Please select a store first');
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('store_name', selectedStore);

    try {
      const response = await axios.post(`${API}/api/shopify/products/import-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total))
      });
      setResult({ success: true, ...response.data });
      toast.success('Products uploaded successfully');
    } catch (error) {
      setResult({ success: false, message: error.response?.data?.detail || 'Upload failed' });
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!selectedStore) {
    return (
      <div className="min-h-screen bg-[#f1f1f1] flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Please select a store first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Upload className="w-6 h-6" />
                Bulk Upload
              </h1>
              <p className="text-sm text-gray-500">
                Import stock, orders, or products via CSV for {getStoreName(selectedStore)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border mb-6">
            <TabsTrigger value="stock" className="gap-2">
              <Package className="w-4 h-4" />
              Stock/Inventory
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <FileText className="w-4 h-4" />
              Products
            </TabsTrigger>
          </TabsList>

          {/* Stock Upload */}
          <TabsContent value="stock">
            <div className="max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Upload Stock/Inventory</h2>
                <TemplateButton label="Download Template" onClick={() => downloadTemplate('stock')} />
              </div>
              <UploadCard
                title="Stock CSV File"
                description="Upload a CSV file with columns: sku, quantity, location"
                icon={Package}
                accept=".csv,.xlsx,.xls"
                onUpload={handleStockUpload}
                uploading={uploading}
                progress={progress}
              />
              <ResultCard result={result} />

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Required Columns:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>sku</strong> - Product SKU (must match existing products)</li>
                  <li>• <strong>quantity</strong> - Stock quantity to set</li>
                  <li>• <strong>location</strong> - (Optional) Warehouse location</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* Orders Upload */}
          <TabsContent value="orders">
            <div className="max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Upload Orders</h2>
                <TemplateButton label="Download Template" onClick={() => downloadTemplate('orders')} />
              </div>
              <UploadCard
                title="Orders CSV File"
                description="Upload orders to import into the system"
                icon={FileSpreadsheet}
                accept=".csv,.xlsx,.xls"
                onUpload={handleOrdersUpload}
                uploading={uploading}
                progress={progress}
              />
              <ResultCard result={result} />

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Required Columns:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>order_number</strong> - Unique order identifier</li>
                  <li>• <strong>customer_name</strong> - Customer full name</li>
                  <li>• <strong>phone</strong> - Contact phone number</li>
                  <li>• <strong>address, city, state, zip, country</strong> - Shipping address</li>
                  <li>• <strong>product_sku, quantity, price</strong> - Order line items</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* Products Upload */}
          <TabsContent value="products">
            <div className="max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Upload Products</h2>
                <TemplateButton label="Download Template" onClick={() => downloadTemplate('products')} />
              </div>
              <UploadCard
                title="Products CSV File"
                description="Upload products to add to your catalog"
                icon={FileText}
                accept=".csv,.xlsx,.xls"
                onUpload={handleProductsUpload}
                uploading={uploading}
                progress={progress}
              />
              <ResultCard result={result} />

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Required Columns:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>title</strong> - Product title</li>
                  <li>• <strong>sku</strong> - Unique SKU</li>
                  <li>• <strong>price</strong> - Sale price</li>
                  <li>• <strong>inventory_quantity</strong> - Stock quantity</li>
                  <li>• <strong>vendor, product_type, tags</strong> - (Optional) Product metadata</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StockUpload;
