import { describe, it, expect } from 'vitest';
import { calculateEASACurrency } from '../utils/easaCalculator';
import { Flight, CurrencyEvent } from '../types';

const asOfDate = new Date('2024-06-15');

const defaultFlight: Flight = {
  id: 1,
  date: '2024-01-01',
  aircraft: 'D-EABC',
  type: 'C172',
  from: 'EDDF',
  to: 'EDDF',
  air_time: 1,
  pic: 1,
  approaches: [],
  ldg_day: 1,
  ldg_night: 0,
};

function makeFlight(overrides: Partial<Flight>): Flight {
  return { ...defaultFlight, ...overrides };
}

// EASA uses event types not in CurrencyEvent['type'], so we cast
const defaultEvent: CurrencyEvent = {
  id: 1,
  date: '2024-01-01',
  type: 'flight_review',
  description: 'Test event',
};

function makeEvent(overrides: Partial<CurrencyEvent>): CurrencyEvent {
  return { ...defaultEvent, ...overrides };
}

describe('EASA Calculator', () => {
  describe('5-year recency', () => {
    it('should be current when last flight is within 5 years', () => {
      const flights = [makeFlight({ date: '2022-01-01' })];
      const result = calculateEASACurrency(flights, [], asOfDate);
      expect(result.fiveYear.current).toBe(true);
    });

    it('should not be current when no flights exist', () => {
      const result = calculateEASACurrency([], [], asOfDate);
      expect(result.fiveYear.current).toBe(false);
    });
  });

  describe('24-month revalidation', () => {
    it('should be current with a recent proficiency check', () => {
      const events = [makeEvent({ date: '2023-06-01', type: 'proficiency_check' })];
      const result = calculateEASACurrency([], events, asOfDate);
      expect(result.twoYear.current).toBe(true);
    });

    it('should be current with 12 hours PIC + 12 landings in 12 months', () => {
      const flights = Array.from({ length: 12 }, (_, i) =>
        makeFlight({
          date: `2024-0${1 + Math.floor(i / 4)}-${10 + i}`,
          pic: 1,
          ldg_day: 1,
          ldg_night: 0,
        })
      );
      const result = calculateEASACurrency(flights, [], asOfDate);
      expect(result.twoYear.current).toBe(true);
      expect(result.twoYear.type).toBe('experience');
    });

    it('should not be current with insufficient PIC hours', () => {
      const flights = Array.from({ length: 6 }, (_, i) =>
        makeFlight({
          date: `2024-0${3 + Math.floor(i / 3)}-${10 + i}`,
          pic: 1,
          ldg_day: 1,
          ldg_night: 0,
        })
      );
      const result = calculateEASACurrency(flights, [], asOfDate);
      expect(result.twoYear.current).toBe(false);
    });

    it('should not be current when no events or sufficient experience', () => {
      const result = calculateEASACurrency([], [], asOfDate);
      expect(result.twoYear.current).toBe(false);
    });
  });

  describe('Passenger day currency', () => {
    it('should be current with 12+ landings in 12 months', () => {
      const flights = Array.from({ length: 12 }, (_, i) =>
        makeFlight({ date: `2024-0${1 + Math.floor(i / 4)}-${10 + i}`, ldg_day: 1, ldg_night: 0 })
      );
      const result = calculateEASACurrency(flights, [], asOfDate);
      expect(result.passengerDay.current).toBe(true);
      expect(result.passengerDay.count).toBe(12);
      expect(result.passengerDay.required).toBe(12);
    });

    it('should not be current with fewer than 12 landings', () => {
      const flights = [makeFlight({ date: '2024-04-01', ldg_day: 5, ldg_night: 0 })];
      const result = calculateEASACurrency(flights, [], asOfDate);
      expect(result.passengerDay.current).toBe(false);
    });
  });

  describe('Night currency', () => {
    it('should be current with 5+ night flights in 24 months', () => {
      const flights = Array.from({ length: 5 }, (_, i) =>
        makeFlight({ date: `2023-0${6 + i}-${10 + i}`, ldg_day: 0, ldg_night: 1, night: 1 })
      );
      const result = calculateEASACurrency(flights, [], asOfDate);
      expect(result.passengerNight.current).toBe(true);
      expect(result.passengerNight.count).toBe(5);
      expect(result.passengerNight.required).toBe(5);
    });

    it('should not be current with fewer than 5 night flights', () => {
      const flights = [makeFlight({ date: '2024-04-01', ldg_day: 0, ldg_night: 2, night: 1 })];
      const result = calculateEASACurrency(flights, [], asOfDate);
      expect(result.passengerNight.current).toBe(false);
    });
  });

  describe('IFR recency', () => {
    it('should be current with recent instrument proficiency check', () => {
      const events = [makeEvent({ date: '2024-01-01', type: 'instrument_proficiency' })];
      const result = calculateEASACurrency([], events, asOfDate);
      expect(result.ifr.current).toBe(true);
      expect(result.ifr.inGracePeriod).toBe(true);
    });

    it('should be current with 6 approaches + 2 hours instrument in 6 months', () => {
      const flights = [
        makeFlight({
          date: '2024-05-01',
          actual_imc: 2,
          simulated: 0,
          approaches: Array.from({ length: 6 }, () => ({ type: 'ILS' as const, airport: 'EDDF', actual: true })),
        }),
      ];
      const result = calculateEASACurrency(flights, [], asOfDate);
      expect(result.ifr.current).toBe(true);
      expect(result.ifr.approaches).toBe(6);
      expect(result.ifr.hours).toBe(2);
    });

    it('should not be current with insufficient approaches', () => {
      const flights = [
        makeFlight({
          date: '2024-05-01',
          actual_imc: 2,
          simulated: 0,
          approaches: [{ type: 'ILS' as const, airport: 'EDDF', actual: true }],
        }),
      ];
      const result = calculateEASACurrency(flights, [], asOfDate);
      expect(result.ifr.current).toBe(false);
    });

    it('should not be current with insufficient instrument hours', () => {
      const flights = [
        makeFlight({
          date: '2024-05-01',
          actual_imc: 0.5,
          simulated: 0,
          approaches: Array.from({ length: 6 }, () => ({ type: 'ILS' as const, airport: 'EDDF', actual: true })),
        }),
      ];
      const result = calculateEASACurrency(flights, [], asOfDate);
      expect(result.ifr.current).toBe(false);
    });

    it('should not be current with no IFR activity', () => {
      const result = calculateEASACurrency([], [], asOfDate);
      expect(result.ifr.current).toBe(false);
      expect(result.ifr.inGracePeriod).toBe(false);
    });

    it('should track required values', () => {
      const result = calculateEASACurrency([], [], asOfDate);
      expect(result.ifr.approachesRequired).toBe(6);
      expect(result.ifr.hoursRequired).toBe(2);
    });
  });
});
