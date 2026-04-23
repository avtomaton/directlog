"""Pytest fixtures for backend tests."""
import pytest
import os, tempfile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base

@pytest.fixture(scope='function')
def db_engine():
    """Create a temporary test database engine."""
    # Import models first so they're registered with Base
    from models import user, flight, airport, aircraft, template, event
    
    # Use in-memory SQLite for tests with shared cache
    engine = create_engine(
        'sqlite:///:memory:?cache=shared',
        connect_args={'check_same_thread': False, 'uri': True}
    )
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)

@pytest.fixture(scope='function')
def db_session(db_engine):
    """Create a fresh database session for each test."""
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture(scope='function')
def app(db_engine):
    """Create Flask app with test database."""
    from app import app as flask_app
    import database
    
    flask_app.config['TESTING'] = True
    
    # Override database for testing
    original_engine = database.engine
    original_session = database.Session
    database.engine = db_engine
    database.Session = sessionmaker(bind=db_engine)
    
    yield flask_app
    
    # Restore
    database.engine = original_engine
    database.Session = original_session

@pytest.fixture(scope='function')
def client(app, db_engine, db_session):
    """Create a test client with test database."""
    app.config['TESTING'] = True
    
    with app.test_client() as client:
        yield client

@pytest.fixture(scope='function')
def auth_headers(app, db_session):
    """Get auth headers for a test user."""
    from models import User, UserSettings
    from auth import hash_password, create_tokens

    # Create test user
    user = User(
        email='test@example.com',
        password_hash=hash_password('password123'),
        name='Test User'
    )
    db_session.add(user)
    db_session.flush()

    settings = UserSettings(user_id=user.id)
    db_session.add(settings)
    db_session.commit()  # Commit so other sessions can see this user
    
    # Get token - must be inside app context
    with app.app_context():
        access_token, _ = create_tokens(user.id)

    return {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

@pytest.fixture
def sample_airport(db_session):
    """Create a sample airport."""
    from models import Airport

    airport = Airport(
        icao='CYEG',
        iata='YEG',
        name='Edmonton International Airport',
        lat=53.3097,
        lon=-113.5801,
        country='Canada',
        region='Alberta',
        runways=[{'number': '02/20', 'surface': 'ASPH', 'length_m': 2591, 'width_m': 46}]
    )
    db_session.add(airport)
    db_session.commit()
    return airport

@pytest.fixture
def sample_aircraft(db_session):
    """Create a sample shared aircraft."""
    from models import SharedAircraft

    aircraft = SharedAircraft(
        registration='C-GABC',
        type='Cessna 172S',
        manufacturer='Cessna',
        category='SEL',
        engine_type='Piston'
    )
    db_session.add(aircraft)
    db_session.commit()
    return aircraft
