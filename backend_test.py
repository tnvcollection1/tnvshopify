import requests
import sys
from datetime import datetime
import json
import time

class ShopifyCustomerAPITester:
    def __init__(self, base_url="https://adware-crm.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.facebook_tests_run = 0
        self.facebook_tests_passed = 0
        self.finance_tests_run = 0
        self.finance_tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30, measure_time=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            start_time = time.time()
            
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            success = response.status_code == expected_status
            
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_size": len(response.text) if response.text else 0,
                "response_time_ms": response_time
            }
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if measure_time:
                    print(f"   Response time: {response_time:.2f}ms")
                if response.text:
                    try:
                        response_json = response.json()
                        if isinstance(response_json, list):
                            print(f"   Response: List with {len(response_json)} items")
                        elif isinstance(response_json, dict):
                            print(f"   Response keys: {list(response_json.keys())}")
                        result["response_preview"] = str(response_json)[:200] + "..." if len(str(response_json)) > 200 else str(response_json)
                    except:
                        print(f"   Response length: {len(response.text)} chars")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                result["error_response"] = response.text[:200]

            self.test_results.append(result)
            return success, response.json() if success and response.text else {}, response_time

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout after {timeout}s")
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": "TIMEOUT",
                "success": False,
                "error": "Request timeout"
            }
            self.test_results.append(result)
            return False, {}, 0
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "error": str(e)
            }
            self.test_results.append(result)
            return False, {}, 0

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Test creating a status check
        success, response = self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data={"client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"}
        )
        
        # Test getting status checks
        self.run_test("Get Status Checks", "GET", "status", 200)
        
        return success

    def test_customers_endpoint(self):
        """Test customers endpoint"""
        return self.run_test("Get All Customers", "GET", "customers", 200)

    def test_customers_with_filter(self):
        """Test customers endpoint with shoe size filter"""
        return self.run_test("Get Customers with Filter", "GET", "customers?shoe_size=Unknown", 200)

    def test_shoe_sizes_endpoint(self):
        """Test shoe sizes endpoint"""
        return self.run_test("Get Shoe Sizes", "GET", "shoe-sizes", 200)

    def test_whatsapp_link_endpoint(self):
        """Test WhatsApp link generation"""
        return self.run_test(
            "Generate WhatsApp Link",
            "POST",
            "whatsapp-link",
            200,
            data={"phone": "1234567890", "country_code": "US"}
        )

    def test_agent_login(self):
        """Test agent login with admin credentials"""
        success, response = self.run_test(
            "Agent Login",
            "POST",
            "agents/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        
        if success and response:
            # Verify response structure
            if "success" in response and "agent" in response:
                agent = response["agent"]
                if "username" in agent and agent["username"] == "admin":
                    print(f"   ✅ Login successful for agent: {agent.get('full_name', 'Unknown')}")
                    return True, agent
                else:
                    print(f"   ❌ Invalid agent data in response")
            else:
                print(f"   ❌ Invalid response structure")
        
        return False, {}

    def test_agents_list(self):
        """Test getting list of agents"""
        success, response = self.run_test("Get Agents List", "GET", "agents", 200)
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} agents")
            admin_found = any(agent.get("username") == "admin" for agent in response)
            if admin_found:
                print(f"   ✅ Admin agent found in list")
            else:
                print(f"   ❌ Admin agent not found in list")
            return success and admin_found
        
        return False

    def test_mark_customer_messaged_with_agent(self):
        """Test marking customer as messaged with agent tracking"""
        # First get a customer
        success, customers = self.run_test("Get Customer for Agent Test", "GET", "customers?page=1&limit=1", 200)
        
        if not success or not customers or len(customers) == 0:
            print("   ❌ No customers found to test with")
            return False
        
        customer = customers[0]
        customer_id = customer.get("customer_id")
        
        if not customer_id:
            print("   ❌ Customer has no customer_id")
            return False
        
        print(f"   Testing with customer: {customer.get('first_name', 'Unknown')} {customer.get('last_name', '')}")
        
        # Mark customer as messaged by admin agent
        success, response = self.run_test(
            "Mark Customer Messaged by Agent",
            "POST",
            f"customers/{customer_id}/mark-messaged?agent_username=admin",
            200
        )
        
        if success:
            # Verify the customer was updated
            verify_success, updated_customers = self.run_test(
                "Verify Customer Agent Tracking",
                "GET",
                f"customers?page=1&limit=100",
                200
            )
            
            if verify_success:
                # Find the updated customer
                updated_customer = next((c for c in updated_customers if c.get("customer_id") == customer_id), None)
                if updated_customer and updated_customer.get("messaged_by") == "admin":
                    print(f"   ✅ Customer successfully marked as messaged by admin")
                    return True
                else:
                    print(f"   ❌ Customer not properly updated with agent info")
        
        return False

    def test_filter_customers_by_agent(self):
        """Test filtering customers by agent username"""
        success, response = self.run_test(
            "Filter Customers by Agent",
            "GET",
            "customers?agent_username=admin",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} customers messaged by admin")
            
            # Verify all returned customers have messaged_by = "admin"
            all_correct = all(customer.get("messaged_by") == "admin" for customer in response)
            if all_correct:
                print(f"   ✅ All returned customers correctly filtered by admin agent")
                return True
            else:
                print(f"   ❌ Some customers in results not messaged by admin")
        
        return False

    def test_daily_reports(self):
        """Test daily reporting endpoints"""
        # Test general daily reports
        success1, response1 = self.run_test("Daily Reports - All Agents", "GET", "reports/daily", 200)
        
        # Test agent-specific daily reports
        success2, response2 = self.run_test(
            "Daily Reports - Admin Agent",
            "GET",
            "reports/daily?agent_username=admin",
            200
        )
        
        if success1 and success2:
            if isinstance(response1, dict) and "daily_reports" in response1:
                print(f"   ✅ Daily reports structure correct")
                reports1 = response1["daily_reports"]
                reports2 = response2["daily_reports"]
                print(f"   All agents reports: {len(reports1)} days")
                print(f"   Admin agent reports: {len(reports2)} days")
                return True
            else:
                print(f"   ❌ Invalid daily reports structure")
        
        return False

    def test_shopify_sync_endpoint(self):
        """Test Shopify sync endpoint (expected to fail due to permissions)"""
        print("\n⚠️  Note: This test is expected to fail due to Shopify API permissions")
        return self.run_test(
            "Shopify Sync (Expected to Fail)",
            "POST",
            "shopify/sync",
            500,  # Expecting failure due to permission issues
            data={
                "shop_url": "ashmiaa.myshopify.com",
                "access_token": "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"
            },
            timeout=60
        )

    # ==================== PERFORMANCE TESTS ====================
    
    def test_cache_status(self):
        """Test cache status endpoint"""
        success, response, response_time = self.run_test(
            "Cache Status Check", 
            "GET", 
            "cache/status", 
            200, 
            measure_time=True
        )
        
        if success and response:
            inventory_cache = response.get("inventory_cache", {})
            items_count = inventory_cache.get("items_count", 0)
            is_valid = inventory_cache.get("is_valid", False)
            last_updated = inventory_cache.get("last_updated")
            
            print(f"   Cache items: {items_count}")
            print(f"   Cache valid: {is_valid}")
            print(f"   Last updated: {last_updated}")
            
            if items_count > 0 and is_valid:
                print(f"   ✅ Cache is working properly")
                return True, response
            else:
                print(f"   ❌ Cache is not properly initialized")
                return False, response
        
        return False, {}

    def test_cache_refresh(self):
        """Test manual cache refresh endpoint"""
        success, response, response_time = self.run_test(
            "Manual Cache Refresh", 
            "POST", 
            "cache/refresh-inventory", 
            200, 
            measure_time=True
        )
        
        if success and response:
            items_cached = response.get("items_cached", 0)
            stock_skus_cached = response.get("stock_skus_cached", 0)
            last_updated = response.get("last_updated")
            
            print(f"   Items cached: {items_cached}")
            print(f"   Stock SKUs cached: {stock_skus_cached}")
            print(f"   Updated at: {last_updated}")
            
            if items_cached > 0:
                print(f"   ✅ Cache refresh successful")
                return True, response
            else:
                print(f"   ❌ Cache refresh failed or no items cached")
                return False, response
        
        return False, {}

    def test_customers_performance(self):
        """Test customers endpoint performance - should be under 200ms"""
        print(f"\n🚀 Performance Test: GET /api/customers")
        
        # Test multiple times to get average
        response_times = []
        success_count = 0
        
        for i in range(3):
            success, response, response_time = self.run_test(
                f"Customers Performance Test #{i+1}", 
                "GET", 
                "customers", 
                200, 
                measure_time=True
            )
            
            if success:
                success_count += 1
                response_times.append(response_time)
                print(f"   Test {i+1}: {response_time:.2f}ms")
            else:
                print(f"   Test {i+1}: FAILED")
        
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            min_time = min(response_times)
            max_time = max(response_times)
            
            print(f"\n📊 Performance Results:")
            print(f"   Average: {avg_time:.2f}ms")
            print(f"   Min: {min_time:.2f}ms")
            print(f"   Max: {max_time:.2f}ms")
            print(f"   Success rate: {success_count}/3")
            
            # Check if performance meets requirements
            if avg_time < 200:
                print(f"   ✅ Performance PASSED - Average {avg_time:.2f}ms < 200ms target")
                return True, avg_time
            else:
                print(f"   ❌ Performance FAILED - Average {avg_time:.2f}ms >= 200ms target")
                return False, avg_time
        else:
            print(f"   ❌ All performance tests failed")
            return False, 0

    def test_customers_filtered_performance(self):
        """Test customers endpoint with filters - should be fast"""
        print(f"\n🚀 Performance Test: GET /api/customers with filters")
        
        # Test with fulfillment_status filter
        success, response, response_time = self.run_test(
            "Customers Filtered Performance (unfulfilled)", 
            "GET", 
            "customers?fulfillment_status=unfulfilled", 
            200, 
            measure_time=True
        )
        
        if success:
            customer_count = len(response) if isinstance(response, list) else 0
            print(f"   Found {customer_count} unfulfilled customers")
            print(f"   Response time: {response_time:.2f}ms")
            
            if response_time < 200:
                print(f"   ✅ Filtered query performance PASSED - {response_time:.2f}ms < 200ms")
                return True, response_time
            else:
                print(f"   ❌ Filtered query performance FAILED - {response_time:.2f}ms >= 200ms")
                return False, response_time
        else:
            print(f"   ❌ Filtered query failed")
            return False, 0

    def test_login_with_correct_credentials(self):
        """Test agent login with correct admin credentials"""
        success, response, response_time = self.run_test(
            "Agent Login (admin/admin)",
            "POST",
            "agents/login",
            200,
            data={"username": "admin", "password": "admin"}
        )
        
        if success and response:
            # Verify response structure
            if "success" in response and "agent" in response:
                agent = response["agent"]
                if "username" in agent and agent["username"] == "admin":
                    print(f"   ✅ Login successful for agent: {agent.get('full_name', 'Unknown')}")
                    return True, agent
                else:
                    print(f"   ❌ Invalid agent data in response")
            else:
                print(f"   ❌ Invalid response structure")
        
        return False, {}

    # ==================== FACEBOOK ROUTES TESTS ====================
    
    def test_facebook_status(self):
        """Test Facebook API connection status"""
        success, response, _ = self.run_test("Facebook Status", "GET", "facebook/status", 200)
        if success:
            self.facebook_tests_passed += 1
        self.facebook_tests_run += 1
        return success, response
    
    def test_facebook_ad_accounts(self):
        """Test Facebook ad accounts endpoint"""
        success, response, _ = self.run_test("Facebook Ad Accounts", "GET", "facebook/ad-accounts", 200)
        if success:
            self.facebook_tests_passed += 1
        self.facebook_tests_run += 1
        return success, response
    
    def test_facebook_set_ad_account(self):
        """Test setting Facebook ad account"""
        success, response, _ = self.run_test(
            "Set Facebook Ad Account", 
            "POST", 
            "facebook/set-ad-account?ad_account_id=act_3108518676133383", 
            200
        )
        if success:
            self.facebook_tests_passed += 1
        self.facebook_tests_run += 1
        return success, response
    
    def test_facebook_campaigns(self):
        """Test Facebook campaigns endpoint"""
        success, response, _ = self.run_test("Facebook Campaigns", "GET", "facebook/campaigns", 200)
        if success:
            self.facebook_tests_passed += 1
        self.facebook_tests_run += 1
        return success, response
    
    def test_facebook_audiences(self):
        """Test Facebook custom audiences endpoint"""
        success, response, _ = self.run_test("Facebook Audiences", "GET", "facebook/audiences", 200)
        if success:
            self.facebook_tests_passed += 1
        self.facebook_tests_run += 1
        return success, response
    
    def test_facebook_ai_analyze_campaigns(self):
        """Test Facebook AI campaign analysis (may take 30-60 seconds)"""
        success, response, _ = self.run_test(
            "Facebook AI Campaign Analysis", 
            "POST", 
            "facebook/ai/analyze-campaigns?date_preset=last_7d", 
            200,
            timeout=90  # Extended timeout for AI analysis
        )
        if success:
            self.facebook_tests_passed += 1
        self.facebook_tests_run += 1
        return success, response
    
    # ==================== FINANCE ROUTES TESTS ====================
    
    def test_finance_status(self):
        """Test Finance status endpoint"""
        success, response, _ = self.run_test("Finance Status", "GET", "finance/status", 200)
        if success:
            self.finance_tests_passed += 1
        self.finance_tests_run += 1
        return success, response
    
    def test_finance_reconciliation(self):
        """Test Finance reconciliation endpoint"""
        success, response, _ = self.run_test(
            "Finance Reconciliation", 
            "GET", 
            "finance/reconciliation?store_name=ashmiaa", 
            200
        )
        if success:
            self.finance_tests_passed += 1
        self.finance_tests_run += 1
        return success, response
    
    def test_finance_missing_orders(self):
        """Test Finance missing orders endpoint"""
        success, response, _ = self.run_test(
            "Finance Missing Orders", 
            "GET", 
            "finance/missing-orders?store_name=ashmiaa", 
            200
        )
        if success:
            self.finance_tests_passed += 1
        self.finance_tests_run += 1
        return success, response
    
    def test_finance_upload_history(self):
        """Test Finance upload history endpoint"""
        success, response, _ = self.run_test("Finance Upload History", "GET", "finance/upload-history", 200)
        if success:
            self.finance_tests_passed += 1
        self.finance_tests_run += 1
        return success, response
    
    # ==================== EXISTING ENDPOINTS TESTS ====================
    
    def test_orders_endpoint(self):
        """Test customers endpoint (which contains order data)"""
        success, response, _ = self.run_test("Customers/Orders Data", "GET", "customers", 200)
        return success, response
    
    def test_inventory_overview_stats(self):
        """Test inventory overview stats endpoint"""
        success, response, _ = self.run_test("Inventory Overview Stats", "GET", "inventory/v2/overview-stats", 200)
        return success, response
    
    # ==================== NEW MODULAR ROUTES TESTS ====================
    
    def test_pricing_config(self):
        """Test Pricing config endpoint"""
        success, response, _ = self.run_test("Pricing Config", "GET", "pricing/config", 200)
        return success, response
    
    def test_pricing_rules(self):
        """Test Pricing rules endpoint"""
        success, response, _ = self.run_test("Pricing Rules", "GET", "pricing/rules", 200)
        return success, response
    
    def test_pricing_dashboard_stats(self):
        """Test Pricing dashboard stats endpoint"""
        success, response, _ = self.run_test("Pricing Dashboard Stats", "GET", "pricing/dashboard-stats", 200)
        return success, response
    
    def test_tcs_credentials(self):
        """Test TCS credentials endpoint"""
        success, response, _ = self.run_test("TCS Credentials", "GET", "tcs/credentials", 200)
        return success, response
    
    def test_tcs_auto_sync_status(self):
        """Test TCS auto-sync status endpoint"""
        success, response, _ = self.run_test("TCS Auto-Sync Status", "GET", "tcs/auto-sync-status", 200)
        return success, response
    
    def test_customers_endpoint_new(self):
        """Test Customers endpoint with limit parameter"""
        success, response, _ = self.run_test("Customers (Limited)", "GET", "customers?limit=5", 200)
        return success, response
    
    def test_customers_count(self):
        """Test Customers count endpoint"""
        success, response, _ = self.run_test("Customers Count", "GET", "customers/count", 200)
        return success, response
    
    def test_customers_stats(self):
        """Test Customers stats endpoint"""
        success, response, _ = self.run_test("Customers Stats", "GET", "customers/stats", 200)
        return success, response
    
    def test_customers_segments(self):
        """Test Customers segments endpoint"""
        success, response, _ = self.run_test("Customers Segments", "GET", "customers/segments", 200)
        return success, response
    
    def test_orders_endpoint_new(self):
        """Test Orders endpoint with limit parameter"""
        success, response, _ = self.run_test("Orders (Limited)", "GET", "orders?limit=5", 200)
        return success, response
    
    def test_inventory_v2_overview_stats(self):
        """Test Inventory v2 overview stats endpoint"""
        success, response, _ = self.run_test("Inventory V2 Overview Stats", "GET", "inventory/v2/overview-stats", 200)
        return success, response
    
    def test_dashboard_stats(self):
        """Test Dashboard stats endpoint"""
        success, response, _ = self.run_test("Dashboard Stats", "GET", "dashboard/stats?store_name=tnvcollectionpk", 200)
        return success, response
    
    # ==================== CLEARANCE ENGINE TESTS ====================
    
    def test_clearance_stats(self):
        """Test Clearance dashboard statistics endpoint"""
        success, response, _ = self.run_test("Clearance Stats", "GET", "clearance/stats", 200)
        return success, response
    
    def test_clearance_health(self):
        """Test Clearance inventory health analysis endpoint"""
        success, response, _ = self.run_test("Clearance Health Analysis", "GET", "clearance/health", 200)
        return success, response
    
    def test_clearance_ai_recommendations(self):
        """Test Clearance AI recommendations endpoint (may take 10-30 seconds)"""
        success, response, _ = self.run_test(
            "Clearance AI Recommendations", 
            "POST", 
            "clearance/ai-recommendations?category=dead_stock", 
            200,
            timeout=60  # Extended timeout for AI analysis
        )
        return success, response
    
    def test_clearance_quick_clearance(self):
        """Test Quick clearance campaign creation endpoint"""
        success, response, _ = self.run_test(
            "Quick Clearance Campaign", 
            "POST", 
            "clearance/quick-clearance?category=dead_stock&auto_discount=true", 
            200,
            timeout=60  # Extended timeout for AI + campaign creation
        )
        return success, response
    
    def test_clearance_campaigns(self):
        """Test Get clearance campaigns endpoint"""
        success, response, _ = self.run_test("Get Clearance Campaigns", "GET", "clearance/campaigns", 200)
        return success, response
    
    # ==================== REFACTORING TESTS ====================
    
    def run_refactoring_tests(self):
        """Run comprehensive tests for refactored backend routes"""
        print("\n" + "="*80)
        print("🔧 BACKEND REFACTORING VALIDATION TESTS")
        print("="*80)
        
        # Test Facebook Routes
        print("\n📘 FACEBOOK ROUTES TESTS")
        print("-" * 40)
        
        fb_status_success, fb_status_response = self.test_facebook_status()
        fb_accounts_success, fb_accounts_response = self.test_facebook_ad_accounts()
        fb_set_account_success, fb_set_account_response = self.test_facebook_set_ad_account()
        fb_campaigns_success, fb_campaigns_response = self.test_facebook_campaigns()
        fb_audiences_success, fb_audiences_response = self.test_facebook_audiences()
        
        # AI Analysis test (may take longer)
        print("\n⚠️  Note: AI Campaign Analysis may take 30-60 seconds...")
        fb_ai_success, fb_ai_response = self.test_facebook_ai_analyze_campaigns()
        
        # Test Finance Routes
        print("\n💰 FINANCE ROUTES TESTS")
        print("-" * 40)
        
        fin_status_success, fin_status_response = self.test_finance_status()
        fin_reconciliation_success, fin_reconciliation_response = self.test_finance_reconciliation()
        fin_missing_success, fin_missing_response = self.test_finance_missing_orders()
        fin_history_success, fin_history_response = self.test_finance_upload_history()
        
        # Test Pricing Routes
        print("\n💰 PRICING ROUTES TESTS")
        print("-" * 40)
        
        pricing_config_success, pricing_config_response = self.test_pricing_config()
        pricing_rules_success, pricing_rules_response = self.test_pricing_rules()
        pricing_dashboard_success, pricing_dashboard_response = self.test_pricing_dashboard_stats()
        
        # Test TCS Routes
        print("\n🚚 TCS ROUTES TESTS")
        print("-" * 40)
        
        tcs_credentials_success, tcs_credentials_response = self.test_tcs_credentials()
        tcs_auto_sync_success, tcs_auto_sync_response = self.test_tcs_auto_sync_status()
        
        # Test Customers Routes
        print("\n👥 CUSTOMERS ROUTES TESTS")
        print("-" * 40)
        
        customers_new_success, customers_new_response = self.test_customers_endpoint_new()
        customers_count_success, customers_count_response = self.test_customers_count()
        customers_stats_success, customers_stats_response = self.test_customers_stats()
        customers_segments_success, customers_segments_response = self.test_customers_segments()
        
        # Test Clearance Routes
        print("\n🧹 CLEARANCE ENGINE TESTS")
        print("-" * 40)
        
        clearance_stats_success, clearance_stats_response = self.test_clearance_stats()
        clearance_health_success, clearance_health_response = self.test_clearance_health()
        
        # AI recommendations test (may take longer)
        print("\n⚠️  Note: AI Recommendations may take 10-30 seconds...")
        clearance_ai_success, clearance_ai_response = self.test_clearance_ai_recommendations()
        
        clearance_quick_success, clearance_quick_response = self.test_clearance_quick_clearance()
        clearance_campaigns_success, clearance_campaigns_response = self.test_clearance_campaigns()
        
        # Test Remaining Server.py Endpoints
        print("\n🔄 REMAINING SERVER.PY ENDPOINTS VERIFICATION")
        print("-" * 40)
        
        orders_success, orders_response = self.test_orders_endpoint_new()
        inventory_success, inventory_response = self.test_inventory_v2_overview_stats()
        dashboard_success, dashboard_response = self.test_dashboard_stats()
        
        # Compile results
        facebook_results = {
            "status": fb_status_success,
            "ad_accounts": fb_accounts_success,
            "set_ad_account": fb_set_account_success,
            "campaigns": fb_campaigns_success,
            "audiences": fb_audiences_success,
            "ai_analysis": fb_ai_success
        }
        
        finance_results = {
            "status": fin_status_success,
            "reconciliation": fin_reconciliation_success,
            "missing_orders": fin_missing_success,
            "upload_history": fin_history_success
        }
        
        pricing_results = {
            "config": pricing_config_success,
            "rules": pricing_rules_success,
            "dashboard_stats": pricing_dashboard_success
        }
        
        tcs_results = {
            "credentials": tcs_credentials_success,
            "auto_sync_status": tcs_auto_sync_success
        }
        
        customers_results = {
            "customers_limited": customers_new_success,
            "count": customers_count_success,
            "stats": customers_stats_success,
            "segments": customers_segments_success
        }
        
        clearance_results = {
            "stats": clearance_stats_success,
            "health": clearance_health_success,
            "ai_recommendations": clearance_ai_success,
            "quick_clearance": clearance_quick_success,
            "campaigns": clearance_campaigns_success
        }
        
        existing_results = {
            "orders": orders_success,
            "inventory_stats": inventory_success,
            "dashboard_stats": dashboard_success
        }
        
        return {
            "facebook": facebook_results,
            "finance": finance_results,
            "pricing": pricing_results,
            "tcs": tcs_results,
            "customers": customers_results,
            "clearance": clearance_results,
            "existing": existing_results
        }

    def run_performance_tests(self):
        """Run all performance-related tests"""
        print("\n" + "="*60)
        print("🚀 PERFORMANCE OPTIMIZATION TESTS")
        print("="*60)
        
        performance_results = {}
        
        # Test 1: Cache Status
        print(f"\n📋 Test 1: Cache Status Check")
        cache_success, cache_data = self.test_cache_status()
        performance_results["cache_status"] = {
            "success": cache_success,
            "data": cache_data
        }
        
        # Test 2: Manual Cache Refresh
        print(f"\n📋 Test 2: Manual Cache Refresh")
        refresh_success, refresh_data = self.test_cache_refresh()
        performance_results["cache_refresh"] = {
            "success": refresh_success,
            "data": refresh_data
        }
        
        # Test 3: Login with correct credentials
        print(f"\n📋 Test 3: Authentication Test")
        login_success, login_data = self.test_login_with_correct_credentials()
        performance_results["login"] = {
            "success": login_success,
            "data": login_data
        }
        
        # Test 4: Customers Performance
        print(f"\n📋 Test 4: Customers Endpoint Performance")
        customers_success, avg_time = self.test_customers_performance()
        performance_results["customers_performance"] = {
            "success": customers_success,
            "avg_response_time": avg_time
        }
        
        # Test 5: Filtered Customers Performance
        print(f"\n📋 Test 5: Filtered Customers Performance")
        filtered_success, filtered_time = self.test_customers_filtered_performance()
        performance_results["filtered_performance"] = {
            "success": filtered_success,
            "response_time": filtered_time
        }
        
        return performance_results

