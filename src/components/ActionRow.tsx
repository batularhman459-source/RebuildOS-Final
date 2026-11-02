import { motion } from 'motion/react';
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

  return (
    <motion.li layout="position" className={styles.row} transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
      <button
        type="button"
        className={styles.check}
        aria-label={done ? `Mark ${action.title} as not done` : `Mark ${action.title} as done`}
        aria-pressed={done}
        onClick={() => void (done ? reopenAction(action.id) : completeAction(action.id))}
      >
        <span className={`${styles.circle} ${done ? styles.circleDone : ''}`}>
          {done && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          )}
        </span>
      </button>
      <button type="button" className={`${styles.title} ${done ? styles.titleDone : ''}`} onClick={() => openAction(action.id)}>
        <span className={styles.text}>{action.title}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </button>
    </motion.li>
  );
}
