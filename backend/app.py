from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3, os, json
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

app = Flask(__name__)
CORS(app)
DB = 'data/logbook.db'

def get_db():
    os.makedirs('data', exist_ok=True)  # Fix: ensure dir exists on every call
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/flights')
def flights():
    conn = get_db()
    try:
        rows = conn.execute('SELECT * FROM flights ORDER BY date DESC').fetchall()
        result = []
        for f in rows:
            flight = dict(f)
            flight['from'] = flight.pop('from_ap')
            flight['to'] = flight.pop('to_ap')
            flight['approaches'] = [
                dict(a) for a in conn.execute(
                    'SELECT * FROM approaches WHERE flight_id=?', (f['id'],)
                ).fetchall()
            ]
            # Ensure all numeric fields are properly cast
            numeric_fields = ['sic', 'xc', 'xc_over_50nm', 'right_seat', 'multi_pilot', 'pilot_flying']
            for field in numeric_fields:
                if flight[field] is None:
                    flight[field] = 0.0
            result.append(flight)
        return jsonify(result)
    finally:
        conn.close()

@app.route('/api/aircraft')
def aircraft():
    conn = get_db()
    try:
        return jsonify([dict(r) for r in conn.execute('SELECT * FROM aircraft').fetchall()])
    finally:
        conn.close()

@app.route('/api/aircraft/<reg>', methods=['PUT', 'DELETE'])
def manage_aircraft(reg):
    conn = get_db()
    try:
        if request.method == 'DELETE':
            conn.execute('DELETE FROM aircraft WHERE reg = ?', (reg,))
            conn.commit()
            return jsonify({'status': 'ok'})
        else:
            d = request.json
            conn.execute(
                '''UPDATE aircraft SET type=?, class=?, category=?, hp=?, complex=?,
                tailwheel=?, equip=?, home=?, total_time=?, last_flown=?, notes=?, hidden=?
                WHERE reg=?''',
                (d.get('type'), d.get('class'), d.get('category'), d.get('hp'),
                 d.get('complex'), d.get('tailwheel'), d.get('equip'), d.get('home'),
                 d.get('total_time'), d.get('last_flown'), d.get('notes'), d.get('hidden', False), reg)
            )
            conn.commit()
            return jsonify({'status': 'ok'})
    finally:
        conn.close()

@app.route('/api/aircraft', methods=['POST'])
def add_aircraft():
    conn = get_db()
    try:
        d = request.json
        conn.execute(
            '''INSERT INTO aircraft (reg, type, class, category, hp, complex, tailwheel, equip, home, total_time, last_flown, notes, hidden)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (d['reg'], d.get('type'), d.get('class'), d.get('category'), d.get('hp'),
             d.get('complex'), d.get('tailwheel'), d.get('equip'), d.get('home'),
             d.get('total_time'), d.get('last_flown'), d.get('notes'), d.get('hidden', False))
        )
        conn.commit()
        return jsonify({'status': 'ok'}), 201
    finally:
        conn.close()

@app.route('/api/events')
def events():
    conn = get_db()
    try:
        return jsonify([dict(r) for r in conn.execute(
            'SELECT * FROM currency_events ORDER BY date DESC'
        ).fetchall()])
    finally:
        conn.close()

@app.route('/api/events', methods=['POST'])
def add_event():
    conn = get_db()
    try:
        d = request.json
        cur = conn.execute(
            'INSERT INTO currency_events (date,type,description,instructor,expiry) VALUES (?,?,?,?,?)',
            (d['date'], d['type'], d.get('description'), d.get('instructor'), d.get('expiry'))
        )
        conn.commit()
        return jsonify({'id': cur.lastrowid}), 201
    finally:
        conn.close()

@app.route('/api/flights', methods=['POST'])
def add_flight():
    conn = get_db()
    try:
        d = request.json
        if not d or not d.get('date') or not d.get('aircraft'):
            return jsonify({'error': 'date and aircraft are required'}), 400
        cur = conn.execute(
            '''INSERT INTO flights
               (date, aircraft, type, from_ap, to_ap, start_time, takeoff_time, landing_time, shutdown_time,
                air_time, pic, sic, dual, night, ifr, actual_imc, simulated,
                xc, xc_over_50nm, right_seat, multi_pilot, pilot_flying,
                holds, ems, search_and_rescue, aerial_work, training, checkride,
                flight_review, ipc, ppc, route, pic_name, sic_name, ldg_day, ldg_night, remarks)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (
                d['date'], d['aircraft'], d.get('type'),
                d.get('from'), d.get('to'),
                d.get('start_time'), d.get('takeoff_time'), d.get('landing_time'), d.get('shutdown_time'),
                d.get('air_time', 0), d.get('pic', 0), d.get('sic', 0),
                d.get('dual', 0),
                d.get('night', 0), d.get('ifr', 0), d.get('actual_imc', 0),
                d.get('simulated', 0),
                d.get('xc', 0), d.get('xc_over_50nm', 0),
                d.get('right_seat', 0), d.get('multi_pilot', 0),
                d.get('pilot_flying', 0),
                d.get('holds', 0),
                d.get('ems', False),
                d.get('search_and_rescue', False), d.get('aerial_work', False),
                d.get('training', False), d.get('checkride', False),
                d.get('flight_review', False), d.get('ipc', False), d.get('ppc', False),
                d.get('route'), d.get('pic_name'), d.get('sic_name'),
                d.get('ldg_day', 0),
                d.get('ldg_night', 0), d.get('remarks', '')
            )
            )
        fid = cur.lastrowid
        for a in d.get('approaches', []):
            conn.execute(
                'INSERT INTO approaches (flight_id, type, airport, runway, actual) VALUES (?,?,?,?,?)',
                (fid, a['type'], a['airport'], a.get('runway'), 1 if a.get('actual') else 0)
            )
        conn.commit()
        return jsonify({'id': fid}), 201
    finally:
        conn.close()

