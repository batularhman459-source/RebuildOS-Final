import { daysBetween } from '../core/day';
import type { DayKey } from '../core/types';
import type { WeekReview } from '../core/week';
import { db } from './db';

/** Weekly check-ins, kept in the meta store (no schema change). */

const KEY = 'weekReviews';
/** A focus goal chosen in a review leads suggestions for about a week and a half. */
const FOCUS_DAYS = 10;

export async function getWeekReviews(): Promise<WeekReview[]> {
  return ((await db.meta.get(KEY))?.value as WeekReview[] | undefined) ?? [];
}

export async function saveWeekReview(review: WeekReview): Promise<void> {
  const others = (await getWeekReviews()).filter((r) => r.week !== review.week);
  await db.meta.put({ key: KEY, value: [...others, review].sort((a, b) => a.week.localeCompare(b.week)) });
}

/** The goal that comes first this week, from the latest recent review. */
export async function getFocusGoalId(today: DayKey): Promise<string | undefined> {
  const latest = (await getWeekReviews()).at(-1);
  if (!latest?.focusGoalId) return undefined;
  return daysBetween(latest.week, today) <= 7 + FOCUS_DAYS ? latest.focusGoalId : undefined;
}
