import { describe, it, expect } from 'vitest';
import { calculateFAACurrency } from '../utils/faaCalculator';
import { Flight, CurrencyEvent } from '../types';

const asOfDate = new Date('2024-06-15');

const defaultFlight: Flight = {
  id: 1,
  date: '2024-01-01',
  aircraft: 'N12345',
  type: 'C172',
  from: 'KJFK',
  to: 'KJFK',
  air_time: 1,
  pic: 1,
  approaches: [],
  ldg_day: 1,
  ldg_night: 0,
};

function makeFlight(overrides: Partial<Flight>): Flight {
  return { ...defaultFlight, ...overrides };
}

const defaultEvent: CurrencyEvent = {
  id: 1,
  date: '2024-01-01',
  type: 'flight_review',
  description: 'Test event',
};

function makeEvent(overrides: Partial<CurrencyEvent>): CurrencyEvent {
  return { ...defaultEvent, ...overrides };
}

describe('FAA Calculator', () => {
  describe('5-year recency', () => {
    it('should be current when last flight is within 5 years', () => {
      const flights = [makeFlight({ date: '2022-01-01' })];
      const result = calculateFAACurrency(flights, [], asOfDate);
      expect(result.fiveYear.current).toBe(true);
    });

    it('should not be current when no flights exist', () => {
      const result = calculateFAACurrency([], [], asOfDate);
      expect(result.fiveYear.current).toBe(false);
    });
  });

  describe('Flight review (61.57(b)) — 24 months', () => {
    it('should be current with a recent flight review', () => {
      const events = [makeEvent({ date: '2023-06-01', type: 'flight_review' })];
      const result = calculateFAACurrency([], events, asOfDate);
      expect(result.twoYear.current).toBe(true);
    });

    it('should not be current when no flight review exists', () => {
      const result = calculateFAACurrency([], [], asOfDate);
      expect(result.twoYear.current).toBe(false);
    });

    it('should not be current when flight review is older than 24 months', () => {
      const events = [makeEvent({ date: '2022-05-01', type: 'flight_review' })];
      const result = calculateFAACurrency([], events, asOfDate);
      expect(result.twoYear.current).toBe(false);
    });
  });

  describe('90-day passenger day currency (61.57(a)(1))', () => {
    it('should be current with 3+ day landings in 90 days', () => {
      const flights = [
        makeFlight({ date: '2024-05-01', ldg_day: 3, ldg_night: 0 }),
      ];
      const result = calculateFAACurrency(flights, [], asOfDate);
      expect(result.passengerDay.current).toBe(true);
      expect(result.passengerDay.count).toBe(3);
      expect(result.passengerDay.required).toBe(3);
    });

    it('should not be current with fewer than 3 day landings', () => {
      const flights = [makeFlight({ date: '2024-05-01', ldg_day: 2, ldg_night: 0 })];
      const result = calculateFAACurrency(flights, [], asOfDate);
      expect(result.passengerDay.current).toBe(false);
    });

    it('should not count landings older than 90 days', () => {
      const flights = [makeFlight({ date: '2024-03-01', ldg_day: 3, ldg_night: 0 })];
      const result = calculateFAACurrency(flights, [], asOfDate);
      expect(result.passengerDay.current).toBe(false);
    });
  });

  describe('90-day passenger night currency (61.57(a)(2))', () => {
    it('should be current with 3+ night landings in 90 days', () => {
      const flights = [
        makeFlight({ date: '2024-05-01', ldg_day: 0, ldg_night: 3 }),
      ];
      const result = calculateFAACurrency(flights, [], asOfDate);
      expect(result.passengerNight.current).toBe(true);
      expect(result.passengerNight.count).toBe(3);
      expect(result.passengerNight.required).toBe(3);
    });

    it('should not be current with fewer than 3 night landings', () => {
      const flights = [makeFlight({ date: '2024-05-01', ldg_day: 0, ldg_night: 1 })];
      const result = calculateFAACurrency(flights, [], asOfDate);
      expect(result.passengerNight.current).toBe(false);
    });
  });

  describe('IFR recency (61.57(c))', () => {
    it('should be current with recent IPC', () => {
      const events = [makeEvent({ date: '2024-01-01', type: 'ipc' })];
      const result = calculateFAACurrency([], events, asOfDate);
      expect(result.ifr.current).toBe(true);
      expect(result.ifr.inGracePeriod).toBe(true);
    });

    it('should be current with 6 approaches and instrument time', () => {
      const flights = [
        makeFlight({
          date: '2024-05-01',
          actual_imc: 1,
          simulated: 0,
          approaches: Array.from({ length: 6 }, () => ({ type: 'ILS' as const, airport: 'KJFK', actual: true })),
        }),
      ];
      const result = calculateFAACurrency(flights, [], asOfDate);
      expect(result.ifr.current).toBe(true);
      expect(result.ifr.approaches).toBe(6);
    });

    it('should not be current with insufficient approaches', () => {
      const flights = [
        makeFlight({
          date: '2024-05-01',
          actual_imc: 1,
          simulated: 0,
          approaches: [{ type: 'ILS' as const, airport: 'KJFK', actual: true }],
        }),
      ];
      const result = calculateFAACurrency(flights, [], asOfDate);
      expect(result.ifr.current).toBe(false);
    });

    it('should not be current with no IFR activity', () => {
      const result = calculateFAACurrency([], [], asOfDate);
      expect(result.ifr.current).toBe(false);
      expect(result.ifr.inGracePeriod).toBe(false);
    });
  });
});
