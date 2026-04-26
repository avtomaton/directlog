"""Tests for currency events endpoints."""
import pytest
from datetime import date


def test_get_events_empty(client, auth_headers):
    """Test getting events when none exist."""
    response = client.get('/api/events', headers=auth_headers)
    assert response.status_code == 200
    assert response.get_json() == []


def test_add_event_success(client, auth_headers):
    """Test adding a currency event."""
    response = client.post('/api/events', headers=auth_headers, json={
        'date': '2026-03-15',
        'type': 'flight_review',
        'description': 'Biennial flight review',
        'instructor': 'J. Smith',
        'expiry': '2028-03-15'
    })
    assert response.status_code == 201
    data = response.get_json()
    assert 'id' in data


def test_add_event_missing_fields(client, auth_headers):
    """Test adding event without required fields fails."""
    response = client.post('/api/events', headers=auth_headers, json={
        'description': 'Missing date and type'
    })
    assert response.status_code == 400
    assert 'validation' in response.get_json()['error'].lower()


def test_add_event_invalid_type(client, auth_headers):
    """Test adding event with invalid type fails."""
    response = client.post('/api/events', headers=auth_headers, json={
        'date': '2026-03-15',
        'type': 'invalid_type',  # Not in allowed list
    })
    assert response.status_code == 400


def test_add_event_invalid_date(client, auth_headers):
    """Test adding event with invalid date format fails."""
    response = client.post('/api/events', headers=auth_headers, json={
        'date': 'not-a-date',
        'type': 'flight_review'
    })
    assert response.status_code == 400


def test_update_event(client, auth_headers):
    """Test updating an event."""
    # Create event first
    response = client.post('/api/events', headers=auth_headers, json={
        'date': '2026-03-15',
        'type': 'flight_review',
    })
    event_id = response.get_json()['id']

    # Update it
    response = client.put(f'/api/events/{event_id}', headers=auth_headers, json={
        'description': 'Updated description'
    })
    assert response.status_code == 200


def test_update_event_not_found(client, auth_headers):
    """Test updating non-existent event fails."""
    response = client.put('/api/events/9999', headers=auth_headers, json={
        'description': 'test'
    })
    assert response.status_code == 404


def test_delete_event(client, auth_headers):
    """Test deleting an event."""
    # Create event first
    response = client.post('/api/events', headers=auth_headers, json={
        'date': '2026-03-15',
        'type': 'flight_review',
    })
    event_id = response.get_json()['id']

    # Delete it
    response = client.delete(f'/api/events/{event_id}', headers=auth_headers)
    assert response.status_code == 200

    # Verify deleted
    response = client.get('/api/events', headers=auth_headers)
    assert response.get_json() == []


def test_event_isolation(client, app, db_session):
    """Test that users can only see their own events."""
    from models import User, UserSettings, CurrencyEvent
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

    # User1 adds event
    client.post('/api/events', headers=headers1, json={
        'date': '2026-01-01',
        'type': 'flight_review'
    })

    # User2 should not see user1's events
    response2 = client.get('/api/events', headers=headers2)
    assert response2.get_json() == []

    # User1 should see their event
    response1 = client.get('/api/events', headers=headers1)
    assert len(response1.get_json()) == 1
