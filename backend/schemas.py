from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class SendOTPRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str
    name: Optional[str] = None  # Only required for new users

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    address: Optional[dict] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    is_new_user: bool = False  # Tells the app if name entry is needed

class TokenData(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None


class PaymentOrderCreate(BaseModel):
    amount: float
    currency: str = "INR"

class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    karma_points: int
    avatar_url: Optional[str] = None
    is_verified: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    society_id: Optional[int] = None
    address: Optional[dict] = None
    wallet_balance: float = 0.0

    class Config:
        from_attributes = True

class ToolCreate(BaseModel):
    name: str
    description: str
    category: str
    sub_category: Optional[str] = None
    price_per_day: float
    sale_price: Optional[float] = None
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_verified: bool = True
    is_preowned: bool = True
    stock_quantity: int = 1
    images: List[str] = []

class ToolImageResponse(BaseModel):
    url: str

    class Config:
        from_attributes = True

class ToolResponse(BaseModel):
    id: int
    name: str
    description: str
    owner_id: int
    is_available: bool
    is_verified: bool
    is_preowned: bool
    sub_category: Optional[str] = None
    is_featured: bool = False
    category: str
    price_per_day: float
    sale_price: Optional[float] = None
    image_url: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    owner_name: Optional[str] = None
    owner_is_verified: bool = False
    images: List[ToolImageResponse] = []
    stock_quantity: int = 1

    class Config:
        from_attributes = True

class SubCategoryResponse(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

class CategoryResponse(BaseModel):
    id: int
    name: str
    icon_name: Optional[str] = None
    color_code: Optional[str] = None
    sub_categories: List[SubCategoryResponse] = []
    
    class Config:
        from_attributes = True

class BorrowCreate(BaseModel):
    tool_id: int
    start_date: datetime

    end_date: datetime
    is_delivery: Optional[bool] = False
    delivery_fee: Optional[float] = 0.0
    borrower_lat: Optional[float] = None
    borrower_lon: Optional[float] = None

class BorrowResponse(BaseModel):
    id: int
    tool_id: int
    borrower_id: int
    borrow_date: datetime
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str = "pending"
    is_returned: bool = False
    qr_code: Optional[str]
    rental_price: float = 0.0
    service_fee: float = 0.0
    delivery_fee: float = 0.0
    security_deposit: float = 0.0
    grand_total: float = 0.0
    razorpay_payment_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    karma_earned: int = 0
    is_delivery: bool = False
    delivery_status: str = "pending"

    class Config:
        from_attributes = True

class QRVerify(BaseModel):
    qr_code: str

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    timestamp: datetime
    is_read: bool

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: int
    user1_id: int
    user2_id: int
    last_message: Optional[str]
    last_updated: datetime
    other_user_name: Optional[str] = None # Added for convenience

    class Config:
        from_attributes = True

class CircleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    radius: float = 1000.0

class CircleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    image_url: Optional[str]
    center_lat: Optional[float]
    center_lon: Optional[float]
    radius: float
    member_count: int = 0

    class Config:
        from_attributes = True

class ImpactResponse(BaseModel):
    co2_saved: float # kg
    money_saved: float # currency
    waste_diverted: float # kg
    karma_rank: str
    karma_points: int
    neighbors_helped: int

class HandoverCreate(BaseModel):
    video_url: str

class AIDescriptionRequest(BaseModel):
    image_url: str

class AIDescriptionResponse(BaseModel):
    name: str
    category: str
    description: str

class ReviewCreate(BaseModel):
    borrow_id: int
    rating: int  # 1-5
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    borrow_id: int
    rating: int
    comment: Optional[str]
    reviewer_id: int
    created_at: datetime

    class Config:
        from_attributes = True
class ProductResponse(BaseModel):
    id: int
    name: str
    description: str
    price: float
    stock_quantity: int
    category: str
    image_url: Optional[str]
    is_active: bool
    created_at: datetime
    latitude: Optional[float]
    longitude: Optional[float]

    class Config:
        from_attributes = True

class ProductOrderCreate(BaseModel):
    product_id: int
    quantity: int = 1
    user_lat: Optional[float] = None
    user_lon: Optional[float] = None
    delivery_fee: Optional[float] = 0.0

class ProductOrderResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    quantity: int
    total_price: float
    status: str
    order_date: datetime
    grand_total: float
    product: ProductResponse

    class Config:
        from_attributes = True

class DepositRequest(BaseModel):
    amount: float
    payment_method: str = "UPI" # Mock for now

class TransactionResponse(BaseModel):
    id: int
    amount: float
    type: str # deposit, rental_payment, rental_income
    description: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

class BannerResponse(BaseModel):
    id: int
    title: str
    subtitle: str
    badge: Optional[str]
    image_url: str
    button_text: str
    background_color: str
    target_route: Optional[str]

    class Config:
        from_attributes = True

class RepairCreate(BaseModel):
    tool_name: str
    issue_description: str
    category: str
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class RepairUpdate(BaseModel):
    status: Optional[str] = None # pending, in_progress, fixed, cancelled
    helper_id: Optional[int] = None

class RepairResponse(BaseModel):
    id: int
    user_id: int
    tool_name: str
    issue_description: str
    category: str
    image_url: Optional[str]
    status: str
    helper_id: Optional[int]
    reward_karma: int
    created_at: datetime
    latitude: Optional[float]
    longitude: Optional[float]
    owner_name: Optional[str] = None

    class Config:
        from_attributes = True

class PaymentOrderCreate(BaseModel):
    amount: float
    currency: str = "INR"

class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
