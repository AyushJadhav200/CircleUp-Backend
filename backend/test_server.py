from fastapi import FastAPI
import uvicorn
import sys

def test_startup():
    print("[Debug] Starting internal FastAPI test...")
    try:
        from main import app
        print("[Debug] App 'app' imported successfully.")
        # We won't actually .run() because it blocks, but we check if we can.
        print("[Debug] App is ready for uvicorn.")
    except Exception as e:
        import traceback
        print("[Debug] FAIL: App could not be loaded!")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_startup()
