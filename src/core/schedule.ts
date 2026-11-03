import { addDays, daysBetween } from './day';
import type { Action, DayKey } from './types';

/**
 * Dates and times on tasks. A dated task waits in Upcoming and appears on Today by
 * itself on its day. Times only order the day (no reminders yet). Never "overdue":
 * a dated task from a day the app wasn't opened simply appears on Today.
 */

/** Later tasks whose date has arrived and should now be on Today. */
export function dueForToday(actions: readonly Action[], today: DayKey): string[] {
  return actions
    .filter((a) => !a.deletedAt && a.state === 'later' && a.targetDay !== undefined && a.targetDay <= today)
    .map((a) => a.id);
}

/** Order for Today's list: timed tasks first, by time; then the rest in the order added. */
export function compareForToday(a: Action, b: Action): number {
  if (a.time && b.time) return a.time.localeCompare(b.time) || a.sortOrder - b.sortOrder;
  if (a.time) return -1;
  if (b.time) return 1;
  return a.sortOrder - b.sortOrder;
}

/** Later tasks with a future date, soonest first. */
export function upcoming(actions: readonly Action[], today: DayKey): Action[] {
  return actions
    .filter((a) => !a.deletedAt && a.state === 'later' && a.targetDay !== undefined && a.targetDay > today)
    .sort((a, b) => a.targetDay!.localeCompare(b.targetDay!) || compareForToday(a, b));
}

/** "Tomorrow", "Thu 5 Nov", "Mon 14 Dec" — for grouping and showing dates. */
export function dayLabel(day: DayKey, today: DayKey, format: (day: DayKey) => string): string {
  if (day === today) return 'Today';
  if (day === addDays(today, 1)) return 'Tomorrow';
  return format(day);
}

/** Whole days from today until `day` (0 = today). */
export function daysUntil(day: DayKey, today: DayKey): number {
  return daysBetween(today, day);
}

/** "09:30" → valid; anything else → undefined. */
export function normaliseTime(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const m = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}
