"""Tests for flight endpoints."""
import pytest
from datetime import date


def test_get_flights_empty(client, auth_headers, db_session):
    """Test getting flights when none exist."""
    response = client.get('/api/flights', headers=auth_headers)
    assert response.status_code == 200
    assert response.get_json() == []


def test_add_flight_success(client, auth_headers, db_session, sample_airport, sample_aircraft):
    """Test adding a flight."""
    response = client.post('/api/flights', headers=auth_headers, json={
        'date': '2026-01-15',
        'aircraft': 'C-GABC',
        'from': 'CYEG',
        'to': 'CYYC',
        'air_time': 1.5,
        'pic': 1.5,
        'ldg_day': 2
    })
    assert response.status_code == 201
    data = response.get_json()
    assert 'id' in data


def test_add_flight_missing_required(client, auth_headers, db_session):
    """Test adding flight without required fields fails."""
    response = client.post('/api/flights', headers=auth_headers, json={
        'date': '2026-01-15'
        # missing aircraft
    })
    assert response.status_code == 400


def test_flight_isolation_between_users(client, app, db_session, sample_aircraft):
    """Test that users can only see their own flights."""
    from models import User, UserSettings, Flight
    from auth import hash_password, create_tokens

    # Create two users
    user1 = User(email='user1@example.com', password_hash=hash_password('password123'))
    user2 = User(email='user2@example.com', password_hash=hash_password('password123'))
    db_session.add_all([user1, user2])
    db_session.flush()

    # Create flights for user1
    flight1 = Flight(user_id=user1.id, date=date(2026, 1, 1), aircraft_reg='C-GABC', air_time=1.0)
    db_session.add(flight1)

    # Create flight for user2
    flight2 = Flight(user_id=user2.id, date=date(2026, 1, 2), aircraft_reg='C-GABC', air_time=2.0)
    db_session.add(flight2)
    db_session.commit()

    # Get tokens - must be inside app context
    with app.app_context():
        token1, _ = create_tokens(user1.id)
        token2, _ = create_tokens(user2.id)

    headers1 = {'Authorization': f'Bearer {token1}', 'Content-Type': 'application/json'}
    headers2 = {'Authorization': f'Bearer {token2}', 'Content-Type': 'application/json'}

    # User1 should only see their flight
    response1 = client.get('/api/flights', headers=headers1)
    assert len(response1.get_json()) == 1
    assert response1.get_json()[0]['air_time'] == 1.0

    # User2 should only see their flight
    response2 = client.get('/api/flights', headers=headers2)
    assert len(response2.get_json()) == 1
    assert response2.get_json()[0]['air_time'] == 2.0


def test_delete_flight(client, auth_headers, db_session, sample_aircraft):
    """Test deleting a flight."""
    from models import Flight
    from datetime import date
    
    # Create a flight
    flight = Flight(user_id=1, date=date(2026, 1, 1), aircraft_reg='C-GABC', air_time=1.0)
    db_session.add(flight)
    db_session.commit()
    
    # Delete it
    response = client.delete(f'/api/flights/{flight.id}', headers=auth_headers)
    assert response.status_code == 200
    
    # Verify deleted
    response = client.get('/api/flights', headers=auth_headers)
    assert len(response.get_json()) == 0


def test_update_flight(client, auth_headers, db_session, sample_aircraft):
    """Test updating a flight."""
    from models import Flight
    from datetime import date
    
    # Create a flight
    flight = Flight(user_id=1, date=date(2026, 1, 1), aircraft_reg='C-GABC', air_time=1.0, pic=1.0)
    db_session.add(flight)
    db_session.commit()
    
    # Update it
    response = client.put(f'/api/flights/{flight.id}', headers=auth_headers, json={
        'air_time': 2.0,
        'pic': 2.0
    })
    assert response.status_code == 200
    
    # Verify updated
    response = client.get('/api/flights', headers=auth_headers)
    data = response.get_json()[0]
    assert data['air_time'] == 2.0
    assert data['pic'] == 2.0
