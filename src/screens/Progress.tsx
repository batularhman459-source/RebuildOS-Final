import { useLiveQuery } from 'dexie-react-hooks';
import { Star } from '../components/Star';
import { dayKey, lastDays } from '../core/day';
import { elapsedMs, formatDuration } from '../core/focus';
import { db } from '../data/db';
import styles from './Screen.module.css';
import own from './Progress.module.css';

const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });

export function Progress() {
  const record = useLiveQuery(async () => {
    const [done, sessions] = await Promise.all([
      db.actions.where('state').equals('done').filter((a) => !a.deletedAt).count(),
      db.focusSessions.filter((s) => !s.deletedAt && s.finishedAt !== undefined).toArray(),
    ]);
    const focused = sessions.reduce((t, s) => t + elapsedMs(s.segments, s.finishedAt!), 0);
    return { done, focused };
  });

  const today = dayKey(new Date());
  const week = lastDays(today, 7);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Progress</h1>
      </header>

      <section className={own.week} aria-label="Last 7 days">
        {week.map((day) => (
          <div key={day} className={own.day}>
            {/* Active-day detection arrives with Actions and Focus (steps 1–2). */}
            <Star size={day === today ? 26 : 22} variant="empty" label={`${day}: not active yet`} />
            <span className={own.dayLabel}>{weekday.format(new Date(`${day}T12:00:00`))}</span>
          </div>
        ))}
      </section>

      <section className={own.record} aria-label="Your record">
        <div className={own.stat}>
          <span className={own.number}>{record ? formatDuration(record.focused) : '–'}</span>
          <span className={own.unit}>focused</span>
        </div>
        <div className={own.stat}>
          <span className={own.number}>{record ? record.done : '–'}</span>
          <span className={own.unit}>actions done</span>
        </div>
      </section>
    </div>
  );
}
