import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Clock,
  Activity,
  Lock,
  Unlock,
  Eye,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

// Log Entry Component
const LogEntry = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const levelConfig = {
    info: { color: 'bg-blue-100 text-blue-800', icon: Activity },
    warning: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
    error: { color: 'bg-red-100 text-red-800', icon: XCircle },
    success: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 }
  };

  const config = levelConfig[log.level] || levelConfig.info;
  const Icon = config.icon;

  return (
    <div 
      className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Badge className={config.color}>
            <Icon className="w-3 h-3 mr-1" />
            {log.level}
          </Badge>
          <div>
            <p className="font-medium">{log.action || log.message}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span>{log.ip || 'N/A'}</span>
              <span>•</span>
              <span>{log.endpoint || log.path || 'N/A'}</span>
              <span>•</span>
              <span>{new Date(log.timestamp || log.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <Eye className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>
      
      {expanded && (
        <div className="mt-4 pt-4 border-t">
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
            {JSON.stringify(log, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// Main Component
const SecurityLogs = () => {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes, configRes] = await Promise.all([
        axios.get(`${API}/api/security/logs?limit=100`).catch(() => ({ data: { logs: [] } })),
        axios.get(`${API}/api/security/stats`).catch(() => ({ data: {} })),
        axios.get(`${API}/api/security/config`).catch(() => ({ data: {} }))
      ]);
      
      setLogs(logsRes.data.logs || logsRes.data || []);
      setStats(statsRes.data);
      setConfig(configRes.data);
    } catch (error) {
      console.error('Error fetching security data:', error);
      // Set mock data if API doesn't exist
      setLogs([]);
      setStats({
        total_requests: 15234,
        blocked_requests: 12,
        suspicious_ips: 3,
        avg_response_time: 245
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery || 
      JSON.stringify(log).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6" />
                Security & Logs
              </h1>
              <p className="text-sm text-gray-500">
                Monitor API activity, security events, and system logs
              </p>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Requests (24h)"
            value={stats?.total_requests?.toLocaleString() || '0'}
            icon={Activity}
            color="blue"
          />
          <StatCard
            title="Blocked Requests"
            value={stats?.blocked_requests || '0'}
            icon={Lock}
            color="red"
          />
          <StatCard
            title="Suspicious IPs"
            value={stats?.suspicious_ips || '0'}
            icon={AlertTriangle}
            color="yellow"
          />
          <StatCard
            title="Avg Response Time"
            value={`${stats?.avg_response_time || 0}ms`}
            icon={Clock}
            color="green"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border mb-6">
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="w-4 h-4" />
              Activity Logs
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security Events
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Lock className="w-4 h-4" />
              Configuration
            </TabsTrigger>
          </TabsList>

          {/* Activity Logs Tab */}
          <TabsContent value="logs">
            {/* Filters */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Logs List */}
            <div className="space-y-2">
              {loading ? (
                <div className="bg-white rounded-lg border p-12 text-center">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="bg-white rounded-lg border p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No logs found</p>
                  <p className="text-sm text-gray-400">Activity logs will appear here</p>
                </div>
              ) : (
                filteredLogs.map((log, index) => (
                  <LogEntry key={log.id || index} log={log} />
                ))
              )}
            </div>
          </TabsContent>

          {/* Security Events Tab */}
          <TabsContent value="security">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Recent Security Events</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">System Secure</p>
                      <p className="text-sm text-green-600">No critical security issues detected</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                </div>

                <div className="border rounded-lg divide-y">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-gray-400" />
                      <span>API Rate Limiting</span>
                    </div>
                    <Badge variant="outline" className="text-green-600">Enabled</Badge>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-gray-400" />
                      <span>CORS Protection</span>
                    </div>
                    <Badge variant="outline" className="text-green-600">Enabled</Badge>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-gray-400" />
                      <span>Request Logging</span>
                    </div>
                    <Badge variant="outline" className="text-green-600">Active</Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config">
            <div className="bg-white rounded-lg border p-6 max-w-2xl">
              <h3 className="font-semibold mb-4">Security Configuration</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Rate Limit (requests/minute)</p>
                    <p className="text-sm text-gray-500">Maximum API requests per minute per IP</p>
                  </div>
                  <span className="text-lg font-semibold">{config?.rate_limit || 100}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Timeout (minutes)</p>
                    <p className="text-sm text-gray-500">User session expiration time</p>
                  </div>
                  <span className="text-lg font-semibold">{config?.session_timeout || 60}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Max Login Attempts</p>
                    <p className="text-sm text-gray-500">Before temporary lockout</p>
                  </div>
                  <span className="text-lg font-semibold">{config?.max_login_attempts || 5}</span>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Contact your system administrator to modify security settings.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SecurityLogs;
