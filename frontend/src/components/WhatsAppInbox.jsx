import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, Send, User, Phone, Package, Search, Filter, CheckCheck, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, open, resolved

  useEffect(() => {
    fetchConversations();
  }, [filterStatus]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await axios.get(`${API_URL}/api/whatsapp/conversations`, { params });
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationHistory = async (phone) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/whatsapp/conversations/${phone}`);
      setMessages(response.data.messages || []);
      setCustomerInfo(response.data.customer);
      
      // Find and select conversation
      const conv = conversations.find(c => c.phone === phone);
      setSelectedConversation(conv);
    } catch (error) {
      console.error('Error fetching conversation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;

    try {
      setSending(true);
      await axios.post(`${API_URL}/api/whatsapp/conversations/reply`, {
        conversation_id: selectedConversation.id,
        message: replyText,
        agent_id: localStorage.getItem('agent_id')
      });

      // Add message to UI immediately
      const newMessage = {
        id: Date.now().toString(),
        text: replyText,
        direction: 'outbound',
        sent_at: new Date().toISOString(),
        status: 'sent'
      };
      setMessages([...messages, newMessage]);
      setReplyText('');
      
      // Refresh conversations to update last message
      fetchConversations();
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send message: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations.filter(conv => 
    searchQuery === '' || 
    conv.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.phone?.includes(searchQuery)
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-white">
        <div className="p-4 border-b">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-green-600" />
            WhatsApp Inbox
          </h2>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'open' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('open')}
            >
              Open
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'resolved' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('resolved')}
            >
              Resolved
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          {loading && conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => fetchConversationHistory(conv.phone)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                  selectedConversation?.id === conv.id ? 'bg-green-50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{conv.contact_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{conv.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatTimestamp(conv.last_message_at)}</p>
                    {conv.unread_count > 0 && (
                      <Badge variant="default" className="mt-1 bg-green-600">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 truncate">{conv.last_message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={conv.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                    {conv.status}
                  </Badge>
                  {conv.last_message_from === 'customer' && (
                    <Badge variant="outline" className="text-xs">New</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedConversation.contact_name || 'Unknown'}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedConversation.phone}
                  </p>
                </div>
              </div>
              
              {customerInfo && (
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Orders</p>
                    <p className="font-semibold">{customerInfo.order_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Spent</p>
                    <p className="font-semibold">Rs {customerInfo.total_spent || 0}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">No messages yet</div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={msg.id || idx}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.direction === 'outbound'
                            ? 'bg-green-600 text-white'
                            : 'bg-white border'
                        }`}
                      >
                        {msg.type === 'template' && (
                          <p className="text-xs opacity-75 mb-1">
                            📋 Template: {msg.template_name}
                          </p>
                        )}
                        <p className="break-words">{msg.text}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          msg.direction === 'outbound' ? 'text-white opacity-75' : 'text-gray-500'
                        }`}>
                          <span>{formatTimestamp(msg.sent_at || msg.received_at)}</span>
                          {msg.direction === 'outbound' && msg.status === 'sent' && (
                            <CheckCheck className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Reply Input */}
            <div className="p-4 bg-white border-t">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  className="resize-none"
                  rows={2}
                />
                <Button
                  onClick={sendReply}
                  disabled={!replyText.trim() || sending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {sending ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: You can only send text messages within 24 hours of customer's last message
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Select a conversation to start</p>
            </div>
          </div>
        )}
      </div>

      {/* Customer Info Sidebar */}
      {selectedConversation && customerInfo && (
        <div className="w-80 border-l bg-white p-4">
          <h3 className="font-semibold mb-4">Customer Information</h3>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{customerInfo.first_name} {customerInfo.last_name}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-sm">{customerInfo.email || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-sm">{customerInfo.phone}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Store</p>
              <p className="text-sm">{customerInfo.store_name}</p>
            </div>
            
            <div className="pt-3 border-t">
              <p className="text-sm text-gray-500 mb-2">Order History</p>
              <div className="flex gap-4">
                <div>
                  <p className="text-2xl font-bold">{customerInfo.order_count}</p>
                  <p className="text-xs text-gray-500">Orders</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">Rs {customerInfo.total_spent || 0}</p>
                  <p className="text-xs text-gray-500">Total Spent</p>
                </div>
              </div>
            </div>
            
            {customerInfo.last_order_date && (
              <div>
                <p className="text-sm text-gray-500">Last Order</p>
                <p className="text-sm">{new Date(customerInfo.last_order_date).toLocaleDateString()}</p>
              </div>
            )}
            
            {customerInfo.order_number && (
              <div>
                <p className="text-sm text-gray-500">Latest Order #</p>
                <p className="text-sm font-mono">{customerInfo.order_number}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppInbox;
