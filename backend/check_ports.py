import socket
import sys

def check_port(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("0.0.0.0", port))
            print(f"Port {port} is FREE and bindable to 0.0.0.0")
        except socket.error as e:
            print(f"Port {port} is IN USE or restricted: {e}")

if __name__ == "__main__":
    check_port(8000)
    check_port(8001)