@app.route('/api/flights/<int:id>', methods=['PUT', 'DELETE'])
def manage_flight(id):
    conn = get_db()
    try:
        if request.method == 'DELETE':
            conn.execute('DELETE FROM approaches WHERE flight_id = ?', (id,))
            conn.execute('DELETE FROM flights WHERE id = ?', (id,))
            conn.commit()
            return jsonify({'status': 'ok'})
        else:
            d = request.json
            conn.execute(
                '''UPDATE flights SET
                date=?, aircraft=?, type=?, from_ap=?, to_ap=?,
                start_time=?, takeoff_time=?, landing_time=?, shutdown_time=?,
                air_time=?, pic=?, sic=?, dual=?, night=?, ifr=?, actual_imc=?, simulated=?,
                xc=?, xc_over_50nm=?, right_seat=?, multi_pilot=?, pilot_flying=?,
                holds=?, ems=?, search_and_rescue=?, aerial_work=?, training=?, checkride=?,
                flight_review=?, ipc=?, ppc=?, route=?, pic_name=?, sic_name=?,
                ldg_day=?, ldg_night=?, remarks=?
                WHERE id=?''',
                (d['date'], d['aircraft'], d.get('type'), d.get('from'), d.get('to'),
                 d.get('start_time'), d.get('takeoff_time'), d.get('landing_time'), d.get('shutdown_time'),
                 d.get('air_time', 0), d.get('pic', 0), d.get('sic', 0), d.get('dual', 0),
                 d.get('night', 0), d.get('ifr', 0), d.get('actual_imc', 0), d.get('simulated', 0),
                 d.get('xc', 0), d.get('xc_over_50nm', 0), d.get('right_seat', 0),
                 d.get('multi_pilot', 0), d.get('pilot_flying', 0),
                 d.get('holds', 0), d.get('ems', False), d.get('search_and_rescue', False),
                 d.get('aerial_work', False), d.get('training', False), d.get('checkride', False),
                 d.get('flight_review', False), d.get('ipc', False), d.get('ppc', False),
                 d.get('route'), d.get('pic_name'), d.get('sic_name'),
                 d.get('ldg_day', 0), d.get('ldg_night', 0), d.get('remarks', ''), id)
            )
            # Update approaches: delete old ones and insert new
            conn.execute('DELETE FROM approaches WHERE flight_id = ?', (id,))
            for a in d.get('approaches', []):
                conn.execute(
                    'INSERT INTO approaches (flight_id, type, airport, runway, actual) VALUES (?,?,?,?,?)',
                    (id, a['type'], a['airport'], a.get('runway'), 1 if a.get('actual') else 0)
                )
            conn.commit()
            return jsonify({'status': 'ok'})
    finally:
        conn.close()

@app.route('/api/settings')
def get_settings():
    conn = get_db()
    try:
        cur = conn.execute("SELECT key, value FROM settings WHERE key = 'app_settings'").fetchone()
        if cur:
            return jsonify(json.loads(cur['value']))
        return jsonify({})
    finally:
        conn.close()

@app.route('/api/settings', methods=['POST'])
def save_settings():
    conn = get_db()
    try:
        d = request.json
        cur = conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            ('app_settings', json.dumps(d))
        )
        conn.commit()
        return jsonify({'status': 'ok'}), 200
    finally:
        conn.close()

