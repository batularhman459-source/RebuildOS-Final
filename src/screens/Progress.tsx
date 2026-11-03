import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useDay } from '../app/day';
import { Star } from '../components/Star';
import { YourData } from '../components/YourData';
import { dayKey } from '../core/day';
import { formatDuration } from '../core/focus';
import { APP_LOCALE } from '../core/locale';
import { activeMissions, missionStats } from '../core/missions';
import { allTime, lastSevenDays } from '../core/progress';
import { db } from '../data/db';
import styles from './Screen.module.css';
import own from './Progress.module.css';

const weekday = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'narrow' });
const weekdayLong = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'long' });
const dayOf = (t: number) => dayKey(new Date(t));

function focusText(ms: number): string {
  return ms >= 60_000 ? formatDuration(ms) : '0 min';
}

/** Honest progress in real units. Looking back lives here, not on Today. See DESIGN.md and docs/product-brief.md §4.7. */
export function Progress() {
  const today = useDay();
  const data = useLiveQuery(async () => {
    const [actions, sessions, missions] = await Promise.all([db.actions.toArray(), db.focusSessions.toArray(), db.missions.toArray()]);
    return { actions, sessions, missions };
  }, []);

  if (!data) return <div className={styles.screen} />;
  const week = lastSevenDays(today, data.actions, data.sessions, dayOf);
  const record = allTime(data.actions, data.sessions);
  const missions = activeMissions(data.missions).map((m) => ({ m, stats: missionStats(m.id, data.actions, data.sessions) }));

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Progress</h1>
      </header>

      <section aria-labelledby="week-heading" className={own.section}>
        <h2 id="week-heading" className={own.heading}>
          Last 7 days
        </h2>
        <ol className={own.week}>
          {week.days.map(({ day, active }) => {
            const date = new Date(`${day}T12:00:00`);
            const isToday = day === today;
            return (
              <li key={day} className={own.day}>
                <Star
                  size={isToday ? 26 : 22}
                  variant={active ? 'solid' : 'empty'}
                  label={`${isToday ? 'Today' : weekdayLong.format(date)}: ${active ? 'active' : 'not active'}`}
                />
                <span className={`${own.dayLabel} ${isToday ? own.today : ''}`} aria-hidden="true">
                  {weekday.format(date)}
                </span>
              </li>
            );
          })}
        </ol>
        <p className={own.caption}>
          {week.activeCount === 0
            ? 'Each day you finish something or focus, a star fills in.'
            : `Active on ${week.activeCount} of the last 7 days.`}
        </p>
        <dl className={own.stats}>
          <div>
            <dt>actions done</dt>
            <dd>{week.actionsDone}</dd>
          </div>
          <div>
            <dt>focused</dt>
            <dd>{focusText(week.focusMs)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="record-heading" className={own.section}>
        <h2 id="record-heading" className={own.heading}>
          All time
        </h2>
        <dl className={own.record}>
          <div>
            <dt>focused</dt>
            <dd>{focusText(record.focusMs)}</dd>
          </div>
          <div>
            <dt>actions done</dt>
            <dd>{record.actionsDone}</dd>
          </div>
        </dl>
        <p className={own.caption}>Your record only ever grows.</p>
      </section>

      {missions.length > 0 && (
        <section aria-labelledby="missions-heading" className={own.section}>
          <h2 id="missions-heading" className={own.heading}>
            Missions
          </h2>
          <ul className={own.missions}>
            {missions.map(({ m, stats }) => (
              <li key={m.id}>
                <Link to={`/mission/${m.id}`} className={own.missionRow}>
                  <span className={own.missionTitle}>{m.title}</span>
                  <span className={own.missionMeta}>
                    {focusText(stats.focusMs)} · {stats.done} done
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <YourData />
    </div>
  );
}
