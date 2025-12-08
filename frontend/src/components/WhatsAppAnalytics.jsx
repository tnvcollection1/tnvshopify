import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, MessageCircle, Send, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const WhatsAppAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [timePeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/whatsapp/analytics/overview?days=${timePeriod}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            WhatsApp Analytics
          </h1>
          <p className="text-gray-600 mt-1">Track your WhatsApp messaging performance</p>
        </div>
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {analytics && (
        <>
          {/* Message Stats */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Message Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <MessageCircle className="w-8 h-8 text-blue-600 mb-2" />
                  <div className="text-3xl font-bold">{analytics.messages.total}</div>
                  <p className="text-sm text-gray-600 mt-1">Total Messages</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Send className="w-8 h-8 text-green-600 mb-2" />
                  <div className="text-3xl font-bold text-green-600">{analytics.messages.sent}</div>
                  <p className="text-sm text-gray-600 mt-1">Sent</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <CheckCircle className="w-8 h-8 text-purple-600 mb-2" />
                  <div className="text-3xl font-bold text-purple-600">{analytics.messages.received}</div>
                  <p className="text-sm text-gray-600 mt-1">Received</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <XCircle className="w-8 h-8 text-red-600 mb-2" />
                  <div className="text-3xl font-bold text-red-600">{analytics.messages.failed}</div>
                  <p className="text-sm text-gray-600 mt-1">Failed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                  <div className="text-3xl font-bold text-blue-600">{analytics.messages.success_rate}%</div>
                  <p className="text-sm text-gray-600 mt-1">Success Rate</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Campaign Stats */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Campaign Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold">{analytics.campaigns.total}</div>
                  <p className="text-sm text-gray-600 mt-1">Total Campaigns</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-blue-600">{analytics.campaigns.active}</div>
                  <p className="text-sm text-gray-600 mt-1">Active Campaigns</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-green-600">
                    {analytics.campaigns.total - analytics.campaigns.active}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Completed</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Conversation Stats */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Conversations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold">{analytics.conversations.total}</div>
                  <p className="text-sm text-gray-600 mt-1">Total Conversations</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-green-600">{analytics.conversations.open}</div>
                  <p className="text-sm text-gray-600 mt-1">Open Conversations</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">High Success Rate</p>
                    <p className="text-sm text-green-700">
                      Your message delivery rate is {analytics.messages.success_rate}%, which is excellent!
                    </p>
                  </div>
                </div>
                
                {analytics.conversations.open > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
                    <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-800">Active Conversations</p>
                      <p className="text-sm text-blue-700">
                        You have {analytics.conversations.open} open conversations waiting for response.
                      </p>
                    </div>
                  </div>
                )}

                {analytics.campaigns.active > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded">
                    <Send className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-purple-800">Campaigns in Progress</p>
                      <p className="text-sm text-purple-700">
                        {analytics.campaigns.active} campaign(s) are currently being sent.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default WhatsAppAnalytics;
