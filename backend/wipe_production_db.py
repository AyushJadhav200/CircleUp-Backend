from database import engine, Base, User, Tool, Borrow, Circle, Message, Conversation, Review, Product, ToolImage, ProductImage, user_circles
from sqlalchemy.orm import Session
from database import SessionLocal

def wipe_data():
    print("[CircleUp] Purging all dummy data for production launch...")
    db = SessionLocal()
    try:
        # Delete association table entries first
        db.execute(user_circles.delete())
        
        # Delete all records from other tables
        db.query(Review).delete()
        db.query(Message).delete()
        db.query(Conversation).delete()
        db.query(Borrow).delete()
        db.query(ToolImage).delete()
        db.query(Tool).delete()
        db.query(ProductImage).delete()
        db.query(Product).delete()
        db.query(Circle).delete()
        db.query(User).delete()
        
        db.commit()
        print("[CircleUp] Success: All dummy data has been removed. The app is now clean.")
    except Exception as e:
        db.rollback()
        print(f"[CircleUp] FAILED to wipe data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    wipe_data()
