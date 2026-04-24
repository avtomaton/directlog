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

    def to_dict(self):
        """Serialize flight to a dictionary for API responses."""
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'aircraft': self.aircraft_reg,
            'type': self.aircraft.aircraft_type if self.aircraft else None,
            'from': self.departure.icao if self.departure else None,
            'to': self.arrival.icao if self.arrival else None,
            'route': self.route,
            'start_time': self.start_time,
            'takeoff_time': self.takeoff_time,
            'landing_time': self.landing_time,
            'shutdown_time': self.shutdown_time,
            'air_time': self.air_time,
            'pic': self.pic,
            'sic': self.sic,
            'dual': self.dual,
            'night': self.night,
            'ifr': self.ifr,
            'actual_imc': self.actual_imc,
            'simulated': self.simulated_imc,
            'xc': self.xc,
            'xc_over_50nm': self.xc_over_50nm,
            'right_seat': self.right_seat,
            'multi_pilot': self.multi_pilot,
            'pilot_flying': self.pilot_flying,
            'holds': self.holds,
            'multi_engine': self.multi_engine,
            'complex': self.complex,
            'high_performance': self.high_performance,
            'turbine': self.turbine,
            'jet': self.jet,
            'ems': self.ems,
            'medevac': self.medevac,
            'search_and_rescue': self.search_and_rescue,
            'aerial_work': self.aerial_work,
            'training': self.training,
            'checkride': self.checkride,
            'flight_review': self.flight_review,
            'ipc': self.ipc,
            'ppc': self.ppc,
            'ldg_day': self.ldg_day,
            'ldg_night': self.ldg_night,
            'pic_name': self.pic_name,
            'sic_name': self.sic_name,
            'remarks': self.remarks,
            'approaches': self.approaches or [],
        }
