from sqlalchemy.orm import Session
from database import SessionLocal, User, Review, Borrow, engine
from sqlalchemy import text

def reset_data():
    db = SessionLocal()
    try:
        print("[CircleUp] Starting Launch Data Reset...")
        
        # 1. Delete all reviews
        review_count = db.query(Review).count()
        db.query(Review).delete()
        print(f"  --> Deleted {review_count} reviews.")
        
        # 2. Reset karma points to 0 for all users
        user_count = db.query(User).count()
        db.query(User).update({User.karma_points: 0})
        print(f"  --> Reset Karma to 0 for {user_count} users.")
        
        # 3. Optional: Clear old borrows if you want 'Rates' to disappear from activity
        # Since reviews are tied to borrows, old borrows might still prompt for reviews.
        # However, the user said 'only reset karma and rating'. 
        # But for 'Ratings' to be truly original, old rental records should probably be cleared.
        # I will leave them for now unless the user explicitly wants them gone.
        
        db.commit()
        print("[CircleUp] Launch Data Reset Complete!")
    except Exception as e:
        db.rollback()
        print(f"[CircleUp] Reset failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_data()
