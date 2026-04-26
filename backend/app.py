"""Flask application with SQLAlchemy and JWT authentication."""
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load .env before any other imports that read env vars
load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

import database
from auth import init_auth, hash_password, verify_password, create_tokens, admin_required
from models import (
    User, UserSettings, Flight, Airport, SharedAircraft, UserAircraft,
    SharedTemplate, UserTemplate, CurrencyEvent
)
from schemas import (
    flight_schema, flight_update_schema, aircraft_schema, aircraft_update_schema,
    template_schema, template_update_schema, event_schema, event_update_schema,
    settings_schema
)

app = Flask(__name__)
CORS(app, origins=os.environ.get('CORS_ORIGINS', '*').split(','))
init_auth(app)

# Rate limiting — storage backend configurable via env var.
# For single-worker dev: memory:// (default)
# For multi-worker prod: redis://localhost:6379 (shared across workers)
# Don't pass app=app here; use init_app() later so config changes take effect
limiter = Limiter(
    get_remote_address,
    default_limits=[],
    storage_uri=os.environ.get('RATE_LIMIT_STORAGE_URI', 'memory://'),
)

# Initialize limiter with app (allows config changes to take effect)
limiter.init_app(app)

# ============================================================================
# Auth Endpoints (Public)
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
@limiter.limit('5 per minute')
def register():
    """Register a new user."""
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    session = database.get_session()
    try:
        # Check if email exists
        existing = session.query(User).filter(User.email == email).first()
        if existing:
            return jsonify({'error': 'Email already registered'}), 400

        # Create user
        user = User(
            email=email,
            password_hash=hash_password(password),
            name=name or None
        )
        session.add(user)
        session.flush()

        # Create default settings
        settings = UserSettings(user_id=user.id)
        session.add(settings)
        session.commit()

        # Create tokens
        access_token, refresh_token = create_tokens(user.id)
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {'id': user.id, 'email': user.email, 'name': user.name}
        }), 201
    finally:
        session.close()


@app.route('/api/auth/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    """Login and get tokens."""
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    session = database.get_session()
    try:
        user = session.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.password_hash):
            return jsonify({'error': 'Invalid email or password'}), 401

        access_token, refresh_token = create_tokens(user.id)
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {'id': user.id, 'email': user.email, 'name': user.name}
        })
    finally:
        session.close()


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_me():
    """Get current user info."""
    user_id = int(get_jwt_identity())
    session = database.get_session()
    try:
        user = session.query(User).get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'id': user.id, 'email': user.email, 'name': user.name, 'is_admin': user.is_admin})
    finally:
        session.close()


@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit('20 per minute')
def refresh_token():
    """Exchange a valid refresh token for a new access token."""
    from flask_jwt_extended import create_access_token, get_jwt_identity
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    return jsonify({'access_token': access_token})


# ============================================================================
# Shared Data Endpoints (Public for reading)
# ============================================================================

@app.route('/api/airports', methods=['GET'])
def get_airports():
    """Search/list airports."""
    query = request.args.get('q', '').strip()
    limit = min(int(request.args.get('limit', 50)), 200)
    
    session = database.get_session()
    try:
        q = session.query(Airport)
        if query:
            q = q.filter(
                (Airport.icao.ilike(f'{query}%')) |
                (Airport.iata.ilike(f'{query}%')) |
                (Airport.name.ilike(f'%{query}%'))
            )
        airports = q.limit(limit).all()
        return jsonify([a.to_dict() for a in airports])
    finally:
        session.close()


@app.route('/api/airports/<icao>', methods=['GET'])
def get_airport(icao):
    """Get airport details."""
    session = database.get_session()
    try:
        airport = session.query(Airport).filter(Airport.icao == icao.upper()).first()
        if not airport:
            return jsonify({'error': 'Airport not found'}), 404
        return jsonify(airport.to_dict())
    finally:
        session.close()


