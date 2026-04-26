import { describe, it, expect } from 'vitest';
import { calculateCurrency } from '../utils/carsCalculator';
import { Flight, CurrencyEvent } from '../types';

const asOfDate = new Date('2024-06-15');

const defaultFlight: Flight = {
  id: 1,
  date: '2024-01-01',
  aircraft: 'C-GABC',
  type: 'C172',
  from: 'CYEG',
  to: 'CYEG',
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

describe('CARs Calculator', () => {
  describe('5-year recency', () => {
    it('should be current when last flight is within 5 years', () => {
      const flights = [makeFlight({ date: '2022-01-01' })];
      const result = calculateCurrency(flights, [], asOfDate);
      expect(result.fiveYear.current).toBe(true);
    });

    it('should not be current when no flights exist', () => {
      const result = calculateCurrency([], [], asOfDate);
      expect(result.fiveYear.current).toBe(false);
    });

    it('should not be current when last flight is over 5 years ago', () => {
      const flights = [makeFlight({ date: '2019-01-01' })];
      const result = calculateCurrency(flights, [], asOfDate);
      expect(result.fiveYear.current).toBe(false);
    });
  });

  describe('2-year recency (CAR 401.05(2)(a))', () => {
    it('should be current with a recent flight review', () => {
      const events = [makeEvent({ date: '2023-06-01', type: 'flight_review' })];
      const result = calculateCurrency([], events, asOfDate);
      expect(result.twoYear.current).toBe(true);
    });

    it('should be current with a recent IPC', () => {
      const events = [makeEvent({ date: '2023-06-01', type: 'ipc' })];
      const result = calculateCurrency([], events, asOfDate);
      expect(result.twoYear.current).toBe(true);
    });

    it('should be current with a recent PPC', () => {
      const events = [makeEvent({ date: '2023-06-01', type: 'ppc' })];
      const result = calculateCurrency([], events, asOfDate);
      expect(result.twoYear.current).toBe(true);
    });

    it('should be current with a recent seminar', () => {
      const events = [makeEvent({ date: '2023-06-01', type: 'seminar' })];
      const result = calculateCurrency([], events, asOfDate);
      expect(result.twoYear.current).toBe(true);
    });

    it('should not be current when no qualifying events exist', () => {
      const result = calculateCurrency([], [], asOfDate);
      expect(result.twoYear.current).toBe(false);
    });

    it('should not be current when event is older than 24 months', () => {
      const events = [makeEvent({ date: '2022-05-01', type: 'flight_review' })];
      const result = calculateCurrency([], events, asOfDate);
      expect(result.twoYear.current).toBe(false);
    });
  });

  describe('Passenger day currency (CAR 401.05(2)(b))', () => {
    it('should be current with 5+ day landings in 6 months', () => {
      const flights = Array.from({ length: 5 }, (_, i) =>
        makeFlight({ date: `2024-0${3 + Math.floor(i / 2)}-${10 + i}`, ldg_day: 1, ldg_night: 0 })
      );
      const result = calculateCurrency(flights, [], asOfDate);
      expect(result.passengerDay.current).toBe(true);
      expect(result.passengerDay.count).toBe(5);
      expect(result.passengerDay.required).toBe(5);
    });

    it('should not be current with fewer than 5 day landings', () => {
      const flights = [makeFlight({ date: '2024-04-01', ldg_day: 3, ldg_night: 0 })];
      const result = calculateCurrency(flights, [], asOfDate);
      expect(result.passengerDay.current).toBe(false);
      expect(result.passengerDay.count).toBe(3);
    });

    it('should not count landings older than 6 months', () => {
      const flights = [makeFlight({ date: '2023-12-01', ldg_day: 5, ldg_night: 0 })];
      const result = calculateCurrency(flights, [], asOfDate);
      expect(result.passengerDay.current).toBe(false);
    });
  });

  describe('Passenger night currency', () => {
    it('should be current with 5+ night landings in 6 months', () => {
      const flights = Array.from({ length: 5 }, (_, i) =>
        makeFlight({ date: `2024-0${3 + Math.floor(i / 2)}-${10 + i}`, ldg_day: 0, ldg_night: 1 })
      );
      const result = calculateCurrency(flights, [], asOfDate);
      expect(result.passengerNight.current).toBe(true);
      expect(result.passengerNight.count).toBe(5);
      expect(result.passengerNight.required).toBe(5);
    });

    it('should not be current with fewer than 5 night landings', () => {
      const flights = [makeFlight({ date: '2024-04-01', ldg_day: 0, ldg_night: 2 })];
      const result = calculateCurrency(flights, [], asOfDate);
      expect(result.passengerNight.current).toBe(false);
    });
  });

  describe('IFR recency (CAR 401.05(3) & (3.1))', () => {
    it('should be current with recent IPC in grace period (12 months)', () => {
      const events = [makeEvent({ date: '2024-01-01', type: 'ipc' })];
      const result = calculateCurrency([], events, asOfDate);
      expect(result.ifr.current).toBe(true);
      expect(result.ifr.inGracePeriod).toBe(true);
    });

    it('should be current with recent PPC in grace period', () => {
      const events = [makeEvent({ date: '2024-01-01', type: 'ppc' })];
      const result = calculateCurrency([], events, asOfDate);
      expect(result.ifr.current).toBe(true);
      expect(result.ifr.inGracePeriod).toBe(true);
    });

    it('should not be current with expired IPC (>24 months)', () => {
      const events = [makeEvent({ date: '2022-01-01', type: 'ipc' })];
      const result = calculateCurrency([], events, asOfDate);
      expect(result.ifr.current).toBe(false);
    });

    it('should require 6 approaches + 6 hours instrument after grace period', () => {
      // IPC 13 months ago (outside 12-month grace but within 24 months)
      const events = [makeEvent({ date: '2023-05-01', type: 'ipc' })];
      const flights = [
        makeFlight({
          date: '2024-05-01',
          actual_imc: 6,
          simulated: 0,
          approaches: [
            { type: 'ILS', airport: 'CYEG', actual: true },
            { type: 'ILS', airport: 'CYEG', actual: true },
            { type: 'ILS', airport: 'CYEG', actual: true },
            { type: 'ILS', airport: 'CYEG', actual: true },
            { type: 'ILS', airport: 'CYEG', actual: true },
            { type: 'ILS', airport: 'CYEG', actual: true },
          ],
        }),
      ];
      const result = calculateCurrency(flights, events, asOfDate);
      expect(result.ifr.inGracePeriod).toBe(false);
      expect(result.ifr.current).toBe(true);
      expect(result.ifr.approaches).toBe(6);
      expect(result.ifr.hours).toBe(6);
    });

    it('should not be current without IPC and insufficient approaches', () => {
      const result = calculateCurrency([], [], asOfDate);
      expect(result.ifr.current).toBe(false);
      expect(result.ifr.inGracePeriod).toBe(false);
    });

    it('should track approach and hour counts', () => {
      const flights = [
        makeFlight({
          date: '2024-05-01',
          actual_imc: 2,
          simulated: 1,
          approaches: [
            { type: 'ILS', airport: 'CYEG', actual: true },
            { type: 'RNAV', airport: 'CYYC', actual: true },
          ],
        }),
      ];
      const result = calculateCurrency(flights, [], asOfDate);
      expect(result.ifr.approaches).toBe(2);
      expect(result.ifr.hours).toBe(3);
      expect(result.ifr.approachesRequired).toBe(6);
      expect(result.ifr.hoursRequired).toBe(6);
    });
  });
});
