import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Sparkles,
  Wand2,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Languages,
  Tag,
  FileText,
  List,
  Globe,
  ChevronRight,
  ArrowRight,
  History,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Copy button component
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2">
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </Button>
  );
};

// Generated Content Display
const GeneratedContentCard = ({ content, originalTitle }) => {
  if (!content) return null;
  
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI Generated Content
        </CardTitle>
        {originalTitle && (
          <CardDescription className="text-xs">
            Original: {originalTitle}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Optimized Title */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase">Optimized Title</span>
            <CopyButton text={content.optimized_title} />
          </div>
          <p className="font-semibold text-gray-900">{content.optimized_title}</p>
        </div>
        
        {/* SEO Title */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase">SEO Title</span>
            <CopyButton text={content.seo_title} />
          </div>
          <p className="text-gray-800">{content.seo_title}</p>
        </div>
        
        {/* Selling Points */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase">Selling Points</span>
            <CopyButton text={content.selling_points?.join('\n• ')} />
          </div>
          <ul className="space-y-1">
            {content.selling_points?.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <ChevronRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Description */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase">Product Description</span>
            <CopyButton text={content.product_description} />
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{content.product_description}</p>
        </div>
        
        {/* Tags */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase">SEO Tags</span>
            <CopyButton text={content.tags?.join(', ')} />
          </div>
          <div className="flex flex-wrap gap-1">
            {content.tags?.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
const AIProductEditor = () => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [targetMarket, setTargetMarket] = useState('International');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Translation state
  const [translateText, setTranslateText] = useState('');
  const [translatedResult, setTranslatedResult] = useState('');
  const [translating, setTranslating] = useState(false);
  
  // Quick title improvement
  const [quickTitle, setQuickTitle] = useState('');
  const [improvedTitle, setImprovedTitle] = useState('');
  const [improvingTitle, setImprovingTitle] = useState(false);

  // Fetch history
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/api/ai-product/history?limit=10`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Generate content
  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a product title');
      return;
    }
    
    setLoading(true);
    setGeneratedContent(null);
    
    try {
      const res = await fetch(`${API}/api/ai-product/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          price: price ? parseFloat(price) : null,
          target_language: targetLanguage,
          target_market: targetMarket,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setGeneratedContent(data.content);
        toast.success('Content generated successfully!');
        fetchHistory();
      } else {
        toast.error(data.detail || 'Generation failed');
      }
    } catch (e) {
      toast.error('Failed to generate content');
      console.error('Generation error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Translate text
  const handleTranslate = async () => {
    if (!translateText.trim()) {
      toast.error('Please enter text to translate');
      return;
    }
    
    setTranslating(true);
    
    try {
      const res = await fetch(`${API}/api/ai-product/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: translateText.trim(),
          source_language: 'Chinese',
          target_language: targetLanguage,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setTranslatedResult(data.translated);
        toast.success('Translation complete!');
      } else {
        toast.error(data.detail || 'Translation failed');
      }
    } catch (e) {
      toast.error('Failed to translate');
    } finally {
      setTranslating(false);
    }
  };

  // Quick title improvement
  const handleImproveTitle = async () => {
    if (!quickTitle.trim()) {
      toast.error('Please enter a title to improve');
      return;
    }
    
    setImprovingTitle(true);
    
    try {
      const res = await fetch(`${API}/api/ai-product/improve-title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickTitle.trim(),
          target_language: targetLanguage,
          max_length: 80,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setImprovedTitle(data.improved);
        toast.success('Title improved!');
      } else {
        toast.error(data.detail || 'Failed to improve title');
      }
    } catch (e) {
      toast.error('Failed to improve title');
    } finally {
      setImprovingTitle(false);
    }
  };

  // Load from history
  const loadFromHistory = (item) => {
    setTitle(item.input?.title || '');
    setDescription(item.input?.description || '');
    setCategory(item.input?.category || '');
    setPrice(item.input?.price?.toString() || '');
    setGeneratedContent(item.output);
    setShowHistory(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="w-7 h-7 text-purple-500" />
            AI Product Editor
          </h1>
          <p className="text-gray-500 mt-1">
            Generate optimized titles, descriptions, and selling points using AI
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowHistory(!showHistory)}
          className="gap-2"
        >
          <History className="w-4 h-4" />
          History
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input Form */}
        <div className="space-y-6">
          {/* Main Generation Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Generate Product Content
              </CardTitle>
              <CardDescription>
                Enter your product details to generate optimized content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Product Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter product title (Chinese or English)"
                  className="font-mono"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product description or key features..."
                  rows={3}
                />
              </div>
              
              {/* Category & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Shoes, Electronics"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Price (¥)</label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              {/* Target Language & Market */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Target Language</label>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Chinese">Chinese (中文)</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Arabic">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Target Market</label>
                  <Select value={targetMarket} onValueChange={setTargetMarket}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="International">International</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="EU">European Union</SelectItem>
                      <SelectItem value="Middle East">Middle East</SelectItem>
                      <SelectItem value="Asia">Asia Pacific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Generate Button */}
              <Button 
                onClick={handleGenerate} 
                disabled={loading || !title.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Title Improvement */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-500" />
                Quick Title Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Paste a title to improve..."
              />
              {improvedTitle && (
                <div className="bg-green-50 rounded p-2 flex items-center justify-between">
                  <span className="text-sm text-green-800">{improvedTitle}</span>
                  <CopyButton text={improvedTitle} />
                </div>
              )}
              <Button 
                onClick={handleImproveTitle}
                disabled={improvingTitle || !quickTitle.trim()}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {improvingTitle ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Improve Title
              </Button>
            </CardContent>
          </Card>

          {/* Translation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Languages className="w-4 h-4 text-green-500" />
                Quick Translation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={translateText}
                onChange={(e) => setTranslateText(e.target.value)}
                placeholder="Paste Chinese text to translate..."
                rows={2}
              />
              {translatedResult && (
                <div className="bg-blue-50 rounded p-2 flex items-start justify-between gap-2">
                  <span className="text-sm text-blue-800">{translatedResult}</span>
                  <CopyButton text={translatedResult} />
                </div>
              )}
              <Button 
                onClick={handleTranslate}
                disabled={translating || !translateText.trim()}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {translating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Translate to {targetLanguage}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Generated Content & History */}
        <div className="space-y-6">
          {/* Generated Content */}
          {generatedContent ? (
            <GeneratedContentCard content={generatedContent} originalTitle={title} />
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center text-gray-400">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Generated content will appear here</p>
                <p className="text-sm mt-1">Enter product details and click Generate</p>
              </CardContent>
            </Card>
          )}

          {/* History Panel */}
          {showHistory && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Recent Generations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {history.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => loadFromHistory(item)}
                        className="p-2 rounded bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <p className="text-sm font-medium truncate">
                          {item.input?.title || 'Untitled'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No history yet
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIProductEditor;
