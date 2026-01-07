import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Upload,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Image,
  DollarSign,
  BarChart3,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  ImagePlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// ==================== Image Upload Dialog ====================
const ImageUploadDialog = ({ isOpen, onClose, onAnalysisComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({
    product_id: '',
    product_name: '',
    your_price: '',
    category: 'general'
  });
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large (max 10MB)');
      return;
    }
    
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !form.product_name || !form.your_price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('product_id', form.product_id || `prod_${Date.now()}`);
      formData.append('product_name', form.product_name);
      formData.append('your_price', form.your_price);
      formData.append('category', form.category);

      const response = await axios.post(
        `${API}/api/competitor/analyze-image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
      );

      toast.success(`Found ${response.data.competitor_count} competitors!`);
      onAnalysisComplete(response.data);
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setForm({ product_id: '', product_name: '', your_price: '', category: 'general' });
      onClose();
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error.response?.data?.detail || 'Failed to analyze image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Analyze Product for Competitors</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${uploading ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            {previewUrl ? (
              <div className="space-y-2">
                <img src={previewUrl} alt="Preview" className="max-h-32 mx-auto rounded" />
                <p className="text-sm text-gray-600">{selectedFile?.name}</p>
              </div>
            ) : (
              <div>
                <ImagePlus className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="font-medium text-gray-600">Drop product image here</p>
                <p className="text-sm text-gray-400">or click to select (max 10MB)</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium">Product Name *</label>
              <Input
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                placeholder="e.g., Blue Wireless Headphones"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Your Price (₹) *</label>
              <Input
                type="number"
                value={form.your_price}
                onChange={(e) => setForm({ ...form, your_price: e.target.value })}
                placeholder="1999"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="general">General</option>
                <option value="electronics">Electronics</option>
                <option value="fashion">Fashion</option>
                <option value="home">Home & Living</option>
                <option value="beauty">Beauty</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={uploading || !selectedFile}>
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" /> Find Competitors</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== Analysis Results Card ====================
const AnalysisResultsCard = ({ analysis, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [fullAnalysis, setFullAnalysis] = useState(null);

  const loadFullAnalysis = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/competitor/analysis/${analysis.analysis_id}`);
      setFullAnalysis(response.data.analysis);
    } catch (error) {
      toast.error('Failed to load analysis details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (analysis.analysis_id) {
      loadFullAnalysis();
    }
  }, [analysis.analysis_id]);

  const priceAnalysis = fullAnalysis?.price_analysis;
  const competitorPrices = fullAnalysis?.competitor_prices || [];

  const getPriceIndicator = () => {
    if (!priceAnalysis) return null;
    const diff = priceAnalysis.price_difference_percent;
    if (Math.abs(diff) < 10) return { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Competitive' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-100', label: 'Above Market' };
    return { icon: TrendingDown, color: 'text-green-600', bg: 'bg-green-100', label: 'Below Market' };
  };

  const indicator = getPriceIndicator();

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{analysis.product_name}</h3>
          <p className="text-sm text-gray-500">
            {analysis.competitor_count} competitors found
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadFullAnalysis} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Price Comparison */}
      <div className="p-4 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Your Price</p>
          <p className="text-2xl font-bold text-blue-600">₹{analysis.your_price?.toLocaleString()}</p>
        </div>
        
        {priceAnalysis ? (
          <>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Avg Competitor</p>
              <p className="text-2xl font-bold text-gray-700">₹{priceAnalysis.avg_competitor_price?.toLocaleString()}</p>
            </div>
            <div className={`text-center p-3 ${indicator?.bg} rounded-lg`}>
              <p className="text-xs text-gray-600 mb-1">Difference</p>
              <div className="flex items-center justify-center gap-1">
                {indicator && <indicator.icon className={`w-5 h-5 ${indicator.color}`} />}
                <p className={`text-xl font-bold ${indicator?.color}`}>
                  {priceAnalysis.price_difference_percent > 0 ? '+' : ''}{priceAnalysis.price_difference_percent}%
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-2 flex items-center justify-center text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Extracting prices...
          </div>
        )}
      </div>

      {/* Competitor List */}
      {competitorPrices.length > 0 && (
        <div className="p-4 border-t">
          <h4 className="font-medium mb-3">Competitor Prices</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {competitorPrices.map((cp, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex-1 truncate">
                  <a
                    href={cp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {cp.domain}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-right">
                  {cp.prices && cp.prices.length > 0 ? (
                    <span className="font-semibold">
                      ₹{Math.min(...cp.prices).toLocaleString()}
                      {cp.prices.length > 1 && ` - ₹${Math.max(...cp.prices).toLocaleString()}`}
                    </span>
                  ) : (
                    <span className="text-gray-400">No price found</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Web Entities */}
      {analysis.web_entities && analysis.web_entities.length > 0 && (
        <div className="p-4 border-t">
          <h4 className="font-medium mb-2">Related Keywords</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.web_entities.slice(0, 8).map((entity, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs">
                {entity.description}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Main Dashboard ====================
const CompetitorDashboard = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [analysesRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/competitor/analyses?limit=20`),
        axios.get(`${API}/api/competitor/dashboard-stats`)
      ]);
      setAnalyses(analysesRes.data.analyses || []);
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAnalysisComplete = (result) => {
    setCurrentAnalysis(result);
    loadData();
  };

  const handleDelete = async (analysisId) => {
    if (!window.confirm('Delete this analysis?')) return;
    try {
      await axios.delete(`${API}/api/competitor/analysis/${analysisId}`);
      toast.success('Analysis deleted');
      loadData();
      if (currentAnalysis?.analysis_id === analysisId) {
        setCurrentAnalysis(null);
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Competitor Price Dashboard</h1>
              <p className="text-sm text-gray-500">
                Analyze product images to discover competitor pricing
              </p>
            </div>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Analyze Product
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Analyses</p>
                  <p className="text-2xl font-bold">{stats.total_analyses}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">With Prices</p>
                  <p className="text-2xl font-bold">{stats.analyses_with_prices}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Search className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Competitors</p>
                  <p className="text-2xl font-bold">{stats.avg_competitors_found}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">API Status</p>
                  <p className="text-sm font-medium text-yellow-600">
                    {process.env.GOOGLE_VISION_API_KEY ? 'Active' : 'Not Configured'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-6">
          {/* Current Analysis */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Current Analysis</h2>
            {currentAnalysis ? (
              <AnalysisResultsCard analysis={currentAnalysis} onRefresh={loadData} />
            ) : (
              <div className="bg-white rounded-lg border p-12 text-center">
                <Image className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">No analysis selected</p>
                <Button onClick={() => setShowUpload(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Product Image
                </Button>
              </div>
            )}
          </div>

          {/* Analysis History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Analysis History</h2>
              <Button variant="ghost" size="sm" onClick={loadData}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            <div className="bg-white rounded-lg border">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : analyses.length > 0 ? (
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {analyses.map((analysis) => (
                    <div
                      key={analysis.analysis_id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        currentAnalysis?.analysis_id === analysis.analysis_id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setCurrentAnalysis(analysis)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium truncate">{analysis.product_name}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span>₹{analysis.your_price?.toLocaleString()}</span>
                            <span>•</span>
                            <span>{analysis.competitor_pages?.length || 0} competitors</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setCurrentAnalysis(analysis); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => { e.stopPropagation(); handleDelete(analysis.analysis_id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>No analyses yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      <ImageUploadDialog
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onAnalysisComplete={handleAnalysisComplete}
      />
    </div>
  );
};

export default CompetitorDashboard;
