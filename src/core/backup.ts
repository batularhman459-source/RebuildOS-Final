import type { Action, DayRecord, FocusSession, Habit, HabitCheck, MetaEntry, Mission } from './types';

/**
 * Backup file format. Until accounts exist, this is the safety net that keeps
 * "your progress is never lost" true. Plain JSON so it stays readable.
 */

export const BACKUP_APP = 'rebuildos';
/** 2 adds habits. Version 1 files still restore (with no habits). */
export const BACKUP_VERSION = 2;

export interface BackupTables {
  actions: Action[];
  missions: Mission[];
  focusSessions: FocusSession[];
  days: DayRecord[];
  meta: MetaEntry[];
  habits: Habit[];
  habitChecks: HabitCheck[];
}

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number;
  tables: BackupTables;
}

export function makeBackup(tables: BackupTables, exportedAt: number): Backup {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt, tables };
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; reason: string };

const TABLES: (keyof BackupTables)[] = ['actions', 'missions', 'focusSessions', 'days', 'meta', 'habits', 'habitChecks'];
/** Tables added after version 1; missing in older files means empty. */
const OPTIONAL: (keyof BackupTables)[] = ['habits', 'habitChecks'];
const KEYS: Record<keyof BackupTables, string> = { actions: 'id', missions: 'id', focusSessions: 'id', days: 'day', meta: 'key', habits: 'id', habitChecks: 'id' };

/** Validate a backup file's text before anything on the device is touched. */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'This file isn’t a RebuildOS backup (it couldn’t be read).' };
  }
  if (typeof data !== 'object' || data === null) return { ok: false, reason: 'This file isn’t a RebuildOS backup.' };
  const b = data as Partial<Backup>;
  if (b.app !== BACKUP_APP) return { ok: false, reason: 'This file isn’t a RebuildOS backup.' };
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    return { ok: false, reason: 'This backup was made by a newer version of RebuildOS. Update the app and try again.' };
  }
  if (typeof b.tables !== 'object' || b.tables === null) return { ok: false, reason: 'This backup is incomplete.' };
  for (const name of TABLES) {
    const tables = b.tables as unknown as Record<string, unknown>;
    if (tables[name] === undefined && OPTIONAL.includes(name)) tables[name] = [];
    const rows = tables[name];
    if (!Array.isArray(rows)) return { ok: false, reason: 'This backup is incomplete.' };
    const key = KEYS[name];
    if (!rows.every((r) => typeof r === 'object' && r !== null && typeof (r as Record<string, unknown>)[key] === 'string')) {
      return { ok: false, reason: 'This backup is damaged.' };
    }
  }
  return { ok: true, backup: b as Backup };
}

export function backupFileName(exportedAt: number): string {
  const d = new Date(exportedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `rebuildos-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}
