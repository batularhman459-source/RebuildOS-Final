import { useEffect, useState } from 'react';

/**
 * Appearance: follow the phone (default), or always light / always dark.
 * A per-device preference, so it lives in localStorage and is applied before first
 * paint by a tiny script in index.html.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'rebuildos-theme';
const EVENT = 'rebuildos-theme-change';

export function getTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function setTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Storage blocked: still apply for this visit.
  }
  if (choice === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
  window.dispatchEvent(new Event(EVENT));
}

export function isDark(choice: ThemeChoice = getTheme()): boolean {
  if (choice !== 'system') return choice === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Re-renders when the choice or the phone's setting changes; returns whether dark is showing. */
export function useDarkMode(): { choice: ThemeChoice; dark: boolean } {
  const [state, setState] = useState(() => ({ choice: getTheme(), dark: isDark() }));
  useEffect(() => {
    const update = () => setState({ choice: getTheme(), dark: isDark() });
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    window.addEventListener(EVENT, update);
    media?.addEventListener('change', update);
    return () => {
      window.removeEventListener(EVENT, update);
      media?.removeEventListener('change', update);
    };
  }, []);
  return state;
}
