import React, { useState, useEffect } from 'react';
import { 
  Truck, Package, MapPin, Clock, Search, RefreshCw, 
  Plus, Calculator, Calendar, CheckCircle, AlertCircle,
  ChevronDown, ChevronRight, Phone, Mail, Building,
  DollarSign, Weight, Box
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { useStore } from '../contexts/StoreContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status colors and icons
const STATUS_CONFIG = {
  'BOOKED': { color: 'bg-blue-100 text-blue-800', icon: Package },
  'PICKED_UP': { color: 'bg-yellow-100 text-yellow-800', icon: Truck },
  'IN_TRANSIT': { color: 'bg-purple-100 text-purple-800', icon: Truck },
  'OUT_FOR_DELIVERY': { color: 'bg-orange-100 text-orange-800', icon: MapPin },
  'DELIVERED': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  'FAILED': { color: 'bg-red-100 text-red-800', icon: AlertCircle },
  'PENDING_BOOKING': { color: 'bg-gray-100 text-gray-800', icon: Clock },
  'UNKNOWN': { color: 'bg-gray-100 text-gray-600', icon: Package }
};

const DTDCShipping = () => {
  const { selectedStore } = useStore();
  const storeName = selectedStore || 'tnvcollection';
  
  const [activeTab, setActiveTab] = useState('shipments');
  const [loading, setLoading] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [config, setConfig] = useState(null);
  const [trackingResult, setTrackingResult] = useState(null);
  const [rateResult, setRateResult] = useState(null);
  
  // Form states
  const [trackingNumber, setTrackingNumber] = useState('');
  const [rateForm, setRateForm] = useState({
    origin_pincode: '',
    destination_pincode: '',
    weight: '',
    declared_value: '',
    service_type: 'PRIORITY',
    cod: false
  });
  const [configForm, setConfigForm] = useState({
    name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    pincode: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    fetchData();
  }, [storeName]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shipmentsRes, configRes] = await Promise.all([
        fetch(`${API_URL}/api/shipping/shipments?store=${storeName}`),
        fetch(`${API_URL}/api/shipping/config/${storeName}`)
      ]);
      
      if (shipmentsRes.ok) {
        const data = await shipmentsRes.json();
        setShipments(data.shipments || []);
      }
      
      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data);
        if (data.origin) {
          setConfigForm(data.origin);
        }
      }
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Please enter AWB number');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shipping/track/${trackingNumber}?store=${storeName}`);
      const data = await res.json();
      setTrackingResult(data);
      toast.success('Tracking info retrieved');
    } catch (e) {
      toast.error('Failed to track shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRate = async () => {
    if (!rateForm.origin_pincode || !rateForm.destination_pincode || !rateForm.weight) {
      toast.error('Please fill required fields');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shipping/calculate-rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rateForm,
          weight: parseFloat(rateForm.weight),
          declared_value: rateForm.declared_value ? parseFloat(rateForm.declared_value) : null
        })
      });
      const data = await res.json();
      setRateResult(data);
    } catch (e) {
      toast.error('Failed to calculate rate');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shipping/config/${storeName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          origin: configForm
        })
      });
      
      if (res.ok) {
        toast.success('Configuration saved');
        fetchData();
      } else {
        throw new Error('Failed to save');
      }
    } catch (e) {
      toast.error('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['UNKNOWN'];
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
        <Icon className="w-3 h-3" />
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
            DTDC Shipping
          </h1>
          <p className="text-gray-500 mt-1">Manage shipments, track packages, and calculate rates</p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
        {[
          { id: 'shipments', label: 'Shipments', icon: Package },
          { id: 'track', label: 'Track', icon: MapPin },
          { id: 'rates', label: 'Rate Calculator', icon: Calculator },
          { id: 'settings', label: 'Settings', icon: Building }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              activeTab === tab.id 
                ? 'bg-white shadow text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Shipments Tab */}
      {activeTab === 'shipments' && (
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent Shipments</h2>
              <span className="text-sm text-gray-500">{shipments.length} total</span>
            </div>
          </div>
          
          {shipments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No shipments yet</p>
              <p className="text-sm">Shipments will appear here when orders are dispatched</p>
            </div>
          ) : (
            <div className="divide-y">
              {shipments.map((shipment, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold">{shipment.awb_number}</span>
                        {getStatusBadge(shipment.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Order: {shipment.order_id} • {shipment.service_type}
                      </p>
                      {shipment.destination && (
                        <p className="text-sm text-gray-500">
                          → {shipment.destination.city}, {shipment.destination.state} - {shipment.destination.pincode}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{new Date(shipment.created_at).toLocaleDateString()}</p>
                      {shipment.cod_amount > 0 && (
                        <p className="text-orange-600">COD: ₹{shipment.cod_amount}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Track Tab */}
      {activeTab === 'track' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4">Track Shipment</h2>
            <div className="flex gap-3">
              <Input
                placeholder="Enter AWB Number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="max-w-md font-mono"
              />
              <Button onClick={handleTrack} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Track
              </Button>
            </div>
          </div>

          {trackingResult && (
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Tracking Result</h3>
                {getStatusBadge(trackingResult.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">AWB Number</p>
                  <p className="font-mono font-semibold">{trackingResult.awb_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Carrier</p>
                  <p className="font-semibold">{trackingResult.carrier}</p>
                </div>
                {trackingResult.order_id && (
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-semibold">{trackingResult.order_id}</p>
                  </div>
                )}
                {trackingResult.destination && (
                  <div>
                    <p className="text-sm text-gray-500">Destination</p>
                    <p className="font-semibold">
                      {trackingResult.destination.city}, {trackingResult.destination.state}
                    </p>
                  </div>
                )}
              </div>

              {trackingResult.tracking_events?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Tracking History</h4>
                  <div className="space-y-3">
                    {trackingResult.tracking_events.map((event, idx) => (
                      <div key={idx} className="flex gap-3 pl-4 border-l-2 border-gray-200">
                        <div className="w-2 h-2 rounded-full bg-blue-500 -ml-[5px] mt-2" />
                        <div>
                          <p className="font-medium">{event.status || event.description}</p>
                          <p className="text-sm text-gray-500">
                            {event.location && `${event.location} • `}
                            {event.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rate Calculator Tab */}
      {activeTab === 'rates' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Calculate Shipping Rate
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Origin Pincode *</Label>
                  <Input
                    placeholder="400001"
                    value={rateForm.origin_pincode}
                    onChange={(e) => setRateForm(p => ({ ...p, origin_pincode: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Destination Pincode *</Label>
                  <Input
                    placeholder="110001"
                    value={rateForm.destination_pincode}
                    onChange={(e) => setRateForm(p => ({ ...p, destination_pincode: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Weight (kg) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="1.0"
                    value={rateForm.weight}
                    onChange={(e) => setRateForm(p => ({ ...p, weight: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Declared Value (₹)</Label>
                  <Input
                    type="number"
                    placeholder="2000"
                    value={rateForm.declared_value}
                    onChange={(e) => setRateForm(p => ({ ...p, declared_value: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Service Type</Label>
                <select
                  value={rateForm.service_type}
                  onChange={(e) => setRateForm(p => ({ ...p, service_type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                >
                  <option value="PRIORITY">Priority (1-2 days)</option>
                  <option value="EXPRESS">Express (2-3 days)</option>
                  <option value="STANDARD">Standard (3-5 days)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cod"
                  checked={rateForm.cod}
                  onChange={(e) => setRateForm(p => ({ ...p, cod: e.target.checked }))}
                  className="w-4 h-4"
                />
                <Label htmlFor="cod">Cash on Delivery (COD)</Label>
              </div>

              <Button onClick={handleCalculateRate} disabled={loading} className="w-full">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                Calculate Rate
              </Button>
            </div>
          </div>

          {/* Rate Result */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Estimated Rate
            </h2>

            {!rateResult ? (
              <div className="text-center text-gray-500 py-12">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Enter details to calculate rate</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 mb-1">Total Shipping Cost</p>
                  <p className="text-3xl font-bold text-green-700">
                    ₹{rateResult.rates.total.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Charge</span>
                    <span>₹{rateResult.rates.base_charge}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Weight Charge</span>
                    <span>₹{rateResult.rates.weight_charge}</span>
                  </div>
                  {rateResult.rates.zone_multiplier > 1 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Zone Multiplier</span>
                      <span>×{rateResult.rates.zone_multiplier}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>₹{rateResult.rates.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST (18%)</span>
                    <span>₹{rateResult.rates.gst}</span>
                  </div>
                  {rateResult.rates.cod_charge > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>COD Charge</span>
                      <span>₹{rateResult.rates.cod_charge}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Total</span>
                    <span>₹{rateResult.rates.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  <Clock className="w-4 h-4" />
                  Estimated Delivery: {rateResult.estimated_delivery}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border p-6 max-w-2xl">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Building className="w-5 h-5" />
            Pickup/Origin Address
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            This address will be used as the origin for all shipments
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Business Name *</Label>
                <Input
                  placeholder="TNV Collection"
                  value={configForm.name}
                  onChange={(e) => setConfigForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={configForm.phone}
                  onChange={(e) => setConfigForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Address Line 1 *</Label>
              <Input
                placeholder="Shop No. 123, Building Name"
                value={configForm.address_line_1}
                onChange={(e) => setConfigForm(p => ({ ...p, address_line_1: e.target.value }))}
              />
            </div>

            <div>
              <Label>Address Line 2</Label>
              <Input
                placeholder="Street, Landmark"
                value={configForm.address_line_2}
                onChange={(e) => setConfigForm(p => ({ ...p, address_line_2: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Pincode *</Label>
                <Input
                  placeholder="400001"
                  value={configForm.pincode}
                  onChange={(e) => setConfigForm(p => ({ ...p, pincode: e.target.value }))}
                />
              </div>
              <div>
                <Label>City *</Label>
                <Input
                  placeholder="Mumbai"
                  value={configForm.city}
                  onChange={(e) => setConfigForm(p => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div>
                <Label>State *</Label>
                <Input
                  placeholder="Maharashtra"
                  value={configForm.state}
                  onChange={(e) => setConfigForm(p => ({ ...p, state: e.target.value }))}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button onClick={handleSaveConfig} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Configuration
              </Button>
            </div>
          </div>

          {/* DTDC Credentials */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="font-semibold mb-4">DTDC Credentials</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Customer Code</span>
                <span className="font-mono">GL6029</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="text-green-600 font-medium">Connected</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DTDCShipping;
