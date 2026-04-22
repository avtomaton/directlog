import { useState, useMemo, useEffect } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Printer, Copy, Pencil, Trash2 } from 'lucide-react';
import { Flight } from '../types';
import { AppSettings } from '../types';

const PER_PAGE = 20;

function formatTime(hours: number, decimals: number, unit: 'hours' | 'minutes'): string {
    if (!hours || hours === 0) return '—';
    if (unit === 'minutes') return Math.round(hours * 60).toString();
    return hours.toFixed(decimals);
}

export default function Logbook({ flights, settings, onCopyFlight, onEditFlight, onDeleteFlight }: {
    flights: Flight[];
    settings?: AppSettings;
    onCopyFlight?: (f: Flight) => void;
    onEditFlight?: (f: Flight) => void;
    onDeleteFlight?: (id: number) => void;
}) {
  const decimals = settings?.totalTimeDecimals ?? 1;
  const unit = settings?.totalTimeUnit ?? 'hours';
  const [q,    setQ]    = useState('');
  const [ac,   setAc]   = useState('all');
  const [page, setPage] = useState(1);

  // Derive aircraft list dynamically from actual data
  const aircraftOptions = useMemo(
    () => Array.from(new Set(flights.map(f => f.aircraft))).sort(),
    [flights]
  );

  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    return flights.filter(f => {
      const matchQ = !query
        || f.aircraft.toLowerCase().includes(query)
        || f.from.toLowerCase().includes(query)
        || f.to.toLowerCase().includes(query)
        || (f.remarks ?? '').toLowerCase().includes(query);
      const matchAc = ac === 'all' || f.aircraft === ac;
      return matchQ && matchAc;
    });
  }, [flights, q, ac]);

  // Reset page when filters change
  const handleFilterChange = (fn: () => void) => { fn(); setPage(1); };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const [allRows, setAllRows] = useState(false);

  useEffect(() => {
    const handler = () => setAllRows(true);
    window.addEventListener('beforeprint', handler);
    return () => {
      window.removeEventListener('beforeprint', handler);
      setAllRows(false);
    };
  }, []);

  const displayRows = allRows ? filtered : filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalHours = flights.reduce((s, f) => s + f.air_time, 0);
  const totalPIC   = flights.reduce((s, f) => s + f.pic,      0);

  const fmt = (n?: number) => formatTime(n ?? 0, decimals, unit);

  const exportCSV = () => {
    const headers = ['Date', 'Aircraft', 'Type', 'From', 'To', 'Air Time', 'PIC', 'Night', 'Actual IMC', 'Simulated', 'Day Ldg', 'Night Ldg', 'Approaches', 'Remarks'];
    const rows = filtered.map(f => [
      f.date, f.aircraft, f.type, f.from, f.to,
      f.air_time.toFixed(decimals),
      f.pic.toFixed(decimals),
      f.night ?? 0,
      f.actual_imc ?? 0,
      f.simulated ?? 0,
      f.ldg_day,
      f.ldg_night,
      f.approaches?.length ?? 0,
      `"${(f.remarks ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logbook_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printLogbook = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Logbook</h1>
          <p className="text-slate-400 text-sm">
            {filtered.length} flights · {totalHours.toFixed(1)} hrs total · {totalPIC.toFixed(1)} hrs PIC
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={q}
              onChange={e => handleFilterChange(() => setQ(e.target.value))}
              placeholder="Search flights..."
              className="pl-9 pr-3 py-2 w-48 rounded-xl glass border border-white/10 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={ac}
            onChange={e => handleFilterChange(() => setAc(e.target.value))}
            className="px-3 py-2 rounded-xl glass border border-white/10 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All Aircraft</option>
            {aircraftOptions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={exportCSV}
            className="p-2 rounded-xl glass border border-white/10 hover:bg-white/10"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={printLogbook}
            className="p-2 rounded-xl glass border border-white/10 hover:bg-white/10"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                 {['Date','Aircraft','Route','Air','PIC','Night','IMC','Sim','Ldg D','Ldg N','Appr','Remarks',''].map(h => (
                  <th key={h} className={`px-3 py-3 font-medium ${['Air','PIC','Night','IMC','Sim','Ldg D','Ldg N'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {displayRows.map(f => (
                <tr key={f.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-3 py-3 font-mono text-xs text-slate-400">{f.date}</td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-primary">{f.aircraft}</span>
                    <span className="ml-1.5 text-xs text-slate-500">{f.type}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {f.from} <span className="text-slate-600 mx-1">→</span> {f.to}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">{formatTime(f.air_time, decimals, unit)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatTime(f.pic, decimals, unit)}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-400">{fmt(f.night)}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-400">{fmt(f.actual_imc)}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-400">{fmt(f.simulated)}</td>
                  <td className="px-3 py-3 text-center">{f.ldg_day || '—'}</td>
                  <td className="px-3 py-3 text-center">
                    {f.ldg_night ? <span className="text-accent font-medium">{f.ldg_night}</span> : '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {f.approaches?.length
                      ? <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px]">{f.approaches.length}</span>
                      : '—'}
                  </td>
                   <td className="px-3 py-3 text-xs text-slate-400 max-w-[130px] truncate">{f.remarks}</td>
                   <td className="px-3 py-3 text-center">
                       <div className="flex gap-1 items-center justify-center">
                           {onEditFlight && (
                               <button
                                   onClick={() => onEditFlight(f)}
                                   className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-primary transition-colors"
                                   title="Edit flight"
                               >
                                   <Pencil className="w-3.5 h-3.5" />
                               </button>
                           )}
                           {onDeleteFlight && (
                               <button
                                   onClick={() => {
                                       if (confirm(`Delete flight ${f.date} ${f.from}→${f.to}?`)) {
                                           onDeleteFlight(f.id);
                                       }
                                   }}
                                   className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors"
                                   title="Delete flight"
                               >
                                   <Trash2 className="w-3.5 h-3.5" />
                               </button>
                           )}
                           {onCopyFlight && (
                               <>
                                   <button
                                       onClick={() => onCopyFlight(f)}
                                       className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                                       title="Copy this flight"
                                   >
                                       <Copy className="w-3.5 h-3.5" />
                                   </button>
                                   <button
                                       onClick={() => {
                                           const reversed = {...f, from: f.to, to: f.from, route: ''};
                                           onCopyFlight(reversed);
                                       }}
                                       className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                                       title="Copy reversed flight"
                                   >
                                       ↔️
                                   </button>
                               </>
                           )}
                       </div>
                   </td>
                 </tr>
              ))}
              {displayRows.length === 0 && (
                <tr>
                   <td colSpan={13} className="px-3 py-10 text-center text-slate-500">
                    No flights match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-sm">
          <span className="text-slate-400 text-xs">
            {filtered.length > 0
              ? `Showing ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)} of ${filtered.length}`
              : 'No results'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg glass border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-xs text-slate-400 self-center">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg glass border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
