"""Tests for admin endpoints."""
import pytest
from datetime import date, timedelta
from models import User, UserSettings, Flight, CurrencyEvent


def make_admin_user(db_session):
    """Helper to create an admin user."""
    from auth import hash_password, create_tokens

    admin = User(
        email='admin@example.com',
        password_hash=hash_password('admin123'),
        name='Admin User',
        is_admin=True
    )
    db_session.add(admin)
    db_session.flush()

    settings = UserSettings(user_id=admin.id)
    db_session.add(settings)
    db_session.commit()

    return admin


def get_admin_headers(client, app, admin_user):
    """Helper to get admin auth headers."""
    from auth import create_tokens

    with app.app_context():
        access_token, _ = create_tokens(admin_user.id)

    return {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}


def test_admin_stats(client, app, db_session, auth_headers):
    """Test getting admin stats as admin."""
    # Make user an admin
    user = db_session.query(User).filter_by(email='test@example.com').first()
    user.is_admin = True
    db_session.commit()

    response = client.get('/api/admin/stats', headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert 'total_users' in data
    assert 'total_flights' in data


def test_admin_stats_non_admin(client, auth_headers):
    """Test getting admin stats as non-admin fails."""
    response = client.get('/api/admin/stats', headers=auth_headers)
    assert response.status_code == 403


def test_admin_users(client, app, db_session):
    """Test listing users as admin."""
    admin = make_admin_user(db_session)
    headers = get_admin_headers(client, app, admin)

    response = client.get('/api/admin/users', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert 'users' in data
    assert 'total' in data


def test_admin_users_non_admin(client, auth_headers):
    """Test listing users as non-admin fails."""
    response = client.get('/api/admin/users', headers=auth_headers)
    assert response.status_code == 403


def test_admin_toggle_admin(client, app, db_session, auth_headers):
    """Test toggling admin status."""
    # Create admin user
    admin = make_admin_user(db_session)
    headers = get_admin_headers(client, app, admin)

    # Get the regular user (created by auth_headers fixture)
    user = db_session.query(User).filter_by(email='test@example.com').first()

    # Toggle admin on
    response = client.post(f'/api/admin/users/{user.id}/toggle-admin', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data['is_admin'] == True

    # Toggle admin off
    response = client.post(f'/api/admin/users/{user.id}/toggle-admin', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data['is_admin'] == False


def test_admin_toggle_self(client, app, db_session):
    """Test that admin cannot demote themselves."""
    admin = make_admin_user(db_session)
    headers = get_admin_headers(client, app, admin)

    response = client.post(f'/api/admin/users/{admin.id}/toggle-admin', headers=headers)
    assert response.status_code == 400
    assert 'own' in response.get_json()['error'].lower()


def test_admin_delete_user(client, app, db_session, auth_headers):
    """Test deleting a user as admin."""
    from auth import hash_password
    from models import User, UserSettings

    admin = make_admin_user(db_session)
    headers = get_admin_headers(client, app, admin)

    # Get or create the regular user (created by auth_headers fixture)
    user_to_delete = db_session.query(User).filter_by(email='test@example.com').first()
    if not user_to_delete:
        # Create if doesn't exist
        user_to_delete = User(
            email='test@example.com',
            password_hash=hash_password('password123')
        )
        db_session.add(user_to_delete)
        db_session.flush()
        settings = UserSettings(user_id=user_to_delete.id)
        db_session.add(settings)
        db_session.commit()

    user_id = user_to_delete.id

    # Delete the user
    response = client.delete(f'/api/admin/users/{user_id}', headers=headers)
    assert response.status_code == 200

    # Verify deleted - expire session cache to see the deletion
    db_session.expire_all()
    assert db_session.query(User).filter_by(id=user_id).first() is None


def test_admin_delete_self(client, app, db_session):
    """Test that admin cannot delete themselves."""
    admin = make_admin_user(db_session)
    headers = get_admin_headers(client, app, admin)

    response = client.delete(f'/api/admin/users/{admin.id}', headers=headers)
    assert response.status_code == 400
    assert 'own' in response.get_json()['error'].lower()


def test_admin_flights(client, app, db_session):
    """Test getting all flights as admin."""
    admin = make_admin_user(db_session)
    headers = get_admin_headers(client, app, admin)

    response = client.get('/api/admin/flights', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert 'flights' in data
    assert 'total' in data


def test_admin_flights_non_admin(client, auth_headers):
    """Test getting all flights as non-admin fails."""
    response = client.get('/api/admin/flights', headers=auth_headers)
    assert response.status_code == 403


def test_admin_stats_with_data(client, app, db_session, auth_headers):
    """Test admin stats calculation with actual data."""
    admin = make_admin_user(db_session)
    headers = get_admin_headers(client, app, admin)

    # Get the regular user (created by auth_headers fixture)
    from models import User
    user = db_session.query(User).filter_by(email='test@example.com').first()
    if not user:
        # Create if doesn't exist
        from auth import hash_password
        user = User(email='test@example.com', password_hash=hash_password('password123'))
        db_session.add(user)
        db_session.flush()
        from models import UserSettings
        db_session.add(UserSettings(user_id=user.id))
        db_session.commit()

    # Add a flight
    flight = Flight(
        user_id=user.id,
        date=date.today(),
        aircraft_reg='C-GABC',
        air_time=1.5
    )
    db_session.add(flight)

    # Add an event
    event = CurrencyEvent(
        user_id=user.id,
        date=date.today(),
        type='flight_review'
    )
    db_session.add(event)
    db_session.commit()

    response = client.get('/api/admin/stats', headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data['total_users'] >= 2
    assert data['total_flights'] >= 1
    assert data['total_events'] >= 1
