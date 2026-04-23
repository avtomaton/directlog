"""SQLAlchemy models package."""
from database import Base

# Import all models to register them with Base
from models.user import User, UserSettings
from models.flight import Flight
from models.airport import Airport, Runway
from models.aircraft import SharedAircraft, UserAircraft
from models.template import SharedTemplate, UserTemplate
from models.event import CurrencyEvent

__all__ = [
    'Base',
    'User',
    'UserSettings',
    'Flight',
    'Airport',
    'Runway',
    'SharedAircraft',
    'UserAircraft',
    'SharedTemplate',
    'UserTemplate',
    'CurrencyEvent',
]
