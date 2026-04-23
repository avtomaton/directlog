"""Airport and Runway models - shared read-only data."""
from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from database import Base


class Airport(Base):
    """Airport - shared read-only global data (OurAirports)."""
    __tablename__ = 'airports'

    id = Column(Integer, primary_key=True)
    icao = Column(String(4), unique=True, nullable=False, index=True)
    iata = Column(String(3), index=True)
    name = Column(String(255))
    lat = Column(Float)
    lon = Column(Float)
    country = Column(String(100))
    region = Column(String(100))  # State/Province/Region
    
    # Runways as JSON - loaded with airport (typically 1-4 runways)
    # Alternative: separate Runway table if detailed queries needed
    runways = Column(JSON, default=[])  # [{number, surface, length_m, width_m, lighting}, ...]

    def to_dict(self):
        return {
            'id': self.id,
            'icao': self.icao,
            'iata': self.iata,
            'name': self.name,
            'lat': self.lat,
            'lon': self.lon,
            'country': self.country,
            'region': self.region,
            'runways': self.runways or []
        }


class Runway(Base):
    """Runway - detailed runway data (optional separate table for complex queries)."""
    __tablename__ = 'runways'
    __table_args__ = (
        Index('ix_runways_airport_id', 'airport_id'),
    )

    id = Column(Integer, primary_key=True)
    airport_id = Column(Integer, ForeignKey('airports.id'), nullable=False)
    number = Column(String(5))  # e.g., "16/34" or "27L"
    surface = Column(String(50))  # ASPH, CONC, GRASS, SAND, etc.
    length_m = Column(Integer)
    width_m = Column(Integer)
    lighting = Column(String(20))  # YES, NO, PCL (pilot controlled)
    heading = Column(Integer)  # True heading in degrees
    pattern_altitude = Column(String(20))  # e.g., "1000ft AGL"

    airport = relationship('Airport', backref='runway_list')
