import { addDays } from '../core/day';
import { weekStart } from '../core/habits';
import { APP_LOCALE } from '../core/locale';
import type { HabitCheck } from '../core/types';
import styles from './HabitGrid.module.css';

interface HabitGridProps {
  habitId: string;
  title: string;
  today: string;
  checks: HabitCheck[];
  /** Day the habit was created; earlier cells are faded. */
  since: string;
  weeks?: number;
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const long = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * The last few weeks of a habit as a calendar of dots (Mon–Sun columns, this week at
 * the bottom). Done is filled; a missed day is just an empty dot — never a broken streak.
 */
export function HabitGrid({ habitId, title, today, checks, since, weeks = 5 }: HabitGridProps) {
  const done = new Set(checks.filter((c) => c.habitId === habitId).map((c) => c.day));
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  const rows = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
  const total = rows.flat().filter((d) => done.has(d)).length;

  return (
    <div className={styles.wrap} role="img" aria-label={`${title}: done on ${total} days in the last ${weeks} weeks`}>
      <div className={styles.head} aria-hidden="true">
        {DAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      {rows.map((row, w) => (
        <div key={w} className={styles.row} aria-hidden="true">
          {row.map((d) => {
            const future = d > today;
            const before = d < since;
            const cls = done.has(d) ? styles.done : future ? styles.future : before ? styles.before : styles.missed;
            return <span key={d} className={`${styles.cell} ${cls} ${d === today ? styles.today : ''}`} title={`${long.format(new Date(`${d}T12:00:00`))}${done.has(d) ? ': done' : ''}`} />;
          })}
        </div>
      ))}
    </div>
  );
}
