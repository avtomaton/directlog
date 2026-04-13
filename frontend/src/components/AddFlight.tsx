import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Aircraft } from '../types';

export default function AddFlight({ aircraft, onSave }: { aircraft: Aircraft[]; onSave: () => void }) {
  const [f, setF] = useState({ date: new Date().toISOString().slice(0,10), aircraft: 'C-GABC', from:'CYMM', to:'', air_time:'', pic:'', night:'0', actual_imc:'0', simulated:'0', ldg_day:'1', ldg_night:'0', remarks:'' });
  const [approaches, setApproaches] = useState<any[]>([]);

  const save = async () => {
    await fetch('/api/flights', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...f, air_time:+f.air_time, pic:+f.pic, night:+f.night, actual_imc:+f.actual_imc, simulated:+f.simulated, ldg_day:+f.ldg_day, ldg_night:+f.ldg_night, approaches, type: aircraft.find(a=>a.reg===f.aircraft)?.type.split(' ')[1] }) });
    onSave();
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Log Flight</h1>
      <div className="glass rounded-2xl p-6 md:p-8">
        <div className="grid md:grid-cols-3 gap-5 mb-6">
          <div><label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Date</label><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:outline-none" /></div>
          <div><label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Aircraft</label><select value={f.aircraft} onChange={e=>setF({...f,aircraft:e.target.value})} className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:outline-none">{aircraft.map(a=><option key={a.reg} value={a.reg} className="bg-dark-blue">{a.reg} - {a.type}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">From</label><input value={f.from} onChange={e=>setF({...f,from:e.target.value.toUpperCase()})} className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:outline-none font-mono uppercase" /></div>
            <div><label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">To</label><input value={f.to} onChange={e=>setF({...f,to:e.target.value.toUpperCase()})} className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:outline-none font-mono uppercase" /></div>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
          {Object.entries({air_time:'Air',pic:'PIC',night:'Night',actual_imc:'Actual',simulated:'Sim',ldg_day:'Day LDG'}).map(([k,l])=>(
            <div key={k}><label className="block text-xs text-slate-400 mb-1.5">{l}</label><input type="number" step="0.1" value={(f as any)[k]} onChange={e=>setF({...f,[k]:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none text-center font-mono" /></div>
          ))}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3"><label className="text-xs text-slate-400 uppercase tracking-wider">Approaches</label><button onClick={()=>setApproaches([...approaches,{type:'ILS',airport:'',runway:'',actual:false}])} className="flex items-center gap-1 text-xs text-primary hover:text-accent"><Plus className="w-3 h-3" />Add</button></div>
          <div className="space-y-2">{approaches.map((a,i)=>(<div key={i} className="flex gap-2"><select value={a.type} onChange={e=>{const na=[...approaches];na[i].type=e.target.value;setApproaches(na)}} className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs"><option>ILS</option><option>RNAV</option><option>VOR</option></select><input placeholder="APT" value={a.airport} onChange={e=>{const na=[...approaches];na[i].airport=e.target.value.toUpperCase();setApproaches(na)}} className="w-20 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono uppercase" /><input placeholder="RWY" value={a.runway} onChange={e=>{const na=[...approaches];na[i].runway=e.target.value;setApproaches(na)}} className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono" /><button onClick={()=>setApproaches(approaches.filter((_,j)=>j!==i))} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="w-3 h-3" /></button></div>))}</div>
        </div>

        <div className="mb-8"><label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Remarks</label><textarea value={f.remarks} onChange={e=>setF({...f,remarks:e.target.value})} rows={2} className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:outline-none resize-none" /></div>

        <div className="flex justify-end gap-3"><button className="px-5 py-2.5 rounded-xl hover:bg-white/10 transition-colors">Cancel</button><button onClick={save} className="px-6 py-2.5 rounded-xl btn-primary text-white font-medium">Save Flight</button></div>
      </div>
    </div>
  );
}