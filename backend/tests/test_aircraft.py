"""Tests for aircraft endpoints."""
import pytest
from datetime import date


def test_get_aircraft_empty(client, auth_headers):
    """Test getting aircraft when none exist."""
    response = client.get('/api/aircraft', headers=auth_headers)
    assert response.status_code == 200
    assert response.get_json() == []


def test_add_aircraft_success(client, auth_headers, db_session, sample_aircraft):
    """Test adding aircraft to user account."""
    response = client.post('/api/aircraft', headers=auth_headers, json={
        'reg': 'C-GXYZ',
        'type': 'Cessna 172S',
        'category': 'SEL'
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['reg'] == 'C-GXYZ'


def test_add_aircraft_duplicate(client, auth_headers, db_session, sample_aircraft):
    """Test adding duplicate aircraft fails."""
    # First add
    client.post('/api/aircraft', headers=auth_headers, json={
        'reg': 'C-GABC',
        'type': 'Cessna 172S',
    })
    # Try to add again
    response = client.post('/api/aircraft', headers=auth_headers, json={
        'reg': 'C-GABC',
        'type': 'Cessna 172S',
    })
    assert response.status_code == 400
    assert 'already' in response.get_json()['error'].lower()


def test_add_aircraft_no_reg(client, auth_headers):
    """Test adding aircraft without registration fails."""
    response = client.post('/api/aircraft', headers=auth_headers, json={
        'type': 'Cessna 172S'
        # missing reg
    })
    assert response.status_code == 400


def test_update_aircraft(client, auth_headers, db_session, sample_aircraft):
    """Test updating aircraft."""
    # First add aircraft
    client.post('/api/aircraft', headers=auth_headers, json={
        'reg': 'C-GABC',
        'type': 'Cessna 172S',
    })

    # Update it
    response = client.put('/api/aircraft/C-GABC', headers=auth_headers, json={
        'notes': 'My favorite aircraft',
        'hidden': True
    })
    assert response.status_code == 200


def test_update_aircraft_not_found(client, auth_headers):
    """Test updating non-existent aircraft fails."""
    response = client.put('/api/aircraft/NONEXIST', headers=auth_headers, json={
        'notes': 'test'
    })
    assert response.status_code == 404


def test_delete_aircraft(client, auth_headers, db_session, sample_aircraft):
    """Test deleting aircraft."""
    # First add aircraft
    client.post('/api/aircraft', headers=auth_headers, json={
        'reg': 'C-GABC',
        'type': 'Cessna 172S',
    })

    # Delete it
    response = client.delete('/api/aircraft/C-GABC', headers=auth_headers)
    assert response.status_code == 200

    # Verify deleted
    response = client.get('/api/aircraft', headers=auth_headers)
    assert response.get_json() == []


def test_aircraft_isolation(client, app, db_session, sample_aircraft):
    """Test that users can only see their own aircraft."""
    from models import User, UserSettings
    from auth import hash_password, create_tokens

    # Create two users
    user1 = User(email='user1@example.com', password_hash=hash_password('password123'))
    user2 = User(email='user2@example.com', password_hash=hash_password('password123'))
    db_session.add_all([user1, user2])
    db_session.flush()

    for u in [user1, user2]:
        db_session.add(UserSettings(user_id=u.id))
    db_session.commit()

    # Get tokens
    with app.app_context():
        token1, _ = create_tokens(user1.id)
        token2, _ = create_tokens(user2.id)

    headers1 = {'Authorization': f'Bearer {token1}', 'Content-Type': 'application/json'}
    headers2 = {'Authorization': f'Bearer {token2}', 'Content-Type': 'application/json'}

    # User1 adds aircraft
    client.post('/api/aircraft', headers=headers1, json={
        'reg': 'C-GABC',
        'type': 'Cessna 172S',
    })

    # User2 should not see user1's aircraft
    response2 = client.get('/api/aircraft', headers=headers2)
    assert response2.get_json() == []

    # User1 should see their aircraft
    response1 = client.get('/api/aircraft', headers=headers1)
    assert len(response1.get_json()) == 1


def test_aircraft_validation_invalid_reg(client, auth_headers):
    """Test aircraft validation rejects invalid registration."""
    response = client.post('/api/aircraft', headers=auth_headers, json={
        'reg': '',  # Empty registration
        'type': 'Cessna 172S',
    })
    assert response.status_code == 400
    assert 'validation' in response.get_json()['error'].lower()
