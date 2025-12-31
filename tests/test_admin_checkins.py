"""
Backend tests for Admin Check-in Management features:
- Admin login and authentication
- GET /admin/checkins - List all check-ins
- PUT /admin/checkins/{checkin_id}/guest-data - Update guest data
- GET /admin/checkins/export-questura - Export data for Questura
- POST /admin/media/upload - Upload document photos
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://checkinmaster.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@maisonette.it"
ADMIN_PASSWORD = "admin123"


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Test admin can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "guest" in data, "No guest data in response"
        assert data["guest"]["is_admin"] == True, "User is not admin"
        print(f"✅ Admin login successful, token received")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test login fails with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Invalid credentials correctly rejected")


class TestAdminCheckins:
    """Test admin check-in management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_all_checkins(self):
        """Test GET /admin/checkins returns list of check-ins"""
        response = requests.get(f"{BASE_URL}/api/admin/checkins", headers=self.headers)
        
        assert response.status_code == 200, f"Failed to get checkins: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Got {len(data)} check-ins")
        
        # Check structure of check-ins if any exist
        if len(data) > 0:
            checkin = data[0]
            assert "id" in checkin, "Check-in should have id"
            print(f"  First check-in ID: {checkin['id']}")
            print(f"  Guest name: {checkin.get('guest_nome', 'N/A')}")
            print(f"  Status: {checkin.get('status', 'N/A')}")
            print(f"  Source: {checkin.get('source', 'N/A')}")
        
        return data
    
    def test_get_checkins_unauthorized(self):
        """Test GET /admin/checkins fails without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/checkins")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Unauthorized access correctly rejected")
    
    def test_update_guest_data(self):
        """Test PUT /admin/checkins/{id}/guest-data updates guest info"""
        # First get existing check-ins
        checkins_response = requests.get(f"{BASE_URL}/api/admin/checkins", headers=self.headers)
        assert checkins_response.status_code == 200
        checkins = checkins_response.json()
        
        if len(checkins) == 0:
            pytest.skip("No check-ins available to test update")
        
        # Get first check-in
        checkin = checkins[0]
        checkin_id = checkin["id"]
        
        # Update guest data
        guest_data = {
            "ospite_principale": {
                "nome": "Test",
                "cognome": "Guest",
                "data_nascita": "1990-01-15",
                "luogo_nascita": "Roma",
                "nazionalita": "Italia",
                "sesso": "M",
                "tipo_documento": "carta_identita",
                "numero_documento": "AB1234567",
                "scadenza_documento": "2030-01-01",
                "luogo_rilascio": "Roma"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/checkins/{checkin_id}/guest-data",
            json=guest_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to update guest data: {response.text}"
        data = response.json()
        assert "message" in data, "Response should have message"
        print(f"✅ Guest data updated for check-in {checkin_id}")
        
        # Verify the update by fetching check-ins again
        verify_response = requests.get(f"{BASE_URL}/api/admin/checkins", headers=self.headers)
        assert verify_response.status_code == 200
        updated_checkins = verify_response.json()
        
        # Find the updated check-in
        updated_checkin = next((c for c in updated_checkins if c["id"] == checkin_id), None)
        assert updated_checkin is not None, "Updated check-in not found"
        
        if updated_checkin.get("ospite_principale"):
            assert updated_checkin["ospite_principale"]["nome"] == "Test"
            assert updated_checkin["ospite_principale"]["cognome"] == "Guest"
            print(f"✅ Guest data verified: {updated_checkin['ospite_principale']['nome']} {updated_checkin['ospite_principale']['cognome']}")
    
    def test_update_guest_data_not_found(self):
        """Test PUT /admin/checkins/{id}/guest-data returns 404 for invalid ID"""
        response = requests.put(
            f"{BASE_URL}/api/admin/checkins/invalid-id-12345/guest-data",
            json={"ospite_principale": {"nome": "Test"}},
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Invalid check-in ID correctly returns 404")
    
    def test_update_guest_data_empty_payload(self):
        """Test PUT /admin/checkins/{id}/guest-data returns 400 for empty data"""
        # First get a valid check-in ID
        checkins_response = requests.get(f"{BASE_URL}/api/admin/checkins", headers=self.headers)
        checkins = checkins_response.json()
        
        if len(checkins) == 0:
            pytest.skip("No check-ins available to test")
        
        checkin_id = checkins[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/checkins/{checkin_id}/guest-data",
            json={},
            headers=self.headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✅ Empty payload correctly returns 400")


class TestExportQuestura:
    """Test Questura export functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_export_questura_no_filters(self):
        """Test GET /admin/checkins/export-questura without date filters"""
        response = requests.get(
            f"{BASE_URL}/api/admin/checkins/export-questura",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Export failed: {response.text}"
        data = response.json()
        
        assert "count" in data, "Response should have count"
        assert "data" in data, "Response should have data"
        assert "format_info" in data, "Response should have format_info"
        assert isinstance(data["data"], list), "Data should be a list"
        
        print(f"✅ Export Questura returned {data['count']} records")
        
        # Check data structure if records exist
        if data["count"] > 0:
            record = data["data"][0]
            expected_fields = [
                "tipo_alloggiato", "data_arrivo", "permanenza", "cognome", "nome",
                "sesso", "data_nascita", "comune_nascita", "stato_nascita",
                "cittadinanza", "tipo_documento", "numero_documento", "luogo_rilascio"
            ]
            for field in expected_fields:
                assert field in record, f"Missing field: {field}"
            print(f"  First record: {record['nome']} {record['cognome']}")
    
    def test_export_questura_with_date_filters(self):
        """Test GET /admin/checkins/export-questura with date filters"""
        response = requests.get(
            f"{BASE_URL}/api/admin/checkins/export-questura",
            params={"data_da": "2024-01-01", "data_a": "2025-12-31"},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Export with filters failed: {response.text}"
        data = response.json()
        
        assert "count" in data
        assert "data" in data
        print(f"✅ Export Questura with date filters returned {data['count']} records")
    
    def test_export_questura_unauthorized(self):
        """Test export fails without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/checkins/export-questura")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Unauthorized export correctly rejected")


class TestMediaUpload:
    """Test media upload functionality for document photos"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_upload_media_endpoint_exists(self):
        """Test POST /admin/media/upload endpoint exists"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        data = {"nome": "Test Document"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/media/upload",
            files=files,
            data=data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        
        assert "url" in result, "Response should have url"
        assert "filename" in result, "Response should have filename"
        print(f"✅ Media upload successful: {result['url']}")
        
        return result
    
    def test_upload_media_unauthorized(self):
        """Test upload fails without auth"""
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/media/upload",
            files=files
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Unauthorized upload correctly rejected")
    
    def test_get_media_list(self):
        """Test GET /admin/media returns list of uploaded media"""
        response = requests.get(
            f"{BASE_URL}/api/admin/media",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get media: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Got {len(data)} media files")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
