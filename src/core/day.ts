import type { DayKey } from './types';

/** A RebuildOS day starts at 04:00 local time, so late-night work belongs to the day it was part of. */
export const DAY_START_HOUR = 4;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** The logical day a moment belongs to, as "YYYY-MM-DD" in local time. */
export function dayKey(date: Date): DayKey {
  const shifted = new Date(date.getTime());
  shifted.setHours(shifted.getHours() - DAY_START_HOUR);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

/** Midday of a day key in local time — safe for calendar arithmetic across DST changes. */
function middayOf(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: DayKey, to: DayKey): number {
  const ms = middayOf(to).getTime() - middayOf(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** The day key `n` days after `key` (negative to go back). */
export function addDays(key: DayKey, n: number): DayKey {
  const date = middayOf(key);
  date.setDate(date.getDate() + n);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The last `count` day keys ending with `today`, oldest first. */
export function lastDays(today: DayKey, count: number): DayKey[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)));
}

/** "today", "yesterday", "3 days ago" — for "last worked on" lines. */
export function relativeDay(key: DayKey, today: DayKey): string {
  const n = daysBetween(key, today);
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n} days ago`;
}
