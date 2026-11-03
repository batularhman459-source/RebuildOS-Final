import { describe, expect, it } from 'vitest';
import { activeDays, allTime, lastSevenDays, summarise } from './progress';
import type { Action, FocusSession } from './types';

const MIN = 60_000;
// Timestamps in these tests are "day number * 1000"; day 2 → 2026-11-02.
const dayOf = (t: number) => `2026-11-${String(Math.floor(t / 1000)).padStart(2, '0')}`;

let seq = 0;
function done(day: number, p: Partial<Action> = {}): Action {
  seq += 1;
  return { id: `a${seq}`, title: 'x', state: 'done', isMain: false, createdAt: 0, updatedAt: 0, sortOrder: 0, completedAt: day * 1000, ...p };
}
function session(day: number, minutes: number, p: Partial<FocusSession> = {}): FocusSession {
  seq += 1;
  const end = day * 1000;
  return { id: `s${seq}`, actionId: 'a', segments: [{ start: end - minutes * MIN, end }], finishedAt: end, createdAt: 0, updatedAt: 0, ...p };
}

describe('activeDays', () => {
  it('counts a day with a completed Action or a finished Focus session', () => {
    const days = activeDays([done(1), done(3, { deletedAt: 1 })], [session(2, 25), session(4, 10, { finishedAt: undefined })], dayOf);
    expect([...days].sort()).toEqual(['2026-11-01', '2026-11-02']);
  });
});

describe('summaries', () => {
  const actions = [done(1), done(2), done(2), { ...done(2), state: 'today' as const }];
  const sessions = [session(2, 25), session(2, 20), session(1, 50)];

  it('summarises a single day', () => {
    expect(summarise(['2026-11-02'], actions, sessions, dayOf)).toEqual({ actionsDone: 2, focusMs: 45 * MIN });
  });

  it('builds the last seven days, oldest first', () => {
    const week = lastSevenDays('2026-11-07', actions, sessions, dayOf);
    expect(week.days.map((d) => d.active)).toEqual([true, true, false, false, false, false, false]);
    expect(week.activeCount).toBe(2);
    expect(week.actionsDone).toBe(3);
    expect(week.focusMs).toBe(95 * MIN);
  });

  it('keeps an all-time record', () => {
    expect(allTime(actions, sessions)).toEqual({ actionsDone: 3, focusMs: 95 * MIN });
  });
});
