import { useState } from 'react';
import { Save, Globe, MapPin, Moon, Calculator, RotateCcw } from 'lucide-react';
import { AppSettings, Regulation } from '../types';

interface Props {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
}

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
};

export default function SettingsPage({ settings, onSave }: Props) {
  const [local, setLocal] = useState<AppSettings>({ ...settings });

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(local);
  };

  const handleReset = () => {
    setLocal({ ...defaultSettings });
  };

  const regulationDescriptions: Record<Regulation, { name: string; desc: string }> = {
    CARs: { name: 'Transport Canada (CARs)', desc: 'Canadian Aviation Regulations — CAR 401.05' },
    FAA: { name: 'FAA (Part 61)', desc: 'Federal Aviation Regulations — 14 CFR Part 61.57' },
    EASA: { name: 'EASA', desc: 'European Union Aviation Safety Agency — Part-FCL' },
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-slate-400 text-sm">Configure your logbook preferences</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Regulation */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Regulation Set</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Select which aviation authority rules to use for currency calculations.
          </p>
          <div className="space-y-3">
            {(Object.keys(regulationDescriptions) as Regulation[]).map(reg => (
              <label
                key={reg}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  local.regulation === reg
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 hover:bg-white/5'
                }`}
              >
                <input
                  type="radio"
                  name="regulation"
                  checked={local.regulation === reg}
                  onChange={() => update('regulation', reg)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <div className="font-medium">{regulationDescriptions[reg].name}</div>
                  <div className="text-xs text-slate-400">{regulationDescriptions[reg].desc}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Home Base */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Home Base</h2>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Default airport ICAO code</label>
            <input
              type="text"
              value={local.homeBase}
              onChange={e => update('homeBase', e.target.value.toUpperCase())}
              placeholder="e.g. CYMM, KSEA, EDDF"
              maxLength={4}
              className="w-40 px-3 py-2 rounded-xl glass border border-white/10 text-sm font-mono uppercase focus:border-primary focus:outline-none"
            />
          </div>
        </section>

        {/* Night Definition — Flight Time */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Night Definition — Flight Time</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            When night flight time begins and ends. Default is sunset +30 min to sunrise -30 min.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Night starts at</label>
              <div className="flex gap-2 items-center">
                <select
                  value={local.nightStartTime.includes('sunset') ? 'sunset' : 'sunrise'}
                  onChange={e => {
                    const base = e.target.value;
                    const mins = local.nightStartTime.includes('+') 
                      ? local.nightStartTime.split('+')[1] 
                      : local.nightStartTime.split('-')[1] || '0';
                    update('nightStartTime', `${base}+${mins}`);
                  }}
                  className="px-3 py-2 rounded-xl glass border border-white/10 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="sunset">Sunset</option>
                  <option value="sunrise">Sunrise</option>
                </select>
                <span className="text-slate-400 text-sm">±</span>
                <input
                  type="number"
                  value={parseInt(local.nightStartTime.split(/[+-]/)[1] || '30', 10)}
                  onChange={e => {
                    const base = local.nightStartTime.includes('sunset') ? 'sunset' : 'sunrise';
                    const sign = local.nightStartTime.includes('+') ? '+' : '-';
                    update('nightStartTime', `${base}${sign}${e.target.value}`);
                  }}
                  className="w-20 px-3 py-2 rounded-xl glass border border-white/10 text-sm font-mono focus:border-primary focus:outline-none"
                  min={0}
                  max={120}
                />
                <span className="text-slate-400 text-sm">min</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Night ends at</label>
              <div className="flex gap-2 items-center">
                <select
                  value={local.nightEndTime.includes('sunrise') ? 'sunrise' : 'sunset'}
                  onChange={e => {
                    const base = e.target.value;
                    const mins = local.nightEndTime.includes('-') 
                      ? local.nightEndTime.split('-')[1] 
                      : local.nightEndTime.split('+')[1] || '0';
                    update('nightEndTime', `${base}-${mins}`);
                  }}
                  className="px-3 py-2 rounded-xl glass border border-white/10 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="sunrise">Sunrise</option>
                  <option value="sunset">Sunset</option>
                </select>
                <span className="text-slate-400 text-sm">−</span>
                <input
                  type="number"
                  value={parseInt(local.nightEndTime.split(/[+-]/)[1] || '30', 10)}
                  onChange={e => {
                    const base = local.nightEndTime.includes('sunrise') ? 'sunrise' : 'sunset';
                    update('nightEndTime', `${base}-${e.target.value}`);
                  }}
                  className="w-20 px-3 py-2 rounded-xl glass border border-white/10 text-sm font-mono focus:border-primary focus:outline-none"
                  min={0}
                  max={120}
                />
                <span className="text-slate-400 text-sm">min</span>
              </div>
            </div>
          </div>
        </section>

        {/* Night Definition — Landings */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-warning" />
            <h2 className="text-lg font-semibold">Night Definition — Landings</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Time window for counting night landings. Default is sunset +1h to sunrise -1h.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Night landings start at</label>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-slate-300">Sunset +</span>
                <input
                  type="number"
                  value={parseInt(local.nightLandingStart.split('+')[1] || '60', 10)}
                  onChange={e => update('nightLandingStart', `sunset+${e.target.value}`)}
                  className="w-20 px-3 py-2 rounded-xl glass border border-white/10 text-sm font-mono focus:border-primary focus:outline-none"
                  min={0}
                  max={120}
                />
                <span className="text-slate-400 text-sm">min</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Night landings end at</label>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-slate-300">Sunrise −</span>
                <input
                  type="number"
                  value={parseInt(local.nightLandingEnd.split('-')[1] || '60', 10)}
                  onChange={e => update('nightLandingEnd', `sunrise-${e.target.value}`)}
                  className="w-20 px-3 py-2 rounded-xl glass border border-white/10 text-sm font-mono focus:border-primary focus:outline-none"
                  min={0}
                  max={120}
                />
                <span className="text-slate-400 text-sm">min</span>
              </div>
            </div>
          </div>
        </section>

        {/* Total Time Computation */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Total Time Computation</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            How total flight time is calculated and displayed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Decimal precision</label>
              <select
                value={local.totalTimeDecimals}
                onChange={e => update('totalTimeDecimals', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl glass border border-white/10 text-sm focus:border-primary focus:outline-none"
              >
                <option value={1}>1 decimal (0.1 hr)</option>
                <option value={2}>2 decimals (0.01 hr)</option>
                <option value={3}>3 decimals (0.001 hr)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Display unit</label>
              <select
                value={local.totalTimeUnit}
                onChange={e => update('totalTimeUnit', e.target.value as 'hours' | 'minutes')}
                className="w-full px-3 py-2 rounded-xl glass border border-white/10 text-sm focus:border-primary focus:outline-none"
              >
                <option value="hours">Hours (decimal)</option>
                <option value="minutes">Hours:Minutes</option>
              </select>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-white/10 hover:bg-white/10 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl btn-primary text-white font-medium shadow-md"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
