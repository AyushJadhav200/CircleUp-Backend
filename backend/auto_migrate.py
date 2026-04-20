import sqlite3
import os
from sqlalchemy import create_engine, inspect, text
from database import SQLALCHEMY_DATABASE_URL

def run_migration():
    print(f"[CircleUp Doctor] Checking database at: {SQLALCHEMY_DATABASE_URL}")
    
    # We use raw SQL for migrations to be safe and avoid ORM conflicts
    # Since sqlite and postgres have slightly different syntax for ALTER TABLE
    # we'll handle the most common ones.
    
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    inspector = inspect(engine)
    
    def add_column_if_missing(table_name, column_name, column_type):
        columns = [c['name'] for c in inspector.get_columns(table_name)]
        if column_name not in columns:
            print(f"  --> Adding missing column: {table_name}.{column_name}")
            with engine.connect() as conn:
                try:
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))
                    conn.commit()
                except Exception as e:
                    print(f"  !! Failed to add {column_name}: {e}")
        else:
            # print(f"  CHECK: {table_name}.{column_name} is good")
            pass

    try:
        # Check 'users' table
        add_column_if_missing("users", "is_owner", "BOOLEAN DEFAULT FALSE")
        add_column_if_missing("users", "is_verified", "BOOLEAN DEFAULT FALSE")
        add_column_if_missing("users", "phone_number", "VARCHAR")
        add_column_if_missing("users", "push_token", "VARCHAR")
        add_column_if_missing("users", "address_json", "TEXT")
        add_column_if_missing("users", "karma_points", "INTEGER DEFAULT 0")
        add_column_if_missing("users", "avatar_url", "VARCHAR")
        add_column_if_missing("users", "latitude", "FLOAT")
        add_column_if_missing("users", "longitude", "FLOAT")
        add_column_if_missing("users", "id_document_url", "VARCHAR")
        add_column_if_missing("users", "referral_code", "VARCHAR")
        add_column_if_missing("users", "referred_by_id", "INTEGER")
        add_column_if_missing("users", "referral_bonus_claimed", "BOOLEAN DEFAULT FALSE")
        add_column_if_missing("users", "show_referral_celebration", "BOOLEAN DEFAULT FALSE")

        # Check 'tools' table
        add_column_if_missing("tools", "is_suspended", "BOOLEAN DEFAULT FALSE")
        add_column_if_missing("tools", "is_verified", "BOOLEAN DEFAULT TRUE")
        add_column_if_missing("tools", "is_featured", "BOOLEAN DEFAULT FALSE")
        add_column_if_missing("tools", "is_preowned", "BOOLEAN DEFAULT TRUE")
        add_column_if_missing("tools", "sub_category", "VARCHAR")
        add_column_if_missing("tools", "stock_quantity", "INTEGER DEFAULT 1")
        add_column_if_missing("tools", "latitude", "FLOAT")
        add_column_if_missing("tools", "longitude", "FLOAT")
        add_column_if_missing("tools", "sale_price", "FLOAT")
        add_column_if_missing("tools", "item_type", "VARCHAR DEFAULT 'Tool'")
        add_column_if_missing("tools", "image_url", "VARCHAR")

        
        # Check 'borrows' table (for financial tracking)
        add_column_if_missing("borrows", "rental_price", "FLOAT DEFAULT 0.0")
        add_column_if_missing("borrows", "service_fee", "FLOAT DEFAULT 0.0")
        add_column_if_missing("borrows", "grand_total", "FLOAT DEFAULT 0.0")
        add_column_if_missing("borrows", "delivery_fee", "FLOAT DEFAULT 0.0")
        add_column_if_missing("borrows", "is_delivery", "BOOLEAN DEFAULT FALSE")
        
        # New tables (Standard Base.metadata.create_all handles them if they're new, 
        # but auto_migrate is used for existing databases)
        with engine.connect() as conn:
            conn.execute(text("CREATE TABLE IF NOT EXISTS wishlists (id INTEGER PRIMARY KEY, user_id INTEGER, tool_id INTEGER, created_at DATETIME)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS product_wishlists (id INTEGER PRIMARY KEY, user_id INTEGER, product_id INTEGER, created_at DATETIME)"))
            conn.commit()

        print("OK: [CircleUp Doctor] Database schema is healthy and up-to-date!")
    except Exception as e:
        print(f"ERR: [CircleUp Doctor] Migration failed: {e}")

if __name__ == "__main__":
    run_migration()
