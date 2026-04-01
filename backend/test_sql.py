from database import SessionLocal, User
import sqlalchemy as sa

db = SessionLocal()
try:
    query = db.query(User).filter(User.email == "test@test.com")
    print(f"Generated SQL: {query.statement}")
    user = query.first()
    print("Query executed successfully.")
except Exception as e:
    print(f"ERROR: {e}")
finally:
    db.close()
