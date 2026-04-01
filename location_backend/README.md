# Blinkit-Style Live Location Backend

This represents a clean, focused FastAPI implementation specifically for broadcasting live location markers among users matching a specific `society_id` (like a physical neighborhood or building complex).

## Backend Setup

1. Create a virtual environment and install requirements:
```bash
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

2. Run the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

3. Seed the database with a Society and 2 Users using the interactive docs at:
`http://localhost:8000/docs`

---

## Expo / React Native Frontend Integration

To connect your React Native mobile application to this live location engine, follow this implementation roadmap:

### 1. Requirements
Install a map library and location tracking tools in Expo:
```bash
npx expo install react-native-maps expo-location
```

### 2. Connect to the WebSocket

Once the user is authenticated and you hold their JWT Token, initiate a WebSocket connection.

```tsx
import React, { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

export default function DeliveryMapScreen({ userToken }) {
  const ws = useRef<WebSocket | null>(null);
  const [neighborLocations, setNeighborLocations] = useState({});
  const [myLocation, setMyLocation] = useState(null);

  useEffect(() => {
    // 1. Establish Secure WebSocket connection to server
    // Replace '192.168.1.XX' with your computer's IP
    const WS_URL = `ws://192.168.1.XX:8000/ws/location?token=${userToken}`;
    ws.current = new WebSocket(WS_URL);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'location_update') {
        // Update the location of the broadcasting user dynamically
        setNeighborLocations(prev => ({
           ...prev,
           [data.user_id]: { lat: data.lat, lon: data.lon }
        }));
      }
    };

    return () => ws.current?.close();
  }, []);

  // 2. Track My GPS Coordinates Live
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Only trigger if moved 10 meters
        },
        (location) => {
          const lat = location.coords.latitude;
          const lon = location.coords.longitude;
          setMyLocation({ lat, lon });

          // Broadcast my movement to everyone in my Society!
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ lat, lon }));
          }
        }
      );
    })();
  }, []);

  // 3. Render Smooth Live Map Markers
  return (
    <MapView style={{ flex: 1 }} initialRegion={{ ...myLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
      {/* My Marker */}
      {myLocation && <Marker coordinate={{ latitude: myLocation.lat, longitude: myLocation.lon }} title="Me" pinColor="blue" />}
      
      {/* Dynamic Neighbor / Delivery Markers */}
      {Object.entries(neighborLocations).map(([userId, loc]) => (
        <Marker 
          key={userId} 
          coordinate={{ latitude: loc.lat, longitude: loc.lon }} 
          title={`User ${userId}`} 
          pinColor="orange"
        />
      ))}
    </MapView>
  );
}
```

### Explaining the Mechanics
- **Isolation**: When your WebSocket connects (via `engine.connect`), `main.py` looks at your database user, inspects your `society_id`, and places your network socket explicitly inside the `ConnectionManager.active_rooms[society_id]`.
- **Zero-Latency**: Using WebSockets directly over HTTP Polling gives realtime delivery marker precision like Swiggy/Blinkit.
- **Data Shape**: Sending `{"lat": 1, "lon": 1}` broadcasts successfully out as `{"type": "location_update", "user_id": X, "lat": 1, "lon": 1, "society_id": Y}` to all clients.
