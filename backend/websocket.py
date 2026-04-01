from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

router = APIRouter(tags=["websocket"])

# Store active connections: {user_id: websocket}
active_connections: Dict[int, List[WebSocket]] = {}

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await websocket.accept()
    if user_id not in active_connections:
        active_connections[user_id] = []
    active_connections[user_id].append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back or handle message routing
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        active_connections[user_id].remove(websocket)
        if not active_connections[user_id]:
            del active_connections[user_id]

async def notify_user(user_id: int, message: str):
    if user_id in active_connections:
        for ws in active_connections[user_id]:
            await ws.send_text(message)
