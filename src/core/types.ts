/**
 * Domain types for RebuildOS. See docs/product-brief.md for the rules behind them.
 *
 * Every record carries an id, createdAt/updatedAt and a soft-delete marker so
 * on-device data can later sync to an account without migration.
 */

/** ISO calendar date of a *logical* day (which starts at 04:00 local time), e.g. "2026-11-02". */
export type DayKey = string;

/** Milliseconds since the Unix epoch. */
export type Timestamp = number;

export interface BaseRecord {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

export type ActionState = 'later' | 'today' | 'done';

export interface Action extends BaseRecord {
  title: string;
  state: ActionState;
  /** Only one Today Action can be the Main Action. */
  isMain: boolean;
  missionId?: string;
  estimateMinutes?: number;
  /** Logical day this Action was put on Today. */
  todayDay?: DayKey;
  /** Optional day the user wants to do it. Dated Later tasks move onto Today on that day. */
  targetDay?: DayKey;
  /** Optional time of day, "HH:MM". Only orders the day; no reminders yet. */
  time?: string;
  completedAt?: Timestamp;
  /** Manual ordering within a list. */
  sortOrder: number;
  /**
   * 'rebuild' marks small Actions created for a small day ("10-minute walk").
   * If unfinished when the day ends they are cleared instead of moved to Later.
   */
  origin?: 'rebuild';
}

export type MissionStatus = 'active' | 'parked' | 'complete';

export interface Mission extends BaseRecord {
  title: string;
  doneWhen?: string;
  targetDay?: DayKey;
  status: MissionStatus;
  completedAt?: Timestamp;
  sortOrder: number;
}

/** A continuous stretch of running time inside a Focus session. `end` is absent while running. */
export interface FocusSegment {
  start: Timestamp;
  end?: Timestamp;
}

export interface FocusSession extends BaseRecord {
  actionId: string;
  segments: FocusSegment[];
  targetMinutes?: number;
  /** Set when the user taps Finish. */
  finishedAt?: Timestamp;
}

export type DayMode = 'normal' | 'small';

export type RebuildSlotKind = 'forward' | 'body' | 'space';

export interface RebuildSlot {
  kind: RebuildSlotKind;
  title: string;
  /** Linked Action, if the slot uses an existing or newly created Action. */
  actionId?: string;
  done: boolean;
}

export interface DayRecord {
  /** Primary key. */
  day: DayKey;
  mode: DayMode;
  rebuildSlots?: RebuildSlot[];
  /** 1–5, optional, from Close the day. */
  energy?: number;
  closedAt?: Timestamp;
  /** Whether the overnight rule already ran for this day. */
  rolledOverAt?: Timestamp;
  updatedAt: Timestamp;
}

/** Small key–value store for app-level state (last opened, session count, install state…). */
export interface MetaEntry {
  key: string;
  value: unknown;
}
