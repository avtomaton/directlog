"""User and UserSettings models."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """User account."""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships - use lazy='dynamic' for large datasets
    flights = relationship('Flight', back_populates='user', lazy='dynamic')
    aircraft = relationship('UserAircraft', back_populates='user', lazy='dynamic')
    templates = relationship('UserTemplate', back_populates='user', lazy='dynamic')
    events = relationship('CurrencyEvent', back_populates='user', lazy='dynamic')
    settings = relationship('UserSettings', back_populates='user', uselist=False)


class UserSettings(Base):
    """User preferences and settings."""
    __tablename__ = 'user_settings'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True, index=True)
    regulation = Column(String(10), default='CARs')  # 'CARs', 'FAA', 'EASA'
    home_airport = Column(String(4))  # ICAO code
    currency_view = Column(String(10), default='both')  # 'day', 'night', 'both'
    
    # Time tracking preferences
    time_format = Column(String(10), default='hours')  # 'hours' or 'minutes'
    
    # User preferences stored as JSON string
    preferences = Column(String, default='{}')  # JSON blob for future expansion

    user = relationship('User', back_populates='settings')
