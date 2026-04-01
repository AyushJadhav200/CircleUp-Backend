import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Local imports
from database import engine, Base, get_db, User, Society
from auth import router as auth_router, get_current_user
from websocket import manager
from utils import decode_access_token

# Initialize SQLite Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Location Backend MVP", description="Blinkit-style location broadcaster")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Auth Routes (Signup/Login)
app.include_router(auth_router)

# ---------------------------------------------------------
# WebSocket endpoint for real-time location broadcast
# ---------------------------------------------------------
@app.websocket("/ws/location")
async def websocket_location_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    """
    Client must pass the JWT token in query params: `ws://ip:port/ws/location?token=eyJ...`
    Or headers if configured in frontend, but query is easier for WebSockets natively.
    """
    # 1. Authenticate User from Token
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=1008, reason="Invalid credentials")
        return
        
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not user.society_id:
        # User must belong to a society to broadcast/receive locations
        await websocket.close(code=1008, reason="User not found or not in a society")
        return

    # 2. Connect to the WebSocket Manager inside their specific Society Room
    await manager.connect(websocket, society_id=user.society_id, user_id=user.id)
    
    try:
        while True:
            # 3. Receive new coordinate updates from this client
            # Expected format: {"lat": 12.34, "lon": 56.78}
            data = await websocket.receive_text()
            location_data = json.loads(data)
            
            lat = location_data.get("lat")
            lon = location_data.get("lon")
            
            if lat and lon:
                # Optional: Update the database async or batch it. 
                # For high frequency, broadcasting directly is preferred.
                
                # 4. Broadcast the location update to EVERYONE else in the same society!
                msg = {
                    "type": "location_update",
                    "user_id": user.id,
                    "lat": lat,
                    "lon": lon,
                    "society_id": user.society_id
                }
                
                # Exclude sender from their own broadcast to prevent duplicate rubber-banding
                await manager.broadcast_to_society(
                    society_id=user.society_id, 
                    message=json.dumps(msg), 
                    exclude=websocket
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, society_id=user.society_id)
        # Notify others that user disconnected
        disconnect_msg = json.dumps({"type": "presence", "action": "left", "user_id": user.id})
        await manager.broadcast_to_society(user.society_id, disconnect_msg)

# ---------------------------------------------------------
# Utility Routes
# ---------------------------------------------------------
@app.post("/test/seed-society")
def seed_society(db: Session = Depends(get_db)):
    """Seed a dummy society for testing"""
    soc = Society(name="Test Society", address="123 Road", center_lat=28.5, center_lon=77.3)
    db.add(soc)
    db.commit()
    db.refresh(soc)
    return {"msg": "Society Created", "society": soc}

@app.get("/")
def read_root():
    return {"status": "Live Location Tracking MVP is running"}
