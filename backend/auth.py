from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db, User
import schemas
import utils
import os
import random
import time

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

SECRET_KEY = os.environ.get("JWT_SECRET", "super-secret-key-circleup-2026")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 43200))

# In-memory OTP store: { phone: { "otp": "123456", "expires": timestamp } }
_otp_store: dict = {}


router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        phone: str = payload.get("phone")
        if email is None and phone is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    if email:
        user = db.query(User).filter(User.email == email).first()
    else:
        user = db.query(User).filter(User.phone_number == phone).first()

    if user is None:
        raise credentials_exception
    return user


@router.post("/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = utils.get_password_hash(user.password)
    new_user = User(
        name=user.name, 
        email=user.email, 
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not utils.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
@router.post("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=schemas.UserResponse)
def update_users_me(user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    import json
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.address is not None:
        current_user.address_json = json.dumps(user_update.address)
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/push-token")
def update_push_token(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.push_token = data.get("push_token")
    db.commit()
    return {"status": "success"}

@router.post("/me/location")
def update_my_location(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lat = data.get("latitude")
    lon = data.get("longitude")
    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="Missing latitude or longitude")
        
    current_user.latitude = lat
    current_user.longitude = lon
    db.commit()
    return {"status": "success", "latitude": lat, "longitude": lon}

@router.post("/google", response_model=schemas.Token)
def google_auth(data: dict, db: Session = Depends(get_db)):
    token = data.get("idToken")
    if not token:
        raise HTTPException(status_code=400, detail="Missing idToken")
    
    try:
        # Verify the ID token from Google
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        
        # ID token is valid, get user info
        email = idinfo['email']
        name = idinfo.get('name', email.split('@')[0])
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Auto-register new Google users
            user = User(
                name=name,
                email=email,
                password_hash=utils.get_password_hash("000000"), # Random pass
                karma_points=150, # Welcome bonus
                is_owner=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Generate our own JWT
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
        
    except ValueError:
        # Invalid token
        raise HTTPException(status_code=401, detail="Invalid Google token")


# ─────────────────────────────────────────────────────────────────────────────
# 📱 PHONE OTP AUTHENTICATION (Development Mode — logs OTP to console)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/send-otp")
def send_otp(data: schemas.SendOTPRequest):
    phone = data.phone.strip()
    if not phone.startswith("+") or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number format. Use E.164 format e.g. +919876543210")

    # Generate a 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    expires_at = time.time() + 300  # 5 minutes

    _otp_store[phone] = {"otp": otp_code, "expires": expires_at}

    # 🔧 DEVELOPMENT MODE: Print OTP to server logs
    print(f"\n{'='*40}", flush=True)
    print(f"[CircleUp OTP] Phone: {phone}", flush=True)
    print(f"[CircleUp OTP] Code:  {otp_code}", flush=True)
    print(f"[CircleUp OTP] Valid for 5 minutes", flush=True)
    print(f"{'='*40}\n", flush=True)

    return {"message": "OTP sent successfully", "dev_hint": "Check your server logs for the OTP code"}


@router.post("/verify-otp", response_model=schemas.Token)
def verify_otp(data: schemas.VerifyOTPRequest, db: Session = Depends(get_db)):
    phone = data.phone.strip()
    stored = _otp_store.get(phone)

    if not stored:
        raise HTTPException(status_code=400, detail="No OTP found for this number. Please request a new one.")

    if time.time() > stored["expires"]:
        _otp_store.pop(phone, None)
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if stored["otp"] != data.otp.strip():
        raise HTTPException(status_code=401, detail="Incorrect OTP. Please try again.")

    # OTP is valid — clear it from store
    _otp_store.pop(phone, None)

    # Check if user already exists
    user = db.query(User).filter(User.phone_number == phone).first()
    is_new_user = False

    if not user:
        is_new_user = True
        name = data.name or f"User{phone[-4:]}"
        user = User(
            name=name,
            phone_number=phone,
            karma_points=150,  # Welcome bonus
            is_owner=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Issue JWT token using phone as identifier
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"phone": phone}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "is_new_user": is_new_user}
