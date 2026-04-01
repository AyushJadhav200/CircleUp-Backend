import socket
import urllib.request
import subprocess
import os

def check_port(ip, port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2)
    try:
        s.connect((ip, port))
        return True
    except:
        return False
    finally:
        s.close()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def check_firewall():
    print("[Diag] Checking Firewall rules...")
    try:
        res = subprocess.check_output('netsh advfirewall firewall show rule name="CircleUp Backend"', shell=True).decode()
        if "Enabled: Yes" in res:
            print("  [OK] Firewall rule 'CircleUp Backend' is enabled.")
        else:
            print("  [WARN] Firewall rule found but might be disabled.")
    except:
        print("  [FAIL] No firewall rule named 'CircleUp Backend' found.")

def main():
    print("=== CircleUp Connectivity Diagnostics ===")
    
    local_ip = get_local_ip()
    print(f"[Diag] Detected Machine IP: {local_ip}")
    
    # Check Port 8000
    print(f"[Diag] Checking Port 8000 (Main API)...")
    if check_port("127.0.0.1", 8000):
        print("  [OK] Port 8000 is listening on localhost.")
    else:
        print("  [FAIL] Port 8000 is NOT listening on localhost.")

    if check_port(local_ip, 8000):
        print(f"  [OK] Port 8000 is accessible via {local_ip}.")
    else:
        print(f"  [FAIL] Port 8000 is NOT accessible via {local_ip}. Check uvicorn --host binding.")

    # Check Port 8001
    print(f"[Diag] Checking Port 8001 (Location API)...")
    if check_port(local_ip, 8001):
        print(f"  [OK] Port 8001 is accessible via {local_ip}.")
    else:
        print("  [FAIL] Port 8001 is NOT listening.")

    check_firewall()
    
    # Try a simple GET
    print("[Diag] Attempting local GET / ...")
    try:
        with urllib.request.urlopen(f"http://localhost:8000/") as response:
            print(f"  [OK] GET / returned status {response.getcode()}")
    except Exception as e:
        print(f"  [FAIL] GET / failed: {e}")

if __name__ == "__main__":
    main()
