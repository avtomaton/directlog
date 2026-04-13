import { useState } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { Flight } from '../types';

export default function Logbook({ flights }: { flights: Flight[] }) {
  const [q, setQ] = useState('');
  const [ac, setAc] = useState('all');
  
  const filtered = flights.filter(f => {
    const matchQ = !q || f.aircraft.toLowerCase().includes(q.toLowerCase()) || f.from.toLowerCase().includes(q.toLowerCase()) || f.to.toLowerCase().includes(q.toLowerCase());
    const matchAc = ac === 'all' || f.aircraft === ac;
    return matchQ && matchAc;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Logbook</h1>
          <p className="text-slate-400">{filtered.length} flights ÃÂ¢ÃÂÃÂ¢ {flights.reduce((s,f)=>s+f.air_time,0).toFixed(1)} hours total</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search flights..." className="pl-9 pr-3 py-2.5 w-48 rounded-xl glass border border-white/10 text-sm focus:border-primary focus:outline-none" />
          </div>
          <select value={ac} onChange={e=>setAc(e.target.value)} className="px-3 py-2.5 rounded-xl glass border border-white/10 text-sm focus:border-primary focus:outline-none">
            <option value="all">All Aircraft</option>
            <option>C-GABC</option><option>C-GDEF</option><option>C-FABC</option><option>C-GHJK</option>
          </select>
          <button className="p-2.5 rounded-xl glass border border-white/10 hover:bg-white/10"><Download className="w-4 h-4" /></button>
        </div>
      </div>
      
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500">
                {['Date','Aircraft','Route','Air','PIC','Night','IMC','Sim','Day','Night','Appr','Remarks'].map(h=> <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {filtered.map(f => (
                <tr key={f.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{f.date}</td>
                  <td className="px-4 py-3"><span className="font-medium text-primary">{f.aircraft}</span><span className="ml-2 text-xs text-slate-500">{f.type}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{f.from} ÃÂ¢ÃÂÃÂ {f.to}</td>
                  <td className="px-4 py-3 text-right font-mono">{f.air_time.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-mono">{f.pic.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-mono">{f.night?.toFixed(1) || 'ÃÂ¢ÃÂÃÂ'}</td>
                  <td className="px-4 py-3 text-right font-mono">{f.actual_imc?.toFixed(1) || 'ÃÂ¢ÃÂÃÂ'}</td>
                  <td className="px-4 py-3 text-right font-mono">{f.simulated?.toFixed(1) || 'ÃÂ¢ÃÂÃÂ'}</td>
                  <td className="px-4 py-3 text-center">{f.ldg_day || 0}</td>
                  <td className="px-4 py-3 text-center">{f.ldg_night ? <span className="text-accent">{f.ldg_night}</span> : 0}</td>
                  <td className="px-4 py-3 text-center">{f.approaches?.length ? <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px]">{f.approaches.length}</span> : 'ÃÂ¢ÃÂÃÂ'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px] truncate">{f.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}