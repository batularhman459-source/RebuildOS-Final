import type { FocusSegment, Timestamp } from './types';

/**
 * Focus time is never counted by a running timer. It is derived from stored
 * start/stop timestamps, so a locked phone, a backgrounded tab or a reload
 * can't corrupt it.
 */

/** Sessions longer than this ask the user to confirm the time (catches forgotten timers). */
export const LONG_SESSION_MS = 3 * 60 * 60 * 1000;

export function isRunning(segments: readonly FocusSegment[]): boolean {
  const last = segments[segments.length - 1];
  return last !== undefined && last.end === undefined;
}

/** Total focused time in ms, counting a running segment up to `now`. Pauses are excluded. */
export function elapsedMs(segments: readonly FocusSegment[], now: Timestamp): number {
  return segments.reduce((total, s) => {
    const end = s.end ?? now;
    return total + Math.max(0, end - s.start);
  }, 0);
}

export function start(now: Timestamp): FocusSegment[] {
  return [{ start: now }];
}

export function pause(segments: readonly FocusSegment[], now: Timestamp): FocusSegment[] {
  if (!isRunning(segments)) return [...segments];
  return segments.map((s, i) => (i === segments.length - 1 ? { ...s, end: now } : s));
}

export function resume(segments: readonly FocusSegment[], now: Timestamp): FocusSegment[] {
  if (isRunning(segments)) return [...segments];
  return [...segments, { start: now }];
}

/** "24:18" under an hour, "1:04:18" from an hour. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm.padStart(2, '0')}:${ss}`;
}

/** "45 min", "1h 20m", "41h 20m" — honest, real units. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
