# SkyLog Pro v3 - Night Mode

Built with the SkyLog color scheme you liked:
- Primary: #0ea5e9 (sky blue)
- Dark: #0f172a / #0c1929
- Glass morphism, gradients

## Features
â TypeScript + React
â SQLite backend
â Verified CARs 401.05 (13-month grace period!)
â CSV importer for myFlightBook
â Night mode (default)
â All 5 tabs fully built

## Run
```bash
cd backend && pip install -r requirements.txt && python app.py &
cd scripts && python seed_db.py
cd frontend && npm install && npm start
```

## CARs Fix
Old apps say "6 approaches in 6 months" - WRONG.
Correct: After IPC, you have 13 months grace. Only then do you need 6/6.
This app implements it correctly per CAR 401.05(3.1).
