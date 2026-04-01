from database import SessionLocal, User
import json

db = SessionLocal()
try:
    user = db.query(User).first()
    print(f"Found user: {user.email if user else 'None'}")
    if user:
        print(f"Address JSON: {user.address_json}")
except Exception as e:
    print(f"Error querying database: {e}")
finally:
    db.close()
