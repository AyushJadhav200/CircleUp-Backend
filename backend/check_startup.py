try:
    print("[Debug] Checking imports...")
    import main
    print("[Debug] Imports successful!")
    
    print("[Debug] Checking database tables...")
    from database import engine, Base
    Base.metadata.create_all(bind=engine)
    print("[Debug] Tables checked/created successfully!")
    
    print("[Debug] Checking Tools router...")
    from tools import router as tools_router
    print("[Debug] Tools router loaded successfully!")
    
    print("[Debug] All startup checks PASSED.")
except Exception as e:
    import traceback
    print("[Debug] STARTUP FAILED:")
    traceback.print_exc()
