import { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, Plane, Upload, PlusCircle, Settings, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { AuthProvider, useAuth, getAuthHeaders } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import Logbook from './components/Logbook';
import AddFlight from './components/AddFlight';
import Reports from './components/Reports';
import Aircraft from './components/Aircraft';
import CSVImporter from './components/CSVImporter';
import SettingsPage from './components/Settings';
import Admin from './components/Admin';
import { Flight, Aircraft as AircraftType, CurrencyEvent, AppSettings, FlightTemplate } from './types';
import { defaultSettings } from './utils/defaultSettings';

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [dark, setDark] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [aircraft, setAircraft] = useState<AircraftType[]>([]);
  const [events, setEvents] = useState<CurrencyEvent[]>([]);
  const [showImporter, setShowImporter] = useState(false);
  const [showAddFlight, setShowAddFlight] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Partial<Flight> | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [templates, setTemplates] = useState<FlightTemplate[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      // Load sample data when not authenticated
      setFlights(sampleFlights);
      setAircraft(sampleAircraft);
      setEvents(sampleEvents);
      setTemplates([]);
      return;
    }

    try {
      const headers = getAuthHeaders();
      const [f, a, e, t] = await Promise.all([
        fetch('/api/flights', { headers }).then(r => r.json()),
        fetch('/api/aircraft', { headers }).then(r => r.json()),
        fetch('/api/events', { headers }).then(r => r.json()).catch(() => []),
        fetch('/api/templates', { headers }).then(r => r.json()).catch(() => []),
      ]);
      // API returns { flights, total, page, per_page } for paginated response
      setFlights(Array.isArray(f) ? f : (f.flights ?? []));
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
  }, [isAuthenticated]);

  // Save settings to backend when authenticated
  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
    if (isAuthenticated) {
      fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      }).catch(() => { /* ignore */ });
    }
  }, [settings, isAuthenticated]);

  // Load settings from backend on mount (with localStorage fallback)
  useEffect(() => {
    const savedLocal = localStorage.getItem('settings');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed.regulation) setSettings(parsed);
      } catch { /* ignore invalid localStorage data */ }
    }
    if (isAuthenticated) {
      fetch('/api/settings', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(data => {
          if (data && data.regulation) {
            setSettings(data);
          }
        })
        .catch(() => { /* ignore */ });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  // Load data when auth state changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Ctrl/Cmd + N → open Add Flight modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (isAuthenticated) {
          setShowAddFlight(true);
        } else {
          setShowAuthModal(true);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isAuthenticated]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'logbook', label: 'Logbook' },
    { id: 'reports', label: 'Reports' },
    { id: 'aircraft', label: 'Aircraft' },
    { id: 'settings', label: 'Settings' },
    ...(user?.is_admin ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
  ];

  // Show loading or auth modal
  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl btn-primary grid place-items-center shadow-lg mx-auto mb-6">
              <Plane className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">DirectLog</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Your personal pilot logbook. Track flights, manage currency, and stay ready to fly.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-8 py-3 btn-primary text-white rounded-xl font-medium shadow-lg"
            >
              Get Started
            </button>
            <p className="mt-4 text-sm text-slate-500">
              Already have an account?{' '}
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-blue-500 hover:text-blue-400"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="register" />
      </>
    );
  }

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
                <div className="text-sm font-medium">{user?.name || 'Pilot'}</div>
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

              {/* User menu */}
              <div className="relative group">
                <button className="p-2.5 rounded-xl glass hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <UserIcon className="w-5 h-5" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 py-2 glass rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-4 py-2 border-b border-white/10">
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-xs text-slate-500">{user?.email}</div>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/10 transition-colors text-red-500"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
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
          {tab === 'logbook' && (
            <Logbook
              flights={flights}
              settings={settings}
              onCopyFlight={(f) => { setEditingFlight(f); setShowAddFlight(true); }}
              onEditFlight={(f) => { setEditingFlight(f); setShowAddFlight(true); }}
              onDeleteFlight={async (id) => {
                try {
                  await fetch(`/api/flights/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
                  loadData();
                } catch (e) {
                  console.warn('Delete flight failed', e);
                }
              }}
            />
          )}
          {tab === 'reports' && <Reports flights={flights} />}
          {tab === 'aircraft' && (
            <Aircraft
              aircraft={aircraft}
              onEdit={(ac) => {
                const reg = ac.reg || prompt('Enter aircraft registration (e.g., C-GABC):');
                if (!reg) return;
                const updated = { ...ac, reg };
                fetch('/api/aircraft', {
                  method: ac.reg ? 'PUT' : 'POST',
                  headers: getAuthHeaders(),
                  body: JSON.stringify(updated),
                }).then(() => loadData()).catch(e => console.warn('Aircraft save failed', e));
              }}
              onDelete={async (reg) => {
                try {
                  await fetch(`/api/aircraft/${reg}`, { method: 'DELETE', headers: getAuthHeaders() });
                  loadData();
                } catch (e) {
                  console.warn('Delete aircraft failed', e);
                }
              }}
              onToggleHidden={async (reg, hidden) => {
                const ac = aircraft.find(a => a.reg === reg);
                if (!ac) return;
                try {
                  await fetch(`/api/aircraft/${reg}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ ...ac, hidden }),
                  });
                  loadData();
                } catch (e) {
                  console.warn('Toggle hidden failed', e);
                }
              }}
            />
          )}
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
                      headers: getAuthHeaders(),
                      body: JSON.stringify(t)
                    });
                  } else {
                    await fetch('/api/templates', {
                      method: 'POST',
                      headers: getAuthHeaders(),
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
                  await fetch(`/api/templates/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
                  loadData();
                } catch (e) {
                  console.warn('Template delete failed', e);
                }
              }}
            />
          )}
          {tab === 'admin' && user?.is_admin && (
            <Admin />
          )}
        </div>
      </main>

      {/* Modals */}
      {showAddFlight && <AddFlight aircraft={aircraft.filter(a => !a.hidden)} settings={settings} templates={templates} initialFlight={editingFlight} onSave={() => { loadData(); setEditingFlight(null); }} onClose={() => { setShowAddFlight(false); setEditingFlight(null); }} />}
      {showImporter && <CSVImporter onClose={() => setShowImporter(false)} onImport={loadData} />}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="login" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// ---- Sample / fallback data ----
const sampleFlights: Flight[] = [
  { id: 1, date: '2026-03-28', aircraft: 'C-GABC', type: 'Cessna 172S', from: 'CYMM', to: 'CYEG', air_time: 1.4, pic: 1.4, ldg_day: 1, ldg_night: 0, approaches: [], remarks: 'Cross-country' },
  { id: 2, date: '2026-03-15', aircraft: 'C-GDEF', type: 'Piper Archer II', from: 'CYEG', to: 'CYEG', air_time: 2.1, pic: 2.1, ldg_day: 2, ldg_night: 0, approaches: [{ type: 'RNAV', airport: 'CYQF', runway: '17', actual: false }, { type: 'ILS', airport: 'CYEG', runway: '16', actual: false }], remarks: 'IFR practice' },
  { id: 3, date: '2026-02-20', aircraft: 'C-GABC', type: 'Cessna 172S', from: 'CYMM', to: 'CYMM', air_time: 1.0, pic: 1.0, night: 1.0, ldg_day: 0, ldg_night: 3, approaches: [], remarks: 'Night circuits' },
  { id: 4, date: '2026-01-10', aircraft: 'C-GABC', type: 'Cessna 172S', from: 'CYMM', to: 'CYLL', air_time: 1.3, pic: 1.3, ldg_day: 1, ldg_night: 0, approaches: [], remarks: '' },
  { id: 5, date: '2025-12-05', aircraft: 'C-GHJK', type: 'Cessna 182T', from: 'CYBW', to: 'CYEG', air_time: 0.7, pic: 0.7, ldg_day: 1, ldg_night: 0, approaches: [], remarks: '' },
];

const sampleAircraft: AircraftType[] = [
  { reg: 'C-GABC', type: 'Cessna 172S', class: 'SEL', category: 'Aeroplane', hp: 180, equip: 'G1000', home: 'CYMM', total_time: 342.7, last_flown: '2026-03-28', notes: 'Club aircraft' },
  { reg: 'C-GDEF', type: 'Piper Archer II', class: 'SEL', category: 'Aeroplane', hp: 180, equip: 'GTN650', home: 'CYEG', total_time: 298.4, last_flown: '2026-03-15' },
  { reg: 'C-FABC', type: 'Beech Duchess BE76', class: 'MEL', category: 'Aeroplane', hp: 360, complex: true, equip: 'GNS430', home: 'CYEG', total_time: 215.2, last_flown: '2026-02-10', notes: 'Multi training' },
  { reg: 'C-GHJK', type: 'Cessna 182T', class: 'SEL', category: 'Aeroplane', hp: 230, equip: 'G1000', home: 'CYMM', total_time: 89.1, last_flown: '2025-12-05' },
];

const sampleEvents: CurrencyEvent[] = [
  { id: 1, date: '2024-03-15', type: 'flight_review', description: 'Biennial Flight Review — CAR 401.05(2)(a)', instructor: 'J. Smith', expiry: '2026-03-15' },
  { id: 2, date: '2024-03-15', type: 'ipc', description: 'Instrument Proficiency Check — CAR 401.05(3)', instructor: 'J. Smith', expiry: '2026-03-15' },
];
