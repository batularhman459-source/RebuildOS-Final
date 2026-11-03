import { describe, expect, it } from 'vitest';
import { goalProgress, parseAmount, withUnit } from './goals';
import type { Action, Mission } from './types';

const goal = (p: Partial<Mission> = {}): Mission => ({ id: 'g', title: 'Goal', status: 'active', createdAt: 0, updatedAt: 0, sortOrder: 0, ...p });
let seq = 0;
const step = (p: Partial<Action>): Action => {
  seq += 1;
  return { id: `a${seq}`, title: 'x', state: 'later', isMain: false, createdAt: 0, updatedAt: 0, sortOrder: seq, missionId: 'g', ...p };
};

describe('goalProgress', () => {
  it('uses the measurable target when there is one', () => {
    const p = goalProgress(goal({ measure: { target: 21, unit: 'km', current: 12 } }), []);
    expect(p).toMatchObject({ kind: 'measure', label: '12 km of 21 km' });
    expect(p.fraction).toBeCloseTo(12 / 21);
  });

  it('caps progress between empty and full', () => {
    expect(goalProgress(goal({ measure: { target: 1000, unit: '€', current: 1500 } }), []).fraction).toBe(1);
    expect(goalProgress(goal({ measure: { target: 1000, unit: '€', current: -5 } }), []).fraction).toBe(0);
  });

  it('counts steps otherwise', () => {
    const actions = [step({ state: 'done', completedAt: 1 }), step({ state: 'done', completedAt: 2 }), step({}), step({ state: 'today' }), step({ missionId: 'other' })];
    expect(goalProgress(goal(), actions)).toMatchObject({ kind: 'steps', done: 2, total: 4, fraction: 0.5, label: '2 of 4 steps done' });
  });

  it('says so when there are no steps yet', () => {
    expect(goalProgress(goal(), []).kind).toBe('none');
  });
});

describe('numbers', () => {
  it('puts currency symbols first and other units after', () => {
    expect(withUnit(1250, '€')).toBe('€1,250');
    expect(withUnit(12.5, 'km')).toBe('12.5 km');
    expect(withUnit(3, 'chapters')).toBe('3 chapters');
  });

  it('reads numbers typed with commas or dots', () => {
    expect(parseAmount('12')).toBe(12);
    expect(parseAmount('1,5')).toBe(1.5);
    expect(parseAmount('1.250,5')).toBe(1250.5);
    expect(parseAmount('1,250')).toBe(1250);
    expect(parseAmount('')).toBeUndefined();
    expect(parseAmount('abc')).toBeUndefined();
  });
});

describe('templates', () => {
  it('each have a label, and real ones have steps to start from', async () => {
    const { GOAL_TEMPLATES } = await import('./templates');
    for (const t of GOAL_TEMPLATES) {
      expect(t.label).not.toBe('');
      if (t.id !== 'own') {
        expect(t.goal).not.toBe('');
        expect(t.steps.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
