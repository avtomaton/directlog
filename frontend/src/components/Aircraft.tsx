import { Plane } from 'lucide-react';
import { Aircraft as AircraftType } from '../types';

export default function Aircraft({ aircraft }: { aircraft: AircraftType[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Aircraft</h1>
        <button className="px-4 py-2.5 rounded-xl btn-primary text-white text-sm font-medium">Add Aircraft</button>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {aircraft.map((ac) => (
          <div key={ac.reg} className="stat-card rounded-2xl p-6 border border-white/10 card-hover">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/20 text-primary"><Plane className="w-5 h-5" /></div>
                <div><h3 className="text-xl font-bold">{ac.reg}</h3><p className="text-sm text-slate-400">{ac.type}</p></div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/10">{ac.class}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Time</div><div className="font-mono text-lg">{ac.total_time} hrs</div></div>
              <div><div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Home Base</div><div className="font-mono">{ac.home}</div></div>
              <div><div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Equipment</div><div>{ac.equip}</div></div>
              <div><div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Last Flown</div><div className="font-mono text-xs">{ac.last_flown}</div></div>
            </div>
            {ac.notes && <div className="mt-4 pt-4 border-t border-white/5 text-xs text-slate-400 italic">{ac.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}