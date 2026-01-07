import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Play,
  Pause,
  Settings,
  History,
  RefreshCw,
  Calendar,
  Bell,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const ScheduledPriceChecks = () => {
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    enabled: false,
    frequency: 'daily',
    hour: 2,
    day_of_week: 0,
    products_per_run: 50,
    priority_mode: 'not_analyzed',
    auto_alert: true
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, historyRes, statusRes] = await Promise.all([
        axios.get(`${API}/api/competitor/schedule/settings`),
        axios.get(`${API}/api/competitor/schedule/history?limit=10`),
        axios.get(`${API}/api/competitor/schedule/status`)
      ]);

      if (settingsRes.data.success) {
        const s = settingsRes.data.settings;
        setSettings(s);
        setFormData({
          enabled: s.enabled || false,
          frequency: s.frequency || 'daily',
          hour: s.hour || 2,
          day_of_week: s.day_of_week || 0,
          products_per_run: s.products_per_run || 50,
          priority_mode: s.priority_mode || 'not_analyzed',
          auto_alert: s.auto_alert !== false
        });
      }

      if (historyRes.data.success) {
        setHistory(historyRes.data.history || []);
      }

      if (statusRes.data.success) {
        setStatus(statusRes.data);
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
      toast.error('Failed to load schedule settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await axios.post(`${API}/api/competitor/schedule/settings`, formData);
      if (response.data.success) {
        toast.success(response.data.message);
        setSettings(response.data.settings);
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const response = await axios.post(`${API}/api/competitor/schedule/run-now`);
      if (response.data.success) {
        toast.success('Scheduled check started');
        // Refresh data after a delay
        setTimeout(loadData, 5000);
      }
    } catch (error) {
      toast.error('Failed to start scheduled check');
    } finally {
      setRunning(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f1f1] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Scheduled Price Checks</h1>
              <p className="text-sm text-gray-500">
                Automatically monitor competitor prices on a schedule
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={runNow} disabled={running}>
                {running ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Schedule Settings
              </h2>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium">Automatic Price Checks</h3>
                  <p className="text-sm text-gray-500">
                    {formData.enabled 
                      ? 'Scheduled checks are active' 
                      : 'Enable to automatically check competitor prices'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  >
                    <option value="hourly">Every Hour</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Time (Hour)</label>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={formData.hour}
                    onChange={(e) => setFormData({ ...formData, hour: parseInt(e.target.value) })}
                  >
                    {[...Array(24)].map((_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00 {i < 12 ? 'AM' : 'PM'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Day of Week</label>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                  >
                    <option value={0}>Monday</option>
                    <option value={1}>Tuesday</option>
                    <option value={2}>Wednesday</option>
                    <option value={3}>Thursday</option>
                    <option value={4}>Friday</option>
                    <option value={5}>Saturday</option>
                    <option value={6}>Sunday</option>
                  </select>
                </div>
              )}

              {/* Advanced Settings */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  Advanced Settings
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Products per Run</label>
                        <Input
                          type="number"
                          min={10}
                          max={200}
                          value={formData.products_per_run}
                          onChange={(e) => setFormData({ ...formData, products_per_run: parseInt(e.target.value) })}
                        />
                        <p className="text-xs text-gray-500 mt-1">10-200 products per scheduled run</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Priority Mode</label>
                        <select
                          className="w-full border rounded-md px-3 py-2"
                          value={formData.priority_mode}
                          onChange={(e) => setFormData({ ...formData, priority_mode: e.target.value })}
                        >
                          <option value="not_analyzed">Not Analyzed First</option>
                          <option value="oldest">Oldest Analysis First</option>
                          <option value="random">Random</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="auto_alert"
                        checked={formData.auto_alert}
                        onChange={(e) => setFormData({ ...formData, auto_alert: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="auto_alert" className="text-sm">
                        <span className="font-medium">Auto-create price alerts</span>
                        <span className="text-gray-500 ml-1">when competitors are cheaper</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t">
                <Button onClick={saveSettings} disabled={saving} className="w-full">
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Panel */}
        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Status
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  settings?.enabled 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {settings?.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Run</span>
                <span className="text-sm font-medium">
                  {formatDate(settings?.last_run)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Next Run</span>
                <span className="text-sm font-medium">
                  {settings?.enabled ? formatDate(settings?.next_run) : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Run History */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Runs
              </h2>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No runs yet
                </div>
              ) : (
                history.map((run, idx) => (
                  <div key={run.run_id || idx} className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {new Date(run.started_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDuration(run.duration_seconds)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>{run.total_products_checked || 0} products</span>
                      <span>{run.total_alerts_triggered || 0} alerts</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduledPriceChecks;
