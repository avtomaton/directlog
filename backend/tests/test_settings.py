"""Tests for settings endpoints."""
import pytest


def test_get_settings(client, auth_headers, db_session):
    """Test getting user settings."""
    response = client.get('/api/settings', headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert 'regulation' in data
    assert data['regulation'] == 'CARs'  # Default


def test_save_settings(client, auth_headers):
    """Test saving user settings."""
    response = client.post('/api/settings', headers=auth_headers, json={
        'regulation': 'FAA',
        'home_airport': 'KJFK',
        'currency_view': 'day',
        'time_format': 'minutes'
    })
    assert response.status_code == 200

    # Verify settings were saved
    response = client.get('/api/settings', headers=auth_headers)
    data = response.get_json()
    assert data['regulation'] == 'FAA'
    assert data['home_airport'] == 'KJFK'


def test_save_settings_invalid_regulation(client, auth_headers):
    """Test saving settings with invalid regulation fails."""
    response = client.post('/api/settings', headers=auth_headers, json={
        'regulation': 'INVALID'
    })
    assert response.status_code == 400
    assert 'validation' in response.get_json()['error'].lower()


def test_save_settings_invalid_time_format(client, auth_headers):
    """Test saving settings with invalid time format fails."""
    response = client.post('/api/settings', headers=auth_headers, json={
        'time_format': 'invalid_format'
    })
    assert response.status_code == 400


def test_settings_isolation(client, app, db_session):
    """Test that users can only see their own settings."""
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

    # User1 saves settings
    client.post('/api/settings', headers=headers1, json={
        'regulation': 'FAA'
    })

    # User2 should still have default settings
    response2 = client.get('/api/settings', headers=headers2)
    assert response2.get_json()['regulation'] == 'CARs'

    # User1 should see their settings
    response1 = client.get('/api/settings', headers=headers1)
    assert response1.get_json()['regulation'] == 'FAA'
