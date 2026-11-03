import { backupFileName, makeBackup, type Backup } from '../core/backup';
import { db } from './db';

/** Everything on this device, as a backup. */
export async function exportBackup(): Promise<Backup> {
  const [actions, missions, focusSessions, days, meta, habits, habitChecks] = await Promise.all([
    db.actions.toArray(),
    db.missions.toArray(),
    db.focusSessions.toArray(),
    db.days.toArray(),
    db.meta.toArray(),
    db.habits.toArray(),
    db.habitChecks.toArray(),
  ]);
  return makeBackup({ actions, missions, focusSessions, days, meta, habits, habitChecks }, Date.now());
}

/**
 * Hand the backup to the person: the share sheet where available (best on iPhone,
 * where it can go to Files or iCloud), otherwise a normal download.
 */
export async function saveBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const backup = await exportBackup();
  const name = backupFileName(backup.exportedAt);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'RebuildOS backup' });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Fall through to a download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

/** Replace everything on this device with the backup. Callers must validate with parseBackup first. */
export async function restoreBackup(backup: Backup): Promise<void> {
  const { actions, missions, focusSessions, days, meta, habits, habitChecks } = backup.tables;
  const tables = [db.actions, db.missions, db.focusSessions, db.days, db.meta, db.habits, db.habitChecks];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
    await db.habits.bulkPut(habits);
    await db.habitChecks.bulkPut(habitChecks);
    await db.actions.bulkPut(actions);
    await db.missions.bulkPut(missions);
    await db.focusSessions.bulkPut(focusSessions);
    await db.days.bulkPut(days);
    await db.meta.bulkPut(meta);
  });
}
