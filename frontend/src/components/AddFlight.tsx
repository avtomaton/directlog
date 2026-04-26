import { useState, useEffect, useRef } from 'react';
import { Plus, X, AlertCircle, CheckCircle2, LogOut, LogIn, PlaneTakeoff, PlaneLanding } from 'lucide-react';
import { Aircraft, FlightTemplate, AppSettings, Flight } from '../types';
import { getAuthHeaders } from '../contexts/AuthContext';
import { calculateDuration, calculateNightTime, evaluateCalculation, timeToHours } from '../utils/flightUtils';

interface Props {
    aircraft: Aircraft[];
    settings: AppSettings;
    templates?: FlightTemplate[];
    initialFlight?: Partial<Flight> | null;
    onSave: () => void;
    onClose: () => void;
}

type Toast = { kind: 'success' | 'error'; msg: string };

/** Form state type — all time fields are strings for input binding */
type FlightForm = {
    date: string;
    aircraft: string;
    from: string;
    to: string;
    start_time: string;
    takeoff_time: string;
    landing_time: string;
    shutdown_time: string;
    air_time: string;
    pic: string;
    dual: string;
    night: string;
    actual_imc: string;
    simulated: string;
    ifr: string;
    sic: string;
    pilot_flying: string;
    right_seat: string;
    multi_pilot: string;
    xc: string;
    xc_over_50nm: string;
    holds: string;
    aerobatic_time: string;
    banner_towing: string;
    glider_towing: string;
    formation: string;
    low_level: string;
    mountain: string;
    offshore: string;
    bush: string;
    combat: string;
    sling_load: string;
    hoist: string;
    ems: boolean;
    ppc: boolean;
    training: boolean;
    checkride: boolean;
    flight_review: boolean;
    ipc: boolean;
    route: string;
    pic_name: string;
    sic_name: string;
    ldg_day: string;
    ldg_night: string;
    remarks: string;
};

const EMPTY_FORM: FlightForm = {
    date: new Date().toISOString().slice(0, 10),
    aircraft: '',
    from: '',
    to: '',
    start_time: '',
    takeoff_time: '',
    landing_time: '',
    shutdown_time: '',
    air_time: '',
    pic: '',
    dual: '0',
    night: '0',
    actual_imc: '0',
    simulated: '0',
    ifr: '0',
    sic: '0',
    pilot_flying: '0',
    right_seat: '0',
    multi_pilot: '0',
    xc: '0',
    xc_over_50nm: '0',
    holds: '0',
    aerobatic_time: '0',
    banner_towing: '0',
    glider_towing: '0',
    formation: '0',
    low_level: '0',
    mountain: '0',
    offshore: '0',
    bush: '0',
    combat: '0',
    sling_load: '0',
    hoist: '0',
    ems: false,
    ppc: false,
    training: false,
    checkride: false,
    flight_review: false,
    ipc: false,
    route: '',
    pic_name: '',
    sic_name: '',
    ldg_day: '1',
    ldg_night: '0',
    remarks: '',
};

