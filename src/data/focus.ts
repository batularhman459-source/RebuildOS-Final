import { isRunning, pause, resume, start, trimTo } from '../core/focus';
import type { FocusSession } from '../core/types';
import { db, newId } from './db';
import { moveToToday } from './actions';

/**
 * Focus sessions. At most one session is unfinished at a time; it may be running or paused.
 * Time is stored as segments of start/stop timestamps — see core/focus.ts.
 */

function now() {
  return Date.now();
}

export async function getActiveSession(): Promise<FocusSession | undefined> {
  const open = await db.focusSessions.filter((s) => !s.deletedAt && s.finishedAt === undefined).toArray();
  return open.sort((a, b) => b.createdAt - a.createdAt)[0];
}

/** Close an unfinished session, ending its time where it last stopped (or now, if running). */
async function close(session: FocusSession, at: number): Promise<void> {
  await db.focusSessions.update(session.id, { segments: pause(session.segments, at), finishedAt: at, updatedAt: at });
}

/**
 * Start (or resume) Focus on an Action. Resumes an unfinished session for the same Action;
 * closes any other unfinished session first. Later Actions move to Today.
 */
export async function startFocus(actionId: string): Promise<void> {
  const action = await db.actions.get(actionId);
  if (!action || action.deletedAt) return;
  if (action.state === 'later') await moveToToday(actionId);

  await db.transaction('rw', db.focusSessions, async () => {
    const t = now();
    const active = await getActiveSession();
    if (active?.actionId === actionId) {
      await db.focusSessions.update(active.id, { segments: resume(active.segments, t), updatedAt: t });
      return;
    }
    if (active) await close(active, t);
    await db.focusSessions.add({
      id: newId(),
      actionId,
      segments: start(t),
      targetMinutes: action.estimateMinutes,
      createdAt: t,
      updatedAt: t,
    });
  });
}

export async function pauseFocus(id: string): Promise<void> {
  const s = await db.focusSessions.get(id);
  if (s && isRunning(s.segments)) await db.focusSessions.update(id, { segments: pause(s.segments, now()), updatedAt: now() });
}

export async function resumeFocus(id: string): Promise<void> {
  const s = await db.focusSessions.get(id);
  if (s && !isRunning(s.segments)) await db.focusSessions.update(id, { segments: resume(s.segments, now()), updatedAt: now() });
}

export async function setTarget(id: string, minutes: number | undefined): Promise<void> {
  await db.focusSessions.update(id, { targetMinutes: minutes, updatedAt: now() });
}

/** Finish the session. Time is saved whether or not the Action is done. Returns the closed session. */
export async function finishFocus(id: string): Promise<FocusSession | undefined> {
  const s = await db.focusSessions.get(id);
  if (!s) return undefined;
  if (s.finishedAt === undefined) await close(s, now());
  return db.focusSessions.get(id);
}

/** Correct a finished session's time (e.g. a timer left running overnight). */
export async function adjustSession(id: string, minutes: number): Promise<void> {
  const s = await db.focusSessions.get(id);
  if (!s || s.finishedAt === undefined) return;
  await db.focusSessions.update(id, { segments: trimTo(minutes, s.finishedAt), updatedAt: now() });
}
