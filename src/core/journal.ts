import type { DayKey, JournalEntry } from './types';

/**
 * The journal: a few lines a day, never required. Prompts help when the page is blank;
 * they rotate by day so they don't feel canned. Pure helpers only.
 */

export const PROMPTS = [
  'What went well today?',
  'What got in the way?',
  'What am I proud of, even if it’s small?',
  'How did I feel, honestly?',
  'What do I want tomorrow to look like?',
  'What did I learn about myself?',
  'Who or what helped me today?',
] as const;

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Three prompts for a day, different from one day to the next. */
export function promptsFor(day: DayKey, count = 3): string[] {
  const start = hash(day) % PROMPTS.length;
  return Array.from({ length: count }, (_, i) => PROMPTS[(start + i) % PROMPTS.length]!);
}

export function hasText(e: Pick<JournalEntry, 'text'> | undefined): boolean {
  return !!e && e.text.trim().length > 0;
}

/** Entries with text, newest first, grouped by month ("2026-11"). */
export function groupByMonth(entries: readonly JournalEntry[]): [string, JournalEntry[]][] {
  const groups = new Map<string, JournalEntry[]>();
  for (const e of [...entries].filter(hasText).sort((a, b) => b.day.localeCompare(a.day))) {
    const month = e.day.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), e]);
  }
  return [...groups.entries()];
}

/** The first couple of lines, for the list. */
export function snippet(text: string, max = 140): string {
  const flat = text.trim().replace(/\s+/g, ' ');
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Words in an entry (shown quietly under the editor). */
export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
