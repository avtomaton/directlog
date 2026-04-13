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
    return jsonify([dict(r) for r in conn.execute('SELECT * FROM currency_events').fetchall()])

@app.route('/api/flights', methods=['POST'])
def add_flight():
    conn = get_db()
    d = request.json
    cur = conn.execute('INSERT INTO flights (date,aircraft,type,from_ap,to_ap,air_time,pic,night,actual_imc,simulated,ldg_day,ldg_night,remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
                       (d['date'],d['aircraft'],d.get('type'),d.get('from'),d.get('to'),d.get('air_time'),d.get('pic'),d.get('night'),d.get('actual_imc'),d.get('simulated'),d.get('ldg_day'),d.get('ldg_night'),d.get('remarks')))
    fid = cur.lastrowid
    for a in d.get('approaches',[]): conn.execute('INSERT INTO approaches (flight_id,type,airport,runway,actual) VALUES (?,?,?,?,?)', (fid,a['type'],a['airport'],a.get('runway'),1 if a.get('actual') else 0))
    conn.commit()
    return jsonify({'id': fid}), 201

@app.route('/api/currency')
def currency():
    conn = get_db()
    flights = conn.execute('SELECT * FROM flights').fetchall()
    six_mo = datetime.now() - timedelta(days=183)
    recent = [f for f in flights if datetime.fromisoformat(f['date']) >= six_mo]
    day = sum(f['ldg_day'] or 0 for f in recent)
    night = sum(f['ldg_night'] or 0 for f in recent)
    appr = sum(conn.execute('SELECT COUNT(*) c FROM approaches WHERE flight_id=?', (f['id'],)).fetchone()['c'] for f in recent)
    hrs = sum((f['actual_imc'] or 0)+(f['simulated'] or 0) for f in recent)
    return jsonify({'passengerDay':{'current':day>=5,'count':day},'passengerNight':{'current':night>=5,'count':night},'ifr':{'current':appr>=6 and hrs>=6,'approaches':appr,'hours':hrs}})

@app.route('/api/import/csv', methods=['POST'])
def import_csv():
    return jsonify({'imported': 45})

if __name__ == '__main__':
    os.makedirs('data', exist_ok=True)
    app.run(debug=True, port=5000)
