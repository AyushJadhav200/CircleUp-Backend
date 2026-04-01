import sqlite3

def check_users():
    conn = sqlite3.connect('circleup.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email FROM users")
    users = cursor.fetchall()
    print("EXISTING USERS:", users)
    conn.close()

if __name__ == "__main__":
    check_users()
