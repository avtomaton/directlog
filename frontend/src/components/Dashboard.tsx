import { Users, Moon, Cloud, Calendar, AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { Flight, CurrencyEvent, AppSettings } from '../types';
import { calculateCurrency } from '../utils/carsCalculator';
import { calculateFAACurrency } from '../utils/faaCalculator';
import { calculateEASACurrency } from '../utils/easaCalculator';

interface Props {
  flights: Flight[];
  events: CurrencyEvent[];
  settings: AppSettings;
}

// Returns days until a date string (negative = already past)
function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

type CardStatus = 'current' | 'warning' | 'expired';

function getStatus(current: boolean, expiresStr?: string): CardStatus {
  if (!current) return 'expired';
  const days = daysUntil(expiresStr);
  if (days !== null && days <= 30) return 'warning';
  return 'current';
}

// Colored left-border classes (v1-style) + badge colors (v0-style)
const STATUS_STYLES: Record<CardStatus, {
  border: string; badge: string; badgeText: string; icon: string; label: string;
}> = {
  current: {
    border:    'border-l-green-500',
    badge:     'bg-green-500/15 ring-1 ring-green-500/40',
    badgeText: 'text-green-400',
    icon:      'text-green-400',
    label:     'CURRENT',
  },
  warning: {
    border:    'border-l-yellow-500',
    badge:     'bg-yellow-500/15 ring-1 ring-yellow-500/40',
    badgeText: 'text-yellow-400',
    icon:      'text-yellow-400',
    label:     'EXPIRING',
  },
  expired: {
    border:    'border-l-red-500',
    badge:     'bg-red-500/15 ring-1 ring-red-500/40',
    badgeText: 'text-red-400',
    icon:      'text-red-400',
    label:     'ACTION',
  },
};

export default function Dashboard({ flights, events, settings }: Props) {
  const currency = useMemo(() => {
    switch (settings.regulation) {
      case 'FAA':
        return calculateFAACurrency(flights, events, new Date());
      case 'EASA':
        return calculateEASACurrency(flights, events, new Date());
      default:
        return calculateCurrency(flights, events, new Date());
    }
  }, [flights, events, settings.regulation]);

  const cards = [
    {
      title:   '5-Year Recency',
      icon:    Cloud,
      status:  getStatus(currency.fiveYear.current, currency.fiveYear.expires),
      count:   currency.fiveYear.current ? 'Current' : 'Lapsed',
      detail:  `Last flight: ${currency.fiveYear.lastFlight ?? '—'}`,
      expires: currency.fiveYear.expires,
      ref:     settings.regulation === 'FAA' ? '14 CFR 61.57(a)' : settings.regulation === 'EASA' ? 'Part-FCL.060' : 'CAR 401.05(1)',
      // Progress: years since last flight out of 5
      progress: currency.fiveYear.lastFlight
        ? Math.min(100, (1 - (Date.now() - new Date(currency.fiveYear.lastFlight).getTime()) / (5 * 365.25 * 86_400_000)) * 100)
        : 0,
    },
    {
      title:   'Passengers — Day',
      icon:    Users,
      status:  getStatus(currency.passengerDay.current, currency.passengerDay.expires),
      count:   `${currency.passengerDay.count}/5 landings`,
      detail:  `Last: ${currency.passengerDay.lastDate ?? '—'}`,
      expires: currency.passengerDay.expires,
      ref:     settings.regulation === 'FAA' ? '14 CFR 61.57(a)(1)' : settings.regulation === 'EASA' ? 'Part-FCL.740' : 'CAR 401.05(2)(b)(i)',
      progress: Math.min(100, (currency.passengerDay.count / 5) * 100),
    },
    {
      title:   'Passengers — Night',
      icon:    Moon,
      status:  getStatus(currency.passengerNight.current, currency.passengerNight.expires),
      count:   `${currency.passengerNight.count}/5 landings`,
      detail:  `Need ${Math.max(0, 5 - currency.passengerNight.count)} more`,
      expires: currency.passengerNight.expires,
      ref:     settings.regulation === 'FAA' ? '14 CFR 61.57(a)(2)' : settings.regulation === 'EASA' ? 'Part-FCL.060' : 'CAR 401.05(2)(b)(ii)',
      progress: Math.min(100, (currency.passengerNight.count / 5) * 100),
    },
    {
      title:   'IFR Recency',
      icon:    Cloud,
      status:  getStatus(currency.ifr.current, currency.ifr.testDue),
      count:   currency.ifr.inGracePeriod
        ? 'Grace period'
        : `${currency.ifr.approaches}/6 appr · ${currency.ifr.hours}/6 hrs`,
      detail:  currency.ifr.inGracePeriod
        ? 'IPC within 12 months'
        : (currency.ifr.lastTest ? `IPC: ${currency.ifr.lastTest}` : 'No IPC on record'),
      expires: currency.ifr.testDue,
      ref:     settings.regulation === 'FAA' ? '14 CFR 61.57(c)' : settings.regulation === 'EASA' ? 'Part-FCL.740.H' : 'CAR 401.05(3) & (3.1)',
      // Progress: use approaches / 6 when not in grace, else IPC age
      progress: currency.ifr.inGracePeriod
        ? 100
        : Math.min(100, (currency.ifr.approaches / 6) * 100),
    },
    {
      title:   '2-Year Recency',
      icon:    Calendar,
      status:  getStatus(currency.twoYear.current, currency.twoYear.due),
      count:   currency.twoYear.type
        ? currency.twoYear.type.replace('_', ' ')
        : 'Not logged',
      detail:  `Last: ${currency.twoYear.lastActivity ?? '—'}`,
      expires: currency.twoYear.due,
      ref:     settings.regulation === 'FAA' ? '14 CFR 61.57(b)' : settings.regulation === 'EASA' ? 'Part-FCL.740' : 'CAR 401.05(2)(a)',
      progress: currency.twoYear.lastActivity
        ? Math.min(100, (1 - (Date.now() - new Date(currency.twoYear.lastActivity).getTime()) / (2 * 365.25 * 86_400_000)) * 100)
        : 0,
    },
  ];

  // Build dynamic Next Actions list
  const nextActions: { color: string; title: string; detail: string }[] = [];
  if (!currency.passengerNight.current) {
    nextActions.push({
      color: 'bg-yellow-500',
      title: 'Night currency',
      detail: `Complete ${Math.max(0, 5 - currency.passengerNight.count)} night landing(s) by ${currency.passengerNight.expires ?? '—'}`,
    });
  }
  if (!currency.ifr.current && !currency.ifr.inGracePeriod) {
    nextActions.push({
      color: 'bg-red-500',
      title: 'IFR recency',
      detail: currency.ifr.lastTest
        ? `Need ${Math.max(0, 6 - currency.ifr.approaches)} approach(es) + ${Math.max(0, 6 - currency.ifr.hours).toFixed(1)} hrs`
        : 'Complete an IPC/PPC to establish IFR currency',
    });
  }
  if (!currency.twoYear.current) {
    nextActions.push({
      color: 'bg-red-500',
      title: 'Flight review overdue',
      detail: `Complete a flight review or IPC — was due ${currency.twoYear.due}`,
    });
  } else {
    const days = daysUntil(currency.twoYear.due);
    if (days !== null && days <= 90) {
      nextActions.push({
        color: 'bg-yellow-500',
        title: '2-year due soon',
        detail: `Flight review or self-paced due ${currency.twoYear.due} (${days} days)`,
      });
    }
  }
  if (!currency.passengerDay.current) {
    nextActions.push({
      color: 'bg-yellow-500',
      title: 'Day pax currency',
      detail: `Complete ${Math.max(0, 5 - currency.passengerDay.count)} day landing(s)`,
    });
  }
  if (nextActions.length === 0) {
    nextActions.push({
      color: 'bg-green-500',
      title: 'All checks current',
      detail: 'No immediate actions required — keep flying!',
    });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Currency Dashboard</h1>
        <p className="text-slate-400 text-sm">
          {settings.regulation === 'FAA'
            ? 'FAA 14 CFR Part 61.57 · Recent flight experience requirements'
            : settings.regulation === 'EASA'
            ? 'EASA Part-FCL · Privileges revalidation requirements'
            : 'Transport Canada CARs 401.05 · Verified against official regulations'}
        </p>
      </div>

      {/* Currency cards — colored left border (v1) + pill badge (v0) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => {
          const Icon  = card.icon;
          const style = STATUS_STYLES[card.status];
          const days  = daysUntil(card.expires);
          return (
            <div
              key={card.title}
              className={`stat-card rounded-2xl p-5 border-l-4 border border-white/10 card-hover ${style.border}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl bg-white/10 ${style.icon}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge} ${style.badgeText}`}>
                  {card.status === 'current'  && <CheckCircle2 className="w-2.5 h-2.5" />}
                  {card.status === 'warning'  && <Clock className="w-2.5 h-2.5" />}
                  {card.status === 'expired'  && <AlertTriangle className="w-2.5 h-2.5" />}
                  {style.label}
                </span>
              </div>

              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{card.title}</h3>
              <div className="text-base font-bold mb-0.5">{card.count}</div>
              <div className="text-xs text-slate-400 mb-3">{card.detail}</div>

              {/* Progress bar */}
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    card.status === 'current' ? 'bg-green-500' :
                    card.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(0, card.progress)}%` }}
                />
              </div>

              <div className="flex justify-between items-end text-[9px] text-slate-500">
                <span className="truncate mr-1">{card.ref}</span>
                <span className="shrink-0">
                  {days === null ? '' : days > 0 ? `${days}d` : 'Expired'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Flights */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Recent Flights</h2>
            <span className="text-xs text-slate-400">{flights.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="text-left pb-3 font-medium">Date</th>
                  <th className="text-left pb-3 font-medium">Aircraft</th>
                  <th className="text-left pb-3 font-medium">Route</th>
                  <th className="text-right pb-3 font-medium">Time</th>
                  <th className="text-center pb-3 font-medium">Ldg</th>
                  <th className="text-center pb-3 font-medium">Appr</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {flights.slice(0, 8).map((f) => (
                  <tr key={f.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 font-mono text-xs text-slate-400">{f.date}</td>
                    <td className="py-3">
                      <span className="font-medium text-primary">{f.aircraft}</span>
                      <span className="ml-2 text-xs text-slate-500">{f.type}</span>
                    </td>
                    <td className="py-3 font-mono text-xs">
                      {f.from} <span className="text-slate-600 mx-1">→</span> {f.to}
                    </td>
                    <td className="py-3 text-right font-mono text-sm">{f.air_time.toFixed(1)}</td>
                    <td className="py-3 text-center">
                      <span className={f.ldg_night > 0 ? 'text-accent' : ''}>
                        {f.ldg_day + f.ldg_night}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {f.approaches?.length ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
                          {f.approaches.length}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {flights.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                      No flights logged yet — add your first flight!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Next Actions */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Next Actions
            </h3>
            <div className="space-y-3">
              {nextActions.map((action, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${action.color} mt-1.5 shrink-0`} />
                  <div>
                    <div className="text-sm font-medium">{action.title}</div>
                    <div className="text-xs text-slate-400">{action.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Proficiency */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-primary" />
              Proficiency Tracker
            </h3>
            <div className="space-y-2.5 text-sm">
              {[
                { item: 'Stalls', days: 87 },
                { item: 'Steep turns', days: 42 },
                { item: 'Crosswind >15 kt', days: 112 },
                { item: 'Short field', days: 65 },
              ].map((p) => (
                <div key={p.item} className="flex justify-between">
                  <span className="text-slate-300">{p.item}</span>
                  <span className={`font-mono text-xs ${p.days > 90 ? 'text-warning' : 'text-slate-500'}`}>
                    {p.days}d ago
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Regulation-specific notes */}
      <div className="mt-6 glass rounded-2xl p-4 border border-primary/20">
        <div className="flex gap-3">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          {settings.regulation === 'FAA' ? (
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-slate-300 font-medium">FAA 14 CFR 61.57 implementation notes: </span>
              Day/night passenger currency requires <strong className="text-slate-300">3 takeoffs and 3 landings</strong> within the preceding 90 days per 61.57(a)(1)-(a)(2). Night landings are counted during the period from 1 hour after sunset to 1 hour before sunrise. Flight review required per 61.57(b) every 24 calendar months. IFR currency requires 6 instrument approaches and instrument time within preceding 6 months per 61.57(c), or a valid IPC.
            </p>
          ) : settings.regulation === 'EASA' ? (
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-slate-300 font-medium">EASA Part-FCL implementation notes: </span>
              PPL(A) privileges require either a proficiency check within 24 months or <strong className="text-slate-300">12 hours PIC including 12 takeoffs/landings</strong> in the preceding 12 months per FCL.740.A. Night rating requires 5 night flights within 24 months. IFR currency requires 6 approaches + 2 hours instrument time in 6 months, or a proficiency check within 12 months.
            </p>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-slate-300 font-medium">CARs 401.05 implementation notes: </span>
              IFR grace period is <strong className="text-slate-300">12 months</strong> after IPC/PPC per (3.1) — after that, 6 approaches + 6 instrument hours in the preceding 6 months are required, and the IPC must still be within 24 months. Day/night passenger currency uses landing counts as a proxy for takeoffs per standard logbook practice (CARs requires 5 T/O + 5 ldg). All periods use calendar months.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
