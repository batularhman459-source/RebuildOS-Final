import { addDays, dayKey } from '../core/day';
import { shouldOfferSmallDay } from '../core/rebuild';
import { nextMain, planRollover } from '../core/today';
import type { Action, DayKey } from '../core/types';
import { db, newId } from './db';

/** All writes to Actions go through here so the Today invariants hold: at most one Main Action, always on Today. */

function now() {
  return Date.now();
}

function today(): DayKey {
  return dayKey(new Date());
}

/** If Today has no Main Action, promote the first open Today Action. Call inside a transaction. */
async function ensureMain(): Promise<void> {
  const all = await db.actions.toArray();
  const hasMain = all.some((a) => !a.deletedAt && a.state === 'today' && a.isMain);
  if (hasMain) return;
  const next = nextMain(all);
  if (next) await db.actions.update(next.id, { isMain: true, updatedAt: now() });
}

export interface NewAction {
  title: string;
  destination: 'today' | 'later';
  estimateMinutes?: number;
  missionId?: string;
}

export async function addAction(input: NewAction): Promise<string> {
  const title = input.title.trim();
  if (!title) throw new Error('An Action needs a name.');
  const id = newId();
  const t = now();
  await db.transaction('rw', db.actions, async () => {
    await db.actions.add({
      id,
      title,
      state: input.destination,
      isMain: false,
      estimateMinutes: input.estimateMinutes,
      missionId: input.missionId,
      todayDay: input.destination === 'today' ? today() : undefined,
      createdAt: t,
      updatedAt: t,
      sortOrder: t,
    });
    await ensureMain();
  });
  return id;
}

export async function updateAction(id: string, changes: Partial<Pick<Action, 'title' | 'estimateMinutes'>>): Promise<void> {
  const patch: Partial<Action> = { ...changes, updatedAt: now() };
  if (changes.title !== undefined) {
    const title = changes.title.trim();
    if (!title) return;
    patch.title = title;
  }
  await db.actions.update(id, patch);
}

export async function completeAction(id: string): Promise<void> {
  await db.transaction('rw', db.actions, async () => {
    await db.actions.update(id, { state: 'done', isMain: false, completedAt: now(), updatedAt: now() });
    await ensureMain();
  });
}

/** Undo a completion: the Action goes back to Today (as Main if Today has none). */
export async function reopenAction(id: string): Promise<void> {
  await db.transaction('rw', db.actions, async () => {
    await db.actions.update(id, { state: 'today', todayDay: today(), completedAt: undefined, updatedAt: now() });
    await ensureMain();
  });
}

export async function moveToToday(id: string): Promise<void> {
  await db.transaction('rw', db.actions, async () => {
    await db.actions.update(id, { state: 'today', todayDay: today(), sortOrder: now(), updatedAt: now() });
    await ensureMain();
  });
}

export async function moveToLater(id: string): Promise<void> {
  await db.transaction('rw', db.actions, async () => {
    await db.actions.update(id, { state: 'later', isMain: false, todayDay: undefined, sortOrder: now(), updatedAt: now() });
    await ensureMain();
  });
}

export async function makeMain(id: string): Promise<void> {
  await db.transaction('rw', db.actions, async () => {
    const mains = await db.actions.filter((a) => a.isMain).toArray();
    for (const m of mains) await db.actions.update(m.id, { isMain: false, updatedAt: now() });
    await db.actions.update(id, { isMain: true, state: 'today', todayDay: today(), updatedAt: now() });
  });
}

/** Soft delete; the record stays for future sync but disappears everywhere. */
export async function deleteAction(id: string): Promise<void> {
  await db.transaction('rw', db.actions, async () => {
    await db.actions.update(id, { deletedAt: now(), isMain: false, updatedAt: now() });
    await ensureMain();
  });
}

// ── Overnight rule ────────────────────────────────────────────────────────────

const ROLLOVER_KEY = 'rollover';

export interface RolloverNotice {
  day: DayKey;
  movedIds: string[];
  dismissed?: boolean;
  /** Yesterday clearly didn't go to plan: offer a smaller day instead of just Undo. */
  offerSmallDay?: boolean;
}

/**
 * Apply the overnight rule for `day`. Safe to call often: it only acts on Actions
 * from earlier days. Records which Actions moved so Today can offer Undo.
 */
export async function runRollover(day: DayKey): Promise<void> {
  await db.transaction('rw', db.actions, db.meta, async () => {
    const all = await db.actions.toArray();
    const plan = planRollover(all, day);
    if (plan.carry.length === 0 && plan.toLater.length === 0 && plan.discard.length === 0) return;
    const t = now();
    for (const id of plan.discard) await db.actions.update(id, { deletedAt: t, isMain: false, updatedAt: t });
    for (const id of plan.carry) await db.actions.update(id, { todayDay: day, updatedAt: t });
    for (const id of plan.toLater) {
      await db.actions.update(id, { state: 'later', isMain: false, todayDay: undefined, updatedAt: t });
    }
    if (plan.toLater.length > 0) {
      const prev = (await db.meta.get(ROLLOVER_KEY))?.value as RolloverNotice | undefined;
      const movedIds = prev && prev.day === day && !prev.dismissed ? [...prev.movedIds, ...plan.toLater] : plan.toLater;
      const yesterday = addDays(day, -1);
      const completedYesterday = all.filter((a) => a.completedAt !== undefined && dayKey(new Date(a.completedAt)) === yesterday).length;
      const offerSmallDay = shouldOfferSmallDay(movedIds.length, completedYesterday);
      await db.meta.put({ key: ROLLOVER_KEY, value: { day, movedIds, offerSmallDay } satisfies RolloverNotice });
    }
    await ensureMain();
  });
}

export async function getRolloverNotice(day: DayKey): Promise<RolloverNotice | undefined> {
  const notice = (await db.meta.get(ROLLOVER_KEY))?.value as RolloverNotice | undefined;
  if (!notice || notice.day !== day || notice.dismissed || notice.movedIds.length === 0) return undefined;
  return notice;
}

export async function undoRollover(day: DayKey): Promise<void> {
  await db.transaction('rw', db.actions, db.meta, async () => {
    const notice = await getRolloverNotice(day);
    if (!notice) return;
    const t = now();
    for (const id of notice.movedIds) {
      const a = await db.actions.get(id);
      if (a && !a.deletedAt && a.state === 'later') {
        await db.actions.update(id, { state: 'today', todayDay: day, updatedAt: t });
      }
    }
    await db.meta.put({ key: ROLLOVER_KEY, value: { ...notice, dismissed: true } });
    await ensureMain();
  });
}

export async function dismissRolloverNotice(day: DayKey): Promise<void> {
  const notice = await getRolloverNotice(day);
  if (notice) await db.meta.put({ key: ROLLOVER_KEY, value: { ...notice, dismissed: true } });
}
