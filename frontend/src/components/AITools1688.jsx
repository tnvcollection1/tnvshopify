import React, { useState } from 'react';
import {
  Wand2,
  Languages,
  Image,
  Copy,
  Check,
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const AITools1688 = () => {
  // Translation state
  const [translateText, setTranslateText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateDirection, setTranslateDirection] = useState('zh_to_en'); // zh_to_en or en_to_zh
  
  // Batch translation state
  const [batchTexts, setBatchTexts] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  
  // AI Title generation state
  const [titleImageUrl, setTitleImageUrl] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [titleLoading, setTitleLoading] = useState(false);
  
  // Copy state
  const [copied, setCopied] = useState(null);
  
  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };
  
  // Single text translation
  const handleTranslate = async () => {
    if (!translateText.trim()) {
      toast.error('Please enter text to translate');
      return;
    }
    
    setTranslateLoading(true);
    try {
      const [sourceLang, targetLang] = translateDirection === 'zh_to_en' 
        ? ['CHINESE', 'ENGLISH'] 
        : ['ENGLISH', 'CHINESE'];
      
      const response = await axios.post(`${API}/api/1688/translate`, {
        text: translateText,
        source_language: sourceLang,
        target_language: targetLang
      });
      
      if (response.data.success) {
        setTranslatedText(response.data.translated_text);
        toast.success('Translation complete');
      } else {
        toast.error(response.data.error || 'Translation failed');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(error.response?.data?.detail || 'Translation failed');
    } finally {
      setTranslateLoading(false);
    }
  };
  
  // Batch translation
  const handleBatchTranslate = async () => {
    const texts = batchTexts.split('\n').filter(t => t.trim());
    if (texts.length === 0) {
      toast.error('Please enter texts to translate (one per line)');
      return;
    }
    
    setBatchLoading(true);
    try {
      const [sourceLang, targetLang] = translateDirection === 'zh_to_en' 
        ? ['CHINESE', 'ENGLISH'] 
        : ['ENGLISH', 'CHINESE'];
      
      const response = await axios.post(`${API}/api/1688/translate/batch`, {
        texts: texts,
        source_language: sourceLang,
        target_language: targetLang
      });
      
      if (response.data.success) {
        setBatchResults(response.data.translations || []);
        toast.success(`Translated ${response.data.translations?.length || 0} texts`);
      } else {
        toast.error(response.data.error || 'Batch translation failed');
      }
    } catch (error) {
      console.error('Batch translation error:', error);
      toast.error(error.response?.data?.detail || 'Batch translation failed');
    } finally {
      setBatchLoading(false);
    }
  };
  
  // AI Title generation
  const handleGenerateTitle = async () => {
    if (!titleImageUrl.trim()) {
      toast.error('Please enter a product image URL');
      return;
    }
    
    setTitleLoading(true);
    try {
      const response = await axios.post(`${API}/api/1688/ai/generate-title`, {
        image_url: titleImageUrl
      });
      
      if (response.data.success) {
        setGeneratedTitle(response.data.title);
        toast.success('Title generated successfully');
      } else {
        toast.error(response.data.error || 'Title generation failed');
      }
    } catch (error) {
      console.error('Title generation error:', error);
      toast.error(error.response?.data?.detail || 'Title generation failed');
    } finally {
      setTitleLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">1688 AI Tools</h1>
              <p className="text-sm text-gray-500">
                Translation & AI-powered title generation using 1688 APIs
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 gap-6">
        {/* Single Translation Card */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Languages className="w-5 h-5 text-blue-600" />
              Quick Translation
            </h2>
            <select
              className="text-sm border rounded px-2 py-1"
              value={translateDirection}
              onChange={(e) => setTranslateDirection(e.target.value)}
            >
              <option value="zh_to_en">Chinese → English</option>
              <option value="en_to_zh">English → Chinese</option>
            </select>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {translateDirection === 'zh_to_en' ? 'Chinese Text' : 'English Text'}
              </label>
              <textarea
                className="w-full border rounded-md px-3 py-2 min-h-[100px]"
                placeholder={translateDirection === 'zh_to_en' 
                  ? '输入中文文本...' 
                  : 'Enter English text...'}
                value={translateText}
                onChange={(e) => setTranslateText(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={handleTranslate} 
              disabled={translateLoading}
              className="w-full"
            >
              {translateLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Translate
            </Button>
            
            {translatedText && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">
                    {translateDirection === 'zh_to_en' ? 'English Translation' : 'Chinese Translation'}
                  </label>
                  <button
                    onClick={() => copyToClipboard(translatedText, 'single')}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {copied === 'single' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  {translatedText}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* AI Title Generation Card */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-600" />
              AI Title Generation
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Generate product titles from images using 1688 AI
            </p>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product Image URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/product-image.jpg"
                  value={titleImageUrl}
                  onChange={(e) => setTitleImageUrl(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter a direct link to a product image
              </p>
            </div>
            
            {titleImageUrl && (
              <div className="flex justify-center">
                <img 
                  src={titleImageUrl} 
                  alt="Product preview" 
                  className="max-h-32 rounded border object-contain"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
            
            <Button 
              onClick={handleGenerateTitle} 
              disabled={titleLoading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {titleLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Generate Title
            </Button>
            
            {generatedTitle && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Generated Title</label>
                  <button
                    onClick={() => copyToClipboard(generatedTitle, 'title')}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {copied === 'title' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                  {generatedTitle}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Batch Translation Card - Full Width */}
        <div className="col-span-2 bg-white rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-600" />
              Batch Translation
            </h2>
            <span className="text-xs text-gray-500">
              Enter one text per line
            </span>
          </div>
          
          <div className="p-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Input Texts ({translateDirection === 'zh_to_en' ? 'Chinese' : 'English'})
              </label>
              <textarea
                className="w-full border rounded-md px-3 py-2 min-h-[200px] font-mono text-sm"
                placeholder={translateDirection === 'zh_to_en' 
                  ? '新款女装\n夏季连衣裙\n休闲运动鞋' 
                  : 'New women\'s clothing\nSummer dress\nCasual sneakers'}
                value={batchTexts}
                onChange={(e) => setBatchTexts(e.target.value)}
              />
              <div className="mt-2">
                <Button 
                  onClick={handleBatchTranslate} 
                  disabled={batchLoading}
                  className="w-full"
                >
                  {batchLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Languages className="w-4 h-4 mr-2" />
                  )}
                  Translate All ({batchTexts.split('\n').filter(t => t.trim()).length} texts)
                </Button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Translations ({translateDirection === 'zh_to_en' ? 'English' : 'Chinese'})
              </label>
              <div className="border rounded-md min-h-[200px] max-h-[200px] overflow-y-auto">
                {batchResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    Translations will appear here
                  </div>
                ) : (
                  <div className="divide-y">
                    {batchResults.map((item, idx) => (
                      <div key={idx} className="p-2 hover:bg-gray-50 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-400 truncate">{item.original}</div>
                          <div className="text-sm font-medium">{item.translated}</div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.translated, `batch-${idx}`)}
                          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                          {copied === `batch-${idx}` ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {batchResults.length > 0 && (
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allTranslations = batchResults.map(r => r.translated).join('\n');
                      copyToClipboard(allTranslations, 'all-batch');
                    }}
                    className="w-full"
                  >
                    {copied === 'all-batch' ? (
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy All Translations
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITools1688;
