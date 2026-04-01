import sqlite3

try:
    c = sqlite3.connect('circleup.db')
    tables = c.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
    print("TABLES:", tables)
    
    if any(t[0] == 'tools' for t in tables):
        rows = c.execute("SELECT * FROM tools").fetchall()
        print("TOOLS COUNT:", len(rows))
    else:
        print("TOOLS TABLE IS MISSING!")
except Exception as e:
    print("ERROR:", e)
