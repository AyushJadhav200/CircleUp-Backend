import math
import qrcode
import base64
from io import BytesIO
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance in meters between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula 
    dlat = lat2 - lat1 
    dlon = lon2 - lon1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371000 # Radius of earth in meters
    return c * r

def generate_qr_base64(data: str) -> str:
    """Generate a QR code and return as a Base64 string."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return img_str

def send_push_notification(push_token: str, title: str, body: str):
    import urllib.request
    import json
    
    if not push_token:
        return
        
    url = "https://exp.host/--/api/v2/push/send"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json"
    }
    data = {
        "to": push_token,
        "title": title,
        "body": body,
        "sound": "default"
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
        with urllib.request.urlopen(req) as response:
            pass # We ignore response to be quick, or log it
    except Exception as e:
        print(f"Failed to send Expo Push Notification: {e}")
