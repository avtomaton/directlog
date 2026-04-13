import { Flight, CurrencyStatus, CurrencyEvent } from '../types';

export function calculateCurrency(flights: Flight[], events: CurrencyEvent[] = [], asOfDate: Date = new Date()): CurrencyStatus {
  const now = asOfDate;
  const fiveYearsAgo = new Date(now); fiveYearsAgo.setFullYear(now.getFullYear() - 5);
  const twoYearsAgo = new Date(now); twoYearsAgo.setFullYear(now.getFullYear() - 2);
  const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 6);

  const sortedFlights = [...flights].sort((a, b) => b.date.localeCompare(a.date));
  const lastFlight = sortedFlights[0];
  const fiveYearCurrent = lastFlight ? new Date(lastFlight.date) >= fiveYearsAgo : false;

  const twoYearEvents = events.filter(e => ['flight_review', 'seminar', 'self_paced', 'ppc', 'ipc'].includes(e.type) && new Date(e.date) >= twoYearsAgo);
  const lastTwoYear = twoYearEvents.sort((a,b) => b.date.localeCompare(a.date))[0];
  const twoYearCurrent = !!lastTwoYear;
  const twoYearDue = lastTwoYear ? new Date(new Date(lastTwoYear.date).setFullYear(new Date(lastTwoYear.date).getFullYear() + 2)) : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  const sixMonthFlights = sortedFlights.filter(f => new Date(f.date) >= sixMonthsAgo);
  const dayLandings = sixMonthFlights.reduce((sum, f) => sum + f.ldg_day, 0);
  const nightLandings = sixMonthFlights.reduce((sum, f) => sum + f.ldg_night, 0);
  const passengerDayCurrent = dayLandings >= 5;
  const passengerNightCurrent = nightLandings >= 5;
  const lastDayFlight = sixMonthFlights.find(f => f.ldg_day > 0);
  const lastNightFlight = sixMonthFlights.find(f => f.ldg_night > 0);

  const instrumentTests = events.filter(e => ['ipc', 'ppc'].includes(e.type)).sort((a,b) => b.date.localeCompare(a.date));
  const lastInstrumentTest = instrumentTests[0];
  const lastTestDate = lastInstrumentTest ? new Date(lastInstrumentTest.date) : null;
  const testWithin24Months = lastTestDate ? lastTestDate >= twoYearsAgo : false;
  
  let ifrCurrent = false;
  let inGracePeriod = true;
  let approaches = 0;
  let instHours = 0;

  if (lastTestDate) {
    const thirteenMonthsAfterTest = new Date(lastTestDate);
    thirteenMonthsAfterTest.setMonth(thirteenMonthsAfterTest.getMonth() + 13);
    inGracePeriod = now < thirteenMonthsAfterTest;
    
    if (inGracePeriod) {
      ifrCurrent = testWithin24Months;
    } else {
      approaches = sixMonthFlights.reduce((sum, f) => sum + (f.approaches?.length || 0), 0);
      instHours = sixMonthFlights.reduce((sum, f) => sum + (f.actual_imc || 0) + (f.simulated || 0), 0);
      ifrCurrent = testWithin24Months && approaches >= 6 && instHours >= 6;
    }
  }

  return {
    fiveYear: { current: fiveYearCurrent, lastFlight: lastFlight?.date, expires: lastFlight ? new Date(new Date(lastFlight.date).setFullYear(new Date(lastFlight.date).getFullYear() + 5)).toISOString().split('T')[0] : undefined },
    twoYear: { current: twoYearCurrent, lastActivity: lastTwoYear?.date, due: twoYearDue.toISOString().split('T')[0], type: lastTwoYear?.type },
    passengerDay: { current: passengerDayCurrent, count: Math.min(dayLandings, 5), required: 5, lastDate: lastDayFlight?.date, expires: lastDayFlight ? new Date(new Date(lastDayFlight.date).setMonth(new Date(lastDayFlight.date).getMonth() + 6)).toISOString().split('T')[0] : undefined },
    passengerNight: { current: passengerNightCurrent, count: Math.min(nightLandings, 5), required: 5, lastDate: lastNightFlight?.date, expires: lastNightFlight ? new Date(new Date(lastNightFlight.date).setMonth(new Date(lastNightFlight.date).getMonth() + 6)).toISOString().split('T')[0] : undefined },
    ifr: { current: ifrCurrent, lastTest: lastInstrumentTest?.date, testDue: lastTestDate ? new Date(lastTestDate.getFullYear() + 2, lastTestDate.getMonth(), lastTestDate.getDate()).toISOString().split('T')[0] : undefined, approaches, hours: Math.round(instHours * 10) / 10, approachesRequired: 6, hoursRequired: 6, inGracePeriod }
  };
}
