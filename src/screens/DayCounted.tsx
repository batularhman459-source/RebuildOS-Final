import { useLiveQuery } from 'dexie-react-hooks';
import { motion, type Variants } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useDay } from '../app/day';
import { Stage } from '../components/Stage';
import { Star } from '../components/Star';
import { dayKey } from '../core/day';
import { APP_LOCALE } from '../core/locale';
import { lastSevenDays } from '../core/progress';
import type { Feeling } from '../core/types';
import { closeDay } from '../data/closeDay';
import { db } from '../data/db';
import styles from './DayCounted.module.css';

const narrow = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'narrow' });
const weekdayLong = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'long' });
const dayOf = (t: number) => dayKey(new Date(t));
const ease = [0.2, 0.8, 0.2, 1] as const;
const pop = [0.34, 1.56, 0.64, 1] as const;

const LINES: Record<Feeling, string> = {
  good: 'You did your main thing. That’s how it adds up.',
  okay: 'Small and real. That still moves you forward.',
  rough: 'A rough day, and you still showed up.',
};

const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease, delay } }),
};

/** The moment the day counts: once a day, after the main thing, its smaller version, or the minimum. */
export function DayCounted() {
  const day = useDay();
  const navigate = useNavigate();
  const data = useLiveQuery(async () => {
    const [actions, sessions, checks, days] = await Promise.all([
      db.actions.toArray(),
      db.focusSessions.toArray(),
      db.habitChecks.toArray(),
      db.days.toArray(),
    ]);
    const record = days.find((d) => d.day === day);
    const wins = days.filter((d) => d.smallWin).map((d) => d.day);
    // Today counts here even before anything is saved for it (e.g. straight from a tick).
    const week = lastSevenDays(day, actions, sessions, dayOf, checks, [...wins, day]);
    return { week, feeling: record?.feeling ?? 'good' };
  }, [day]);

  async function close() {
    await closeDay(day, { leftovers: {}, tomorrowMain: undefined });
    navigate('/', { replace: true });
  }

  return (
    <div className={styles.root}>
      <Stage glowTop="38%" aria-label="Day counted">
        <div className={styles.spacer} />
        <motion.div initial={{ opacity: 0, scale: 0.3, rotate: -30 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.8, ease: pop, delay: 0.1 }}>
          <Star size={104} variant="gradient" />
        </motion.div>
        <motion.h1 className={styles.title} initial="hidden" animate="show" custom={0.3} variants={rise}>
          Day counted.
        </motion.h1>
        {data && (
          <>
            <motion.p className={styles.line} initial="hidden" animate="show" custom={0.38} variants={rise}>
              {LINES[data.feeling]}
            </motion.p>
            <motion.ol className={styles.week} aria-label="Last 7 days" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
              {data.week.days.map(({ day: d, active }) => {
                const isToday = d === day;
                const date = new Date(`${d}T12:00:00`);
                return (
                  <li key={d} className={styles.day} aria-label={`${isToday ? 'Today' : weekdayLong.format(date)}: ${active ? 'active' : 'not active'}`}>
                    <span className={styles.starSlot}>
                      <Star size={22} variant="empty" />
                      {active && (
                        <motion.span
                          className={styles.starFill}
                          initial={isToday ? { opacity: 0, scale: 0.2 } : false}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.6, ease: pop, delay: 0.95 }}
                        >
                          <Star size={22} variant="solid" />
                        </motion.span>
                      )}
                    </span>
                    <span className={`${styles.dayLabel} ${isToday ? styles.today : ''}`} aria-hidden="true">
                      {isToday ? 'Today' : narrow.format(date)}
                    </span>
                  </li>
                );
              })}
            </motion.ol>
            <motion.p className={styles.count} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.1 }}>
              Active on {data.week.activeCount} of the last 7 days
            </motion.p>
          </>
        )}
        <div className={styles.spacerLarge} />
        <motion.div className={styles.buttons} initial="hidden" animate="show" custom={0.7} variants={rise}>
          <button type="button" className={styles.primary} onClick={() => void close()}>
            Close for today
          </button>
          <button type="button" className={styles.secondary} onClick={() => navigate('/', { replace: true })}>
            Keep going
          </button>
        </motion.div>
      </Stage>
    </div>
  );
}
