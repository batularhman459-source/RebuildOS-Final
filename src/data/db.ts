import Dexie, { type Table } from 'dexie';
import type { Action, DayRecord, FocusSession, MetaEntry, Mission } from '../core/types';

/**
 * On-device database (IndexedDB via Dexie).
 * Indexes are listed after the primary key; only indexed fields can be queried with `where`.
 */
export class RebuildDB extends Dexie {
  actions!: Table<Action, string>;
  missions!: Table<Mission, string>;
  focusSessions!: Table<FocusSession, string>;
  days!: Table<DayRecord, string>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super('rebuildos');
    this.version(1).stores({
      actions: 'id, state, missionId, todayDay, updatedAt',
      missions: 'id, status, updatedAt',
      focusSessions: 'id, actionId, createdAt',
      days: 'day',
      meta: 'key',
    });
  }
}

export const db = new RebuildDB();

export function newId(): string {
  return crypto.randomUUID();
}
