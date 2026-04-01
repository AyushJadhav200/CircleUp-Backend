import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def trigger_borrow():
    print("[Debug] Attempting to trigger /borrow locally...")
    # 1. Login to get token
    login_data = {"username": "sagar.mock@circleup.local", "password": "000000"}
    res = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if res.status_code != 200:
        print(f"Login failed: {res.text}")
        return
    token = res.json()["access_token"]
    
    # 2. Trigger borrow for tool 1
    headers = {"Authorization": f"Bearer {token}"}
    borrow_data = {
        "tool_id": 1,
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=1)).isoformat()
    }
    res = requests.post(f"{BASE_URL}/tools/borrow", json=borrow_data, headers=headers)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.text}")

if __name__ == "__main__":
    trigger_borrow()
