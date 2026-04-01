"""
One-time DB reset script. Drops all tables and recreates with latest schema.
Run: cd backend && python reset_db.py
"""
# Import the Base and engine along with ALL models to register metadata
import database  # This imports everything including all models via __init__-level code
from database import Base, engine

print("[CircleUp] Dropping all tables...")
Base.metadata.drop_all(engine)

print("[CircleUp] Creating all tables with latest schema...")
Base.metadata.create_all(engine)

print("[CircleUp] Done! Restart the server or run seed_db() to populate data.")
