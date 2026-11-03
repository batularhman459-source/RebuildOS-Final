import { DEFAULT_MINIMUM, MAX_MINIMUM_ITEMS, minimumSlots, type MinimumDay } from '../core/rebuild';
import type { DayKey } from '../core/types';
import { db } from './db';
import { startSmallDay } from './days';

/** My minimum day: the bad-day plan, set once, started with one tap. */

const KEY = 'minimumDay';

export async function getMinimum(): Promise<MinimumDay> {
  const saved = (await db.meta.get(KEY))?.value as MinimumDay | undefined;
  return saved ?? DEFAULT_MINIMUM;
}

export async function saveMinimum(minimum: MinimumDay): Promise<void> {
  const items = minimum.items.map((i) => i.trim()).filter(Boolean).slice(0, MAX_MINIMUM_ITEMS);
  await db.meta.put({ key: KEY, value: { includeGoalStep: minimum.includeGoalStep, items } satisfies MinimumDay });
}

/**
 * Start today as a minimum day from the saved plan. Returns false when the plan
 * has nothing in it (so the caller can open the editor instead).
 */
export async function startMinimumDay(day: DayKey): Promise<boolean> {
  const [minimum, actions, missions, sessions] = await Promise.all([
    getMinimum(),
    db.actions.toArray(),
    db.missions.toArray(),
    db.focusSessions.toArray(),
  ]);
  const slots = minimumSlots(minimum, actions, missions, sessions);
  if (slots.length === 0) return false;
  await startSmallDay(day, slots);
  return true;
}
