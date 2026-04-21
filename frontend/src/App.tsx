import { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, Plane, Upload, PlusCircle, Settings } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Logbook from './components/Logbook';
import AddFlight from './components/AddFlight';
import Reports from './components/Reports';
import Aircraft from './components/Aircraft';
import CSVImporter from './components/CSVImporter';
import SettingsPage from './components/Settings';
import { Flight, Aircraft as AircraftType, CurrencyEvent, AppSettings } from './types';

const defaultSettings: AppSettings = {
  regulation: 'CARs',
  homeBase: '',
  nightDefinition: 'sunset_30',
  nightStartTime: 'sunset+30',
  nightEndTime: 'sunrise-30',
  nightLandingStart: 'sunset+60',
  nightLandingEnd: 'sunrise-60',
  totalTimeDecimals: 1,
  totalTimeUnit: 'hours',
  defaultTemplateId: null,
  ifrDeductionMinutes: 12,
};

export default function App() {
  const [tab,            setTab]            = useState('dashboard');
  const [dark,           setDark]           = useState(false);
  const [flights,        setFlights]        = useState<Flight[]>([]);
  const [aircraft,       setAircraft]       = useState<AircraftType[]>([]);
  const [events,         setEvents]         = useState<CurrencyEvent[]>([]);
  const [showImporter,   setShowImporter]   = useState(false);
  const [showAddFlight,  setShowAddFlight]  = useState(false);
  const [editingFlight,  setEditingFlight]  = useState<any>(null);
  const [settings,       setSettings]       = useState<AppSettings>(defaultSettings);

  const [templates, setTemplates] = useState<any[]>([]);
  
  const loadData = useCallback(async () => {
    try {
      const [f, a, e, t] = await Promise.all([
        fetch('/api/flights').then(r => r.json()),
        fetch('/api/aircraft').then(r => r.json()),
        fetch('/api/events').then(r => r.json()).catch(() => []),
        fetch('/api/templates').then(r => r.json()).catch(() => []),
      ]);
      setFlights(f);
      setAircraft(a);
      setEvents(e);
      setTemplates(t);
    } catch {
      console.log('API unavailable — using sample data');
      setFlights(sampleFlights);
      setAircraft(sampleAircraft);
      setEvents(sampleEvents);
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
    // Also persist to backend
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).catch(() => { /* ignore */ });
  }, [settings]);

  // Load settings from backend on mount (with localStorage fallback)
  useEffect(() => {
    const savedLocal = localStorage.getItem('settings');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed.regulation) setSettings(parsed);
      } catch {}
    }
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data && data.regulation) {
          setSettings(data);
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  useEffect(() => {
    const saved  = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    loadData();
  }, [loadData]);

  // Ctrl/Cmd + N → open Add Flight modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowAddFlight(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'logbook',   label: 'Logbook'   },
    { id: 'reports',   label: 'Reports'   },
    { id: 'aircraft',  label: 'Aircraft'  },
    { id: 'settings',  label: 'Settings'  },
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
                <span className="text-xl font-bold tracking-tight">DirectLog</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Add Flight button — primary CTA */}
              <button
                onClick={() => setShowAddFlight(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl btn-primary text-white text-xs sm:text-sm font-medium shadow-md"
                title="Add Flight (Ctrl+N)"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Add Flight</span>
              </button>

              <button
                onClick={() => setShowImporter(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-slate-100 dark:hover:bg-white/10 text-xs sm:text-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden md:inline">Import</span>
              </button>

              <button
                onClick={() => setTab('settings')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-slate-100 dark:hover:bg-white/10 text-xs sm:text-sm transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              <div className="hidden sm:block text-right mr-1">
                <div className="text-sm font-medium">Pilot</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {flights.reduce((s, f) => s + f.air_time, 0).toFixed(1)} hrs · {settings.homeBase || '—'}
                </div>
              </div>

              <button
                onClick={toggleDark}
                className="p-2.5 rounded-xl glass hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                title={dark ? 'Light mode' : 'Dark mode'}
              >
                {dark ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
            </div>
          </div>

          <nav className="flex gap-1 sm:gap-6 border-t border-slate-200 dark:border-white/5 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative whitespace-nowrap py-3 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="animate-fade-in">
          {tab === 'dashboard' && (
            <Dashboard
              flights={flights}
              events={events}
              settings={settings}
            />
          )}
           {tab === 'logbook'  && <Logbook  flights={flights} settings={settings} onCopyFlight={(f) => { setEditingFlight(f); setShowAddFlight(true); }} />}
          {tab === 'reports'  && <Reports  flights={flights} />}
          {tab === 'aircraft' && <Aircraft aircraft={aircraft} />}
           {tab === 'settings' && (
             <SettingsPage 
               settings={settings} 
               templates={templates}
               onSave={setSettings}
               onSaveTemplate={async (t) => {
                 try {
                   if (t.id) {
                     await fetch(`/api/templates/${t.id}`, {
                       method: 'PUT',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify(t)
                     });
                   } else {
                     await fetch('/api/templates', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify(t)
                     });
                   }
                   loadData();
                 } catch (e) {
                   console.warn('Template save failed', e);
                 }
               }}
               onDeleteTemplate={async (id) => {
                 try {
                   await fetch(`/api/templates/${id}`, { method: 'DELETE' });
                   loadData();
                 } catch (e) {
                   console.warn('Template delete failed', e);
                 }
               }}
             />
           )}
        </div>
      </main>

      {/* Modals */}
      {showAddFlight  && <AddFlight aircraft={aircraft} settings={settings} templates={templates} initialFlight={editingFlight} onSave={() => { loadData(); setEditingFlight(null); }} onClose={() => { setShowAddFlight(false); setEditingFlight(null); }} />}
      {showImporter   && <CSVImporter onClose={() => setShowImporter(false)} onImport={loadData} />}
    </div>
  );
}

// ---- Sample / fallback data ----
const sampleFlights: Flight[] = [
  { id: 1, date: '2026-03-28', aircraft: 'C-GABC', type: 'Cessna 172S',    from: 'CYMM', to: 'CYEG', air_time: 1.4, pic: 1.4, ldg_day: 1, ldg_night: 0, approaches: [], remarks: 'Cross-country' },
  { id: 2, date: '2026-03-15', aircraft: 'C-GDEF', type: 'Piper Archer II', from: 'CYEG', to: 'CYEG', air_time: 2.1, pic: 2.1, ldg_day: 2, ldg_night: 0, approaches: [{ type: 'RNAV', airport: 'CYQF', runway: '17', actual: false }, { type: 'ILS', airport: 'CYEG', runway: '16', actual: false }], remarks: 'IFR practice' },
  { id: 3, date: '2026-02-20', aircraft: 'C-GABC', type: 'Cessna 172S',    from: 'CYMM', to: 'CYMM', air_time: 1.0, pic: 1.0, night: 1.0, ldg_day: 0, ldg_night: 3, approaches: [], remarks: 'Night circuits' },
  { id: 4, date: '2026-01-10', aircraft: 'C-GABC', type: 'Cessna 172S',    from: 'CYMM', to: 'CYLL', air_time: 1.3, pic: 1.3, ldg_day: 1, ldg_night: 0, approaches: [], remarks: '' },
  { id: 5, date: '2025-12-05', aircraft: 'C-GHJK', type: 'Cessna 182T',    from: 'CYBW', to: 'CYEG', air_time: 0.7, pic: 0.7, ldg_day: 1, ldg_night: 0, approaches: [], remarks: '' },
];

const sampleAircraft: AircraftType[] = [
  { reg: 'C-GABC', type: 'Cessna 172S',    class: 'SEL', category: 'Aeroplane', hp: 180, equip: 'G1000',  home: 'CYMM', total_time: 342.7, last_flown: '2026-03-28', notes: 'Club aircraft' },
  { reg: 'C-GDEF', type: 'Piper Archer II', class: 'SEL', category: 'Aeroplane', hp: 180, equip: 'GTN650', home: 'CYEG', total_time: 298.4, last_flown: '2026-03-15' },
  { reg: 'C-FABC', type: 'Beech Duchess BE76', class: 'MEL', category: 'Aeroplane', hp: 360, complex: true, equip: 'GNS430', home: 'CYEG', total_time: 215.2, last_flown: '2026-02-10', notes: 'Multi training' },
  { reg: 'C-GHJK', type: 'Cessna 182T',    class: 'SEL', category: 'Aeroplane', hp: 230, equip: 'G1000',  home: 'CYMM', total_time: 89.1,  last_flown: '2025-12-05' },
];

const sampleEvents: CurrencyEvent[] = [
  { id: 1, date: '2024-03-15', type: 'flight_review', description: 'Biennial Flight Review — CAR 401.05(2)(a)', instructor: 'J. Smith', expiry: '2026-03-15' },
  { id: 2, date: '2024-03-15', type: 'ipc',           description: 'Instrument Proficiency Check — CAR 401.05(3)', instructor: 'J. Smith', expiry: '2026-03-15' },
];
