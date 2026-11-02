/**
 * The interface is written in English, so dates are formatted in English too.
 * Using the device locale would mix languages (e.g. "Montag" next to English copy).
 * Revisit when the app is translated.
 */
export const APP_LOCALE = 'en-GB';

const shortDate = new Intl.DateTimeFormat(APP_LOCALE, { day: 'numeric', month: 'short' });

/** "14 Dec" from a day key. */
export function formatShortDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return shortDate.format(new Date(y, m - 1, d, 12));
}
