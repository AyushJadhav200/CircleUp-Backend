from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Table
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.ext.hybrid import hybrid_property
import json
from datetime import datetime

import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./circleup.db")

# Handle Render's 'postgres://' vs SQLAlchemy's 'postgresql://' requirement
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Engine arguments for connection pooling
engine_args = {}

# Use connection pooling for Production (PostgreSQL)
if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_args.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
        "pool_recycle": 1800,
    })
else:
    # SQLite specific args if needed
    pass

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Association table for User <-> Circle membership
user_circles = Table(
    "user_circles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("circle_id", Integer, ForeignKey("circles.id"), primary_key=True),
)

class Circle(Base):
    __tablename__ = "circles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    center_lat = Column(Float, nullable=True)
    center_lon = Column(Float, nullable=True)
    radius = Column(Float, default=1000.0) # Meters
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("User", secondary=user_circles, back_populates="circles")

class Society(Base):
    __tablename__ = "societies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    address = Column(String)
    radius = Column(Float, default=500.0)
    center_lat = Column(Float)
    center_lon = Column(Float)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    karma_points = Column(Integer, default=0)
    society_id = Column(Integer, ForeignKey("societies.id"), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_owner = Column(Boolean, default=False)
    push_token = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    address_json = Column(String, nullable=True) # Stores JSON string of address details
    is_verified = Column(Boolean, default=False)

    circles = relationship("Circle", secondary=user_circles, back_populates="members")


    @hybrid_property
    def address(self):
        if self.address_json:
            try:
                return json.loads(self.address_json)
            except:
                return None
        return None

class Tool(Base):
    __tablename__ = "tools"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    is_available = Column(Boolean, default=True)
    is_suspended = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=True)
    is_preowned = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    category = Column(String, default="General")
    sub_category = Column(String, nullable=True)
    price_per_day = Column(Float, default=0.0)
    sale_price = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    stock_quantity = Column(Integer, default=1)
    owner = relationship("User")
    images = relationship("ToolImage", back_populates="tool", cascade="all, delete-orphan")

    @property
    def owner_name(self):
        return self.owner.name if self.owner else "Neighbor"

    @property
    def owner_is_verified(self):
        return self.owner.is_verified if self.owner else False

class ToolImage(Base):
    __tablename__ = "tool_images"
    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(Integer, ForeignKey("tools.id"))
    url = Column(String)
    
    tool = relationship("Tool", back_populates="images")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    price = Column(Float)
    stock_quantity = Column(Integer, default=10)
    category = Column(String, default="General") # e.g., "Safety", "Consumables"
    image_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Shop items also have a physical location (either store or distributed)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")

class ProductImage(Base):
    __tablename__ = "product_images"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    url = Column(String)
    
    product = relationship("Product", back_populates="images")

class Borrow(Base):
    __tablename__ = "borrows"
    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(Integer, ForeignKey("tools.id"))
    borrower_id = Column(Integer, ForeignKey("users.id"))
    borrow_date = Column(DateTime, default=datetime.utcnow)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    status = Column(String, default="pending")
    return_date = Column(DateTime, nullable=True)
    is_returned = Column(Boolean, default=False)
    qr_code = Column(String, nullable=True) # Base64 QR or text hash
    
    handover_video_url = Column(String, nullable=True)
    return_video_url = Column(String, nullable=True)
    start_time = Column(DateTime, nullable=True) # Actual time handover occurred
    end_time = Column(DateTime, nullable=True)   # Actual time return occurred
    
    # Financial Breakdown
    rental_price = Column(Float, default=0.0)
    service_fee = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=0.0)
    security_deposit = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)
    razorpay_payment_id = Column(String, nullable=True)
    razorpay_order_id = Column(String, nullable=True)
    
    # Impact
    karma_earned = Column(Integer, default=0)
    
    # Delivery Fields
    is_delivery = Column(Boolean, default=False)
    delivery_status = Column(String, default="pending")  # pending / out_for_delivery / delivered / completed
    
    # Location snapshots at time of booking
    borrower_lat = Column(Float, nullable=True)
    borrower_lon = Column(Float, nullable=True)
    lender_lat = Column(Float, nullable=True)
    lender_lon = Column(Float, nullable=True)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id"))
    user2_id = Column(Integer, ForeignKey("users.id"))
    last_message = Column(String, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)
    
    conversation = relationship("Conversation", back_populates="messages")

class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    borrow_id = Column(Integer, ForeignKey("borrows.id"), unique=True)  # One review per rental
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    reviewee_id = Column(Integer, ForeignKey("users.id"))
    tool_id = Column(Integer, ForeignKey("tools.id"))
    rating = Column(Integer, default=5)  # 1-5 stars
    comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
