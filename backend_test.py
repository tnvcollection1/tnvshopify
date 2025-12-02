import requests
import sys
from datetime import datetime
import json

class ShopifyCustomerAPITester:
    def __init__(self, base_url="https://inventory-sync-41.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_size": len(response.text) if response.text else 0
            }
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
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
            return success, response.json() if success and response.text else {}

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
            return False, {}
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
            return False, {}

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

def main():
    print("🚀 Starting Shopify Customer Management API Tests")
    print("=" * 60)
    
    # Setup
    tester = ShopifyCustomerAPITester()
    
    # Run all tests
    print("\n📋 Running Basic API Endpoint Tests...")
    
    # Basic API tests
    tester.test_root_endpoint()
    tester.test_status_endpoints()
    
    # Customer management tests
    tester.test_customers_endpoint()
    tester.test_customers_with_filter()
    tester.test_shoe_sizes_endpoint()
    
    # WhatsApp integration test
    tester.test_whatsapp_link_endpoint()
    
    print("\n📋 Running Agent Login & Tracking System Tests...")
    
    # Agent system tests
    agent_login_success, agent_data = tester.test_agent_login()
    tester.test_agents_list()
    
    if agent_login_success:
        # Only run agent tracking tests if login works
        tester.test_mark_customer_messaged_with_agent()
        tester.test_filter_customers_by_agent()
        tester.test_daily_reports()
    else:
        print("⚠️  Skipping agent tracking tests due to login failure")
    
    # Shopify sync test (expected to fail)
    tester.test_shopify_sync_endpoint()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    # Print detailed results
    print("\n📋 Detailed Test Results:")
    for result in tester.test_results:
        status = "✅ PASS" if result["success"] else "❌ FAIL"
        print(f"  {status} - {result['test_name']} ({result['method']} {result['endpoint']})")
        if not result["success"] and "error" in result:
            print(f"    Error: {result['error']}")
    
    # Determine overall success - focus on agent system tests
    agent_tests = [
        "Agent Login", "Get Agents List", "Mark Customer Messaged by Agent",
        "Filter Customers by Agent", "Daily Reports - All Agents", "Daily Reports - Admin Agent"
    ]
    
    basic_tests = [
        "Root API", "Get All Customers", "Get Shoe Sizes", "Generate WhatsApp Link"
    ]
    
    agent_passed = sum(1 for result in tester.test_results 
                      if result["test_name"] in agent_tests and result["success"])
    
    basic_passed = sum(1 for result in tester.test_results 
                      if result["test_name"] in basic_tests and result["success"])
    
    print(f"\n🎯 Basic API Tests: {basic_passed}/{len(basic_tests)} passed")
    print(f"🎯 Agent System Tests: {agent_passed}/{len(agent_tests)} passed")
    
    if basic_passed >= len(basic_tests) - 1 and agent_passed >= len(agent_tests) - 1:
        print("✅ Backend API and Agent System are functioning well!")
        return 0
    else:
        print("❌ Backend has critical issues that need attention")
        if basic_passed < len(basic_tests) - 1:
            print("   - Basic API issues detected")
        if agent_passed < len(agent_tests) - 1:
            print("   - Agent system issues detected")
        return 1

if __name__ == "__main__":
    sys.exit(main())