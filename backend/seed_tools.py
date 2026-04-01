from sqlalchemy.orm import Session
from database import SessionLocal, Tool, User, Society, engine, Base
import auth
import utils

def seed():
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Create a society if none exists
        society = db.query(Society).first()
        if not society:
            society = Society(name="Greenwood Heights", address="Seattle, WA 98103", center_lat=28.5355, center_lon=77.3910)
            db.add(society)
            db.commit()
            db.refresh(society)

        # Create the mock user if none exists
        user_email = "sagar.mock@circleup.local"
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            user = User(
                name="Sagar",
                email=user_email,
                password_hash=utils.get_password_hash("000000"),
                karma_points=120,
                society_id=society.id,
                latitude=28.5355,
                longitude=77.3910
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Add High-Fidelity Tools (matching the user's images)
        tools_data = [
            {
                "name": "Garden Tiller",
                "description": "High-powered tiller for garden prep.",
                "is_verified": True,
                "is_preowned": True,
                "lat_off": 0.002,
                "lon_off": 0.003
            },
            {
                "name": "Power Drill",
                "description": "Cordless 18V drill with battery.",
                "is_verified": True,
                "is_preowned": False,
                "lat_off": -0.003,
                "lon_off": 0.002
            },
            {
                "name": "Pressure Washer",
                "description": "3000 PSI pressure washer for driveways.",
                "is_verified": False,
                "is_preowned": True,
                "lat_off": 0.005,
                "lon_off": -0.004
            }
        ]

        for t_info in tools_data:
            existing = db.query(Tool).filter(Tool.name == t_info["name"]).first()
            if not existing:
                tool = Tool(
                    name=t_info["name"],
                    description=t_info["description"],
                    owner_id=user.id,
                    latitude=user.latitude + t_info["lat_off"],
                    longitude=user.longitude + t_info["lon_off"],
                    is_verified=t_info["is_verified"],
                    is_preowned=t_info["is_preowned"],
                    is_available=True
                )
                db.add(tool)
        
        db.commit()
        print("Database seeded successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
