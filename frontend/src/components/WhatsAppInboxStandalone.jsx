import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, Send, User, Clock, CheckCheck, Search, Phone } from 'lucide-react';
import { toast, Toaster } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const WhatsAppInboxStandalone = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.phone);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/whatsapp/conversations`);
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (phone) => {
    try {
      const response = await axios.get(`${API_URL}/api/whatsapp/messages/${phone}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/whatsapp/send`, {
        phone: selectedConversation.phone,
        message: newMessage
      });
      
      setNewMessage('');
      toast.success('Message sent!');
      
      await fetchMessages(selectedConversation.phone);
      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations.filter(conv => 
    conv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.phone?.includes(searchTerm)
  );

  return (
    <div className="h-screen bg-white flex flex-col">
      <Toaster position="top-right" />
      
      {/* Header - Clean WhatsApp Style */}
      <div className="bg-[#008069] text-white p-4 shadow-md flex items-center gap-3">
        <MessageCircle className="w-8 h-8" />
        <div>
          <h1 className="text-xl font-semibold">WhatsApp Business</h1>
          <p className="text-xs opacity-90">Messaging Platform</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-[400px] border-r border-gray-200 flex flex-col bg-white">
          {/* Search */}
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#008069]"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto bg-white">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.phone}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedConversation?.phone === conv.phone
                      ? 'bg-gray-100'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conv.customer_name || 'Unknown'}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTime(conv.last_message_time)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate flex-1">
                          {conv.last_message || 'No messages'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-[#25D366] text-white text-xs rounded-full flex-shrink-0 font-semibold">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#efeae2]">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-[#f0f2f5] border-b border-gray-300 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedConversation.customer_name || 'Unknown'}
                  </h2>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Phone className="w-3 h-3" />
                    <span>{selectedConversation.phone}</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23efeae2\'/%3E%3Cpath d=\'M10 10h5v5h-5zM85 10h5v5h-5zM10 85h5v5h-5zM85 85h5v5h-5z\' fill=\'%23dfd3c3\' fill-opacity=\'.1\'/%3E%3C/svg%3E")'
              }}>
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <MessageCircle className="w-16 h-16 mx-auto mb-3 opacity-20" />
                      <p>No messages yet</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md px-3 py-2 rounded-lg shadow-sm ${
                          msg.direction === 'outbound'
                            ? 'bg-[#d9fdd3]'
                            : 'bg-white'
                        }`}
                      >
                        <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <span className="text-xs text-gray-600">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {msg.direction === 'outbound' && (
                            <CheckCheck className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="bg-[#f0f2f5] p-3">
                <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2">
                  <input
                    type="text"
                    placeholder="Type a message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="flex-1 text-gray-900 placeholder-gray-500 focus:outline-none"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !newMessage.trim()}
                    className="p-2 text-[#008069] hover:text-[#006654] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-20 h-20 mx-auto mb-4 opacity-20 text-gray-400" />
                <h2 className="text-2xl font-light text-gray-600 mb-2">WhatsApp Business</h2>
                <p className="text-gray-500">Select a chat to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppInboxStandalone;
