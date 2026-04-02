from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import traceback
from datetime import datetime

load_dotenv() # Load variables from .env
from database import engine, Base
import auth
import tools
import karma
import websocket
import messages
import expansion
import shop
import payments

# 1. Initialize App
app = FastAPI(
    title="CircleUp Backend MVP",
    description="FastAPI backend for CircleUp community tool sharing app.",
    version="1.0.0"
)

# 2. Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    err_msg = f"[GLOBAL ERROR] {datetime.now()} - {request.url}\n{traceback.format_exc()}"
    print(err_msg)
    with open("global_error.log", "a") as f:
        f.write(err_msg + "\n" + "="*50 + "\n")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )

# 3. Database Initialization
Base.metadata.create_all(bind=engine)

def seed_db():
    from sqlalchemy.orm import Session
    from database import SessionLocal, User, Tool, Circle
    import utils
    
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            print("[CircleUp] Seeding Database...")
            
            # Main demo user (YOU can login with this)
            ayush = User(
                name="Ayush",
                email="test@circleup.app",
                password_hash=utils.get_password_hash("123456"),
                karma_points=350,
                is_owner=True,
                latitude=28.5355,
                longitude=77.3910
            )
            db.add(ayush)
            
            # Neighbor user (tools belong to them, so you can borrow)
            sagar = User(
                name="Sagar",
                email="sagar.mock@circleup.local",
                password_hash=utils.get_password_hash("000000"),
                karma_points=150,
                is_owner=True,
                latitude=28.5370,
                longitude=77.3920,
            )
            db.add(sagar)
            db.commit()
            db.refresh(ayush)
            db.refresh(sagar)
            
            # Add dummy tool listings owned by Sagar (so Ayush can borrow)
            tools_list = [
                Tool(
                    name="HD Power Drill (Bosch)", 
                    description="18V cordless Bosch power drill. Comes with 3 bits. Perfect for hanging shelves and assembling furniture.", 
                    category="Drills", 
                    price_per_day=15.0, 
                    owner_id=sagar.id, 
                    image_url="https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400",
                    latitude=28.5375,
                    longitude=77.3925,
                    is_available=True
                ),
                Tool(
                    name="6-Step Safety Ladder", 
                    description="Foldable aluminium 6-step ladder. Rated 150kg. Great for painting, fixing lights, or cleaning gutters.", 
                    category="Ladders", 
                    price_per_day=5.0, 
                    owner_id=sagar.id, 
                    image_url="https://images.unsplash.com/photo-1595420310898-33560737a916?w=400",
                    latitude=28.5360,
                    longitude=77.3900,
                    is_available=True
                ),
                Tool(
                    name="Garden Leaf Blower", 
                    description="High-powered Makita leaf blower with 3-speed settings. Use it to clear your yard in minutes!", 
                    category="Gardening", 
                    price_per_day=10.0, 
                    owner_id=sagar.id, 
                    image_url="https://images.unsplash.com/photo-1589714400584-6385a4a51190?w=400",
                    latitude=28.5380,
                    longitude=77.3930,
                    is_available=True
                ),
                Tool(
                    name="Electric Sander (Orbital)", 
                    description="5-inch random orbital sander. Includes sandpaper pads (80/120/240 grit). Perfect for furniture restoration.", 
                    category="Power Tools", 
                    price_per_day=12.0, 
                    owner_id=sagar.id, 
                    image_url="https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400",
                    latitude=28.5365,
                    longitude=77.3915,
                    is_available=True
                ),
                Tool(
                    name="Pressure Washer", 
                    description="1800W electric pressure washer. Great for cleaning cars, driveways, garden furniture. 5m hose included.", 
                    category="Cleaning", 
                    price_per_day=20.0, 
                    owner_id=sagar.id, 
                    image_url="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=400",
                    latitude=28.5350,
                    longitude=77.3905,
                    is_available=True
                ),
            ]
            db.add_all(tools_list)
            db.commit()

            # Seed initial Trust Circles
            circles = [
                Circle(name="Lakeview Neighbors", description="The original tool sharing circle for Lakeview residents.", center_lat=28.5355, center_lon=77.3910, radius=1500),
                Circle(name="Garden Club", description="Serious gardeners only! Shared lawnmowers and hedge trimmers.", center_lat=28.5385, center_lon=77.3940, radius=2000),
                Circle(name="Apartment 4B", description="A cozy circle for the residents of block 4B.", center_lat=28.5345, center_lon=77.3890, radius=500),
            ]
            db.add_all(circles)
            db.commit()
            print("[CircleUp] Seeding Tools Complete!")

            # Seed Shop Products
            shop.seed_products(db)
            print("[CircleUp] Seeding Products Complete!")
    finally:
        db.close()

# 4. Middleware & Routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/admin")
def serve_admin():
    from fastapi.responses import FileResponse
    return FileResponse("static/admin/index.html")

app.include_router(auth.router)
app.include_router(tools.router)
app.include_router(karma.router)
app.include_router(websocket.router)
app.include_router(messages.router)
app.include_router(expansion.router)
app.include_router(shop.router)
app.include_router(payments.router)

@app.api_route("/", methods=["GET", "HEAD", "POST", "OPTIONS"])
def read_root():
    return {
        "message": "Welcome to CircleUp API",
        "legal": "/static/legal/index.html"
    }
