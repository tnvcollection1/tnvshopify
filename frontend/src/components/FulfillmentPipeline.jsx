import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  RefreshCw,
  Loader2,
  Truck,
  Package,
  Send,
  ArrowRight,
  ShoppingBag,
  Warehouse,
  MapPin,
  Search,
  Filter,
  Check,
  Download,
  MessageCircle,
  Image,
  Link2,
  BarChart3,
  Bell,
  Upload,
  Clock,
  History,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Fulfillment stages in order
const FULFILLMENT_STAGES = [
  { key: 'shopify_order', label: 'Shopify Order', icon: ShoppingBag, color: 'blue' },
  { key: '1688_ordered', label: '1688 Ordered', icon: Package, color: 'orange' },
  { key: 'dwz56_shipped', label: 'DWZ56 Shipped', icon: Truck, color: 'purple' },
  { key: 'in_transit', label: 'In Transit', icon: MapPin, color: 'yellow' },
  { key: 'warehouse_arrived', label: 'Warehouse Arrived', icon: Warehouse, color: 'indigo' },
  { key: 'warehouse_received', label: 'Received', icon: Check, color: 'teal' },
  { key: 'local_shipped', label: 'Shipped to Customer', icon: Send, color: 'green' },
];

// Carrier mapping by store
const STORE_CARRIERS = {
  'tnvcollectionpk': { carrier: 'TCS', country: 'Pakistan' },
  'tnvcollection': { carrier: 'DTDC', country: 'India' },
};

