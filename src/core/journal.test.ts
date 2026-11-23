import { describe, expect, it } from 'vitest';
import { groupByMonth, promptsFor, PROMPTS, snippet, wordCount } from './journal';
import type { JournalEntry } from './types';

const e = (day: string, text: string): JournalEntry => ({ id: day, day, text, createdAt: 0, updatedAt: 0 });

describe('journal', () => {
  it('offers three different prompts that change from day to day', () => {
    const a = promptsFor('2026-11-23');
    expect(new Set(a).size).toBe(3);
    for (const p of a) expect(PROMPTS).toContain(p);
    const days = ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'].map((d) => promptsFor(d)[0]);
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it('groups entries with text by month, newest first', () => {
    const groups = groupByMonth([e('2026-10-30', 'Old'), e('2026-11-02', 'A'), e('2026-11-20', 'B'), e('2026-11-21', '   ')]);
    expect(groups.map(([m, list]) => [m, list.map((x) => x.day)])).toEqual([
      ['2026-11', ['2026-11-20', '2026-11-02']],
      ['2026-10', ['2026-10-30']],
    ]);
  });

  it('shortens long text for the list and counts words', () => {
    expect(snippet('a  b\n c')).toBe('a b c');
    expect(snippet('x'.repeat(200)).length).toBe(140);
    expect(wordCount('  Ran 2 km today.  ')).toBe(4);
    expect(wordCount('')).toBe(0);
  });
});
