import { useState, useEffect } from 'react';
import { Save, Globe, Moon, Calculator, RotateCcw, Plus, Edit2, Trash2 } from 'lucide-react';
import { AppSettings, Regulation, FlightTemplate } from '../types';
import { defaultSettings } from '../utils/defaultSettings';

interface Props {
  settings: AppSettings;
  templates: FlightTemplate[];
  onSave: (s: AppSettings) => void;
  onSaveTemplate: (t: FlightTemplate) => void;
  onDeleteTemplate: (id: number) => void;
}

export default function SettingsPage({ settings, templates, onSave, onSaveTemplate, onDeleteTemplate }: Props) {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FlightTemplate | null>(null);

  // Sync local state when parent settings change (e.g. after backend load)
  useEffect(() => {
    setLocal({ ...settings });
  }, [settings]);

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
        {/* General */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">General</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Regulation Authority</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(regulationDescriptions).map(([key, val]) => (
                  <label
                    key={key}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      local.regulation === key
                        ? 'border-primary bg-primary/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="regulation"
                      value={key}
                      checked={local.regulation === key}
                      onChange={e => update('regulation', e.target.value as Regulation)}
                      className="hidden"
                    />
                    <div className="font-medium">{val.name}</div>
                    <div className="text-xs text-slate-500">{val.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">Home Base Aerodrome</label>
              <input
                value={local.homeBase}
                onChange={e => update('homeBase', e.target.value.toUpperCase())}
                placeholder="CYEG"
                maxLength={4}
                className="w-40 px-3 py-2 rounded-xl glass border border-white/10 text-sm font-mono uppercase focus:border-primary focus:outline-none"
              />
            </div>
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
                  value={local.nightEndTime.includes('sunset') ? 'sunset' : 'sunrise'}
                  onChange={e => {
                    const base = e.target.value;
                    const mins = local.nightEndTime.includes('+') 
                      ? local.nightEndTime.split('+')[1] 
                      : local.nightEndTime.split('-')[1] || '0';
                    update('nightEndTime', `${base}+${mins}`);
                  }}
                  className="px-3 py-2 rounded-xl glass border border-white/10 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="sunset">Sunset</option>
                  <option value="sunrise">Sunrise</option>
                </select>
                <span className="text-slate-400 text-sm">±</span>
                <input
                  type="number"
                  value={parseInt(local.nightEndTime.split(/[+-]/)[1] || '30', 10)}
                  onChange={e => {
                    const base = local.nightEndTime.includes('sunset') ? 'sunset' : 'sunrise';
                    const sign = local.nightEndTime.includes('+') ? '+' : '-';
                    update('nightEndTime', `${base}${sign}${e.target.value}`);
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

        {/* IFR Time Calculation */}
        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">IFR Time Calculation</h2>
          <div className="mb-4">
            <label className="text-sm text-slate-400 mb-1 block">IFR Time Deduction</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0"
                max="60"
                value={local.ifrDeductionMinutes ?? 12}
                onChange={e => update('ifrDeductionMinutes', parseInt(e.target.value))}
                className="w-20 px-3 py-2 rounded-xl glass border border-white/10 text-sm font-mono"
              />
              <span className="text-sm text-slate-400">minutes (subtracted from total time for IFR calculation)</span>
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
                  value={parseInt(local.nightLandingStart.split(/[+-]/)[1] || '60', 10)}
                  onChange={e => {
                    const base = local.nightLandingStart.includes('sunset') ? 'sunset' : 'sunrise';
                    const sign = local.nightLandingStart.includes('+') ? '+' : '-';
                    update('nightLandingStart', `${base}${sign}${e.target.value}`);
                  }}
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
                  value={parseInt(local.nightLandingEnd.split(/[+-]/)[1] || '60', 10)}
                  onChange={e => {
                    const base = local.nightLandingEnd.includes('sunset') ? 'sunset' : 'sunrise';
                    const sign = local.nightLandingEnd.includes('+') ? '+' : '-';
                    update('nightLandingEnd', `${base}${sign}${e.target.value}`);
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

        {/* Display */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-success" />
            <h2 className="text-lg font-semibold">Display</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Decimal precision</label>
              <select
                value={local.totalTimeDecimals}
                onChange={e => update('totalTimeDecimals', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl glass border border-white/10 text-sm focus:border-primary focus:outline-none"
              >
                <option value={1}>1 decimal place</option>
                <option value={2}>2 decimal places</option>
                <option value={3}>3 decimal places</option>
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

        {/* Flight Templates */}
        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Flight Templates</h2>
          <p className="text-sm text-slate-400 mb-4">
            Manage flight templates for quick data entry. Define which fields are visible and how they calculate automatically.
          </p>
          
          <div className="mb-4">
            <label className="text-sm text-slate-400 mb-1 block">Default Flight Template</label>
            <select
              value={local.defaultTemplateId ?? ''}
              onChange={e => update('defaultTemplateId', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-xl glass border border-white/10 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">— No Default (Show All Fields) —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3 mb-4">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <span className="font-medium">{t.name}</span>
                    {settings.defaultTemplateId === t.id && (
                      <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent text-xs">Default</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{t.description || 'No description'}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingTemplate(t); setShowEditor(true); }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => onDeleteTemplate(t.id)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/20 text-xs hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            
            {templates.length === 0 && (
              <p className="text-center text-sm text-slate-500 py-4">No templates created yet</p>
            )}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => { 
                setEditingTemplate({
                  id: 0,
                  name: '',
                  description: '',
                  visible_fields: ['air_time','pic','dual','night','actual_imc','simulated','ldg_day','ldg_night'],
                  calculations: {},
                  defaults: {},
                  icon: '✈️',
                  color: 'blue'
                }); 
                setShowEditor(true); 
              }}
              className="px-4 py-2 rounded-xl btn-primary text-white text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create New Template
            </button>
          </div>
        </section>

        {/* Template Editor Modal */}
        {showEditor && editingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditor(false)} />
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl glass border border-white/15 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">
                  {editingTemplate.id ? 'Edit Template' : 'New Template'}
                </h3>
                <button onClick={() => setShowEditor(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 uppercase">Template Name</label>
                    <input
                      value={editingTemplate.name}
                      onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 uppercase">Icon</label>
                    <div className="grid grid-cols-8 gap-1 mb-2">
                      {['✈️', '🚁', '🚑', '🚒', '🚓', '🛸', '🌲', '🏔️', 
                       '🌊', '🔥', '⚡', '🎯', '📦', '🚜', '🏭', '💨',
                       '✈️', '🛩️', '🛫', '🛬', '🔍', '🆘', '🏥', '🎓',
                       '📋', '✅', '⚠️', '🛡️', '🚀', '⚙️', '🔧', '💼'
                      ].map(icon => (
                        <button
                          key={icon}
                          onClick={() => setEditingTemplate({ ...editingTemplate, icon })}
                          className={`p-1 rounded text-lg ${
                            editingTemplate.icon === icon 
                              ? 'bg-primary/30 ring-1 ring-primary' 
                              : 'hover:bg-white/10'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <input
                      value={editingTemplate.icon}
                      onChange={e => setEditingTemplate({ ...editingTemplate, icon: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm"
                      maxLength={2}
                      placeholder="Or enter custom"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase">Description</label>
                  <input
                    value={editingTemplate.description || ''}
                    onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase">Visible Fields</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 bg-white/5 rounded-xl">
                    <div className="col-span-full mb-2">
                      <span className="text-xs text-accent">Basic fields (always visible):</span>
                      <span className="text-xs text-slate-500 ml-2">Total Time, PIC, Night, XC, IMC, Day/Night Landings</span>
                    </div>
                    {[
                      ['sic', 'SIC'], ['dual', 'Dual'], ['simulated', 'Sim IMC'],
                      ['xc_over_50nm', 'XC >50nm'], ['right_seat', 'Right Seat'], 
                      ['multi_pilot', 'Multi Pilot'], ['pilot_flying', 'Pilot Flying'],
                      ['holds', 'Holds'], 
                      ['ems', 'EMS/Medevac'], ['ppc', 'PPC'],
                      ['training', 'Training'], ['checkride', 'Checkride'],
                      ['flight_review', 'Flight Review'], ['ipc', 'IPC'],
                      ['aerial_work', 'Aerial Work'], ['search_and_rescue', 'SAR'],
                      ['aerobatic_time', 'Aerobatic Time'], ['banner_towing', 'Banner Towing'],
                      ['glider_towing', 'Glider Towing'], ['formation', 'Formation'],
                      ['low_level', 'Low Level'], ['mountain', 'Mountain Flying'],
                      ['offshore', 'Offshore'], ['bush', 'Bush'], ['combat', 'Combat'],
                      ['sling_load', 'Sling Load'], ['hoist', 'Hoist'],
                      ['pic_name', 'PIC Name'], ['sic_name', 'SIC/Student Name'], ['route', 'Route']
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editingTemplate.visible_fields.includes(key)}
                          onChange={e => {
                            if (e.target.checked) {
                              setEditingTemplate({
                                ...editingTemplate,
                                visible_fields: [...editingTemplate.visible_fields, key]
                              });
                            } else {
                              setEditingTemplate({
                                ...editingTemplate,
                                visible_fields: editingTemplate.visible_fields.filter(f => f !== key)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase">Auto-Populate When Pressing "Populate"</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-white/5 rounded-xl">
                    {[
                      ['sic', 'SIC = Total'], ['dual', 'Dual = Total'], 
                      ['right_seat', 'Right Seat = Total'], ['multi_pilot', 'Multi Pilot = Total'],
                      ['xc', 'XC = Total'], ['xc_over_50nm', 'XC >50nm = Total'],
                      ['ifr', 'IFR Time'], ['pilot_flying', 'Pilot Flying = Total'],
                      ['holds', 'Holds']
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Object.prototype.hasOwnProperty.call(editingTemplate.calculations ?? {}, key)}
                          onChange={e => {
                            const newCalcs = { ...editingTemplate.calculations };
                            if (e.target.checked) {
                              if (key === 'ifr') {
                                newCalcs[key] = 'ifr_time';
                              } else {
                                newCalcs[key] = 'air_time';
                              }
                            } else {
                              delete newCalcs[key];
                            }
                            setEditingTemplate({ ...editingTemplate, calculations: newCalcs });
                          }}
                          className="rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase">Default Values (Flags)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-white/5 rounded-xl">
                    {[
                      ['ems', 'EMS'], 
                      ['training', 'Training'], ['checkride', 'Checkride'],
                      ['flight_review', 'Flight Review'], ['ipc', 'IPC'], ['ppc', 'PPC'],
                      ['aerial_work', 'Aerial Work'], ['search_and_rescue', 'SAR']
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editingTemplate.defaults?.[key] || false}
                          onChange={e => {
                            const newDefaults = { ...editingTemplate.defaults };
                            if (e.target.checked) {
                              newDefaults[key] = true;
                            } else {
                              delete newDefaults[key];
                            }
                            setEditingTemplate({ ...editingTemplate, defaults: newDefaults });
                          }}
                          className="rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                  <button 
                    onClick={() => setShowEditor(false)}
                    className="px-4 py-2 rounded-xl hover:bg-white/10 text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      onSaveTemplate(editingTemplate);
                      setShowEditor(false);
                    }}
                    className="px-5 py-2 rounded-xl btn-primary text-white text-sm"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
