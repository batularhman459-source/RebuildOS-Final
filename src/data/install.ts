import { useEffect, useState } from 'react';
import { detectPlatform, isIOSSafari, type Platform } from '../core/install';
import { db } from './db';
import { isInstalled } from './storage';

/** Install state: whether the friendly prompt is due and whether it was shown. */

const PROMPT_DUE_KEY = 'installPromptDue';
const PROMPT_SHOWN_KEY = 'installPromptShown';

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

/** On iPhone, whether this is Safari (which can always add to the home screen). */
export function inIOSSafari(): boolean {
  return isIOSSafari(navigator.userAgent);
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
