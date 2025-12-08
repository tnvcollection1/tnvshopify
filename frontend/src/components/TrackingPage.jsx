import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Package, MapPin, Clock, CheckCircle, Truck, Phone, Mail, Home, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const TrackingPage = () => {
  const { identifier } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (identifier) {
      fetchTrackingData();
    }
  }, [identifier]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/tracking/${identifier}`);
      setTrackingData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to fetch tracking information');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto text-blue-600 animate-pulse mb-4" />
          <p className="text-lg text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Tracking Not Found</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Please check your order/tracking number and try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orderData = trackingData?.type === 'order' ? trackingData.data : trackingData?.data?.order;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Package className="w-16 h-16 mx-auto text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Track Your Order</h1>
          <p className="text-gray-600 mt-2">Real-time delivery updates</p>
        </div>

        {/* Order Details */}
        {orderData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="font-semibold text-lg">{orderData.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-semibold">{formatDate(orderData.order_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer Name</p>
                  <p className="font-semibold">{orderData.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Amount</p>
                  <p className="font-semibold text-lg">Rs {orderData.total_amount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Status</p>
                  <Badge className="bg-blue-600">{orderData.order_status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <Badge className="bg-green-600">{orderData.payment_status}</Badge>
                </div>
              </div>

              {orderData.tracking_number && (
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">DTDC Tracking Number</p>
                  <p className="font-mono font-semibold text-lg text-blue-600">{orderData.tracking_number}</p>
                </div>
              )}

              {orderData.items && orderData.items.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Order Items:</p>
                  <ul className="list-disc list-inside">
                    {orderData.items.map((item, idx) => (
                      <li key={idx} className="text-gray-900">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shipping Address */}
        {orderData?.shipping_address && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900">{orderData.shipping_address.address1}</p>
              {orderData.shipping_address.address2 && (
                <p className="text-gray-900">{orderData.shipping_address.address2}</p>
              )}
              <p className="text-gray-900">
                {orderData.shipping_address.city}, {orderData.shipping_address.state} - {orderData.shipping_address.pincode}
              </p>
              <p className="text-gray-900">{orderData.shipping_address.country}</p>
            </CardContent>
          </Card>
        )}

        {/* Contact Support */}
        <Card>
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Need help with your order?</p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Call Support
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Us
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Powered by */}
        <div className="text-center text-sm text-gray-500">
          <p>Powered by Ashmiaa</p>
          <p className="mt-1">© 2025 All rights reserved</p>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
