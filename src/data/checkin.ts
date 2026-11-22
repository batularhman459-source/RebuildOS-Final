import { keyOfAction, mainSuggestions, nextSwap, type MainSuggestion } from '../core/suggest';
import type { DayKey, DayRecord, Feeling } from '../core/types';
import { db, newId } from './db';
import { startMinimumDay } from './minimum';
import { getFocusGoalId } from './week';

/**
 * The morning check-in and everything that hangs off it: picking the main thing,
 * swapping it, the okay-day win and "Day counted". See docs/product-brief.md (V2).
 */

function now() {
  return Date.now();
}

async function patchDay(day: DayKey, patch: Partial<DayRecord>): Promise<void> {
  const existing = await db.days.get(day);
  await db.days.put({ ...(existing ?? { mode: 'normal' as const }), ...patch, day, updatedAt: now() });
}

/**
 * Answer "How's today?". A rough day starts My minimum day; returns false when the
 * minimum plan is empty, so the caller can open the editor. Good and okay days make
 * sure there's a main thing, suggested from the goals if Today has none.
 */
export async function checkIn(day: DayKey, feeling: Feeling): Promise<boolean> {
  if (feeling === 'rough') {
    const started = await startMinimumDay(day);
    await patchDay(day, { feeling, ...(started ? { mode: 'small' as const } : {}) });
    return started;
  }
  await patchDay(day, { feeling, mode: 'normal' });
  await ensureSuggestedMain(day);
  return true;
}

/** If Today has no main thing, put the best suggestion there. */
export async function ensureSuggestedMain(day: DayKey): Promise<void> {
  const [actions, missions, record, focus] = await Promise.all([db.actions.toArray(), db.missions.toArray(), db.days.get(day), getFocusGoalId(day)]);
  if (actions.some((a) => !a.deletedAt && a.state === 'today' && a.isMain)) return;
  const best = mainSuggestions(actions, missions, day, now(), record?.skipped ?? [], focus)[0];
  if (best) await acceptSuggestion(day, best);
}

/** Make a suggestion today's main thing, creating the task when it's a repeat or an idea. */
export async function acceptSuggestion(day: DayKey, s: MainSuggestion): Promise<string> {
  return db.transaction('rw', db.actions, db.days, async () => {
    const t = now();
    for (const m of await db.actions.filter((a) => a.isMain).toArray()) await db.actions.update(m.id, { isMain: false, updatedAt: t });

    let id = s.actionId;
    let wasLater = false;
    const existing = id ? await db.actions.get(id) : undefined;
    if (existing && !existing.deletedAt && existing.state !== 'done') {
      wasLater = existing.state === 'later';
      await db.actions.update(existing.id, { state: 'today', todayDay: day, isMain: true, updatedAt: t });
    } else {
      id = newId();
      await db.actions.add({
        id,
        title: s.title,
        smaller: s.smaller,
        missionId: s.missionId,
        estimateMinutes: s.estimateMinutes,
        state: 'today',
        isMain: true,
        todayDay: day,
        origin: 'suggested',
        createdAt: t,
        updatedAt: t,
        sortOrder: t,
      });
    }
    await patchDay(day, { mainPick: { actionId: id!, wasLater } });
    return id!;
  });
}

/**
 * Swap the main thing for the next suggestion. What the app picked goes back where it
 * came from (a fresh idea is simply dropped); a main thing the person chose stays on Today.
 * Returns false when there's nothing else to suggest.
 */
export async function swapMain(day: DayKey): Promise<boolean> {
  const [actions, missions, record, sessions, focus] = await Promise.all([
    db.actions.toArray(),
    db.missions.toArray(),
    db.days.get(day),
    db.focusSessions.toArray(),
    getFocusGoalId(day),
  ]);
  const main = actions.find((a) => !a.deletedAt && a.state === 'today' && a.isMain);
  const currentKey = main ? keyOfAction(main) : undefined;
  const skip = record?.skipped ?? [];
  const next = nextSwap(actions, missions, day, now(), currentKey, skip, focus);
  if (!next) return false;

  const t = now();
  if (main) {
    const picked = record?.mainPick?.actionId === main.id;
    const touched = sessions.some((s) => s.actionId === main.id && !s.deletedAt);
    if (picked && main.origin === 'suggested' && !touched) {
      await db.actions.update(main.id, { deletedAt: t, isMain: false, updatedAt: t });
    } else if (picked && record?.mainPick?.wasLater && !touched) {
      await db.actions.update(main.id, { state: 'later', todayDay: undefined, isMain: false, updatedAt: t });
    } else {
      await db.actions.update(main.id, { isMain: false, updatedAt: t });
    }
  }
  const skipped = next.resetSkip ? [] : currentKey ? [...skip, currentKey] : skip;
  await patchDay(day, { skipped });
  await acceptSuggestion(day, next.suggestion);
  return true;
}

/** Okay day: the smaller version is done. The task itself stays open for a better day. */
export async function recordSmallWin(day: DayKey, actionId: string, title: string): Promise<void> {
  await patchDay(day, { smallWin: { actionId, title, at: now() } });
}

export async function clearSmallWin(day: DayKey): Promise<void> {
  await patchDay(day, { smallWin: undefined });
}

/** Marks the day as counted. True only the first time, so "Day counted" shows once a day. */
export async function markCounted(day: DayKey): Promise<boolean> {
  const record = await db.days.get(day);
  if (record?.countedAt) return false;
  await patchDay(day, { countedAt: now() });
  return true;
}

/** Days with an okay-day win (they count as active). */
export async function smallWinDays(): Promise<DayKey[]> {
  return (await db.days.toArray()).filter((d) => d.smallWin).map((d) => d.day);
}
