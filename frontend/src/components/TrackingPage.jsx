import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Package, MapPin, Clock, CheckCircle, Truck, Phone, Mail, Home, Calendar, AlertCircle } from 'lucide-react';
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

  const getStatusColor = (status) => {
    const statusMap = {
      'DLV': 'bg-green-600',
      'DELIVERED': 'bg-green-600',
      'OUTDLV': 'bg-blue-600',
      'IN_TRANSIT': 'bg-blue-600',
      'PROCESSING': 'bg-yellow-600',
      'PENDING': 'bg-gray-600'
    };
    return statusMap[status?.toUpperCase()] || 'bg-gray-600';
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
      <div className=\"min-h-screen bg-gray-50 flex items-center justify-center\">
        <div className=\"text-center\">
          <Package className=\"w-16 h-16 mx-auto text-blue-600 animate-pulse mb-4\" />
          <p className=\"text-lg text-gray-600\">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"min-h-screen bg-gray-50 flex items-center justify-center p-4\">
        <Card className=\"max-w-md w-full\">
          <CardContent className=\"py-12 text-center\">
            <AlertCircle className=\"w-16 h-16 mx-auto text-red-600 mb-4\" />
            <h2 className=\"text-2xl font-bold mb-2\">Tracking Not Found</h2>
            <p className=\"text-gray-600 mb-4\">{error}</p>
            <p className=\"text-sm text-gray-500\">Please check your order/tracking number and try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orderData = trackingData?.type === 'order' ? trackingData.data : trackingData?.data?.order;
  const dtdcData = trackingData?.data?.dtdc_tracking?.tracking_data;
  const isDelivered = dtdcData?.is_delivered || orderData?.delivery_status === 'DELIVERED';

  return (
    <div className=\"min-h-screen bg-gray-50 py-8 px-4\">
      <div className=\"max-w-4xl mx-auto space-y-6\">
        {/* Header */}
        <div className=\"text-center mb-8\">
          <Package className=\"w-16 h-16 mx-auto text-blue-600 mb-4\" />
          <h1 className=\"text-3xl font-bold text-gray-900\">Track Your Order</h1>
          <p className=\"text-gray-600 mt-2\">Real-time delivery updates</p>
        </div>

        {/* Current Status Card */}
        {dtdcData?.current_status && (
          <Card>
            <CardContent className=\"py-8\">
              <div className=\"text-center\">
                {isDelivered ? (
                  <CheckCircle className=\"w-16 h-16 mx-auto text-green-600 mb-4\" />
                ) : (
                  <Truck className=\"w-16 h-16 mx-auto text-blue-600 mb-4\" />
                )}
                <Badge className={`${getStatusColor(dtdcData.current_status.code)} text-white px-4 py-2 text-lg mb-2`}>
                  {dtdcData.current_status.description}
                </Badge>
                <p className=\"text-sm text-gray-600 mt-2\">
                  <MapPin className=\"w-4 h-4 inline mr-1\" />
                  {dtdcData.current_status.location}
                </p>
                <p className=\"text-sm text-gray-500 mt-1\">
                  <Clock className=\"w-4 h-4 inline mr-1\" />
                  {formatDate(`${dtdcData.current_status.date} ${dtdcData.current_status.time}`)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        {orderData && (
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Package className=\"w-5 h-5\" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                <div>
                  <p className=\"text-sm text-gray-600\">Order Number</p>
                  <p className=\"font-semibold text-lg\">{orderData.order_number}</p>
                </div>
                <div>
                  <p className=\"text-sm text-gray-600\">Order Date</p>
                  <p className=\"font-semibold\">{formatDate(orderData.order_date)}</p>
                </div>
                <div>
                  <p className=\"text-sm text-gray-600\">Customer Name</p>
                  <p className=\"font-semibold\">{orderData.customer_name}</p>
                </div>
                <div>
                  <p className=\"text-sm text-gray-600\">Order Amount</p>
                  <p className=\"font-semibold text-lg\">Rs {orderData.total_amount}</p>
                </div>
              </div>

              {orderData.tracking_number && (
                <div className=\"mt-4 p-3 bg-blue-50 rounded\">
                  <p className=\"text-sm text-gray-600\">DTDC Tracking Number</p>
                  <p className=\"font-mono font-semibold text-lg text-blue-600\">{orderData.tracking_number}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shipment Details */}
        {dtdcData?.shipment_details && (
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Truck className=\"w-5 h-5\" />
                Shipment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                <div>
                  <p className=\"text-sm text-gray-600\">Origin</p>
                  <p className=\"font-semibold\">
                    {dtdcData.shipment_details.origin.city} - {dtdcData.shipment_details.origin.pincode}
                  </p>
                </div>
                <div>
                  <p className=\"text-sm text-gray-600\">Destination</p>
                  <p className=\"font-semibold\">
                    {dtdcData.shipment_details.destination.city} - {dtdcData.shipment_details.destination.pincode}
                  </p>
                </div>
                <div>
                  <p className=\"text-sm text-gray-600\">Service Type</p>
                  <p className=\"font-semibold\">{dtdcData.shipment_details.service_name}</p>
                </div>
                <div>
                  <p className=\"text-sm text-gray-600\">Expected Delivery</p>
                  <p className=\"font-semibold\">{formatDate(dtdcData.shipment_details.expected_delivery)}</p>
                </div>
                {dtdcData.shipment_details.receiver_name && (
                  <div>
                    <p className=\"text-sm text-gray-600\">Receiver</p>
                    <p className=\"font-semibold\">{dtdcData.shipment_details.receiver_name}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tracking Timeline */}
        {dtdcData?.milestones && dtdcData.milestones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <MapPin className=\"w-5 h-5\" />
                Tracking Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className=\"space-y-4\">
                {dtdcData.milestones.map((milestone, index) => (
                  <div key={index} className=\"flex items-start gap-4\">
                    <div className=\"flex-shrink-0\">
                      {milestone.completed ? (
                        <CheckCircle className=\"w-6 h-6 text-green-600\" />
                      ) : (
                        <div className=\"w-6 h-6 rounded-full border-2 border-gray-300\" />
                      )}
                    </div>
                    <div className=\"flex-1 pb-4 border-l-2 border-gray-200 pl-4 ml-3\">
                      <p className=\"font-semibold text-gray-900\">{milestone.name}</p>
                      <p className=\"text-sm text-gray-600\">{milestone.location}</p>
                      <p className=\"text-xs text-gray-500 mt-1\">{formatDate(milestone.datetime)}</p>
                      {milestone.branch && (
                        <p className=\"text-xs text-gray-500\">{milestone.branch}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Tracking History */}
        {dtdcData?.detailed_tracking && dtdcData.detailed_tracking.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Clock className=\"w-5 h-5\" />
                Detailed Tracking History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className=\"space-y-3\">
                {dtdcData.detailed_tracking.map((event, index) => (
                  <div key={index} className=\"border-l-2 border-gray-200 pl-4 pb-3\">
                    <div className=\"flex justify-between items-start\">
                      <div>
                        <p className=\"font-semibold text-gray-900\">{event.description}</p>
                        <p className=\"text-sm text-gray-600\">{event.location} - {event.branch}</p>
                      </div>
                      <Badge variant=\"outline\" className=\"text-xs\">
                        {formatDate(event.timestamp)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shipping Address */}
        {orderData?.shipping_address && (
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Home className=\"w-5 h-5\" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className=\"text-gray-900\">{orderData.shipping_address.address1}</p>
              {orderData.shipping_address.address2 && (
                <p className=\"text-gray-900\">{orderData.shipping_address.address2}</p>
              )}
              <p className=\"text-gray-900\">
                {orderData.shipping_address.city}, {orderData.shipping_address.state} - {orderData.shipping_address.pincode}
              </p>
              <p className=\"text-gray-900\">{orderData.shipping_address.country}</p>
            </CardContent>
          </Card>
        )}

        {/* Contact Support */}
        <Card>
          <CardContent className=\"py-6\">
            <div className=\"text-center\">
              <p className=\"text-gray-600 mb-4\">Need help with your order?</p>
              <div className=\"flex justify-center gap-4\">
                <Button variant=\"outline\" className=\"flex items-center gap-2\">
                  <Phone className=\"w-4 h-4\" />
                  Call Support
                </Button>
                <Button variant=\"outline\" className=\"flex items-center gap-2\">
                  <Mail className=\"w-4 h-4\" />
                  Email Us
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Powered by */}
        <div className=\"text-center text-sm text-gray-500\">
          <p>Powered by Ashmiaa</p>
          <p className=\"mt-1\">© 2025 All rights reserved</p>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
