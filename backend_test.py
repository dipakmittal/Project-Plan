import requests
import sys
import json
import io
from datetime import datetime
import tempfile
import pandas as pd

class ProjectPlanAPITester:
    def __init__(self, base_url="https://plan-builder-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_plan_ids = []  # Track created plans for cleanup

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {}
        
        if data and not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and 'plan_id' in response_data:
                        self.created_plan_ids.append(response_data['plan_id'])
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_create_manual_plan(self, title="Test Plan"):
        """Test creating a plan manually"""
        success, response = self.run_test(
            "Create Manual Plan",
            "POST",
            "plans",
            200,  # Based on the code, it should return 200, not 201
            data={"title": title}
        )
        return success, response

    def test_get_all_plans(self):
        """Test getting all plans"""
        return self.run_test("Get All Plans", "GET", "plans", 200)

    def test_get_specific_plan(self, plan_id):
        """Test getting a specific plan by ID"""
        return self.run_test(
            f"Get Plan {plan_id}",
            "GET",
            f"plans/{plan_id}",
            200
        )

    def test_update_plan(self, plan_id, update_data):
        """Test updating a plan"""
        return self.run_test(
            f"Update Plan {plan_id}",
            "PUT",
            f"plans/{plan_id}",
            200,
            data=update_data
        )

    def test_delete_plan(self, plan_id):
        """Test deleting a plan"""
        return self.run_test(
            f"Delete Plan {plan_id}",
            "DELETE",
            f"plans/{plan_id}",
            200
        )

    def create_sample_excel_file(self):
        """Create a sample Excel file for testing upload"""
        # Create a temporary Excel file with multiple sheets
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
            with pd.ExcelWriter(tmp_file.name, engine='openpyxl') as writer:
                # Create sample data for different sheets
                sheets_data = {
                    'Title Sheet': pd.DataFrame({
                        'Field': ['Project Name', 'Version', 'Date'],
                        'Value': ['Test Project', '1.0', '2024-01-01']
                    }),
                    'Revision History': pd.DataFrame({
                        'Version': ['1.0', '1.1'],
                        'Date': ['2024-01-01', '2024-01-15'],
                        'Changes': ['Initial version', 'Bug fixes']
                    }),
                    'Project Introduction': pd.DataFrame({
                        'Section': ['Overview', 'Objectives'],
                        'Content': ['This is a test project', 'Test all functionality']
                    })
                }
                
                for sheet_name, df in sheets_data.items():
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            return tmp_file.name

    def test_upload_excel_plan(self, title="Excel Test Plan"):
        """Test uploading a plan from Excel file"""
        excel_file_path = self.create_sample_excel_file()
        
        try:
            with open(excel_file_path, 'rb') as f:
                files = {'file': ('test_plan.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
                data = {'title': title}
                
                success, response = self.run_test(
                    "Upload Excel Plan",
                    "POST",
                    "plans/upload",
                    200,
                    data=data,
                    files=files
                )
                return success, response
        except Exception as e:
            print(f"❌ Excel upload test failed: {str(e)}")
            return False, {}
        finally:
            # Clean up temporary file
            import os
            try:
                os.unlink(excel_file_path)
            except:
                pass

    def cleanup_created_plans(self):
        """Clean up plans created during testing"""
        print(f"\n🧹 Cleaning up {len(self.created_plan_ids)} created plans...")
        for plan_id in self.created_plan_ids:
            try:
                self.test_delete_plan(plan_id)
            except:
                print(f"   Warning: Could not delete plan {plan_id}")

def main():
    print("🚀 Starting Project Plan Management API Tests")
    print("=" * 60)
    
    # Initialize tester
    tester = ProjectPlanAPITester()
    
    # Test 1: Root endpoint
    print("\n📍 PHASE 1: Basic API Connectivity")
    tester.test_root_endpoint()
    
    # Test 2: Get all plans (initial state)
    print("\n📍 PHASE 2: Initial Data State")
    success, initial_plans = tester.test_get_all_plans()
    if success:
        print(f"   Found {len(initial_plans)} existing plans")
    
    # Test 3: Create manual plan
    print("\n📍 PHASE 3: Manual Plan Creation")
    success, manual_plan = tester.test_create_manual_plan("API Test Plan - Manual")
    manual_plan_id = None
    if success and 'plan_id' in manual_plan:
        manual_plan_id = manual_plan['plan_id']
        print(f"   Created plan with ID: {manual_plan_id}")
    
    # Test 4: Get specific plan
    if manual_plan_id:
        print("\n📍 PHASE 4: Plan Retrieval")
        tester.test_get_specific_plan(manual_plan_id)
    
    # Test 5: Update plan
    if manual_plan_id:
        print("\n📍 PHASE 5: Plan Updates")
        update_data = {
            "title": "Updated API Test Plan",
            "project_introduction": {
                "overview": "This plan was updated via API test"
            }
        }
        tester.test_update_plan(manual_plan_id, update_data)
    
    # Test 6: Excel upload
    print("\n📍 PHASE 6: Excel File Upload")
    success, excel_plan = tester.test_upload_excel_plan("API Test Plan - Excel")
    excel_plan_id = None
    if success and 'plan_id' in excel_plan:
        excel_plan_id = excel_plan['plan_id']
        print(f"   Uploaded plan with ID: {excel_plan_id}")
    
    # Test 7: Get all plans (after creation)
    print("\n📍 PHASE 7: Final Data State")
    success, final_plans = tester.test_get_all_plans()
    if success:
        print(f"   Found {len(final_plans)} total plans")
        if len(initial_plans) < len(final_plans):
            print(f"   Successfully added {len(final_plans) - len(initial_plans)} new plans")
    
    # Test 8: Error handling - Get non-existent plan
    print("\n📍 PHASE 8: Error Handling")
    tester.run_test("Get Non-existent Plan", "GET", "plans/NONEXIST", 404)
    
    # Test 9: Error handling - Invalid Excel upload
    print("\n📍 PHASE 9: Invalid File Upload")
    try:
        files = {'file': ('test.txt', io.StringIO('not an excel file'), 'text/plain')}
        data = {'title': 'Invalid File Test'}
        tester.run_test(
            "Upload Invalid File",
            "POST",
            "plans/upload",
            400,
            data=data,
            files=files
        )
    except Exception as e:
        print(f"   Expected error for invalid file: {str(e)}")
    
    # Cleanup (keeping test data for further testing)
    print("\n📍 PHASE 10: Cleanup")
    print("   Skipping cleanup - test plans will remain for frontend testing")
    print(f"   Created plan IDs: {tester.created_plan_ids}")
    
    # Final results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("\n🎉 ALL TESTS PASSED! Backend API is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {tester.tests_run - tester.tests_passed} tests failed. Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())