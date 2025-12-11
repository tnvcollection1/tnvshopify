"""
AI Campaign Optimizer
Uses GPT to analyze Facebook ad campaigns and provide optimization recommendations
"""
import os
import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class AICampaignOptimizer:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        self.chat = None
        
    async def initialize(self):
        """Initialize the LLM chat"""
        if not self.api_key:
            logger.error("EMERGENT_LLM_KEY not found in environment")
            return False
        
        try:
            from emergentintegrations.llm.chat import LlmChat
            
            self.chat = LlmChat(
                api_key=self.api_key,
                session_id=f"campaign-optimizer-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
                system_message="""You are an expert Facebook Ads optimizer with years of experience managing millions in ad spend. 
                
Your role is to analyze campaign performance data and provide actionable recommendations to:
1. Maximize ROAS (Return on Ad Spend)
2. Reduce cost per acquisition
3. Scale winning campaigns
4. Cut losses on underperforming campaigns
5. Optimize budget allocation

When analyzing campaigns, consider:
- ROAS thresholds (good: >2x, excellent: >4x, poor: <1x)
- CTR benchmarks (good: >1%, excellent: >2%, poor: <0.5%)
- CPC trends and industry standards
- Frequency (high frequency = audience fatigue)
- Learning phase requirements (need 50 conversions/week)

Always provide specific, actionable recommendations with exact numbers when possible.
Format your response in clear sections with emoji headers for easy scanning."""
            ).with_model("openai", "gpt-4o-mini")
            
            return True
            
        except Exception as e:
            logger.error(f"Error initializing AI optimizer: {str(e)}")
            return False
    
    async def analyze_campaigns(self, campaigns_data: List[Dict], account_insights: Dict = None) -> Dict:
        """
        Analyze campaign performance and provide recommendations
        
        Args:
            campaigns_data: List of campaigns with their insights
            account_insights: Overall account metrics
        """
        try:
            if not self.chat:
                await self.initialize()
            
            if not self.chat:
                return {"success": False, "error": "AI not initialized"}
            
            from emergentintegrations.llm.chat import UserMessage
            
            # Prepare campaign summary for AI
            campaign_summary = self._prepare_campaign_summary(campaigns_data)
            account_summary = self._prepare_account_summary(account_insights) if account_insights else ""
            
            prompt = f"""Analyze the following Facebook ad campaigns and provide optimization recommendations:

## Account Overview
{account_summary}

## Campaign Performance Data
{campaign_summary}

Please provide:
1. 🏆 **Top Performers** - Which campaigns should be scaled up and by how much?
2. ⚠️ **Underperformers** - Which campaigns should be paused or need major changes?
3. 💰 **Budget Recommendations** - Specific budget reallocation suggestions
4. 🎯 **Quick Wins** - Immediate actions that can improve performance today
5. 📈 **Scaling Strategy** - How to scale winning campaigns without losing efficiency
6. 🔮 **Predictions** - What results can be expected if recommendations are followed

Be specific with numbers and percentages. Include exact budget amounts to reallocate."""

            # Send to AI
            user_message = UserMessage(text=prompt)
            response = await self.chat.send_message(user_message)
            
            # Parse response into structured format
            recommendations = self._parse_recommendations(response, campaigns_data)
            
            return {
                "success": True,
                "analysis": response,
                "recommendations": recommendations,
                "analyzed_at": datetime.now(timezone.utc).isoformat(),
                "campaigns_analyzed": len(campaigns_data)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing campaigns: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_scaling_recommendation(self, campaign: Dict, target_increase: float = 0.2) -> Dict:
        """
        Get specific scaling recommendation for a campaign
        
        Args:
            campaign: Campaign data with insights
            target_increase: Target budget increase (0.2 = 20%)
        """
        try:
            if not self.chat:
                await self.initialize()
            
            if not self.chat:
                return {"success": False, "error": "AI not initialized"}
            
            from emergentintegrations.llm.chat import UserMessage
            
            insights = campaign.get('insights', {})
            
            prompt = f"""I want to scale this Facebook ad campaign by {int(target_increase * 100)}%:

Campaign: {campaign.get('name')}
Objective: {campaign.get('objective')}
Current Status: {campaign.get('effective_status')}
Current Daily Budget: {campaign.get('daily_budget', 0)}

Performance Metrics:
- Spend: {insights.get('spend', 0)}
- ROAS: {insights.get('purchase_roas', 0)}x
- Purchases: {insights.get('purchases', 0)}
- Cost per Purchase: {insights.get('cost_per_purchase', 0)}
- CTR: {insights.get('ctr', 0)}%
- CPC: {insights.get('cpc', 0)}
- Impressions: {insights.get('impressions', 0)}
- Frequency: {insights.get('frequency', 0)}

Questions:
1. Is this campaign ready to scale? Why or why not?
2. What's the recommended budget increase?
3. What metrics should I monitor during scaling?
4. What's the expected impact on CPA and ROAS?
5. Any risks to watch out for?

Provide a clear YES/NO recommendation with reasoning."""

            user_message = UserMessage(text=prompt)
            response = await self.chat.send_message(user_message)
            
            return {
                "success": True,
                "campaign_id": campaign.get('id'),
                "campaign_name": campaign.get('name'),
                "recommendation": response,
                "target_increase": target_increase
            }
            
        except Exception as e:
            logger.error(f"Error getting scaling recommendation: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_budget_optimization(self, campaigns_data: List[Dict], total_budget: float) -> Dict:
        """
        Get AI recommendation for optimal budget allocation across campaigns
        
        Args:
            campaigns_data: List of campaigns with insights
            total_budget: Total daily budget to allocate
        """
        try:
            if not self.chat:
                await self.initialize()
            
            if not self.chat:
                return {"success": False, "error": "AI not initialized"}
            
            from emergentintegrations.llm.chat import UserMessage
            
            campaign_summary = self._prepare_campaign_summary(campaigns_data)
            
            prompt = f"""I have a total daily budget of {total_budget} to allocate across these campaigns:

{campaign_summary}

Please provide:
1. **Optimal Budget Allocation** - Exact budget for each campaign
2. **Reasoning** - Why this allocation maximizes returns
3. **Expected Outcome** - Projected ROAS and conversions with new allocation
4. **Campaigns to Pause** - Any campaigns that shouldn't receive budget

Format the allocation as a simple table:
| Campaign | Current Budget | Recommended Budget | Change |

Total must equal {total_budget}."""

            user_message = UserMessage(text=prompt)
            response = await self.chat.send_message(user_message)
            
            return {
                "success": True,
                "total_budget": total_budget,
                "recommendation": response,
                "campaigns_count": len(campaigns_data)
            }
            
        except Exception as e:
            logger.error(f"Error getting budget optimization: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def diagnose_campaign(self, campaign: Dict) -> Dict:
        """
        Diagnose why a campaign might be underperforming
        
        Args:
            campaign: Campaign data with insights
        """
        try:
            if not self.chat:
                await self.initialize()
            
            if not self.chat:
                return {"success": False, "error": "AI not initialized"}
            
            from emergentintegrations.llm.chat import UserMessage
            
            insights = campaign.get('insights', {})
            
            prompt = f"""Diagnose this underperforming Facebook ad campaign:

Campaign: {campaign.get('name')}
Objective: {campaign.get('objective')}
Status: {campaign.get('effective_status')}

Metrics:
- Spend: {insights.get('spend', 0)}
- Impressions: {insights.get('impressions', 0)}
- Reach: {insights.get('reach', 0)}
- Clicks: {insights.get('clicks', 0)}
- CTR: {insights.get('ctr', 0)}%
- CPC: {insights.get('cpc', 0)}
- CPM: {insights.get('cpm', 0)}
- Frequency: {insights.get('frequency', 0)}
- Purchases: {insights.get('purchases', 0)}
- ROAS: {insights.get('purchase_roas', 0)}x
- Cost per Purchase: {insights.get('cost_per_purchase', 0)}

Provide:
1. 🔍 **Root Cause Analysis** - What's likely causing poor performance?
2. 🎯 **Targeting Issues** - Is the audience too broad/narrow?
3. 💡 **Creative Issues** - Could ad creative be the problem?
4. 📊 **Funnel Issues** - Where are users dropping off?
5. ✅ **Fix Priority** - Ordered list of fixes to try (most impactful first)
6. ⏱️ **Timeline** - How long to test each fix before moving on?"""

            user_message = UserMessage(text=prompt)
            response = await self.chat.send_message(user_message)
            
            return {
                "success": True,
                "campaign_id": campaign.get('id'),
                "campaign_name": campaign.get('name'),
                "diagnosis": response
            }
            
        except Exception as e:
            logger.error(f"Error diagnosing campaign: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _prepare_campaign_summary(self, campaigns_data: List[Dict]) -> str:
        """Prepare campaign data as text for AI analysis"""
        lines = []
        
        for i, campaign in enumerate(campaigns_data[:20], 1):  # Limit to 20 campaigns
            # Handle None insights gracefully
            insights = campaign.get('insights') or {}
            
            # Safely get numeric values with defaults
            spend = float(insights.get('spend') or 0)
            impressions = int(insights.get('impressions') or 0)
            reach = int(insights.get('reach') or 0)
            clicks = int(insights.get('clicks') or 0)
            ctr = float(insights.get('ctr') or 0)
            cpc = float(insights.get('cpc') or 0)
            cpm = float(insights.get('cpm') or 0)
            frequency = float(insights.get('frequency') or 0)
            purchases = int(insights.get('purchases') or 0)
            purchase_value = float(insights.get('purchase_value') or 0)
            purchase_roas = float(insights.get('purchase_roas') or 0)
            cost_per_purchase = float(insights.get('cost_per_purchase') or 0)
            
            line = f"""
### Campaign {i}: {campaign.get('name', 'Unknown')}
- Status: {campaign.get('effective_status', 'Unknown')}
- Objective: {campaign.get('objective', 'Unknown')}
- Daily Budget: {campaign.get('daily_budget', 0)}
- Spend: {spend}
- Impressions: {impressions:,}
- Reach: {reach:,}
- Clicks: {clicks:,}
- CTR: {ctr:.2f}%
- CPC: {cpc:.2f}
- CPM: {cpm:.2f}
- Frequency: {frequency:.2f}
- Purchases: {purchases}
- Purchase Value: {purchase_value:.2f}
- ROAS: {purchase_roas:.2f}x
- Cost per Purchase: {cost_per_purchase:.2f}
"""
            lines.append(line)
        
        return "\n".join(lines)
    
    def _prepare_account_summary(self, account_insights: Dict) -> str:
        """Prepare account-level summary"""
        if not account_insights:
            return "No account data available"
        
        # Safely get numeric values with defaults
        spend = float(account_insights.get('spend') or 0)
        impressions = int(account_insights.get('impressions') or 0)
        reach = int(account_insights.get('reach') or 0)
        clicks = int(account_insights.get('clicks') or 0)
        ctr = float(account_insights.get('ctr') or 0)
        cpc = float(account_insights.get('cpc') or 0)
        cpm = float(account_insights.get('cpm') or 0)
        
        return f"""
- Total Spend: {spend:.2f}
- Total Impressions: {impressions:,}
- Total Reach: {reach:,}
- Total Clicks: {clicks:,}
- Average CTR: {ctr:.2f}%
- Average CPC: {cpc:.2f}
- Average CPM: {cpm:.2f}
"""
    
    def _parse_recommendations(self, ai_response: str, campaigns_data: List[Dict]) -> Dict:
        """Parse AI response into structured recommendations"""
        # This is a simple parser - in production, you might use structured outputs
        recommendations = {
            "scale_up": [],
            "pause": [],
            "optimize": [],
            "monitor": []
        }
        
        # Simple heuristic: campaigns with good ROAS should scale, bad ROAS should pause
        for campaign in campaigns_data:
            insights = campaign.get('insights', {})
            roas = insights.get('purchase_roas', 0) or 0
            spend = insights.get('spend', 0) or 0
            
            if spend > 0:
                if roas >= 2:
                    recommendations["scale_up"].append({
                        "campaign_id": campaign.get('id'),
                        "campaign_name": campaign.get('name'),
                        "current_roas": roas,
                        "suggested_action": "Increase budget by 20%"
                    })
                elif roas < 1 and spend > 100:
                    recommendations["pause"].append({
                        "campaign_id": campaign.get('id'),
                        "campaign_name": campaign.get('name'),
                        "current_roas": roas,
                        "suggested_action": "Pause or restructure"
                    })
                else:
                    recommendations["optimize"].append({
                        "campaign_id": campaign.get('id'),
                        "campaign_name": campaign.get('name'),
                        "current_roas": roas,
                        "suggested_action": "Test new audiences or creatives"
                    })
        
        return recommendations


# Singleton instance
ai_campaign_optimizer = AICampaignOptimizer()
