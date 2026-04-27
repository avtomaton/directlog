import { describe, it, expect } from 'vitest';
import {
  timeToHours,
  calculateDuration,
  calculateSunTimes,
  parseTimeOffset,
  calculateNightTime,
  evaluateCalculation,
} from '../utils/flightUtils';
import { defaultSettings } from '../utils/defaultSettings';

describe('flightUtils', () => {
  describe('timeToHours', () => {
    it('should convert HH:MM format to decimal hours', () => {
      expect(timeToHours('01:30')).toBe(1.5);
      expect(timeToHours('02:00')).toBe(2);
      expect(timeToHours('00:45')).toBe(0.75);
    });

    it('should handle zero values', () => {
      expect(timeToHours('00:00')).toBe(0);
      expect(timeToHours('00:30')).toBe(0.5);
    });

    it('should handle large hour values', () => {
      expect(timeToHours('12:00')).toBe(12);
      expect(timeToHours('23:59')).toBeCloseTo(23.9833, 3);
    });

    it('should handle empty or invalid input', () => {
      expect(timeToHours('')).toBe(0);
      expect(timeToHours('invalid')).toBe(0);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration between two times', () => {
      expect(calculateDuration('10:00', '12:30')).toBe(2.5);
      expect(calculateDuration('08:00', '10:00')).toBe(2);
    });

    it('should handle times crossing midnight', () => {
      expect(calculateDuration('23:00', '01:00')).toBe(2);
    });

    it('should handle same time (zero duration)', () => {
      expect(calculateDuration('10:00', '10:00')).toBe(0);
    });

    it('should handle short durations', () => {
      expect(calculateDuration('10:00', '10:15')).toBe(0.25);
    });
  });

  describe('calculateSunTimes', () => {
    it('should return sunrise and sunset as Date objects', () => {
      const result = calculateSunTimes('2024-06-21');
      expect(result.sunrise).toBeInstanceOf(Date);
      expect(result.sunset).toBeInstanceOf(Date);
    });

    it('should have sunrise before sunset', () => {
      const result = calculateSunTimes('2024-06-21');
      expect(result.sunrise.getTime()).toBeLessThan(result.sunset.getTime());
    });

    it('should have longer daylight in summer than winter', () => {
      const summer = calculateSunTimes('2024-06-21', 40.7, -74.0);
      const winter = calculateSunTimes('2024-12-21', 40.7, -74.0);
      // Compare daylight duration (timezone-portable: both times shift equally)
      const summerDayMs = summer.sunset.getTime() - summer.sunrise.getTime();
      const winterDayMs = winter.sunset.getTime() - winter.sunrise.getTime();
      expect(summerDayMs).toBeGreaterThan(winterDayMs);
    });

    it('should return different times for different dates', () => {
      const summer = calculateSunTimes('2024-06-21');
      const winter = calculateSunTimes('2024-12-21');
      expect(summer.sunrise.getTime()).not.toBe(winter.sunrise.getTime());
      expect(summer.sunset.getTime()).not.toBe(winter.sunset.getTime());
    });
  });

  describe('parseTimeOffset', () => {
    const sunrise = new Date('2024-06-21T05:00:00');
    const sunset = new Date('2024-06-21T22:00:00');

    it('should parse sunset with positive offset', () => {
      const result = parseTimeOffset('sunset+30', sunrise, sunset);
      expect(result.getTime()).toBe(sunset.getTime() + 30 * 60000);
    });

    it('should parse sunset with negative offset', () => {
      const result = parseTimeOffset('sunset-60', sunrise, sunset);
      expect(result.getTime()).toBe(sunset.getTime() - 60 * 60000);
    });

    it('should parse sunrise with positive offset', () => {
      const result = parseTimeOffset('sunrise+30', sunrise, sunset);
      expect(result.getTime()).toBe(sunrise.getTime() + 30 * 60000);
    });

    it('should parse sunrise with negative offset', () => {
      const result = parseTimeOffset('sunrise-60', sunrise, sunset);
      expect(result.getTime()).toBe(sunrise.getTime() - 60 * 60000);
    });

    it('should handle sunset/sunrise with no offset', () => {
      expect(parseTimeOffset('sunset', sunrise, sunset).getTime()).toBe(sunset.getTime());
      expect(parseTimeOffset('sunrise', sunrise, sunset).getTime()).toBe(sunrise.getTime());
    });

    it('should return current date for unknown spec', () => {
      const result = parseTimeOffset('12:00', sunrise, sunset);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('calculateNightTime', () => {
    it('should return 0 for empty times', () => {
      expect(calculateNightTime('2024-06-21', '', '22:00', defaultSettings)).toBe(0);
      expect(calculateNightTime('2024-06-21', '10:00', '', defaultSettings)).toBe(0);
    });

    it('should calculate night time for a flight extending into night', () => {
      // Derive flight times relative to sunset so the test is timezone-portable.
      // Flight starts 1h before sunset, ends 2h after sunset.
      // Night starts at sunset+30, so there should be ~1.5h of night time.
      const { sunset } = calculateSunTimes('2024-12-21');
      const flightStart = new Date(sunset.getTime() - 60 * 60000);
      const flightEnd = new Date(sunset.getTime() + 120 * 60000);
      const fmt = (d: Date) =>
        `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      const nightHours = calculateNightTime('2024-12-21', fmt(flightStart), fmt(flightEnd), defaultSettings);
      expect(nightHours).toBeGreaterThan(0);
    });

    it('should return 0 when flight is entirely before night period', () => {
      // A daytime flight should have 0 night hours
      const nightHours = calculateNightTime('2024-06-21', '10:00', '14:00', defaultSettings);
      expect(nightHours).toBe(0);
    });

    it('should handle overnight flights crossing midnight', () => {
      // Flight from 22:00 to 02:00 — should have night time
      const nightHours = calculateNightTime('2024-12-21', '22:00', '02:00', defaultSettings);
      expect(nightHours).toBeGreaterThan(0);
    });

    it('should handle early morning flights in night period', () => {
      // Early morning flight (e.g., 04:00-06:00) may still be before sunrise-30
      const nightHours = calculateNightTime('2024-12-21', '04:00', '07:00', defaultSettings);
      expect(nightHours).toBeGreaterThan(0);
    });

    it('should return 0 for a flight entirely during daytime', () => {
      // 10:00 to 14:00 should be entirely daytime
      const nightHours = calculateNightTime('2024-06-21', '10:00', '14:00', defaultSettings);
      expect(nightHours).toBe(0);
    });
  });

  describe('evaluateCalculation', () => {
    it('should evaluate simple addition', () => {
      expect(evaluateCalculation('a + b', { a: 1, b: 2 })).toBe(3);
    });

    it('should evaluate simple subtraction', () => {
      expect(evaluateCalculation('a - b', { a: 5, b: 3 })).toBe(2);
    });

    it('should evaluate multiplication', () => {
      expect(evaluateCalculation('a * b', { a: 3, b: 4 })).toBe(12);
    });

    it('should evaluate division', () => {
      expect(evaluateCalculation('a / b', { a: 10, b: 2 })).toBe(5);
    });

    it('should respect operator precedence', () => {
      expect(evaluateCalculation('a + b * c', { a: 2, b: 3, c: 4 })).toBe(14);
    });

    it('should handle parentheses', () => {
      expect(evaluateCalculation('(a + b) * c', { a: 2, b: 3, c: 4 })).toBe(20);
    });

    it('should handle negative numbers', () => {
      expect(evaluateCalculation('-a', { a: 5 })).toBe(-5);
    });

    it('should handle division by zero', () => {
      expect(evaluateCalculation('a / 0', { a: 5 })).toBe(0);
    });

    it('should treat unknown variables as 0', () => {
      expect(evaluateCalculation('a + unknown', { a: 5 })).toBe(5);
    });

    it('should handle complex expressions', () => {
      // Simulating IFR deduction: (shutdown - start) - 0.2
      expect(evaluateCalculation('(end - start) - deduction', { end: 10, start: 8, deduction: 0.2 })).toBeCloseTo(1.8, 5);
    });

    it('should return 0 for empty expression', () => {
      expect(evaluateCalculation('', {})).toBe(0);
    });

    it('should handle numeric literals in expressions', () => {
      expect(evaluateCalculation('a * 2 + 3', { a: 5 })).toBe(13);
    });
  });
});
