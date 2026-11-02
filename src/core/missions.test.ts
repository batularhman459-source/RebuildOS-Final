import { describe, expect, it } from 'vitest';
import { activeMissions, doneActions, missionStats, nextAction, openActions } from './missions';
import type { Action, FocusSession, Mission } from './types';

let seq = 0;
function action(p: Partial<Action>): Action {
  seq += 1;
  return { id: `a${seq}`, title: `A${seq}`, state: 'later', isMain: false, createdAt: 0, updatedAt: 0, sortOrder: seq, missionId: 'm', ...p };
}
function mission(p: Partial<Mission>): Mission {
  seq += 1;
  return { id: `m${seq}`, title: 'M', status: 'active', createdAt: 0, updatedAt: 0, sortOrder: seq, ...p };
}

describe('nextAction', () => {
  it('prefers an Action already on Today, the Main Action first', () => {
    const actions = [
      action({ id: 'later1', sortOrder: 1 }),
      action({ id: 'today', state: 'today', sortOrder: 5 }),
      action({ id: 'main', state: 'today', isMain: true, sortOrder: 9 }),
    ];
    expect(nextAction('m', actions)?.id).toBe('main');
    expect(openActions('m', actions).map((a) => a.id)).toEqual(['main', 'today', 'later1']);
  });

  it('falls back to the first Later Action', () => {
    const actions = [action({ id: 'b', sortOrder: 2 }), action({ id: 'a', sortOrder: 1 })];
    expect(nextAction('m', actions)?.id).toBe('a');
  });

  it('ignores done, deleted and other Missions’ Actions', () => {
    const actions = [action({ state: 'done' }), action({ deletedAt: 1 }), action({ missionId: 'other' })];
    expect(nextAction('m', actions)).toBeUndefined();
  });
});

describe('missionStats', () => {
  it('counts done Actions, focused time and when it was last worked on', () => {
    const actions = [
      action({ id: 'd1', state: 'done', completedAt: 1_000 }),
      action({ id: 'd2', state: 'done', completedAt: 5_000 }),
      action({ id: 'open' }),
      action({ id: 'elsewhere', missionId: 'other', state: 'done', completedAt: 9_000 }),
    ];
    const sessions: FocusSession[] = [
      { id: 's1', actionId: 'open', segments: [{ start: 0, end: 600_000 }], finishedAt: 7_000, createdAt: 0, updatedAt: 0 },
      { id: 's2', actionId: 'elsewhere', segments: [{ start: 0, end: 600_000 }], finishedAt: 8_000, createdAt: 0, updatedAt: 0 },
      { id: 's3', actionId: 'open', segments: [{ start: 0 }], createdAt: 0, updatedAt: 0 },
    ];
    expect(missionStats('m', actions, sessions)).toEqual({ done: 2, focusMs: 600_000, lastWorkedAt: 7_000 });
    expect(doneActions('m', actions).map((a) => a.id)).toEqual(['d2', 'd1']);
  });

  it('has no last-worked date for a new Mission', () => {
    expect(missionStats('m', [], []).lastWorkedAt).toBeUndefined();
  });
});

describe('activeMissions', () => {
  it('lists only active, live Missions in order', () => {
    const ms = [mission({ id: 'b', sortOrder: 2 }), mission({ id: 'a', sortOrder: 1 }), mission({ status: 'complete' }), mission({ deletedAt: 1 })];
    expect(activeMissions(ms).map((m) => m.id)).toEqual(['a', 'b']);
  });
});
