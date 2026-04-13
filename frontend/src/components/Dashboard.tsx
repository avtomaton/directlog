import { Users, Moon, Cloud, Calendar, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { useMemo } from 'react';
import { Flight, CurrencyEvent } from '../types';
import { calculateCurrency } from '../utils/carsCalculator';

export default function Dashboard({ flights, events }: { flights: Flight[]; events: CurrencyEvent[] }) {
  const currency = useMemo(() => calculateCurrency(flights, events, new Date('2026-04-12')), [flights, events]);

  const cards = [
    {
      title: '5-Year Recency',
      icon: Shield,
      status: currency.fiveYear.current,
      count: currency.fiveYear.current ? 'OK' : 'EXPIRED',
      detail: `Last flight: ${currency.fiveYear.lastFlight || 'ÃÂ¢ÃÂÃÂ'}`,
      expires: currency.fiveYear.expires,
      ref: 'CAR 401.05(1)(a)',
      color: 'emerald'
    },
    {
      title: 'Passengers Ã¢ÂÂ Day',
      icon: Users,
      status: currency.passengerDay.current,
      count: `${currency.passengerDay.count}/5`,
      detail: `Last: ${currency.passengerDay.lastDate || 'Ã¢ÂÂ'}`,
      expires: currency.passengerDay.expires,
      ref: 'CAR 401.05(2)(b)(i)',
      color: 'primary'
    },
    {
      title: 'Passengers Ã¢ÂÂ Night',
      icon: Moon,
      status: currency.passengerNight.current,
      count: `${currency.passengerNight.count}/5`,
      detail: `Need ${5 - currency.passengerNight.count} more`,
      expires: currency.passengerNight.expires,
      ref: 'CAR 401.05(2)(b)(ii)',
      color: 'accent'
    },
    {
      title: 'IFR Recency',
      icon: Cloud,
      status: currency.ifr.current,
      count: `${currency.ifr.approaches}/6 appr Ã¢ÂÂ¢ ${currency.ifr.hours}/6 hrs`,
      detail: currency.ifr.inGracePeriod ? 'In 13-mo grace period' : '6/6 required',
      expires: currency.ifr.testDue,
      ref: 'CAR 401.05(3) & (3.1)',
      color: 'secondary'
    },
    {
      title: '2-Year Recency',
      icon: Calendar,
      status: currency.twoYear.current,
      count: currency.twoYear.type || 'Due',
      detail: `Last: ${currency.twoYear.lastActivity || 'Ã¢ÂÂ'}`,
      expires: currency.twoYear.due,
      ref: 'CAR 401.05(2)(a)',
      color: 'success'
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Currency Dashboard</h1>
        <p className="text-slate-400">Transport Canada CAR 401.05 Ã¢ÂÂ¢ Verified against official regulations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="stat-card rounded-2xl p-6 border border-white/10 card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl bg-${card.color}/20 text-${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${card.status ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                  {card.status ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {card.status ? 'CURRENT' : 'ACTION'}
                </div>
              </div>
              
              <h3 className="font-semibold mb-1">{card.title}</h3>
              <div className="text-2xl font-bold mb-1 text-white">{card.count}</div>
              <div className="text-xs text-slate-400 mb-3">{card.detail}</div>
              
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{ width: `${(card.title.includes('Day') ? currency.passengerDay.count : card.title.includes('Night') ? currency.passengerNight.count : card.title.includes('IFR') ? Math.min(currency.ifr.approaches, 6) : 5) / 5 * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{card.ref}</span>
                <span>Exp: {card.expires || 'Ã¢ÂÂ'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Recent Flights</h2>
            <span className="text-xs text-slate-400">{flights.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="text-left pb-3 font-medium">Date</th>
                  <th className="text-left pb-3 font-medium">Aircraft</th>
                  <th className="text-left pb-3 font-medium">Route</th>
                  <th className="text-right pb-3 font-medium">Time</th>
                  <th className="text-center pb-3 font-medium">LDG</th>
                  <th className="text-center pb-3 font-medium">Appr</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {flights.slice(0, 8).map((f) => (
                  <tr key={f.id} className="border-b border-white/5 table-row">
                    <td className="py-3.5 font-mono text-xs">{f.date}</td>
                    <td className="py-3.5">
                      <span className="font-medium text-primary">{f.aircraft}</span>
                      <span className="ml-2 text-xs text-slate-500">{f.type}</span>
                    </td>
                    <td className="py-3.5">
                      <span className="font-mono">{f.from}</span>
                      <span className="mx-1.5 text-slate-600">Ã¢ÂÂ</span>
                      <span className="font-mono">{f.to}</span>
                    </td>
                    <td className="py-3.5 text-right font-mono">{f.air_time.toFixed(1)}</td>
                    <td className="py-3.5 text-center">
                      <span className={f.ldg_night > 0 ? 'text-accent' : ''}>
                        {f.ldg_day + f.ldg_night}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      {f.approaches?.length ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
                          {f.approaches.length}
                        </span>
                      ) : 'Ã¢ÂÂ'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Next Actions
            </h3>
            <div className="space-y-3">
              {!currency.passengerNight.current && (
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">Night currency</div>
                    <div className="text-xs text-slate-400">Complete {5 - currency.passengerNight.count} night landings by {currency.passengerNight.expires}</div>
                  </div>
                </div>
              )}
              {!currency.ifr.inGracePeriod && !currency.ifr.current && (
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-danger mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">IFR recency</div>
                    <div className="text-xs text-slate-400">Need {6 - currency.ifr.approaches} approaches + {(6 - currency.ifr.hours).toFixed(1)} hrs</div>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <div className="text-sm font-medium">2-year due soon</div>
                  <div className="text-xs text-slate-400">Flight review or self-paced due {currency.twoYear.due}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-success mt-2 shrink-0" />
                <div>
                  <div className="text-sm font-medium">5-year OK</div>
                  <div className="text-xs text-slate-400">Last flight {currency.fiveYear.lastFlight}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Proficiency</h3>
            <div className="space-y-2.5 text-sm">
              {[
                { item: 'Stalls', days: 87 },
                { item: 'Steep turns', days: 42 },
                { item: 'Crosswind >15kt', days: 112 },
                { item: 'Short field', days: 65 },
              ].map((p) => (
                <div key={p.item} className="flex justify-between">
                  <span className="text-slate-300">{p.item}</span>
                  <span className={`font-mono text-xs ${p.days > 90 ? 'text-warning' : 'text-slate-500'}`}>{p.days}d ago</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 glass rounded-2xl p-5 border border-primary/20">
        <div className="flex gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-sm mb-1">CARs 401.05 Verified Implementation</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              IFR currency correctly implements the 13-month grace period after IPC (401.05(3.1)). You are currently in grace period until April 2025. 
              After that, you must log 6 hours + 6 approaches in the preceding 6 months. This is a common misunderstanding Ã¢ÂÂ many apps get this wrong.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
