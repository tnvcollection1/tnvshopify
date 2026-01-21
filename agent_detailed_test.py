import requests
import json

base_url = 'https://multi-tenant-shop-3.preview.emergentagent.com/api'

print('🔍 Testing Agent System in Detail...')

# 1. Test login
print('\n1. Testing Agent Login:')
login_response = requests.post(f'{base_url}/agents/login', 
                              json={'username': 'admin', 'password': 'admin123'})
print(f'   Status: {login_response.status_code}')
if login_response.status_code == 200:
    login_data = login_response.json()
    print(f'   Success: {login_data.get("success")}')
    agent = login_data.get('agent', {})
    print(f'   Agent: {agent.get("username")} - {agent.get("full_name")} ({agent.get("role")})')

# 2. Get a customer to test with
print('\n2. Getting Customer for Testing:')
customers_response = requests.get(f'{base_url}/customers?page=1&limit=1')
if customers_response.status_code == 200:
    customers = customers_response.json()
    if customers:
        test_customer = customers[0]
        customer_id = test_customer.get('customer_id')
        print(f'   Customer: {test_customer.get("first_name")} {test_customer.get("last_name")}')
        print(f'   Customer ID: {customer_id}')
        print(f'   Currently messaged by: {test_customer.get("messaged_by", "None")}')
        
        # 3. Mark customer as messaged by admin
        print('\n3. Marking Customer as Messaged by Admin:')
        mark_response = requests.post(f'{base_url}/customers/{customer_id}/mark-messaged?agent_username=admin')
        print(f'   Status: {mark_response.status_code}')
        if mark_response.status_code == 200:
            mark_data = mark_response.json()
            print(f'   Response: {mark_data}')
            
            # 4. Verify customer was updated
            print('\n4. Verifying Customer Update:')
            verify_response = requests.get(f'{base_url}/customers?page=1&limit=10')
            if verify_response.status_code == 200:
                updated_customers = verify_response.json()
                updated_customer = next((c for c in updated_customers if c.get('customer_id') == customer_id), None)
                if updated_customer:
                    print(f'   Customer now messaged by: {updated_customer.get("messaged_by")}')
                    print(f'   Last messaged at: {updated_customer.get("last_messaged_at")}')
                    print(f'   Message count: {updated_customer.get("message_count", 0)}')

# 5. Test agent filtering
print('\n5. Testing Agent Filtering:')
filter_response = requests.get(f'{base_url}/customers?agent_username=admin')
if filter_response.status_code == 200:
    filtered_customers = filter_response.json()
    print(f'   Found {len(filtered_customers)} customers messaged by admin')
    
    # Show first few
    for i, customer in enumerate(filtered_customers[:3]):
        print(f'   Customer {i+1}: {customer.get("first_name")} {customer.get("last_name")} - Agent: {customer.get("messaged_by")}')

# 6. Test daily reports
print('\n6. Testing Daily Reports:')
reports_response = requests.get(f'{base_url}/reports/daily')
if reports_response.status_code == 200:
    reports_data = reports_response.json()
    daily_reports = reports_data.get('daily_reports', [])
    print(f'   Found {len(daily_reports)} days of data')
    
    if daily_reports:
        latest_report = daily_reports[0]
        print(f'   Latest report ({latest_report.get("date")}):')
        print(f'     Messages sent: {latest_report.get("messages_sent")}')
        print(f'     Conversions: {latest_report.get("conversions")}')
        print(f'     Conversion rate: {latest_report.get("conversion_rate")}%')
        print(f'     Total sales: ${latest_report.get("total_sales")}')

# 7. Test agent-specific daily reports
print('\n7. Testing Agent-Specific Daily Reports:')
agent_reports_response = requests.get(f'{base_url}/reports/daily?agent_username=admin')
if agent_reports_response.status_code == 200:
    agent_reports_data = agent_reports_response.json()
    agent_daily_reports = agent_reports_data.get('daily_reports', [])
    print(f'   Found {len(agent_daily_reports)} days of admin data')
    
    if agent_daily_reports:
        latest_agent_report = agent_daily_reports[0]
        print(f'   Admin report ({latest_agent_report.get("date")}):')
        print(f'     Messages sent: {latest_agent_report.get("messages_sent")}')
        print(f'     Conversions: {latest_agent_report.get("conversions")}')
        print(f'     Conversion rate: {latest_agent_report.get("conversion_rate")}%')
        print(f'     Total sales: ${latest_agent_report.get("total_sales")}')

print('\n✅ Agent System Testing Complete!')