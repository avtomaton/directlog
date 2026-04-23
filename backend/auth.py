"""JWT authentication helpers."""
import os
from datetime import timedelta
from functools import wraps
from flask import request, jsonify, g
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    get_jwt_identity, verify_jwt_in_request
)
from werkzeug.security import generate_password_hash, check_password_hash

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

jwt = JWTManager()


def init_auth(app):
    """Initialize JWT for Flask app."""
    app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = JWT_ACCESS_TOKEN_EXPIRES
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = JWT_REFRESH_TOKEN_EXPIRES
    jwt.init_app(app)


def hash_password(password: str) -> str:
    """Hash a password for storage."""
    return generate_password_hash(password, method='pbkdf2:sha256')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return check_password_hash(password_hash, password)


def get_current_user_id():
    """Get the current user ID from JWT token."""
    identity = get_jwt_identity()
    return int(identity) if identity else None


def jwt_required_custom(fn):
    """Custom decorator that returns 401 instead of raising exception."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            return fn(*args, **kwargs)
        except Exception:
            return jsonify({'error': 'Authentication required'}), 401
    return wrapper


def create_tokens(user_id: int):
    """Create access and refresh tokens for a user."""
    access_token = create_access_token(identity=str(user_id))
    refresh_token = create_refresh_token(identity=str(user_id))
    return access_token, refresh_token
