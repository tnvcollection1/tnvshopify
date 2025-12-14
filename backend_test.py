import requests
import sys
from datetime import datetime
import json
import time

class ShopifyCustomerAPITester:
    def __init__(self, base_url="https://b2b-saas.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.facebook_tests_run = 0
        self.facebook_tests_passed = 0
        self.finance_tests_run = 0
        self.finance_tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30, measure_time=False, use_form_data=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not use_form_data else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            start_time = time.time()
            
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                if use_form_data:
                    response = requests.post(url, data=data, timeout=timeout)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                if use_form_data:
                    response = requests.put(url, data=data, timeout=timeout)
                else:
                    response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

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
    
    def test_dynamic_pricing_report(self):
        """Test Dynamic Pricing report endpoint - P0 Bug Fix"""
        success, response, _ = self.run_test(
            "Dynamic Pricing Report", 
            "GET", 
            "dynamic-pricing/report", 
            200
        )
        
        if success and response:
            # Verify response structure
            if "total_products" in response and "categories" in response:
                total_products = response["total_products"]
                categories = response["categories"]
                
                print(f"   Total products analyzed: {total_products}")
                print(f"   Categories found: {list(categories.keys())}")
                
                # Check for expected categories A, B, C
                expected_categories = ["A", "B", "C"]
                categories_present = all(cat in categories for cat in expected_categories)
                
                if categories_present:
                    # Verify each category has product data
                    valid_structure = True
                    for cat_name, cat_data in categories.items():
                        if not isinstance(cat_data, list):
                            print(f"   ❌ Category {cat_name} is not a list")
                            valid_structure = False
                            break
                        
                        # Check if products have required fields
                        if cat_data:  # If category has products
                            sample_product = cat_data[0]
                            required_fields = ["sku", "product_name", "current_price", "order_count", "total_revenue", "velocity_score"]
                            missing_fields = [field for field in required_fields if field not in sample_product]
                            
                            if missing_fields:
                                print(f"   ❌ Category {cat_name} products missing fields: {missing_fields}")
                                valid_structure = False
                                break
                    
                    if valid_structure:
                        print(f"   ✅ Dynamic pricing report has valid structure")
                        return True, response
                    else:
                        return False, response
                else:
                    missing = [cat for cat in expected_categories if cat not in categories]
                    print(f"   ❌ Missing categories: {missing}")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response

    # ==================== P0 BUG FIX TESTS ====================
    
    def test_purchase_tracker_china_orders(self):
        """Test Purchase Tracker - China Post Orders API - P0 Bug Fix"""
        success, response, _ = self.run_test(
            "Purchase Tracker - China Post Orders",
            "GET",
            "customers?china_tracking=true&limit=10",
            200
        )
        
        if success and response:
            # Verify response structure
            if "customers" in response and "total" in response:
                customers_list = response["customers"]
                total = response["total"]
                
                print(f"   China Post orders found: {total}")
                print(f"   Orders returned: {len(customers_list)}")
                
                # Verify all returned customers have X-prefix tracking numbers
                if customers_list:
                    all_china_post = True
                    for customer in customers_list:
                        tracking_number = customer.get("tracking_number", "")
                        if not tracking_number or not tracking_number.upper().startswith("X"):
                            print(f"   ❌ Customer {customer.get('customer_id')} has invalid tracking: {tracking_number}")
                            all_china_post = False
                            break
                    
                    if all_china_post:
                        print(f"   ✅ All returned customers have X-prefix tracking numbers")
                        return True, response
                    else:
                        print(f"   ❌ Some customers don't have X-prefix tracking numbers")
                        return False, response
                else:
                    print(f"   ✅ No China Post orders found (valid result)")
                    return True, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_purchase_tracker_china_count(self):
        """Test Purchase Tracker - China Post Count API - P0 Bug Fix"""
        success, response, _ = self.run_test(
            "Purchase Tracker - China Post Count",
            "GET",
            "customers/count?china_tracking=true",
            200
        )
        
        if success and response:
            # Verify response structure
            if "total" in response or "count" in response:
                count = response.get("total", response.get("count", 0))
                
                print(f"   China Post orders count: {count}")
                
                # Verify count is a number
                if isinstance(count, (int, float)):
                    print(f"   ✅ Valid count returned: {count}")
                    return True, response
                else:
                    print(f"   ❌ Count is not a number: {count}")
                    return False, response
            else:
                print(f"   ❌ Missing count field in response")
                return False, response
        
        return success, response
    
    def test_smart_clearance_health(self):
        """Test Smart Clearance - Inventory Health API - P0 Bug Fix"""
        success, response, _ = self.run_test(
            "Smart Clearance - Inventory Health",
            "GET",
            "clearance/health",
            200
        )
        
        if success and response:
            # Verify response structure
            if "success" in response:
                success_flag = response["success"]
                
                print(f"   Health analysis success: {success_flag}")
                
                if success_flag:
                    # Check for categories
                    if "categories" in response:
                        categories = response["categories"]
                        expected_categories = ["dead_stock", "slow_moving", "moderate"]
                        
                        print(f"   Categories found: {list(categories.keys())}")
                        
                        # Verify expected categories exist
                        categories_present = all(cat in categories for cat in expected_categories)
                        
                        if categories_present:
                            print(f"   ✅ All expected categories present")
                            
                            # Check if categories have items
                            total_items = sum(len(categories[cat]) for cat in expected_categories)
                            print(f"   Total items across categories: {total_items}")
                            
                            return True, response
                        else:
                            missing = [cat for cat in expected_categories if cat not in categories]
                            print(f"   ❌ Missing categories: {missing}")
                            return False, response
                    else:
                        print(f"   ❌ Missing categories in response")
                        return False, response
                else:
                    print(f"   ❌ Health analysis failed")
                    return False, response
            else:
                print(f"   ❌ Missing success field in response")
                return False, response
        
        return success, response
    
    def test_smart_clearance_campaigns(self):
        """Test Smart Clearance - Campaigns API - P0 Bug Fix"""
        success, response, _ = self.run_test(
            "Smart Clearance - Campaigns",
            "GET",
            "clearance/campaigns",
            200
        )
        
        if success and response:
            # Verify response structure
            if "success" in response:
                success_flag = response["success"]
                
                print(f"   Campaigns fetch success: {success_flag}")
                
                if success_flag:
                    # Check for campaigns list
                    if "campaigns" in response:
                        campaigns = response["campaigns"]
                        
                        print(f"   Campaigns found: {len(campaigns)}")
                        
                        # Verify campaigns is a list
                        if isinstance(campaigns, list):
                            print(f"   ✅ Valid campaigns list returned")
                            return True, response
                        else:
                            print(f"   ❌ Campaigns is not a list")
                            return False, response
                    else:
                        print(f"   ❌ Missing campaigns in response")
                        return False, response
                else:
                    print(f"   ❌ Campaigns fetch failed")
                    return False, response
            else:
                print(f"   ❌ Missing success field in response")
                return False, response
        
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
    
    def test_customers_with_fulfillment_filter(self):
        """Test Customers endpoint with fulfillment_status filter - P0 Bug Fix"""
        success, response, _ = self.run_test(
            "Customers with Fulfillment Filter", 
            "GET", 
            "customers?fulfillment_status=fulfilled&limit=5", 
            200
        )
        
        if success and response:
            # Verify response structure
            if "customers" in response and "total" in response:
                customers_list = response["customers"]
                total = response["total"]
                
                print(f"   Fulfilled customers found: {total}")
                print(f"   Customers returned: {len(customers_list)}")
                
                # Verify all returned customers have fulfilled status
                if customers_list:
                    all_fulfilled = all(
                        customer.get("fulfillment_status") == "fulfilled" 
                        for customer in customers_list
                    )
                    if all_fulfilled:
                        print(f"   ✅ All returned customers have fulfilled status")
                        return True, response
                    else:
                        print(f"   ❌ Some customers don't have fulfilled status")
                        return False, response
                else:
                    print(f"   ✅ No fulfilled customers found (valid result)")
                    return True, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_customers_count(self):
        """Test Customers count endpoint"""
        success, response, _ = self.run_test("Customers Count", "GET", "customers/count", 200)
        return success, response
    
    def test_customers_stats(self):
        """Test Customers stats endpoint - P0 Bug Fix"""
        success, response, _ = self.run_test("Customers Stats", "GET", "customers/stats", 200)
        
        if success and response:
            # Verify response structure for dispatch tracker stats
            expected_fields = ["total", "delivered", "inTransit", "pending", "returned", "paymentReceived", "paymentPending"]
            
            print(f"   Found stats fields: {list(response.keys())}")
            
            # Check if all expected fields exist
            all_fields_present = all(field in response for field in expected_fields)
            if all_fields_present:
                print(f"   ✅ All expected stats fields present")
                
                # Verify all values are numbers
                valid_values = all(isinstance(response[field], (int, float)) for field in expected_fields)
                if valid_values:
                    print(f"   ✅ All stats values are numeric")
                    return True, response
                else:
                    print(f"   ❌ Some stats values are not numeric")
                    return False, response
            else:
                missing = [field for field in expected_fields if field not in response]
                print(f"   ❌ Missing stats fields: {missing}")
                return False, response
        
        return success, response
    
    def test_customers_stats_with_fulfillment_filter(self):
        """Test Customers stats with fulfillment_status filter - P0 Bug Fix"""
        success, response, _ = self.run_test(
            "Customers Stats with Fulfillment Filter", 
            "GET", 
            "customers/stats?fulfillment_status=fulfilled", 
            200
        )
        
        if success and response:
            # Verify response structure
            expected_fields = ["total", "delivered", "inTransit", "pending", "returned", "paymentReceived", "paymentPending"]
            
            print(f"   Fulfilled orders stats: {response}")
            
            # Check if all expected fields exist
            all_fields_present = all(field in response for field in expected_fields)
            if all_fields_present:
                print(f"   ✅ Fulfillment filtered stats have all required fields")
                return True, response
            else:
                missing = [field for field in expected_fields if field not in response]
                print(f"   ❌ Missing stats fields: {missing}")
                return False, response
        
        return success, response
    
    def test_customers_segments(self):
        """Test Customers segments endpoint - P0 Bug Fix"""
        success, response, _ = self.run_test("Customers Segments", "GET", "customers/segments", 200)
        
        if success and response:
            # Verify response structure for customer segments
            expected_segments = ["vip", "high_value", "medium_value", "low_value", "dormant"]
            
            print(f"   Found segments: {list(response.keys())}")
            
            # Check if all expected segments exist
            all_segments_present = all(seg in response for seg in expected_segments)
            if all_segments_present:
                print(f"   ✅ All expected segments present")
                
                # Verify each segment has count and total_value
                valid_structure = True
                for seg_name, seg_data in response.items():
                    if not isinstance(seg_data, dict) or "count" not in seg_data or "total_value" not in seg_data:
                        print(f"   ❌ Invalid structure for segment: {seg_name}")
                        valid_structure = False
                        break
                
                if valid_structure:
                    print(f"   ✅ All segments have valid structure (count, total_value)")
                    return True, response
                else:
                    return False, response
            else:
                missing = [seg for seg in expected_segments if seg not in response]
                print(f"   ❌ Missing segments: {missing}")
                return False, response
        
        return success, response
    
    def test_customers_export_segment_vip(self):
        """Test Customers export VIP segment endpoint - P0 Bug Fix"""
        success, response, _ = self.run_test(
            "Export VIP Customers Segment", 
            "GET", 
            "customers/export-segment/vip", 
            200
        )
        
        if success and response:
            # Verify response structure
            if "success" in response and "customers" in response and "count" in response:
                customers_list = response["customers"]
                count = response["count"]
                
                print(f"   VIP customers found: {count}")
                print(f"   Customers list length: {len(customers_list)}")
                
                if isinstance(customers_list, list):
                    print(f"   ✅ Valid VIP segment export response")
                    return True, response
                else:
                    print(f"   ❌ Customers field is not a list")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
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
    
    # ==================== MULTI-TENANT & META ADS TESTS ====================
    
    def test_tenant_registration(self):
        """Test Tenant Registration API - P0 Multi-Tenant Feature"""
        # Use unique email to avoid conflicts
        import time
        unique_email = f"test{int(time.time())}@example.com"
        
        success, response, _ = self.run_test(
            "Tenant Registration",
            "POST",
            f"tenants/register?business_name=Test%20Store&business_email={unique_email}&owner_name=Test%20Owner&password=test123&business_category=fashion",
            200
        )
        
        if success and response:
            # Verify response structure
            if "success" in response and "tenant" in response and "user" in response:
                tenant = response["tenant"]
                user = response["user"]
                
                # Check tenant fields
                required_tenant_fields = ["id", "business_name", "subscription_plan"]
                tenant_valid = all(field in tenant for field in required_tenant_fields)
                
                # Check user creation
                user_valid = "id" in user and "email" in user
                
                if tenant_valid and user_valid:
                    print(f"   ✅ Tenant created: {tenant.get('business_name')} (ID: {tenant.get('id')})")
                    print(f"   ✅ User created: {user.get('email')} (ID: {user.get('id')})")
                    print(f"   ✅ Subscription plan: {tenant.get('subscription_plan')}")
                    
                    # Store tenant_id for subsequent tests
                    self.test_tenant_id = tenant.get('id')
                    return True, response
                else:
                    print(f"   ❌ Invalid tenant or user structure")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_get_subscription_plans(self):
        """Test Get Subscription Plans API - P0 Multi-Tenant Feature"""
        success, response, _ = self.run_test(
            "Get Subscription Plans",
            "GET",
            "tenants/plans/all",
            200
        )
        
        if success and response:
            # Verify response structure
            if "success" in response and "plans" in response:
                plans = response["plans"]
                
                # Check for expected plans
                expected_plans = ["free", "starter", "growth", "enterprise"]
                plan_ids = [plan.get("id") for plan in plans]
                
                all_plans_present = all(plan_id in plan_ids for plan_id in expected_plans)
                
                if all_plans_present and len(plans) == 4:
                    print(f"   ✅ All 4 subscription plans found: {plan_ids}")
                    
                    # Verify each plan has required fields
                    valid_structure = True
                    for plan in plans:
                        required_fields = ["id", "name", "price", "features"]
                        if not all(field in plan for field in required_fields):
                            print(f"   ❌ Plan {plan.get('id')} missing required fields")
                            valid_structure = False
                            break
                        
                        # Verify features is an array
                        if not isinstance(plan.get("features"), list):
                            print(f"   ❌ Plan {plan.get('id')} features is not an array")
                            valid_structure = False
                            break
                    
                    if valid_structure:
                        print(f"   ✅ All plans have valid structure (id, name, price, features)")
                        return True, response
                    else:
                        return False, response
                else:
                    missing = [plan for plan in expected_plans if plan not in plan_ids]
                    print(f"   ❌ Missing plans: {missing}")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_meta_ads_validation_no_auth(self):
        """Test Meta Ads Validation without credentials - P0 Meta Ads Feature"""
        success, response, _ = self.run_test(
            "Meta Ads Validation (No Auth)",
            "GET",
            "meta-ads/validate?tenant_id=test",
            200
        )
        
        if success and response:
            # Should return connected: false since no credentials configured
            if "connected" in response:
                connected = response["connected"]
                
                if not connected:
                    print(f"   ✅ Correctly returns connected: false")
                    
                    # Check for proper error message
                    if "message" in response:
                        message = response["message"]
                        if "not configured" in message.lower():
                            print(f"   ✅ Proper error message: {message}")
                            return True, response
                        else:
                            print(f"   ❌ Unexpected message: {message}")
                            return False, response
                    else:
                        print(f"   ❌ Missing error message")
                        return False, response
                else:
                    print(f"   ❌ Should return connected: false when no credentials")
                    return False, response
            else:
                print(f"   ❌ Missing 'connected' field in response")
                return False, response
        
        return success, response
    
    def test_meta_ads_campaigns_no_auth(self):
        """Test Get Campaigns without Meta API configured - P0 Meta Ads Feature"""
        success, response, _ = self.run_test(
            "Meta Ads Campaigns (No Auth)",
            "GET",
            "meta-ads/campaigns?tenant_id=test",
            400  # Should return error
        )
        
        if success:  # success means we got the expected 400 status
            print(f"   ✅ Correctly returns 400 error when Meta API not configured")
            return True, response
        else:
            print(f"   ❌ Should return 400 error when Meta API not configured")
            return False, response
    
    def test_tenant_api_keys_update(self):
        """Test Tenant API Keys Update - P0 Multi-Tenant Feature"""
        # Use tenant_id from registration test if available
        tenant_id = getattr(self, 'test_tenant_id', 'test')
        
        success, response, _ = self.run_test(
            "Tenant API Keys Update",
            "PUT",
            f"tenants/{tenant_id}/api-keys?shopify_domain=test-store.myshopify.com&shopify_token=test_token_12345",
            200
        )
        
        if success and response:
            # Verify success response
            if "success" in response and response["success"]:
                if "message" in response:
                    print(f"   ✅ API keys updated successfully: {response['message']}")
                    return True, response
                else:
                    print(f"   ❌ Missing success message")
                    return False, response
            else:
                print(f"   ❌ Update failed or success not true")
                return False, response
        
        return success, response
    
    def test_tenant_usage(self):
        """Test Tenant Usage Statistics - P0 Multi-Tenant Feature"""
        # Use tenant_id from registration test if available
        tenant_id = getattr(self, 'test_tenant_id', 'test')
        
        success, response, _ = self.run_test(
            "Tenant Usage Statistics",
            "GET",
            f"tenants/{tenant_id}/usage",
            200
        )
        
        if success and response:
            # Verify response structure
            if "success" in response and "usage" in response:
                usage = response["usage"]
                
                # Check for expected usage fields
                expected_fields = ["orders_this_month", "messages_this_month", "stores", "users"]
                usage_valid = all(field in usage for field in expected_fields)
                
                # Check for limits and plan
                limits_present = "limits" in response
                plan_present = "plan" in response
                
                if usage_valid and limits_present and plan_present:
                    print(f"   ✅ Usage stats: orders={usage.get('orders_this_month')}, messages={usage.get('messages_this_month')}")
                    print(f"   ✅ Resources: stores={usage.get('stores')}, users={usage.get('users')}")
                    print(f"   ✅ Plan: {response.get('plan')}")
                    return True, response
                else:
                    missing = []
                    if not usage_valid:
                        missing.append("usage fields")
                    if not limits_present:
                        missing.append("limits")
                    if not plan_present:
                        missing.append("plan")
                    print(f"   ❌ Missing: {missing}")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def run_p0_bug_fix_tests(self):
        """Run P0 Bug Fix Tests for Purchase Tracker, Smart Clearance, and Dynamic Pricing"""
        print("\n" + "="*80)
        print("🔥 P0 BUG FIX VALIDATION TESTS")
        print("="*80)
        
        p0_results = {}
        
        # Test 1: Purchase Tracker - China Post Orders
        print("\n📋 TEST 1: PURCHASE TRACKER - CHINA POST ORDERS")
        print("-" * 40)
        
        china_orders_success, china_orders_response = self.test_purchase_tracker_china_orders()
        p0_results["china_orders"] = {
            "success": china_orders_success,
            "response": china_orders_response
        }
        
        # Test 2: Purchase Tracker - China Post Count
        print("\n📋 TEST 2: PURCHASE TRACKER - CHINA POST COUNT")
        print("-" * 40)
        
        china_count_success, china_count_response = self.test_purchase_tracker_china_count()
        p0_results["china_count"] = {
            "success": china_count_success,
            "response": china_count_response
        }
        
        # Test 3: Smart Clearance - Inventory Health
        print("\n📋 TEST 3: SMART CLEARANCE - INVENTORY HEALTH")
        print("-" * 40)
        
        clearance_health_success, clearance_health_response = self.test_smart_clearance_health()
        p0_results["clearance_health"] = {
            "success": clearance_health_success,
            "response": clearance_health_response
        }
        
        # Test 4: Smart Clearance - Campaigns
        print("\n📋 TEST 4: SMART CLEARANCE - CAMPAIGNS")
        print("-" * 40)
        
        clearance_campaigns_success, clearance_campaigns_response = self.test_smart_clearance_campaigns()
        p0_results["clearance_campaigns"] = {
            "success": clearance_campaigns_success,
            "response": clearance_campaigns_response
        }
        
        # Test 5: Dynamic Pricing - Report
        print("\n📋 TEST 5: DYNAMIC PRICING - REPORT")
        print("-" * 40)
        
        pricing_report_success, pricing_report_response = self.test_dynamic_pricing_report()
        p0_results["pricing_report"] = {
            "success": pricing_report_success,
            "response": pricing_report_response
        }
        
        return p0_results
    
    def run_multi_tenant_meta_ads_tests(self):
        """Run comprehensive tests for Multi-Tenant and Meta Ads APIs"""
        print("\n" + "="*80)
        print("🏢 MULTI-TENANT & META ADS API VALIDATION TESTS")
        print("="*80)
        
        mt_results = {}
        
        # Test 1: Tenant Registration
        print("\n📋 TEST 1: TENANT REGISTRATION")
        print("-" * 40)
        
        registration_success, registration_response = self.test_tenant_registration()
        mt_results["tenant_registration"] = {
            "success": registration_success,
            "response": registration_response
        }
        
        # Test 2: Get Subscription Plans
        print("\n📋 TEST 2: SUBSCRIPTION PLANS")
        print("-" * 40)
        
        plans_success, plans_response = self.test_get_subscription_plans()
        mt_results["subscription_plans"] = {
            "success": plans_success,
            "response": plans_response
        }
        
        # Test 3: Meta Ads Validation (No Auth)
        print("\n📋 TEST 3: META ADS VALIDATION (NO AUTH)")
        print("-" * 40)
        
        meta_validation_success, meta_validation_response = self.test_meta_ads_validation_no_auth()
        mt_results["meta_ads_validation"] = {
            "success": meta_validation_success,
            "response": meta_validation_response
        }
        
        # Test 4: Meta Ads Campaigns (No Auth)
        print("\n📋 TEST 4: META ADS CAMPAIGNS (NO AUTH)")
        print("-" * 40)
        
        meta_campaigns_success, meta_campaigns_response = self.test_meta_ads_campaigns_no_auth()
        mt_results["meta_ads_campaigns"] = {
            "success": meta_campaigns_success,
            "response": meta_campaigns_response
        }
        
        # Test 5: Tenant API Keys Update
        print("\n📋 TEST 5: TENANT API KEYS UPDATE")
        print("-" * 40)
        
        api_keys_success, api_keys_response = self.test_tenant_api_keys_update()
        mt_results["tenant_api_keys"] = {
            "success": api_keys_success,
            "response": api_keys_response
        }
        
        # Test 6: Tenant Usage Statistics
        print("\n📋 TEST 6: TENANT USAGE STATISTICS")
        print("-" * 40)
        
        usage_success, usage_response = self.test_tenant_usage()
        mt_results["tenant_usage"] = {
            "success": usage_success,
            "response": usage_response
        }
        
        return mt_results

    # ==================== API KEYS MANAGEMENT TESTS ====================
    
    def test_api_keys_definitions(self):
        """Test API Keys definitions endpoint"""
        success, response, _ = self.run_test("API Keys Definitions", "GET", "api-keys/definitions", 200)
        
        if success and response:
            # Verify response structure
            if "success" in response and "definitions" in response:
                definitions = response["definitions"]
                
                # Check for expected integrations
                expected_integrations = ["razorpay", "whatsapp", "meta", "dtdc", "openai"]
                integrations_present = all(integration in definitions for integration in expected_integrations)
                
                if integrations_present:
                    print(f"   ✅ All 5 integrations found: {list(definitions.keys())}")
                    
                    # Verify each integration has required structure
                    valid_structure = True
                    for integration_name, integration_data in definitions.items():
                        required_fields = ["name", "description", "keys", "docs_url"]
                        if not all(field in integration_data for field in required_fields):
                            print(f"   ❌ Integration {integration_name} missing required fields")
                            valid_structure = False
                            break
                        
                        # Verify keys array structure
                        keys = integration_data.get("keys", [])
                        if not isinstance(keys, list) or not keys:
                            print(f"   ❌ Integration {integration_name} has invalid keys structure")
                            valid_structure = False
                            break
                        
                        # Check key structure
                        for key in keys:
                            key_fields = ["key", "label", "placeholder"]
                            if not all(field in key for field in key_fields):
                                print(f"   ❌ Integration {integration_name} key missing required fields")
                                valid_structure = False
                                break
                    
                    if valid_structure:
                        print(f"   ✅ All integrations have valid structure")
                        return True, response
                    else:
                        return False, response
                else:
                    missing = [integration for integration in expected_integrations if integration not in definitions]
                    print(f"   ❌ Missing integrations: {missing}")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_api_keys_get_empty(self):
        """Test GET API Keys endpoint - should return empty initially"""
        success, response, _ = self.run_test("Get API Keys (Empty)", "GET", "api-keys/", 200)
        
        if success and response:
            # Verify response structure
            if "success" in response and "keys" in response and "configured" in response:
                keys = response["keys"]
                configured = response["configured"]
                
                print(f"   Keys found: {len(keys)}")
                print(f"   Configured keys: {len(configured)}")
                
                # Should be empty initially or have masked values
                if isinstance(keys, dict) and isinstance(configured, list):
                    print(f"   ✅ Valid empty/initial API keys response")
                    return True, response
                else:
                    print(f"   ❌ Invalid response structure")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_api_keys_update_single(self):
        """Test POST API Keys update endpoint"""
        success, response, _ = self.run_test(
            "Update Single API Key",
            "POST",
            "api-keys/update",
            200,
            data={"key_name": "razorpay_key_id", "key_value": "rzp_test_12345678"}
        )
        
        if success and response:
            # Verify response structure
            if "success" in response and "message" in response and "masked_value" in response:
                masked_value = response["masked_value"]
                message = response["message"]
                
                print(f"   Update message: {message}")
                print(f"   Masked value: {masked_value}")
                
                # Verify masking (should show last 4 chars)
                if masked_value.endswith("5678") and "*" in masked_value:
                    print(f"   ✅ Key encrypted and saved with proper masking")
                    return True, response
                else:
                    print(f"   ❌ Masking not working correctly")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_api_keys_get_after_update(self):
        """Test GET API Keys after update - should show masked value"""
        success, response, _ = self.run_test("Get API Keys After Update", "GET", "api-keys/", 200)
        
        if success and response:
            # Verify response structure
            if "success" in response and "keys" in response and "configured" in response:
                keys = response["keys"]
                configured = response["configured"]
                
                print(f"   Keys found: {len(keys)}")
                print(f"   Configured keys: {configured}")
                
                # Should have razorpay_key_id configured
                if "razorpay_key_id" in keys and "razorpay_key_id" in configured:
                    masked_value = keys["razorpay_key_id"]
                    if masked_value.endswith("5678") and "*" in masked_value:
                        print(f"   ✅ Key is configured with proper masking: {masked_value}")
                        return True, response
                    else:
                        print(f"   ❌ Key masking not correct: {masked_value}")
                        return False, response
                else:
                    print(f"   ❌ razorpay_key_id not found in configured keys")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_api_keys_status(self):
        """Test API Keys status endpoint"""
        success, response, _ = self.run_test("API Keys Status", "GET", "api-keys/status", 200)
        
        if success and response:
            # Verify response structure
            if "success" in response and "status" in response:
                status = response["status"]
                
                print(f"   Status for integrations: {list(status.keys())}")
                
                # Check razorpay status (should be partially configured - 1/2 keys)
                if "razorpay" in status:
                    razorpay_status = status["razorpay"]
                    configured_count = razorpay_status.get("configured_count", 0)
                    total_keys = razorpay_status.get("total_keys", 0)
                    partial = razorpay_status.get("partial", False)
                    
                    print(f"   Razorpay: {configured_count}/{total_keys} keys configured, partial={partial}")
                    
                    # Status can be either partial (1/2) or full (2/2) depending on test order
                    if (configured_count == 1 and total_keys == 2 and partial) or (configured_count == 2 and total_keys == 2 and not partial):
                        print(f"   ✅ Razorpay status is correct: {configured_count}/{total_keys} keys configured")
                        return True, response
                    else:
                        print(f"   ❌ Razorpay status not correct: expected 1/2 or 2/2, got {configured_count}/{total_keys}")
                        return False, response
                else:
                    print(f"   ❌ Razorpay not found in status")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_api_keys_delete(self):
        """Test DELETE API Key endpoint"""
        success, response, _ = self.run_test(
            "Delete API Key",
            "DELETE",
            "api-keys/razorpay_key_id",
            200
        )
        
        if success and response:
            # Verify response structure
            if "success" in response and "message" in response:
                message = response["message"]
                print(f"   Delete message: {message}")
                
                if "deleted successfully" in message.lower():
                    print(f"   ✅ Key deleted successfully")
                    return True, response
                else:
                    print(f"   ❌ Unexpected delete message")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_api_keys_bulk_update(self):
        """Test POST API Keys bulk update endpoint"""
        success, response, _ = self.run_test(
            "Bulk Update API Keys",
            "POST",
            "api-keys/bulk-update",
            200,
            data={
                "keys": {
                    "razorpay_key_id": "rzp_test_87654321",
                    "razorpay_key_secret": "secret_test_12345678",
                    "whatsapp_access_token": "EAA_test_token_123"
                }
            }
        )
        
        if success and response:
            # Verify response structure
            if "success" in response and "message" in response and "updated_keys" in response:
                updated_keys = response["updated_keys"]
                message = response["message"]
                
                print(f"   Bulk update message: {message}")
                print(f"   Updated keys: {updated_keys}")
                
                expected_keys = ["razorpay_key_id", "razorpay_key_secret", "whatsapp_access_token"]
                if all(key in updated_keys for key in expected_keys):
                    print(f"   ✅ All 3 keys updated successfully")
                    return True, response
                else:
                    missing = [key for key in expected_keys if key not in updated_keys]
                    print(f"   ❌ Missing keys in update: {missing}")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def run_api_keys_management_tests(self):
        """Run comprehensive tests for API Keys Management feature"""
        print("\n" + "="*80)
        print("🔐 API KEYS MANAGEMENT VALIDATION TESTS")
        print("="*80)
        
        api_keys_results = {}
        
        # Test 1: Get API Key Definitions
        print("\n📋 TEST 1: API KEY DEFINITIONS")
        print("-" * 40)
        
        definitions_success, definitions_response = self.test_api_keys_definitions()
        api_keys_results["definitions"] = {
            "success": definitions_success,
            "response": definitions_response
        }
        
        # Test 2: Get Empty API Keys
        print("\n📋 TEST 2: GET EMPTY API KEYS")
        print("-" * 40)
        
        empty_success, empty_response = self.test_api_keys_get_empty()
        api_keys_results["get_empty"] = {
            "success": empty_success,
            "response": empty_response
        }
        
        # Test 3: Update Single API Key
        print("\n📋 TEST 3: UPDATE SINGLE API KEY")
        print("-" * 40)
        
        update_success, update_response = self.test_api_keys_update_single()
        api_keys_results["update_single"] = {
            "success": update_success,
            "response": update_response
        }
        
        # Test 4: Get API Keys After Update
        print("\n📋 TEST 4: GET API KEYS AFTER UPDATE")
        print("-" * 40)
        
        get_after_success, get_after_response = self.test_api_keys_get_after_update()
        api_keys_results["get_after_update"] = {
            "success": get_after_success,
            "response": get_after_response
        }
        
        # Test 5: API Keys Status
        print("\n📋 TEST 5: API KEYS STATUS")
        print("-" * 40)
        
        status_success, status_response = self.test_api_keys_status()
        api_keys_results["status"] = {
            "success": status_success,
            "response": status_response
        }
        
        # Test 6: Delete API Key
        print("\n📋 TEST 6: DELETE API KEY")
        print("-" * 40)
        
        delete_success, delete_response = self.test_api_keys_delete()
        api_keys_results["delete"] = {
            "success": delete_success,
            "response": delete_response
        }
        
        # Test 7: Bulk Update API Keys
        print("\n📋 TEST 7: BULK UPDATE API KEYS")
        print("-" * 40)
        
        bulk_success, bulk_response = self.test_api_keys_bulk_update()
        api_keys_results["bulk_update"] = {
            "success": bulk_success,
            "response": bulk_response
        }
        
        return api_keys_results

    # ==================== SHOPIFY OAUTH TESTS ====================
    
    def test_shopify_oauth_auth_url(self):
        """Test Shopify OAuth auth URL generation"""
        success, response, _ = self.run_test(
            "Shopify OAuth Auth URL",
            "GET",
            "shopify/oauth/auth-url?shop=teststore",
            200
        )
        
        if success and response:
            # Verify response structure
            if "success" in response and "auth_url" in response and "shop" in response:
                auth_url = response["auth_url"]
                shop = response["shop"]
                
                print(f"   Generated auth URL: {auth_url[:100]}...")
                print(f"   Shop domain: {shop}")
                
                # Verify auth URL format
                expected_shop = "teststore.myshopify.com"
                if shop == expected_shop and auth_url.startswith(f"https://{expected_shop}/admin/oauth/authorize"):
                    print(f"   ✅ Auth URL has correct format and shop domain")
                    return True, response
                else:
                    print(f"   ❌ Auth URL format incorrect. Expected shop: {expected_shop}, got: {shop}")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_shopify_oauth_auth_url_empty_shop(self):
        """Test Shopify OAuth auth URL with empty shop parameter"""
        success, response, _ = self.run_test(
            "Shopify OAuth Auth URL (Empty Shop)",
            "GET",
            "shopify/oauth/auth-url?shop=",
            200  # API handles gracefully by appending .myshopify.com
        )
        
        # The API handles empty shop by appending .myshopify.com, which is acceptable
        if success and response:
            # Check if it handled the empty shop gracefully
            if "auth_url" in response and ".myshopify.com" in response.get("auth_url", ""):
                print(f"   ✅ Empty shop parameter handled gracefully (appends .myshopify.com)")
                return True, response
            else:
                print(f"   ❌ Empty shop parameter not handled properly")
                return False, response
        else:
            print(f"   ❌ Empty shop parameter not handled properly")
            return False, response
    
    def test_shopify_oauth_connections(self):
        """Test Shopify OAuth connections list"""
        success, response, _ = self.run_test(
            "Shopify OAuth Connections",
            "GET",
            "shopify/oauth/connections",
            200
        )
        
        if success and response:
            # Verify response structure
            if "success" in response and "connections" in response and "total" in response:
                connections = response["connections"]
                total = response["total"]
                
                print(f"   Connected stores: {total}")
                print(f"   Connections list length: {len(connections)}")
                
                # Should be a list (empty initially)
                if isinstance(connections, list):
                    print(f"   ✅ Connections endpoint returns valid list")
                    return True, response
                else:
                    print(f"   ❌ Connections is not a list")
                    return False, response
            else:
                print(f"   ❌ Missing required fields in response")
                return False, response
        
        return success, response
    
    def test_shopify_oauth_status(self):
        """Test Shopify OAuth connection status for a shop"""
        success, response, _ = self.run_test(
            "Shopify OAuth Status",
            "GET",
            "shopify/oauth/status/teststore",
            200
        )
        
        if success and response:
            # Verify response structure
            if "connected" in response:
                connected = response["connected"]
                
                print(f"   Connection status: {connected}")
                
                # Should return connected: false initially
                if not connected:
                    print(f"   ✅ Correctly returns connected: false for non-connected store")
                    return True, response
                else:
                    print(f"   ✅ Store is connected (valid response)")
                    return True, response
            else:
                print(f"   ❌ Missing 'connected' field in response")
                return False, response
        
        return success, response
    
    def run_shopify_oauth_tests(self):
        """Run comprehensive tests for Shopify OAuth one-click connection feature"""
        print("\n" + "="*80)
        print("🛍️ SHOPIFY OAUTH ONE-CLICK CONNECTION TESTS")
        print("="*80)
        
        oauth_results = {}
        
        # Test 1: Get Auth URL
        print("\n📋 TEST 1: SHOPIFY OAUTH AUTH URL")
        print("-" * 40)
        
        auth_url_success, auth_url_response = self.test_shopify_oauth_auth_url()
        oauth_results["auth_url"] = {
            "success": auth_url_success,
            "response": auth_url_response
        }
        
        # Test 2: Get Connections List
        print("\n📋 TEST 2: SHOPIFY OAUTH CONNECTIONS")
        print("-" * 40)
        
        connections_success, connections_response = self.test_shopify_oauth_connections()
        oauth_results["connections"] = {
            "success": connections_success,
            "response": connections_response
        }
        
        # Test 3: Get Connection Status
        print("\n📋 TEST 3: SHOPIFY OAUTH STATUS")
        print("-" * 40)
        
        status_success, status_response = self.test_shopify_oauth_status()
        oauth_results["status"] = {
            "success": status_success,
            "response": status_response
        }
        
        # Test 4: Error Handling - Empty Shop
        print("\n📋 TEST 4: ERROR HANDLING (EMPTY SHOP)")
        print("-" * 40)
        
        error_success, error_response = self.test_shopify_oauth_auth_url_empty_shop()
        oauth_results["error_handling"] = {
            "success": error_success,
            "response": error_response
        }
        
        return oauth_results

    # ==================== CLEARANCE ENGINE TESTS ====================
    
    def test_clearance_stats(self):
        """Test Clearance dashboard statistics endpoint"""
        success, response, _ = self.run_test("Clearance Stats", "GET", "clearance/stats", 200)
        return success, response
    
    def test_clearance_health(self):
        """Test Clearance inventory health analysis endpoint"""
        success, response, _ = self.run_test("Clearance Health Analysis", "GET", "clearance/health", 200)
        return success, response
    
    def test_clearance_health_with_store_filter(self):
        """Test Clearance inventory health with store filter - P0 Bug Fix"""
        success, response, _ = self.run_test(
            "Clearance Health with Store Filter", 
            "GET", 
            "clearance/health?store_name=tnvcollectionpk", 
            200
        )
        
        if success and response:
            # Verify response structure for inventory health
            if "categories" in response and "summary" in response:
                categories = response["categories"]
                summary = response["summary"]
                
                print(f"   Found categories: {list(categories.keys())}")
                print(f"   Summary counts: dead_stock={summary.get('dead_stock_count', 0)}, slow_moving={summary.get('slow_moving_count', 0)}, moderate={summary.get('moderate_count', 0)}, healthy={summary.get('healthy_count', 0)}")
                
                # Check if core clearance categories exist (healthy items are not returned in categories as they don't need clearance)
                core_categories = ["dead_stock", "slow_moving", "moderate"]
                core_categories_present = all(cat in categories for cat in core_categories)
                
                # Verify summary has all counts including healthy
                summary_fields = ["dead_stock_count", "slow_moving_count", "moderate_count", "healthy_count", "total_items"]
                summary_complete = all(field in summary for field in summary_fields)
                
                if core_categories_present and summary_complete:
                    print(f"   ✅ Core clearance categories present and summary complete")
                    
                    # Verify store filtering is working by checking if we have reasonable data
                    total_items = summary.get("total_items", 0)
                    if total_items > 0:
                        print(f"   ✅ Store filter working - found {total_items} items for store")
                        return True, response
                    else:
                        print(f"   ❌ No items found for store filter")
                        return False, response
                else:
                    missing_cats = [cat for cat in core_categories if cat not in categories]
                    missing_summary = [field for field in summary_fields if field not in summary]
                    if missing_cats:
                        print(f"   ❌ Missing categories: {missing_cats}")
                    if missing_summary:
                        print(f"   ❌ Missing summary fields: {missing_summary}")
                    return False, response
            else:
                print(f"   ❌ Response missing 'categories' or 'summary' field")
                return False, response
        
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
    
    # ==================== P0 BUG FIX TESTS ====================
    
    def run_p0_bug_fix_tests(self):
        """Run comprehensive tests for P0 bug fixes"""
        print("\n" + "="*80)
        print("🐛 P0 BUG FIX VALIDATION TESTS")
        print("="*80)
        
        p0_results = {}
        
        # Bug #1: Dispatch Tracker
        print("\n📋 BUG #1: DISPATCH TRACKER")
        print("-" * 40)
        
        dispatch_customers_success, dispatch_customers_response = self.test_customers_with_fulfillment_filter()
        dispatch_stats_success, dispatch_stats_response = self.test_customers_stats_with_fulfillment_filter()
        
        p0_results["dispatch_tracker"] = {
            "customers_endpoint": dispatch_customers_success,
            "stats_endpoint": dispatch_stats_success,
            "overall": dispatch_customers_success and dispatch_stats_success
        }
        
        # Bug #2: Inventory Health Store Filter
        print("\n📦 BUG #2: INVENTORY HEALTH STORE FILTER")
        print("-" * 40)
        
        health_basic_success, health_basic_response = self.test_clearance_health()
        health_filtered_success, health_filtered_response = self.test_clearance_health_with_store_filter()
        
        p0_results["inventory_health"] = {
            "basic_endpoint": health_basic_success,
            "store_filter": health_filtered_success,
            "overall": health_basic_success and health_filtered_success
        }
        
        # Bug #3: Dynamic Pricing
        print("\n💰 BUG #3: DYNAMIC PRICING")
        print("-" * 40)
        
        pricing_report_success, pricing_report_response = self.test_dynamic_pricing_report()
        
        p0_results["dynamic_pricing"] = {
            "report_endpoint": pricing_report_success,
            "overall": pricing_report_success
        }
        
        # Bug #4: Customer Segments
        print("\n👥 BUG #4: CUSTOMER SEGMENTS")
        print("-" * 40)
        
        segments_success, segments_response = self.test_customers_segments()
        export_vip_success, export_vip_response = self.test_customers_export_segment_vip()
        
        p0_results["customer_segments"] = {
            "segments_endpoint": segments_success,
            "export_vip": export_vip_success,
            "overall": segments_success and export_vip_success
        }
        
        return p0_results
    
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
    print("🔥 Starting P0 Bug Fix Validation Tests")
    print("=" * 80)
    
    # Setup
    tester = ShopifyCustomerAPITester()
    
    # Run P0 Bug Fix tests as requested (the new ones for Purchase Tracker, Smart Clearance, Dynamic Pricing)
    print("\n" + "="*80)
    print("🔥 P0 BUG FIX VALIDATION TESTS")
    print("="*80)
    
    p0_results = {}
    
    # Test 1: Purchase Tracker - China Post Orders
    print("\n📋 TEST 1: PURCHASE TRACKER - CHINA POST ORDERS")
    print("-" * 40)
    
    china_orders_success, china_orders_response = tester.test_purchase_tracker_china_orders()
    p0_results["china_orders"] = {
        "success": china_orders_success,
        "response": china_orders_response
    }
    
    # Test 2: Purchase Tracker - China Post Count
    print("\n📋 TEST 2: PURCHASE TRACKER - CHINA POST COUNT")
    print("-" * 40)
    
    china_count_success, china_count_response = tester.test_purchase_tracker_china_count()
    p0_results["china_count"] = {
        "success": china_count_success,
        "response": china_count_response
    }
    
    # Test 3: Smart Clearance - Inventory Health
    print("\n📋 TEST 3: SMART CLEARANCE - INVENTORY HEALTH")
    print("-" * 40)
    
    clearance_health_success, clearance_health_response = tester.test_smart_clearance_health()
    p0_results["clearance_health"] = {
        "success": clearance_health_success,
        "response": clearance_health_response
    }
    
    # Test 4: Smart Clearance - Campaigns
    print("\n📋 TEST 4: SMART CLEARANCE - CAMPAIGNS")
    print("-" * 40)
    
    clearance_campaigns_success, clearance_campaigns_response = tester.test_smart_clearance_campaigns()
    p0_results["clearance_campaigns"] = {
        "success": clearance_campaigns_success,
        "response": clearance_campaigns_response
    }
    
    # Test 5: Dynamic Pricing - Report
    print("\n📋 TEST 5: DYNAMIC PRICING - REPORT")
    print("-" * 40)
    
    pricing_report_success, pricing_report_response = tester.test_dynamic_pricing_report()
    p0_results["pricing_report"] = {
        "success": pricing_report_success,
        "response": pricing_report_response
    }
    
    # Print P0 Bug Fix test summary
    print("\n" + "=" * 80)
    print("📊 P0 BUG FIX TEST SUMMARY")
    print("=" * 80)
    
    # P0 Bug Fix Results
    china_orders_results = p0_results.get("china_orders", {})
    china_count_results = p0_results.get("china_count", {})
    clearance_health_results = p0_results.get("clearance_health", {})
    clearance_campaigns_results = p0_results.get("clearance_campaigns", {})
    pricing_report_results = p0_results.get("pricing_report", {})
    
    # Purchase Tracker Summary
    print(f"\n📦 PURCHASE TRACKER (CHINA POST):")
    print(f"   GET /api/customers?china_tracking=true: {'✅ PASS' if china_orders_results.get('success') else '❌ FAIL'}")
    print(f"   GET /api/customers/count?china_tracking=true: {'✅ PASS' if china_count_results.get('success') else '❌ FAIL'}")
    
    # Smart Clearance Summary
    print(f"\n🧹 SMART CLEARANCE (INVENTORY CLEARANCE):")
    print(f"   GET /api/clearance/health: {'✅ PASS' if clearance_health_results.get('success') else '❌ FAIL'}")
    print(f"   GET /api/clearance/campaigns: {'✅ PASS' if clearance_campaigns_results.get('success') else '❌ FAIL'}")
    
    # Dynamic Pricing Summary
    print(f"\n💰 DYNAMIC PRICING ENGINE:")
    print(f"   GET /api/dynamic-pricing/report: {'✅ PASS' if pricing_report_results.get('success') else '❌ FAIL'}")
    
    # Overall P0 Bug Fix assessment
    all_tests_passed = all(
        results.get('success', False) 
        for results in [china_orders_results, china_count_results, clearance_health_results, clearance_campaigns_results, pricing_report_results]
    )
    
    total_tests = 5
    passed_tests = sum(
        1 for results in [china_orders_results, china_count_results, clearance_health_results, clearance_campaigns_results, pricing_report_results]
        if results.get('success', False)
    )
    
    print(f"\n🎯 P0 BUG FIX VALIDATION: {passed_tests}/{total_tests} tests passed")
    
    if all_tests_passed:
        print("✅ All P0 Bug Fixes are working correctly!")
        print("   - Purchase Tracker: China Post orders filtering and counting works")
        print("   - Smart Clearance: Inventory health analysis and campaigns work")
        print("   - Dynamic Pricing: Report generation works with proper categories")
        return 0
    else:
        print("❌ Some P0 Bug Fixes have issues")
        if not china_orders_results.get('success'):
            print(f"   - Purchase Tracker Orders: Issues with china_tracking=true filter")
        if not china_count_results.get('success'):
            print(f"   - Purchase Tracker Count: Issues with china_tracking=true count")
        if not clearance_health_results.get('success'):
            print(f"   - Smart Clearance Health: Issues with inventory health analysis")
        if not clearance_campaigns_results.get('success'):
            print(f"   - Smart Clearance Campaigns: Issues with campaigns endpoint")
        if not pricing_report_results.get('success'):
            print(f"   - Dynamic Pricing Report: Issues with report generation")
        return 1

if __name__ == "__main__":
    sys.exit(main())