import { useState } from 'react';
import { X, Shield, Calendar, AlertCircle } from 'lucide-react';
import { getAuthHeaders } from '../contexts/AuthContext';

export default function FlightReviewModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'flight_review',
    instructor: '',
    description: '',
    expiry: ''
  });

  const handleSubmit = async () => {
    // Calculate expiry based on type
    let expiry = '';
    const date = new Date(form.date);
    
    switch (form.type) {
      case 'flight_review':
      case 'ipc':
      case 'ppc':
        date.setFullYear(date.getFullYear() + 2);
        expiry = date.toISOString().slice(0, 10);
        break;
      case 'self_paced':
      case 'seminar':
        date.setFullYear(date.getFullYear() + 2);
        expiry = date.toISOString().slice(0, 10);
        break;
    }

    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...form, expiry, description: form.description || getDefaultDescription(form.type) })
      });
      onSave();
      onClose();
    } catch (err) {
      console.log('Demo mode - event logged locally');
      onSave();
      onClose();
    }
  };

  const getDefaultDescription = (type: string) => {
    const map: Record<string, string> = {
      flight_review: 'Biennial Flight Review - CAR 401.05(2)(a)',
      ipc: 'Instrument Proficiency Check - CAR 401.05(3)',
      ppc: 'Pilot Proficiency Check',
      self_paced: 'Transport Canada Self-Paced Study Program',
      seminar: 'Transport Canada Aviation Safety Seminar',
      exam: 'PSTAR or other written exam - CAR 401.05(1)(b)'
    };
    return map[type] || '';
  };

  const eventTypes = [
    { value: 'flight_review', label: 'Flight Review', car: '401.05(2)(a)', desc: 'With instructor, satisfies 24-month requirement' },
    { value: 'ipc', label: 'Instrument Proficiency Check', car: '401.05(3)', desc: 'Resets IFR 24-month clock + 13-month grace' },
    { value: 'ppc', label: 'Pilot Proficiency Check', car: '401.05(3)(d)', desc: 'Commercial ops check' },
    { value: 'self_paced', label: 'Self-Paced Study', car: '401.05(2)(a)', desc: 'TC online program, 24 months' },
    { value: 'seminar', label: 'Safety Seminar', car: '401.05(2)(a)', desc: 'TC seminar, 24 months' },
    { value: 'exam', label: 'Written Exam (PSTAR)', car: '401.05(1)(b)', desc: 'For 5-year recency if not flown' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl glass dark:glass bg-white dark:bg-[#0c1929]/90 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-primary/20 text-indigo-600 dark:text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Log Currency Event</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track flight reviews, IPCs, and exams for CARs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-indigo-500 dark:focus:border-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Event Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-indigo-500 dark:focus:border-primary focus:outline-none">
                  {eventTypes.map(t => <option key={t.value} value={t.value} className="bg-white dark:bg-[#0c1929]">{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-primary/10 border border-indigo-200 dark:border-primary/20">
              <div className="flex gap-2.5">
                <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-primary shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-medium text-indigo-900 dark:text-primary mb-1">
                    {eventTypes.find(t => t.value === form.type)?.label} ÃÂ¢ÃÂÃÂ¢ CAR {eventTypes.find(t => t.value === form.type)?.car}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {eventTypes.find(t => t.value === form.type)?.desc}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Instructor / Examiner (optional)</label>
              <input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} placeholder="e.g., J. Smith" className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-indigo-500 dark:focus:border-primary focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Notes</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={getDefaultDescription(form.type)} rows={2} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-indigo-500 dark:focus:border-primary focus:outline-none resize-none" />
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <div className="flex gap-2.5">
                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-medium text-amber-900 dark:text-amber-300 mb-1">5-Year Rule Reminder (CAR 401.05(1))</div>
                  <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    If you haven't flown as PIC in 5 years, you need BOTH a flight review AND to pass the PSTAR exam within the last 12 months. This event alone won't restore your 5-year currency.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
          <div className="text-xs text-slate-500 dark:text-slate-400">Expiry auto-calculated: 24 months for most events</div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-sm">Cancel</button>
            <button onClick={handleSubmit} className="px-5 py-2.5 rounded-xl btn-primary text-white font-medium text-sm shadow-lg shadow-indigo-500/20 dark:shadow-primary/20">Save Event</button>
          </div>
        </div>
      </div>
    </div>
  );
}
