import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { useStore } from "../contexts/StoreContext";
import { RefreshCw, TrendingUp, Zap, DollarSign, Package } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

function DynamicPricing() {
  const { selectedStore: globalStore, getStoreName } = useStore();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [syncingToShopify, setSyncingToShopify] = useState(false);
  const [report, setReport] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingDiscounts, setEditingDiscounts] = useState({
    A: 0,
    B: 10,
    C: 20
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchReport();
  }, [globalStore]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      toast.loading("Loading pricing data... (12,000+ products)", { id: 'fetch-report' });
      const storeParam = globalStore !== 'all' ? `?store_name=${globalStore}` : '';
      const response = await axios.get(`${API}/api/dynamic-pricing/report${storeParam}`, {
        timeout: 30000 // 30 second timeout
      });
      toast.success(`Loaded ${response.data.total_products} products!`, { id: 'fetch-report' });
      setReport(response.data);
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error("Failed to load pricing report. Try clicking 'Analyze Products'.", { id: 'fetch-report' });
    } finally {
      setLoading(false);
    }
  };

  const analyzeProducts = async () => {
    try {
      setAnalyzing(true);
      toast.loading("Analyzing product velocity...", { id: 'analyze' });
      const response = await axios.post(`${API}/api/dynamic-pricing/analyze?days_lookback=365`);
      toast.success(`Analyzed ${response.data.total_products} products!`, { id: 'analyze' });
      setReport(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to analyze products", { id: 'analyze' });
    } finally {
      setAnalyzing(false);
    }
  };

  const syncToShopify = async () => {
    try {
      setSyncingToShopify(true);
      toast.loading("Syncing prices to Shopify...", { id: 'sync' });
      
      const response = await axios.post(`${API}/api/dynamic-pricing/sync-to-shopify`, {
        discounts: editingDiscounts
      });
      
      toast.success(`Synced ${response.data.updated_count} products to Shopify!`, { id: 'sync' });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to sync to Shopify", { id: 'sync' });
    } finally {
      setSyncingToShopify(false);
    }
  };

  const applyPricingLocally = async () => {
    try {
      toast.loading("Applying pricing to local inventory...", { id: 'apply' });
      const response = await axios.post(`${API}/api/dynamic-pricing/apply?auto_apply=true&days_lookback=365`);
      toast.success(`Updated ${response.data.updated_count} products!`, { id: 'apply' });
      fetchReport();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to apply pricing", { id: 'apply' });
    }
  };

  const getCategoryColor = (category) => {
    return {
      A: "bg-green-100 text-green-800 border-green-300",
      B: "bg-yellow-100 text-yellow-800 border-yellow-300",
      C: "bg-red-100 text-red-800 border-red-300"
    }[category];
  };

  const getCategoryDescription = (category) => {
    return {
      A: "Fast-moving (Top 20%)",
      B: "Medium-moving (Next 30%)",
      C: "Slow-moving (Bottom 50%)"
    }[category];
  };

  const getFilteredProducts = () => {
    if (!selectedCategory || !report) return [];
    
    const products = report.categories[selectedCategory] || [];
    
    if (!searchTerm) return products;
    
    return products.filter(p => 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const calculateNewPrice = (currentPrice, category) => {
    const discount = editingDiscounts[category] || 0;
    return currentPrice * (1 - discount / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing data...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">No pricing data available</p>
            <Button onClick={analyzeProducts} disabled={analyzing}>
              {analyzing ? "Analyzing..." : "Analyze Products"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = report.categories || {};
  const filteredProducts = getFilteredProducts();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dynamic Pricing Engine</h1>
        <p className="text-gray-600 mt-2">
          Automatic pricing based on product velocity • {report.total_products} products analyzed
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Button onClick={analyzeProducts} disabled={analyzing} variant="outline">
          {analyzing ? "Analyzing..." : "Re-analyze Products"}
        </Button>
        <Button onClick={applyPricingLocally} variant="outline">
          Apply to Local Inventory
        </Button>
        <Button 
          onClick={syncToShopify} 
          disabled={syncingToShopify}
          className="bg-green-600 hover:bg-green-700"
        >
          {syncingToShopify ? "Syncing..." : "Sync Prices to Shopify"}
        </Button>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {['A', 'B', 'C'].map(cat => {
          const products = categories[cat] || [];
          const isSelected = selectedCategory === cat;
          
          return (
            <Card
              key={cat}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-green-600' : ''
              } ${getCategoryColor(cat)}`}
              onClick={() => setSelectedCategory(isSelected ? null : cat)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">Category {cat}</CardTitle>
                    <p className="text-sm mt-1 opacity-80">
                      {getCategoryDescription(cat)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {products.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Discount:</label>
                    <Input
                      type="number"
                      value={editingDiscounts[cat]}
                      onChange={(e) => setEditingDiscounts({
                        ...editingDiscounts,
                        [cat]: parseFloat(e.target.value) || 0
                      })}
                      className="w-20"
                      min="0"
                      max="100"
                      step="5"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm">%</span>
                  </div>
                  <div className="text-sm opacity-80">
                    <p>Total Orders: {products.reduce((sum, p) => sum + p.order_count, 0)}</p>
                    <p>Total Revenue: ${products.reduce((sum, p) => sum + p.total_revenue, 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Products Table */}
      {selectedCategory && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Category {selectedCategory} Products ({filteredProducts.length})
              </CardTitle>
              <Input
                placeholder="Search by SKU or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Velocity</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">New Price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, idx) => {
                    const newPrice = calculateNewPrice(product.current_price, selectedCategory);
                    const discount = editingDiscounts[selectedCategory];
                    
                    return (
                      <TableRow key={idx} className="hover:bg-gray-50">
                        <TableCell className="font-medium font-mono text-xs">
                          {product.sku}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {product.product_name}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{product.order_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.total_quantity_sold}
                        </TableCell>
                        <TableCell className="text-right">
                          ${product.total_revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.velocity_score.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${product.current_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ${newPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={getCategoryColor(selectedCategory)}>
                            {discount}% off
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedCategory && (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            Click on a category card above to view products
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DynamicPricing;
