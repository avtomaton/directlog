import { Flight, CurrencyStatus, CurrencyEvent } from '../types';

/**
 * Calculates EASA Part-FCL currency status.
 *
 * Key rules (EASA Part-FCL.060 / Part-FCL.740):
 *  LAPL(A) / PPL(A) — Validity period of privileges:
 *    For PPL: Within preceding 24 months, pass proficiency check OR
 *    Have 12 hours PIC in last 12 months including:
 *      - 12 hours flight time
 *      - 12 takeoffs and landings
 *      - Refresher training with instructor (if < 6 hrs in 12 months)
 *    Night rating: Within preceding 24 months, 5 night flights including
 *      takeoffs and landings, OR proficiency check
 *  IFR rating: Within preceding 12 months, proficiency check OR
 *    6 instrument approaches, 2 hours instrument flight in preceding 6 months
 *  Medical: Valid medical required (not tracked here)
 */
export function calculateEASACurrency(
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

  const twoYearsAgo = subtractMonths(now, 24);
  const twelveMonthsAgo = subtractMonths(now, 12);
  const sixMonthsAgo = subtractMonths(now, 6);

  const sortedFlights = [...flights].sort((a, b) => b.date.localeCompare(a.date));
  const lastFlight = sortedFlights[0];

  // --- 24-month revalidation (EASA Part-FCL.060 / FCL.740) ---
  // Option A: Proficiency check within 24 months
  const proficiencyCheckTypes = ['proficiency_check', 'skill_test', 'opc', 'lpc'];
  const twoYearEvents = events
    .filter(e => proficiencyCheckTypes.includes(e.type) && new Date(e.date) >= twoYearsAgo)
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastProfCheck = twoYearEvents[0];

  // Option B: 12 hours PIC in last 12 months, 12 T/Os + ldgs
  const twelveMonthFlights = sortedFlights.filter(f => new Date(f.date) >= twelveMonthsAgo);
  const picHours12mo = twelveMonthFlights.reduce((s, f) => s + f.pic, 0);
  const totalLandings12mo = twelveMonthFlights.reduce((s, f) => s + f.ldg_day + f.ldg_night, 0);
  const twelveHourCurrent = picHours12mo >= 12 && totalLandings12mo >= 12;

  const twoYearCurrent = !!lastProfCheck || twelveHourCurrent;
  const twoYearDue = lastProfCheck
    ? addYears(new Date(lastProfCheck.date), 2)
    : (twelveMonthFlights.length > 0
      ? addMonths(new Date(twelveMonthFlights[twelveMonthFlights.length - 1].date), 24)
      : addYears(now, -1));

  // --- Night currency (EASA) — 5 night flights in 24 months ---
  const nightFlights24mo = sortedFlights.filter(f => {
    const d = new Date(f.date);
    return d >= twoYearsAgo && (f.ldg_night > 0 || (f.night ?? 0) > 0);
  });
  const nightFlightCount = nightFlights24mo.length;
  const lastNightFlight = nightFlights24mo[0];
  const nightCurrent = nightFlightCount >= 5;

  // --- IFR currency (EASA) — 6 approaches + 2 hrs instrument in 6 months, or proficiency check ---
  const sixMonthFlights = sortedFlights.filter(f => new Date(f.date) >= sixMonthsAgo);
  const approaches = sixMonthFlights.reduce((s, f) => s + (f.approaches?.length ?? 0), 0);
  const instHours = sixMonthFlights.reduce(
    (s, f) => s + (f.actual_imc ?? 0) + (f.simulated ?? 0), 0
  );

  const ifrProfCheck = events
    .filter(e => ['instrument_proficiency', 'ir_check'].includes(e.type) && new Date(e.date) >= twelveMonthsAgo)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  let ifrCurrent = false;
  let inGracePeriod = false;

  if (ifrProfCheck) {
    ifrCurrent = true;
    inGracePeriod = true;
  } else {
    // EASA: 6 approaches + 2 hours instrument in preceding 6 months
    ifrCurrent = approaches >= 6 && instHours >= 2;
    inGracePeriod = false;
  }

  // --- 5-year recency — EASA doesn't have a strict 5-year rule,
  //     but we track it for general recency ---
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
      lastActivity: lastProfCheck?.date || (twelveMonthFlights.length > 0 ? twelveMonthFlights[0].date : undefined),
      due: twoYearDue.toISOString().split('T')[0],
      type: lastProfCheck?.type ?? (twelveHourCurrent ? 'experience' : undefined),
    },
    passengerDay: {
      current: totalLandings12mo >= 12,
      count: totalLandings12mo,
      required: 12,
      lastDate: twelveMonthFlights[0]?.date,
      expires: twelveMonthFlights.length > 0
        ? addYears(new Date(twelveMonthFlights[0].date), 1).toISOString().split('T')[0]
        : undefined,
    },
    passengerNight: {
      current: nightCurrent,
      count: nightFlightCount,
      required: 5,
      lastDate: lastNightFlight?.date,
      expires: lastNightFlight
        ? addMonths(new Date(lastNightFlight.date), 24).toISOString().split('T')[0]
        : undefined,
    },
    ifr: {
      current: ifrCurrent,
      lastTest: ifrProfCheck?.date,
      testDue: ifrProfCheck
        ? addYears(new Date(ifrProfCheck.date), 1).toISOString().split('T')[0]
        : undefined,
      approaches,
      hours: Math.round(instHours * 10) / 10,
      approachesRequired: 6,
      hoursRequired: 2,
      inGracePeriod,
    },
  };
}
