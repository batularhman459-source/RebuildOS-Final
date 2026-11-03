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
