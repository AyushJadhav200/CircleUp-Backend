import sqlite3
import os

def dump_to_md():
    conn = sqlite3.connect('circleup.db')
    cursor = conn.cursor()
    
    md_content = "# CircleUp Database Dump\n\n"
    
    # Dump Users
    md_content += "## Registered Users\n"
    cursor.execute("PRAGMA table_info(users)")
    user_cols = [col[1] for col in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    
    md_content += "| " + " | ".join(user_cols) + " |\n"
    md_content += "|" + "|".join(["---"] * len(user_cols)) + "|\n"
    
    for u in users:
        md_content += "| " + " | ".join([str(val) for val in u]) + " |\n"
        
    # Dump Borrows
    md_content += "\n## Active/Past Bookings (Borrows)\n"
    cursor.execute("PRAGMA table_info(borrows)")
    borrow_cols = [col[1] for col in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM borrows")
    borrows = cursor.fetchall()
    
    md_content += "| " + " | ".join(borrow_cols) + " |\n"
    md_content += "|" + "|".join(["---"] * len(borrow_cols)) + "|\n"
    
    for b in borrows:
        md_content += "| " + " | ".join([str(val) for val in b]) + " |\n"

    # Write to the artifact directory structure
    artifact_path = r"C:\Users\ayush\.gemini\antigravity\brain\29cbe8db-39e0-4d48-9219-d4d3a43dd715\database_dump.md"
    os.makedirs(os.path.dirname(artifact_path), exist_ok=True)
    with open(artifact_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    conn.close()
    print("Exported successfully to artifact!")

if __name__ == "__main__":
    dump_to_md()
