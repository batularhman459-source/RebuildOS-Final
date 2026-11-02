import { addDays } from '../core/day';
import type { DayKey, DayMode, DayRecord, RebuildSlot } from '../core/types';
import { db, newId } from './db';

/** Day records: whether a day is normal or small, and its Rebuild slots. */

function now() {
  return Date.now();
}

export async function getDayRecord(day: DayKey): Promise<DayRecord | undefined> {
  return db.days.get(day);
}

export async function setDayMode(day: DayKey, mode: DayMode): Promise<void> {
  const existing = await db.days.get(day);
  await db.days.put({ ...(existing ?? { day }), day, mode, updatedAt: now() });
}

/**
 * Start a small day. Each slot becomes a Today Action: the step-forward slot reuses
 * an existing Action where it can; body and space slots become small Actions that are
 * cleared overnight if left undone. The normal Today is kept, just hidden for the day.
 */
export async function startSmallDay(day: DayKey, slots: RebuildSlot[]): Promise<void> {
  await db.transaction('rw', db.actions, db.days, async () => {
    const t = now();
    const saved: RebuildSlot[] = [];
    let order = 0;
    for (const slot of slots) {
      const title = slot.title.trim();
      if (!title) continue;
      order += 1;
      const existing = slot.actionId ? await db.actions.get(slot.actionId) : undefined;
      if (existing && !existing.deletedAt && existing.state !== 'done') {
        await db.actions.update(existing.id, { state: 'today', todayDay: day, updatedAt: t });
        saved.push({ ...slot, title: existing.title, actionId: existing.id });
        continue;
      }
      const id = newId();
      await db.actions.add({
        id,
        title,
        state: 'today',
        isMain: false,
        todayDay: day,
        createdAt: t,
        updatedAt: t,
        sortOrder: t + order,
        // Only the body/space extras are temporary; a step forward written here is real work.
        origin: slot.kind === 'forward' ? undefined : 'rebuild',
      });
      saved.push({ ...slot, title, actionId: id });
    }
    await db.days.put({ day, mode: 'small', rebuildSlots: saved, updatedAt: t });
  });
}

/** True when yesterday was a small day and today hasn't been decided yet. */
export async function needsMorningChoice(day: DayKey): Promise<boolean> {
  const [yesterday, today] = await Promise.all([db.days.get(addDays(day, -1)), db.days.get(day)]);
  return yesterday?.mode === 'small' && today === undefined;
}

/** Titles of yesterday's small-day slots that were completed — "what was done", never what wasn't. */
export async function yesterdayWins(day: DayKey): Promise<string[]> {
  const yesterday = await db.days.get(addDays(day, -1));
  if (!yesterday?.rebuildSlots) return [];
  const wins: string[] = [];
  for (const slot of yesterday.rebuildSlots) {
    const a = slot.actionId ? await db.actions.get(slot.actionId) : undefined;
    if (a && a.state === 'done') wins.push(a.title);
  }
  return wins;
}

// ── Last seen (for Welcome back) ───────────────────────────────────────────────

const LAST_SEEN_KEY = 'lastSeenDay';

export async function getLastSeenDay(): Promise<DayKey | undefined> {
  return (await db.meta.get(LAST_SEEN_KEY))?.value as DayKey | undefined;
}

export async function setLastSeenDay(day: DayKey): Promise<void> {
  await db.meta.put({ key: LAST_SEEN_KEY, value: day });
}
