import { describe, expect, it } from 'vitest';
import { backupFileName, makeBackup, parseBackup } from './backup';

const empty = { actions: [], missions: [], focusSessions: [], days: [], meta: [], habits: [], habitChecks: [] };

describe('backup', () => {
  it('round-trips through JSON', () => {
    const backup = makeBackup(
      { ...empty, actions: [{ id: 'a', title: 'x', state: 'today', isMain: true, createdAt: 1, updatedAt: 1, sortOrder: 1 }] },
      123,
    );
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok && parsed.backup.tables.actions[0]?.title).toBe('x');
  });

  it('rejects files that are not RebuildOS backups', () => {
    expect(parseBackup('not json').ok).toBe(false);
    expect(parseBackup('{"hello":1}').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'rebuildos', version: 1, tables: { actions: [] } })).ok).toBe(false);
  });

  it('rejects damaged rows and newer versions', () => {
    expect(parseBackup(JSON.stringify(makeBackup({ ...empty, actions: [{ title: 'no id' } as never] }, 1))).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...makeBackup(empty, 1), version: 99 })).ok).toBe(false);
  });

  it('names the file by date', () => {
    expect(backupFileName(new Date(2026, 10, 3, 20).getTime())).toBe('rebuildos-backup-2026-11-03.json');
  });
});

describe('older backups', () => {
  it('restore version 1 files that have no habits', () => {
    const v1 = { app: 'rebuildos', version: 1, exportedAt: 1, tables: { actions: [], missions: [], focusSessions: [], days: [], meta: [] } };
    const parsed = parseBackup(JSON.stringify(v1));
    expect(parsed.ok && parsed.backup.tables.habits).toEqual([]);
  });
});
