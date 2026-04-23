"""CurrencyEvent model."""
from sqlalchemy import Column, Integer, String, Date, Index, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class CurrencyEvent(Base):
    """User's currency events (flight reviews, IPCs, etc.). Small dataset ~20/user."""
    __tablename__ = 'currency_events'
    __table_args__ = (
        Index('ix_currency_events_user_id', 'user_id'),
        Index('ix_currency_events_expiry', 'expiry'),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(String(50), nullable=False)  # flight_review, ipc, etc.
    description = Column(String(500))
    instructor = Column(String(100))
    expiry = Column(Date) # index defined in __table_args__
    
    # Optional: associated flight (if event was logged with a flight)
    flight_id = Column(Integer, ForeignKey('flights.id'), nullable=True)

    user = relationship('User', back_populates='events')