// Stage Progress Bar Component
const StageProgressBar = ({ currentStage }) => {
  const getStageIndex = (stage) => FULFILLMENT_STAGES.findIndex(s => s.key === stage);
  const currentIndex = getStageIndex(currentStage);
  
  return (
    <div className="flex items-center gap-1 w-full">
      {FULFILLMENT_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const StageIcon = stage.icon;
        
        return (
          <React.Fragment key={stage.key}>
            <div 
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs
                ${isCompleted ? 'bg-green-500 text-white' : 
                  isCurrent ? 'bg-blue-500 text-white' : 
                  'bg-gray-200 text-gray-500'}`}
              title={stage.label}
            >
              {isCompleted ? <Check className="w-3 h-3" /> : <StageIcon className="w-3 h-3" />}
            </div>
            {index < FULFILLMENT_STAGES.length - 1 && (
              <div className={`flex-1 h-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, carrierInfo, onViewDetails, onUpdateStage, updating, onNotify, onPromptTracking }) => {
  const getStageIndex = (stage) => FULFILLMENT_STAGES.findIndex(s => s.key === stage);
  const currentIndex = getStageIndex(order.current_stage);
  const nextStage = FULFILLMENT_STAGES[currentIndex + 1];
  
  // Stages that require tracking input
  const stagesRequiringTracking = {
    'dwz56_shipped': { type: 'dwz', label: 'DWZ56 Tracking #' },
    'local_shipped': { type: 'local', label: `${carrierInfo?.carrier || 'Local'} Tracking #` },
  };
  
  const handleNextStage = () => {
    if (nextStage && stagesRequiringTracking[nextStage.key]) {
      // This stage requires tracking - prompt for it
      onPromptTracking(order, nextStage.key, stagesRequiringTracking[nextStage.key]);
    } else {
      onUpdateStage(order._id || order.shopify_order_id, nextStage.key);
    }
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-bold text-lg">#{order.order_number || order.shopify_order_id}</p>
            <p className="text-sm text-gray-500">{order.customer_name || 'Customer'}</p>
          </div>
          <Badge className="bg-blue-100 text-blue-700">
            {order.current_stage?.replace(/_/g, ' ') || 'New'}
          </Badge>
        </div>
        
        <div className="mb-4">
          <StageProgressBar currentStage={order.current_stage} />
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div>
            <p className="text-gray-500">1688 Order</p>
            <p className="font-mono truncate">{order.alibaba_order_id ? order.alibaba_order_id.slice(-8) : '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">DWZ56 #</p>
            <p className="font-mono">{order.dwz_tracking || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">{carrierInfo?.carrier || 'Local'} #</p>
            <p className="font-mono">{order.local_tracking || '-'}</p>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t gap-2">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onViewDetails(order)} title="View Details">
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNotify(order)} title="Send WhatsApp">
              <MessageCircle className="w-4 h-4 text-green-600" />
            </Button>
          </div>
          
          {nextStage && (
            <Button
              size="sm"
              onClick={handleNextStage}
              disabled={updating === (order._id || order.shopify_order_id)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updating === (order._id || order.shopify_order_id) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-1" />
                  {nextStage.label}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Analytics Modal
const AnalyticsModal = ({ store, onClose }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${API}/api/fulfillment/pipeline/analytics?store_name=${store}&days=30`);
        const data = await res.json();
        if (data.success) {
          setAnalytics(data);
        }
      } catch (e) {
        console.error('Error fetching analytics:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [store]);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            Pipeline Analytics (Last 30 Days)
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-blue-50">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{analytics.total_orders}</p>
                  <p className="text-sm text-gray-600">Total Orders</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{analytics.completed_orders}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-yellow-600">{analytics.stuck_orders}</p>
                  <p className="text-sm text-gray-600">Stuck (3+ days)</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{analytics.completion_rate}</p>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Stage Distribution</h3>
              <div className="space-y-2">
                {FULFILLMENT_STAGES.map(stage => {
                  const count = analytics.stage_distribution?.[stage.key] || 0;
                  const total = analytics.total_orders || 1;
                  const percentage = (count / total * 100).toFixed(0);
                  
                  return (
                    <div key={stage.key} className="flex items-center gap-2">
                      <span className="w-32 text-sm">{stage.label}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-blue-500 h-4 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-16 text-sm text-right">{count} ({percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">No analytics data available</p>
        )}
      </div>
    </div>
  );
};

// Image Search Modal
const ImageSearchModal = ({ order, onClose, onLink }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  
  const handleSearch = async () => {
    if (!imageUrl.trim()) {
      toast.error('Please enter an image URL');
      return;
    }
    
    setSearching(true);
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline/${order.order_number || order.shopify_order_id}/link-product-by-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.suggestions || []);
        if (data.suggestions?.length === 0) {
          toast.info('No matching products found');
        }
      } else {
        toast.error(data.error || 'Search failed');
      }
    } catch (e) {
      toast.error('Failed to search');
    } finally {
      setSearching(false);
    }
  };
  
  const handleLink = async (productId) => {
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline/${order.order_number || order.shopify_order_id}/link-to-1688`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_1688_id: productId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Product linked successfully!');
        onLink();
        onClose();
      } else {
        toast.error(data.error || 'Failed to link');
      }
    } catch (e) {
      toast.error('Failed to link product');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Image className="w-5 h-5 text-orange-500" />
            Find 1688 Product by Image
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <p className="text-gray-500 mb-4">Order #{order.order_number || order.shopify_order_id}</p>
        
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Enter product image URL..."
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Search
          </Button>
        </div>
        
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {results.map((product, idx) => (
              <Card key={idx} className="hover:shadow-md cursor-pointer" onClick={() => handleLink(product.product_id || product.item_id)}>
                <CardContent className="p-3">
                  {product.image && (
                    <img src={product.image} alt="" className="w-full h-32 object-cover rounded mb-2" />
                  )}
                  <p className="text-sm font-medium truncate">{product.title}</p>
                  <p className="text-orange-600 font-bold">¥{product.price}</p>
                  <Button size="sm" className="w-full mt-2 bg-orange-500 hover:bg-orange-600">
                    <Link2 className="w-4 h-4 mr-1" /> Link This
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Order Detail Modal Component
const OrderDetailModal = ({ order, carrierInfo, onClose, onUpdateStage, onRefresh }) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingType, setTrackingType] = useState('dwz');
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  
  const getStageIndex = (stage) => FULFILLMENT_STAGES.findIndex(s => s.key === stage);
  
  if (!order) return null;
  
  const handleAddTracking = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }
    
    const updateData = trackingType === 'dwz' 
      ? { dwz_tracking: trackingNumber }
      : { local_tracking: trackingNumber, local_carrier: carrierInfo.carrier };
    
    await onUpdateStage(order._id || order.shopify_order_id, order.current_stage, updateData);
    setTrackingNumber('');
  };
  
  const handleSendNotification = async () => {
    setSendingNotification(true);
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline/${order.order_number || order.shopify_order_id}/notify-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: order.current_stage }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('WhatsApp notification sent!');
      } else {
        toast.error(data.message || 'Failed to send notification');
      }
    } catch (e) {
      toast.error('Failed to send notification');
    } finally {
      setSendingNotification(false);
    }
  };
  
  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold">Order #{order.order_number || order.shopify_order_id}</h2>
              <p className="text-gray-500">{order.customer_name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
          
          {/* Pipeline Status */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Fulfillment Pipeline</h3>
            <div className="space-y-2">
              {FULFILLMENT_STAGES.map((stage, index) => {
                const currentIndex = getStageIndex(order.current_stage);
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const StageIcon = stage.icon;
                
                return (
                  <div 
                    key={stage.key}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isCurrent ? 'bg-blue-50 border border-blue-200' :
                      isCompleted ? 'bg-green-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${
                      isCompleted ? 'bg-green-500 text-white' :
                      isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : <StageIcon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isCurrent ? 'text-blue-700' : ''}`}>{stage.label}</p>
                      {stage.key === 'local_shipped' && (
                        <p className="text-xs text-gray-500">via {carrierInfo.carrier} ({carrierInfo.country})</p>
                      )}
                    </div>
                    {order.stage_dates?.[stage.key] && (
                      <p className="text-xs text-gray-500">
                        {new Date(order.stage_dates[stage.key]).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Tracking Numbers */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Tracking Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600 font-medium">1688 Order ID</p>
                <p className="font-mono text-sm">{order.alibaba_order_id || 'Not placed'}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600 font-medium">DWZ56 Tracking</p>
                <p className="font-mono text-sm">{order.dwz_tracking || 'Not assigned'}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 font-medium">{carrierInfo.carrier} Tracking</p>
                <p className="font-mono text-sm">{order.local_tracking || 'Not assigned'}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Linked 1688 Product</p>
                {order.linked_1688_product_id ? (
                  <a href={order.linked_1688_url} target="_blank" rel="noreferrer" className="font-mono text-sm text-blue-600 hover:underline">
                    {order.linked_1688_product_id}
                  </a>
                ) : (
                  <Button size="sm" variant="outline" className="mt-1" onClick={() => setShowImageSearch(true)}>
                    <Image className="w-3 h-3 mr-1" /> Find by Image
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Add Tracking */}
          <div className="mb-6 p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Add/Update Tracking</h3>
            <div className="flex gap-2">
              <Select value={trackingType} onValueChange={setTrackingType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dwz">DWZ56</SelectItem>
                  <SelectItem value="local">{carrierInfo.carrier}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddTracking}>Add</Button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={handleSendNotification}
              disabled={sendingNotification}
              className="border-green-300 text-green-600"
            >
              {sendingNotification ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageCircle className="w-4 h-4 mr-2" />}
              Send WhatsApp Update
            </Button>
            
            {FULFILLMENT_STAGES.map((stage, index) => {
              const currentIndex = getStageIndex(order.current_stage);
              if (index <= currentIndex) return null;
              
              return (
                <Button
                  key={stage.key}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onUpdateStage(order._id || order.shopify_order_id, stage.key);
                  }}
                >
                  Mark as {stage.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
      
      {showImageSearch && (
        <ImageSearchModal 
          order={order} 
          onClose={() => setShowImageSearch(false)}
          onLink={onRefresh}
        />
      )}
    </>
  );
};

// Tracking Prompt Modal
const TrackingPromptModal = ({ order, stage, trackingConfig, carrierInfo, onClose, onConfirm }) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [skipTracking, setSkipTracking] = useState(false);
  
  const handleConfirm = () => {
    if (!trackingNumber.trim() && !skipTracking) {
      toast.error('Please enter a tracking number or check "Skip for now"');
      return;
    }
    
    const additionalData = {};
    if (trackingNumber.trim()) {
      if (trackingConfig.type === 'dwz') {
        additionalData.dwz_tracking = trackingNumber;
      } else {
        additionalData.local_tracking = trackingNumber;
        additionalData.local_carrier = carrierInfo?.carrier || 'Local Carrier';
      }
    }
    
    onConfirm(order._id || order.shopify_order_id, stage, additionalData);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Enter Tracking Number</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            Moving order <strong>#{order.order_number || order.shopify_order_id}</strong> to <strong>{stage.replace(/_/g, ' ')}</strong>
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{trackingConfig.label}</label>
          <Input
            placeholder={`Enter ${trackingConfig.type === 'dwz' ? 'DWZ56' : carrierInfo?.carrier || 'Local'} tracking number`}
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
            className="w-full"
            autoFocus
          />
          {trackingConfig.type === 'local' && (
            <p className="text-xs text-gray-500 mt-1">
              Carrier: {carrierInfo?.carrier} ({carrierInfo?.country})
            </p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipTracking}
              onChange={e => setSkipTracking(e.target.checked)}
              className="rounded"
            />
            Skip for now (can add tracking later)
          </label>
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
            {skipTracking ? 'Continue Without Tracking' : 'Add & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// DWZ Tracking Import Modal
const DWZImportModal = ({ store, onClose, onSuccess }) => {
  const [csvData, setCsvData] = useState('');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  
  const handleImport = async () => {
    if (!csvData.trim()) {
      toast.error('Please enter tracking data');
      return;
    }
    
    setImporting(true);
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline/import-dwz-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: store,
          csv_data: csvData,
          auto_advance: autoAdvance,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setResults(data);
        toast.success(`Imported ${data.updated} tracking numbers`);
        if (data.updated > 0) {
          onSuccess();
        }
      } else {
        toast.error(data.detail || 'Import failed');
      }
    } catch (e) {
      toast.error('Failed to import tracking data');
    } finally {
      setImporting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-500" />
            Import DWZ Tracking Numbers
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
          <p className="font-medium text-blue-700 mb-1">CSV Format (one per line):</p>
          <code className="text-xs bg-blue-100 px-2 py-1 rounded">order_number,dwz_tracking</code>
          <p className="text-blue-600 mt-2">Example:</p>
          <pre className="text-xs bg-blue-100 px-2 py-1 rounded mt-1">99001,DWZ123456789
99002,DWZ987654321</pre>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Tracking Data</label>
          <textarea
            placeholder="Paste CSV data here..."
            value={csvData}
            onChange={e => setCsvData(e.target.value)}
            className="w-full h-40 p-3 border rounded-lg font-mono text-sm"
          />
        </div>
        
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={e => setAutoAdvance(e.target.checked)}
              className="rounded"
            />
            Auto-advance orders to "DWZ56 Shipped" stage
          </label>
        </div>
        
        {results && (
          <div className={`mb-4 p-3 rounded-lg ${results.not_found > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
            <p className="font-medium">Import Results:</p>
            <ul className="text-sm mt-1">
              <li>✅ Updated: {results.updated}</li>
              <li>⚠️ Not found: {results.not_found}</li>
              {results.errors?.length > 0 && (
                <li className="text-red-600">Errors: {results.errors.join(', ')}</li>
              )}
            </ul>
          </div>
        )}
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button 
            onClick={handleImport} 
            disabled={importing || !csvData.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Import Tracking
          </Button>
        </div>
      </div>
    </div>
  );
};

// Bulk Actions Modal
const BulkActionsModal = ({ orders, store, carrierInfo, onClose, onSuccess }) => {
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [targetStage, setTargetStage] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const toggleOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };
  
  const selectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.order_number || o.shopify_order_id));
    }
  };
  
  const handleBulkUpdate = async () => {
    if (selectedOrders.length === 0 || !targetStage) {
      toast.error('Select orders and a target stage');
      return;
    }
    
    setProcessing(true);
    try {
      const body = {
        order_ids: selectedOrders.map(String),
        stage: targetStage,
        store_name: store,
      };
      
      // Add tracking if provided
      if (trackingNumber && targetStage === 'dwz56_shipped') {
        body.dwz_tracking = trackingNumber;
      } else if (trackingNumber && targetStage === 'local_shipped') {
        body.local_tracking = trackingNumber;
        body.local_carrier = carrierInfo?.carrier || 'TCS';
      }
      
      const res = await fetch(`${API}/api/fulfillment/pipeline/bulk-update-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Updated ${data.updated_count} orders to ${targetStage.replace(/_/g, ' ')}`);
        onSuccess();
        onClose();
      } else {
        toast.error(data.detail || 'Bulk update failed');
      }
    } catch (e) {
      toast.error('Failed to update orders');
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Bulk Update Orders</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">Select Orders ({selectedOrders.length} selected)</label>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedOrders.length === orders.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
            {orders.map(order => (
              <label key={order.order_number || order.shopify_order_id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOrders.includes(order.order_number || order.shopify_order_id)}
                  onChange={() => toggleOrder(order.order_number || order.shopify_order_id)}
                  className="rounded"
                />
                <span className="font-mono">#{order.order_number || order.shopify_order_id}</span>
                <span className="text-gray-500 text-sm">{order.customer_name}</span>
                <Badge className="ml-auto text-xs">{order.current_stage?.replace(/_/g, ' ')}</Badge>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Move to Stage</label>
          <Select value={targetStage} onValueChange={setTargetStage}>
            <SelectTrigger>
              <SelectValue placeholder="Select target stage" />
            </SelectTrigger>
            <SelectContent>
              {FULFILLMENT_STAGES.map(stage => (
                <SelectItem key={stage.key} value={stage.key}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {(targetStage === 'dwz56_shipped' || targetStage === 'local_shipped') && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {targetStage === 'dwz56_shipped' ? 'DWZ56 Tracking # (optional - same for all)' : `${carrierInfo?.carrier || 'Local'} Tracking # (optional)`}
            </label>
            <Input
              placeholder="Enter tracking number"
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to update stage without tracking</p>
          </div>
        )}
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleBulkUpdate}
            disabled={processing || selectedOrders.length === 0 || !targetStage}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Update {selectedOrders.length} Orders
          </Button>
        </div>
      </div>
    </div>
  );
};

// Order History Timeline Modal
const OrderHistoryModal = ({ orderId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState(null);
  
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API}/api/dwz56-sync/order-history/${orderId}`);
        const data = await res.json();
        if (data.success) {
          setHistory(data);
        }
      } catch (e) {
        console.error('Error fetching history:', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [orderId]);
  
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            Order Timeline - #{orderId}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : history ? (
          <>
            {/* Current State Summary */}
            {history.current_state && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-700 mb-2">Current Status</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Stage:</span>
                    <Badge className="ml-2">{history.current_state.stage?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">Customer:</span>
                    <span className="ml-2">{history.current_state.customer || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">DWZ Tracking:</span>
                    <span className="ml-2 font-mono">{history.current_state.dwz_tracking || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Local Tracking:</span>
                    <span className="ml-2 font-mono">{history.current_state.local_tracking || '-'}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {history.timeline && history.timeline.length > 0 ? (
                <div className="space-y-4">
                  {history.timeline.map((event, idx) => (
                    <div key={idx} className="relative pl-10">
                      <div className="absolute left-0 w-8 h-8 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center text-lg">
                        {event.icon || '📦'}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <p className="font-medium">{event.label}</p>
                          <span className="text-xs text-gray-500">{formatDate(event.timestamp)}</span>
                        </div>
                        {event.details && (
                          <div className="text-sm text-gray-600 mt-1">
                            {event.details.from && event.details.to && (
                              <span>{event.details.from} → {event.details.to}</span>
                            )}
                            {event.details.tracking && (
                              <span className="font-mono">Tracking: {event.details.tracking}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No history events yet</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center py-8">Order not found</p>
        )}
        
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

// DWZ Auto-Sync Button Component
const DWZSyncButton = ({ store, onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState(null);
  
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/dwz56-sync/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_name: store, days_back: 30 }),
      });
      const data = await res.json();
      setResults(data);
      
      if (data.success) {
        toast.success(`Synced ${data.matched} orders, ${data.updated} stage changes`);
        if (data.updated > 0 && onSyncComplete) {
          onSyncComplete();
        }
      } else {
        toast.error('DWZ sync failed');
      }
    } catch (e) {
      toast.error('Failed to sync with DWZ');
    } finally {
      setSyncing(false);
    }
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSync}
      disabled={syncing}
      className="border-cyan-300 text-cyan-600 hover:bg-cyan-50"
      title="Fetch tracking updates from DWZ56"
    >
      {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
      Sync DWZ
    </Button>
  );
};

// Batch Notify Modal
const BatchNotifyModal = ({ store, orders, onClose, onSuccess }) => {
  const [selectedStage, setSelectedStage] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  
  const handleSend = async () => {
    if (!selectedStage) {
      toast.error('Select a stage');
      return;
    }
    
    setSending(true);
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline/notify-by-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: store,
          stage: selectedStage,
        }),
      });
      const data = await res.json();
      setResults(data);
      
      if (data.success) {
        toast.success(`Sent ${data.notifications_sent} notifications`);
      }
    } catch (e) {
      toast.error('Failed to send notifications');
    } finally {
      setSending(false);
    }
  };
  
  // Count orders per stage
  const stageCounts = FULFILLMENT_STAGES.reduce((acc, stage) => {
    acc[stage.key] = orders.filter(o => o.current_stage === stage.key).length;
    return acc;
  }, {});
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-green-500" />
            Batch WhatsApp Notifications
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Stage to Notify</label>
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {FULFILLMENT_STAGES.map(stage => (
                <SelectItem key={stage.key} value={stage.key}>
                  {stage.label} ({stageCounts[stage.key] || 0} orders)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            All customers with orders in this stage will receive a WhatsApp notification
          </p>
        </div>
        
        {results && (
          <div className={`mb-4 p-3 rounded-lg ${results.notifications_failed > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
            <p className="font-medium">Results:</p>
            <ul className="text-sm mt-1">
              <li>✅ Sent: {results.notifications_sent}</li>
              <li>❌ Failed: {results.notifications_failed}</li>
              <li>⏭️ Skipped (no phone): {results.skipped_no_phone}</li>
            </ul>
          </div>
        )}
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button 
            onClick={handleSend}
            disabled={sending || !selectedStage}
            className="bg-green-600 hover:bg-green-700"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Notifications
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Component
const FulfillmentPipeline = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [trackingPrompt, setTrackingPrompt] = useState(null);
  const [showDWZImport, setShowDWZImport] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBatchNotify, setShowBatchNotify] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(null);

  const getCarrierInfo = useCallback(() => {
    return STORE_CARRIERS[selectedStore] || { carrier: 'Local Carrier', country: 'Unknown' };
  }, [selectedStore]);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/stores`);
      const data = await res.json();
      // API returns array directly or {success: true, stores: [...]}
      const storesList = Array.isArray(data) ? data : (data.success && data.stores ? data.stores : []);
      if (storesList.length > 0) {
        setStores(storesList);
        setSelectedStore(storesList[0].store_name);
      }
    } catch (e) {
      console.error('Error fetching stores:', e);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline?store_name=${selectedStore}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setStats(data.stats || {});
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  const filterOrders = useCallback(() => {
    let filtered = [...orders];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.order_number?.toString().includes(query) ||
        o.shopify_order_id?.toString().includes(query) ||
        o.alibaba_order_id?.includes(query) ||
        o.dwz_tracking?.toLowerCase().includes(query) ||
        o.local_tracking?.toLowerCase().includes(query) ||
        o.customer_name?.toLowerCase().includes(query)
      );
    }
    
    if (stageFilter && stageFilter !== 'all') {
      filtered = filtered.filter(o => o.current_stage === stageFilter);
    }
    
    setFilteredOrders(filtered);
  }, [orders, searchQuery, stageFilter]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    if (selectedStore) {
      fetchOrders();
    }
  }, [selectedStore, fetchOrders]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  const updateOrderStage = async (orderId, newStage, additionalData = {}) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline/${orderId}/update-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: newStage,
          store_name: selectedStore,
          send_notification: true,
          ...additionalData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order updated to ${newStage.replace(/_/g, ' ')}${data.notification_sent ? ' (WhatsApp sent)' : ''}`);
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to update order');
      }
    } catch (e) {
      toast.error('Failed to update order stage');
    } finally {
      setUpdating(null);
    }
  };

  const syncFromShopify = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline/sync-from-shopify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_name: selectedStore }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Synced ${data.synced_count} orders from Shopify`);
        fetchOrders();
      } else {
        toast.error(data.message || 'Sync failed');
      }
    } catch (e) {
      toast.error('Failed to sync from Shopify');
    } finally {
      setSyncing(false);
    }
  };

  const exportData = async (format) => {
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline/export?store_name=${selectedStore}&format=${format}`);
      const data = await res.json();
      
      if (data.success) {
        if (format === 'csv') {
          const blob = new Blob([data.data], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `fulfillment_pipeline_${selectedStore}_${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('CSV exported successfully');
        } else {
          const blob = new Blob([JSON.stringify(data.orders, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `fulfillment_pipeline_${selectedStore}_${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('JSON exported successfully');
        }
      }
    } catch (e) {
      toast.error('Export failed');
    }
  };

  const sendNotification = async (order) => {
    try {
      const res = await fetch(`${API}/api/fulfillment/pipeline/${order.order_number || order.shopify_order_id}/notify-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: order.current_stage }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('WhatsApp notification sent!');
      } else {
        toast.error(data.message || 'Failed to send notification');
      }
    } catch (e) {
      toast.error('Failed to send notification');
    }
  };

  const syncAllToShopify = async () => {
    try {
      const res = await fetch(`${API}/api/fulfillment-sync/sync-stage/local_shipped`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_name: selectedStore }),
      });
      const data = await res.json();
      if (data.success) {
        const results = data.results || {};
        toast.success(`Shopify sync: ${results.synced || 0} synced, ${results.already_synced || 0} already done`);
        if (results.failed > 0) {
          toast.warning(`${results.failed} orders failed to sync`);
        }
        fetchOrders();
      } else {
        toast.error(data.detail || 'Sync failed');
      }
    } catch (e) {
      toast.error('Failed to sync to Shopify');
    }
  };

  const carrierInfo = getCarrierInfo();

  return (
    <div className="p-6 space-y-6" data-testid="fulfillment-pipeline">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-purple-500" />
            Fulfillment Pipeline
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Shopify → 1688 → DWZ56 → Warehouse → {carrierInfo.carrier}
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map(store => (
                <SelectItem key={store.store_name} value={store.store_name}>
                  {store.store_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={syncFromShopify} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Sync Shopify
          </Button>
          
          <Button variant="outline" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setShowAnalytics(true)}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Analytics
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportData('csv')}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportData('json')}>
          <Download className="h-4 w-4 mr-2" />
          Export JSON
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={syncAllToShopify}
          className="border-green-300 text-green-600 hover:bg-green-50"
          title="Sync all local_shipped orders to Shopify"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync to Shopify
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDWZImport(true)}
          className="border-purple-300 text-purple-600 hover:bg-purple-50"
          title="Import DWZ tracking numbers from CSV"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import DWZ
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowBulkActions(true)}
          className="border-orange-300 text-orange-600 hover:bg-orange-50"
          title="Bulk update multiple orders"
          disabled={orders.length === 0}
        >
          <Package className="h-4 w-4 mr-2" />
          Bulk Update
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {FULFILLMENT_STAGES.map(stage => (
          <Card key={stage.key} className="bg-gray-50 border-gray-200 cursor-pointer hover:shadow-md" onClick={() => setStageFilter(stage.key)}>
            <CardContent className="p-3 text-center">
              <stage.icon className="h-5 w-5 mx-auto mb-1 text-gray-600" />
              <p className="text-2xl font-bold">{stats[stage.key] || 0}</p>
              <p className="text-xs text-gray-600 truncate">{stage.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by order #, tracking #, customer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {FULFILLMENT_STAGES.map(stage => (
                  <SelectItem key={stage.key} value={stage.key}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Orders Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <span className="ml-3">Loading orders...</span>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => (
            <OrderCard 
              key={order._id || order.shopify_order_id} 
              order={order}
              carrierInfo={carrierInfo}
              onViewDetails={setSelectedOrder}
              onUpdateStage={updateOrderStage}
              updating={updating}
              onNotify={sendNotification}
              onPromptTracking={(order, stage, config) => setTrackingPrompt({ order, stage, config })}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="text-center">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || stageFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'No orders in the fulfillment pipeline yet'}
            </p>
            <Button onClick={syncFromShopify} disabled={syncing}>
              <Upload className="w-4 h-4 mr-2" />
              Sync from Shopify
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder}
          carrierInfo={carrierInfo}
          onClose={() => setSelectedOrder(null)}
          onUpdateStage={updateOrderStage}
          onRefresh={fetchOrders}
        />
      )}
      
      {/* Analytics Modal */}
      {showAnalytics && (
        <AnalyticsModal 
          store={selectedStore}
          onClose={() => setShowAnalytics(false)}
        />
      )}
      
      {/* Tracking Prompt Modal */}
      {trackingPrompt && (
        <TrackingPromptModal
          order={trackingPrompt.order}
          stage={trackingPrompt.stage}
          trackingConfig={trackingPrompt.config}
          carrierInfo={carrierInfo}
          onClose={() => setTrackingPrompt(null)}
          onConfirm={(orderId, stage, additionalData) => {
            updateOrderStage(orderId, stage, additionalData);
            setTrackingPrompt(null);
          }}
        />
      )}
      
      {/* DWZ Import Modal */}
      {showDWZImport && (
        <DWZImportModal
          store={selectedStore}
          onClose={() => setShowDWZImport(false)}
          onSuccess={() => {
            fetchOrders();
            setShowDWZImport(false);
          }}
        />
      )}
      
      {/* Bulk Actions Modal */}
      {showBulkActions && (
        <BulkActionsModal
          orders={filteredOrders}
          store={selectedStore}
          carrierInfo={carrierInfo}
          onClose={() => setShowBulkActions(false)}
          onSuccess={fetchOrders}
        />
      )}
    </div>
  );
};

export default FulfillmentPipeline;
