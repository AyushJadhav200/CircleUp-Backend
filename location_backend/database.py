from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = "sqlite:///./location.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Society(Base):
    __tablename__ = "societies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    address = Column(String)
    radius = Column(Integer, default=500) # in meters
    center_lat = Column(Float)
    center_lon = Column(Float)

    users = relationship("User", back_populates="society")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    society_id = Column(Integer, ForeignKey("societies.id"), nullable=True)

    society = relationship("Society", back_populates="users")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
