import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router-dom';
import { useDay } from '../app/day';
import { JournalEditor } from '../components/JournalEditor';
import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { Star } from '../components/Star';
import { dayKey } from '../core/day';
import { elapsedMs, formatDuration } from '../core/focus';
import { APP_LOCALE } from '../core/locale';
import { activeDays } from '../core/progress';
import type { Feeling } from '../core/types';
import { db } from '../data/db';
import styles from './Screen.module.css';
import own from './DayView.module.css';

const dayOf = (t: number) => dayKey(new Date(t));
const longDay = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const FEELING: Record<Feeling, string> = { good: 'Good day', okay: 'Okay day', rough: 'Rough day' };

/** One day: how it felt, what got done, and its journal page. Opened from a star or the journal. */
export function DayView() {
  const today = useDay();
  const { day = today } = useParams();
  const data = useLiveQuery(async () => {
    const [actions, sessions, checks, record, habits, allDays] = await Promise.all([
      db.actions.toArray(),
      db.focusSessions.toArray(),
      db.habitChecks.where('day').equals(day).toArray(),
      db.days.get(day),
      db.habits.toArray(),
      db.days.toArray(),
    ]);
    const done = actions.filter((a) => !a.deletedAt && a.state === 'done' && a.completedAt && dayOf(a.completedAt) === day);
    const focusMs = sessions
      .filter((s) => !s.deletedAt && s.finishedAt && dayOf(s.finishedAt) === day)
      .reduce((t, s) => t + elapsedMs(s.segments, s.finishedAt!), 0);
    const counted = activeDays(actions, sessions, dayOf, checks, allDays.filter((d) => d.smallWin).map((d) => d.day)).has(day);
    const habitTitles = checks.map((c) => habits.find((h) => h.id === c.habitId)?.title).filter((t): t is string => !!t);
    return { done, focusMs, counted, habitTitles, record };
  }, [day]);

  const date = new Date(`${day}T12:00:00`);
  const isToday = day === today;

  return (
    <div className={styles.screen}>
      <PageHeader back={{ to: '/sky', label: 'Sky' }} title={isToday ? 'Today' : longDay.format(date)} />

      {data && (
        <div className={own.summary}>
          <div className={own.badgeRow}>
            {data.counted ? (
              <span className={own.badge}>
                <Star size={14} />
                Counted
              </span>
            ) : (
              <span className={own.badgeMuted}>No star this day, and that’s okay</span>
            )}
            {data.record?.feeling && <span className={own.badgeMuted}>{FEELING[data.record.feeling]}</span>}
          </div>
          {(data.done.length > 0 || data.habitTitles.length > 0 || data.focusMs >= 60_000 || data.record?.smallWin) && (
            <ul className={own.facts}>
              {data.done.map((a) => (
                <li key={a.id}>Done: {a.title}</li>
              ))}
              {data.record?.smallWin && <li>Smaller version: {data.record.smallWin.title}</li>}
              {data.habitTitles.map((t) => (
                <li key={t}>Habit: {t}</li>
              ))}
              {data.focusMs >= 60_000 && <li>Focused {formatDuration(data.focusMs)}</li>}
            </ul>
          )}
        </div>
      )}

      <Section title="Journal">
        <JournalEditor day={day} label={`Journal for ${isToday ? 'today' : longDay.format(date)}`} />
      </Section>
    </div>
  );
}
