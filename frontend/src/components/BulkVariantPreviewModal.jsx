import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  RefreshCw,
  Layers,
  Store,
  ChevronDown,
  ChevronUp,
  Play,
  FileText,
  Terminal,
  XCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Product Preview Card
const ProductPreviewCard = ({ product, expanded, onToggle }) => {
  return (
    <Card className="overflow-hidden" data-testid={`preview-product-${product.shopify_product_id}`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0 border">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-6 h-6 text-zinc-300" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium text-sm text-zinc-900 truncate">{product.title}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    {product.store_name}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {product.shopify_variant_count} existing
                  </span>
                </div>
              </div>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 flex-shrink-0">
                +{product.missing_count} missing
              </Badge>
            </div>
            
            <div className="mt-3">
              <button onClick={onToggle} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700">
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? 'Hide variants' : `Show ${product.missing_count} missing variants`}
              </button>
              
              {expanded && (
                <div className="mt-2 p-2 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="flex flex-wrap gap-1">
                    {product.missing_variants.map((v, i) => (
                      <Badge key={i} variant="outline" className="bg-white text-xs">
                        {v.color} / {v.size}
                      </Badge>
                    ))}
                    {product.missing_count > 20 && (
                      <Badge variant="outline" className="bg-white text-xs text-zinc-400">
                        +{product.missing_count - 20} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Summary Stat Component
const SummaryStat = ({ label, value, icon: Icon, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${colors[color]}`}>
      <div className={`p-2 rounded-lg ${color === 'blue' ? 'bg-blue-100' : color === 'orange' ? 'bg-orange-100' : color === 'green' ? 'bg-green-100' : 'bg-red-100'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-80">{label}</p>
      </div>
    </div>
  );
};

// Log Entry Component
const LogEntry = ({ log }) => {
  const colors = {
    info: 'text-zinc-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
  };
  
  const icons = {
    info: <Clock className="w-3 h-3" />,
    success: <CheckCircle2 className="w-3 h-3" />,
    warning: <AlertTriangle className="w-3 h-3" />,
    error: <XCircle className="w-3 h-3" />,
  };
  
  const time = new Date(log.timestamp).toLocaleTimeString();
  
  return (
    <div className={`flex items-start gap-2 text-xs font-mono ${colors[log.level] || colors.info}`}>
      <span className="text-zinc-400 flex-shrink-0">[{time}]</span>
      <span className="flex-shrink-0">{icons[log.level] || icons.info}</span>
      <span className="break-all">{log.message}</span>
    </div>
  );
};

// Main Modal Component
const BulkVariantPreviewModal = ({ open, onClose, stores = [] }) => {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedStore, setSelectedStore] = useState('all');
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  
  // Creation state
  const [creating, setCreating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [showLogs, setShowLogs] = useState(true);
  const logsEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  
  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current && showLogs) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [jobStatus?.logs, showLogs]);
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);
  
  const runPreview = async () => {
    setLoading(true);
    setPreviewData(null);
    setJobId(null);
    setJobStatus(null);
    
    try {
      const body = { limit: 200 };
      if (selectedStore && selectedStore !== 'all') {
        body.store_name = selectedStore;
      }
      
      const res = await fetch(`${API}/api/shopify/products/bulk-variants/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setPreviewData(data);
        if (data.summary.products_with_missing === 0) {
          toast.success('All linked products have complete variants!');
        }
      } else {
        toast.error(data.detail || 'Failed to run preview');
      }
    } catch (e) {
      console.error('Preview error:', e);
      toast.error('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };
  
  const startBulkCreation = async () => {
    if (!previewData || previewData.summary.products_with_missing === 0) return;
    
    setCreating(true);
    
    try {
      const body = {
        limit: 50, // Process up to 50 products at a time
      };
      
      if (selectedStore && selectedStore !== 'all') {
        body.store_name = selectedStore;
      }
      
      // Optionally pass specific product IDs from preview
      if (previewData.products.length > 0) {
        body.product_ids = previewData.products.slice(0, 50).map(p => p.shopify_product_id);
      }
      
      const res = await fetch(`${API}/api/shopify/products/bulk-variants/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      
      if (data.success && data.job_id) {
        setJobId(data.job_id);
        toast.success('Bulk creation started!');
        
        // Start polling for status
        pollIntervalRef.current = setInterval(() => {
          pollJobStatus(data.job_id);
        }, 2000);
      } else {
        toast.error(data.detail || 'Failed to start bulk creation');
        setCreating(false);
      }
    } catch (e) {
      console.error('Bulk creation error:', e);
      toast.error('Failed to start bulk creation');
      setCreating(false);
    }
  };
  
  const pollJobStatus = async (id) => {
    try {
      const res = await fetch(`${API}/api/shopify/products/bulk-variants/status/${id}`);
      const data = await res.json();
      
      if (data.success) {
        setJobStatus(data);
        
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollIntervalRef.current);
          setCreating(false);
          
          if (data.status === 'completed') {
            toast.success(`Created ${data.progress.variants_created} variants!`);
          } else {
            toast.error('Bulk creation failed');
          }
        }
      }
    } catch (e) {
      console.error('Failed to poll job status:', e);
    }
  };
  
  const toggleProduct = (productId) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };
  
  const handleClose = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    setPreviewData(null);
    setExpandedProducts(new Set());
    setJobId(null);
    setJobStatus(null);
    setCreating(false);
    onClose();
  };
  
  const progressPercent = jobStatus?.progress
    ? Math.round((jobStatus.progress.products_processed / Math.max(jobStatus.progress.products_total, 1)) * 100)
    : 0;
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden" data-testid="bulk-variant-preview-modal">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                {jobId ? <Terminal className="w-5 h-5 text-orange-600" /> : <Eye className="w-5 h-5 text-orange-600" />}
              </div>
              {jobId ? 'Bulk Variant Creation' : 'Bulk Variant Preview'}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              {jobId 
                ? 'Creating missing variants in Shopify. Do not close this window.'
                : 'Scan linked products to see what variants are missing. This is a dry-run - no changes will be made.'
              }
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Initial State - Controls */}
          {!previewData && !loading && !jobId && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">How it works</p>
                    <p className="text-sm text-blue-600 mt-1">
                      This preview will scan all linked products and compare their Shopify variants against 1688.
                      You will see exactly which variants are missing without making any changes.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-zinc-700 mb-1.5 block">
                    Filter by Store (Optional)
                  </label>
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Stores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stores</SelectItem>
                      {stores.map(store => (
                        <SelectItem key={store.store_name} value={store.store_name}>
                          {store.store_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={runPreview} className="bg-orange-500 hover:bg-orange-600" data-testid="run-preview-btn">
                  <Search className="w-4 h-4 mr-2" />
                  Run Preview Scan
                </Button>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
              <p className="text-zinc-700 font-medium">Scanning linked products...</p>
              <p className="text-zinc-500 text-sm mt-1">This may take a minute for large catalogs</p>
            </div>
          )}
          
          {/* Job Running State */}
          {jobId && jobStatus && (
            <div className="space-y-4">
              {/* Progress */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-orange-800">
                    {jobStatus.status === 'running' ? 'Creating Variants...' : 
                     jobStatus.status === 'completed' ? 'Creation Complete!' : 'Creation Failed'}
                  </span>
                  <Badge className={
                    jobStatus.status === 'running' ? 'bg-orange-100 text-orange-700' :
                    jobStatus.status === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }>
                    {jobStatus.status === 'running' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    {jobStatus.status}
                  </Badge>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <div className="flex justify-between mt-2 text-xs text-orange-600">
                  <span>{jobStatus.progress.products_processed} / {jobStatus.progress.products_total} products</span>
                  <span>{jobStatus.progress.variants_created} variants created</span>
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                <SummaryStat 
                  label="Products Processed"
                  value={jobStatus.progress.products_processed}
                  icon={Package}
                  color="blue"
                />
                <SummaryStat 
                  label="Variants Created"
                  value={jobStatus.progress.variants_created}
                  icon={CheckCircle2}
                  color="green"
                />
                <SummaryStat 
                  label="Variants Failed"
                  value={jobStatus.progress.variants_failed}
                  icon={XCircle}
                  color={jobStatus.progress.variants_failed > 0 ? 'red' : 'green'}
                />
                <SummaryStat 
                  label="Products Updated"
                  value={jobStatus.completed_products?.length || 0}
                  icon={Store}
                  color="orange"
                />
              </div>
              
              {/* Logs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-zinc-700 flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Execution Logs
                  </h4>
                  <button 
                    onClick={() => setShowLogs(!showLogs)}
                    className="text-xs text-zinc-500 hover:text-zinc-700"
                  >
                    {showLogs ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showLogs && (
                  <div className="bg-zinc-900 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                    <div className="space-y-1">
                      {jobStatus.logs?.map((log, i) => (
                        <LogEntry key={i} log={log} />
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Completed Products */}
              {jobStatus.status === 'completed' && jobStatus.completed_products?.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700 mb-2">
                    Successfully Updated ({jobStatus.completed_products.length})
                  </h4>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {jobStatus.completed_products.map((p, i) => (
                      <div key={i} className="text-xs bg-green-50 p-2 rounded flex justify-between">
                        <span className="text-green-700 truncate">{p.title}</span>
                        <Badge className="bg-green-100 text-green-700 text-xs">+{p.variants_created}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Failed Products */}
              {jobStatus.failed_products?.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2">
                    Failed ({jobStatus.failed_products.length})
                  </h4>
                  <div className="space-y-1 max-h-[100px] overflow-y-auto">
                    {jobStatus.failed_products.map((p, i) => (
                      <div key={i} className="text-xs bg-red-50 p-2 rounded">
                        <span className="text-red-700">{p.title}: {p.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Close button when done */}
              {(jobStatus.status === 'completed' || jobStatus.status === 'failed') && (
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleClose}>Close</Button>
                </div>
              )}
            </div>
          )}
          
          {/* Preview Results */}
          {previewData && !loading && !jobId && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                <SummaryStat 
                  label="Products Scanned"
                  value={previewData.summary.products_scanned}
                  icon={Package}
                  color="blue"
                />
                <SummaryStat 
                  label="With Missing Variants"
                  value={previewData.summary.products_with_missing}
                  icon={AlertTriangle}
                  color="orange"
                />
                <SummaryStat 
                  label="Total Missing Variants"
                  value={previewData.summary.total_missing_variants}
                  icon={Layers}
                  color="red"
                />
                <SummaryStat 
                  label="Scan Errors"
                  value={previewData.summary.errors_count}
                  icon={AlertTriangle}
                  color={previewData.summary.errors_count > 0 ? 'red' : 'green'}
                />
              </div>
              
              {/* Dry-Run Notice */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700">
                  <strong>DRY-RUN:</strong> This is a preview only. No changes have been made to your Shopify store.
                </p>
              </div>
              
              {/* Products List */}
              {previewData.products.length > 0 ? (
                <div>
                  <h4 className="font-medium text-zinc-700 mb-2">
                    Products with Missing Variants ({previewData.products.length})
                  </h4>
                  <ScrollArea className="h-[250px] pr-4">
                    <div className="space-y-2">
                      {previewData.products.map(product => (
                        <ProductPreviewCard
                          key={product.shopify_product_id}
                          product={product}
                          expanded={expandedProducts.has(product.shopify_product_id)}
                          onToggle={() => toggleProduct(product.shopify_product_id)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="font-medium text-green-700">All Variants Synced!</p>
                  <p className="text-sm text-green-600 mt-1">
                    All linked products have complete variant coverage
                  </p>
                </div>
              )}
              
              {/* Errors */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-red-700 mb-2">Scan Errors ({previewData.errors.length})</h4>
                  <div className="space-y-1">
                    {previewData.errors.map((err, i) => (
                      <div key={i} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        <strong>{err.title}</strong>: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setPreviewData(null)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Again
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                  {previewData.summary.products_with_missing > 0 && (
                    <Button 
                      onClick={startBulkCreation}
                      disabled={creating}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="create-all-btn"
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Create All Missing Variants
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkVariantPreviewModal;