@app.route('/api/aircraft/shared', methods=['GET'])
def get_shared_aircraft():
    """Search shared aircraft database."""
    query = request.args.get('q', '').strip()
    limit = min(int(request.args.get('limit', 50)), 200)
    
    session = database.get_session()
    try:
        q = session.query(SharedAircraft)
        if query:
            q = q.filter(
                (SharedAircraft.registration.ilike(f'{query}%')) |
                (SharedAircraft.type.ilike(f'%{query}%')) |
                (SharedAircraft.manufacturer.ilike(f'%{query}%'))
            )
        aircraft = q.limit(limit).all()
        return jsonify([{
            'id': a.id,
            'registration': a.registration,
            'type': a.type,
            'manufacturer': a.manufacturer,
            'category': a.category,
            'engine_type': a.engine_type
        } for a in aircraft])
    finally:
        session.close()


@app.route('/api/templates/shared', methods=['GET'])
def get_shared_templates():
    """Get shared templates."""
    session = database.get_session()
    try:
        templates = session.query(SharedTemplate).filter(SharedTemplate.is_active == True).all()
        return jsonify([{
            'id': t.id,
            'name': t.name,
            'description': t.description,
            'category': t.category,
            'fields': t.fields,
            'calculations': t.calculations
        } for t in templates])
    finally:
        session.close()


# ============================================================================
# User Data Endpoints (Protected)
# ============================================================================

@app.route('/api/flights', methods=['GET'])
@jwt_required()
def get_flights():
    """Get current user's flights with pagination."""
    user_id = int(get_jwt_identity())
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(100, int(request.args.get('per_page', 50)))

    session = database.get_session()
    try:
        query = session.query(Flight).filter(
            Flight.user_id == user_id
        ).order_by(Flight.date.desc())

        total = query.count()
        flights = query.offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({
            'flights': [f.to_dict() for f in flights],
            'total': total,
            'page': page,
            'per_page': per_page,
        })
    finally:
        session.close()


@app.route('/api/flights', methods=['POST'])
@jwt_required()
def add_flight():
    """Add a new flight."""
    user_id = int(get_jwt_identity())
    data = request.json

    # Validate input using Marshmallow schema
    errors = flight_schema.validate(data)
    if errors:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400

    session = database.get_session()
    try:
        # Parse date
        flight_date = datetime.strptime(data['date'], '%Y-%m-%d').date()

        # Look up airport IDs
        departure = None
        arrival = None
        if data.get('from'):
            departure = session.query(Airport).filter(Airport.icao == data['from'].upper()).first()
        if data.get('to'):
            arrival = session.query(Airport).filter(Airport.icao == data['to'].upper()).first()

        flight = Flight(
            user_id=user_id,
            date=flight_date,
            aircraft_reg=data.get('aircraft'),
            departure_id=departure.id if departure else None,
            arrival_id=arrival.id if arrival else None,
            air_time=data.get('air_time', 0),
            pic=data.get('pic', 0),
            sic=data.get('sic', 0),
            dual=data.get('dual', 0),
            night=data.get('night', 0),
            ifr=data.get('ifr', 0),
            actual_imc=data.get('actual_imc', 0),
            simulated_imc=data.get('simulated', 0),
            xc=data.get('xc', 0),
            xc_over_50nm=data.get('xc_over_50nm', 0),
            right_seat=data.get('right_seat', 0),
            multi_pilot=data.get('multi_pilot', 0),
            pilot_flying=data.get('pilot_flying', 0),
            holds=data.get('holds', 0),
            multi_engine=data.get('multi_engine', 0),
            complex=data.get('complex', 0),
            high_performance=data.get('high_performance', 0),
            turbine=data.get('turbine', 0),
            jet=data.get('jet', 0),
            medevac=data.get('medevac', False),
            ems=data.get('ems', False),
            search_and_rescue=data.get('search_and_rescue', False),
            aerial_work=data.get('aerial_work', False),
            training=data.get('training', False),
            checkride=data.get('checkride', False),
            flight_review=data.get('flight_review', False),
            ipc=data.get('ipc', False),
            ppc=data.get('ppc', False),
            ldg_day=data.get('ldg_day', 0),
            ldg_night=data.get('ldg_night', 0),
            route=data.get('route'),
            pic_name=data.get('pic_name'),
            sic_name=data.get('sic_name'),
            approaches=data.get('approaches', []),
            start_time=data.get('start_time'),
            takeoff_time=data.get('takeoff_time'),
            landing_time=data.get('landing_time'),
            shutdown_time=data.get('shutdown_time'),
        )
        session.add(flight)
        session.commit()
        return jsonify({'id': flight.id}), 201
    except Exception as e:
        session.rollback()
        app.logger.error('Failed to add flight: %s', e)
        return jsonify({'error': 'Failed to add flight'}), 400
    finally:
        session.close()


