import { Flight, CurrencyStatus, CurrencyEvent } from '../types';

/**
 * Calculates FAA 14 CFR 61.57 currency status.
 *
 * Key rules:
 *  61.57(a) — Recent flight experience: Pilot in command
 *    (1) Within preceding 90 days, 3 takeoffs and 3 landings to full stop
 *        in same category/class/type (if type rating required)
 *    (2) Night: Within preceding 90 days, 3 takeoffs and 3 landings to full stop
 *        during period from 1 hour after sunset to 1 hour before sunrise
 *  61.57(b) — Flight review: Within preceding 24 calendar months
 *  61.57(c) — Instrument experience: Within preceding 6 months
 *    6 instrument approaches, holding procedures, and tracking courses
 *    under actual or simulated IFR conditions, OR IPC
 *  61.57(d) — IPC: If instrument experience not met, need IPC
 */
export function calculateFAACurrency(
  flights: Flight[],
  events: CurrencyEvent[] = [],
  asOfDate: Date = new Date()
): CurrencyStatus {
  const now = asOfDate;

  const subtractMonths = (d: Date, m: number) => {
    const r = new Date(d);
    r.setMonth(r.getMonth() - m);
    return r;
  };
  const addYears = (d: Date, y: number) => {
    const r = new Date(d);
    r.setFullYear(r.getFullYear() + y);
    return r;
  };
  const addDays = (d: Date, days: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + days);
    return r;
  };

  const ninetyDaysAgo = addDays(now, -90);
  const sixMonthsAgo = subtractMonths(now, 6);
  const twoYearsAgo = subtractMonths(now, 24);

  const sortedFlights = [...flights].sort((a, b) => b.date.localeCompare(a.date));
  const lastFlight = sortedFlights[0];

  // --- 90-day recency (FAA 61.57(a)(1)) — day takeoffs/landings ---
  const ninetyDayFlights = sortedFlights.filter(f => new Date(f.date) >= ninetyDaysAgo);
  // FAA requires 3 T/Os and 3 ldgs; we use landings as proxy
  const dayLandings = ninetyDayFlights.reduce((s, f) => s + f.ldg_day, 0);
  const lastDayFlight = ninetyDayFlights.find(f => f.ldg_day > 0);

  // --- Night recency (FAA 61.57(a)(2)) — 3 night T/Os and ldgs ---
  // Night landings period: 1 hour after sunset to 1 hour before sunrise
  // We use ldg_night field which should be populated based on night definition settings
  const nightLandings = ninetyDayFlights.reduce((s, f) => s + f.ldg_night, 0);
  const lastNightFlight = ninetyDayFlights.find(f => f.ldg_night > 0);

  // --- Flight review (FAA 61.57(b)) — 24 months ---
  const flightReviewTypes = ['flight_review', 'bfr'];
  const twoYearEvents = events
    .filter(e => flightReviewTypes.includes(e.type) && new Date(e.date) >= twoYearsAgo)
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastFlightReview = twoYearEvents[0];
  const twoYearCurrent = !!lastFlightReview;
  const twoYearDue = lastFlightReview
    ? addYears(new Date(lastFlightReview.date), 2)
    : addYears(now, -1);

  // --- IFR experience (FAA 61.57(c)) — 6 approaches, holding, tracking in 6 months ---
  const sixMonthFlights = sortedFlights.filter(f => new Date(f.date) >= sixMonthsAgo);
  const approaches = sixMonthFlights.reduce((s, f) => s + (f.approaches?.length ?? 0), 0);
  const instHours = sixMonthFlights.reduce(
    (s, f) => s + (f.actual_imc ?? 0) + (f.simulated ?? 0), 0
  );

  // Check for IPC event
  const ipcEvents = events
    .filter(e => ['ipc', 'instrument_check'].includes(e.type))
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastIPC = ipcEvents[0];

  let ifrCurrent = false;
  let inGracePeriod = false;

  if (lastIPC) {
    const ipcDate = new Date(lastIPC.date);
    const ipcWithin24Mo = ipcDate >= twoYearsAgo;
    inGracePeriod = ipcWithin24Mo;
    ifrCurrent = ipcWithin24Mo; // IPC within 24 months keeps you current
  }

  // Without recent IPC, check 6/6 rule
  if (!ifrCurrent) {
    ifrCurrent = approaches >= 6 && instHours >= 1.0; // FAA requires 6 approaches + instrument time
  }

  // --- 5-year recency — FAA doesn't have a strict 5-year rule like CARs,
  //     but we track it for general recency awareness ---
  const fiveYearsAgo = addYears(now, -5);
  const fiveYearCurrent = lastFlight ? new Date(lastFlight.date) >= fiveYearsAgo : false;

  return {
    fiveYear: {
      current: fiveYearCurrent,
      lastFlight: lastFlight?.date,
      expires: lastFlight
        ? addYears(new Date(lastFlight.date), 5).toISOString().split('T')[0]
        : undefined,
    },
    twoYear: {
      current: twoYearCurrent,
      lastActivity: lastFlightReview?.date,
      due: twoYearDue.toISOString().split('T')[0],
      type: lastFlightReview?.type,
    },
    passengerDay: {
      current: dayLandings >= 3,
      count: dayLandings,
      required: 3,
      lastDate: lastDayFlight?.date,
      expires: lastDayFlight
        ? addDays(new Date(lastDayFlight.date), 90).toISOString().split('T')[0]
        : undefined,
    },
    passengerNight: {
      current: nightLandings >= 3,
      count: nightLandings,
      required: 3,
      lastDate: lastNightFlight?.date,
      expires: lastNightFlight
        ? addDays(new Date(lastNightFlight.date), 90).toISOString().split('T')[0]
        : undefined,
    },
    ifr: {
      current: ifrCurrent,
      lastTest: lastIPC?.date,
      testDue: lastIPC
        ? addYears(new Date(lastIPC.date), 2).toISOString().split('T')[0]
        : undefined,
      approaches,
      hours: Math.round(instHours * 10) / 10,
      approachesRequired: 6,
      hoursRequired: 1, // FAA doesn't specify minimum hours, just 6 approaches
      inGracePeriod,
    },
  };
}
