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

/** Estimate shown under an Action: "About 45 minutes", "About 1 hour", "About 1h 30m". */
export function formatEstimate(minutes: number): string {
  if (minutes < 60) return `About ${minutes} minutes`;
  if (minutes === 60) return 'About 1 hour';
  if (minutes % 60 === 0) return `About ${minutes / 60} hours`;
  return `About ${formatDuration(minutes * 60_000)}`;
}

/** Quick-pick estimates offered when adding or editing an Action. */
export const ESTIMATE_PRESETS = [15, 25, 45, 60, 90] as const;

/** Focus target presets (minutes). The Action's own estimate is offered too. */
export const TARGET_PRESETS = [25, 50, 90] as const;

/**
 * Replace a session's time with exactly `minutes`, ending at `end`.
 * Used when the user corrects a forgotten timer.
 */
export function trimTo(minutes: number, end: Timestamp): FocusSegment[] {
  const ms = Math.max(0, Math.round(minutes)) * 60_000;
  return [{ start: end - ms, end }];
}

/**
 * How large the Apricot glow is while focusing: it grows gently with progress
 * towards the target (or over an hour when there's no target), then holds.
 */
export function glowScale(elapsed: number, targetMinutes?: number): number {
  const span = (targetMinutes ?? 60) * 60_000;
  const progress = Math.min(1, Math.max(0, elapsed / span));
  return 0.85 + 0.35 * progress;
}

/** Time spent in a single session: seconds under a minute ("42 sec"), otherwise like formatDuration. */
export function formatSpent(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))} sec`;
  return formatDuration(ms);
}
