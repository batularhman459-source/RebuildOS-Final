import type { Action, DayKey, Timestamp } from './types';

/**
 * Rules for Today. See docs/product-brief.md §4.1 and §4.3.
 * Pure functions only: callers load records, apply the result, and save.
 */

export function isLive(a: Action): boolean {
  return a.deletedAt === undefined;
}

/** The logical day an Action was completed, given a day-key function. */
function completedOn(a: Action, dayOf: (t: Timestamp) => DayKey): DayKey | undefined {
  return a.completedAt === undefined ? undefined : dayOf(a.completedAt);
}

export interface TodayView {
  main?: Action;
  /** Open Today Actions other than the Main Action, in list order. */
  open: Action[];
  /** Actions completed today, most recent last. Shown struck through at the bottom. */
  doneToday: Action[];
}

export function todayView(actions: readonly Action[], today: DayKey, dayOf: (t: Timestamp) => DayKey): TodayView {
  const live = actions.filter(isLive);
  const onToday = live.filter((a) => a.state === 'today').sort(bySortOrder);
  const main = onToday.find((a) => a.isMain);
  return {
    main,
    open: onToday.filter((a) => a !== main),
    doneToday: live
      .filter((a) => a.state === 'done' && completedOn(a, dayOf) === today)
      .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0)),
  };
}

export function laterList(actions: readonly Action[]): Action[] {
  return actions.filter((a) => isLive(a) && a.state === 'later').sort(bySortOrder);
}

export function bySortOrder(a: Action, b: Action): number {
  return a.sortOrder - b.sortOrder;
}

export interface RolloverPlan {
  /** Main Actions from an earlier day: they stay on Today. */
  carry: string[];
  /** Other unfinished Actions from an earlier day: they quietly return to Later. */
  toLater: string[];
}

/**
 * The overnight rule: when a new day starts, the Main Action stays on Today and
 * every other unfinished Today Action from an earlier day goes back to Later.
 * There is no overdue state.
 */
export function planRollover(actions: readonly Action[], today: DayKey): RolloverPlan {
  const stale = actions.filter(
    (a) => isLive(a) && a.state === 'today' && (a.todayDay === undefined || a.todayDay < today),
  );
  return {
    carry: stale.filter((a) => a.isMain).map((a) => a.id),
    toLater: stale.filter((a) => !a.isMain).map((a) => a.id),
  };
}

/** The Action that should become Main when there is none: the first open Today Action. */
export function nextMain(actions: readonly Action[]): Action | undefined {
  return actions.filter((a) => isLive(a) && a.state === 'today' && !a.isMain).sort(bySortOrder)[0];
}
