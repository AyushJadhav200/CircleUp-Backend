from fastapi.testclient import TestClient
from main import app
import traceback
from datetime import datetime, timedelta

client = TestClient(app)

def debug_borrow():
    print("[Debug] Simulating borrow...")
    # 1. Get a token (borrower)
    login_data = {"username": "sagar.mock@circleup.local", "password": "000000"}
    login_res = client.post("/auth/login", data=login_data)
    token = login_res.json()["access_token"]
    
    # 2. Try to borrow (tool_id 1 is usually the drill)
    headers = {"Authorization": f"Bearer {token}"}
    borrow_data = {
        "tool_id": 1,
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=1)).isoformat()
    }
    try:
        response = client.post("/tools/borrow", json=borrow_data, headers=headers)
        print(f"[Debug] Status Code: {response.status_code}")
        print(f"[Debug] Response: {response.text}")
    except Exception as e:
        print("[Debug] Error caught during request:")
        traceback.print_exc()

if __name__ == "__main__":
    debug_borrow()
