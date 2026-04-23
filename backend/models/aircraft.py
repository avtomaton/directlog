"""SharedAircraft and UserAircraft models."""
from sqlalchemy import Column, Integer, String, Float, Boolean, Index, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class SharedAircraft(Base):
    """Global aircraft database - read-only reference data."""
    __tablename__ = 'shared_aircraft'

    id = Column(Integer, primary_key=True)
    registration = Column(String(20), index=True)  # e.g., C-GABC (if assigned)
    type = Column(String(100), index=True)  # e.g., "Cessna 172S"
    manufacturer = Column(String(100))
    category = Column(String(10))  # SEL, MEL, etc.
    engine_type = Column(String(20))  # Piston, Turbine, Jet
    year = Column(Integer)
    
    # Performance specs
    max_range_nm = Column(Integer)
    service_ceiling_ft = Column(Integer)
    max_speed_kts = Column(Integer)
    
    # Weights
    empty_weight_lb = Column(Integer)
    max_takeoff_weight_lb = Column(Integer)
    
    # Equipment codes (for IFR)
    equip_codes = Column(String(20))  # G, IG, etc.
    
    # Notes
    notes = Column(String)


class UserAircraft(Base):
    """User's aircraft - links to shared aircraft and stores user-specific data."""
    __tablename__ = 'user_aircraft'
    __table_args__ = (
        Index('ix_user_aircraft_user_reg', 'user_id', 'reg', unique=True),
        Index('ix_user_aircraft_user_id', 'user_id'),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    shared_aircraft_id = Column(Integer, ForeignKey('shared_aircraft.id'))
    
    reg = Column(String(20), nullable=False)  # User's aircraft registration
    hidden = Column(Boolean, default=False)
    notes = Column(String)  # User-specific notes
    
    # Cached data from shared aircraft for quick access
    aircraft_type = Column(String(100))  # Cached from shared
    category = Column(String(10))  # Cached from shared
    
    # User's tracking
    total_time = Column(Float)
    last_flown = Column(String)  # Date string
    
    user = relationship('User', back_populates='aircraft')
    shared_aircraft = relationship('SharedAircraft')
