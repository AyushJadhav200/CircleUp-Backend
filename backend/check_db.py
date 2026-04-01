import sqlite3
import json

conn = sqlite3.connect('circleup.db')
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(users)")
users_info = cursor.fetchall()

cursor.execute("PRAGMA table_info(borrows)")
borrows_info = cursor.fetchall()

with open('db_schema.txt', 'w') as f:
    f.write("USERS: " + json.dumps([col[1] for col in users_info]) + "\n")
    f.write("BORROWS: " + json.dumps([col[1] for col in borrows_info]) + "\n")

conn.close()
