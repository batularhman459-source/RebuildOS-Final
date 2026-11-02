import { useEffect, useState } from 'react';
import { dayKey } from '../core/day';
import type { DayKey } from '../core/types';
import { runRollover } from './actions';

/**
 * The current logical day. Updates when the app returns to the foreground and
 * once a minute, and applies the overnight rule whenever the day changes.
 */
export function useToday(): DayKey {
  const [day, setDay] = useState(() => dayKey(new Date()));

  useEffect(() => {
    const check = () => setDay(dayKey(new Date()));
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    const timer = window.setInterval(check, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    void runRollover(day);
  }, [day]);

  return day;
}
