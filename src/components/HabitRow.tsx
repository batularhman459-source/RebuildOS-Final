import { motion } from 'motion/react';
import { useRef } from 'react';
import { useSheets } from '../app/sheets';
import type { DayKey, Habit } from '../core/types';
import { toggleHabit } from '../data/habits';
import styles from './ActionRow.module.css';

interface HabitRowProps {
  habit: Habit;
  day: DayKey;
  done: boolean;
  meta?: string;
}

/** A habit on Today: same feel as a task row, ticked for today only. */
export function HabitRow({ habit, day, done, meta }: HabitRowProps) {
  const { openHabit } = useSheets();
  const doneAtMount = useRef(done).current;

  return (
    <li className={styles.row}>
      <button
        type="button"
        className={styles.check}
        aria-label={done ? `Untick ${habit.title}` : `Tick ${habit.title}`}
        aria-pressed={done}
        onClick={() => void toggleHabit(habit.id, day)}
      >
        <motion.span
          initial={false}
          className={`${styles.circle} ${done ? styles.circleDone : ''}`}
          animate={done ? { scale: [1, 1.22, 1] } : { scale: 1 }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {done && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                initial={doneAtMount ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.24, delay: 0.06, ease: 'easeOut' }}
              />
            </svg>
          )}
        </motion.span>
      </button>
      <button type="button" className={`${styles.title} ${done ? styles.titleDone : ''}`} onClick={() => openHabit(habit.id)}>
        <span className={styles.text}>{habit.title}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </button>
    </li>
  );
}
