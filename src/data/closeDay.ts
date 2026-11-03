import { addDays } from '../core/day';
import type { DayKey } from '../core/types';
import { db, newId } from './db';

/**
 * Close the day: an optional ~30-second evening ritual. See docs/product-brief.md §4.6.
 * Decides where unfinished Actions go and sets tomorrow's Main Action, so the overnight
 * rule has nothing left to move.
 */

export type LeftoverChoice = 'tomorrow' | 'later';

export type TomorrowMain = { actionId: string } | { title: string } | undefined;

export interface CloseDayInput {
  leftovers: Record<string, LeftoverChoice>;
  tomorrowMain: TomorrowMain;
  /** 1–5, optional. */
  energy?: number;
}

export async function closeDay(day: DayKey, input: CloseDayInput): Promise<void> {
  const tomorrow = addDays(day, 1);
  const t = Date.now();

  await db.transaction('rw', db.actions, db.days, async () => {
    for (const [id, choice] of Object.entries(input.leftovers)) {
      const a = await db.actions.get(id);
      if (!a || a.deletedAt || a.state !== 'today') continue;
      if (choice === 'tomorrow') {
        await db.actions.update(id, { todayDay: tomorrow, isMain: false, updatedAt: t });
      } else if (a.origin === 'rebuild') {
        // Small-day extras don't belong in Later.
        await db.actions.update(id, { deletedAt: t, isMain: false, updatedAt: t });
      } else {
        await db.actions.update(id, { state: 'later', isMain: false, todayDay: undefined, sortOrder: t, updatedAt: t });
      }
    }

    if (input.tomorrowMain) {
      const mains = await db.actions.filter((a) => a.isMain).toArray();
      for (const m of mains) await db.actions.update(m.id, { isMain: false, updatedAt: t });

      if ('actionId' in input.tomorrowMain) {
        await db.actions.update(input.tomorrowMain.actionId, { state: 'today', todayDay: tomorrow, isMain: true, updatedAt: t });
      } else if (input.tomorrowMain.title.trim()) {
        await db.actions.add({
          id: newId(),
          title: input.tomorrowMain.title.trim(),
          state: 'today',
          isMain: true,
          todayDay: tomorrow,
          createdAt: t,
          updatedAt: t,
          sortOrder: t,
        });
      }
    }

    const existing = await db.days.get(day);
    await db.days.put({
      ...(existing ?? { mode: 'normal' as const }),
      day,
      energy: input.energy,
      closedAt: t,
      updatedAt: t,
    });
  });
}

/** Undo closing: the day is open again. Choices already made stay as they are. */
export async function reopenDay(day: DayKey): Promise<void> {
  const existing = await db.days.get(day);
  if (existing) await db.days.put({ ...existing, closedAt: undefined, updatedAt: Date.now() });
}
