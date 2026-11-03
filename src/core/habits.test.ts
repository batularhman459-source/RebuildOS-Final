import { describe, expect, it } from 'vitest';
import { checkId, doneThisWeek, habitWeek, recentWeeks, scheduleLabel, showsToday, weekDays, weekStart } from './habits';
import type { Habit, HabitCheck } from './types';

// 2026-11-02 is a Monday; 2026-11-04 a Wednesday.
const habit = (p: Partial<Habit>): Habit => ({
  id: 'h',
  title: 'Gym',
  schedule: { kind: 'daily' },
  createdAt: new Date(2026, 9, 1).getTime(),
  updatedAt: 0,
  sortOrder: 0,
  ...p,
});
const check = (day: string, habitId = 'h'): HabitCheck => ({ id: checkId(habitId, day), habitId, day, createdAt: 0 });

describe('weeks', () => {
  it('run Monday to Sunday', () => {
    expect(weekStart('2026-11-04')).toBe('2026-11-02');
    expect(weekStart('2026-11-08')).toBe('2026-11-02'); // Sunday
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
    expect(weekDays('2026-11-04')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  });
});

describe('showsToday', () => {
  it('always shows daily habits', () => {
    expect(showsToday(habit({}), '2026-11-04', [])).toBe(true);
  });

  it('shows a weekly habit until the week’s target is reached', () => {
    const h = habit({ schedule: { kind: 'weekly', times: 2 } });
    expect(showsToday(h, '2026-11-04', [check('2026-11-02')])).toBe(true);
    expect(showsToday(h, '2026-11-05', [check('2026-11-02'), check('2026-11-04')])).toBe(false);
    // …but keeps showing on the day it was ticked, so the tick can be seen or undone.
    expect(showsToday(h, '2026-11-04', [check('2026-11-02'), check('2026-11-04')])).toBe(true);
    // A new week starts fresh.
    expect(showsToday(h, '2026-11-09', [check('2026-11-02'), check('2026-11-04')])).toBe(true);
  });

  it('hides paused and deleted habits', () => {
    expect(showsToday(habit({ pausedAt: 1 }), '2026-11-04', [])).toBe(false);
    expect(showsToday(habit({ deletedAt: 1 }), '2026-11-04', [])).toBe(false);
  });
});

describe('habitWeek', () => {
  it('shows this week as dots, future days empty, missed days just not done', () => {
    const week = habitWeek(habit({ schedule: { kind: 'weekly', times: 3 } }), '2026-11-04', [check('2026-11-02'), check('2026-11-04'), check('2026-10-30')]);
    expect(week.dots.map((d) => d.done)).toEqual([true, false, true, null, null, null, null]);
    expect(week.done).toBe(2);
    expect(week.target).toBe(3);
    expect(doneThisWeek('h', '2026-11-04', [check('2026-11-02'), check('2026-11-04')])).toBe(2);
  });
});

describe('recentWeeks', () => {
  it('counts the last full weeks, capped at the weekly target', () => {
    const h = habit({ schedule: { kind: 'weekly', times: 2 } });
    const checks = [check('2026-10-26'), check('2026-10-27'), check('2026-10-28'), check('2026-10-20')];
    expect(recentWeeks(h, '2026-11-04', checks, 2)).toEqual({ done: 3, possible: 4 });
  });

  it('ignores weeks before the habit existed', () => {
    const h = habit({ createdAt: new Date(2026, 9, 28).getTime() });
    expect(recentWeeks(h, '2026-11-04', [], 4).possible).toBe(7);
  });
});

describe('labels', () => {
  it('reads naturally', () => {
    expect(scheduleLabel({ kind: 'daily' })).toBe('Every day');
    expect(scheduleLabel({ kind: 'weekly', times: 3 })).toBe('3× a week');
  });
});
