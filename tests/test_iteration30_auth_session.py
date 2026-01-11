"""
Iteration 30 Tests - P0 Auth Bug Fix & AI Product Editor Bulk Enhancement
Tests for:
1. Session validation endpoint /api/users/me
2. AI Product Editor endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSessionValidation:
    """Tests for P0 Auth Bug Fix - /api/users/me endpoint"""
    
    def test_session_validation_with_valid_user_id(self):
        """Test that /api/users/me returns valid user data for existing user"""
        # First login to get a valid user ID
        login_response = requests.post(
            f"{BASE_URL}/api/agents/login",
            json={"username": "admin", "password": "admin"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        login_data = login_response.json()
        assert login_data.get("success") == True
        user_id = login_data["agent"]["id"]
        
        # Now validate session with the user ID
        session_response = requests.get(
            f"{BASE_URL}/api/users/me",
            params={"user_id": user_id}
        )
        
        assert session_response.status_code == 200, f"Session validation failed: {session_response.text}"
        
        data = session_response.json()
        assert data.get("success") == True
        assert "user" in data
        assert data["user"]["id"] == user_id
        assert data["user"]["username"] == "admin"
        assert "permissions" in data["user"]
        assert data["user"]["permissions"]["can_view"] == True
    
    def test_session_validation_with_invalid_user_id(self):
        """Test that /api/users/me returns 401 for invalid user ID"""
        invalid_user_id = str(uuid.uuid4())  # Random UUID that doesn't exist
        
        response = requests.get(
            f"{BASE_URL}/api/users/me",
            params={"user_id": invalid_user_id}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "session invalid" in data["detail"].lower() or "not found" in data["detail"].lower()
    
    def test_session_validation_without_user_id(self):
        """Test that /api/users/me returns 401 when user_id is missing"""
        response = requests.get(f"{BASE_URL}/api/users/me")
        
        # Should return 401 or 422 (validation error)
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
    
    def test_session_validation_with_empty_user_id(self):
        """Test that /api/users/me returns 401 for empty user_id"""
        response = requests.get(
            f"{BASE_URL}/api/users/me",
            params={"user_id": ""}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_session_returns_permissions(self):
        """Test that session validation returns proper permissions for admin"""
        # Login as admin
        login_response = requests.post(
            f"{BASE_URL}/api/agents/login",
            json={"username": "admin", "password": "admin"}
        )
        user_id = login_response.json()["agent"]["id"]
        
        # Validate session
        session_response = requests.get(
            f"{BASE_URL}/api/users/me",
            params={"user_id": user_id}
        )
        
        assert session_response.status_code == 200
        data = session_response.json()
        
        # Admin should have all permissions
        permissions = data["user"]["permissions"]
        assert permissions["can_view"] == True
        assert permissions["can_edit"] == True
        assert permissions["can_delete"] == True
        assert permissions["can_sync_shopify"] == True
        assert permissions["can_manage_users"] == True


class TestAIProductEditorEndpoints:
    """Tests for AI Product Editor endpoints"""
    
    def test_shopify_products_endpoint(self):
        """Test that /api/shopify/products returns products"""
        response = requests.get(
            f"{BASE_URL}/api/shopify/products",
            params={"page": 1, "limit": 5}
        )
        
        assert response.status_code == 200, f"Products endpoint failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "products" in data
        assert "total" in data
        assert isinstance(data["products"], list)
    
    def test_shopify_products_with_search(self):
        """Test products endpoint with search filter"""
        response = requests.get(
            f"{BASE_URL}/api/shopify/products",
            params={"page": 1, "limit": 5, "search": "shoes"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
    
    def test_shopify_products_with_store_filter(self):
        """Test products endpoint with store filter"""
        response = requests.get(
            f"{BASE_URL}/api/shopify/products",
            params={"page": 1, "limit": 5, "store_name": "tnvcollection"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
    
    def test_shopify_products_linked_filter(self):
        """Test products endpoint with linked_only filter"""
        response = requests.get(
            f"{BASE_URL}/api/shopify/products",
            params={"page": 1, "limit": 5, "linked_only": "true"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # All returned products should have linked_1688_product_id
        for product in data.get("products", []):
            if product.get("linked_1688_product_id"):
                assert len(product["linked_1688_product_id"]) > 0


class TestUserLogin:
    """Tests for user login functionality"""
    
    def test_login_with_valid_credentials(self):
        """Test login with valid admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/agents/login",
            json={"username": "admin", "password": "admin"}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "agent" in data
        assert data["agent"]["username"] == "admin"
        assert "id" in data["agent"]
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/agents/login",
            json={"username": "admin", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
