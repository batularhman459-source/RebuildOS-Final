import { describe, expect, it } from 'vitest';
import { elapsedMs, formatClock, formatDuration, isRunning, pause, resume, start } from './focus';

const MIN = 60_000;

describe('focus timing', () => {
  it('counts a running session up to now', () => {
    const s = start(0);
    expect(isRunning(s)).toBe(true);
    expect(elapsedMs(s, 25 * MIN)).toBe(25 * MIN);
  });

  it('excludes paused time', () => {
    let s = start(0);
    s = pause(s, 10 * MIN);
    expect(isRunning(s)).toBe(false);
    s = resume(s, 30 * MIN);
    expect(elapsedMs(s, 45 * MIN)).toBe(25 * MIN);
  });

  it('does not change time when paused twice or resumed twice', () => {
    let s = start(0);
    s = pause(s, 5 * MIN);
    s = pause(s, 9 * MIN);
    expect(elapsedMs(s, 60 * MIN)).toBe(5 * MIN);
    s = resume(s, 10 * MIN);
    s = resume(s, 20 * MIN);
    expect(s).toHaveLength(2);
  });

  it('survives a gap such as a locked phone, because time is derived from timestamps', () => {
    const s = start(1_000);
    expect(elapsedMs(s, 1_000 + 90 * MIN)).toBe(90 * MIN);
  });
});

describe('formatting', () => {
  it('formats the clock', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(24 * MIN + 18_000)).toBe('24:18');
    expect(formatClock(64 * MIN + 18_000)).toBe('1:04:18');
  });

  it('formats durations in real units', () => {
    expect(formatDuration(45 * MIN)).toBe('45 min');
    expect(formatDuration(60 * MIN)).toBe('1h');
    expect(formatDuration(41 * 60 * MIN + 20 * MIN)).toBe('41h 20m');
  });
});
