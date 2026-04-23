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
