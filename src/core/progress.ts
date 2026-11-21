import { lastDays } from './day';
import { elapsedMs } from './focus';
import type { Action, DayKey, FocusSession, HabitCheck, Timestamp } from './types';

/**
 * Honest progress. Only real units, never points. See docs/product-brief.md §4.7.
 *
 * Active day: a day with at least one completed task, one finished Focus session, or one ticked habit.
 */

type DayOf = (t: Timestamp) => DayKey;

function finished(sessions: readonly FocusSession[]): FocusSession[] {
  return sessions.filter((s) => !s.deletedAt && s.finishedAt !== undefined);
}

function completed(actions: readonly Action[]): Action[] {
  return actions.filter((a) => !a.deletedAt && a.state === 'done' && a.completedAt !== undefined);
}

export function activeDays(
  actions: readonly Action[],
  sessions: readonly FocusSession[],
  dayOf: DayOf,
  checks: readonly HabitCheck[] = [],
): Set<DayKey> {
  const days = new Set<DayKey>(checks.map((c) => c.day));
  for (const a of completed(actions)) days.add(dayOf(a.completedAt!));
  for (const s of finished(sessions)) days.add(dayOf(s.finishedAt!));
  return days;
}

export interface Summary {
  actionsDone: number;
  focusMs: number;
}

/** What happened on the given days (completions and finished Focus sessions, by the day they ended). */
export function summarise(days: readonly DayKey[], actions: readonly Action[], sessions: readonly FocusSession[], dayOf: DayOf): Summary {
  const wanted = new Set(days);
  return {
    actionsDone: completed(actions).filter((a) => wanted.has(dayOf(a.completedAt!))).length,
    focusMs: finished(sessions)
      .filter((s) => wanted.has(dayOf(s.finishedAt!)))
      .reduce((t, s) => t + elapsedMs(s.segments, s.finishedAt!), 0),
  };
}

export interface WeekSummary extends Summary {
  /** The last seven days, oldest first, each marked active or not. */
  days: { day: DayKey; active: boolean }[];
  activeCount: number;
}

export function lastSevenDays(
  today: DayKey,
  actions: readonly Action[],
  sessions: readonly FocusSession[],
  dayOf: DayOf,
  checks: readonly HabitCheck[] = [],
): WeekSummary {
  const keys = lastDays(today, 7);
  const active = activeDays(actions, sessions, dayOf, checks);
  const days = keys.map((day) => ({ day, active: active.has(day) }));
  return { ...summarise(keys, actions, sessions, dayOf), days, activeCount: days.filter((d) => d.active).length };
}

/** The all-time record. It never goes down. */
export function allTime(actions: readonly Action[], sessions: readonly FocusSession[]): Summary {
  return {
    actionsDone: completed(actions).length,
    focusMs: finished(sessions).reduce((t, s) => t + elapsedMs(s.segments, s.finishedAt!), 0),
  };
}

/** Focused minutes on each of the given days (by the day a session finished), oldest first. */
export function focusMinutesByDay(days: readonly DayKey[], sessions: readonly FocusSession[], dayOf: DayOf): { day: DayKey; minutes: number }[] {
  const totals = new Map<DayKey, number>(days.map((d) => [d, 0]));
  for (const s of finished(sessions)) {
    const d = dayOf(s.finishedAt!);
    if (totals.has(d)) totals.set(d, totals.get(d)! + elapsedMs(s.segments, s.finishedAt!));
  }
  return days.map((day) => ({ day, minutes: Math.round((totals.get(day) ?? 0) / 60_000) }));
}

/** A tidy top for a bar chart's axis: 30, 60, 90, 120, 180, 240… minutes. */
export function niceMinutesMax(maxMinutes: number): number {
  const steps = [30, 60, 90, 120, 180, 240, 360, 480, 600, 720];
  return steps.find((s) => s >= maxMinutes) ?? Math.ceil(maxMinutes / 60) * 60;
}
