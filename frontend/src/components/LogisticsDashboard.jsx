import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Package, MapPin, Calculator, Search, RefreshCw,
  Plus, Clock, CheckCircle, AlertCircle, ArrowRight,
  Weight, Box, BarChart2, Send, Eye, XCircle,
  ChevronRight, IndianRupee, Plane, Ship, History,
  Settings, Zap, Webhook, Power
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_STYLES = {
  order_confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Confirmed' },
  booked: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Booked' },
  picked_up: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', label: 'Picked Up' },
  in_transit: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'In Transit' },
  out_for_delivery: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Out for Delivery' },
  delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Delivered' },
  cancelled: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'Cancelled' },
  rto: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'RTO' },
};

function getStatusStyle(status) {
  return STATUS_STYLES[status] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: status || 'Unknown' };
}

// ─── Rate Calculator Tab ─────────────────────────────────────────
function RateCalculator() {
  const [form, setForm] = useState({
    from_pincode: '110001',
    to_pincode: '',
    weight: '',
    length: 30,
    width: 20,
    height: 10,
  });
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState(null);

  const handleCompare = async () => {
    if (!form.to_pincode || !form.weight) {
      toast.error('Please enter destination pincode and weight');
      return;
    }
    setLoading(true);
    setRates(null);
    try {
      const res = await fetch(`${API_URL}/api/logistics/calculate-rate/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_pincode: form.from_pincode,
          to_pincode: form.to_pincode,
          weight: parseFloat(form.weight),
          length: parseFloat(form.length),
          width: parseFloat(form.width),
          height: parseFloat(form.height),
          delivery_type: 'SURFACE',
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRates(data.rates);
        toast.success('Rates calculated');
      } else {
        toast.error(data.detail || 'Failed to calculate rates');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card data-testid="rate-calculator-form">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-600" />
              Shipping Rate Calculator
            </CardTitle>
            <CardDescription>Calculate rates between two pincodes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Origin Pincode</Label>
                <Input
                  data-testid="from-pincode-input"
                  value={form.from_pincode}
                  onChange={e => setForm(p => ({ ...p, from_pincode: e.target.value }))}
                  placeholder="110001"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Destination Pincode</Label>
                <Input
                  data-testid="to-pincode-input"
                  value={form.to_pincode}
                  onChange={e => setForm(p => ({ ...p, to_pincode: e.target.value }))}
                  placeholder="400001"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Weight (grams)</Label>
              <Input
                data-testid="weight-input"
                type="number"
                value={form.weight}
                onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                placeholder="500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Length (cm)</Label>
                <Input
                  type="number"
                  value={form.length}
                  onChange={e => setForm(p => ({ ...p, length: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Width (cm)</Label>
                <Input
                  type="number"
                  value={form.width}
                  onChange={e => setForm(p => ({ ...p, width: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Height (cm)</Label>
                <Input
                  type="number"
                  value={form.height}
                  onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                />
              </div>
            </div>

            <Button
              data-testid="calculate-rate-btn"
              onClick={handleCompare}
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              Compare Rates
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4" data-testid="rate-results">
          {rates ? (
            <>
              {rates.surface && (
                <Card className="border-l-4 border-l-emerald-500">
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Ship className="w-5 h-5 text-emerald-600" />
                        <span className="font-semibold text-slate-800">Surface</span>
                      </div>
                      <span className="text-2xl font-bold text-emerald-700">
                        <IndianRupee className="w-5 h-5 inline -mt-1" />
                        {rates.surface.shippingCharge}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                      <div>Chargeable Weight: <span className="font-medium text-slate-800">{rates.surface.chargeableWeight} kg</span></div>
                      <div>Volumetric: <span className="font-medium text-slate-800">{rates.surface.volumatricWeight} g</span></div>
                      <div>Base Rate: <span className="font-medium text-slate-800">{rates.surface.baseRate}</span></div>
                      <div>RTO Charge: <span className="font-medium text-slate-800">{rates.surface.RTOCharge}</span></div>
                      <div>Zone: <span className="font-medium text-slate-800">{rates.surface.appliedZone?.MappingValue}</span></div>
                      <div>Weight Slab: <span className="font-medium text-slate-800">{rates.surface.appliedRate?.label}</span></div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {rates.air && (
                <Card className="border-l-4 border-l-sky-500">
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Plane className="w-5 h-5 text-sky-600" />
                        <span className="font-semibold text-slate-800">Air</span>
                      </div>
                      <span className="text-2xl font-bold text-sky-700">
                        <IndianRupee className="w-5 h-5 inline -mt-1" />
                        {rates.air.shippingCharge}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                      <div>Chargeable Weight: <span className="font-medium text-slate-800">{rates.air.chargeableWeight} kg</span></div>
                      <div>Volumetric: <span className="font-medium text-slate-800">{rates.air.volumatricWeight} g</span></div>
                      <div>Base Rate: <span className="font-medium text-slate-800">{rates.air.baseRate}</span></div>
                      <div>RTO Charge: <span className="font-medium text-slate-800">{rates.air.RTOCharge}</span></div>
                      <div>Zone: <span className="font-medium text-slate-800">{rates.air.appliedZone?.MappingValue}</span></div>
                      <div>Weight Slab: <span className="font-medium text-slate-800">{rates.air.appliedRate?.label}</span></div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-dashed flex items-center justify-center min-h-[260px]">
              <div className="text-center text-slate-400 p-6">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Enter details and compare rates</p>
                <p className="text-sm mt-1">Surface vs Air shipping costs</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Booking Form Tab ────────────────────────────────────────────
function BookingForm({ onBookingCreated }) {
  const [form, setForm] = useState({
    orderId: '',
    amount: '',
    weight: '',
    length: 30, width: 20, height: 10,
    paymentType: 'ONLINE',
    paymentStatus: 'PAID',
    deliveryPromise: 'SURFACE',
    remarks: '',
    // Shipping
    ship_name: '', ship_phone: '', ship_address1: '', ship_city: '', ship_state: '', ship_zip: '',
    // Pickup
    pickup_name: 'TNVC Collection', pickup_phone: '9582639469', pickup_address1: 'TNVC Warehouse',
    pickup_city: 'Delhi', pickup_state: 'Delhi', pickup_zip: '110001',
    // Line item
    item_name: '', item_qty: 1, item_price: '', item_sku: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleBook = async () => {
    if (!form.orderId || !form.ship_name || !form.ship_phone || !form.ship_zip || !form.amount) {
      toast.error('Fill required fields: Order ID, customer name, phone, pincode, amount');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        orderId: form.orderId,
        shippingAddress: {
          name: form.ship_name, phone: form.ship_phone, address1: form.ship_address1,
          city: form.ship_city, state: form.ship_state, country: 'India', zip: form.ship_zip,
        },
        pickupAddress: {
          name: form.pickup_name, phone: form.pickup_phone, address1: form.pickup_address1,
          city: form.pickup_city, state: form.pickup_state, country: 'India', zip: form.pickup_zip,
        },
        amount: parseFloat(form.amount),
        weight: parseFloat(form.weight) || 500,
        length: parseFloat(form.length), width: parseFloat(form.width), height: parseFloat(form.height),
        currency: 'INR', gstPercentage: 0,
        paymentType: form.paymentType, paymentStatus: form.paymentStatus,
        deliveryPromise: form.deliveryPromise,
        lineItems: [{
          name: form.item_name || 'Product', weight: parseFloat(form.weight) || 500,
          quantity: parseInt(form.item_qty), unitPrice: parseFloat(form.item_price || form.amount),
          price: parseFloat(form.item_price || form.amount) * parseInt(form.item_qty),
          sku: form.item_sku,
        }],
        remarks: form.remarks,
      };
      const res = await fetch(`${API_URL}/api/logistics/book-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(`Order booked! AWB: ${data.booking.awbNumber}`);
        onBookingCreated?.();
      } else {
        toast.error(data.detail || 'Booking failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Customer / Shipping Address */}
      <Card data-testid="booking-shipping-form">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            Shipping Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Customer Name *</Label>
              <Input data-testid="ship-name" value={form.ship_name} onChange={e => set('ship_name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Phone *</Label>
              <Input data-testid="ship-phone" value={form.ship_phone} onChange={e => set('ship_phone', e.target.value)} placeholder="9876543210" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Address</Label>
            <Input value={form.ship_address1} onChange={e => set('ship_address1', e.target.value)} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">City</Label>
              <Input value={form.ship_city} onChange={e => set('ship_city', e.target.value)} placeholder="City" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">State</Label>
              <Input value={form.ship_state} onChange={e => set('ship_state', e.target.value)} placeholder="State" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Pincode *</Label>
              <Input data-testid="ship-zip" value={form.ship_zip} onChange={e => set('ship_zip', e.target.value)} placeholder="400001" className="font-mono" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card data-testid="booking-order-form">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-500" />
            Order Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Order ID *</Label>
              <Input data-testid="order-id" value={form.orderId} onChange={e => set('orderId', e.target.value)} placeholder="TNVC-1001" className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Amount (INR) *</Label>
              <Input data-testid="order-amount" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="8500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Weight (g)</Label>
              <Input type="number" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="500" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Delivery Mode</Label>
              <Select value={form.deliveryPromise} onValueChange={v => set('deliveryPromise', v)}>
                <SelectTrigger data-testid="delivery-mode-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SURFACE">Surface</SelectItem>
                  <SelectItem value="AIR">Air</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Payment Type</Label>
              <Select value={form.paymentType} onValueChange={v => set('paymentType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONLINE">Prepaid</SelectItem>
                  <SelectItem value="COD">COD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Product Name</Label>
              <Input value={form.item_name} onChange={e => set('item_name', e.target.value)} placeholder="Designer Shoes" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Remarks</Label>
            <Input value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional notes" />
          </div>
          <Button data-testid="book-order-btn" onClick={handleBook} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Book Shipment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Bookings List Tab ───────────────────────────────────────────
function BookingsList({ refreshKey }) {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/logistics/bookings?page=${page}&limit=15`);
      const data = await res.json();
      if (data.status === 'success') {
        setBookings(data.bookings);
        setTotal(data.total);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings, refreshKey]);

  return (
    <div className="space-y-4" data-testid="bookings-list">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{total} total shipments</div>
        <Button variant="outline" size="sm" onClick={fetchBookings} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {bookings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Package className="w-10 h-10 mb-2 opacity-40" />
            <p className="font-medium">No bookings yet</p>
            <p className="text-sm">Create your first shipment above</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {bookings.map((b, i) => {
            const style = getStatusStyle(b.status);
            return (
              <Card key={i} className="hover:shadow-sm transition-shadow" data-testid={`booking-row-${i}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="shrink-0">
                        <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center`}>
                          <Package className={`w-5 h-5 ${style.text}`} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-800 truncate">{b.order_id}</span>
                          <Badge variant="outline" className={`text-xs ${style.bg} ${style.text} ${style.border}`}>
                            {style.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                          {b.awb_number && <span className="font-mono">AWB: {b.awb_number}</span>}
                          <span>{b.delivery_type}</span>
                          {b.shipping_address?.city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" /> {b.shipping_address.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="font-semibold text-sm text-slate-800 flex items-center">
                          <IndianRupee className="w-3.5 h-3.5" />
                          {b.amount?.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">
                          {b.weight ? `${b.weight}g` : ''}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        {b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {total > 15 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="text-sm text-slate-500">Page {page}</span>
          <Button variant="outline" size="sm" disabled={page * 15 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ─── Tracking Tab ────────────────────────────────────────────────
function OrderTracking() {
  const [trackingId, setTrackingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);

  const handleTrack = async () => {
    if (!trackingId.trim()) { toast.error('Enter a tracking/AWB number'); return; }
    setLoading(true);
    setCurrent(null);
    setHistory([]);
    try {
      const [statusRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/logistics/track/${trackingId}`),
        fetch(`${API_URL}/api/logistics/track/${trackingId}/history`),
      ]);
      const statusData = await statusRes.json();
      const historyData = await historyRes.json();

      if (statusData.status === 'success' && statusData.tracking) {
        setCurrent(statusData.tracking);
      }
      if (historyData.status === 'success' && Array.isArray(historyData.history)) {
        setHistory(historyData.history);
      }
      if (!statusData.tracking && (!historyData.history || historyData.history.length === 0)) {
        toast.error('No tracking data found');
      }
    } catch {
      toast.error('Failed to fetch tracking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card data-testid="tracking-form">
        <CardContent className="pt-5">
          <div className="flex gap-3">
            <Input
              data-testid="tracking-input"
              value={trackingId}
              onChange={e => setTrackingId(e.target.value)}
              placeholder="Enter AWB / Tracking Number"
              className="font-mono text-base"
              onKeyDown={e => e.key === 'Enter' && handleTrack()}
            />
            <Button data-testid="track-btn" onClick={handleTrack} disabled={loading} className="bg-slate-900 hover:bg-slate-800 px-6">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
              Track
            </Button>
          </div>
        </CardContent>
      </Card>

      {current && (
        <Card data-testid="tracking-result" className="overflow-hidden">
          <div className={`h-1.5 ${getStatusStyle(current.status).bg.replace('bg-', 'bg-')}`} style={{ background: current.status === 'delivered' ? '#10b981' : current.status === 'in_transit' ? '#f59e0b' : '#6366f1' }} />
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">Tracking ID</div>
                <div className="text-lg font-semibold font-mono text-slate-800">{current.trackingId}</div>
              </div>
              <Badge className={`${getStatusStyle(current.status).bg} ${getStatusStyle(current.status).text} text-sm px-3 py-1`}>
                {current.category?.replace(/_/g, ' ') || current.status}
              </Badge>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-slate-400">Location</div>
                <div className="font-medium text-slate-700 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {current.location || '-'}</div>
              </div>
              <div>
                <div className="text-slate-400">Carrier</div>
                <div className="font-medium text-slate-700">{current.deliveryPartnerName || '-'}</div>
              </div>
              <div>
                <div className="text-slate-400">Status</div>
                <div className="font-medium text-slate-700">{current.subcategory || current.status}</div>
              </div>
              <div>
                <div className="text-slate-400">Last Updated</div>
                <div className="font-medium text-slate-700">
                  {current.createdAt ? new Date(current.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card data-testid="tracking-history">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Tracking History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {history.map((event, i) => (
                <div key={i} className="flex gap-4 pb-5 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-indigo-500' : 'bg-slate-300'} ring-4 ${i === 0 ? 'ring-indigo-100' : 'ring-slate-50'}`} />
                    {i < history.length - 1 && <div className="w-px h-full bg-slate-200 mt-1" />}
                  </div>
                  <div className="-mt-0.5">
                    <div className="font-medium text-sm text-slate-800">
                      {event.category?.replace(/_/g, ' ') || event.status}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {event.subcategory}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      {event.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{event.location}</span>}
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {event.createdAt ? new Date(event.createdAt).toLocaleString('en-IN') : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!current && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-slate-400">
            <Search className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">Track your shipments</p>
            <p className="text-sm mt-1">Enter AWB number to see real-time status</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Shopify Push Tab ────────────────────────────────────────────
function ShopifyPush({ onBookingCreated }) {
  const [shopifyOrderId, setShopifyOrderId] = useState('');
  const [deliveryType, setDeliveryType] = useState('SURFACE');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handlePush = async () => {
    if (!shopifyOrderId.trim()) { toast.error('Enter a Shopify Order ID'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/logistics/push-shopify-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopify_order_id: shopifyOrderId,
          delivery_type: deliveryType,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setResult(data.booking);
        toast.success(`Shopify order pushed! AWB: ${data.booking.awbNumber}`);
        onBookingCreated?.();
      } else {
        toast.error(data.detail || 'Failed to push order');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card data-testid="shopify-push-form">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-emerald-600" />
            Push Shopify Order to Shri Maruti
          </CardTitle>
          <CardDescription>Automatically pulls order details from Shopify and books the shipment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Shopify Order ID</Label>
            <Input
              data-testid="shopify-order-id-input"
              value={shopifyOrderId}
              onChange={e => setShopifyOrderId(e.target.value)}
              placeholder="e.g. 5678901234567"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Delivery Mode</Label>
            <Select value={deliveryType} onValueChange={setDeliveryType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SURFACE">Surface</SelectItem>
                <SelectItem value="AIR">Air</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button data-testid="push-shopify-btn" onClick={handlePush} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Push to Shri Maruti
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-emerald-200 bg-emerald-50" data-testid="shopify-push-result">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-emerald-800">Order Pushed Successfully</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-emerald-600">Order ID:</span> <span className="font-mono font-medium">{result.orderId}</span></div>
              <div><span className="text-emerald-600">AWB:</span> <span className="font-mono font-medium">{result.awbNumber}</span></div>
              <div><span className="text-emerald-600">Shipper ID:</span> <span className="font-mono font-medium">{result.shipperOrderId}</span></div>
              {result.shopifyOrderNumber && (
                <div><span className="text-emerald-600">Shopify #:</span> <span className="font-mono font-medium">{result.shopifyOrderNumber}</span></div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Auto-Push Settings Tab ──────────────────────────────────────
function AutoPushSettings() {
  const [settings, setSettings] = useState({
    enabled: false,
    delivery_type: 'SURFACE',
    pickup_name: 'TNVC Collection',
    pickup_phone: '9582639469',
    pickup_address: 'TNVC Warehouse',
    pickup_city: 'Delhi',
    pickup_state: 'Delhi',
    pickup_zip: '110001',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [webhooks, setWebhooks] = useState([]);
  const [registering, setRegistering] = useState(false);
  const [failures, setFailures] = useState([]);

  useEffect(() => {
    // Fetch current settings
    fetch(`${API_URL}/api/logistics/auto-push/settings`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success' && d.settings) {
          const s = d.settings;
          setSettings({
            enabled: s.enabled || false,
            delivery_type: s.delivery_type || 'SURFACE',
            pickup_name: s.pickup?.name || 'TNVC Collection',
            pickup_phone: s.pickup?.phone || '9582639469',
            pickup_address: s.pickup?.address || 'TNVC Warehouse',
            pickup_city: s.pickup?.city || 'Delhi',
            pickup_state: s.pickup?.state || 'Delhi',
            pickup_zip: s.pickup?.zip || '110001',
          });
        }
      })
      .finally(() => setLoading(false));

    // Fetch webhooks
    fetch(`${API_URL}/api/logistics/webhooks`)
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setWebhooks(d.webhooks || []); })
      .catch(() => {});

    // Fetch recent failures
    fetch(`${API_URL}/api/logistics/push-failures?limit=5`)
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setFailures(d.failures || []); })
      .catch(() => {});
  }, []);

  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/logistics/auto-push/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(settings.enabled ? 'Auto-push enabled and saved' : 'Auto-push disabled');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setRegistering(true);
    try {
      const res = await fetch(`${API_URL}/api/logistics/register-webhook`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(data.message);
        // Refresh webhooks list
        const wRes = await fetch(`${API_URL}/api/logistics/webhooks`);
        const wData = await wRes.json();
        if (wData.status === 'success') setWebhooks(wData.webhooks || []);
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setRegistering(false);
    }
  };

  const paidWebhook = webhooks.find(w => w.topic === 'orders/paid');

  if (loading) return <div className="flex items-center justify-center py-12 text-slate-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading settings...</div>;

  return (
    <div className="space-y-6" data-testid="auto-push-settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Toggle + Settings */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Auto-Push Configuration
            </CardTitle>
            <CardDescription>Automatically push paid Shopify orders to Shri Maruti</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
              <div>
                <div className="font-medium text-sm text-slate-800">Auto-Push Enabled</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {settings.enabled ? 'New paid orders will be auto-shipped' : 'Orders need manual push'}
                </div>
              </div>
              <Switch
                data-testid="auto-push-toggle"
                checked={settings.enabled}
                onCheckedChange={v => set('enabled', v)}
              />
            </div>

            {/* Delivery Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Default Delivery Mode</Label>
              <Select value={settings.delivery_type} onValueChange={v => set('delivery_type', v)}>
                <SelectTrigger data-testid="auto-push-delivery-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SURFACE">Surface</SelectItem>
                  <SelectItem value="AIR">Air</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Pickup Address */}
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pickup Address (Origin)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Name</Label>
                  <Input value={settings.pickup_name} onChange={e => set('pickup_name', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Phone</Label>
                  <Input value={settings.pickup_phone} onChange={e => set('pickup_phone', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <Label className="text-xs text-slate-400">Address</Label>
                <Input value={settings.pickup_address} onChange={e => set('pickup_address', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">City</Label>
                  <Input value={settings.pickup_city} onChange={e => set('pickup_city', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">State</Label>
                  <Input value={settings.pickup_state} onChange={e => set('pickup_state', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Pincode</Label>
                  <Input value={settings.pickup_zip} onChange={e => set('pickup_zip', e.target.value)} className="font-mono" />
                </div>
              </div>
            </div>

            <Button
              data-testid="save-auto-push-btn"
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-slate-900 hover:bg-slate-800"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Webhook Status + Failures */}
        <div className="space-y-4">
          {/* Webhook Status */}
          <Card data-testid="webhook-status-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="w-4 h-4 text-violet-500" />
                Shopify Webhook
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {paidWebhook ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-medium text-sm text-emerald-800">orders/paid webhook active</div>
                    <div className="text-xs text-emerald-600 truncate mt-0.5">{paidWebhook.address}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="font-medium text-sm text-amber-800">Webhook not registered</div>
                    <div className="text-xs text-amber-600 mt-0.5">Register to enable auto-push from Shopify</div>
                  </div>
                </div>
              )}
              <Button
                data-testid="register-webhook-btn"
                onClick={handleRegisterWebhook}
                disabled={registering}
                variant={paidWebhook ? 'outline' : 'default'}
                className={paidWebhook ? '' : 'bg-violet-600 hover:bg-violet-700'}
                size="sm"
              >
                {registering ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Webhook className="w-3.5 h-3.5 mr-1.5" />}
                {paidWebhook ? 'Re-register' : 'Register Webhook'}
              </Button>

              {webhooks.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-slate-500 mb-1.5">All registered webhooks:</div>
                  <div className="space-y-1">
                    {webhooks.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-600 p-1.5 rounded bg-slate-50">
                        <Badge variant="outline" className="text-[10px] shrink-0">{w.topic}</Badge>
                        <span className="truncate opacity-70">{w.address}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Failures */}
          <Card data-testid="push-failures-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                Recent Push Failures
              </CardTitle>
            </CardHeader>
            <CardContent>
              {failures.length === 0 ? (
                <div className="text-center text-sm text-slate-400 py-4">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No failures recorded
                </div>
              ) : (
                <div className="space-y-2">
                  {failures.map((f, i) => (
                    <div key={i} className="text-xs p-2 rounded bg-red-50 border border-red-100">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-red-800">#{f.order_id}</span>
                        <span className="text-red-400">{f.created_at ? new Date(f.created_at).toLocaleString('en-IN') : ''}</span>
                      </div>
                      <div className="text-red-600 mt-0.5">{f.error}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Ship Tab ───────────────────────────────────────────────
function BulkShip({ onBookingCreated }) {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [pushing, setPushing] = useState(false);
  const [pushResults, setPushResults] = useState(null);
  const [deliveryType, setDeliveryType] = useState('SURFACE');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25, search });
      const res = await fetch(`${API_URL}/api/logistics/shippable-orders?${params}`);
      const data = await res.json();
      if (data.status === 'success') {
        setOrders(data.orders);
        setTotal(data.total);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const toggleSelect = (orderNum) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(orderNum)) next.delete(orderNum);
      else next.add(orderNum);
      return next;
    });
  };

  const selectAll = () => {
    const selectable = orders.filter(o => !o.already_booked).map(o => o.order_number);
    if (selected.size === selectable.length) setSelected(new Set());
    else setSelected(new Set(selectable));
  };

  const handleBulkPush = async () => {
    if (selected.size === 0) { toast.error('Select orders to ship'); return; }
    setPushing(true);
    setPushResults(null);
    try {
      const res = await fetch(`${API_URL}/api/logistics/bulk-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_numbers: Array.from(selected),
          delivery_type: deliveryType,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPushResults(data);
        toast.success(`${data.success} of ${data.total} orders pushed successfully`);
        setSelected(new Set());
        fetchOrders();
        onBookingCreated?.();
      } else {
        toast.error(data.detail || 'Bulk push failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setPushing(false);
    }
  };

  const selectableOrders = orders.filter(o => !o.already_booked);

  return (
    <div className="space-y-4" data-testid="bulk-ship-tab">
      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Input
            data-testid="bulk-search-input"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by order #, name, phone..."
            className="max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <span className="text-sm text-slate-500 whitespace-nowrap">{total} orders ready</span>
        </div>

        <div className="flex items-center gap-2">
          <Select value={deliveryType} onValueChange={setDeliveryType}>
            <SelectTrigger className="w-[120px]" data-testid="bulk-delivery-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SURFACE">Surface</SelectItem>
              <SelectItem value="AIR">Air</SelectItem>
            </SelectContent>
          </Select>
          <Button
            data-testid="bulk-push-btn"
            onClick={handleBulkPush}
            disabled={pushing || selected.size === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {pushing ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Ship {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </div>
      </div>

      {/* Results banner */}
      {pushResults && (
        <Card className={pushResults.failed > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'} data-testid="bulk-results">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className={`w-5 h-5 ${pushResults.failed > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
              <span className="font-semibold text-sm">
                {pushResults.success} shipped, {pushResults.failed} failed, {pushResults.total - pushResults.success - pushResults.failed} skipped
              </span>
              <button onClick={() => setPushResults(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 text-xs">
              {pushResults.results.map((r, i) => (
                <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded ${
                  r.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                  r.status === 'skipped' ? 'bg-slate-100 text-slate-600' :
                  'bg-red-100 text-red-800'
                }`}>
                  {r.status === 'success' ? <CheckCircle className="w-3 h-3 shrink-0" /> :
                   r.status === 'skipped' ? <AlertCircle className="w-3 h-3 shrink-0" /> :
                   <XCircle className="w-3 h-3 shrink-0" />}
                  <span className="font-mono">#{r.order_number}</span>
                  {r.awb_number && <span className="opacity-75">AWB: {r.awb_number}</span>}
                  {r.message && <span className="opacity-75 truncate">{r.message}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/80">
                  <th className="py-2.5 px-3 text-left w-10">
                    <input
                      type="checkbox"
                      data-testid="select-all-checkbox"
                      checked={selectableOrders.length > 0 && selected.size === selectableOrders.length}
                      onChange={selectAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Items</th>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="py-2.5 px-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr
                    key={i}
                    data-testid={`bulk-order-row-${i}`}
                    className={`border-b last:border-0 transition-colors ${
                      o.already_booked ? 'bg-slate-50 opacity-60' :
                      selected.has(o.order_number) ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={selected.has(o.order_number)}
                        onChange={() => toggleSelect(o.order_number)}
                        disabled={o.already_booked}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-semibold text-slate-800">#{o.order_number}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-700 truncate max-w-[180px]">{o.customer_name || '-'}</div>
                      <div className="text-xs text-slate-400">{o.phone}</div>
                    </td>
                    <td className="py-2.5 px-3 hidden md:table-cell">
                      <div className="text-xs text-slate-600 truncate max-w-[220px]">{o.items_summary || '-'}</div>
                      <div className="text-xs text-slate-400">{o.items_count} item(s)</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-xs text-slate-600">{o.city}{o.state ? `, ${o.state}` : ''}</div>
                      <div className="text-xs text-slate-400 font-mono">{o.zip}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {o.already_booked ? (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle className="w-3 h-3 mr-1" /> Shipped
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          Ready
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Package className="w-10 h-10 mb-2 opacity-40" />
              <p className="font-medium">No shippable orders found</p>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading orders...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="text-sm text-slate-500">Page {page} of {Math.ceil(total / 25)}</span>
          <Button variant="outline" size="sm" disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard Component ────────────────────────────────────
export default function LogisticsDashboard() {
  const [activeTab, setActiveTab] = useState('calculator');
  const [bookingRefreshKey, setBookingRefreshKey] = useState(0);
  const [authStatus, setAuthStatus] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/logistics/auth-status`)
      .then(r => r.json())
      .then(d => setAuthStatus(d.status === 'success' ? 'connected' : 'error'))
      .catch(() => setAuthStatus('error'));
  }, []);

  const handleBookingCreated = () => {
    setBookingRefreshKey(k => k + 1);
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto" data-testid="logistics-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Truck className="w-4.5 h-4.5 text-white" />
            </div>
            Shri Maruti Logistics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Innofulfill - Rate Calculator, Bookings & Tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            data-testid="auth-status-badge"
            variant="outline"
            className={authStatus === 'connected' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-red-300 text-red-700 bg-red-50'}
          >
            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${authStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {authStatus === 'connected' ? 'API Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 mb-6 h-11" data-testid="logistics-tabs">
          <TabsTrigger value="calculator" className="text-sm" data-testid="tab-calculator">
            <Calculator className="w-4 h-4 mr-1.5" /> Rates
          </TabsTrigger>
          <TabsTrigger value="bulk" className="text-sm" data-testid="tab-bulk">
            <Truck className="w-4 h-4 mr-1.5" /> Bulk Ship
          </TabsTrigger>
          <TabsTrigger value="booking" className="text-sm" data-testid="tab-booking">
            <Plus className="w-4 h-4 mr-1.5" /> Book
          </TabsTrigger>
          <TabsTrigger value="bookings" className="text-sm" data-testid="tab-bookings">
            <Package className="w-4 h-4 mr-1.5" /> Shipments
          </TabsTrigger>
          <TabsTrigger value="tracking" className="text-sm" data-testid="tab-tracking">
            <Search className="w-4 h-4 mr-1.5" /> Track
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-sm" data-testid="tab-settings">
            <Settings className="w-4 h-4 mr-1.5" /> Auto-Push
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator"><RateCalculator /></TabsContent>
        <TabsContent value="bulk"><BulkShip onBookingCreated={handleBookingCreated} /></TabsContent>
        <TabsContent value="booking">
          <div className="space-y-6">
            <BookingForm onBookingCreated={handleBookingCreated} />
            <Separator />
            <div>
              <h3 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-emerald-500" /> Quick Push from Shopify
              </h3>
              <p className="text-sm text-slate-500 mb-4">Auto-pull order details from your Shopify store</p>
              <ShopifyPush onBookingCreated={handleBookingCreated} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="bookings"><BookingsList refreshKey={bookingRefreshKey} /></TabsContent>
        <TabsContent value="tracking"><OrderTracking /></TabsContent>
        <TabsContent value="settings"><AutoPushSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
