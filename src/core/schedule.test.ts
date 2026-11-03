import { describe, expect, it } from 'vitest';
import { compareForToday, dayLabel, dueForToday, normaliseTime, upcoming } from './schedule';
import type { Action } from './types';

let seq = 0;
function task(p: Partial<Action>): Action {
  seq += 1;
  return { id: `t${seq}`, title: `T${seq}`, state: 'later', isMain: false, createdAt: 0, updatedAt: 0, sortOrder: seq, ...p };
}

describe('dated tasks', () => {
  it('come onto Today on their day, including days the app was not opened', () => {
    const actions = [
      task({ id: 'today', targetDay: '2026-11-03' }),
      task({ id: 'missed', targetDay: '2026-11-01' }),
      task({ id: 'future', targetDay: '2026-11-05' }),
      task({ id: 'undated' }),
      task({ id: 'done', state: 'done', targetDay: '2026-11-03' }),
    ];
    expect(dueForToday(actions, '2026-11-03')).toEqual(['today', 'missed']);
  });

  it('lists upcoming tasks soonest first', () => {
    const actions = [task({ id: 'b', targetDay: '2026-11-09' }), task({ id: 'a', targetDay: '2026-11-04' }), task({ id: 'now', targetDay: '2026-11-03' })];
    expect(upcoming(actions, '2026-11-03').map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('labels days naturally', () => {
    const fmt = (d: string) => `F(${d})`;
    expect(dayLabel('2026-11-03', '2026-11-03', fmt)).toBe('Today');
    expect(dayLabel('2026-11-04', '2026-11-03', fmt)).toBe('Tomorrow');
    expect(dayLabel('2026-11-09', '2026-11-03', fmt)).toBe('F(2026-11-09)');
  });
});

describe('times', () => {
  it('order timed tasks first, by time', () => {
    const list = [task({ id: 'x', sortOrder: 1 }), task({ id: 'evening', time: '18:00' }), task({ id: 'morning', time: '07:30' })];
    expect([...list].sort(compareForToday).map((a) => a.id)).toEqual(['morning', 'evening', 'x']);
  });

  it('normalise what the time picker gives', () => {
    expect(normaliseTime('7:05')).toBe('07:05');
    expect(normaliseTime('18:00')).toBe('18:00');
    expect(normaliseTime('25:00')).toBeUndefined();
    expect(normaliseTime('')).toBeUndefined();
  });
});
