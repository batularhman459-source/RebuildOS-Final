import type { DayKey, JournalEntry } from '../core/types';
import { db } from './db';

/** Journal entries: one per day. An emptied entry is removed. */

export async function getEntry(day: DayKey): Promise<JournalEntry | undefined> {
  return db.journal.get(day);
}

export async function saveEntry(day: DayKey, text: string, prompt?: string): Promise<void> {
  const existing = await db.journal.get(day);
  if (!text.trim()) {
    if (existing) await db.journal.delete(day);
    return;
  }
  const t = Date.now();
  await db.journal.put({ id: day, day, text, prompt: prompt ?? existing?.prompt, createdAt: existing?.createdAt ?? t, updatedAt: t });
}
