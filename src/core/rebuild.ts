import { daysBetween } from './day';
import { activeMissions, missionStats, nextAction } from './missions';
import { isLive } from './today';
import type { Action, DayKey, FocusSession, Mission, RebuildSlot, RebuildSlotKind } from './types';

/**
 * Rules for Rebuild — a smaller day. See docs/product-brief.md §4.5.
 * A small day is up to three small things; any of them counts. No score.
 */

export const SLOT_ORDER: RebuildSlotKind[] = ['forward', 'body', 'space'];

export const SLOT_LABELS: Record<RebuildSlotKind, string> = {
  forward: 'One step forward',
  body: 'Move your body',
  space: 'Reset your space',
};

export const SLOT_SUGGESTIONS: Record<RebuildSlotKind, string[]> = {
  forward: [],
  body: ['10-minute walk', 'Stretch for 5 minutes', 'Cook a proper meal', 'Go to bed on time', 'Drink a glass of water'],
  space: ['Clear your desk', 'Do the dishes', 'Make your bed', 'Take out the rubbish', 'Tidy one drawer'],
};

/**
 * The step-forward slot: the Main Action, else the next step of the most recently
 * worked-on active Mission, else the first open Today Action. Undefined when there's nothing.
 */
export function suggestForward(actions: readonly Action[], missions: readonly Mission[], sessions: readonly FocusSession[]): Action | undefined {
  const live = actions.filter((a) => isLive(a) && a.origin !== 'rebuild');
  const main = live.find((a) => a.state === 'today' && a.isMain);
  if (main) return main;

  const ranked = activeMissions(missions)
    .map((m) => ({ m, last: missionStats(m.id, live, sessions).lastWorkedAt ?? m.updatedAt }))
    .sort((a, b) => b.last - a.last);
  for (const { m } of ranked) {
    const next = nextAction(m.id, live);
    if (next) return next;
  }
  return live.filter((a) => a.state === 'today').sort((a, b) => a.sortOrder - b.sortOrder)[0];
}

/** The three pre-filled slots shown when a small day starts. */
export function defaultSlots(actions: readonly Action[], missions: readonly Mission[], sessions: readonly FocusSession[]): RebuildSlot[] {
  const forward = suggestForward(actions, missions, sessions);
  return [
    { kind: 'forward', title: forward?.title ?? '', actionId: forward?.id, done: false },
    { kind: 'body', title: SLOT_SUGGESTIONS.body[0]!, done: false },
    { kind: 'space', title: SLOT_SUGGESTIONS.space[0]!, done: false },
  ];
}

/** After this many days away, opening the app shows Welcome back. */
export const WELCOME_BACK_AFTER_DAYS = 3;

export function shouldWelcomeBack(lastSeenDay: DayKey | undefined, today: DayKey): boolean {
  return lastSeenDay !== undefined && daysBetween(lastSeenDay, today) >= WELCOME_BACK_AFTER_DAYS;
}

/**
 * Offer a smaller day when yesterday clearly didn't go to plan: at least two Actions
 * had to move to Later and nothing was completed. Never phrased as a failure.
 */
export function shouldOfferSmallDay(movedToLater: number, completedYesterday: number): boolean {
  return movedToLater >= 2 && completedYesterday === 0;
}
