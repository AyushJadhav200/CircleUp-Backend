import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('circleup.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE tools ADD COLUMN sale_price FLOAT")
        conn.commit()
        print("Column 'sale_price' added successfully to 'tools' table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column 'sale_price' already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
