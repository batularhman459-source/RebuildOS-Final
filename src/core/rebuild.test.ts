import { describe, expect, it } from 'vitest';
import { DEFAULT_MINIMUM, defaultSlots, minimumSlots, shouldOfferSmallDay, shouldWelcomeBack, suggestForward } from './rebuild';
import type { Action, Mission } from './types';

let seq = 0;
function action(p: Partial<Action>): Action {
  seq += 1;
  return { id: `a${seq}`, title: `A${seq}`, state: 'later', isMain: false, createdAt: 0, updatedAt: 0, sortOrder: seq, ...p };
}
function mission(p: Partial<Mission>): Mission {
  seq += 1;
  return { id: `m${seq}`, title: 'M', status: 'active', createdAt: 0, updatedAt: 0, sortOrder: seq, ...p };
}

describe('suggestForward', () => {
  it('uses the Main Action first', () => {
    const actions = [action({ id: 'main', state: 'today', isMain: true }), action({ id: 'x', missionId: 'm1' })];
    expect(suggestForward(actions, [mission({ id: 'm1' })], [])?.id).toBe('main');
  });

  it('otherwise uses the next step of the most recently worked-on Mission', () => {
    const missions = [mission({ id: 'old', updatedAt: 1 }), mission({ id: 'recent', updatedAt: 1 })];
    const actions = [
      action({ id: 'oldNext', missionId: 'old' }),
      action({ id: 'recentNext', missionId: 'recent' }),
      action({ missionId: 'recent', state: 'done', completedAt: 500 }),
    ];
    expect(suggestForward(actions, missions, [])?.id).toBe('recentNext');
  });

  it('ignores small-day Actions and returns nothing when there is nothing', () => {
    expect(suggestForward([action({ state: 'today', isMain: true, origin: 'rebuild' })], [], [])).toBeUndefined();
  });
});

describe('defaultSlots', () => {
  it('pre-fills three slots', () => {
    const slots = defaultSlots([action({ id: 'main', title: 'Write copy', state: 'today', isMain: true })], [], []);
    expect(slots.map((s) => [s.kind, s.title, s.actionId])).toEqual([
      ['forward', 'Write copy', 'main'],
      ['body', '10-minute walk', undefined],
      ['space', 'Clear your desk', undefined],
    ]);
  });

  it('leaves the first slot empty when there is nothing to suggest', () => {
    expect(defaultSlots([], [], [])[0]).toMatchObject({ kind: 'forward', title: '' });
  });
});

describe('when to offer', () => {
  it('welcomes back after three or more days away', () => {
    expect(shouldWelcomeBack('2026-10-30', '2026-11-02')).toBe(true);
    expect(shouldWelcomeBack('2026-10-31', '2026-11-02')).toBe(false);
    expect(shouldWelcomeBack(undefined, '2026-11-02')).toBe(false);
  });

  it('offers a smaller day only when yesterday clearly did not go to plan', () => {
    expect(shouldOfferSmallDay(3, 0)).toBe(true);
    expect(shouldOfferSmallDay(1, 0)).toBe(false);
    expect(shouldOfferSmallDay(4, 1)).toBe(false);
  });
});

describe('My minimum day', () => {
  it('starts from the saved plan: a goal step plus the person’s own items', () => {
    const slots = minimumSlots(DEFAULT_MINIMUM, [action({ id: 'main', title: 'Write copy', state: 'today', isMain: true })], [], []);
    expect(slots.map((s) => [s.kind, s.title])).toEqual([
      ['forward', 'Write copy'],
      ['custom', '10-minute walk'],
      ['custom', 'Clear your desk'],
    ]);
  });

  it('skips the goal step when there is nothing to suggest, and ignores empty items', () => {
    const slots = minimumSlots({ includeGoalStep: true, items: ['Stretch', '  '] }, [], [], []);
    expect(slots.map((s) => s.title)).toEqual(['Stretch']);
  });

  it('can leave out the goal step entirely', () => {
    const slots = minimumSlots({ includeGoalStep: false, items: ['Walk'] }, [action({ state: 'today', isMain: true })], [], []);
    expect(slots.map((s) => s.kind)).toEqual(['custom']);
  });
});
