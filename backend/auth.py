from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
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
import string
import time
import logging
from sqlalchemy.exc import IntegrityError
import s3_utils
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

SECRET_KEY = os.environ.get("JWT_SECRET") or os.environ.get("JWT_SECRET_KEY") or "super-secret-key-circleup-2026"
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


def generate_referral_code(db: Session, length=6):
    chars = string.ascii_uppercase + string.digits
    while True:
        code = "".join(random.choice(chars) for _ in range(length))
        if not db.query(User).filter(User.referral_code == code).first():
            return code

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
    
    # Referral Logic
    referred_by_id = None
    initial_karma = 150 # Standard bonus (might be changed by user later)
    if user.referral_code:
        referrer = db.query(User).filter(User.referral_code == user.referral_code).first()
        if referrer:
            referred_by_id = referrer.id
            initial_karma += 20 # Add 20 points for using a referral code
    
    hashed_password = utils.get_password_hash(user.password)
    new_user = User(
        name=user.name.strip(), 
        email=user.email, 
        password_hash=hashed_password,
        is_owner=is_first_user,
        referral_code=generate_referral_code(db),
        referred_by_id=referred_by_id,
        karma_points=initial_karma
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

@router.post("/me/dismiss-celebration")
def dismiss_celebration(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.show_referral_celebration = False
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
def send_otp(data: schemas.SendOTPRequest, background_tasks: BackgroundTasks):
    """
    Sends a 6-digit OTP to the user's email.
    Supports Brevo API and standard SMTP fallback.
    In development mode, always proceeds and logs OTP to console.
    """
    email = data.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Invalid email format.")

    # 1. Generate OTP
    otp_code = str(random.randint(100000, 999999))
    expires_at = time.time() + 300  # 5 minutes
    _otp_store[email] = {"otp": otp_code, "expires": expires_at}

    # 2. Log to Console (Priority for Dev)
    print(f"\n[AUTH] =================================")
    print(f"[AUTH] OTP for {email}: {otp_code}")
    print(f"[AUTH] =================================\n", flush=True)
    logging.info(f"OTP GENERATED: {otp_code} for {email}")

    # 3. Schedule Email Delivery in Background
    background_tasks.add_task(_deliver_otp_email, email, otp_code)

    return {"message": "OTP sent successfully to your email! ✉️"}

def _deliver_otp_email(email: str, otp_code: str):
    """Internal helper to send email in background."""
    # 3. Email Configuration
    brevo_api_key = os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("SENDER_EMAIL", "circleup45@gmail.com")
    smtp_user = os.environ.get("SMTP_EMAIL", sender_email)
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    is_production = os.environ.get("ENVIRONMENT") == "production"
    
    email_success = False

    # 4. Define Email Content
    body_html = f"""
    <html>
        <body style="font-family: sans-serif; color: #333;">
            <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0d2a4c; text-align: center;">CircleUp Verification</h2>
                <p>Hello,</p>
                <p>Your verification code for CircleUp is:</p>
                <div style="background: #f4f7f9; padding: 20px; text-align: center; border-radius: 8px;">
                    <span style="font-size: 32px; font-weight: bold; color: #ff7518; letter-spacing: 5px;">{otp_code}</span>
                </div>
                <p style="font-size: 14px; color: #666; margin-top: 20px;">This code will expire in 5 minutes.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #999; text-align: center;">Helping neighbors borrow, lend, and grow.</p>
            </div>
        </body>
    </html>
    """

    # 5. Attempt SMTP Fallback (if credentials exist)
    if smtp_user and smtp_pass and not email_success:
        try:
            msg = MIMEMultipart()
            msg['From'] = f"CircleUp <{smtp_user}>"
            msg['To'] = email
            msg['Subject'] = f"{otp_code} is your CircleUp verification code"
            msg.attach(MIMEText(body_html, 'html'))

            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            
            logging.info(f"OTP sent successfully via SMTP to {email}")
            email_success = True
        except Exception as e:
            logging.error(f"SMTP failed: {str(e)}")

    # 6. Attempt Brevo API (if key exists and SMTP hasn't succeeded)
    if brevo_api_key and not email_success:
        import requests
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
                    "htmlContent": body_html
                },
                timeout=10
            )
            if response.status_code in [200, 201, 202]:
                logging.info(f"OTP sent successfully via Brevo to {email}")
                email_success = True
            else:
                logging.error(f"Brevo API failed: {response.text}")
        except Exception as e:
            logging.error(f"Brevo request failed: {str(e)}")

    # 7. Final Logging
    if email_success:
        logging.info(f"Background OTP delivery successful for {email}")
    else:
        logging.error(f"Background OTP delivery failed for {email}")


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
            
            # Referral Logic
            referred_by_id = None
            initial_karma = 150 # Welcome bonus
            if data.referral_code:
                referrer = db.query(User).filter(User.referral_code == data.referral_code).first()
                if referrer:
                    referred_by_id = referrer.id
                    initial_karma += 20 # Referee bonus

            user = User(
                name=name.strip(),
                email=email,
                karma_points=initial_karma,
                is_owner=is_first_user,
                referral_code=generate_referral_code(db),
                referred_by_id=referred_by_id
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
        
        # 1. AI Vision Check
        is_id, confidence, labels = s3_utils.verify_image_is_id(content)
        if not is_id:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid Document: The system detected {', '.join(labels[:2])} but no valid ID features. Please upload a clear photo of your Aadhaar, DL, or Voter ID."
            )

        file_ext = file.filename.split('.')[-1] if file.filename else "jpg"
        unique_filename = f"ID_{current_user.id}_{uuid.uuid4().hex}.{file_ext}"
        
        # Upload to private folder
        s3_url = s3_utils.upload_file_to_s3(content, unique_filename, file.content_type, folder="id_docs")
        if not s3_url:
            raise HTTPException(status_code=500, detail="Upload to secure storage failed.")
            
        current_user.id_document_url = s3_url
        db.commit()
        return {"status": "success", "message": "ID submitted for review."}
    except HTTPException:
        raise  # Re-raise AI validation errors as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
