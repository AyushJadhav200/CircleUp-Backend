from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, User
import auth

router = APIRouter(prefix="/karma", tags=["karma"])

@router.get("/me")
def get_my_karma(current_user: User = Depends(auth.get_current_user)):
    return {
        "karma_points": current_user.karma_points,
        "name": current_user.name
    }

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    # Returns top 10 users with highest karma
    users = db.query(User).order_by(User.karma_points.desc()).limit(10).all()
    return [{"name": u.name, "karma_points": u.karma_points} for u in users]

@router.get("/history")
def get_karma_history(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    from database import Borrow, Tool
    
    # 1. Get lending history (Earned points)
    lends = db.query(Borrow).join(Tool).filter(Tool.owner_id == current_user.id).all()
    lend_history = []
    for l in lends:
        tool = db.query(Tool).filter(Tool.id == l.tool_id).first()
        lend_history.append({
            "id": f"lend_{l.id}",
            "type": "earned",
            "label": f"Lent {tool.name}",
            "points": f"+{int(tool.price_per_day)}",
            "date": l.borrow_date.strftime("%b %d")
        })

    # 2. Get borrowing history (Spent points)
    borrows = db.query(Borrow).filter(Borrow.borrower_id == current_user.id).all()
    borrow_history = []
    for b in borrows:
        tool = db.query(Tool).filter(Tool.id == b.tool_id).first()
        borrow_history.append({
            "id": f"borrow_{b.id}",
            "type": "spent",
            "label": f"Borrowed {tool.name}",
            "points": f"-{int(tool.price_per_day)}",
            "date": b.borrow_date.strftime("%b %d")
        })

    # Merge and sort by date (simulated by ID for now, or use borrow_date if we want to be precise)
    history = lend_history + borrow_history
    # Sort descending (newest first)
    history.sort(key=lambda x: x["id"], reverse=True)
    
    return history
