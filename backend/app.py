"""Flask application with SQLAlchemy and JWT authentication."""
import os
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import jwt_required, get_jwt_identity

import database
from auth import init_auth, hash_password, verify_password, create_tokens
from models import (
    User, UserSettings, Flight, Airport, SharedAircraft, UserAircraft,
    SharedTemplate, UserTemplate, CurrencyEvent
)

app = Flask(__name__)
CORS(app)
init_auth(app)


# ============================================================================
# Auth Endpoints (Public)
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
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
        return jsonify({'id': user.id, 'email': user.email, 'name': user.name})
    finally:
        session.close()


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
    """Get current user's flights."""
    user_id = int(get_jwt_identity())
    session = database.get_session()
    try:
        flights = session.query(Flight).filter(
            Flight.user_id == user_id
        ).order_by(Flight.date.desc()).all()
        return jsonify([{
            'id': f.id,
            'date': f.date.isoformat() if f.date else None,
            'aircraft': f.aircraft_reg,
            'from': f.departure.icao if f.departure else None,
            'to': f.arrival.icao if f.arrival else None,
            'air_time': f.air_time,
            'pic': f.pic,
            'approaches': f.approaches or [],
            # ... include all fields
            'night': f.night,
            'ifr': f.ifr,
            'xc': f.xc,
            'ldg_day': f.ldg_day,
            'ldg_night': f.ldg_night,
        } for f in flights])
    finally:
        session.close()


@app.route('/api/flights', methods=['POST'])
@jwt_required()
def add_flight():
    """Add a new flight."""
    user_id = int(get_jwt_identity())
    data = request.json
    
    if not data.get('date') or not data.get('aircraft'):
        return jsonify({'error': 'date and aircraft are required'}), 400

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
        return jsonify({'error': str(e)}), 400
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
                      'simulated', 'xc', 'xc_over_50nm', 'right_seat', 'multi_pilot',
                      'pilot_flying', 'holds', 'multi_engine', 'complex', 'high_performance',
                      'turbine', 'jet', 'ldg_day', 'ldg_night']:
            if field in data:
                setattr(flight, field, data[field])
        
        # Update boolean fields
        for field in ['ems', 'search_and_rescue', 'aerial_work', 'training', 
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
        return jsonify({'error': str(e)}), 400
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
    
    if not data.get('date') or not data.get('type'):
        return jsonify({'error': 'date and type required'}), 400

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
    
    session = database.get_session()
    try:
        settings = session.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        if not settings:
            settings = UserSettings(user_id=user_id)
            session.add(settings)
        
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
# App Startup
# ============================================================================

if __name__ == '__main__':
    os.makedirs('data', exist_ok=True)
    init_db()
    app.run(debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true', port=5001)
