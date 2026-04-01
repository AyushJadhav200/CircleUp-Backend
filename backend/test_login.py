import requests

BASE_URL = "http://localhost:8000"

def test_login():
    try:
        data = {
            "username": "sagar.mock@circleup.local",
            "password": "000000"
        }
        r = requests.post(f"{BASE_URL}/auth/login", data=data)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
