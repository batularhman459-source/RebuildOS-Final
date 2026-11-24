import { daysBetween } from '../core/day';
import type { DayKey } from '../core/types';
import { db } from './db';

/**
 * Keeping the sky safe while everything lives on one phone: when the last backup was,
 * and a gentle reminder now and then (never more than once a week).
 */

const LAST_BACKUP = 'lastBackupAt';
const NUDGE_DISMISSED = 'backupNudgeDismissedDay';
/** Remind once there is something worth keeping, and again two weeks after a backup. */
const MIN_STARS = 5;
const BACKUP_EVERY_DAYS = 14;
const QUIET_DAYS = 7;

export async function markBackedUp(): Promise<void> {
  await db.meta.put({ key: LAST_BACKUP, value: Date.now() });
}

export async function lastBackupAt(): Promise<number | undefined> {
  return (await db.meta.get(LAST_BACKUP))?.value as number | undefined;
}

export async function dismissBackupNudge(day: DayKey): Promise<void> {
  await db.meta.put({ key: NUDGE_DISMISSED, value: day });
}

/** Whether Today should suggest a backup. Pure inputs so it can be tested. */
export function backupNudgeDue(stars: number, lastBackupDay: DayKey | undefined, dismissedDay: DayKey | undefined, today: DayKey): boolean {
  if (stars < MIN_STARS) return false;
  if (dismissedDay && daysBetween(dismissedDay, today) < QUIET_DAYS) return false;
  return !lastBackupDay || daysBetween(lastBackupDay, today) >= BACKUP_EVERY_DAYS;
}

export async function getBackupNudgeInputs(): Promise<{ lastBackup?: number; dismissed?: DayKey }> {
  const [last, dismissed] = await Promise.all([db.meta.get(LAST_BACKUP), db.meta.get(NUDGE_DISMISSED)]);
  return { lastBackup: last?.value as number | undefined, dismissed: dismissed?.value as DayKey | undefined };
}
