import { useState, useEffect } from 'react';
import { Moon, Sun, Plane, Upload, Shield } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Logbook from './components/Logbook';
import AddFlight from './components/AddFlight';
import Reports from './components/Reports';
import Aircraft from './components/Aircraft';
import CSVImporter from './components/CSVImporter';
import FlightReviewModal from './components/FlightReviewModal';
import { Flight, Aircraft as AircraftType, CurrencyEvent } from './types';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [dark, setDark] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [aircraft, setAircraft] = useState<AircraftType[]>([]);
  const [events, setEvents] = useState<CurrencyEvent[]>([]);
  const [showImporter, setShowImporter] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [f, a, e] = await Promise.all([
        fetch('/api/flights').then(r => r.json()),
        fetch('/api/aircraft').then(r => r.json()),
        fetch('/api/events').then(r => r.json()).catch(() => [])
      ]);
      setFlights(f); setAircraft(a); setEvents(e);
    } catch {
      setFlights(sampleFlights); setAircraft(sampleAircraft); setEvents(sampleEvents);
    }
  };

  const toggleDark = () => {
    const newDark = !dark;
    setDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'logbook', label: 'Logbook' },
    { id: 'add', label: 'Add Flight' },
    { id: 'reports', label: 'Reports' },
    { id: 'aircraft', label: 'Aircraft' },
  ];

  return (
    <div className="min-h-screen gradient-bg transition-colors duration-300">
      <header className="sticky top-0 z-40 glass border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl btn-primary grid place-items-center shadow-lg">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight">SkyLog Pro</span>
                <div className="text-[10px] text-primary dark:text-accent font-medium -mt-1">CARs 401.05 VERIFIED</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => setShowReviewModal(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-slate-100 dark:hover:bg-white/10 text-xs sm:text-sm transition-colors">
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Log Review</span>
              </button>
              <button onClick={() => setShowImporter(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-slate-100 dark:hover:bg-white/10 text-xs sm:text-sm transition-colors">
                <Upload className="w-4 h-4" />
                <span className="hidden md:inline">Import</span>
              </button>
              <div className="hidden sm:block text-right mr-1">
                <div className="text-sm font-medium">Viktor Pogrebniak</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">1,247.3 hrs â¢ CYMM</div>
              </div>
              <button onClick={toggleDark} className="p-2.5 rounded-xl glass hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" title={dark ? 'Light mode' : 'Dark mode'}>
                {dark ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
            </div>
          </div>
          
          <nav className="flex gap-1 sm:gap-6 border-t border-slate-200 dark:border-white/5 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`relative whitespace-nowrap py-3 text-sm font-medium transition-colors ${tab === t.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                {t.label}
                {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-primary rounded-full" />}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="animate-fade-in">
          {tab === 'dashboard' && <Dashboard flights={flights} events={events} onLogReview={() => setShowReviewModal(true)} />}
          {tab === 'logbook' && <Logbook flights={flights} />}
          {tab === 'add' && <AddFlight aircraft={aircraft} onSave={loadData} />}
          {tab === 'reports' && <Reports flights={flights} />}
          {tab === 'aircraft' && <Aircraft aircraft={aircraft} />}
        </div>
      </main>

      {showImporter && <CSVImporter onClose={() => setShowImporter(false)} onImport={loadData} />}
      {showReviewModal && <FlightReviewModal onClose={() => setShowReviewModal(false)} onSave={loadData} />}
    </div>
  );
}

const sampleFlights: Flight[] = [
  { id: 1, date: '2026-03-28', aircraft: 'C-GABC', type: 'C172', from: 'CYMM', to: 'CYEG', air_time: 1.4, pic: 1.4, ldg_day: 1, ldg_night: 0, approaches: [], remarks: 'X-country' },
  { id: 2, date: '2026-03-15', aircraft: 'C-GDEF', type: 'PA28', from: 'CYEG', to: 'CYEG', air_time: 2.1, pic: 2.1, ldg_day: 2, ldg_night: 0, approaches: [{ type: 'RNAV', airport: 'CYQF', runway: '17', actual: false }, { type: 'ILS', airport: 'CYEG', runway: '16', actual: false }], remarks: 'IFR practice' },
  { id: 3, date: '2026-02-20', aircraft: 'C-GABC', type: 'C172', from: 'CYMM', to: 'CYMM', air_time: 1.0, pic: 1.0, night: 1.0, ldg_day: 0, ldg_night: 3, approaches: [], remarks: 'Night circuits' },
];

const sampleAircraft: AircraftType[] = [
  { reg: 'C-GABC', type: 'Cessna 172S', class: 'SEL', category: 'Aeroplane', hp: 180, equip: 'G1000', home: 'CYMM', total_time: 342.7, last_flown: '2026-03-28', notes: 'Club aircraft' },
  { reg: 'C-GDEF', type: 'Piper Archer II', class: 'SEL', category: 'Aeroplane', hp: 180, equip: 'GTN650', home: 'CYEG', total_time: 298.4, last_flown: '2026-03-15' },
  { reg: 'C-FABC', type: 'Beech Duchess BE76', class: 'MEL', category: 'Aeroplane', hp: 360, complex: true, equip: 'GNS430', home: 'CYEG', total_time: 215.2, last_flown: '2026-02-10', notes: 'Multi training' },
  { reg: 'C-GHJK', type: 'Cessna 182T', class: 'SEL', category: 'Aeroplane', hp: 230, equip: 'G1000', home: 'CYMM', total_time: 89.1, last_flown: '2025-12-20' },
];

const sampleEvents: CurrencyEvent[] = [
  { id: 1, date: '2024-03-15', type: 'flight_review', description: 'Biennial Flight Review - CAR 401.05(2)(a)', instructor: 'J. Smith', expiry: '2026-03-15' },
  { id: 2, date: '2024-03-15', type: 'ipc', description: 'Instrument Proficiency Check - CAR 401.05(3)', instructor: 'J. Smith', expiry: '2026-03-15' },
  { id: 3, date: '2021-06-10', type: 'flight_review', description: 'Previous Flight Review', instructor: 'M. Johnson', expiry: '2023-06-10' },
];
