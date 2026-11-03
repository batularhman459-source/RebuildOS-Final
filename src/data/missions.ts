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
  /** Optional measurable target. */
  measure?: { target: number; unit: string };
}

/** Create a Mission together with its first Action. Returns the Mission id. */
export async function createMission(input: NewMission): Promise<string> {
  const title = input.title.trim();
  const firstStep = input.firstStep.trim();
  if (!title || !firstStep) throw new Error('A goal needs a name and a first step.');
  const id = newId();
  const t = now();
  await db.transaction('rw', db.missions, db.actions, async () => {
    await db.missions.add({
      id,
      title,
      doneWhen: input.doneWhen?.trim() || undefined,
      targetDay: input.targetDay || undefined,
      measure: input.measure ? { target: input.measure.target, unit: input.measure.unit.trim(), current: 0, updatedAt: t } : undefined,
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

/** Set, change or remove a goal's measurable target. */
export async function setGoalMeasure(id: string, measure: { target: number; unit: string; current?: number } | undefined): Promise<void> {
  const g = await db.missions.get(id);
  if (!g) return;
  if (!measure) {
    await db.missions.update(id, { measure: undefined, updatedAt: Date.now() });
    return;
  }
  await db.missions.update(id, {
    measure: { target: measure.target, unit: measure.unit.trim(), current: measure.current ?? g.measure?.current ?? 0, start: g.measure?.start, updatedAt: Date.now() },
    updatedAt: Date.now(),
  });
}

/** Record where the person is now on a measurable goal. */
export async function updateGoalProgress(id: string, current: number): Promise<void> {
  const g = await db.missions.get(id);
  if (!g?.measure) return;
  await db.missions.update(id, { measure: { ...g.measure, current, updatedAt: Date.now() }, updatedAt: Date.now() });
}
