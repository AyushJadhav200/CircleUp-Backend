import json
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Any

class ConnectionManager:
    def __init__(self):
        # Maps society_id to a list of active WebSocket connections
        self.active_rooms: Dict[int, List[WebSocket]] = {}
        
        # Optionally, map WebSocket -> User ID to know who disconnected
        self.socket_to_user: Dict[WebSocket, int] = {}

    async def connect(self, websocket: WebSocket, society_id: int, user_id: int):
        await websocket.accept()
        if society_id not in self.active_rooms:
            self.active_rooms[society_id] = []
        
        self.active_rooms[society_id].append(websocket)
        self.socket_to_user[websocket] = user_id
        
        # Broadcast that this user joined the room
        join_msg = json.dumps({"type": "presence", "action": "joined", "user_id": user_id, "society_id": society_id})
        await self.broadcast_to_society(society_id, join_msg, exclude=websocket)

    def disconnect(self, websocket: WebSocket, society_id: int):
        if society_id in self.active_rooms and websocket in self.active_rooms[society_id]:
            self.active_rooms[society_id].remove(websocket)
            if not self.active_rooms[society_id]:
                del self.active_rooms[society_id]
                
        user_id = self.socket_to_user.get(websocket)
        if user_id:
            del self.socket_to_user[websocket]

    async def broadcast_to_society(self, society_id: int, message: str, exclude: WebSocket = None):
        """
        Broadcasts a message to all connected clients within a specific society.
        """
        if society_id in self.active_rooms:
            for connection in self.active_rooms[society_id]:
                if connection != exclude:
                    try:
                        await connection.send_text(message)
                    except Exception as e:
                        # Handle dropped connections gracefully
                        print(f"Failed to send to socket: {e}")

manager = ConnectionManager()
