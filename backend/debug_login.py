from fastapi.testclient import TestClient
from main import app
import traceback

client = TestClient(app)

def debug_login():
    print("[Debug] Simulating login...")
    try:
        data = {
            "username": "sagar.mock@circleup.local",
            "password": "000000"
        }
        response = client.post("/auth/login", data=data)
        print(f"[Debug] Status Code: {response.status_code}")
        print(f"[Debug] Response: {response.text}")
    except Exception as e:
        print("[Debug] Error caught during request:")
        traceback.print_exc()

if __name__ == "__main__":
    debug_login()
