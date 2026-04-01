import sqlite3

def force_migrate():
    conn = sqlite3.connect('circleup.db')
    cursor = conn.cursor()
    
    statements = [
        "ALTER TABLE borrows ADD COLUMN start_date DATETIME",
        "ALTER TABLE borrows ADD COLUMN end_date DATETIME",
        "ALTER TABLE borrows ADD COLUMN status TEXT DEFAULT 'pending'",
        "ALTER TABLE users ADD COLUMN push_token TEXT"
    ]
    
    for stmt in statements:
        try:
            cursor.execute(stmt)
            print(f"SUCCESS: {stmt}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"ALREADY EXISTS: {stmt}")
            else:
                print(f"ERROR executing {stmt} -> {e}")
        except Exception as e:
            print(f"EXCEPTION: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    force_migrate()
