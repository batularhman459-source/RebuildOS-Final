import type { MinimumDay } from '../core/rebuild';
import type { HabitSchedule } from '../core/types';
import { addAction } from './actions';
import { db, newId } from './db';
import { addHabit } from './habits';
import { saveMinimum } from './minimum';

/** The ~60-second first-time setup, so nobody starts in front of an empty app. */

const SETUP_KEY = 'setupDone';

/** True for a brand-new person: nothing created yet and setup never finished or skipped. */
export async function needsSetup(): Promise<boolean> {
  const [done, actions, missions, habits] = await Promise.all([db.meta.get(SETUP_KEY), db.actions.count(), db.missions.count(), db.habits.count()]);
  return done?.value !== true && actions === 0 && missions === 0 && habits === 0;
}

export async function markSetupDone(): Promise<void> {
  await db.meta.put({ key: SETUP_KEY, value: true });
}

export interface SetupInput {
  goal: string;
  doneWhen?: string;
  measure?: { target: number; unit: string };
  /** In order; the first goes on Today as "Up next", the rest wait under the goal. */
  steps: string[];
  habits: { title: string; schedule: HabitSchedule }[];
  minimum: MinimumDay;
}

export async function completeSetup(input: SetupInput): Promise<void> {
  const t = Date.now();
  const goalTitle = input.goal.trim();
  let missionId: string | undefined;
  if (goalTitle) {
    missionId = newId();
    await db.missions.add({
      id: missionId,
      title: goalTitle,
      doneWhen: input.doneWhen?.trim() || undefined,
      measure: input.measure ? { target: input.measure.target, unit: input.measure.unit, current: 0, updatedAt: t } : undefined,
      status: 'active',
      createdAt: t,
      updatedAt: t,
      sortOrder: t,
    });
  }
  const steps = input.steps.map((s) => s.trim()).filter(Boolean);
  for (const [i, step] of steps.entries()) {
    await addAction({ title: step, when: i === 0 ? 'today' : 'later', missionId });
  }
  for (const h of input.habits) if (h.title.trim()) await addHabit({ title: h.title, schedule: h.schedule, missionId });
  await saveMinimum(input.minimum);
  await markSetupDone();
}
