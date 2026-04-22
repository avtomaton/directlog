import sqlite3, os
os.makedirs('data', exist_ok=True)
conn = sqlite3.connect('data/logbook.db')
c = conn.cursor()
c.executescript('''
DROP TABLE IF EXISTS flights; DROP TABLE IF EXISTS approaches; DROP TABLE IF EXISTS aircraft; DROP TABLE IF EXISTS currency_events; DROP TABLE IF EXISTS settings;
CREATE TABLE flights (id INTEGER PRIMARY KEY, date TEXT, aircraft TEXT, type TEXT, from_ap TEXT, to_ap TEXT, air_time REAL, pic REAL, dual REAL DEFAULT 0, sic REAL DEFAULT 0, night REAL DEFAULT 0, actual_imc REAL DEFAULT 0, simulated REAL DEFAULT 0, xc REAL DEFAULT 0, xc_over_50nm REAL DEFAULT 0, right_seat REAL DEFAULT 0, multi_pilot REAL DEFAULT 0, pilot_flying REAL DEFAULT 0, holds INTEGER DEFAULT 0, ifr BOOLEAN DEFAULT 0, vfr BOOLEAN DEFAULT 1, night_operation BOOLEAN DEFAULT 0, ems BOOLEAN DEFAULT 0, medevac BOOLEAN DEFAULT 0, search_and_rescue BOOLEAN DEFAULT 0, aerial_work BOOLEAN DEFAULT 0, training BOOLEAN DEFAULT 0, checkride BOOLEAN DEFAULT 0, flight_review BOOLEAN DEFAULT 0, ipc BOOLEAN DEFAULT 0, ppc BOOLEAN DEFAULT 0, multi_engine REAL DEFAULT 0, complex REAL DEFAULT 0, high_performance REAL DEFAULT 0, turbine REAL DEFAULT 0, jet REAL DEFAULT 0, ldg_day INTEGER DEFAULT 0, ldg_night INTEGER DEFAULT 0, remarks TEXT DEFAULT '', start_time TEXT, shutdown_time TEXT, takeoff_time TEXT, landing_time TEXT, route TEXT, pic_name TEXT, sic_name TEXT);
CREATE TABLE approaches (id INTEGER PRIMARY KEY, flight_id INTEGER, type TEXT, airport TEXT, runway TEXT, actual INTEGER);
CREATE TABLE aircraft (reg TEXT PRIMARY KEY, type TEXT, class TEXT, category TEXT, hp INTEGER, equip TEXT, home TEXT, total_time REAL, last_flown TEXT, notes TEXT, hidden INTEGER DEFAULT 0);
CREATE TABLE currency_events (id INTEGER PRIMARY KEY, date TEXT, type TEXT, description TEXT, instructor TEXT, expiry TEXT);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
''')
for ac in [('C-GABC','Cessna 172S','SEL','Aeroplane',180,'G1000','CYMM',342.7,'2026-03-28','Club'),('C-GDEF','Piper Archer','SEL','Aeroplane',180,'GTN650','CYEG',298.4,'2026-03-15',''),('C-FABC','Beech Duchess','MEL','Aeroplane',360,'GNS430','CYEG',215.2,'2026-02-10','Multi'),('C-GHJK','Cessna 182T','SEL','Aeroplane',230,'G1000','CYMM',89.1,'2025-12-20','')]:
    c.execute('INSERT INTO aircraft VALUES (?,?,?,?,?,?,?,?,?,?)', ac)
import random
from datetime import datetime, timedelta
base = datetime(2024,10,1)
for i in range(1,46):
    d = base + timedelta(days=random.randint(0,540))
    ac = random.choice(['C-GABC','C-GDEF','C-FABC','C-GHJK'])
    c.execute('INSERT INTO flights VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (i,d.strftime('%Y-%m-%d'),ac,'C172','CYMM','CYEG',round(random.uniform(0.8,2.5),1),round(random.uniform(0.8,2.5),1),round(random.uniform(0,1),1) if random.random()<0.2 else 0,round(random.uniform(0,0.8),1) if random.random()<0.3 else 0,round(random.uniform(0,1),1) if random.random()<0.3 else 0,random.randint(1,2),random.randint(0,1) if random.random()<0.2 else 0,''))
    if random.random()<0.3:
        for _ in range(random.randint(1,2)): c.execute('INSERT INTO approaches (flight_id,type,airport,runway,actual) VALUES (?,?,?,?,?)', (i,random.choice(['ILS','RNAV','VOR']),'CYEG',random.choice(['16','34']),random.randint(0,1)))
for e in [('2024-03-15','flight_review','CAR 401.05(2)(a)','J. Smith','2026-03-15'),('2024-03-15','ipc','CAR 401.05(3)','J. Smith','2026-03-15')]:
    c.execute('INSERT INTO currency_events (date,type,description,instructor,expiry) VALUES (?,?,?,?,?)', e)
conn.commit()
print('Seeded 45 flights')
