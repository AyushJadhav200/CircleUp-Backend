from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./circleup.db")
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_migration():
    print(f"Connecting to {SQLALCHEMY_DATABASE_URL}")
    with engine.connect() as conn:
        try:
            # 1. Add address_json if missing (already existing migration)
            result = conn.execute(text("PRAGMA table_info(users)"))
            user_cols = [row[1] for row in result]
            if "address_json" not in user_cols:
                print("Adding address_json to users...")
                conn.execute(text("ALTER TABLE users ADD COLUMN address_json TEXT"))
            
            # 2. Add video columns and times to borrows
            result = conn.execute(text("PRAGMA table_info(borrows)"))
            borrow_cols = [row[1] for row in result]
            if "handover_video_url" not in borrow_cols:
                print("Adding video columns to borrows...")
                conn.execute(text("ALTER TABLE borrows ADD COLUMN handover_video_url TEXT"))
                conn.execute(text("ALTER TABLE borrows ADD COLUMN return_video_url TEXT"))
                conn.execute(text("ALTER TABLE borrows ADD COLUMN start_time DATETIME"))
                conn.execute(text("ALTER TABLE borrows ADD COLUMN end_time DATETIME"))

            # 3. Add location columns to products
            result = conn.execute(text("PRAGMA table_info(products)"))
            product_cols = [row[1] for row in result]
            if "latitude" not in product_cols:
                print("Adding latitude/longitude to products...")
                conn.execute(text("ALTER TABLE products ADD COLUMN latitude FLOAT"))
                conn.execute(text("ALTER TABLE products ADD COLUMN longitude FLOAT"))

            # 4. Create Circle and UserCircle tables
            print("Ensuring Circles and UserCircles tables exist...")
            # We use declarative_base and metadata.create_all via a separate call if needed, 
            # but for this script let's keep it manual for absolute control.
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS circles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    image_url TEXT,
                    center_lat FLOAT,
                    center_lon FLOAT,
                    radius FLOAT DEFAULT 1000.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_circles (
                    user_id INTEGER NOT NULL,
                    circle_id INTEGER NOT NULL,
                    PRIMARY KEY (user_id, circle_id),
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (circle_id) REFERENCES circles (id)
                )
            """))

            conn.commit()
            print("Migration completed successfully!")
        except Exception as e:
            print(f"Migration error: {e}")
            conn.rollback()

if __name__ == "__main__":
    run_migration()
