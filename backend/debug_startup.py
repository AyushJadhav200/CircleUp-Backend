import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from main import app
    print("Backend app imported successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