@app.route('/api/flights/<int:flight_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_flight(flight_id):
    """Update or delete a flight."""
    user_id = int(get_jwt_identity())
    session = database.get_session()
    try:
        flight = session.query(Flight).filter(
            Flight.id == flight_id,
            Flight.user_id == user_id
        ).first()

        if not flight:
            return jsonify({'error': 'Flight not found'}), 404

        if request.method == 'DELETE':
            session.delete(flight)
            session.commit()
            return jsonify({'status': 'ok'})

        # PUT - update
        data = request.json

        # Validate input using Marshmallow schema
        errors = flight_update_schema.validate(data)
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        if 'date' in data:
            flight.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        if 'aircraft' in data:
            flight.aircraft_reg = data['aircraft']
        if 'from' in data:
            departure = session.query(Airport).filter(Airport.icao == data['from'].upper()).first()
            flight.departure_id = departure.id if departure else None
        if 'to' in data:
            arrival = session.query(Airport).filter(Airport.icao == data['to'].upper()).first()
            flight.arrival_id = arrival.id if arrival else None

        # Update numeric fields
        for field in ['air_time', 'pic', 'sic', 'dual', 'night', 'ifr', 'actual_imc',
                      'xc', 'xc_over_50nm', 'right_seat', 'multi_pilot',
                      'pilot_flying', 'holds', 'multi_engine', 'complex', 'high_performance',
                      'turbine', 'jet', 'ldg_day', 'ldg_night']:
            if field in data:
                setattr(flight, field, data[field])

        # Handle simulated_imc (API accepts 'simulated', model column is 'simulated_imc')
        if 'simulated' in data:
            flight.simulated_imc = data['simulated']

        # Update boolean fields
        for field in ['medevac', 'ems', 'search_and_rescue', 'aerial_work', 'training',
                      'checkride', 'flight_review', 'ipc', 'ppc']:
            if field in data:
                setattr(flight, field, data[field])

        if 'route' in data:
            flight.route = data['route']
        if 'pic_name' in data:
            flight.pic_name = data['pic_name']
        if 'sic_name' in data:
            flight.sic_name = data['sic_name']
        if 'approaches' in data:
            flight.approaches = data['approaches']

        session.commit()
        return jsonify({'status': 'ok'})
    except Exception as e:
        session.rollback()
        app.logger.error('Failed to update flight: %s', e)
        return jsonify({'error': 'Failed to update flight'}), 400
    finally:
        session.close()


# ============================================================================
# Aircraft Endpoints
# ============================================================================

@app.route('/api/aircraft', methods=['GET'])
@jwt_required()
def get_user_aircraft():
    """Get user's aircraft."""
    user_id = int(get_jwt_identity())
    session = database.get_session()
    try:
        aircraft = session.query(UserAircraft).filter(UserAircraft.user_id == user_id).all()
        return jsonify([{
            'reg': a.reg,
            'type': a.aircraft_type,
            'category': a.category,
            'total_time': a.total_time,
            'last_flown': a.last_flown,
            'hidden': a.hidden,
            'notes': a.notes
        } for a in aircraft])
    finally:
        session.close()


@app.route('/api/aircraft', methods=['POST'])
@jwt_required()
def add_user_aircraft():
    """Add aircraft to user's account (from shared DB or custom)."""
    user_id = int(get_jwt_identity())
    data = request.json

    # Validate input using Marshmallow schema
    errors = aircraft_schema.validate(data)
    if errors:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400

    reg = data.get('reg', '').strip().upper()

    if not reg:
        return jsonify({'error': 'Registration required'}), 400

    session = database.get_session()
    try:
        # Check if already exists for user
        existing = session.query(UserAircraft).filter(
            UserAircraft.user_id == user_id,
            UserAircraft.reg == reg
        ).first()
        if existing:
            return jsonify({'error': 'Aircraft already in your account'}), 400

        # If shared_aircraft_id provided, get cached data
        aircraft_type = data.get('type', '')
        category = data.get('category', '')
        if data.get('shared_aircraft_id'):
            shared = session.query(SharedAircraft).get(data['shared_aircraft_id'])
            if shared:
                aircraft_type = aircraft_type or shared.type
                category = category or shared.category

        user_ac = UserAircraft(
            user_id=user_id,
            reg=reg,
            aircraft_type=aircraft_type,
            category=category,
            total_time=data.get('total_time'),
            last_flown=data.get('last_flown'),
            notes=data.get('notes')
        )
        session.add(user_ac)
        session.commit()
        return jsonify({'reg': reg}), 201
    finally:
        session.close()


@app.route('/api/aircraft/<reg>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_user_aircraft(reg):
    """Update or delete user's aircraft."""
    user_id = int(get_jwt_identity())
    session = database.get_session()
    try:
        aircraft = session.query(UserAircraft).filter(
            UserAircraft.user_id == user_id,
            UserAircraft.reg == reg
        ).first()

        if not aircraft:
            return jsonify({'error': 'Aircraft not found'}), 404

        if request.method == 'DELETE':
            session.delete(aircraft)
            session.commit()
            return jsonify({'status': 'ok'})

        # PUT - update
        data = request.json

        # Validate input using Marshmallow schema
        errors = aircraft_update_schema.validate(data)
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        if 'hidden' in data:
            aircraft.hidden = data['hidden']
        if 'notes' in data:
            aircraft.notes = data['notes']
        if 'total_time' in data:
            aircraft.total_time = data['total_time']
        if 'last_flown' in data:
            aircraft.last_flown = data['last_flown']

        session.commit()
        return jsonify({'status': 'ok'})
    finally:
        session.close()


# ============================================================================
# Templates Endpoints
# ============================================================================

@app.route('/api/templates', methods=['GET'])
@jwt_required()
def get_user_templates():
    """Get user's templates."""
    user_id = int(get_jwt_identity())
    session = database.get_session()
    try:
        templates = session.query(UserTemplate).filter(UserTemplate.user_id == user_id).all()
        return jsonify([{
            'id': t.id,
            'name': t.name,
            'description': t.description,
            'category': t.category,
            'fields': t.fields,
            'calculations': t.calculations,
            'shared_template_id': t.shared_template_id
        } for t in templates])
    finally:
        session.close()


@app.route('/api/templates', methods=['POST'])
@jwt_required()
def create_user_template():
    """Create or copy a template."""
    user_id = int(get_jwt_identity())
    data = request.json

    # Validate input using Marshmallow schema
    errors = template_schema.validate(data)
    if errors:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400

    name = data.get('name', '').strip()

    if not name:
        return jsonify({'error': 'Name required'}), 400

    session = database.get_session()
    try:
        # If copying from shared template
        if data.get('shared_template_id'):
            shared = session.query(SharedTemplate).get(data['shared_template_id'])
            if not shared:
                return jsonify({'error': 'Shared template not found'}), 404

            template = UserTemplate(
                user_id=user_id,
                shared_template_id=shared.id,
                name=name,
                description=data.get('description', shared.description),
                category=data.get('category', shared.category),
                fields=shared.fields,
                calculations=shared.calculations
            )
        else:
            template = UserTemplate(
                user_id=user_id,
                name=name,
                description=data.get('description', ''),
                category=data.get('category'),
                fields=data.get('fields', []),
                calculations=data.get('calculations', {})
            )

        session.add(template)
        session.commit()
        return jsonify({'id': template.id}), 201
    finally:
        session.close()


@app.route('/api/templates/<int:template_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_template(template_id):
    """Update or delete user's template."""
    user_id = int(get_jwt_identity())
    session = database.get_session()
    try:
        template = session.query(UserTemplate).filter(
            UserTemplate.id == template_id,
            UserTemplate.user_id == user_id
        ).first()

        if not template:
            return jsonify({'error': 'Template not found'}), 404

        if request.method == 'DELETE':
            session.delete(template)
            session.commit()
            return jsonify({'status': 'ok'})

        # PUT - update
        data = request.json

        # Validate input using Marshmallow schema
        errors = template_update_schema.validate(data)
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        if 'name' in data:
            template.name = data['name']
        if 'description' in data:
            template.description = data['description']
        if 'fields' in data:
            template.fields = data['fields']
            template.is_modified = True
        if 'calculations' in data:
            template.calculations = data['calculations']
            template.is_modified = True

        session.commit()
        return jsonify({'status': 'ok'})
    finally:
        session.close()


# ============================================================================
# Currency Events Endpoints
# ============================================================================

@app.route('/api/events', methods=['GET'])
@jwt_required()
def get_events():
    """Get user's currency events."""
    user_id = int(get_jwt_identity())
    session = database.get_session()
    try:
        events = session.query(CurrencyEvent).filter(
            CurrencyEvent.user_id == user_id
        ).order_by(CurrencyEvent.date.desc()).all()
        return jsonify([{
            'id': e.id,
            'date': e.date.isoformat() if e.date else None,
            'type': e.type,
            'description': e.description,
            'instructor': e.instructor,
            'expiry': e.expiry.isoformat() if e.expiry else None
        } for e in events])
    finally:
        session.close()


@app.route('/api/events', methods=['POST'])
@jwt_required()
def add_event():
    """Add a currency event."""
    user_id = int(get_jwt_identity())
    data = request.json

    # Validate input using Marshmallow schema
    errors = event_schema.validate(data)
    if errors:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400

    session = database.get_session()
    try:
        event_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        expiry = None
        if data.get('expiry'):
            expiry = datetime.strptime(data['expiry'], '%Y-%m-%d').date()

        event = CurrencyEvent(
            user_id=user_id,
            date=event_date,
            type=data['type'],
            description=data.get('description'),
            instructor=data.get('instructor'),
            expiry=expiry
        )
        session.add(event)
        session.commit()
        return jsonify({'id': event.id}), 201
    finally:
        session.close()


@app.route('/api/events/<int:event_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_event(event_id):
    """Update or delete a currency event."""
    user_id = int(get_jwt_identity())
    session = database.get_session()
    try:
        event = session.query(CurrencyEvent).filter(
            CurrencyEvent.id == event_id,
            CurrencyEvent.user_id == user_id
        ).first()

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        if request.method == 'DELETE':
            session.delete(event)
            session.commit()
            return jsonify({'status': 'ok'})

        # PUT - update
        data = request.json

        # Validate input using Marshmallow schema
        errors = event_update_schema.validate(data)
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        if 'date' in data:
            event.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        if 'type' in data:
            event.type = data['type']
        if 'description' in data:
            event.description = data['description']
        if 'instructor' in data:
            event.instructor = data['instructor']
        if 'expiry' in data:
            event.expiry = datetime.strptime(data['expiry'], '%Y-%m-%d').date() if data['expiry'] else None

        session.commit()
        return jsonify({'status': 'ok'})
    finally:
        session.close()


# ============================================================================
# Settings Endpoint
# ============================================================================

@app.route('/api/settings', methods=['GET'])
@jwt_required()
def get_settings():
    """Get user's settings."""
    user_id = int(get_jwt_identity())
    session = database.get_session()
    try:
        settings = session.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        return jsonify({
            'regulation': settings.regulation,
            'home_airport': settings.home_airport,
            'currency_view': settings.currency_view,
            'time_format': settings.time_format
        })
    finally:
        session.close()


@app.route('/api/settings', methods=['POST'])
@jwt_required()
def save_settings():
    """Save user settings."""
    user_id = int(get_jwt_identity())
    data = request.json

    # Validate input using Marshmallow schema
    errors = settings_schema.validate(data)
    if errors:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400

    session = database.get_session()
    try:
        settings = session.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        if not settings:
            settings = UserSettings(user_id=user_id)
            session.add(settings)
            try:
                session.flush()
            except Exception:
                # Race condition: another request created settings concurrently
                session.rollback()
                settings = session.query(UserSettings).filter(UserSettings.user_id == user_id).first()

        if 'regulation' in data:
            settings.regulation = data['regulation']
        if 'home_airport' in data:
            settings.home_airport = data['home_airport']
        if 'currency_view' in data:
            settings.currency_view = data['currency_view']
        if 'time_format' in data:
            settings.time_format = data['time_format']

        session.commit()
        return jsonify({'status': 'ok'})
    finally:
        session.close()


# ============================================================================
# Currency Calculation Endpoint
# ============================================================================

@app.route('/api/currency', methods=['GET'])
@jwt_required()
def get_currency():
    """Calculate currency status for user."""
    user_id = int(get_jwt_identity())
    session = database.get_session()
    try:
        # Get user's flights
        flights = session.query(Flight).filter(
            Flight.user_id == user_id
        ).order_by(Flight.date.desc()).all()
        
        # Get user's events
        events = session.query(CurrencyEvent).filter(
            CurrencyEvent.user_id == user_id
        ).order_by(CurrencyEvent.date.desc()).all()
        
        # Simple currency check - return summary
        # (Full implementation would use the calculator functions)
        total_hours = sum(f.air_time or 0 for f in flights)
        recent_flights = [f for f in flights if f.date]
        
        return jsonify({
            'total_hours': round(total_hours, 1),
            'flight_count': len(flights),
            'recent_activities': [{
                'date': f.date.isoformat(),
                'type': 'flight',
                'description': f'{f.aircraft_reg} {f.air_time}hrs'
            } for f in recent_flights[:10]]
        })
    finally:
        session.close()


# ============================================================================
# Admin Endpoints
# ============================================================================

@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def admin_stats():
    """Get platform-wide statistics."""
    session = database.get_session()
    try:
        from sqlalchemy import func

        total_users = session.query(func.count(User.id)).scalar()
        total_flights = session.query(func.count(Flight.id)).scalar()
        total_aircraft = session.query(func.count(UserAircraft.id)).scalar()
        total_events = session.query(func.count(CurrencyEvent.id)).scalar()

        # Total hours across all users
        total_hours_result = session.query(func.coalesce(func.sum(Flight.air_time), 0)).scalar()
        total_hours = round(float(total_hours_result), 1)

        # Users registered in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        new_users_30d = session.query(func.count(User.id)).filter(
            User.created_at >= thirty_days_ago
        ).scalar()

        # Flights in last 30 days
        flights_30d = session.query(func.count(Flight.id)).filter(
            Flight.date >= thirty_days_ago.date()
        ).scalar()

        # Hours in last 30 days
        hours_30d_result = session.query(func.coalesce(func.sum(Flight.air_time), 0)).filter(
            Flight.date >= thirty_days_ago.date()
        ).scalar()
        hours_30d = round(float(hours_30d_result), 1)

        # Active users (flown in last 30 days)
        active_users_30d = session.query(func.count(func.distinct(Flight.user_id))).filter(
            Flight.date >= thirty_days_ago.date()
        ).scalar()

        # Average flights per user
        avg_flights = round(total_flights / max(total_users, 1), 1)

        # Top users by flight count
        top_users_query = session.query(
            User.id, User.name, User.email, func.count(Flight.id).label('flight_count'),
            func.coalesce(func.sum(Flight.air_time), 0).label('total_hours')
        ).join(Flight, User.id == Flight.user_id).group_by(User.id).order_by(
            func.count(Flight.id).desc()
        ).limit(10).all()

        top_users = [{
            'id': u.id,
            'name': u.name or u.email,
            'email': u.email,
            'flight_count': u.flight_count,
            'total_hours': round(float(u.total_hours), 1),
        } for u in top_users_query]

        # Users by regulation
        regulation_counts = {}
        for reg in session.query(UserSettings.regulation, func.count(UserSettings.id)).group_by(UserSettings.regulation).all():
            regulation_counts[reg[0] or 'CARs'] = reg[1]

        return jsonify({
            'total_users': total_users,
            'total_flights': total_flights,
            'total_aircraft': total_aircraft,
            'total_events': total_events,
            'total_hours': total_hours,
            'new_users_30d': new_users_30d,
            'flights_30d': flights_30d,
            'hours_30d': hours_30d,
            'active_users_30d': active_users_30d,
            'avg_flights_per_user': avg_flights,
            'top_users': top_users,
            'regulation_counts': regulation_counts,
        })
    finally:
        session.close()


@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_users():
    """List all users with summary stats."""
    session = database.get_session()
    try:
        from sqlalchemy import func

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 25, type=int)
        search = request.args.get('search', '', type=str).strip()

        query = session.query(User).order_by(User.created_at.desc())

        if search:
            query = query.filter(
                (User.email.ilike(f'%{search}%')) | (User.name.ilike(f'%{search}%'))
            )

        total = query.count()
        users = query.offset((page - 1) * per_page).limit(per_page).all()

        user_list = []
        for u in users:
            flight_count = session.query(func.count(Flight.id)).filter(Flight.user_id == u.id).scalar()
            total_hours = session.query(func.coalesce(func.sum(Flight.air_time), 0)).filter(
                Flight.user_id == u.id
            ).scalar()
            aircraft_count = session.query(func.count(UserAircraft.id)).filter(
                UserAircraft.user_id == u.id
            ).scalar()

            user_list.append({
                'id': u.id,
                'email': u.email,
                'name': u.name,
                'is_admin': u.is_admin,
                'created_at': u.created_at.isoformat() if u.created_at else None,
                'flight_count': flight_count,
                'total_hours': round(float(total_hours), 1),
                'aircraft_count': aircraft_count,
            })

        return jsonify({
            'users': user_list,
            'total': total,
            'page': page,
            'per_page': per_page,
        })
    finally:
        session.close()


@app.route('/api/admin/users/<int:user_id>/toggle-admin', methods=['POST'])
@admin_required
def admin_toggle_admin(user_id):
    """Toggle admin status for a user."""
    session = database.get_session()
    try:
        user = session.query(User).get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Prevent self-demotion
        current_user_id = int(get_jwt_identity())
        if user.id == current_user_id:
            return jsonify({'error': 'Cannot change your own admin status'}), 400

        user.is_admin = not user.is_admin
        session.commit()
        return jsonify({'id': user.id, 'email': user.email, 'is_admin': user.is_admin})
    except Exception:
        session.rollback()
        return jsonify({'error': 'Failed to update user'}), 500
    finally:
        session.close()


@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(user_id):
    """Delete a user and all their data."""
    session = database.get_session()
    try:
        current_user_id = int(get_jwt_identity())
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400

        user = session.query(User).get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Cascade delete user data
        session.query(CurrencyEvent).filter_by(user_id=user_id).delete()
        session.query(Flight).filter_by(user_id=user_id).delete()
        session.query(UserAircraft).filter_by(user_id=user_id).delete()
        session.query(UserTemplate).filter_by(user_id=user_id).delete()
        session.query(UserSettings).filter_by(user_id=user_id).delete()
        session.delete(user)
        session.commit()
        return jsonify({'message': f'User {user.email} deleted successfully'})
    except Exception:
        session.rollback()
        return jsonify({'error': 'Failed to delete user'}), 500
    finally:
        session.close()


@app.route('/api/admin/flights', methods=['GET'])
@admin_required
def admin_flights():
    """Get recent flights across all users."""
    session = database.get_session()
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 25, type=int)

        # Fetch flights with user data in a single query to avoid N+1 problem
        from sqlalchemy.orm import joinedload
        flights_with_users = session.query(Flight).options(
            joinedload(Flight.user)
        ).order_by(Flight.date.desc()).offset((page - 1) * per_page).limit(per_page).all()
        
        # Get total count for pagination
        total = session.query(Flight).count()

        flight_list = []
        for f in flights_with_users:
            flight_list.append({
                'id': f.id,
                'user_id': f.user_id,
                'user_email': f.user.email if f.user else 'Unknown',
                'date': f.date.isoformat() if f.date else None,
                'aircraft_reg': f.aircraft_reg,
                'air_time': f.air_time,
                'pic': f.pic,
                'night': f.night,
                'ldg_day': f.ldg_day,
                'ldg_night': f.ldg_night,
                'route': f.route,
                'remarks': f.remarks,
            })

        return jsonify({
            'flights': flight_list,
            'total': total,
            'page': page,
            'per_page': per_page,
        })
    finally:
        session.close()


# ============================================================================
# Static File Serving (Production)
# ============================================================================
# In production (Docker), the built frontend is copied to ./static/.
# Serve it via Flask so everything runs on a single port.
# In development, Vite dev server handles frontend separately.

STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')
if os.path.isdir(STATIC_DIR):
    from flask import send_from_directory

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_spa(path):
        """Serve the React SPA — all non-API routes return index.html."""
        if path and os.path.exists(os.path.join(STATIC_DIR, path)):
            return send_from_directory(STATIC_DIR, path)
        return send_from_directory(STATIC_DIR, 'index.html')


# ============================================================================
# App Startup
# ============================================================================

if __name__ == '__main__':
    os.makedirs('data', exist_ok=True)
    database.init_db()
    app.run(debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true', port=5001)
