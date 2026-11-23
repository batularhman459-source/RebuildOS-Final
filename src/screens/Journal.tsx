import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useDay } from '../app/day';
import { JournalEditor } from '../components/JournalEditor';
import { PageHeader } from '../components/PageHeader';
import { Section } from '../components/Section';
import { groupByMonth, snippet } from '../core/journal';
import { APP_LOCALE } from '../core/locale';
import type { Feeling } from '../core/types';
import { db } from '../data/db';
import styles from './Screen.module.css';
import own from './Journal.module.css';

const monthName = new Intl.DateTimeFormat(APP_LOCALE, { month: 'long', year: 'numeric' });
const dayName = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'long', day: 'numeric', month: 'short' });
const FEELING: Record<Feeling, string> = { good: 'Good day', okay: 'Okay day', rough: 'Rough day' };

/** The journal: today's page on top, earlier days below. Each day opens its own page. */
export function Journal() {
  const today = useDay();
  const data = useLiveQuery(async () => {
    const [entries, days] = await Promise.all([db.journal.toArray(), db.days.toArray()]);
    return { groups: groupByMonth(entries.filter((e) => e.day !== today)), feelings: new Map(days.filter((d) => d.feeling).map((d) => [d.day, d.feeling!])) };
  }, [today]);

  return (
    <div className={styles.screen}>
      <PageHeader back={{ to: '/sky', label: 'Sky' }} title="Journal" />

      <Section title="Today" subtitle={dayName.format(new Date(`${today}T12:00:00`))}>
        <JournalEditor day={today} label="Today’s journal" />
      </Section>

      {data &&
        (data.groups.length === 0 ? (
          <p className={own.empty}>Earlier days will show up here. You can also tap any star in your sky to open that day.</p>
        ) : (
          data.groups.map(([month, entries]) => (
            <Section key={month} title={monthName.format(new Date(`${month}-15T12:00:00`))}>
              <ul className={own.list}>
                {entries.map((e) => {
                  const feeling = data.feelings.get(e.day);
                  return (
                    <li key={e.id}>
                      <Link to={`/day/${e.day}`} className={own.entry}>
                        <span className={own.entryHead}>
                          <span className={own.entryDay}>{dayName.format(new Date(`${e.day}T12:00:00`))}</span>
                          {feeling && <span className={own.feeling}>{FEELING[feeling]}</span>}
                        </span>
                        {e.prompt && <span className={own.prompt}>{e.prompt}</span>}
                        <span className={own.snippet}>{snippet(e.text)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          ))
        ))}
    </div>
  );
}
