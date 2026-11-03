import { useEffect, useState } from 'react';
import { detectPlatform, type Platform } from '../core/install';
import type { DayKey } from '../core/types';
import { db } from './db';
import { isInstalled } from './storage';

/** Install state: which days the app was opened in a browser, and whether the friendly prompt was shown. */

const OPEN_DAYS_KEY = 'browserOpenDays';
const PROMPT_DUE_KEY = 'installPromptDue';
const PROMPT_SHOWN_KEY = 'installPromptShown';

/** Remember that the app was opened in a browser (not installed) on `day`. Returns the number of such days. */
export async function recordBrowserOpen(day: DayKey): Promise<number> {
  const days = ((await db.meta.get(OPEN_DAYS_KEY))?.value as DayKey[] | undefined) ?? [];
  if (!days.includes(day)) days.push(day);
  await db.meta.put({ key: OPEN_DAYS_KEY, value: days.slice(-30) });
  return days.length;
}

export async function markInstallPromptDue(): Promise<void> {
  await db.meta.put({ key: PROMPT_DUE_KEY, value: true });
}

export async function getInstallPromptState(): Promise<{ due: boolean; shownBefore: boolean }> {
  const [due, shown] = await Promise.all([db.meta.get(PROMPT_DUE_KEY), db.meta.get(PROMPT_SHOWN_KEY)]);
  return { due: due?.value === true, shownBefore: shown?.value === true };
}

export async function markInstallPromptShown(): Promise<void> {
  await db.meta.put({ key: PROMPT_SHOWN_KEY, value: true });
}

export function currentPlatform(): Platform {
  return detectPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0);
}

/** A phone-sized touch screen. Desktop browsers are never blocked. */
export function isPhone(): boolean {
  return window.matchMedia('(pointer: coarse)').matches && Math.min(window.screen.width, window.screen.height) <= 820;
}

// ── Native install prompt (Chrome, Edge, Android) ─────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/** Call once at startup so the browser's install prompt can be offered later. */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

/** Whether the browser can show its own install prompt right now. */
export function useCanPromptInstall(): boolean {
  const [can, setCan] = useState(deferred !== null);
  useEffect(() => {
    const update = () => setCan(deferred !== null);
    listeners.add(update);
    return () => void listeners.delete(update);
  }, []);
  return can;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  listeners.forEach((l) => l());
  return outcome === 'accepted';
}

export { isInstalled };
