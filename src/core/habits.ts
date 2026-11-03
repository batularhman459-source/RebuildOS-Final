import { addDays, daysBetween } from './day';
import type { DayKey, Habit, HabitCheck } from './types';

/**
 * Rules for habits. See docs/product-brief.md (V1.1).
 * A missed day is an empty dot, never a broken streak. Weeks run Monday–Sunday.
 */

/** Monday of the week containing `day`. */
export function weekStart(day: DayKey): DayKey {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const weekday = new Date(y, m - 1, d, 12).getDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}

/** The seven days (Mon–Sun) of the week containing `day`. */
export function weekDays(day: DayKey): DayKey[] {
  const start = weekStart(day);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function checkId(habitId: string, day: DayKey): string {
  return `${habitId}:${day}`;
}

export function isActive(h: Habit): boolean {
  return h.deletedAt === undefined && h.pausedAt === undefined;
}

function checkedDays(habitId: string, checks: readonly HabitCheck[]): Set<DayKey> {
  return new Set(checks.filter((c) => c.habitId === habitId).map((c) => c.day));
}

export function isDoneOn(habitId: string, day: DayKey, checks: readonly HabitCheck[]): boolean {
  return checks.some((c) => c.habitId === habitId && c.day === day);
}

/** Times done in the week containing `day`. */
export function doneThisWeek(habitId: string, day: DayKey, checks: readonly HabitCheck[]): number {
  const days = new Set(weekDays(day));
  return checks.filter((c) => c.habitId === habitId && days.has(c.day)).length;
}

/** How many times the habit is meant to happen in a week. */
export function weeklyTarget(h: Habit): number {
  return h.schedule.kind === 'daily' ? 7 : h.schedule.times;
}

/**
 * Whether a habit shows on Today. Daily habits always do. A weekly habit shows until
 * its target for the week is reached — and still shows on a day it was ticked, so the
 * tick stays visible (and can be undone).
 */
export function showsToday(h: Habit, today: DayKey, checks: readonly HabitCheck[]): boolean {
  if (!isActive(h)) return false;
  if (h.schedule.kind === 'daily') return true;
  return isDoneOn(h.id, today, checks) || doneThisWeek(h.id, today, checks) < h.schedule.times;
}

export interface HabitWeek {
  /** Mon–Sun of this week; future days are `null`. */
  dots: { day: DayKey; done: boolean | null }[];
  done: number;
  target: number;
}

export function habitWeek(h: Habit, today: DayKey, checks: readonly HabitCheck[]): HabitWeek {
  const done = checkedDays(h.id, checks);
  const dots = weekDays(today).map((day) => ({ day, done: day > today ? null : done.has(day) }));
  return { dots, done: dots.filter((d) => d.done).length, target: weeklyTarget(h) };
}

/** Done vs possible over the last `weeks` full weeks before this one (for a calm "lately" line). */
export function recentWeeks(h: Habit, today: DayKey, checks: readonly HabitCheck[], weeks = 4): { done: number; possible: number } {
  const thisWeek = weekStart(today);
  const from = addDays(thisWeek, -7 * weeks);
  const created = new Date(h.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const createdDay = `${created.getFullYear()}-${pad(created.getMonth() + 1)}-${pad(created.getDate())}`;
  let done = 0;
  let possible = 0;
  for (let w = 0; w < weeks; w++) {
    const start = addDays(from, 7 * w);
    const end = addDays(start, 6);
    if (end < createdDay) continue; // the habit didn't exist that week
    const days = weekDays(start);
    done += Math.min(weeklyTarget(h), checks.filter((c) => c.habitId === h.id && days.includes(c.day)).length);
    possible += weeklyTarget(h);
  }
  return { done, possible };
}

/** "Every day", "3× a week". */
export function scheduleLabel(s: Habit['schedule']): string {
  return s.kind === 'daily' ? 'Every day' : `${s.times}× a week`;
}

/** Days since a date, for internal use. */
export function ageInDays(from: DayKey, to: DayKey): number {
  return daysBetween(from, to);
}
