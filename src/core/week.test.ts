import { describe, expect, it } from 'vitest';
import { mainSuggestions } from './suggest';
import type { Action, Habit, Mission } from './types';
import { commonBlockers, orderGoals, reviewWeek, summariseWeek, weekReviewDue, type WeekReview } from './week';

// 2026-11-22 is a Sunday; 2026-11-23 a Monday; 2026-11-25 a Wednesday.
const SUN = '2026-11-22';
const MON = '2026-11-23';
const WED = '2026-11-25';
const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);
const at = (day: string) => Date.parse(`${day}T12:00:00Z`);

function goal(id: string, extra: Partial<Mission> = {}): Mission {
  return { id, title: id, status: 'active', sortOrder: 0, createdAt: 0, updatedAt: 0, ...extra };
}
function done(title: string, day: string, missionId?: string): Action {
  return { id: `${title}-${day}`, title, missionId, state: 'done', isMain: false, sortOrder: 0, createdAt: 0, updatedAt: 0, completedAt: at(day) };
}

describe('reviewWeek / weekReviewDue', () => {
  it('reviews the week ending on Sunday, or the one that just ended on Monday', () => {
    expect(reviewWeek(SUN)).toBe('2026-11-16');
    expect(reviewWeek(MON)).toBe('2026-11-16');
    expect(reviewWeek(WED)).toBe('2026-11-23');
  });

  it('is offered on Sunday and Monday until that week is reviewed', () => {
    expect(weekReviewDue(SUN, new Set())).toBe(true);
    expect(weekReviewDue(MON, new Set())).toBe(true);
    expect(weekReviewDue(MON, new Set(['2026-11-16']))).toBe(false);
    expect(weekReviewDue(WED, new Set())).toBe(false);
  });
});

describe('summariseWeek', () => {
  it('counts the reviewed week only: active days, feelings, wins, goal steps and habits', () => {
    const habit: Habit = { id: 'h', title: 'Gym', schedule: { kind: 'weekly', times: 3 }, sortOrder: 0, createdAt: 0, updatedAt: 0 };
    const s = summariseWeek('2026-11-16', SUN, dayOf, {
      actions: [done('Run', '2026-11-17', 'g'), done('Read', '2026-11-20'), done('Old', '2026-11-10', 'g')],
      sessions: [{ id: 's', actionId: 'Run-2026-11-17', segments: [{ start: at('2026-11-17') - 1_800_000, end: at('2026-11-17') }], finishedAt: at('2026-11-17'), createdAt: 0, updatedAt: 0 }],
      checks: [
        { id: 'h:2026-11-18', habitId: 'h', day: '2026-11-18', createdAt: 0 },
        { id: 'h:2026-11-09', habitId: 'h', day: '2026-11-09', createdAt: 0 },
      ],
      days: [
        { day: '2026-11-19', mode: 'normal', feeling: 'okay', smallWin: { actionId: 'x', title: 'Walk', at: 0 }, updatedAt: 0 },
        { day: '2026-11-21', mode: 'small', feeling: 'rough', updatedAt: 0 },
      ],
      missions: [goal('g', { title: 'Get fit' })],
      habits: [habit],
    });
    expect(s.days).toHaveLength(7);
    expect(s.activeCount).toBe(4); // Tue (task + focus), Wed (habit), Thu (okay win), Fri (task)
    expect(s.feelings).toEqual({ good: 0, okay: 1, rough: 1 });
    expect(s.wins).toEqual(['Read', 'Run']);
    expect(s.focusMs).toBe(1_800_000);
    expect(s.goals).toEqual([{ id: 'g', title: 'Get fit', steps: 1, focusMs: 1_800_000 }]);
    expect(s.habits).toEqual([{ id: 'h', title: 'Gym', done: 1, target: 3 }]);
  });

  it('never counts days after today', () => {
    expect(summariseWeek('2026-11-23', WED, dayOf, { actions: [], sessions: [], checks: [], days: [], missions: [], habits: [] }).days.map((d) => d.day)).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
    ]);
  });
});

describe('commonBlockers', () => {
  it('names what keeps coming up (twice or more), most often first', () => {
    const r = (blockers: string[]): WeekReview => ({ week: 'w', blockers, at: 0 });
    expect(commonBlockers([r(['Tired', 'Busy']), r(['Tired']), r(['My phone', 'Busy']), r(['Tired'])])).toEqual(['Tired', 'Busy']);
    expect(commonBlockers([r(['Tired'])])).toEqual([]);
  });
});

describe('focus goal', () => {
  it('goes first in suggestions', () => {
    const a = goal('a', { title: 'Alpha' });
    const b = goal('b', { title: 'Beta' });
    expect(orderGoals([a, b], 'b').map((g) => g.id)).toEqual(['b', 'a']);
    const tasks: Action[] = [
      { id: '1', title: 'A1', missionId: 'a', state: 'later', isMain: false, sortOrder: 1, createdAt: 0, updatedAt: 0 },
      { id: '2', title: 'B1', missionId: 'b', state: 'later', isMain: false, sortOrder: 2, createdAt: 0, updatedAt: 0 },
    ];
    expect(mainSuggestions(tasks, [a, b], SUN, at(SUN), [], 'b')[0]?.title).toBe('B1');
  });
});
