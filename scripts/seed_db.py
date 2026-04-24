"""Seed the database with sample data using SQLAlchemy ORM models.

Run from the backend directory:
    cd backend && python -m scripts.seed_db
    # or: cd backend && python ../scripts/seed_db.py
"""
import sys
import os
import random
from datetime import datetime, timedelta, date

# Ensure backend directory is on sys.path so we can import database/models
_backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
_backend_dir = os.path.abspath(_backend_dir)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
# Also try current directory (in case run from inside backend/)
if os.getcwd() not in sys.path:
    sys.path.insert(0, os.getcwd())

from database import Base, engine, get_session, init_db
from models import User, UserAircraft, Flight, CurrencyEvent

# ── Configuration ──────────────────────────────────────────────────────────
NUM_FLIGHTS = 45
USER_EMAIL = 'demo@directlog.app'
USER_PASSWORD_HASH = 'pbkdf2:sha256:260000$demo$demo'  # NOT a real password
USER_NAME = 'Demo Pilot'

AIRCRAFT_DATA = [
    {'reg': 'C-GABC', 'aircraft_type': 'Cessna 172S', 'category': 'SEL', 'total_time': 342.7, 'last_flown': '2026-03-28', 'notes': 'Club'},
    {'reg': 'C-GDEF', 'aircraft_type': 'Piper Archer', 'category': 'SEL', 'total_time': 298.4, 'last_flown': '2026-03-15', 'notes': ''},
    {'reg': 'C-FABC', 'aircraft_type': 'Beech Duchess', 'category': 'MEL', 'total_time': 215.2, 'last_flown': '2026-02-10', 'notes': 'Multi'},
    {'reg': 'C-GHJK', 'aircraft_type': 'Cessna 182T', 'category': 'SEL', 'total_time': 89.1, 'last_flown': '2025-12-20', 'notes': ''},
]

EVENT_DATA = [
    {'event_date': date(2024, 3, 15), 'type': 'flight_review', 'description': 'CAR 401.05(2)(a)', 'instructor': 'J. Smith', 'expiry': date(2026, 3, 15)},
    {'event_date': date(2024, 3, 15), 'type': 'ipc', 'description': 'CAR 401.05(3)', 'instructor': 'J. Smith', 'expiry': date(2026, 3, 15)},
]


def seed():
    """Create tables and populate with sample data."""
    init_db()

    session = get_session()
    try:
        # ── Create demo user ───────────────────────────────────────────
        user = session.query(User).filter_by(email=USER_EMAIL).first()
        if user:
            # Clean up existing demo data
            session.query(CurrencyEvent).filter_by(user_id=user.id).delete()
            session.query(Flight).filter_by(user_id=user.id).delete()
            session.query(UserAircraft).filter_by(user_id=user.id).delete()
            session.delete(user)
            session.flush()

        user = User(email=USER_EMAIL, password_hash=USER_PASSWORD_HASH, name=USER_NAME)
        session.add(user)
        session.flush()

        # ── Create user aircraft ───────────────────────────────────────
        regs = []
        for ac_data in AIRCRAFT_DATA:
            ac = UserAircraft(
                user_id=user.id,
                reg=ac_data['reg'],
                aircraft_type=ac_data['aircraft_type'],
                category=ac_data['category'],
                total_time=ac_data['total_time'],
                last_flown=ac_data['last_flown'],
                notes=ac_data['notes'],
            )
            session.add(ac)
            regs.append(ac_data['reg'])
        session.flush()

        # ── Create sample flights ──────────────────────────────────────
        base = datetime(2024, 10, 1)
        for i in range(1, NUM_FLIGHTS + 1):
            d = base + timedelta(days=random.randint(0, 540))
            reg = random.choice(regs)
            air_time = round(random.uniform(0.8, 2.5), 1)
            approaches = []
            if random.random() < 0.3:
                for _ in range(random.randint(1, 2)):
                    approaches.append({
                        'type': random.choice(['ILS', 'RNAV', 'VOR']),
                        'airport': 'CYEG',
                        'runway': random.choice(['16', '34']),
                        'actual': random.randint(0, 1),
                    })

            flight = Flight(
                user_id=user.id,
                date=d.date(),
                aircraft_reg=reg,
                air_time=air_time,
                pic=round(random.uniform(0.8, 2.5), 1),
                dual=round(random.uniform(0, 1), 1) if random.random() < 0.2 else 0,
                sic=round(random.uniform(0, 0.8), 1) if random.random() < 0.3 else 0,
                night=round(random.uniform(0, 1), 1) if random.random() < 0.3 else 0,
                actual_imc=round(random.uniform(0, 0.5), 1) if random.random() < 0.2 else 0,
                simulated_imc=round(random.uniform(0, 0.5), 1) if random.random() < 0.15 else 0,
                xc=air_time if random.random() < 0.4 else 0,
                holds=random.randint(0, 1) if random.random() < 0.2 else 0,
                ldg_day=random.randint(1, 2),
                ldg_night=random.randint(0, 1) if random.random() < 0.2 else 0,
                approaches=approaches if approaches else [],
                remarks='',
            )
            session.add(flight)

        # ── Create currency events ─────────────────────────────────────
        for ev_data in EVENT_DATA:
            event = CurrencyEvent(
                user_id=user.id,
                date=ev_data['event_date'],
                type=ev_data['type'],
                description=ev_data['description'],
                instructor=ev_data['instructor'],
                expiry=ev_data['expiry'],
            )
            session.add(event)

        session.commit()
        print(f'Seeded {NUM_FLIGHTS} flights, {len(AIRCRAFT_DATA)} aircraft, {len(EVENT_DATA)} events for {USER_EMAIL}')
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == '__main__':
    seed()
