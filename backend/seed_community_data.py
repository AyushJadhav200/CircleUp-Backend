from sqlalchemy.orm import Session
from database import SessionLocal, User, Tool, ToolImage
import utils

db = SessionLocal()
try:
    print("[CircleUp] Seeding Dummy Community Data...")
    
    # Check if Community User exists
    comm_user = db.query(User).filter(User.email == "community@circleup.local").first()
    if not comm_user:
        comm_user = User(
            name="Community Store",
            email="community@circleup.local",
            password_hash=utils.get_password_hash("000000"),
            karma_points=500,
            is_owner=False
        )
        db.add(comm_user)
        db.commit()
        db.refresh(comm_user)

    # Add dummy tools
    new_tools = [
        Tool(
            name="Professional Pressure Washer", 
            description="2500 PSI High-pressure washer for driveways and cars.", 
            category="Cleaning", 
            price_per_day=45.0, 
            owner_id=comm_user.id, 
            image_url="https://images.unsplash.com/photo-1520209759809-a9bcb6cb3241?w=400"
        ),
        Tool(
            name="Cordless Leaf Blower", 
            description="Super fast and easy to clean your yard.", 
            category="Garden", 
            price_per_day=12.0, 
            owner_id=comm_user.id, 
            image_url="https://images.unsplash.com/photo-1610647759191-c427387f353a?w=400"
        ),
        Tool(
            name="Heavy Duty Concrete Mixer", 
            description="Portable concrete mixer for your backyard projects.", 
            category="Construction", 
            price_per_day=85.0, 
            owner_id=comm_user.id, 
            image_url="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400"
        ),
    ]

    for t in new_tools:
        # Check if already exists by name
        exists = db.query(Tool).filter(Tool.name == t.name).first()
        if not exists:
            db.add(t)
            print(f"Added tool: {t.name}")
            
    db.commit()
    print("[CircleUp] Seeding Complete!")
finally:
    db.close()
