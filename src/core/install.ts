/**
 * Install rules. RebuildOS lives on the home screen: it opens like an app and,
 * on iPhone, home-screen apps keep their data (Safari can clear site data after
 * ~7 days without a visit). See docs/product-brief.md §6.
 */

/** Opening the app in a phone browser on this many different days asks for install before continuing. */
export const REQUIRE_INSTALL_AFTER_DAYS = 3;

export function shouldRequireInstall(opts: { installed: boolean; isPhone: boolean; openDays: number }): boolean {
  return !opts.installed && opts.isPhone && opts.openDays >= REQUIRE_INSTALL_AFTER_DAYS;
}

/** The friendly prompt appears once, after the first finished Focus session. */
export function shouldPromptInstall(opts: { installed: boolean; due: boolean; shownBefore: boolean }): boolean {
  return !opts.installed && opts.due && !opts.shownBefore;
}

export type Platform = 'ios' | 'android' | 'other';

export function detectPlatform(userAgent: string, maxTouchPoints: number): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  // iPadOS reports itself as a Mac with touch.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'other';
}
