import { elapsedMs } from './focus';
import { isLive } from './today';
import type { Action, FocusSession, Mission, Timestamp } from './types';

/**
 * Rules for Missions. See docs/product-brief.md §4.2.
 * A Mission always shows its next Action; progress is work invested, never a percentage.
 */

/** Open (not done, not deleted) Actions of a Mission: Today ones first, then by list order. */
export function openActions(missionId: string, actions: readonly Action[]): Action[] {
  return actions
    .filter((a) => isLive(a) && a.missionId === missionId && a.state !== 'done')
    .sort((a, b) => rank(a) - rank(b) || a.sortOrder - b.sortOrder);
}

function rank(a: Action): number {
  if (a.state === 'today' && a.isMain) return 0;
  if (a.state === 'today') return 1;
  return 2;
}

/** The Action a Mission shows as "Next". Undefined means the Mission needs a next step. */
export function nextAction(missionId: string, actions: readonly Action[]): Action | undefined {
  return openActions(missionId, actions)[0];
}

export function doneActions(missionId: string, actions: readonly Action[]): Action[] {
  return actions
    .filter((a) => isLive(a) && a.missionId === missionId && a.state === 'done')
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export interface MissionStats {
  done: number;
  focusMs: number;
  /** Most recent completion or finished Focus session for this Mission. */
  lastWorkedAt?: Timestamp;
}

export function missionStats(missionId: string, actions: readonly Action[], sessions: readonly FocusSession[]): MissionStats {
  const ids = new Set(actions.filter((a) => isLive(a) && a.missionId === missionId).map((a) => a.id));
  const done = doneActions(missionId, actions);
  const mySessions = sessions.filter((s) => !s.deletedAt && s.finishedAt !== undefined && ids.has(s.actionId));
  const focusMs = mySessions.reduce((t, s) => t + elapsedMs(s.segments, s.finishedAt!), 0);
  const times = [...done.map((a) => a.completedAt ?? 0), ...mySessions.map((s) => s.finishedAt ?? 0)].filter((t) => t > 0);
  return { done: done.length, focusMs, lastWorkedAt: times.length ? Math.max(...times) : undefined };
}

export function activeMissions(missions: readonly Mission[]): Mission[] {
  return missions.filter((m) => !m.deletedAt && m.status === 'active').sort((a, b) => a.sortOrder - b.sortOrder);
}

/** More than this many active Missions gets a gentle, non-blocking note. */
export const RECOMMENDED_ACTIVE_MISSIONS = 3;
