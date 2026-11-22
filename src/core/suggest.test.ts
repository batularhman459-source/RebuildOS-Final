import { describe, expect, it } from 'vitest';
import { areaOf } from './areas';
import { mainSuggestions, nextSwap, suggestionKey } from './suggest';
import type { Action, Mission } from './types';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 22, 12);
const TODAY = '2026-11-22';

function goal(id: string, extra: Partial<Mission> = {}): Mission {
  return { id, title: id, status: 'active', sortOrder: 0, createdAt: 0, updatedAt: 0, ...extra };
}

let n = 0;
function task(extra: Partial<Action>): Action {
  n += 1;
  return { id: `a${n}`, title: `Task ${n}`, state: 'later', isMain: false, sortOrder: n, createdAt: 0, updatedAt: 0, ...extra };
}

describe('mainSuggestions', () => {
  it('starts with the goal’s open tasks, Today first, then list order; dated ones wait', () => {
    const g = goal('g', { title: 'Something unusual' });
    const later = task({ title: 'Later one', missionId: 'g', sortOrder: 1 });
    const todayTask = task({ title: 'Today one', missionId: 'g', state: 'today', sortOrder: 5 });
    const future = task({ title: 'Future', missionId: 'g', targetDay: '2026-12-01' });
    const s = mainSuggestions([later, todayTask, future], [g], TODAY, NOW);
    expect(s.map((x) => x.title)).toEqual(['Today one', 'Later one']);
    expect(s[0]!.actionId).toBe(todayTask.id);
  });

  it('offers tasks done again and again, most often first, but only recent ones', () => {
    const g = goal('g', { title: 'Something unusual' });
    const done = (title: string, daysAgo: number) => task({ title, missionId: 'g', state: 'done', completedAt: NOW - daysAgo * DAY });
    const actions = [done('Gym', 1), done('gym ', 3), done('Gym', 5), done('Swim', 2), done('Swim', 4), done('Once', 1), done('Old', 100), done('Old', 120)];
    const s = mainSuggestions(actions, [g], TODAY, NOW);
    expect(s.map((x) => [x.title, x.source, x.times])).toEqual([
      ['Gym', 'repeat', 3],
      ['Swim', 'repeat', 2],
    ]);
  });

  it('adds ideas from the goal’s area, with a smaller version', () => {
    const s = mainSuggestions([], [goal('g', { title: 'Run a half marathon' })], TODAY, NOW);
    expect(s[0]).toMatchObject({ title: 'Run 5 km', smaller: 'Run 2 km', source: 'idea' });
  });

  it('does not repeat an idea that is already an open task', () => {
    const g = goal('g', { title: 'Get fit' });
    const s = mainSuggestions([task({ title: 'run 5 km', missionId: 'g' })], [g], TODAY, NOW);
    expect(s.filter((x) => x.key === suggestionKey('g', 'Run 5 km'))).toHaveLength(1);
    expect(s[0]!.source).toBe('open');
  });

  it('lets goals take turns and ignores paused goals and goal-less tasks', () => {
    const a = goal('a', { title: 'Alpha', sortOrder: 0 });
    const b = goal('b', { title: 'Beta', sortOrder: 1 });
    const parked = goal('p', { title: 'Parked', status: 'parked' });
    const actions = [
      task({ title: 'A1', missionId: 'a' }),
      task({ title: 'A2', missionId: 'a' }),
      task({ title: 'B1', missionId: 'b' }),
      task({ title: 'P1', missionId: 'p' }),
      task({ title: 'Loose' }),
    ];
    expect(mainSuggestions(actions, [a, b, parked], TODAY, NOW).map((x) => x.title)).toEqual(['A1', 'B1', 'A2']);
  });
});

describe('nextSwap', () => {
  const g = goal('g', { title: 'Something unusual' });
  const one = task({ title: 'One', missionId: 'g', sortOrder: 1 });
  const two = task({ title: 'Two', missionId: 'g', sortOrder: 2 });

  it('moves to the next suggestion, skipping what was swapped away', () => {
    const r = nextSwap([one, two], [g], TODAY, NOW, suggestionKey('g', 'One'), []);
    expect(r?.suggestion.title).toBe('Two');
    expect(r?.resetSkip).toBe(false);
  });

  it('starts again from the top when everything was skipped', () => {
    const r = nextSwap([one, two], [g], TODAY, NOW, suggestionKey('g', 'Two'), [suggestionKey('g', 'One')]);
    expect(r).toMatchObject({ suggestion: { title: 'One' }, resetSkip: true });
  });

  it('has nothing to offer without goals', () => {
    expect(nextSwap([one], [], TODAY, NOW, undefined, [])).toBeUndefined();
  });
});

describe('areaOf', () => {
  it('uses the saved area, else guesses from the goal name', () => {
    expect(areaOf({ title: 'Anything', area: 'money' })?.id).toBe('money');
    expect(areaOf({ title: 'Pass my maths exam' })?.id).toBe('study');
    expect(areaOf({ title: 'Qwerty' })).toBeUndefined();
  });
});
