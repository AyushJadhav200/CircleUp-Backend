from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db, User, Circle, Borrow, Tool, user_circles
import schemas
import auth
from datetime import datetime

router = APIRouter(prefix="/expansion", tags=["expansion"])

@router.get("/impact/stats", response_model=schemas.ImpactResponse)
def get_impact_stats(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    # 1. Calculate base stats from user's borrow history
    borrowed_count = db.query(Borrow).filter(Borrow.borrower_id == current_user.id, Borrow.is_returned == True).count()
    lent_count = db.query(Borrow).join(Tool).filter(Tool.owner_id == current_user.id, Borrow.is_returned == True).count()
    
    # 2. Mock impact math (circular economy principles)
    # Average tool production = 15kg CO2, 5kg Waste, $100 cost
    co2_saved = (borrowed_count + lent_count) * 12.5 # kg
    money_saved = (borrowed_count) * 45.0 + (lent_count) * 5.0 # Just logical proxies
    waste_diverted = (borrowed_count + lent_count) * 3.2 # kg
    
    # 3. Determine rank
    karma = current_user.karma_points
    if karma > 1000: rank = "Community Legend"
    elif karma > 500: rank = "Super Neighbor"
    elif karma > 200: rank = "Active Sharer"
    else: rank = "New Neighbor"
    
    return {
        "co2_saved": round(co2_saved, 1),
        "money_saved": round(money_saved, 2),
        "waste_diverted": round(waste_diverted, 1),
        "karma_rank": rank,
        "karma_points": karma,
        "neighbors_helped": lent_count
    }

@router.get("/circles", response_model=List[schemas.CircleResponse])
def get_circles(db: Session = Depends(get_db)):
    circles = db.query(Circle).all()
    # Add member count manually or via hybrid property in prod
    for c in circles:
        c.member_count = db.query(user_circles).filter(user_circles.c.circle_id == c.id).count()
    return circles

@router.post("/circles", response_model=schemas.CircleResponse)
def create_circle(circle: schemas.CircleCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    new_circle = Circle(
        name=circle.name,
        description=circle.description,
        image_url=circle.image_url,
        center_lat=circle.center_lat or current_user.latitude,
        center_lon=circle.center_lon or current_user.longitude,
        radius=circle.radius
    )
    db.add(new_circle)
    # Automatically join the circle you created
    new_circle.members.append(current_user)
    db.commit()
    db.refresh(new_circle)
    return new_circle

@router.post("/circles/{circle_id}/join")
def join_circle(circle_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    circle = db.query(Circle).filter(Circle.id == circle_id).first()
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    if current_user in circle.members:
        return {"message": "Already a member"}
    
    circle.members.append(current_user)
    db.commit()
    return {"message": "Joined successfully", "circle_id": circle_id}

@router.post("/borrows/{borrow_id}/handover")
def record_handover(borrow_id: int, handover: schemas.HandoverCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    borrow = db.query(Borrow).filter(Borrow.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow record not found")
    
    # Check if user is either owner or borrower to record handover
    tool = db.query(Tool).filter(Tool.id == borrow.tool_id).first()
    if current_user.id != tool.owner_id and current_user.id != borrow.borrower_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    borrow.handover_video_url = handover.video_url
    borrow.start_time = datetime.utcnow()
    borrow.status = "in_use"
    db.commit()
    return {"message": "Handover recorded", "start_time": borrow.start_time}

@router.post("/borrows/{borrow_id}/return")
def record_return(borrow_id: int, handover: schemas.HandoverCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    borrow = db.query(Borrow).filter(Borrow.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow record not found")
    
    tool = db.query(Tool).filter(Tool.id == borrow.tool_id).first()
    if current_user.id != tool.owner_id and current_user.id != borrow.borrower_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    borrow.return_video_url = handover.video_url
    borrow.end_time = datetime.utcnow()
    borrow.is_returned = True
    tool.is_available = True
    db.commit()
    return {"message": "Return recorded", "end_time": borrow.end_time}

@router.post("/ai/describe-tool", response_model=schemas.AIDescriptionResponse)
def ai_describe_tool(request: schemas.AIDescriptionRequest):
    # Mock AI logic for MVP - In prod, call OpenAI/Gemini here
    return {
        "name": "Premium Power Drill",
        "category": "Drills",
        "description": "High-torque cordless power drill perfect for home DIY. Includes 18V battery and charger. Well-maintained and ready for community use."
    }
