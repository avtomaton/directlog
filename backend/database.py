"""SQLAlchemy database connection and session management."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'logbook.db')
DATABASE_URL = f'sqlite:///{DATABASE_PATH}'

engine = create_engine(
    DATABASE_URL,
    connect_args={'check_same_thread': False},  # SQLite specific
    pool_pre_ping=True,
)

Session = sessionmaker(bind=engine)
Base = declarative_base()


def get_session():
    """Get a new database session. Caller must close."""
    import database
    return database.Session()


def init_db():
    """Create all tables. Called on app startup."""
    # Import all models to ensure they're registered with Base
    from models import user, flight, airport, aircraft, template, event
    Base.metadata.create_all(engine)


def drop_all():
    """Drop all tables. Used for testing."""
    from models import user, flight, airport, aircraft, template, event
    Base.metadata.drop_all(engine)
