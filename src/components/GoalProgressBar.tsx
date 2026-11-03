import { motion } from 'motion/react';
import type { GoalProgress } from '../core/goals';
import styles from './GoalProgressBar.module.css';

interface GoalProgressBarProps {
  progress: GoalProgress;
  /** Larger version for the goal's own page. */
  large?: boolean;
}

/** A calm, honest bar: how far along a goal is, with the numbers in words beside it. */
export function GoalProgressBar({ progress, large = false }: GoalProgressBarProps) {
  if (progress.kind === 'none') return <span className={styles.label}>{progress.label}</span>;
  const pct = Math.round(progress.fraction * 100);
  return (
    <div className={`${styles.wrap} ${large ? styles.large : ''}`}>
      <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={progress.label}>
        <motion.div
          className={styles.fill}
          initial={false}
          animate={{ scaleX: progress.fraction }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      <span className={styles.label}>{progress.label}</span>
    </div>
  );
}
