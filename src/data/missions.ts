import type { DayKey, Mission, MissionStatus } from '../core/types';
import { addAction } from './actions';
import { db, newId } from './db';

function now() {
  return Date.now();
}

export interface NewMission {
  title: string;
  doneWhen?: string;
  targetDay?: DayKey;
  /** Every Mission starts with a first step. */
  firstStep: string;
  firstStepToday: boolean;
}

/** Create a Mission together with its first Action. Returns the Mission id. */
export async function createMission(input: NewMission): Promise<string> {
  const title = input.title.trim();
  const firstStep = input.firstStep.trim();
  if (!title || !firstStep) throw new Error('A Mission needs a name and a first step.');
  const id = newId();
  const t = now();
  await db.transaction('rw', db.missions, db.actions, async () => {
    await db.missions.add({
      id,
      title,
      doneWhen: input.doneWhen?.trim() || undefined,
      targetDay: input.targetDay || undefined,
      status: 'active',
      createdAt: t,
      updatedAt: t,
      sortOrder: t,
    });
    await addAction({ title: firstStep, destination: input.firstStepToday ? 'today' : 'later', missionId: id });
  });
  return id;
}

export async function updateMission(id: string, changes: Partial<Pick<Mission, 'title' | 'doneWhen' | 'targetDay'>>): Promise<void> {
  const patch: Partial<Mission> = { updatedAt: now() };
  if (changes.title !== undefined) {
    const title = changes.title.trim();
    if (title) patch.title = title;
  }
  if ('doneWhen' in changes) patch.doneWhen = changes.doneWhen?.trim() || undefined;
  if ('targetDay' in changes) patch.targetDay = changes.targetDay || undefined;
  await db.missions.update(id, patch);
}

export async function setMissionStatus(id: string, status: MissionStatus): Promise<void> {
  const patch: Partial<Mission> = { status, completedAt: status === 'complete' ? now() : undefined, updatedAt: now() };
  if (status === 'active') patch.sortOrder = now();
  await db.missions.update(id, patch);
}

/** Soft-delete a Mission. Its Actions are kept and simply no longer belong to it. */
export async function deleteMission(id: string): Promise<void> {
  await db.transaction('rw', db.missions, db.actions, async () => {
    const t = now();
    await db.missions.update(id, { deletedAt: t, updatedAt: t });
    const linked = await db.actions.where('missionId').equals(id).toArray();
    for (const a of linked) await db.actions.update(a.id, { missionId: undefined, updatedAt: t });
  });
}

export async function setActionMission(actionId: string, missionId: string | undefined): Promise<void> {
  await db.actions.update(actionId, { missionId, updatedAt: now() });
}
