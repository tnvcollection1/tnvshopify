import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Package,
  User,
  MapPin,
  Phone,
  Hash,
  Truck,
  CheckCircle2,
  XCircle,
  Printer,
  Search,
  Box,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Scan,
  X,
  Clock,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = {
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    received: { color: 'bg-blue-100 text-blue-800', label: 'Received' },
    shipped: { color: 'bg-green-100 text-green-800', label: 'Shipped' },
    fulfilled: { color: 'bg-green-100 text-green-800', label: 'Fulfilled' },
    unfulfilled: { color: 'bg-orange-100 text-orange-800', label: 'Unfulfilled' }
  };
  
  const { color, label } = config[status] || config.pending;
  
  return <Badge className={color}>{label}</Badge>;
};

// Product Card Component
const ProductCard = ({ product }) => (
  <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
    <div className="w-24 h-24 bg-white rounded-lg overflow-hidden flex-shrink-0 border">
      {product.image ? (
        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300">
          <Package className="w-8 h-8" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-medium text-sm line-clamp-2">{product.title}</h4>
      <div className="mt-2 space-y-1 text-sm">
        <p className="text-gray-500">
          <span className="font-medium">SKU:</span> {product.sku}
        </p>
        {product.color && (
          <p className="text-gray-500">
            <span className="font-medium">Color:</span> {product.color}
          </p>
        )}
        {product.size && (
          <p className="text-gray-500">
            <span className="font-medium">Size:</span> {product.size}
          </p>
        )}
        {product.variant_title && !product.color && (
          <p className="text-gray-500">
            <span className="font-medium">Variant:</span> {product.variant_title}
          </p>
        )}
        <p className="text-gray-500">
          <span className="font-medium">Qty:</span> {product.quantity}
        </p>
      </div>
    </div>
  </div>
);

// Camera Scanner Component
const CameraScanner = ({ onScan, onClose }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let stream = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Unable to access camera. Please use manual entry.');
        console.error('Camera error:', err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Note: Real barcode scanning would require a library like @zxing/browser
  // For now, we'll provide manual entry as the primary method
  const handleManualEntry = () => {
    const code = prompt('Enter fulfillment number:');
    if (code) {
      onScan(code);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="text-lg font-semibold">Scan Barcode</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white">
          <X className="w-6 h-6" />
        </Button>
      </div>
      
      <div className="flex-1 relative">
        {error ? (
          <div className="h-full flex items-center justify-center text-white text-center p-4">
            <div>
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <p>{error}</p>
              <Button onClick={handleManualEntry} className="mt-4">
                Enter Manually
              </Button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white rounded-lg opacity-50" />
            </div>
          </>
        )}
      </div>
      
      <div className="p-4 bg-black">
        <p className="text-white text-center text-sm mb-4">
          Position barcode within the frame or enter manually
        </p>
        <Button onClick={handleManualEntry} variant="secondary" className="w-full">
          <Hash className="w-4 h-4 mr-2" />
          Enter Number Manually
        </Button>
      </div>
    </div>
  );
};

// Shipping Label Component (for printing)
const ShippingLabel = ({ label, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md print:max-w-full print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Shipping Label</DialogTitle>
        </DialogHeader>
        
        <div className="border-2 border-black p-4 print:border-4">
          {/* From Section */}
          <div className="border-b border-gray-300 pb-3 mb-3">
            <p className="text-xs text-gray-500">FROM:</p>
            <p className="font-bold">{label.from.name}</p>
            <p className="text-sm">{label.from.address}</p>
            <p className="text-sm">{label.from.city}, {label.from.country}</p>
          </div>
          
          {/* To Section */}
          <div className="border-b border-gray-300 pb-3 mb-3">
            <p className="text-xs text-gray-500">TO:</p>
            <p className="font-bold text-lg">{label.to.name}</p>
            <p className="font-medium">{label.to.phone}</p>
            <p className="text-sm">{label.to.address}</p>
            <p className="text-sm">{label.to.city}, {label.to.province} {label.to.zip}</p>
            <p className="text-sm font-medium">{label.to.country}</p>
          </div>
          
          {/* Order Info */}
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-gray-500">Order #</p>
              <p className="font-bold">{label.order_number}</p>
            </div>
            <div>
              <p className="text-gray-500">Items</p>
              <p className="font-bold">{label.total_quantity}</p>
            </div>
            <div>
              <p className="text-gray-500">Tracking</p>
              <p className="font-bold">{label.tracking_number || 'N/A'}</p>
            </div>
          </div>
          
          {/* Barcode placeholder */}
          <div className="mt-4 p-2 bg-gray-100 text-center">
            <p className="font-mono text-lg tracking-wider">{label.fulfillment_number}</p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4 print:hidden">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            Print Label
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Warehouse Scanner Component
const WarehouseScanner = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState(null);
  const [showLabel, setShowLabel] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionForm, setActionForm] = useState({
    tracking_number: '',
    carrier: 'DWZ56',
    condition: 'good',
    notes: '',
    received_by: '',
    shipped_by: ''
  });

  // Authenticate with PIN
  const handleAuth = async () => {
    try {
      await axios.post(`${API}/api/warehouse/auth`, { pin });
      setAuthenticated(true);
      localStorage.setItem('warehouse_auth', 'true');
      toast.success('Authenticated successfully');
    } catch (error) {
      toast.error('Invalid PIN');
    }
  };

  // Check if already authenticated
  useEffect(() => {
    if (localStorage.getItem('warehouse_auth') === 'true') {
      setAuthenticated(true);
    }
  }, []);

  // Search/Scan shipment
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) {
      toast.error('Please enter a fulfillment number');
      return;
    }

    setLoading(true);
    setShipmentData(null);
    try {
      const response = await axios.get(`${API}/api/warehouse/scan/${encodeURIComponent(query.trim())}`);
      setShipmentData(response.data);
      setSearchQuery('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Shipment not found');
    } finally {
      setLoading(false);
    }
  };

  // Handle camera scan
  const handleCameraScan = (code) => {
    setScanning(false);
    handleSearch(code);
  };

  // Mark as received
  const handleReceive = async () => {
    try {
      await axios.post(`${API}/api/warehouse/receive`, {
        fulfillment_number: shipmentData.shipment.fulfillment_number,
        received_by: actionForm.received_by || 'Warehouse Staff',
        condition: actionForm.condition,
        notes: actionForm.notes
      });
      toast.success('Shipment marked as received');
      setActionModal(null);
      handleSearch(shipmentData.shipment.fulfillment_number);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Ship to customer
  const handleShip = async () => {
    if (!actionForm.tracking_number) {
      toast.error('Please enter tracking number');
      return;
    }
    try {
      await axios.post(`${API}/api/warehouse/ship`, {
        fulfillment_number: shipmentData.shipment.fulfillment_number,
        tracking_number: actionForm.tracking_number,
        carrier: actionForm.carrier,
        shipped_by: actionForm.shipped_by || 'Warehouse Staff',
        notes: actionForm.notes
      });
      toast.success('Shipment marked as shipped');
      setActionModal(null);
      handleSearch(shipmentData.shipment.fulfillment_number);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Print label
  const handlePrintLabel = async () => {
    try {
      const response = await axios.get(
        `${API}/api/warehouse/label/${shipmentData.shipment.fulfillment_number}`
      );
      setShowLabel(response.data.label);
    } catch (error) {
      toast.error('Failed to get label');
    }
  };

  // PIN Entry Screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold">Warehouse Scanner</h1>
            <p className="text-gray-500">Enter PIN to access</p>
          </div>
          
          <Input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="text-center text-2xl tracking-widest mb-4"
            maxLength={6}
            onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
          />
          
          <Button onClick={handleAuth} className="w-full" size="lg">
            Enter
          </Button>
          
          <p className="text-xs text-gray-400 text-center mt-4">
            Default PIN: 1688
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Warehouse Scanner
          </h1>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              localStorage.removeItem('warehouse_auth');
              setAuthenticated(false);
            }}
          >
            Logout
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter fulfillment number..."
              className="pl-10 bg-white text-black"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={() => handleSearch()} disabled={loading} variant="secondary">
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </Button>
          <Button onClick={() => setScanning(true)} variant="secondary">
            <Camera className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Camera Scanner */}
      {scanning && (
        <CameraScanner
          onScan={handleCameraScan}
          onClose={() => setScanning(false)}
        />
      )}

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Searching...</p>
          </div>
        ) : shipmentData ? (
          <div className="space-y-4">
            {/* Shipment Status Card */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">Order #{shipmentData.shipment.order_number}</h2>
                <StatusBadge status={shipmentData.shipment.warehouse_status} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Fulfillment #</p>
                  <p className="font-medium">{shipmentData.shipment.fulfillment_number}</p>
                </div>
                <div>
                  <p className="text-gray-500">Store</p>
                  <p className="font-medium">{shipmentData.shipment.store_name}</p>
                </div>
                {shipmentData.shipment.alibaba_order_id && (
                  <div>
                    <p className="text-gray-500">1688 Order ID</p>
                    <p className="font-medium">{shipmentData.shipment.alibaba_order_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="font-medium">₹{shipmentData.shipment.total_price}</p>
                </div>
              </div>
              
              {shipmentData.shipment.special_instructions && (
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-yellow-600 font-medium">SPECIAL INSTRUCTIONS</p>
                  <p className="text-sm">{shipmentData.shipment.special_instructions}</p>
                </div>
              )}
            </div>

            {/* Customer Card */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                Customer Details
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{shipmentData.customer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${shipmentData.customer.phone}`} className="text-blue-600">
                    {shipmentData.customer.phone}
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="text-sm">{shipmentData.customer.full_address}</span>
                </div>
              </div>
            </div>

            {/* Products Card */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Box className="w-5 h-5 text-gray-400" />
                Products ({shipmentData.products.length})
              </h3>
              
              <div className="space-y-3">
                {shipmentData.products.map((product, index) => (
                  <ProductCard key={index} product={product} />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {shipmentData.shipment.warehouse_status === 'pending' && (
                <Button 
                  onClick={() => setActionModal('receive')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Received
                </Button>
              )}
              
              {(shipmentData.shipment.warehouse_status === 'received' || 
                shipmentData.shipment.warehouse_status === 'pending') && (
                <Button 
                  onClick={() => setActionModal('ship')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Ship to Customer
                </Button>
              )}
              
              <Button onClick={handlePrintLabel} variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Print Label
              </Button>
              
              <Button 
                onClick={() => setShipmentData(null)} 
                variant="outline"
              >
                <Scan className="w-4 h-4 mr-2" />
                Scan Another
              </Button>
            </div>

            {/* Warehouse History */}
            {shipmentData.shipment.warehouse_history?.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  History
                </h3>
                <div className="space-y-2">
                  {shipmentData.shipment.warehouse_history.map((entry, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        entry.status === 'shipped' ? 'bg-green-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="font-medium capitalize">{entry.status}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(entry.timestamp).toLocaleString()}
                          {entry.received_by && ` by ${entry.received_by}`}
                          {entry.shipped_by && ` by ${entry.shipped_by}`}
                        </p>
                        {entry.notes && <p className="text-gray-600">{entry.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Scan className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Scan or enter fulfillment number</p>
            <p className="text-gray-400 text-sm mt-1">to view shipment details</p>
          </div>
        )}
      </div>

      {/* Receive Modal */}
      <Dialog open={actionModal === 'receive'} onOpenChange={() => setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Received</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Received By</label>
              <Input
                value={actionForm.received_by}
                onChange={(e) => setActionForm({ ...actionForm, received_by: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Condition</label>
              <Select 
                value={actionForm.condition} 
                onValueChange={(v) => setActionForm({ ...actionForm, condition: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good Condition</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="partial">Partial Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
              <Textarea
                value={actionForm.notes}
                onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                placeholder="Any notes about the shipment..."
                rows={3}
              />
            </div>
            <Button onClick={handleReceive} className="w-full">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm Received
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ship Modal */}
      <Dialog open={actionModal === 'ship'} onOpenChange={() => setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ship to Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tracking Number *</label>
              <Input
                value={actionForm.tracking_number}
                onChange={(e) => setActionForm({ ...actionForm, tracking_number: e.target.value })}
                placeholder="Enter tracking number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Carrier</label>
              <Select 
                value={actionForm.carrier} 
                onValueChange={(v) => setActionForm({ ...actionForm, carrier: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DWZ56">DWZ56</SelectItem>
                  <SelectItem value="DTDC">DTDC</SelectItem>
                  <SelectItem value="Delhivery">Delhivery</SelectItem>
                  <SelectItem value="BlueDart">BlueDart</SelectItem>
                  <SelectItem value="FedEx">FedEx</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shipped By</label>
              <Input
                value={actionForm.shipped_by}
                onChange={(e) => setActionForm({ ...actionForm, shipped_by: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
              <Textarea
                value={actionForm.notes}
                onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                placeholder="Any notes..."
                rows={2}
              />
            </div>
            <Button onClick={handleShip} className="w-full bg-green-600 hover:bg-green-700">
              <Truck className="w-4 h-4 mr-2" />
              Confirm Shipped
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shipping Label */}
      {showLabel && (
        <ShippingLabel label={showLabel} onClose={() => setShowLabel(null)} />
      )}
    </div>
  );
};

export default WarehouseScanner;
