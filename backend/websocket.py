from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging

router = APIRouter(tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        # {user_id: [websocket_connections]}
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logging.info(f"[WS] User {user_id} connected. Active pools: {len(self.active_connections.keys())}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logging.info(f"[WS] User {user_id} disconnected.")

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logging.error(f"[WS] Error sending to user {user_id}: {e}")

manager = ConnectionManager()

@router.websocket("/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive; client can send pings
            data = await websocket.receive_text()
            # Handle incoming signals if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logging.error(f"[WS] Unexpected error for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)

async def notify_user(user_id: int, message_payload: dict):
    await manager.send_personal_message(message_payload, user_id)
