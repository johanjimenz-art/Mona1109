import requests
import sys
import json
from datetime import datetime

class InventoryAPITester:
    def __init__(self, base_url="https://clothtrack.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                details = f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}"
                self.log_test(name, False, details)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n=== TESTING AUTHENTICATION ===")
        
        # Test user registration
        test_user = f"testuser_{datetime.now().strftime('%H%M%S')}"
        test_password = "TestPass123!"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"username": test_user, "password": test_password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
        else:
            print("   Failed to get token from registration")
            return False

        # Test login with same user
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data={"username": test_user, "password": test_password}
        )

        # Test get current user
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )

        return True

    def test_products_crud(self):
        """Test product CRUD operations"""
        print("\n=== TESTING PRODUCTS CRUD ===")
        
        # Test create product
        product_data = {
            "descripcion": "Camiseta Test",
            "referencia": "TEST001",
            "color": "Azul",
            "costo_fabricacion": 15000.0,
            "talla": "M",
            "precio_venta": 25000.0,
            "cantidad_stock": 10
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        product_id = None
        if success and 'id' in response:
            product_id = response['id']
            print(f"   Product created with ID: {product_id}")

        # Test get all products
        success, response = self.run_test(
            "Get All Products",
            "GET",
            "products",
            200
        )

        # Test product search
        success, response = self.run_test(
            "Search Product",
            "GET",
            f"products/search?referencia=TEST001&talla=M&color=Azul",
            200
        )

        # Test update product
        if product_id:
            update_data = {
                "precio_venta": 30000.0,
                "cantidad_stock": 15
            }
            success, response = self.run_test(
                "Update Product",
                "PUT",
                f"products/{product_id}",
                200,
                data=update_data
            )

        # Test delete product
        if product_id:
            success, response = self.run_test(
                "Delete Product",
                "DELETE",
                f"products/{product_id}",
                200
            )

        return product_id

    def test_sales_flow(self):
        """Test complete sales flow"""
        print("\n=== TESTING SALES FLOW ===")
        
        # First create a product for sale
        product_data = {
            "descripcion": "Pantalón Venta Test",
            "referencia": "SALE001",
            "color": "Negro",
            "costo_fabricacion": 20000.0,
            "talla": "L",
            "precio_venta": 35000.0,
            "cantidad_stock": 5
        }
        
        success, response = self.run_test(
            "Create Product for Sale",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        if not success or 'id' not in response:
            print("   Cannot test sales without product")
            return False
            
        product_id = response['id']
        
        # Test create sale
        sale_data = {
            "nombre_cliente": "Juan Pérez",
            "documento_cliente": "12345678",
            "direccion_cliente": "Calle 123 #45-67",
            "celular_cliente": "3001234567",
            "items": [{
                "product_id": product_id,
                "referencia": "SALE001",
                "descripcion": "Pantalón Venta Test",
                "talla": "L",
                "color": "Negro",
                "precio_venta": 35000.0,
                "cantidad": 2,
                "subtotal": 70000.0
            }]
        }
        
        success, response = self.run_test(
            "Create Sale",
            "POST",
            "sales",
            200,
            data=sale_data
        )
        
        sale_id = None
        if success and 'id' in response:
            sale_id = response['id']

        # Test get all sales
        success, response = self.run_test(
            "Get All Sales",
            "GET",
            "sales",
            200
        )

        # Test get specific sale
        if sale_id:
            success, response = self.run_test(
                "Get Specific Sale",
                "GET",
                f"sales/{sale_id}",
                200
            )

        return True

    def test_stats(self):
        """Test statistics endpoint"""
        print("\n=== TESTING STATISTICS ===")
        
        success, response = self.run_test(
            "Get Statistics",
            "GET",
            "stats",
            200
        )
        
        if success:
            expected_fields = ['total_products', 'total_sales', 'total_revenue', 'total_stock_value']
            for field in expected_fields:
                if field not in response:
                    self.log_test(f"Stats Field {field}", False, f"Missing field {field}")
                else:
                    self.log_test(f"Stats Field {field}", True)

    def test_error_cases(self):
        """Test error handling"""
        print("\n=== TESTING ERROR CASES ===")
        
        # Test unauthorized access
        old_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access",
            "GET",
            "products",
            401
        )
        
        self.token = old_token
        
        # Test invalid product search
        success, response = self.run_test(
            "Invalid Product Search",
            "GET",
            "products/search?referencia=NONEXISTENT&talla=XL&color=Purple",
            404
        )
        
        # Test duplicate user registration
        success, response = self.run_test(
            "Duplicate User Registration",
            "POST",
            "auth/register",
            400,
            data={"username": "testuser_" + datetime.now().strftime('%H%M%S'), "password": "test"}
        )

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Inventory Management API Tests")
        print(f"   Base URL: {self.base_url}")
        
        try:
            # Test authentication
            if not self.test_auth_flow():
                print("❌ Authentication failed, stopping tests")
                return False

            # Test products
            self.test_products_crud()
            
            # Test sales
            self.test_sales_flow()
            
            # Test stats
            self.test_stats()
            
            # Test error cases
            self.test_error_cases()
            
        except Exception as e:
            print(f"❌ Test suite failed with exception: {str(e)}")
            return False

        # Print final results
        print(f"\n📊 FINAL RESULTS")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = InventoryAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())