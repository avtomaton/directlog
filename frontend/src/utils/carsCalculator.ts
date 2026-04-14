import { Flight, CurrencyStatus, CurrencyEvent } from '../types';

/**
 * Calculates CARs 401.05 currency status.
 *
 * Key rules implemented:
 *  401.05(2)(a)  — Flight review / IPC / PPC / seminar / self-paced within 24 months
 *  401.05(2)(b)  — 5 T/O + 5 landings (day) and 5 night T/O + 5 night landings in 6 months
 *                  NOTE: takeoffs are not tracked separately; landings serve as proxy per
 *                  standard Canadian logbook practice.
 *  401.05(3)     — 6 approaches + 6 hrs instrument (actual+sim) in preceding 6 months
 *  401.05(3.1)   — Grace period: if IPC/PPC within preceding 12 months (NOT 13),
 *                  the 6/6 recency requirement is waived.
 *                  The IPC itself must still be within 24 months to remain valid.
 */
export function calculateCurrency(
  flights: Flight[],
  events: CurrencyEvent[] = [],
  asOfDate: Date = new Date()
): CurrencyStatus {
  const now = asOfDate;

  // Calendar-accurate helpers (avoid fixed-day approximations for months/years)
  const subtractMonths = (d: Date, m: number) => {
    const r = new Date(d);
    r.setMonth(r.getMonth() - m);
    return r;
  };
  const addMonths = (d: Date, m: number) => {
    const r = new Date(d);
    r.setMonth(r.getMonth() + m);
    return r;
  };
  const addYears = (d: Date, y: number) => {
    const r = new Date(d);
    r.setFullYear(r.getFullYear() + y);
    return r;
  };

  const fiveYearsAgo    = addYears(now, -5);
  const twoYearsAgo     = subtractMonths(now, 24);
  const twelveMonthsAgo = subtractMonths(now, 12); // Fix: was 13 months, CARs says 12
  const sixMonthsAgo    = subtractMonths(now, 6);

  const sortedFlights = [...flights].sort((a, b) => b.date.localeCompare(a.date));
  const lastFlight = sortedFlights[0];

  // --- 5-year recency ---
  const fiveYearCurrent = lastFlight ? new Date(lastFlight.date) >= fiveYearsAgo : false;

  // --- 2-year recency (CAR 401.05(2)(a)) ---
  const twoYearTypes = ['flight_review', 'seminar', 'self_paced', 'ppc', 'ipc'];
  const twoYearEvents = events
    .filter(e => twoYearTypes.includes(e.type) && new Date(e.date) >= twoYearsAgo)
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastTwoYear = twoYearEvents[0];
  const twoYearCurrent = !!lastTwoYear;
  const twoYearDue = lastTwoYear
    ? addYears(new Date(lastTwoYear.date), 2)
    : addYears(now, -1); // overdue

  // --- Passenger currency (CAR 401.05(2)(b)) ---
  const sixMonthFlights = sortedFlights.filter(f => new Date(f.date) >= sixMonthsAgo);
  const dayLandings   = sixMonthFlights.reduce((s, f) => s + f.ldg_day,   0);
  const nightLandings = sixMonthFlights.reduce((s, f) => s + f.ldg_night, 0);
  const lastDayFlight   = sixMonthFlights.find(f => f.ldg_day   > 0);
  const lastNightFlight = sixMonthFlights.find(f => f.ldg_night > 0);

  // --- IFR recency (CAR 401.05(3) & (3.1)) ---
  const ipcEvents = events
    .filter(e => ['ipc', 'ppc'].includes(e.type))
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastIPC = ipcEvents[0];
  const lastTestDate = lastIPC ? new Date(lastIPC.date) : null;

  // Always compute 6-month instrument recency so the UI can show progress regardless
  const approaches = sixMonthFlights.reduce((s, f) => s + (f.approaches?.length ?? 0), 0);
  const instHours  = sixMonthFlights.reduce(
    (s, f) => s + (f.actual_imc ?? 0) + (f.simulated ?? 0), 0
  );

  let ifrCurrent   = false;
  let inGracePeriod = false; // Fix: was true by default — misleading when no IPC exists

  if (lastTestDate) {
    const ipcWithin24Mo = lastTestDate >= twoYearsAgo;
    const ipcWithin12Mo = lastTestDate >= twelveMonthsAgo; // 12-month grace per (3.1)

    inGracePeriod = ipcWithin12Mo;

    if (inGracePeriod) {
      ifrCurrent = ipcWithin24Mo;               // Grace: just need valid IPC
    } else {
      ifrCurrent = ipcWithin24Mo                 // After grace: IPC still valid AND 6/6
        && approaches  >= 6
        && instHours   >= 6;
    }
  }
  // If no IPC exists: ifrCurrent=false, inGracePeriod=false (correct defaults above)

  return {
    fiveYear: {
      current:    fiveYearCurrent,
      lastFlight: lastFlight?.date,
      expires:    lastFlight
        ? addYears(new Date(lastFlight.date), 5).toISOString().split('T')[0]
        : undefined,
    },
    twoYear: {
      current:      twoYearCurrent,
      lastActivity: lastTwoYear?.date,
      due:          twoYearDue.toISOString().split('T')[0],
      type:         lastTwoYear?.type,
    },
    passengerDay: {
      current:  dayLandings >= 5,
      count:    dayLandings,
      required: 5,
      lastDate: lastDayFlight?.date,
      expires:  lastDayFlight
        ? addMonths(new Date(lastDayFlight.date), 6).toISOString().split('T')[0]
        : undefined,
    },
    passengerNight: {
      current:  nightLandings >= 5,
      count:    nightLandings,
      required: 5,
      lastDate: lastNightFlight?.date,
      expires:  lastNightFlight
        ? addMonths(new Date(lastNightFlight.date), 6).toISOString().split('T')[0]
        : undefined,
    },
    ifr: {
      current:             ifrCurrent,
      lastTest:            lastIPC?.date,
      testDue:             lastTestDate
        ? addYears(lastTestDate, 2).toISOString().split('T')[0]
        : undefined,
      approaches,
      hours:               Math.round(instHours * 10) / 10,
      approachesRequired:  6,
      hoursRequired:       6,
      inGracePeriod,
    },
  };
}
