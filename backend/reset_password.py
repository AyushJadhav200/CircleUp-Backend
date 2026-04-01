import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd_context.hash("123456")

conn = sqlite3.connect('circleup.db')
cursor = conn.cursor()
cursor.execute("UPDATE users SET password_hash = ? WHERE email = 'ayushjadhav200605@gmail.com'", (hashed,))
conn.commit()
conn.close()

print("Password successfully reset to '123456'")
