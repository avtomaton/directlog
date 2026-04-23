import { describe, it, expect } from 'vitest';
import { timeToHours, calculateDuration } from '../utils/flightUtils';

describe('flightUtils', () => {
  describe('timeToHours', () => {
    it('should convert HH:MM format to decimal hours', () => {
      expect(timeToHours('01:30')).toBe(1.5);
      expect(timeToHours('02:00')).toBe(2);
      expect(timeToHours('00:45')).toBe(0.75);
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
  });
});
