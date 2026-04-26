"""Tests for authentication endpoints."""
import pytest


def test_register_success(client, db_session):
    """Test successful registration."""
    response = client.post('/api/auth/register', json={
        'email': 'newuser@example.com',
        'password': 'password123',
        'name': 'New User'
    })
    assert response.status_code == 201
    data = response.get_json()
    assert 'access_token' in data
    assert 'refresh_token' in data
    assert data['user']['email'] == 'newuser@example.com'


def test_register_duplicate_email(client, db_session):
    """Test registration with existing email fails."""
    # First registration
    client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    # Second registration with same email
    response = client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'password456'
    })
    assert response.status_code == 400
    assert 'already registered' in response.get_json()['error']


def test_register_short_password(client, db_session):
    """Test registration with short password fails."""
    response = client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'short'
    })
    assert response.status_code == 400
    assert 'at least 8 characters' in response.get_json()['error']


def test_login_success(client, db_session):
    """Test successful login."""
    # Register first
    client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    # Login
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'access_token' in data


def test_login_wrong_password(client, db_session):
    """Test login with wrong password fails."""
    # Register first
    client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    # Login with wrong password
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'wrongpassword'
    })
    assert response.status_code == 401


def test_login_nonexistent_user(client, db_session):
    """Test login with nonexistent email fails."""
    response = client.post('/api/auth/login', json={
        'email': 'nonexistent@example.com',
        'password': 'password123'
    })
    assert response.status_code == 401


def test_protected_endpoint_without_token(client, db_session):
    """Test accessing protected endpoint without token fails."""
    response = client.get('/api/flights')
    assert response.status_code == 401


def test_protected_endpoint_with_token(client, auth_headers, db_session):
    """Test accessing protected endpoint with valid token."""
    response = client.get('/api/flights', headers=auth_headers)
    assert response.status_code == 200


def test_get_me_with_token(client, auth_headers):
    """Test getting current user info with valid token."""
    response = client.get('/api/auth/me', headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert 'email' in data
    assert 'id' in data


def test_get_me_without_token(client):
    """Test getting current user without token fails."""
    response = client.get('/api/auth/me')
    assert response.status_code == 401


def test_refresh_token_success(client, auth_headers, db_session):
    """Test successful token refresh."""
    from auth import create_tokens
    from models import User

    # Get the user created by auth_headers fixture
    user = db_session.query(User).filter_by(email='test@example.com').first()
    assert user is not None, "User should exist from auth_headers fixture"

    with client.application.app_context():
        _, refresh_token = create_tokens(user.id)

    response = client.post('/api/auth/refresh', headers={
        'Authorization': f'Bearer {refresh_token}',
        'Content-Type': 'application/json'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'access_token' in data


def test_refresh_token_invalid(client):
    """Test refresh with invalid token fails."""
    # Use a properly formatted but invalid JWT token
    invalid_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.INVALID_SIGNATURE'
    response = client.post('/api/auth/refresh', headers={
        'Authorization': f'Bearer {invalid_token}',
        'Content-Type': 'application/json'
    })
    # Accept both 401 (Unauthorized) and 422 (Unprocessable Entity) 
    # as valid responses for invalid tokens
    assert response.status_code in [401, 422]


def test_register_validation_missing_fields(client):
    """Test registration with missing fields."""
    response = client.post('/api/auth/register', json={
        'email': 'test@example.com'
        # missing password
    })
    # Accept both 400 (validation error) and 429 (rate limited)
    assert response.status_code in [400, 429]


def test_login_validation_missing_fields(client):
    """Test login with missing fields."""
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com'
        # missing password
    })
    assert response.status_code == 400
