import { describe, expect, it } from 'vitest';
import { addDays, dayKey, daysBetween, lastDays } from './day';

describe('dayKey', () => {
  it('uses the calendar date during the day', () => {
    expect(dayKey(new Date(2026, 10, 2, 9, 0))).toBe('2026-11-02');
  });

  it('keeps late-night work on the previous day until 04:00', () => {
    expect(dayKey(new Date(2026, 10, 3, 0, 30))).toBe('2026-11-02');
    expect(dayKey(new Date(2026, 10, 3, 3, 59))).toBe('2026-11-02');
  });

  it('starts the new day at exactly 04:00', () => {
    expect(dayKey(new Date(2026, 10, 3, 4, 0))).toBe('2026-11-03');
  });

  it('handles month and year boundaries', () => {
    expect(dayKey(new Date(2027, 0, 1, 2, 0))).toBe('2026-12-31');
  });
});

describe('day arithmetic', () => {
  it('counts days between keys', () => {
    expect(daysBetween('2026-11-02', '2026-11-23')).toBe(21);
    expect(daysBetween('2026-11-23', '2026-11-02')).toBe(-21);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });

  it('lists the last seven days oldest first', () => {
    expect(lastDays('2026-11-02', 7)).toEqual([
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
  });
});

describe('relativeDay', () => {
  it('reads naturally', async () => {
    const { relativeDay } = await import('./day');
    expect(relativeDay('2026-11-02', '2026-11-02')).toBe('today');
    expect(relativeDay('2026-11-01', '2026-11-02')).toBe('yesterday');
    expect(relativeDay('2026-10-30', '2026-11-02')).toBe('3 days ago');
  });
});
