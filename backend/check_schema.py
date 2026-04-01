import sqlite3

def check():
    conn = sqlite3.connect('circleup.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(tools)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"Column: {col[1]}, Type: {col[2]}")
    conn.close()

if __name__ == "__main__":
    check()
