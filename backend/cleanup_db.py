import sqlite3
import json

def clean_database():
    conn = sqlite3.connect('circleup.db')
    cursor = conn.cursor()
    
    # Let's see who we have
    cursor.execute('SELECT id, name, email FROM users')
    all_users = cursor.fetchall()
    
    print("ALL USERS:", all_users)
    
    # We will delete users who don't seem real. 
    # Real users likely have @gmail.com or are known like sagar.moc
    real_emails = ['sagar.moc', 'ayushkumarshukla08@gmail.com', 'yashyadav200605@gmail.com']
    
    users_to_delete = []
    for user in all_users:
        if user[2] not in real_emails: # user[2] is email
            users_to_delete.append(user[0]) # add id
            
    if not users_to_delete:
        print("No dummy users found to delete.")
        conn.close()
        return

    print("DELETING USER IDs:", users_to_delete)
    
    # Delete borrows associated with these users
    placeholders = ', '.join('?' for _ in users_to_delete)
    cursor.execute(f"DELETE FROM borrows WHERE borrower_id IN ({placeholders})", users_to_delete)
    
    # Delete tools associated with these users
    # And borrows for those tools
    cursor.execute(f"SELECT id FROM tools WHERE owner_id IN ({placeholders})", users_to_delete)
    tool_ids_to_delete = [row[0] for row in cursor.fetchall()]
    
    if tool_ids_to_delete:
        tool_placeholders = ', '.join('?' for _ in tool_ids_to_delete)
        cursor.execute(f"DELETE FROM borrows WHERE tool_id IN ({tool_placeholders})", tool_ids_to_delete)
        cursor.execute(f"DELETE FROM tools WHERE owner_id IN ({placeholders})", users_to_delete)
        
    # Delete the users
    cursor.execute(f"DELETE FROM users WHERE id IN ({placeholders})", users_to_delete)
    
    conn.commit()
    conn.close()
    
    print(f"Successfully deleted {len(users_to_delete)} dummy users and their tools.")

if __name__ == '__main__':
    clean_database()
