import { addDays } from './day';
import { elapsedMs } from './focus';
import { isActive, weekDays, weekStart, weeklyTarget } from './habits';
import { activeMissions } from './missions';
import type { Action, DayKey, DayRecord, FocusSession, Habit, HabitCheck, Mission, Timestamp } from './types';

/**
 * The weekly check-in: two minutes on Sunday (or Monday) to look back at the week,
 * name what got in the way, and choose which goal comes first next week.
 * Pure functions; see data/week.ts for storage.
 */

/** One-tap reasons for "What got in the way?". */
export const BLOCKERS = ['Tired', 'Busy', 'My phone', 'Low mood', 'Planned too much', 'Got sick', 'Unclear what to do'] as const;
export type Blocker = (typeof BLOCKERS)[number];

export interface WeekReview {
  /** Monday of the reviewed week (the key). */
  week: DayKey;
  blockers: string[];
  note?: string;
  /** The goal that comes first next week. */
  focusGoalId?: string;
  at: Timestamp;
}

function weekday(day: DayKey): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12).getDay(); // 0 = Sunday
}

/**
 * Which week a review opened today is about: on Sunday, the week ending today; on Monday,
 * the week that just ended; any other day (opened by hand), this week so far.
 */
export function reviewWeek(today: DayKey): DayKey {
  return weekday(today) === 1 ? addDays(weekStart(today), -7) : weekStart(today);
}

/** Today offers the check-in on Sundays and Mondays, until that week has been reviewed. */
export function weekReviewDue(today: DayKey, reviewed: ReadonlySet<DayKey>): boolean {
  const wd = weekday(today);
  return (wd === 0 || wd === 1) && !reviewed.has(reviewWeek(today));
}

export interface WeekSummary {
  week: DayKey;
  /** The reviewed days so far (Mon–Sun, never past today). */
  days: { day: DayKey; active: boolean }[];
  activeCount: number;
  feelings: { good: number; okay: number; rough: number };
  focusMs: number;
  tasksDone: number;
  /** Titles of tasks done this week, most recent first (at most 5). */
  wins: string[];
  goals: { id: string; title: string; steps: number; focusMs: number }[];
  habits: { id: string; title: string; done: number; target: number }[];
}

export function summariseWeek(
  week: DayKey,
  today: DayKey,
  dayOf: (t: Timestamp) => DayKey,
  data: {
    actions: readonly Action[];
    sessions: readonly FocusSession[];
    checks: readonly HabitCheck[];
    days: readonly DayRecord[];
    missions: readonly Mission[];
    habits: readonly Habit[];
  },
): WeekSummary {
  const keys = weekDays(week).filter((d) => d <= today);
  const inWeek = new Set(keys);
  const done = data.actions
    .filter((a) => !a.deletedAt && a.state === 'done' && a.completedAt !== undefined && inWeek.has(dayOf(a.completedAt)))
    .sort((a, b) => b.completedAt! - a.completedAt!);
  const sessions = data.sessions.filter((s) => !s.deletedAt && s.finishedAt !== undefined && inWeek.has(dayOf(s.finishedAt)));
  const sessionMs = (s: FocusSession) => elapsedMs(s.segments, s.finishedAt!);
  const records = data.days.filter((d) => inWeek.has(d.day));

  const active = new Set<DayKey>([
    ...done.map((a) => dayOf(a.completedAt!)),
    ...sessions.map((s) => dayOf(s.finishedAt!)),
    ...data.checks.filter((c) => inWeek.has(c.day)).map((c) => c.day),
    ...records.filter((r) => r.smallWin).map((r) => r.day),
  ]);
  const feelings = { good: 0, okay: 0, rough: 0 };
  for (const r of records) if (r.feeling) feelings[r.feeling] += 1;

  const actionGoal = new Map(data.actions.map((a) => [a.id, a.missionId]));
  return {
    week,
    days: keys.map((day) => ({ day, active: active.has(day) })),
    activeCount: keys.filter((d) => active.has(d)).length,
    feelings,
    focusMs: sessions.reduce((t, s) => t + sessionMs(s), 0),
    tasksDone: done.length,
    wins: done.slice(0, 5).map((a) => a.title),
    goals: activeMissions(data.missions).map((m) => ({
      id: m.id,
      title: m.title,
      steps: done.filter((a) => a.missionId === m.id).length,
      focusMs: sessions.filter((s) => actionGoal.get(s.actionId) === m.id).reduce((t, s) => t + sessionMs(s), 0),
    })),
    habits: data.habits
      .filter(isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((h) => ({
        id: h.id,
        title: h.title,
        done: data.checks.filter((c) => c.habitId === h.id && inWeek.has(c.day)).length,
        target: weeklyTarget(h),
      })),
  };
}

/** The most common blockers across past reviews, most frequent first (for "Lately: …"). */
export function commonBlockers(reviews: readonly WeekReview[], limit = 2): string[] {
  const counts = new Map<string, number>();
  for (const r of reviews) for (const b of r.blockers) counts.set(b, (counts.get(b) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([b]) => b);
}

/** Goals in suggestion order: the week's focus goal first, then the usual order. */
export function orderGoals(goals: readonly Mission[], focusGoalId: string | undefined): Mission[] {
  if (!focusGoalId) return [...goals];
  return [...goals].sort((a, b) => (a.id === focusGoalId ? -1 : b.id === focusGoalId ? 1 : 0));
}
