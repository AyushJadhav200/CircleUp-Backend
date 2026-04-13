from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
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
import logging
from sqlalchemy.exc import IntegrityError
import s3_utils
import uuid

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

SECRET_KEY = os.environ.get("JWT_SECRET", "super-secret-key-circleup-2026")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 43200))

# In-memory OTP store: { email: { "otp": "123456", "expires": timestamp } }
_otp_store: dict = {}

router = APIRouter(tags=["auth"])
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
    
    # 1. Name Validation (min 3 chars)
    if len(user.name.strip()) < 3:
        raise HTTPException(status_code=400, detail="Name must be at least 3 characters long")
        
    # 2. First User is Owner logic
    is_first_user = db.query(User).count() == 0
    
    hashed_password = utils.get_password_hash(user.password)
    new_user = User(
        name=user.name.strip(), 
        email=user.email, 
        password_hash=hashed_password,
        is_owner=is_first_user
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
@router.get("/me", response_model=schemas.UserResponse)
@router.post("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserResponse)
@router.patch("/me", response_model=schemas.UserResponse)
def update_users_me(user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    import json
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.email is not None:
        current_user.email = user_update.email
    if user_update.phone_number is not None:
        # Validate 10 digits
        digits = "".join(filter(str.isdigit, user_update.phone_number))
        if len(digits) < 10:
            raise HTTPException(status_code=400, detail="Phone number must be at least 10 digits")
        current_user.phone_number = user_update.phone_number
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    if user_update.address is not None:
        current_user.address_json = json.dumps(user_update.address)
    if user_update.latitude is not None:
        current_user.latitude = user_update.latitude
    if user_update.longitude is not None:
        current_user.longitude = user_update.longitude
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/avatar", response_model=schemas.UserResponse)
def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        file_data = file.file.read()
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        s3_url = s3_utils.upload_file_to_s3(file_data, unique_filename, file.content_type, folder="avatars")
        
        if not s3_url:
            raise HTTPException(status_code=500, detail="Failed to upload avatar to S3")
            
        current_user.avatar_url = s3_url
        db.commit()
        db.refresh(current_user)
        
        return current_user
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Avatar upload failed: {str(e)}")

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
            # First user logic for Google as well
            is_first_user = db.query(User).count() == 0
            
            # Auto-register new Google users
            user = User(
                name=name,
                email=email,
                password_hash=utils.get_password_hash("000000"), # Random pass
                karma_points=150, # Welcome bonus
                is_owner=is_first_user
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

@router.post("/setup-profile", response_model=schemas.UserResponse)
async def setup_profile(
    name: str = Form(...),
    face_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Setup profile with name and optional face image upload.
    Real face is stored privately. Public UI gets a DiceBear avatar.
    """
    # 1. Name Validation
    if len(name.strip()) < 3:
        raise HTTPException(status_code=400, detail="Name must be at least 3 characters long")

    # 2. Image Upload
    s3_url = None
    if face_image:
        if not face_image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File provided is not an image.")

        content = await face_image.read()
        file_ext = face_image.filename.split('.')[-1] if face_image.filename else "jpg"
        unique_filename = f"{current_user.id}_{uuid.uuid4().hex}.{file_ext}"

        # Upload face privately
        s3_url = s3_utils.upload_file_to_s3(content, unique_filename, face_image.content_type, folder="faces")
        if not s3_url:
            raise HTTPException(status_code=500, detail="Failed to upload face image.")

    # Generate public DiceBear avatar
    dicebear_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={name.replace(' ', '%20')}"

    # Update User attributes
    current_user.name = name.strip()
    if s3_url:
        current_user.face_image_path = s3_url
        current_user.is_verified = True
    else:
        # If no image, user is not verified but can still browse
        current_user.is_verified = False

    current_user.avatar_url = dicebear_url

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/admin/user/{user_id}")
def get_user_admin(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Admin-only endpoint to fetch a user, including their private face_image_path.
    """
    if not current_user.is_owner:
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone_number": user.phone_number,
        "karma_points": user.karma_points,
        "avatar_url": user.avatar_url,
        "face_image_path": user.face_image_path,
        "is_verified": user.is_verified,
        "latitude": user.latitude,
        "longitude": user.longitude,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 📱 PHONE OTP AUTHENTICATION (Development Mode — logs OTP to console)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/send-otp")
def send_otp(data: schemas.SendOTPRequest):
    email = data.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Invalid email format.")

    # Randomized 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    expires_at = time.time() + 300  # 5 minutes

    _otp_store[email] = {"otp": otp_code, "expires": expires_at}

    import logging
    print(f"\n[AUTH] OTP for {email}: {otp_code} (Expires in 5m)\n", flush=True)
    logging.info(f"OTP GENERATED: {otp_code} for {email}")

    # Brevo API Configuration
    brevo_api_key = os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("SENDER_EMAIL", "circleup45@gmail.com")
    is_production = os.environ.get("ENVIRONMENT") == "production" or not os.environ.get("ENVIRONMENT")

    if not brevo_api_key:
        logging.error("❌ CRITICAL: BREVO_API_KEY is missing from environment variables! Please add it to your Render Dashboard.")
        return {"message": f"Server Configuration Error: Missing API Key. (Debug: {otp_code})"}
    
    body = f"""
    <html>
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f9; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="100%" maxWidth="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <tr>
                                <td align="center" style="background-color: #0d2a4c; padding: 30px 20px;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px;">CircleUp</h1>
                                    <p style="color: #cad1d9; margin: 10px 0 0 0; font-size: 14px;">Your Community Marketplace</p>
                                </td>
                            </tr>
                            
                            <!-- Body -->
                            <tr>
                                <td align="center" style="padding: 40px 30px;">
                                    <h2 style="color: #0d2a4c; margin: 0 0 20px 0; font-size: 22px;">Verify Your Account</h2>
                                    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 30px 0;">Welcome to the circle! Use the code below to securely sign in to your CircleUp account. Your community is waiting for you.</p>
                                    
                                    <!-- OTP Box -->
                                    <div style="background-color: #fffaf0; border: 2px dashed #ff7518; padding: 20px; border-radius: 8px; display: inline-block;">
                                        <span style="font-size: 42px; font-weight: bold; color: #ff7518; letter-spacing: 8px; font-family: monospace;">{otp_code}</span>
                                    </div>
                                    
                                    <p style="color: #718096; font-size: 14px; margin-top: 30px;">This code will expire in <span style="font-weight: bold; color: #0d2a4c;">5 minutes</span>.</p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td align="center" style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #edf2f7;">
                                    <p style="color: #a0aec0; font-size: 12px; margin: 0;">© 2026 CircleUp Platform. All rights reserved.</p>
                                    <p style="color: #a0aec0; font-size: 12px; margin: 5px 0 0 0;">Helping neighbors borrow, lend, and grow.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """

    import requests
    email_success = False
    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": brevo_api_key,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            json={
                "sender": {"name": "CircleUp", "email": sender_email},
                "to": [{"email": email}],
                "subject": "Your CircleUp Verification Code",
                "htmlContent": body
            },
            timeout=10
        )
        if response.status_code in [200, 201, 202]:
            logging.info(f"Email sent successfully via Brevo to {email}")
            email_success = True
        else:
            logging.error(f"Brevo API Error: {response.status_code} - {response.text}")
    except Exception as e:
        logging.error(f"Failed to send email via Brevo: {e}")

    # Return OTP in message for dev testing
    message = "OTP sent successfully to your email!"
    if not is_production:
        message = f"OTP sent successfully. (Debug: {otp_code})"
    
    return {"message": message}


@router.post("/verify-otp", response_model=schemas.Token)
def verify_otp(data: schemas.VerifyOTPRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    stored = _otp_store.get(email)

    if not stored:
        raise HTTPException(status_code=400, detail="No OTP found for this email. Please request a new one.")

    if time.time() > stored["expires"]:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if stored["otp"] != data.otp.strip():
        logging.warning(f"[AUTH] OTP Mismatch for {email}: Stored='{stored['otp']}', Received='{data.otp.strip()}'")
        raise HTTPException(status_code=401, detail="Incorrect OTP. Please try again.")

    # OTP is valid — clear it from store
    _otp_store.pop(email, None)

    try:
        # Check if user already exists
        user = db.query(User).filter(User.email == email).first()
        is_new_user = False
    
        if not user:
            is_new_user = True
            name = data.name or f"User_{email.split('@')[0]}"
            
            # 1. Validation for Name
            if len(name.strip()) < 3:
                raise HTTPException(status_code=400, detail="Name must be at least 3 characters long")
            
            # 2. First User logic for Phone OTP
            is_first_user = db.query(User).count() == 0
            
            user = User(
                name=name.strip(),
                email=email,
                karma_points=150,  # Welcome bonus
                is_owner=is_first_user,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    
        # Issue JWT token using email as identifier
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": email, "email": email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "is_new_user": is_new_user}
    except IntegrityError as e:
        db.rollback()
        logging.error(f"[AUTH CONFLICT] verify_otp: {str(e)}")
        # Likely a race condition where user was created between check and commit
        raise HTTPException(
            status_code=409, 
            detail="Conflict during user registration. Please try logging in again."
        )
    except Exception as e:
        db.rollback()
        err_detail = f"Authentication failed: {str(e)}"
        logging.error(f"[AUTH ERROR] verify_otp: {err_detail}")
        raise HTTPException(
            status_code=500, 
            detail=err_detail
        )

@router.post("/me/verify-id")
async def upload_id_document(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Securely upload an ID document (Aadhaar/DL) for manual admin verification.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a clear image of your ID.")
    
    try:
        content = await file.read()
        file_ext = file.filename.split('.')[-1] if file.filename else "jpg"
        unique_filename = f"ID_{current_user.id}_{uuid.uuid4().hex}.{file_ext}"
        
        # Upload to private folder
        s3_url = s3_utils.upload_file_to_s3(content, unique_filename, file.content_type, folder="id_docs")
        if not s3_url:
            raise HTTPException(status_code=500, detail="Upload to secure storage failed.")
            
        current_user.id_document_url = s3_url
        db.commit()
        return {"status": "success", "message": "ID submitted for review."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
