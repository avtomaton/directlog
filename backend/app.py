from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3, os
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)
DB = 'data/logbook.db'

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/flights')
def flights():
    conn = get_db()
    flights = conn.execute('SELECT * FROM flights ORDER BY date DESC').fetchall()
    result = []
    for f in flights:
        flight = dict(f)
        flight['from'] = flight.pop('from_ap')
        flight['to'] = flight.pop('to_ap')
        flight['approaches'] = [dict(a) for a in conn.execute('SELECT * FROM approaches WHERE flight_id=?', (f['id'],)).fetchall()]
        result.append(flight)
    return jsonify(result)

@app.route('/api/aircraft')
def aircraft():
    conn = get_db()
    return jsonify([dict(r) for r in conn.execute('SELECT * FROM aircraft').fetchall()])

@app.route('/api/events')
def events():
    conn = get_db()
    return jsonify([dict(r) for r in conn.execute('SELECT * FROM currency_events ORDER BY date DESC').fetchall()])

@app.route('/api/events', methods=['POST'])
def add_event():
    conn = get_db()
    d = request.json
    cur = conn.execute('INSERT INTO currency_events (date,type,description,instructor,expiry) VALUES (?,?,?,?,?)',
                       (d['date'], d['type'], d.get('description'), d.get('instructor'), d.get('expiry')))
    conn.commit()
    return jsonify({'id': cur.lastrowid}), 201

@app.route('/api/flights', methods=['POST'])
def add_flight():
    conn = get_db()
    d = request.json
    cur = conn.execute('INSERT INTO flights (date,aircraft,type,from_ap,to_ap,air_time,pic,night,actual_imc,simulated,ldg_day,ldg_night,remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
                       (d['date'],d['aircraft'],d.get('type'),d.get('from'),d.get('to'),d.get('air_time'),d.get('pic'),d.get('night'),d.get('actual_imc'),d.get('simulated'),d.get('ldg_day'),d.get('ldg_night'),d.get('remarks')))
    fid = cur.lastrowid
    for a in d.get('approaches',[]): 
        conn.execute('INSERT INTO approaches (flight_id,type,airport,runway,actual) VALUES (?,?,?,?,?)', (fid,a['type'],a['airport'],a.get('runway'),1 if a.get('actual') else 0))
    conn.commit()
    return jsonify({'id': fid}), 201

@app.route('/api/currency')
def currency():
    conn = get_db()
    flights = conn.execute('SELECT * FROM flights').fetchall()
    events = conn.execute('SELECT * FROM currency_events').fetchall()
    now = datetime.now()
    six_mo = now - timedelta(days=183)
    two_y = now - timedelta(days=730)
    five_y = now - timedelta(days=1825)
    
    recent = [f for f in flights if datetime.fromisoformat(f['date']) >= six_mo]
    day = sum(f['ldg_day'] or 0 for f in recent)
    night = sum(f['ldg_night'] or 0 for f in recent)
    appr = sum(conn.execute('SELECT COUNT(*) c FROM approaches WHERE flight_id=?', (f['id'],)).fetchone()['c'] for f in recent)
    hrs = sum((f['actual_imc'] or 0)+(f['simulated'] or 0) for f in recent)
    
    last_flight = flights[0] if flights else None
    five_year = last_flight and datetime.fromisoformat(last_flight['date']) >= five_y
    
    last_ipc = next((e for e in events if e['type'] in ('ipc','ppc') and datetime.fromisoformat(e['date']) >= two_y), None)
    ifr_current = False
    in_grace = True
    if last_ipc:
        ipc_date = datetime.fromisoformat(last_ipc['date'])
        in_grace = now < ipc_date + timedelta(days=396)
        ifr_current = in_grace or (appr >= 6 and hrs >= 6)
    
    return jsonify({
        'fiveYear': {'current': five_year, 'lastFlight': last_flight['date'] if last_flight else None},
        'twoYear': {'current': len([e for e in events if datetime.fromisoformat(e['date']) >= two_y]) > 0},
        'passengerDay': {'current': day >= 5, 'count': min(day,5), 'required': 5},
        'passengerNight': {'current': night >= 5, 'count': min(night,5), 'required': 5},
        'ifr': {'current': ifr_current, 'approaches': appr, 'hours': round(hrs,1), 'approachesRequired': 6, 'hoursRequired': 6, 'inGracePeriod': in_grace, 'lastTest': last_ipc['date'] if last_ipc else None}
    })

if __name__ == '__main__':
    os.makedirs('data', exist_ok=True)
    app.run(debug=True, port=5000)
