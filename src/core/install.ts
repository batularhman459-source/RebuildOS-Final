/**
 * Install rules. RebuildOS works best from the home screen: it opens like an app and,
 * on iPhone, home-screen apps keep their data (Safari can clear site data after ~7 days
 * without a visit). Installing is always encouraged, never required.
 * See docs/product-brief.md (V1.1 direction).
 */

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

/**
 * On iPhone, Safari can always add a web app to the home screen; other browsers
 * (Chrome, Firefox, Edge, DuckDuckGo, Google…) may not, so we point them to Safari.
 */
export function isIOSSafari(userAgent: string): boolean {
  return !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|Ddg\/|GSA\/|YaBrowser|Focus\//i.test(userAgent);
}
