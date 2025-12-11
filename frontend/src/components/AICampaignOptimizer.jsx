import React, { useState } from 'react';
import axios from 'axios';
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Zap,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = process.env.REACT_APP_BACKEND_URL;

const AICampaignOptimizer = ({ campaigns, onRefresh }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [budgetOptimizing, setBudgetOptimizing] = useState(false);
  const [budgetRecommendation, setBudgetRecommendation] = useState(null);
  const [totalBudget, setTotalBudget] = useState('');
  const [diagnosingCampaign, setDiagnosingCampaign] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    setRecommendations(null);
    
    try {
      toast.loading('🤖 AI is analyzing your campaigns...', { id: 'ai-analysis' });
      
      const response = await axios.post(`${API}/api/facebook/ai/analyze-campaigns?date_preset=last_30d`);
      
      if (response.data.success) {
        setAnalysis(response.data.analysis);
        setRecommendations(response.data.recommendations);
        toast.success('✅ AI analysis complete!', { id: 'ai-analysis' });
      } else {
        toast.error(response.data.error || 'Analysis failed', { id: 'ai-analysis' });
      }
    } catch (error) {
      console.error('Error running AI analysis:', error);
      toast.error('Failed to run AI analysis', { id: 'ai-analysis' });
    } finally {
      setAnalyzing(false);
    }
  };

  const optimizeBudget = async () => {
    if (!totalBudget || parseFloat(totalBudget) <= 0) {
      toast.error('Please enter a valid total budget');
      return;
    }
    
    setBudgetOptimizing(true);
    setBudgetRecommendation(null);
    
    try {
      toast.loading('🤖 Optimizing budget allocation...', { id: 'budget-opt' });
      
      const response = await axios.post(
        `${API}/api/facebook/ai/budget-optimization?total_budget=${parseFloat(totalBudget)}&date_preset=last_30d`
      );
      
      if (response.data.success) {
        setBudgetRecommendation(response.data.recommendation);
        toast.success('✅ Budget optimization complete!', { id: 'budget-opt' });
      } else {
        toast.error(response.data.error || 'Optimization failed', { id: 'budget-opt' });
      }
    } catch (error) {
      console.error('Error optimizing budget:', error);
      toast.error('Failed to optimize budget', { id: 'budget-opt' });
    } finally {
      setBudgetOptimizing(false);
    }
  };

  const diagnoseCampaign = async (campaignId, campaignName) => {
    setDiagnosingCampaign(campaignId);
    setDiagnosis(null);
    
    try {
      toast.loading(`🔍 Diagnosing ${campaignName}...`, { id: 'diagnose' });
      
      const response = await axios.post(`${API}/api/facebook/ai/diagnose/${campaignId}`);
      
      if (response.data.success) {
        setDiagnosis(response.data.diagnosis);
        toast.success('✅ Diagnosis complete!', { id: 'diagnose' });
      } else {
        toast.error(response.data.error || 'Diagnosis failed', { id: 'diagnose' });
      }
    } catch (error) {
      console.error('Error diagnosing campaign:', error);
      toast.error('Failed to diagnose campaign', { id: 'diagnose' });
    } finally {
      setDiagnosingCampaign(null);
    }
  };

  const updateCampaignStatus = async (campaignId, newStatus) => {
    try {
      toast.loading(`Updating campaign status...`, { id: 'status' });
      
      const response = await axios.post(
        `${API}/api/facebook/campaigns/${campaignId}/status?status=${newStatus}`
      );
      
      if (response.data.success) {
        toast.success(`✅ Campaign ${newStatus.toLowerCase()}`, { id: 'status' });
        if (onRefresh) onRefresh();
      } else {
        toast.error(response.data.error || 'Update failed', { id: 'status' });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update campaign status', { id: 'status' });
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Analysis Header */}
      <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Brain className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Campaign Optimizer</h2>
                <p className="text-purple-100">Powered by GPT-4 • Analyzes performance & recommends optimizations</p>
              </div>
            </div>
            <Button 
              onClick={runAIAnalysis}
              disabled={analyzing}
              className="bg-white text-purple-600 hover:bg-purple-50"
              size="lg"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Budget Optimizer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Budget Optimizer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Total daily budget"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
              />
              <Button onClick={optimizeBudget} disabled={budgetOptimizing}>
                {budgetOptimizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations Summary */}
        {recommendations && (
          <>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUp className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-800">Scale Up</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{recommendations.scale_up?.length || 0}</p>
                <p className="text-xs text-green-600">campaigns with good ROAS</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Pause className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-800">Pause</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{recommendations.pause?.length || 0}</p>
                <p className="text-xs text-red-600">underperforming campaigns</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* AI Analysis Results */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              AI Recommendations
            </CardTitle>
            <CardDescription>Based on your campaign performance data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                {analysis}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Optimization Results */}
      {budgetRecommendation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Budget Allocation Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 rounded-lg p-4 whitespace-pre-wrap text-sm">
              {budgetRecommendation}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign Actions */}
      {recommendations && (recommendations.scale_up?.length > 0 || recommendations.pause?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>Click to apply AI recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Scale Up Recommendations */}
              {recommendations.scale_up?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Scale Up ({recommendations.scale_up.length})
                  </h4>
                  <div className="space-y-2">
                    {recommendations.scale_up.map((rec, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{rec.campaign_name}</p>
                          <p className="text-xs text-green-600">ROAS: {rec.current_roas?.toFixed(2)}x • {rec.suggested_action}</p>
                        </div>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <ArrowUp className="w-4 h-4 mr-1" />
                          Scale +20%
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pause Recommendations */}
              {recommendations.pause?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Consider Pausing ({recommendations.pause.length})
                  </h4>
                  <div className="space-y-2">
                    {recommendations.pause.map((rec, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{rec.campaign_name}</p>
                          <p className="text-xs text-red-600">ROAS: {rec.current_roas?.toFixed(2)}x • {rec.suggested_action}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => diagnoseCampaign(rec.campaign_id, rec.campaign_name)}
                            disabled={diagnosingCampaign === rec.campaign_id}
                          >
                            {diagnosingCampaign === rec.campaign_id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>🔍 Diagnose</>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => updateCampaignStatus(rec.campaign_id, 'PAUSED')}
                          >
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnosis Results */}
      {diagnosis && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Campaign Diagnosis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg p-4 whitespace-pre-wrap text-sm">
              {diagnosis}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!analysis && !analyzing && (
        <Card className="text-center py-12">
          <CardContent>
            <Brain className="w-16 h-16 text-purple-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">AI Ready to Optimize</h3>
            <p className="text-gray-500 mb-4">
              Click "Run AI Analysis" to get personalized recommendations<br />
              for scaling, pausing, and optimizing your campaigns
            </p>
            <Button onClick={runAIAnalysis} disabled={analyzing}>
              <Sparkles className="w-4 h-4 mr-2" />
              Get Started
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AICampaignOptimizer;