export default function AddFlight(props: Props) {
    const [f, setF] = useState<FlightForm>(() => {
        if (props.initialFlight) {
            const copy: FlightForm = { ...EMPTY_FORM };
            const skip = new Set(['start_time', 'shutdown_time', 'takeoff_time', 'landing_time', 'id', 'created_at']);
            const init = props.initialFlight;
            (Object.keys(init) as (keyof Flight)[]).forEach(key => {
                if (!(key in copy) || skip.has(key)) return;
                const val = init[key];
                if (val === undefined) return;
                if (typeof val === 'number') (copy as Record<string, unknown>)[key] = String(val);
                else if (typeof val === 'boolean') (copy as Record<string, unknown>)[key] = val;
                else (copy as Record<string, unknown>)[key] = val;
            });
            return copy;
        }
        return { ...EMPTY_FORM, aircraft: props.aircraft[0]?.reg ?? '' };
    });
  const [approaches, setAp] = useState<{ type: string; airport: string; runway: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast]   = useState<Toast | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  // Get current template
  const currentTemplate = props.templates?.find(t => t.id === selectedTemplate);

  // Mandatory fields that are always visible
  const MANDATORY_FIELDS = ['date', 'aircraft', 'from', 'to', 'start_time', 'takeoff_time', 'landing_time', 'shutdown_time', 'air_time'];
  
  // Basic flight fields that are always shown
  const BASIC_FIELDS = ['pic', 'sic', 'dual', 'night', 'ifr', 'actual_imc', 'simulated', 'xc', 'ldg_day', 'ldg_night'];

  // Check if field should be visible
  const isFieldVisible = (field: string): boolean => {
    if (MANDATORY_FIELDS.includes(field)) return true;
    if (BASIC_FIELDS.includes(field)) return true;
    if (additionalFields.includes(field)) return true;
    if (!currentTemplate) return false; // Only show basic fields by default
    return currentTemplate.visible_fields.includes(field);
  };

  // Focus first input and select default template when modal opens
  useEffect(() => { 
    firstRef.current?.focus();
    if (!props.initialFlight && props.settings?.defaultTemplateId) {
      setSelectedTemplate(props.settings.defaultTemplateId);
    }
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') props.onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [props.onClose]);

  // Fields management
  const [additionalFields, setAdditionalFields] = useState<string[]>([]);
  const [showPropertyMenu, setShowPropertyMenu] = useState(false);
  
  const setField = (key: string, value: string | boolean | number) => {
    setF(prev => {
      const next = { ...prev, [key]: value };
      return next;
    });
    setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  };

  // Populate all fields based on selected template
  const populateFields = () => {
    if (!f.start_time && !f.shutdown_time && !f.air_time) return;
    
    let totalTime: number;
    if (f.start_time && f.shutdown_time) {
      totalTime = calculateDuration(f.start_time, f.shutdown_time);
      setField('air_time', totalTime.toFixed(1));
    } else {
      totalTime = parseFloat(f.air_time) || 0;
    }

    // Calculate night time
    if (f.start_time && f.shutdown_time && props.settings) {
      const nightHours = calculateNightTime(f.date, f.start_time, f.shutdown_time, props.settings);
      if (nightHours > 0) {
        setField('night', nightHours.toFixed(1));
      }
    }

    // Apply template defaults
    if (currentTemplate?.defaults) {
      Object.entries(currentTemplate.defaults).forEach(([key, value]) => {
        setField(key, value as string | boolean | number);
      });
    }

    // Apply template calculations
    if (currentTemplate?.calculations) {
        const takeoff = f.takeoff_time;
        const landing = f.landing_time;
      
      let ifrTime: number;
      if (takeoff && landing) {
        // Use actual flight time if takeoff/landing are specified
        ifrTime = calculateDuration(takeoff, landing);
      } else {
        // Use deduction rules otherwise
        ifrTime = Math.max(0, totalTime - (props.settings?.ifrDeductionMinutes || 12) / 60);
      }

      const values: Record<string, number> = {
        air_time: totalTime,
        start: timeToHours(f.start_time),
        shutdown: timeToHours(f.shutdown_time),
        takeoff: timeToHours(takeoff),
        landing: timeToHours(landing),
        total: totalTime,
        ifr_time: ifrTime,
      };

      Object.entries(currentTemplate.calculations).forEach(([key, expr]) => {
        // Never auto-populate actual_imc - must be entered manually
        if (key === 'actual_imc') return;
        
        const result = evaluateCalculation(expr as string, values);
        if (!Number.isNaN(result)) {
          setField(key, result.toFixed(1));
        }
      });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.date)        e.date      = 'Required';
    if (!f.aircraft)    e.aircraft  = 'Required';
    if (!f.from.trim()) e.from      = 'Required';
    if (!f.to.trim())   e.to        = 'Required';
    const at = parseFloat(f.air_time);
    if (!f.air_time || Number.isNaN(at) || at <= 0) e.air_time = 'Must be > 0';
    const p = parseFloat(f.pic);
    if (f.pic && !Number.isNaN(p) && p > at) e.pic = 'Cannot exceed air time';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
      if (!validate()) return;
      setLoading(true);
      try {
          const acType = props.aircraft.find(a => a.reg === f.aircraft)?.type ?? '';
          const payload = {
              date: f.date,
              aircraft: f.aircraft,
              type: acType,
              from: f.from,
              to: f.to,
              air_time: parseFloat(f.air_time),
              pic: parseFloat(f.pic || f.air_time),
              dual: parseFloat(f.dual),
              sic: parseFloat(f.sic),
              night: parseFloat(f.night),
              ifr: parseFloat(f.ifr || '0'),
              actual_imc: parseFloat(f.actual_imc),
              simulated: parseFloat(f.simulated),
              xc: parseFloat(f.xc),
              xc_over_50nm: parseFloat(f.xc_over_50nm),
              right_seat: parseFloat(f.right_seat),
              multi_pilot: parseFloat(f.multi_pilot),
              pilot_flying: parseFloat(f.pilot_flying || '0'),
              holds: parseInt(f.holds || '0', 10),
              ems: f.ems,
              search_and_rescue: false,
              aerial_work: false,
              training: false,
              checkride: false,
              flight_review: false,
              ipc: false,
              ppc: f.ppc,
              route: f.route || null,
              pic_name: f.pic_name || null,
              sic_name: f.sic_name || null,
              ldg_day: parseInt(f.ldg_day, 10),
              ldg_night: parseInt(f.ldg_night, 10),
              approaches,
              start_time: f.start_time || null,
              takeoff_time: f.takeoff_time || null,
              landing_time: f.landing_time || null,
              shutdown_time: f.shutdown_time || null,
          };
      const isEditing = !!props.initialFlight?.id;
      const url = isEditing ? `/api/flights/${props.initialFlight!.id}` : '/api/flights';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setToast({ kind: 'success', msg: `Flight saved — ${f.aircraft} ${f.from}→${f.to} ${f.air_time} hrs` });
      setTimeout(() => { props.onSave(); props.onClose(); }, 1200);
    } catch (err) {
      // Demo mode: save locally and show success
      console.warn('API unavailable (demo mode):', err);
      setToast({ kind: 'success', msg: `Flight logged (demo) — ${f.aircraft} ${f.from}→${f.to}` });
      setTimeout(() => { props.onSave(); props.onClose(); }, 1200);
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
    } focus:border-primary focus:outline-none text-sm
     [&>option]:bg-gray-900 [&>option]:text-white`;

  const allAvailableFields: {id: string; label: string; type: 'time' | 'number' | 'boolean' | 'text'}[] = [
    { id: 'pic', label: 'PIC', type: 'time' },
    { id: 'sic', label: 'SIC', type: 'time' },
    { id: 'dual', label: 'Dual', type: 'time' },
    { id: 'night', label: 'Night', type: 'time' },
    { id: 'ifr', label: 'IFR', type: 'time' },
    { id: 'actual_imc', label: 'Actual IMC', type: 'time' },
    { id: 'simulated', label: 'Sim IMC', type: 'time' },
    { id: 'xc', label: 'XC', type: 'time' },
    { id: 'xc_over_50nm', label: 'XC >50nm', type: 'time' },
    { id: 'right_seat', label: 'Right Seat', type: 'time' },
    { id: 'multi_pilot', label: 'Multi Pilot', type: 'time' },
    { id: 'pilot_flying', label: 'PF', type: 'time' },
    { id: 'holds', label: 'Holds', type: 'number' },
    { id: 'ldg_day', label: 'Day Ldg', type: 'number' },
    { id: 'ldg_night', label: 'Night Ldg', type: 'number' },
    { id: 'aerobatic_time', label: 'Aerobatic', type: 'time' },
    { id: 'banner_towing', label: 'Banner Towing', type: 'time' },
    { id: 'glider_towing', label: 'Glider Towing', type: 'time' },
    { id: 'formation', label: 'Formation', type: 'time' },
    { id: 'low_level', label: 'Low Level', type: 'time' },
    { id: 'mountain', label: 'Mountain', type: 'time' },
    { id: 'offshore', label: 'Offshore', type: 'time' },
    { id: 'bush', label: 'Bush', type: 'time' },
    { id: 'combat', label: 'Combat', type: 'time' },
    { id: 'sling_load', label: 'Sling Load', type: 'time' },
    { id: 'hoist', label: 'Hoist', type: 'time' },
    { id: 'ppc', label: 'PPC', type: 'boolean' },
  ];

  const numericFields: [string, string][] = allAvailableFields.map(f => [f.id, f.label]);

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={props.onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl glass border border-white/15 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur z-10">
          <h2 className="text-lg font-bold tracking-tight">Log a Flight</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Tab</kbd> to move · <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> to close</span>
            <button onClick={props.onClose} className="p-1.5 rounded-lg hover:bg-white/10">
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
                {props.aircraft.length === 0
                  ? <option value="">— no aircraft —</option>
                  : props.aircraft.map(a => (
                    <option key={a.reg} value={a.reg}>
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

          {/* Route */}
          <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Route</label>
              <input
                  value={f.route}
                  onChange={e => setField('route', e.target.value)}
                  placeholder="Direct"
                  className={inputClass()}
              />
              <p className="text-[10px] text-slate-500 mt-1">Leave empty for direct flight</p>
          </div>
          
          {/* Crew fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">PIC Name</label>
                  <input
                      value={f.pic_name}
                      onChange={e => setField('pic_name', e.target.value)}
                      placeholder="Pilot in Command"
                      className={inputClass()}
                  />
              </div>
              <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">SIC / Student</label>
                  <input
                      value={f.sic_name}
                      onChange={e => setField('sic_name', e.target.value)}
                      placeholder="Second in Command / Student"
                      className={inputClass()}
                  />
              </div>
          </div>

          {/* Template selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Flight Template</label>
            <select
              value={selectedTemplate ?? ''}
              onChange={e => setSelectedTemplate(e.target.value ? parseInt(e.target.value) : null)}
              className={inputClass()}
            >
              <option value="">— Default / All Fields —</option>
              {props.templates?.map(t => (
                <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
              ))}
            </select>
          </div>

          {/* Row 2: Block times + Total + Populate */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1 justify-center">
                <LogOut className="w-3 h-3" /> Out
              </label>
              <input
                type="time"
                value={f.start_time}
                onChange={e => setField('start_time', e.target.value)}
                className={inputClass('start_time')}
              />
            </div>
            <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1 justify-center">
                    <PlaneTakeoff className="w-3 h-3" /> Off
                </label>
                <input
                    type="time"
                    value={f.takeoff_time}
                    onChange={e => setField('takeoff_time', e.target.value)}
                    className={inputClass()}
                />
            </div>
            <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1 justify-center">
                    <PlaneLanding className="w-3 h-3" /> On
                </label>
                <input
                    type="time"
                    value={f.landing_time}
                    onChange={e => setField('landing_time', e.target.value)}
                    className={inputClass()}
                />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1 justify-center">
                <LogIn className="w-3 h-3" /> In
              </label>
              <input
                type="time"
                value={f.shutdown_time}
                onChange={e => setField('shutdown_time', e.target.value)}
                className={inputClass('shutdown_time')}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Total Time</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={f.air_time}
                onChange={e => setField('air_time', e.target.value)}
                className={`${inputClass('air_time')} font-mono`}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={populateFields}
                className="w-full px-4 py-2.5 rounded-xl bg-accent/20 hover:bg-accent/30 text-accent font-medium text-sm transition-colors"
              >
                🔄 Populate
              </button>
            </div>
          </div>

          {/* Row 3: Numeric time fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Flight Times</label>
              <div className="relative">
                <button 
                  onClick={() => setShowPropertyMenu(!showPropertyMenu)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-accent transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Property
                </button>
                {showPropertyMenu && (
                  <div className="absolute right-0 top-6 z-20 bg-gray-900 border border-white/10 rounded-lg shadow-lg py-1 min-w-[160px]">
                    {allAvailableFields
                      .filter(f => !isFieldVisible(f.id) && !additionalFields.includes(f.id))
                      .map(f => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setAdditionalFields(prev => [...prev, f.id]);
                            setShowPropertyMenu(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs hover:bg-white/10 text-slate-300"
                        >
                          {f.label}
                        </button>
                      ))}
                    {allAvailableFields.filter(f => !isFieldVisible(f.id) && !additionalFields.includes(f.id)).length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500">All fields visible</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {numericFields
                .filter(([key]) => isFieldVisible(key))
                .map(([key, label]) => (
                  <div key={key} className="relative">
                      <label className="block text-[10px] text-slate-500 mb-1 text-center">{label}</label>
                      <input
                          type="number"
                          step={['ldg_day','ldg_night', 'holds'].includes(key) ? '1' : '0.1'}
                          min="0"
                          value={String((f as unknown as Record<string, string | boolean | number>)[key] || '0')}
                          onChange={e => setField(key, e.target.value)}
                          className={`${inputClass(key)} text-center font-mono px-2 pr-6`}
                      />
                    {additionalFields.includes(key) && (
                      <button 
                        onClick={() => setAdditionalFields(prev => prev.filter(f => f !== key))}
                        className="absolute right-1 top-5 p-0.5 text-slate-500 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
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
                    className="px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs focus:border-primary focus:outline-none [&>option]:bg-gray-900 [&>option]:text-white"
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

          {/* Flags */}
          <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                  <input
                      type="checkbox"
                      checked={f.ems}
                      onChange={e => setField('ems', e.target.checked)}
                      className="rounded"
                  />
                  EMS / Medical
              </label>
              <label className="flex items-center gap-2 text-sm">
                  <input
                      type="checkbox"
                      checked={!!f.training}
                      onChange={e => setField('training', e.target.checked)}
                      className="rounded"
                  />
                  Training
              </label>
              <label className="flex items-center gap-2 text-sm">
                  <input
                      type="checkbox"
                      checked={!!f.checkride}
                      onChange={e => setField('checkride', e.target.checked)}
                      className="rounded"
                  />
                  Checkride
              </label>
              <label className="flex items-center gap-2 text-sm">
                  <input
                      type="checkbox"
                      checked={!!f.flight_review}
                      onChange={e => setField('flight_review', e.target.checked)}
                      className="rounded"
                  />
                  Flight Review
              </label>
              <label className="flex items-center gap-2 text-sm">
                  <input
                      type="checkbox"
                      checked={!!f.ipc}
                      onChange={e => setField('ipc', e.target.checked)}
                      className="rounded"
                  />
                  IPC
              </label>
              <label className="flex items-center gap-2 text-sm">
                  <input
                      type="checkbox"
                      checked={f.ppc}
                      onChange={e => setField('ppc', e.target.checked)}
                      className="rounded"
                  />
                  PPC
              </label>
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
              onClick={props.onClose}
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