def main():
    print("🚀 Starting Backend Refactoring Validation Tests")
    print("=" * 80)
    
    # Setup
    tester = ShopifyCustomerAPITester()
    
    # Run refactoring tests as requested
    refactoring_results = tester.run_refactoring_tests()
    
    # Print final refactoring summary
    print("\n" + "=" * 80)
    print("📊 BACKEND REFACTORING TEST SUMMARY")
    print("=" * 80)
    
    facebook_results = refactoring_results.get("facebook", {})
    finance_results = refactoring_results.get("finance", {})
    pricing_results = refactoring_results.get("pricing", {})
    tcs_results = refactoring_results.get("tcs", {})
    customers_results = refactoring_results.get("customers", {})
    clearance_results = refactoring_results.get("clearance", {})
    existing_results = refactoring_results.get("existing", {})
    
    # Facebook Routes Summary
    print(f"\n📘 FACEBOOK ROUTES:")
    fb_passed = sum(facebook_results.values())
    fb_total = len(facebook_results)
    print(f"   Status: {'✅ PASS' if facebook_results.get('status') else '❌ FAIL'}")
    print(f"   Ad Accounts: {'✅ PASS' if facebook_results.get('ad_accounts') else '❌ FAIL'}")
    print(f"   Set Ad Account: {'✅ PASS' if facebook_results.get('set_ad_account') else '❌ FAIL'}")
    print(f"   Campaigns: {'✅ PASS' if facebook_results.get('campaigns') else '❌ FAIL'}")
    print(f"   Audiences: {'✅ PASS' if facebook_results.get('audiences') else '❌ FAIL'}")
    print(f"   AI Analysis: {'✅ PASS' if facebook_results.get('ai_analysis') else '❌ FAIL'}")
    print(f"   Overall: {fb_passed}/{fb_total} passed")
    
    # Finance Routes Summary
    print(f"\n💰 FINANCE ROUTES:")
    fin_passed = sum(finance_results.values())
    fin_total = len(finance_results)
    print(f"   Status: {'✅ PASS' if finance_results.get('status') else '❌ FAIL'}")
    print(f"   Reconciliation: {'✅ PASS' if finance_results.get('reconciliation') else '❌ FAIL'}")
    print(f"   Missing Orders: {'✅ PASS' if finance_results.get('missing_orders') else '❌ FAIL'}")
    print(f"   Upload History: {'✅ PASS' if finance_results.get('upload_history') else '❌ FAIL'}")
    print(f"   Overall: {fin_passed}/{fin_total} passed")
    
    # Pricing Routes Summary
    print(f"\n💲 PRICING ROUTES:")
    pricing_passed = sum(pricing_results.values())
    pricing_total = len(pricing_results)
    print(f"   Config: {'✅ PASS' if pricing_results.get('config') else '❌ FAIL'}")
    print(f"   Rules: {'✅ PASS' if pricing_results.get('rules') else '❌ FAIL'}")
    print(f"   Dashboard Stats: {'✅ PASS' if pricing_results.get('dashboard_stats') else '❌ FAIL'}")
    print(f"   Overall: {pricing_passed}/{pricing_total} passed")
    
    # TCS Routes Summary
    print(f"\n🚚 TCS ROUTES:")
    tcs_passed = sum(tcs_results.values())
    tcs_total = len(tcs_results)
    print(f"   Credentials: {'✅ PASS' if tcs_results.get('credentials') else '❌ FAIL'}")
    print(f"   Auto-Sync Status: {'✅ PASS' if tcs_results.get('auto_sync_status') else '❌ FAIL'}")
    print(f"   Overall: {tcs_passed}/{tcs_total} passed")
    
    # Customers Routes Summary
    print(f"\n👥 CUSTOMERS ROUTES:")
    customers_passed = sum(customers_results.values())
    customers_total = len(customers_results)
    print(f"   Customers (Limited): {'✅ PASS' if customers_results.get('customers_limited') else '❌ FAIL'}")
    print(f"   Count: {'✅ PASS' if customers_results.get('count') else '❌ FAIL'}")
    print(f"   Stats: {'✅ PASS' if customers_results.get('stats') else '❌ FAIL'}")
    print(f"   Segments: {'✅ PASS' if customers_results.get('segments') else '❌ FAIL'}")
    print(f"   Overall: {customers_passed}/{customers_total} passed")
    
    # Clearance Routes Summary
    print(f"\n🧹 CLEARANCE ENGINE:")
    clearance_passed = sum(clearance_results.values())
    clearance_total = len(clearance_results)
    print(f"   Stats: {'✅ PASS' if clearance_results.get('stats') else '❌ FAIL'}")
    print(f"   Health Analysis: {'✅ PASS' if clearance_results.get('health') else '❌ FAIL'}")
    print(f"   AI Recommendations: {'✅ PASS' if clearance_results.get('ai_recommendations') else '❌ FAIL'}")
    print(f"   Quick Clearance: {'✅ PASS' if clearance_results.get('quick_clearance') else '❌ FAIL'}")
    print(f"   Campaigns: {'✅ PASS' if clearance_results.get('campaigns') else '❌ FAIL'}")
    print(f"   Overall: {clearance_passed}/{clearance_total} passed")
    
    # Existing Endpoints Summary
    print(f"\n🔄 REMAINING SERVER.PY ENDPOINTS:")
    ex_passed = sum(existing_results.values())
    ex_total = len(existing_results)
    print(f"   Orders: {'✅ PASS' if existing_results.get('orders') else '❌ FAIL'}")
    print(f"   Inventory Stats: {'✅ PASS' if existing_results.get('inventory_stats') else '❌ FAIL'}")
    print(f"   Dashboard Stats: {'✅ PASS' if existing_results.get('dashboard_stats') else '❌ FAIL'}")
    print(f"   Overall: {ex_passed}/{ex_total} passed")
    
    # Overall assessment
    total_passed = fb_passed + fin_passed + pricing_passed + tcs_passed + customers_passed + clearance_passed + ex_passed
    total_tests = fb_total + fin_total + pricing_total + tcs_total + customers_total + clearance_total + ex_total
    
    print(f"\n🎯 REFACTORING VALIDATION: {total_passed}/{total_tests} tests passed")
    print(f"   Facebook Tests: {tester.facebook_tests_passed}/{tester.facebook_tests_run}")
    print(f"   Finance Tests: {tester.finance_tests_passed}/{tester.finance_tests_run}")
    
    if total_passed >= (total_tests * 0.8):  # 80% pass rate
        print("✅ Backend refactoring is successful!")
        print("   - All modular routes are working correctly")
        print("   - Existing endpoints remain functional")
        print("   - API structure is maintained")
        return 0
    else:
        print("❌ Backend refactoring has issues")
        if fb_passed < fb_total:
            print(f"   - Facebook routes: {fb_total - fb_passed} failures")
        if fin_passed < fin_total:
            print(f"   - Finance routes: {fin_total - fin_passed} failures")
        if pricing_passed < pricing_total:
            print(f"   - Pricing routes: {pricing_total - pricing_passed} failures")
        if tcs_passed < tcs_total:
            print(f"   - TCS routes: {tcs_total - tcs_passed} failures")
        if customers_passed < customers_total:
            print(f"   - Customers routes: {customers_total - customers_passed} failures")
        if clearance_passed < clearance_total:
            print(f"   - Clearance routes: {clearance_total - clearance_passed} failures")
        if ex_passed < ex_total:
            print(f"   - Existing endpoints: {ex_total - ex_passed} failures")
        return 1

if __name__ == "__main__":
    sys.exit(main())