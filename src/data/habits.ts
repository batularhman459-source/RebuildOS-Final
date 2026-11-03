import { checkId } from '../core/habits';
import type { DayKey, Habit, HabitSchedule } from '../core/types';
import { db, newId } from './db';

/** Habits the person defines themselves: any name, every day or X times a week. */

function now() {
  return Date.now();
}

export interface NewHabit {
  title: string;
  schedule: HabitSchedule;
  missionId?: string;
}

export function cleanSchedule(s: HabitSchedule): HabitSchedule {
  if (s.kind === 'daily') return s;
  return { kind: 'weekly', times: Math.min(6, Math.max(1, Math.round(s.times))) };
}

export async function addHabit(input: NewHabit): Promise<string> {
  const title = input.title.trim();
  if (!title) throw new Error('A habit needs a name.');
  const id = newId();
  const t = now();
  await db.habits.add({ id, title, schedule: cleanSchedule(input.schedule), missionId: input.missionId, createdAt: t, updatedAt: t, sortOrder: t });
  return id;
}

export async function updateHabit(id: string, changes: Partial<Pick<Habit, 'title' | 'schedule' | 'missionId'>>): Promise<void> {
  const patch: Partial<Habit> = { updatedAt: now() };
  if (changes.title !== undefined) {
    const title = changes.title.trim();
    if (!title) return;
    patch.title = title;
  }
  if (changes.schedule) patch.schedule = cleanSchedule(changes.schedule);
  if ('missionId' in changes) patch.missionId = changes.missionId;
  await db.habits.update(id, patch);
}

/** Pause keeps the habit and its history but takes it off Today. */
export async function setHabitPaused(id: string, paused: boolean): Promise<void> {
  await db.habits.update(id, { pausedAt: paused ? now() : undefined, updatedAt: now() });
}

export async function deleteHabit(id: string): Promise<void> {
  await db.habits.update(id, { deletedAt: now(), updatedAt: now() });
}

/** Tick or untick a habit for a day. */
export async function toggleHabit(habitId: string, day: DayKey): Promise<void> {
  const id = checkId(habitId, day);
  await db.transaction('rw', db.habitChecks, async () => {
    if (await db.habitChecks.get(id)) await db.habitChecks.delete(id);
    else await db.habitChecks.add({ id, habitId, day, createdAt: now() });
  });
}