@app.route('/api/templates')
def get_templates():
    conn = get_db()
    try:
        rows = conn.execute('SELECT * FROM flight_templates ORDER BY name').fetchall()
        result = []
        for row in rows:
            tpl = dict(row)
            tpl['visible_fields'] = json.loads(tpl['visible_fields'])
            tpl['calculations'] = json.loads(tpl['calculations'])
            tpl['defaults'] = json.loads(tpl['defaults'])
            result.append(tpl)
        return jsonify(result)
    finally:
        conn.close()

@app.route('/api/templates', methods=['POST'])
def create_template():
    conn = get_db()
    try:
        d = request.json
        cur = conn.execute(
            '''INSERT INTO flight_templates
            (name, description, visible_fields, calculations, defaults, icon, color)
            VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (
                d['name'], d.get('description', ''),
                json.dumps(d.get('visible_fields', [])),
                json.dumps(d.get('calculations', {})),
                json.dumps(d.get('defaults', {})),
                d.get('icon'), d.get('color')
            )
        )
        conn.commit()
        return jsonify({'id': cur.lastrowid}), 201
    finally:
        conn.close()

@app.route('/api/templates/<int:id>', methods=['PUT', 'DELETE'])
def manage_template(id):
    conn = get_db()
    try:
        if request.method == 'DELETE':
            conn.execute('DELETE FROM flight_templates WHERE id = ?', (id,))
            conn.commit()
            return jsonify({'status': 'ok'})
        else:
            d = request.json
            conn.execute(
                '''UPDATE flight_templates SET
                name = ?, description = ?, visible_fields = ?,
                calculations = ?, defaults = ?, icon = ?, color = ?
                WHERE id = ?''',
                (
                    d['name'], d.get('description', ''),
                    json.dumps(d.get('visible_fields', [])),
                    json.dumps(d.get('calculations', {})),
                    json.dumps(d.get('defaults', {})),
                    d.get('icon'), d.get('color'), id
                )
            )
            conn.commit()
            return jsonify({'status': 'ok'})
    finally:
        conn.close()

@app.route('/api/currency')
def currency():
    conn = get_db()
    try:
        flights_rows = conn.execute('SELECT * FROM flights ORDER BY date DESC').fetchall()
        events_rows  = conn.execute('SELECT * FROM currency_events ORDER BY date DESC').fetchall()
    finally:
        conn.close()

    now        = datetime.now()
    # Use calendar-accurate relativedelta for month arithmetic
    six_months_ago  = now - relativedelta(months=6)
    twelve_mo_ago   = now - relativedelta(months=12)
    twenty_four_mo  = now - relativedelta(months=24)
    five_years_ago  = now - relativedelta(years=5)

    # --- 5-year recency (CAR 401.05 general) ---
    last_flight = flights_rows[0] if flights_rows else None
    five_year_current = (
        last_flight and datetime.fromisoformat(last_flight['date']) >= five_years_ago
    )

    # --- 2-year recency: flight review / IPC / PPC / seminar / self-paced (CAR 401.05(2)(a)) ---
    two_year_types = ('flight_review', 'ipc', 'ppc', 'seminar', 'self_paced')
    two_year_events = [
        e for e in events_rows
        if e['type'] in two_year_types
        and datetime.fromisoformat(e['date']) >= twenty_four_mo
    ]
    last_two_year = two_year_events[0] if two_year_events else None

    # --- Passenger currency (CAR 401.05(2)(b)) ---
    # Requires 5 takeoffs AND 5 landings in last 6 months.
    # Takeoffs are not tracked separately; landings are used as the proxy
    # (standard Canadian logbook practice — each circuit = 1 T/O + 1 ldg).
    recent = [f for f in flights_rows if datetime.fromisoformat(f['date']) >= six_months_ago]
    day_landings   = sum(f['ldg_day']   or 0 for f in recent)
    night_landings = sum(f['ldg_night'] or 0 for f in recent)

    # --- IFR recency (CAR 401.05(3) & (3.1)) ---
    # Correct logic:
    #   (3.1) Grace period: if IPC/PPC within last 12 months → IFR current (no 6/6 needed)
    #   (3)   After grace: need 6 approaches + 6 hrs instrument (actual+sim) in last 6 months
    #         AND the IPC must still be within 24 months
    #   No IPC within 24 months → not IFR current regardless of recency flights
    # IPC and PPC both count for IFR currency
    ipc_events = [
        e for e in events_rows
        if e['type'] in ('ipc', 'ppc')
    ]
    last_ipc = ipc_events[0] if ipc_events else None

    ifr_current   = False
    in_grace      = False
    approaches    = 0
    inst_hours    = 0.0

    if last_ipc:
        ipc_date = datetime.fromisoformat(last_ipc['date'])
        ipc_within_24mo  = ipc_date >= twenty_four_mo
        ipc_within_12mo  = ipc_date >= twelve_mo_ago  # 12-month grace period (not 13)

        # Always compute 6-month recency so the UI can show progress
        # Batch-fetch all approaches for recent flights in a single query (fixes N+1)
        flight_ids = [f['id'] for f in recent]
        if flight_ids:
            placeholders = ','.join('?' * len(flight_ids))
            appr_rows = conn.execute(
                f'SELECT flight_id, COUNT(*) as c FROM approaches WHERE flight_id IN ({placeholders}) GROUP BY flight_id',
                flight_ids
            ).fetchall()
            appr_map = {row['flight_id']: row['c'] for row in appr_rows}
        else:
            appr_map = {}
        for f in recent:
            approaches += appr_map.get(f['id'], 0)
            inst_hours += (f['actual_imc'] or 0) + (f['simulated'] or 0)

        in_grace = ipc_within_12mo

        if in_grace:
            ifr_current = ipc_within_24mo          # Grace period: just need valid IPC
        else:
            ifr_current = (                         # After grace: IPC still valid AND 6/6
                ipc_within_24mo
                and approaches  >= 6
                and inst_hours  >= 6
            )

    return jsonify({
        'fiveYear': {
            'current': bool(five_year_current),
            'lastFlight': last_flight['date'] if last_flight else None
        },
        'twoYear': {
            'current': bool(last_two_year),
            'lastActivity': last_two_year['date'] if last_two_year else None,
            'type': last_two_year['type'] if last_two_year else None,
        },
        'passengerDay': {
            'current': day_landings >= 5,
            'count': day_landings,
            'required': 5
        },
        'passengerNight': {
            'current': night_landings >= 5,
            'count': night_landings,
            'required': 5
        },
        'ifr': {
            'current': ifr_current,
            'approaches': approaches,
            'hours': round(inst_hours, 1),
            'approachesRequired': 6,
            'hoursRequired': 6,
            'inGracePeriod': in_grace,
            'lastTest': last_ipc['date'] if last_ipc else None
        }
    })

if __name__ == '__main__':
    os.makedirs('data', exist_ok=True)
    conn = get_db()
    conn.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)')
    # Ensure aircraft table has hidden column (may already exist without it)
    try:
        conn.execute('ALTER TABLE aircraft ADD COLUMN hidden INTEGER DEFAULT 0')
    except:
        pass
    # Ensure flights table has all required columns (migration for existing databases)
    for col, dtype in [
        ('dual', 'REAL DEFAULT 0'),
        ('sic', 'REAL DEFAULT 0'),
        ('xc', 'REAL DEFAULT 0'),
        ('xc_over_50nm', 'REAL DEFAULT 0'),
        ('right_seat', 'REAL DEFAULT 0'),
        ('multi_pilot', 'REAL DEFAULT 0'),
        ('pilot_flying', 'REAL DEFAULT 0'),
        ('holds', 'INTEGER DEFAULT 0'),
        ('ifr', 'BOOLEAN DEFAULT 0'),
        ('vfr', 'BOOLEAN DEFAULT 1'),
        ('night_operation', 'BOOLEAN DEFAULT 0'),
        ('ems', 'BOOLEAN DEFAULT 0'),
        ('medevac', 'BOOLEAN DEFAULT 0'),
        ('search_and_rescue', 'BOOLEAN DEFAULT 0'),
        ('aerial_work', 'BOOLEAN DEFAULT 0'),
        ('training', 'BOOLEAN DEFAULT 0'),
        ('checkride', 'BOOLEAN DEFAULT 0'),
        ('flight_review', 'BOOLEAN DEFAULT 0'),
        ('ipc', 'BOOLEAN DEFAULT 0'),
        ('ppc', 'BOOLEAN DEFAULT 0'),
        ('multi_engine', 'REAL DEFAULT 0'),
        ('complex', 'REAL DEFAULT 0'),
        ('high_performance', 'REAL DEFAULT 0'),
        ('turbine', 'REAL DEFAULT 0'),
        ('jet', 'REAL DEFAULT 0'),
        ('start_time', 'TEXT'),
        ('shutdown_time', 'TEXT'),
        ('takeoff_time', 'TEXT'),
        ('landing_time', 'TEXT'),
        ('route', 'TEXT'),
        ('pic_name', 'TEXT'),
        ('sic_name', 'TEXT'),
    ]:
        try:
            conn.execute(f'ALTER TABLE flights ADD COLUMN {col} {dtype}')
        except:
            pass
    conn.commit()
    conn.close()
    app.run(debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true', port=5001)
