"""
Facebook Marketing API Integration Service
Handles Custom Audiences, Campaign Analytics, and Ad Performance
"""
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.customaudience import CustomAudience
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.user import User
import hashlib
import os
import logging
from typing import List, Dict, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class FacebookMarketingService:
    def __init__(self, access_token: str = None, ad_account_id: str = None):
        """
        Initialize Facebook Marketing API
        
        Args:
            access_token: Facebook Graph API access token
            ad_account_id: Facebook Ad Account ID (format: act_XXXXX)
        """
        self.access_token = access_token or os.environ.get('FACEBOOK_ACCESS_TOKEN')
        self.ad_account_id = ad_account_id or os.environ.get('FACEBOOK_AD_ACCOUNT_ID')
        self.api = None
        self.ad_account = None
        self._initialized = False
        
    def initialize(self):
        """Initialize the Facebook API connection"""
        if self._initialized:
            return True
            
        if not self.access_token:
            logger.error("Facebook access token not provided")
            return False
            
        try:
            # Initialize Facebook API
            self.api = FacebookAdsApi.init(access_token=self.access_token)
            
            # If ad account ID is provided, initialize the ad account
            if self.ad_account_id:
                if not self.ad_account_id.startswith('act_'):
                    self.ad_account_id = f"act_{self.ad_account_id}"
                self.ad_account = AdAccount(self.ad_account_id)
            
            self._initialized = True
            logger.info("✅ Facebook Marketing API initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Facebook API: {str(e)}")
            return False
    
    def get_me(self) -> Dict:
        """Get info about the current user/token"""
        try:
            if not self.initialize():
                return {"error": "API not initialized"}
            
            me = User(fbid='me')
            me_data = me.api_get(fields=['id', 'name', 'email'])
            
            return {
                "success": True,
                "user": {
                    "id": me_data.get('id'),
                    "name": me_data.get('name'),
                    "email": me_data.get('email')
                }
            }
        except Exception as e:
            logger.error(f"Error getting user info: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_ad_accounts(self) -> Dict:
        """Get all ad accounts accessible with this token"""
        try:
            if not self.initialize():
                return {"error": "API not initialized"}
            
            me = User(fbid='me')
            accounts = me.get_ad_accounts(fields=[
                'id', 
                'name', 
                'account_status',
                'currency',
                'timezone_name',
                'amount_spent'
            ])
            
            account_list = []
            for account in accounts:
                account_list.append({
                    "id": account.get('id'),
                    "name": account.get('name'),
                    "status": account.get('account_status'),
                    "currency": account.get('currency'),
                    "timezone": account.get('timezone_name'),
                    "amount_spent": float(account.get('amount_spent', 0)) / 100  # Convert from cents
                })
            
            return {
                "success": True,
                "ad_accounts": account_list,
                "count": len(account_list)
            }
            
        except Exception as e:
            logger.error(f"Error getting ad accounts: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def set_ad_account(self, ad_account_id: str):
        """Set the active ad account"""
        if not ad_account_id.startswith('act_'):
            ad_account_id = f"act_{ad_account_id}"
        self.ad_account_id = ad_account_id
        self.ad_account = AdAccount(ad_account_id)
        return {"success": True, "ad_account_id": ad_account_id}
    
    # ==================== CUSTOM AUDIENCES ====================
    
    def normalize_and_hash_email(self, email: str) -> str:
        """Normalize email and hash using SHA-256 as required by Facebook"""
        normalized = email.strip().lower()
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    def normalize_and_hash_phone(self, phone: str) -> str:
        """Normalize phone and hash using SHA-256"""
        # Remove non-numeric characters
        normalized = ''.join(filter(str.isdigit, phone))
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    def create_custom_audience(self, name: str, description: str = None) -> Dict:
        """Create an empty custom audience"""
        try:
            if not self.initialize() or not self.ad_account:
                return {"error": "Ad account not configured"}
            
            params = {
                CustomAudience.Field.name: name,
                CustomAudience.Field.subtype: CustomAudience.Subtype.custom,
                CustomAudience.Field.customer_file_source: CustomAudience.CustomerFileSource.user_provided_only,
            }
            
            if description:
                params[CustomAudience.Field.description] = description
            
            audience = self.ad_account.create_custom_audience(params=params)
            audience_id = audience.get(CustomAudience.Field.id)
            
            logger.info(f"✅ Created custom audience: {audience_id}")
            
            return {
                "success": True,
                "audience_id": audience_id,
                "name": name
            }
            
        except Exception as e:
            logger.error(f"Error creating custom audience: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def add_users_to_audience(self, audience_id: str, customers: List[Dict]) -> Dict:
        """
        Add users to an existing custom audience
        
        Args:
            audience_id: Facebook audience ID
            customers: List of dicts with 'email' and/or 'phone' keys
        """
        try:
            if not self.initialize():
                return {"error": "API not initialized"}
            
            audience = CustomAudience(audience_id)
            
            # Prepare hashed data
            data = []
            for customer in customers:
                row = []
                
                email = customer.get('email')
                if email:
                    row.append(self.normalize_and_hash_email(email))
                else:
                    row.append('')
                
                phone = customer.get('phone')
                if phone:
                    row.append(self.normalize_and_hash_phone(phone))
                else:
                    row.append('')
                
                # Only add if we have at least one identifier
                if row[0] or row[1]:
                    data.append(row)
            
            if not data:
                return {"success": False, "error": "No valid customer data to add"}
            
            # Upload to Facebook
            result = audience.create_user(
                schema=["EMAIL_SHA256", "PHONE_SHA256"],
                data=data
            )
            
            logger.info(f"✅ Added {len(data)} users to audience {audience_id}")
            
            return {
                "success": True,
                "audience_id": audience_id,
                "users_added": len(data)
            }
            
        except Exception as e:
            logger.error(f"Error adding users to audience: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_custom_audiences(self) -> Dict:
        """Get all custom audiences for the ad account"""
        try:
            if not self.initialize() or not self.ad_account:
                return {"error": "Ad account not configured"}
            
            audiences = self.ad_account.get_custom_audiences(fields=[
                'id',
                'name',
                'description',
                'approximate_count',
                'data_source',
                'delivery_status',
                'operation_status',
                'time_created',
                'time_updated'
            ])
            
            audience_list = []
            for aud in audiences:
                audience_list.append({
                    "id": aud.get('id'),
                    "name": aud.get('name'),
                    "description": aud.get('description'),
                    "approximate_count": aud.get('approximate_count'),
                    "delivery_status": aud.get('delivery_status'),
                    "operation_status": aud.get('operation_status'),
                    "created_at": aud.get('time_created'),
                    "updated_at": aud.get('time_updated')
                })
            
            return {
                "success": True,
                "audiences": audience_list,
                "count": len(audience_list)
            }
            
        except Exception as e:
            logger.error(f"Error getting custom audiences: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # ==================== CAMPAIGNS ====================
    
    def get_campaigns(self, status_filter: str = None) -> Dict:
        """Get all campaigns for the ad account"""
        try:
            if not self.initialize() or not self.ad_account:
                return {"error": "Ad account not configured"}
            
            params = {}
            if status_filter:
                params['effective_status'] = [status_filter.upper()]
            
            campaigns = self.ad_account.get_campaigns(
                fields=[
                    Campaign.Field.id,
                    Campaign.Field.name,
                    Campaign.Field.status,
                    Campaign.Field.effective_status,
                    Campaign.Field.objective,
                    Campaign.Field.buying_type,
                    Campaign.Field.daily_budget,
                    Campaign.Field.lifetime_budget,
                    Campaign.Field.created_time,
                    Campaign.Field.updated_time,
                    Campaign.Field.start_time,
                    Campaign.Field.stop_time,
                ],
                params=params
            )
            
            campaign_list = []
            for camp in campaigns:
                campaign_list.append({
                    "id": camp.get(Campaign.Field.id),
                    "name": camp.get(Campaign.Field.name),
                    "status": camp.get(Campaign.Field.status),
                    "effective_status": camp.get(Campaign.Field.effective_status),
                    "objective": camp.get(Campaign.Field.objective),
                    "buying_type": camp.get(Campaign.Field.buying_type),
                    "daily_budget": float(camp.get(Campaign.Field.daily_budget, 0) or 0) / 100,
                    "lifetime_budget": float(camp.get(Campaign.Field.lifetime_budget, 0) or 0) / 100,
                    "created_time": camp.get(Campaign.Field.created_time),
                    "updated_time": camp.get(Campaign.Field.updated_time),
                    "start_time": camp.get(Campaign.Field.start_time),
                    "stop_time": camp.get(Campaign.Field.stop_time),
                })
            
            return {
                "success": True,
                "campaigns": campaign_list,
                "count": len(campaign_list)
            }
            
        except Exception as e:
            logger.error(f"Error getting campaigns: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_campaign_insights(self, campaign_id: str, date_preset: str = 'last_30d') -> Dict:
        """
        Get performance insights for a specific campaign
        
        Args:
            campaign_id: Facebook campaign ID
            date_preset: One of 'today', 'yesterday', 'last_7d', 'last_30d', 'this_month', 'last_month'
        """
        try:
            if not self.initialize():
                return {"error": "API not initialized"}
            
            campaign = Campaign(campaign_id)
            
            insights = campaign.get_insights(
                fields=[
                    'campaign_id',
                    'campaign_name',
                    'impressions',
                    'reach',
                    'clicks',
                    'spend',
                    'cpc',
                    'cpm',
                    'ctr',
                    'actions',
                    'action_values',
                    'conversions',
                    'conversion_values',
                    'cost_per_action_type',
                    'purchase_roas',
                    'frequency'
                ],
                params={
                    'date_preset': date_preset
                }
            )
            
            if not insights or len(insights) == 0:
                return {
                    "success": True,
                    "campaign_id": campaign_id,
                    "metrics": None,
                    "message": "No insights data available for this period"
                }
            
            insight = insights[0]
            
            # Parse actions to get conversions
            actions = insight.get('actions', [])
            purchases = 0
            leads = 0
            for action in actions:
                if action.get('action_type') == 'purchase':
                    purchases = int(action.get('value', 0))
                elif action.get('action_type') == 'lead':
                    leads = int(action.get('value', 0))
            
            metrics = {
                "impressions": int(insight.get('impressions', 0)),
                "reach": int(insight.get('reach', 0)),
                "clicks": int(insight.get('clicks', 0)),
                "spend": float(insight.get('spend', 0)),
                "cpc": float(insight.get('cpc', 0)),
                "cpm": float(insight.get('cpm', 0)),
                "ctr": float(insight.get('ctr', 0)),
                "frequency": float(insight.get('frequency', 0)),
                "purchases": purchases,
                "leads": leads,
                "roas": insight.get('purchase_roas', [{}])[0].get('value', 0) if insight.get('purchase_roas') else 0
            }
            
            return {
                "success": True,
                "campaign_id": campaign_id,
                "campaign_name": insight.get('campaign_name'),
                "date_preset": date_preset,
                "metrics": metrics
            }
            
        except Exception as e:
            logger.error(f"Error getting campaign insights: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_account_insights(self, date_preset: str = 'last_30d') -> Dict:
        """Get aggregate insights for the entire ad account"""
        try:
            if not self.initialize() or not self.ad_account:
                return {"error": "Ad account not configured"}
            
            insights = self.ad_account.get_insights(
                fields=[
                    'impressions',
                    'reach',
                    'clicks',
                    'spend',
                    'cpc',
                    'cpm',
                    'ctr',
                    'actions',
                    'action_values',
                    'conversions',
                    'purchase_roas',
                    'frequency'
                ],
                params={
                    'date_preset': date_preset
                }
            )
            
            if not insights or len(insights) == 0:
                return {
                    "success": True,
                    "metrics": None,
                    "message": "No insights data available"
                }
            
            insight = insights[0]
            
            # Parse actions
            actions = insight.get('actions', [])
            purchases = 0
            leads = 0
            for action in actions:
                if action.get('action_type') == 'purchase':
                    purchases = int(action.get('value', 0))
                elif action.get('action_type') == 'lead':
                    leads = int(action.get('value', 0))
            
            metrics = {
                "impressions": int(insight.get('impressions', 0)),
                "reach": int(insight.get('reach', 0)),
                "clicks": int(insight.get('clicks', 0)),
                "spend": float(insight.get('spend', 0)),
                "cpc": float(insight.get('cpc', 0)),
                "cpm": float(insight.get('cpm', 0)),
                "ctr": float(insight.get('ctr', 0)),
                "frequency": float(insight.get('frequency', 0)),
                "purchases": purchases,
                "leads": leads,
                "roas": insight.get('purchase_roas', [{}])[0].get('value', 0) if insight.get('purchase_roas') else 0
            }
            
            return {
                "success": True,
                "date_preset": date_preset,
                "metrics": metrics
            }
            
        except Exception as e:
            logger.error(f"Error getting account insights: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_all_campaigns_with_insights(self, date_preset: str = 'last_30d') -> Dict:
        """Get all campaigns with their performance metrics"""
        try:
            if not self.initialize() or not self.ad_account:
                return {"error": "Ad account not configured"}
            
            # Get campaigns
            campaigns_result = self.get_campaigns()
            if not campaigns_result.get('success'):
                return campaigns_result
            
            campaigns = campaigns_result.get('campaigns', [])
            
            # Get insights for each campaign
            campaigns_with_insights = []
            for campaign in campaigns:
                insights_result = self.get_campaign_insights(campaign['id'], date_preset)
                campaign['insights'] = insights_result.get('metrics') if insights_result.get('success') else None
                campaigns_with_insights.append(campaign)
            
            return {
                "success": True,
                "campaigns": campaigns_with_insights,
                "count": len(campaigns_with_insights),
                "date_preset": date_preset
            }
            
        except Exception as e:
            logger.error(f"Error getting campaigns with insights: {str(e)}")
            return {"success": False, "error": str(e)}


# Singleton instance
facebook_marketing = FacebookMarketingService()
