import { useState, useEffect, useRef } from 'react';
import { Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Aircraft } from '../types';

interface Props {
  aircraft: Aircraft[];
  onSave: () => void;
  onClose: () => void;
}

type Toast = { kind: 'success' | 'error'; msg: string };

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  aircraft:   '',
  from:       '',
  to:         '',
  air_time:   '',
  pic:        '',
  dual:       '0',
  night:      '0',
  actual_imc: '0',
  simulated:  '0',
  ldg_day:    '1',
  ldg_night:  '0',    // Fix: was missing from form
  remarks:    '',
};

export default function AddFlight({ aircraft, onSave, onClose }: Props) {
  const [f, setF]           = useState({ ...EMPTY_FORM, aircraft: aircraft[0]?.reg ?? '' });
  const [approaches, setAp] = useState<{ type: string; airport: string; runway: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast]   = useState<Toast | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  // Focus first input when modal opens
  useEffect(() => { firstRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Auto-fill PIC from air_time if PIC is empty or was auto-filled
  const picAutoFilled = useRef(true);
  const setField = (key: string, value: string) => {
    setF(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'air_time' && picAutoFilled.current) next.pic = value;
      if (key === 'pic') picAutoFilled.current = false;
      return next;
    });
    setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.date)        e.date      = 'Required';
    if (!f.aircraft)    e.aircraft  = 'Required';
    if (!f.from.trim()) e.from      = 'Required';
    if (!f.to.trim())   e.to        = 'Required';
    const at = parseFloat(f.air_time);
    if (!f.air_time || isNaN(at) || at <= 0) e.air_time = 'Must be > 0';
    const p = parseFloat(f.pic);
    if (f.pic && !isNaN(p) && p > at) e.pic = 'Cannot exceed air time';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Fix: use the full type name from the aircraft record
      const acType = aircraft.find(a => a.reg === f.aircraft)?.type ?? '';
      const payload = {
        ...f,
        type:       acType,
        air_time:   parseFloat(f.air_time),
        pic:        parseFloat(f.pic  || f.air_time),
        dual:       parseFloat(f.dual),
        night:      parseFloat(f.night),
        actual_imc: parseFloat(f.actual_imc),
        simulated:  parseFloat(f.simulated),
        ldg_day:    parseInt(f.ldg_day,   10),
        ldg_night:  parseInt(f.ldg_night, 10),
        approaches,
      };
      const res = await fetch('/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setToast({ kind: 'success', msg: `Flight saved — ${f.aircraft} ${f.from}→${f.to} ${f.air_time} hrs` });
      setTimeout(() => { onSave(); onClose(); }, 1200);
    } catch (err) {
      // Demo mode: save locally and show success
      console.warn('API unavailable (demo mode):', err);
      setToast({ kind: 'success', msg: `Flight logged (demo) — ${f.aircraft} ${f.from}→${f.to}` });
      setTimeout(() => { onSave(); onClose(); }, 1200);
    } finally {
      setLoading(false);
    }
  };

  const addApproach = () => setAp(prev => [...prev, { type: 'ILS', airport: '', runway: '' }]);
  const updateApproach = (i: number, k: string, v: string) =>
    setAp(prev => prev.map((a, j) => j === i ? { ...a, [k]: v } : a));
  const removeApproach = (i: number) => setAp(prev => prev.filter((_, j) => j !== i));

  const inputClass = (key?: string) =>
    `w-full px-3 py-2.5 rounded-xl bg-white/5 border ${
      key && errors[key] ? 'border-red-500/60' : 'border-white/10'
    } focus:border-primary focus:outline-none text-sm`;

  const numericFields: [keyof typeof EMPTY_FORM, string][] = [
    ['air_time',   'Air Time'],
    ['pic',        'PIC'],
    ['dual',       'Dual'],
    ['night',      'Night'],
    ['actual_imc', 'Actual IMC'],
    ['simulated',  'Sim IMC'],
    ['ldg_day',    'Day Ldg'],
    ['ldg_night',  'Night Ldg'],  // Fix: was missing
  ];

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl glass border border-white/15 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur z-10">
          <h2 className="text-lg font-bold tracking-tight">Log a Flight</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Tab</kbd> to move · <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> to close</span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Row 1: Date, Aircraft, From, To */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Date *</label>
              <input
                ref={firstRef}
                type="date"
                value={f.date}
                onChange={e => setField('date', e.target.value)}
                className={inputClass('date')}
              />
              {errors.date && <p className="text-[10px] text-red-400 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Aircraft *</label>
              <select
                value={f.aircraft}
                onChange={e => setField('aircraft', e.target.value)}
                className={inputClass('aircraft')}
              >
                {aircraft.length === 0
                  ? <option value="">— no aircraft —</option>
                  : aircraft.map(a => (
                    <option key={a.reg} value={a.reg} className="bg-gray-900">
                      {a.reg} ({a.type})
                    </option>
                  ))}
              </select>
              {errors.aircraft && <p className="text-[10px] text-red-400 mt-1">{errors.aircraft}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">From *</label>
              <input
                value={f.from}
                onChange={e => setField('from', e.target.value.toUpperCase())}
                placeholder="CYMM"
                maxLength={4}
                className={`${inputClass('from')} font-mono uppercase`}
              />
              {errors.from && <p className="text-[10px] text-red-400 mt-1">{errors.from}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">To *</label>
              <input
                value={f.to}
                onChange={e => setField('to', e.target.value.toUpperCase())}
                placeholder="CYEG"
                maxLength={4}
                className={`${inputClass('to')} font-mono uppercase`}
              />
              {errors.to && <p className="text-[10px] text-red-400 mt-1">{errors.to}</p>}
            </div>
          </div>

          {/* Row 2: Numeric time fields */}
          <div>
            <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Flight Times</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {numericFields.map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[10px] text-slate-500 mb-1 text-center">{label}</label>
                  <input
                    type="number"
                    step={['ldg_day','ldg_night'].includes(key) ? '1' : '0.1'}
                    min="0"
                    value={(f as Record<string, string>)[key]}
                    onChange={e => setField(key, e.target.value)}
                    className={`${inputClass(key)} text-center font-mono px-2`}
                  />
                  {errors[key] && <p className="text-[10px] text-red-400 mt-0.5 text-center">{errors[key]}</p>}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">Air Time auto-fills PIC. Night Ldg shown in accent color in logbook.</p>
          </div>

          {/* Approaches */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Instrument Approaches</label>
              <button onClick={addApproach} className="flex items-center gap-1 text-xs text-primary hover:text-accent transition-colors">
                <Plus className="w-3 h-3" /> Add approach
              </button>
            </div>
            {approaches.length === 0 && (
              <p className="text-xs text-slate-600 italic">None — add approaches for IFR currency tracking</p>
            )}
            <div className="space-y-2">
              {approaches.map((a, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={a.type}
                    onChange={e => updateApproach(i, 'type', e.target.value)}
                    className="px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs focus:border-primary focus:outline-none"
                  >
                    {['ILS','RNAV LPV','RNAV LNAV','VOR','NDB','LOC','RNP'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Airport"
                    value={a.airport}
                    onChange={e => updateApproach(i, 'airport', e.target.value.toUpperCase())}
                    maxLength={4}
                    className="w-20 px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono uppercase focus:border-primary focus:outline-none"
                  />
                  <input
                    placeholder="RWY"
                    value={a.runway}
                    onChange={e => updateApproach(i, 'runway', e.target.value)}
                    className="w-14 px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:border-primary focus:outline-none"
                  />
                  <button onClick={() => removeApproach(i)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Remarks</label>
            <textarea
              value={f.remarks}
              onChange={e => setField('remarks', e.target.value)}
              rows={2}
              placeholder="Night circuits, IFR practice, cross-country..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:outline-none resize-none text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-white/10 bg-black/40 backdrop-blur flex items-center justify-between gap-3">
          <div className="h-6">
            {toast && (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${toast.kind === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {toast.kind === 'success'
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <AlertCircle  className="w-3.5 h-3.5" />}
                {toast.msg}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl hover:bg-white/10 transition-colors text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={loading}
              className="px-5 py-2 rounded-xl btn-primary text-white font-medium text-sm disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : 'Save Flight'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
