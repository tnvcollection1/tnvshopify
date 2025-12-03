import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MessageCircle,
  Send,
  RefreshCw,
  Search,
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  Check,
  Clock,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WhatsAppInbox = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      // This would fetch all messages or messages for a specific customer
      const response = await axios.get(`${API}/whatsapp/messages/all`);
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load message history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-gray-500" />;
      case "sent":
        return <Check className="w-3 h-3 text-gray-500" />;
      case "failed":
        return <Clock className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString();
  };

  const filteredMessages = messages.filter((msg) =>
    msg.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.from?.includes(searchQuery) ||
    msg.to?.includes(searchQuery)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <MessageCircle className="w-8 h-8 text-green-600" />
              WhatsApp Message History
            </h1>
            <p className="text-gray-600 mt-1">
              View all WhatsApp conversations and messages
            </p>
          </div>
          <Button
            onClick={fetchMessages}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search messages, phone numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-800">{messages.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-green-600">
                {messages.filter((m) => m.direction === "outgoing").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Received</p>
              <p className="text-2xl font-bold text-blue-600">
                {messages.filter((m) => m.direction === "incoming").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-purple-600">
                {messages.filter((m) => m.status === "delivered" || m.status === "read").length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-4">Loading messages...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 mx-auto text-gray-300" />
              <p className="text-gray-600 mt-4">No messages found</p>
              <p className="text-sm text-gray-500">
                Start sending WhatsApp messages from the Dispatch Tracker
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <div
                  key={message.message_id || message._id}
                  className={`p-4 rounded-lg border ${
                    message.direction === "outgoing"
                      ? "bg-green-50 border-green-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={message.direction === "outgoing" ? "default" : "secondary"}
                          className={
                            message.direction === "outgoing"
                              ? "bg-green-600"
                              : "bg-blue-600"
                          }
                        >
                          {message.direction === "outgoing" ? (
                            <><Send className="w-3 h-3 mr-1" /> Sent</>
                          ) : (
                            <><ArrowLeft className="w-3 h-3 mr-1" /> Received</>
                          )}
                        </Badge>
                        <span className="text-sm font-medium text-gray-700">
                          {message.direction === "outgoing" ? `To: ${message.to}` : `From: ${message.from}`}
                        </span>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                      {message.type && (
                        <Badge variant="outline" className="mt-2">
                          {message.type}
                        </Badge>
                      )}
                    </div>
                    <div className="ml-4 text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        {getStatusIcon(message.status)}
                        <span className="capitalize">{message.status || "pending"}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp || message.received_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppInbox;
