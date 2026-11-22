import { areaOf } from './areas';
import { activeMissions } from './missions';
import { isLive } from './today';
import type { Action, DayKey, Mission, Timestamp } from './types';

/**
 * Suggestions for the main thing. The main thing is always a step on a goal, picked in this order:
 *  1. the goal's open tasks (Today first, then Someday in list order; dated tasks wait for their day),
 *  2. tasks done on that goal again and again ("you keep doing this"),
 *  3. ready-made ideas for the goal's area.
 * Goals take turns so one goal doesn't hog every day. Pure: callers load and save.
 */

export type SuggestionSource = 'open' | 'repeat' | 'idea';

export interface MainSuggestion {
  /** Stable identity across days: goal + normalised title. */
  key: string;
  title: string;
  smaller?: string;
  missionId: string;
  /** Present when the suggestion is an existing open task. */
  actionId?: string;
  estimateMinutes?: number;
  source: SuggestionSource;
  /** For repeats: how many times it was done recently. */
  times?: number;
}

/** A task done this many times on a goal (recently) counts as something you repeat. */
export const REPEAT_MIN_TIMES = 2;
/** How far back repeats are counted. */
export const REPEAT_WINDOW_DAYS = 60;

export function normalise(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function suggestionKey(missionId: string, title: string): string {
  return `${missionId}|${normalise(title)}`;
}

export function keyOfAction(a: Pick<Action, 'missionId' | 'title'>): string | undefined {
  return a.missionId ? suggestionKey(a.missionId, a.title) : undefined;
}

function forGoal(goal: Mission, actions: readonly Action[], today: DayKey, now: Timestamp): MainSuggestion[] {
  const mine = actions.filter((a) => isLive(a) && a.missionId === goal.id);
  const out: MainSuggestion[] = [];
  const seen = new Set<string>();
  const push = (s: MainSuggestion) => {
    if (seen.has(s.key)) return;
    seen.add(s.key);
    out.push(s);
  };

  // 1. Open tasks: Today ones first, then undated (or due) Someday ones in list order.
  const open = mine
    .filter((a) => a.state === 'today' || (a.state === 'later' && (a.targetDay === undefined || a.targetDay <= today)))
    .sort((a, b) => (a.state === 'today' ? 0 : 1) - (b.state === 'today' ? 0 : 1) || a.sortOrder - b.sortOrder);
  for (const a of open) {
    push({
      key: suggestionKey(goal.id, a.title),
      title: a.title,
      smaller: a.smaller,
      missionId: goal.id,
      actionId: a.id,
      estimateMinutes: a.estimateMinutes,
      source: 'open',
    });
  }

  // 2. Repeats: what keeps getting done on this goal, most often first, then most recent.
  const since = now - REPEAT_WINDOW_DAYS * 86_400_000;
  const done = new Map<string, { a: Action; times: number; last: number }>();
  for (const a of mine) {
    if (a.state !== 'done' || a.completedAt === undefined || a.completedAt < since) continue;
    const k = suggestionKey(goal.id, a.title);
    const entry = done.get(k);
    if (entry) {
      entry.times += 1;
      if (a.completedAt > entry.last) entry.last = a.completedAt;
    } else done.set(k, { a, times: 1, last: a.completedAt });
  }
  [...done.entries()]
    .filter(([, v]) => v.times >= REPEAT_MIN_TIMES)
    .sort(([, x], [, y]) => y.times - x.times || y.last - x.last)
    .forEach(([k, v]) =>
      push({ key: k, title: v.a.title, smaller: v.a.smaller, missionId: goal.id, estimateMinutes: v.a.estimateMinutes, source: 'repeat', times: v.times }),
    );

  // 3. Ideas for the goal's area.
  for (const idea of areaOf(goal)?.ideas ?? []) {
    push({ key: suggestionKey(goal.id, idea.title), title: idea.title, smaller: idea.smaller, missionId: goal.id, estimateMinutes: idea.minutes, source: 'idea' });
  }
  return out;
}

/**
 * Every suggestion for today's main thing, best first. Goals take turns: each goal's
 * best suggestion, then each goal's second, and so on. Suggestions in `skip` are left out.
 */
export function mainSuggestions(
  actions: readonly Action[],
  missions: readonly Mission[],
  today: DayKey,
  now: Timestamp,
  skip: readonly string[] = [],
): MainSuggestion[] {
  const skipped = new Set(skip);
  const lists = activeMissions(missions).map((g) => forGoal(g, actions, today, now).filter((s) => !skipped.has(s.key)));
  const out: MainSuggestion[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const l of lists) if (i < l.length) out.push(l[i]!);
  }
  return out;
}

/**
 * What Swap should show next: the first suggestion other than the current main thing.
 * When everything has been skipped, start again from the top (ignoring the skip list).
 */
export function nextSwap(
  actions: readonly Action[],
  missions: readonly Mission[],
  today: DayKey,
  now: Timestamp,
  currentKey: string | undefined,
  skip: readonly string[],
): { suggestion: MainSuggestion; resetSkip: boolean } | undefined {
  const withCurrent = currentKey ? [...skip, currentKey] : [...skip];
  const fresh = mainSuggestions(actions, missions, today, now, withCurrent)[0];
  if (fresh) return { suggestion: fresh, resetSkip: false };
  const again = mainSuggestions(actions, missions, today, now, currentKey ? [currentKey] : [])[0];
  return again ? { suggestion: again, resetSkip: true } : undefined;
}
