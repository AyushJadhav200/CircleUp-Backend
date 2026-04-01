from pydantic import BaseModel, EmailStr
from typing import Optional

# Society Schemas
class SocietyCreate(BaseModel):
    name: str
    address: str
    radius: int = 500
    center_lat: float
    center_lon: float

class SocietyResponse(SocietyCreate):
    id: int
    class Config:
        from_attributes = True

# User Schemas
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    society_id: Optional[int] = None

class UserUpdateLocation(BaseModel):
    latitude: float
    longitude: float

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    latitude: Optional[float]
    longitude: Optional[float]
    society_id: Optional[int]

    class Config:
        from_attributes = True

# JWT Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
