import type { MinimumDay } from '../core/rebuild';
import type { AreaId, HabitSchedule } from '../core/types';
import { db, newId } from './db';
import { addHabit } from './habits';
import { saveMinimum } from './minimum';

/** The ~30-second first-time setup: pick life areas, keep the suggestions you like. */

const SETUP_KEY = 'setupDone';

/** True for a brand-new person: nothing created yet and setup never finished or skipped. */
export async function needsSetup(): Promise<boolean> {
  const [done, actions, missions, habits] = await Promise.all([db.meta.get(SETUP_KEY), db.actions.count(), db.missions.count(), db.habits.count()]);
  return done?.value !== true && actions === 0 && missions === 0 && habits === 0;
}

export async function markSetupDone(): Promise<void> {
  await db.meta.put({ key: SETUP_KEY, value: true });
}

export interface SetupGoal {
  title: string;
  area?: AreaId;
  /** In order of preference; they wait under the goal and the check-in suggests them. */
  tasks: { title: string; smaller?: string; minutes?: number }[];
  habits: { title: string; schedule: HabitSchedule }[];
}

export interface SetupInput {
  goals: SetupGoal[];
  minimum: MinimumDay;
}

export async function completeSetup(input: SetupInput): Promise<void> {
  const t = Date.now();
  let order = 0;
  for (const goal of input.goals) {
    const title = goal.title.trim();
    if (!title) continue;
    const missionId = newId();
    order += 1;
    await db.missions.add({ id: missionId, title, area: goal.area, status: 'active', createdAt: t, updatedAt: t, sortOrder: t + order });
    for (const task of goal.tasks) {
      const taskTitle = task.title.trim();
      if (!taskTitle) continue;
      order += 1;
      await db.actions.add({
        id: newId(),
        title: taskTitle,
        smaller: task.smaller?.trim() || undefined,
        estimateMinutes: task.minutes,
        missionId,
        state: 'later',
        isMain: false,
        createdAt: t,
        updatedAt: t,
        sortOrder: t + order,
      });
    }
    for (const h of goal.habits) if (h.title.trim()) await addHabit({ title: h.title, schedule: h.schedule, missionId });
  }
  await saveMinimum(input.minimum);
  await markSetupDone();
}
