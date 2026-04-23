"""Flight model with indexes for high-volume multi-user data."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, JSON, Index, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Flight(Base):
    """User's flight log entry. Optimized for 1M users × 10K flights."""
    __tablename__ = 'flights'
    __table_args__ = (
        Index('ix_flights_user_id', 'user_id'),
        Index('ix_flights_date', 'date'),
        Index('ix_flights_user_date', 'user_id', 'date'),
        Index('ix_flights_user_aircraft', 'user_id', 'aircraft_reg'),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    date = Column(Date, nullable=False)  # index defined in __table_args__
    
    # Aircraft
    aircraft_reg = Column(String(20), ForeignKey('user_aircraft.reg'))
    
    # Airports
    departure_id = Column(Integer, ForeignKey('airports.id'))
    arrival_id = Column(Integer, ForeignKey('airports.id'))
    
    # Times
    start_time = Column(String)  # HH:MM format
    takeoff_time = Column(String)
    landing_time = Column(String)
    shutdown_time = Column(String)
    air_time = Column(Float, default=0)
    
    # PIC time tracking
    pic = Column(Float, default=0)
    sic = Column(Float, default=0)
    dual = Column(Float, default=0)
    
    # Other time categories
    night = Column(Float, default=0)
    ifr = Column(Float, default=0)
    actual_imc = Column(Float, default=0)
    simulated_imc = Column(Float, default=0)  # simulated
    xc = Column(Float, default=0)
    xc_over_50nm = Column(Float, default=0)
    right_seat = Column(Float, default=0)
    multi_pilot = Column(Float, default=0)
    pilot_flying = Column(Float, default=0)
    holds = Column(Integer, default=0)
    
    # Aircraft characteristics at time of flight
    multi_engine = Column(Float, default=0)
    complex = Column(Float, default=0)
    high_performance = Column(Float, default=0)
    turbine = Column(Float, default=0)
    jet = Column(Float, default=0)
    
    # Boolean flags
    ems = Column(Boolean, default=False)
    medevac = Column(Boolean, default=False)
    search_and_rescue = Column(Boolean, default=False)
    aerial_work = Column(Boolean, default=False)
    training = Column(Boolean, default=False)
    checkride = Column(Boolean, default=False)
    flight_review = Column(Boolean, default=False)
    ipc = Column(Boolean, default=False)
    ppc = Column(Boolean, default=False)
    
    # Landings
    ldg_day = Column(Integer, default=0)
    ldg_night = Column(Integer, default=0)
    
    # Route and names
    route = Column(String)
    pic_name = Column(String)
    sic_name = Column(String)
    
    # Remarks
    remarks = Column(String, default='')
    
    # Approaches stored as JSON for simplicity (typically 0-3 per flight)
    approaches = Column(JSON, default=[])  # [{type, airport, runway, actual}, ...]
    
    # Metadata
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship('User', back_populates='flights')
    aircraft = relationship('UserAircraft', foreign_keys=[aircraft_reg])
    departure = relationship('Airport', foreign_keys=[departure_id])
    arrival = relationship('Airport', foreign_keys=[arrival_id])
