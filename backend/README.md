# CircleUp FastAPI Backend

This is the complete backend for the CircleUp mobile application, providing APIs for tool sharing, user authentication, karma point tracking, and real-time WebSocket location tracking.

## Features Included

- **Authentication**: JWT-based email/password registration and login.
- **Database**: SQLite database using SQLAlchemy ORM.
- **Tools API**: Add tools, borrow tools (creates QR code), return tools (verifies QR code), and find nearby tools using Haversine distance.
- **Karma & Leaderboard**: Endpoints to track community contribution points and view top neighbors.
- **Real-Time Location**: WebSocket endpoint to broadcast live lat/lon coordinates (Zomato/Blinkit style).

---

## 🚀 Setup & Execution

### 1. Requirements

Ensure you have Python 3.9+ installed.

### 2. Installation

1. Open your terminal in this directory (`backend`).
2. Create standard virtual environment (recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 3. Running the Server

Start the FastAPI application using Uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- The API will be running at: `http://localhost:8000`
- Interactive Swagger UI Docs: `http://localhost:8000/docs`
- ReDoc Docs: `http://localhost:8000/redoc`

*(Note: Use `--host 0.0.0.0` so your Expo React Native app can access it via your computer's local local IP address, e.g., `http://192.168.x.x:8000`)*.

---

## 📍 Testing WebSocket Live Location Updates

The backend provides a `/ws/location/{client_id}` endpoint.

You can test this natively in your React Native app or using any WebSocket client hook like [Postman WebSocket tool](https://learning.postman.com/docs/sending-requests/websocket/websocket/).

### How it works:
1. Client A (e.g. sender) connects to `ws://localhost:8000/ws/location/userA_sender`
2. Client B (e.g. receiver) connects to `ws://localhost:8000/ws/location/userB_receiver`

**Sending a coordinate update:**
Client A sends a JSON string through their connection:
```json
{
  "lat": 28.535517,
  "lon": 77.391026,
  "status": "arriving"
}
```

**Receiving:**
Client B will instantaneously receive this broadcasted message:
```json
{
  "lat": 28.535517, 
  "lon": 77.391026, 
  "status": "arriving", 
  "client_id": "userA_sender"
}
```

In your React Native Expo app, you would parse this incoming JSON and use something like `react-native-maps` to interpolate the marker smoothly to the new `(lat, lon)` using `AnimatedRegion` or `react-native-reanimated`.
