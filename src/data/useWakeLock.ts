import { useEffect } from 'react';

/**
 * Keep the screen awake while `active` (e.g. a running Focus session), where the
 * browser allows it. Re-acquired when the app returns to the foreground.
 * Failure is silent: the timer is correct either way.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | undefined;
    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) void s.release();
        else sentinel = s;
      } catch {
        /* not allowed right now — fine */
      }
    };
    const onVisible = () => document.visibilityState === 'visible' && void acquire();

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
