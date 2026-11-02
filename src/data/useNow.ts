import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs` while `ticking`, and whenever the app returns to the foreground. */
export function useNow(ticking: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const onVisible = () => document.visibilityState === 'visible' && update();
    document.addEventListener('visibilitychange', onVisible);
    const timer = ticking ? window.setInterval(update, intervalMs) : undefined;
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) window.clearInterval(timer);
    };
  }, [ticking, intervalMs]);

  return now;
}
