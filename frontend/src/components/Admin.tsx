import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plane, Clock, TrendingUp, Activity, Shield, Trash2,
  Search, ChevronLeft, ChevronRight, AlertTriangle, UserCheck,
  BarChart3, Calendar
} from 'lucide-react';
import { getAuthHeaders } from '../contexts/AuthContext';

interface AdminStats {
  total_users: number;
  total_flights: number;
  total_aircraft: number;
  total_events: number;
  total_hours: number;
  new_users_30d: number;
  flights_30d: number;
  hours_30d: number;
  active_users_30d: number;
  avg_flights_per_user: number;
  top_users: TopUser[];
  regulation_counts: Record<string, number>;
}

interface TopUser {
  id: number;
  name: string;
  email: string;
  flight_count: number;
  total_hours: number;
}

interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  is_admin: boolean;
  created_at: string | null;
  flight_count: number;
  total_hours: number;
  aircraft_count: number;
}

interface AdminFlight {
  id: number;
  user_id: number;
  user_email: string;
  date: string | null;
  aircraft_reg: string | null;
  air_time: number;
  pic: number;
  night: number;
  ldg_day: number;
  ldg_night: number;
  route: string | null;
  remarks: string | null;
}

type Tab = 'overview' | 'users' | 'flights';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [flights, setFlights] = useState<AdminFlight[]>([]);
  const [flightsTotal, setFlightsTotal] = useState(0);
  const [flightsPage, setFlightsPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const perPage = 25;

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
    } catch (_err) {
      setError('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (page: number, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/users?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users);
      setUsersTotal(data.total);
      setUsersPage(page);
    } catch (_err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFlights = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      const res = await fetch(`/api/admin/flights?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load flights');
      const data = await res.json();
      setFlights(data.flights);
      setFlightsTotal(data.total);
      setFlightsPage(page);
    } catch (_err) {
      setError('Failed to load flights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab === 'users') loadUsers(1, userSearch);
    if (tab === 'flights') loadFlights(1);
  }, [tab, loadUsers, loadFlights, userSearch])

  const handleToggleAdmin = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to toggle admin');
        return;
      }
      loadUsers(usersPage, userSearch);
    } catch {
      alert('Failed to toggle admin status');
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!confirm(`Delete user ${email} and all their data? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
        return;
      }
      loadUsers(usersPage, userSearch);
      loadStats();
    } catch {
      alert('Failed to delete user');
    }
  };

  const handleSearch = () => {
    setUsersPage(1);
    loadUsers(1, userSearch);
  };

  const totalPages = (total: number) => Math.max(1, Math.ceil(total / perPage));

  const statCard = (label: string, value: string | number, icon: React.ReactNode, color: string, subtitle?: string) => (
    <div className="glass rounded-2xl p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );

  if (error && !stats) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <p className="text-lg font-medium">{error}</p>
        <button onClick={() => { setError(''); loadStats(); }} className="mt-4 px-4 py-2 rounded-xl btn-primary text-white">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-sm text-slate-400">Platform management and analytics</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'overview' as Tab, label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
          { key: 'users' as Tab, label: 'Users', icon: <Users className="w-4 h-4" /> },
          { key: 'flights' as Tab, label: 'All Flights', icon: <Plane className="w-4 h-4" /> },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading && !stats && tab === 'overview' && (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      )}

      {/* Overview Tab */}
      {tab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCard('Total Users', stats.total_users, <Users className="w-5 h-5 text-blue-400" />, 'bg-blue-500/20', `${stats.new_users_30d} new in 30d`)}
            {statCard('Total Flights', stats.total_flights, <Plane className="w-5 h-5 text-emerald-400" />, 'bg-emerald-500/20', `${stats.flights_30d} in last 30d`)}
            {statCard('Total Hours', stats.total_hours, <Clock className="w-5 h-5 text-amber-400" />, 'bg-amber-500/20', `${stats.hours_30d}h in last 30d`)}
            {statCard('Active Users', stats.active_users_30d, <Activity className="w-5 h-5 text-purple-400" />, 'bg-purple-500/20', `${stats.avg_flights_per_user} avg flights/user`)}
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCard('Aircraft Registered', stats.total_aircraft, <Plane className="w-5 h-5 text-cyan-400" />, 'bg-cyan-500/20')}
            {statCard('Currency Events', stats.total_events, <Calendar className="w-5 h-5 text-pink-400" />, 'bg-pink-500/20')}
            {statCard('Avg Flights/User', stats.avg_flights_per_user, <TrendingUp className="w-5 h-5 text-orange-400" />, 'bg-orange-500/20')}
          </div>

          {/* Regulation Distribution & Top Users */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Regulation Distribution */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Regulation Distribution</h3>
              <div className="space-y-3">
                {Object.entries(stats.regulation_counts).map(([reg, count]) => {
                  const pct = stats.total_users > 0 ? Math.round((count / stats.total_users) * 100) : 0;
                  return (
                    <div key={reg}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{reg}</span>
                        <span className="text-slate-400">{count} users ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(stats.regulation_counts).length === 0 && (
                  <p className="text-sm text-slate-500">No data yet</p>
                )}
              </div>
            </div>

            {/* Top Users */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Top Users by Flights</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="text-left py-2 font-medium">#</th>
                      <th className="text-left py-2 font-medium">User</th>
                      <th className="text-right py-2 font-medium">Flights</th>
                      <th className="text-right py-2 font-medium">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_users.map((u, i) => (
                      <tr key={u.id} className="border-b border-white/5">
                        <td className="py-2 text-slate-500">{i + 1}</td>
                        <td className="py-2">
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </td>
                        <td className="py-2 text-right">{u.flight_count}</td>
                        <td className="py-2 text-right">{u.total_hours}h</td>
                      </tr>
                    ))}
                    {stats.top_users.length === 0 && (
                      <tr><td colSpan={4} className="py-4 text-center text-slate-500">No flight data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <button onClick={handleSearch} className="px-4 py-2.5 rounded-xl btn-primary text-white text-sm font-medium">
              Search
            </button>
          </div>

          {/* Users Table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Flights</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Aircraft</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.name || '—'}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">{u.flight_count}</td>
                      <td className="px-4 py-3">{u.total_hours}h</td>
                      <td className="px-4 py-3">{u.aircraft_count}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {u.is_admin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">User</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleAdmin(u.id)}
                            title={u.is_admin ? 'Remove admin' : 'Make admin'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.is_admin
                                ? 'hover:bg-red-500/20 text-red-400'
                                : 'hover:bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            title="Delete user"
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        {userSearch ? 'No users match your search' : 'No users found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {usersTotal > perPage && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                <span className="text-xs text-slate-400">
                  Showing {(usersPage - 1) * perPage + 1}–{Math.min(usersPage * perPage, usersTotal)} of {usersTotal}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadUsers(usersPage - 1, userSearch)}
                    disabled={usersPage <= 1}
                    className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-xs text-slate-400">
                    {usersPage} / {totalPages(usersTotal)}
                  </span>
                  <button
                    onClick={() => loadUsers(usersPage + 1, userSearch)}
                    disabled={usersPage >= totalPages(usersTotal)}
                    className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flights Tab */}
      {tab === 'flights' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Aircraft</th>
                  <th className="px-4 py-3">Air Time</th>
                  <th className="px-4 py-3">PIC</th>
                  <th className="px-4 py-3">Night</th>
                  <th className="px-4 py-3">Landings</th>
                  <th className="px-4 py-3">Route</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {flights.map(f => (
                  <tr key={f.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">{f.date || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-400">{f.user_email}</div>
                    </td>
                    <td className="px-4 py-3">{f.aircraft_reg || '—'}</td>
                    <td className="px-4 py-3">{f.air_time}h</td>
                    <td className="px-4 py-3">{f.pic}h</td>
                    <td className="px-4 py-3">{f.night}h</td>
                    <td className="px-4 py-3">{f.ldg_day}D / {f.ldg_night}N</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{f.route || f.remarks || '—'}</td>
                  </tr>
                ))}
                {flights.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">No flights found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {flightsTotal > perPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <span className="text-xs text-slate-400">
                Showing {(flightsPage - 1) * perPage + 1}–{Math.min(flightsPage * perPage, flightsTotal)} of {flightsTotal}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadFlights(flightsPage - 1)}
                  disabled={flightsPage <= 1}
                  className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-xs text-slate-400">
                  {flightsPage} / {totalPages(flightsTotal)}
                </span>
                <button
                  onClick={() => loadFlights(flightsPage + 1)}
                  disabled={flightsPage >= totalPages(flightsTotal)}
                  className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
