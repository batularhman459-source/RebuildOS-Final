import { motion } from 'motion/react';
import { useRef } from 'react';
import type { Action } from '../core/types';
import { completeAction, reopenAction } from '../data/actions';
import { useSheets } from '../app/sheets';
import styles from './ActionRow.module.css';

interface ActionRowProps {
  action: Action;
  meta?: string;
}

/** A plain list row: check circle, title, optional meta. Tapping the title opens the Action. See DESIGN.md §6 List row. */
export function ActionRow({ action, meta }: ActionRowProps) {
  const { openAction } = useSheets();
  const done = action.state === 'done';
  // Only celebrate a tick the person just made, not rows that were already done.
  const doneAtMount = useRef(done).current;

  return (
    <motion.li layout="position" className={styles.row} transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
      <button
        type="button"
        className={styles.check}
        aria-label={done ? `Mark ${action.title} as not done` : `Mark ${action.title} as done`}
        aria-pressed={done}
        onClick={() => void (done ? reopenAction(action.id) : completeAction(action.id))}
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
      <button type="button" className={`${styles.title} ${done ? styles.titleDone : ''}`} onClick={() => openAction(action.id)}>
        <span className={styles.text}>{action.title}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </button>
    </motion.li>
  );
}
