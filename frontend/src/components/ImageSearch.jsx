import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Search,
  Image,
  Store,
  Loader2,
  ExternalLink,
  Upload,
  Filter,
  ChevronDown,
  ChevronUp,
  Package,
  Factory,
  Truck,
  Star,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const ImageSearch = () => {
  const [activeTab, setActiveTab] = useState('image'); // image, keyword, shop
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  
  // Image search state
  const [imageUrl, setImageUrl] = useState('');
  const [convertedImageUrl, setConvertedImageUrl] = useState('');
  const [converting, setConverting] = useState(false);
  
  // Keyword search state
  const [keyword, setKeyword] = useState('');
  
  // Shop search state
  const [memberId, setMemberId] = useState('');
  const [shopInfo, setShopInfo] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    sort: 'default',
    priceStart: '',
    priceEnd: '',
    supportDropshipping: false,
    isFactory: false,
    verifiedSupplier: false,
    freeShipping: false,
    newArrival: false,
  });

  // Check API balance on mount
  const checkApiBalance = async () => {
    try {
      const res = await fetch(`${API}/api/tmapi/balance`);
      const data = await res.json();
      setApiStatus(data);
    } catch (error) {
      console.error('Failed to check API balance:', error);
    }
  };

  React.useEffect(() => {
    checkApiBalance();
  }, []);

  // Convert external image URL
  const convertImageUrl = async () => {
    if (!imageUrl.trim()) {
      toast.error('Please enter an image URL');
      return;
    }

    // Check if already an Alibaba image
    if (imageUrl.includes('alicdn.com') || imageUrl.includes('1688.com')) {
      setConvertedImageUrl(imageUrl);
      toast.success('Image is already from Alibaba platform');
      return;
    }

    setConverting(true);
    try {
      const res = await fetch(`${API}/api/tmapi/convert-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl }),
      });
      const data = await res.json();
      
      if (data.success) {
        setConvertedImageUrl(data.converted_url);
        toast.success('Image converted successfully! Valid for 24 hours.');
      } else {
        toast.error(data.error || 'Failed to convert image');
      }
    } catch (error) {
      toast.error('Failed to convert image');
    } finally {
      setConverting(false);
    }
  };

  // Search by image - Uses official 1688 API first, falls back to TMAPI
  const searchByImage = async (pageNum = 1) => {
    const searchUrl = convertedImageUrl || imageUrl;
    if (!searchUrl.trim()) {
      toast.error('Please enter or convert an image URL first');
      return;
    }

    setLoading(true);
    try {
      // Use unified endpoint that tries official 1688 first, then TMAPI
      const res = await fetch(`${API}/api/1688/image-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: searchUrl,
          page: pageNum,
          page_size: 20,
          source: 'auto', // auto tries: cross_border -> distributed -> tmapi
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setResults(data.products || []);
        setTotalResults(data.total || 0);
        setPage(pageNum);
        toast.success(`Found ${data.total} products via ${data.source}`);
      } else {
        toast.error(data.error || 'Image search failed');
        if (data.error?.includes('balance')) {
          checkApiBalance();
        }
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Search by keyword
  const searchByKeyword = async (pageNum = 1) => {
    if (!keyword.trim()) {
      toast.error('Please enter a search keyword');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        keyword: keyword,
        page: pageNum,
        page_size: 20,
        sort: filters.sort,
      });
      
      if (filters.priceStart) params.append('price_start', filters.priceStart);
      if (filters.priceEnd) params.append('price_end', filters.priceEnd);

      const res = await fetch(`${API}/api/tmapi/keyword-search?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setResults(data.items || []);
        setTotalResults(data.total || 0);
        setPage(pageNum);
        toast.success(`Found ${data.total} products`);
      } else {
        toast.error(data.error || 'Keyword search failed');
        if (data.error?.includes('balance')) {
          checkApiBalance();
        }
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Get shop items
  const getShopItems = async (pageNum = 1) => {
    if (!memberId.trim()) {
      toast.error('Please enter a seller member ID');
      return;
    }

    setLoading(true);
    try {
      // Get shop info first
      const infoRes = await fetch(`${API}/api/tmapi/shop/info?member_id=${memberId}`);
      const infoData = await infoRes.json();
      if (infoData.success) {
        setShopInfo(infoData.shop);
      }

      // Get shop items
      const params = new URLSearchParams({
        member_id: memberId,
        page: pageNum,
        page_size: 20,
        sort: filters.sort,
      });

      const res = await fetch(`${API}/api/tmapi/shop/items?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setResults(data.items || []);
        setTotalResults(data.total || 0);
        setPage(pageNum);
        toast.success(`Found ${data.total} products in shop`);
      } else {
        toast.error(data.error || 'Failed to get shop items');
        if (data.error?.includes('balance')) {
          checkApiBalance();
        }
      }
    } catch (error) {
      toast.error('Failed to get shop items');
    } finally {
      setLoading(false);
    }
  };

  // Import product to catalog
  const importProduct = async (item) => {
    try {
      const res = await fetch(`${API}/api/1688-scraper/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: [item.offer_id || item.item_id],
          translate: true,
        }),
      });
      const data = await res.json();
      
      if (data.success || data.results?.length > 0) {
        toast.success('Product imported to catalog!');
      } else {
        toast.error('Failed to import product');
      }
    } catch (error) {
      toast.error('Import failed');
    }
  };

  const handleSearch = () => {
    setResults([]);
    setPage(1);
    
    if (activeTab === 'image') {
      searchByImage(1);
    } else if (activeTab === 'keyword') {
      searchByKeyword(1);
    } else if (activeTab === 'shop') {
      getShopItems(1);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    if (activeTab === 'image') {
      searchByImage(nextPage);
    } else if (activeTab === 'keyword') {
      searchByKeyword(nextPage);
    } else if (activeTab === 'shop') {
      getShopItems(nextPage);
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="image-search-page">
      {/* API Status Banner */}
      {apiStatus && !apiStatus.success && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div className="flex-1">
            <p className="font-medium text-red-800">TMAPI Balance Depleted</p>
            <p className="text-sm text-red-600">{apiStatus.message}</p>
          </div>
          <a
            href="https://console.tmapi.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
          >
            Top Up Now
          </a>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">1688 Product Search</h1>
          <p className="text-gray-500">Search products by image, keyword, or browse shops</p>
        </div>
        <Button
          variant="outline"
          onClick={checkApiBalance}
          className="gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Check API Status
        </Button>
      </div>

      {/* Search Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => { setActiveTab('image'); setResults([]); }}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'image'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Image className="w-4 h-4" />
          Image Search
        </button>
        <button
          onClick={() => { setActiveTab('keyword'); setResults([]); }}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'keyword'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Search className="w-4 h-4" />
          Keyword Search
        </button>
        <button
          onClick={() => { setActiveTab('shop'); setResults([]); setShopInfo(null); }}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'shop'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Store className="w-4 h-4" />
          Shop Browser
        </button>
      </div>

      {/* Search Input Area */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Image Search Tab */}
          {activeTab === 'image' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL (from any website)"
                  className="flex-1"
                  data-testid="image-url-input"
                />
                <Button
                  onClick={convertImageUrl}
                  disabled={converting || !imageUrl.trim()}
                  variant="outline"
                  className="gap-2"
                >
                  {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Convert
                </Button>
                <Button
                  onClick={() => searchByImage(1)}
                  disabled={loading || (!imageUrl.trim() && !convertedImageUrl)}
                  className="bg-orange-500 hover:bg-orange-600 gap-2"
                  data-testid="image-search-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </Button>
              </div>
              
              {convertedImageUrl && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
                  <CheckCircle className="w-4 h-4" />
                  Converted URL ready (valid 24h)
                  <button onClick={() => setConvertedImageUrl('')} className="ml-auto">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <p className="text-xs text-gray-500">
                💡 Tip: For non-Alibaba images, click "Convert" first. Alibaba images (alicdn.com) can be searched directly.
              </p>
            </div>
          )}

          {/* Keyword Search Tab */}
          {activeTab === 'keyword' && (
            <div className="flex gap-2">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter search keyword (e.g., leather shoes, phone case)"
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="keyword-input"
              />
              <Button
                onClick={handleSearch}
                disabled={loading || !keyword.trim()}
                className="bg-orange-500 hover:bg-orange-600 gap-2"
                data-testid="keyword-search-btn"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </Button>
            </div>
          )}

          {/* Shop Browser Tab */}
          {activeTab === 'shop' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="Enter seller member ID (e.g., b2b-2213703065964c1)"
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="member-id-input"
                />
                <Button
                  onClick={handleSearch}
                  disabled={loading || !memberId.trim()}
                  className="bg-orange-500 hover:bg-orange-600 gap-2"
                  data-testid="shop-search-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
                  Browse Shop
                </Button>
              </div>
              
              <p className="text-xs text-gray-500">
                💡 Tip: Find the member ID in the shop URL or product details page.
              </p>
            </div>
          )}

          {/* Filters */}
          <div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showFilters && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Sort By</label>
                  <select
                    value={filters.sort}
                    onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                    className="w-full p-2 border rounded text-sm"
                  >
                    <option value="default">Default</option>
                    <option value="sales">Best Selling</option>
                    <option value="price_up">Price: Low to High</option>
                    <option value="price_down">Price: High to Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Min Price (¥)</label>
                  <Input
                    type="number"
                    value={filters.priceStart}
                    onChange={(e) => setFilters({ ...filters, priceStart: e.target.value })}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Max Price (¥)</label>
                  <Input
                    type="number"
                    value={filters.priceEnd}
                    onChange={(e) => setFilters({ ...filters, priceEnd: e.target.value })}
                    placeholder="9999"
                    className="text-sm"
                  />
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={filters.isFactory}
                      onChange={(e) => setFilters({ ...filters, isFactory: e.target.checked })}
                    />
                    Factory Only
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={filters.freeShipping}
                      onChange={(e) => setFilters({ ...filters, freeShipping: e.target.checked })}
                    />
                    Free Shipping
                  </label>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Shop Info */}
      {activeTab === 'shop' && shopInfo && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Store className="w-10 h-10 text-blue-500" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">{shopInfo.shop_name || 'Shop'}</h3>
                <div className="flex items-center gap-4 text-sm text-blue-700">
                  {shopInfo.location && <span>📍 {shopInfo.location}</span>}
                  {shopInfo.years && <span>🏢 {shopInfo.years} years</span>}
                  {shopInfo.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {shopInfo.rating}
                    </span>
                  )}
                </div>
              </div>
              <a
                href={shopInfo.shop_url || `https://shop${memberId}.1688.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Visit Shop
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">
              Results ({totalResults.toLocaleString()} products)
            </h2>
            <Badge variant="outline">{results.length} shown</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {results.map((item, index) => (
              <Card key={item.offer_id || item.item_id || index} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative group">
                  <img
                    src={item.img || item.pic_url || item.image}
                    alt={item.title || 'Product'}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/200?text=No+Image'; }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={`https://detail.1688.com/offer/${item.offer_id || item.item_id}.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded-full hover:bg-gray-100"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => importProduct(item)}
                      className="p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-sm line-clamp-2 h-10 mb-2">{item.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-orange-600 font-bold">
                      ¥{item.price || item.sale_price || '---'}
                    </span>
                    {item.sale_count && (
                      <span className="text-xs text-gray-400">{item.sale_count} sold</span>
                    )}
                  </div>
                  {item.is_factory && (
                    <Badge className="mt-2 bg-blue-100 text-blue-700 text-xs">
                      <Factory className="w-3 h-3 mr-1" />
                      Factory
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          {results.length < totalResults && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={loadMore}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Load More
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Enter a search query to find products</p>
        </div>
      )}
    </div>
  );
};

export default ImageSearch;
