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

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

SECRET_KEY = os.environ.get("JWT_SECRET", "super-secret-key-circleup-2026")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 43200))

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
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == token_data.email).first()
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
