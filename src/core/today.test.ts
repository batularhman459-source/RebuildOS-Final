import { describe, expect, it } from 'vitest';
import { laterList, nextMain, planRollover, todayView } from './today';
import type { Action } from './types';

let seq = 0;
function action(partial: Partial<Action>): Action {
  seq += 1;
  return {
    id: partial.id ?? `a${seq}`,
    title: partial.title ?? `Action ${seq}`,
    state: 'today',
    isMain: false,
    createdAt: 0,
    updatedAt: 0,
    sortOrder: seq,
    ...partial,
  };
}

// For tests, timestamps are already day keys' ordinal: completedAt 1 → day "2026-11-01", 2 → "2026-11-02".
const dayOf = (t: number) => `2026-11-0${t}`;

describe('planRollover (overnight rule)', () => {
  it('keeps the Main Action and moves other unfinished Actions to Later', () => {
    const actions = [
      action({ id: 'main', isMain: true, todayDay: '2026-11-01' }),
      action({ id: 'gym', todayDay: '2026-11-01' }),
      action({ id: 'email', todayDay: '2026-11-01' }),
    ];
    expect(planRollover(actions, '2026-11-02')).toEqual({ carry: ['main'], toLater: ['gym', 'email'], discard: [] });
  });

  it('leaves Actions added today alone', () => {
    const actions = [action({ id: 'new', todayDay: '2026-11-02' })];
    expect(planRollover(actions, '2026-11-02')).toEqual({ carry: [], toLater: [], discard: [] });
  });

  it('ignores done, Later and deleted Actions', () => {
    const actions = [
      action({ state: 'done', todayDay: '2026-11-01' }),
      action({ state: 'later' }),
      action({ todayDay: '2026-11-01', deletedAt: 5 }),
    ];
    expect(planRollover(actions, '2026-11-02')).toEqual({ carry: [], toLater: [], discard: [] });
  });

  it('clears unfinished small-day Actions instead of moving them to Later', () => {
    const actions = [action({ id: 'walk', origin: 'rebuild', todayDay: '2026-11-01' }), action({ id: 'desk', origin: 'rebuild', isMain: true, todayDay: '2026-11-01' })];
    expect(planRollover(actions, '2026-11-02')).toEqual({ carry: [], toLater: [], discard: ['walk', 'desk'] });
  });

  it('works after many days away', () => {
    const actions = [action({ id: 'main', isMain: true, todayDay: '2026-10-01' }), action({ id: 'x', todayDay: '2026-10-01' })];
    expect(planRollover(actions, '2026-11-02')).toEqual({ carry: ['main'], toLater: ['x'], discard: [] });
  });
});

describe('todayView', () => {
  it('separates the Main Action, open Actions and today’s done Actions', () => {
    const actions = [
      action({ id: 'b', sortOrder: 2 }),
      action({ id: 'main', isMain: true, sortOrder: 3 }),
      action({ id: 'a', sortOrder: 1 }),
      action({ id: 'doneToday', state: 'done', completedAt: 2 }),
      action({ id: 'doneYesterday', state: 'done', completedAt: 1 }),
      action({ id: 'later', state: 'later' }),
    ];
    const view = todayView(actions, '2026-11-02', dayOf);
    expect(view.main?.id).toBe('main');
    expect(view.open.map((a) => a.id)).toEqual(['a', 'b']);
    expect(view.doneToday.map((a) => a.id)).toEqual(['doneToday']);
  });
});

describe('nextMain', () => {
  it('picks the first open Today Action', () => {
    const actions = [action({ id: 'second', sortOrder: 9 }), action({ id: 'first', sortOrder: 1 }), action({ state: 'later', sortOrder: 0 })];
    expect(nextMain(actions)?.id).toBe('first');
  });

  it('returns nothing when Today is empty', () => {
    expect(nextMain([action({ state: 'done' })])).toBeUndefined();
  });
});

describe('laterList', () => {
  it('lists live Later Actions in order', () => {
    const actions = [action({ id: 'y', state: 'later', sortOrder: 2 }), action({ id: 'x', state: 'later', sortOrder: 1 }), action({ state: 'later', deletedAt: 1 })];
    expect(laterList(actions).map((a) => a.id)).toEqual(['x', 'y']);
  });
});
