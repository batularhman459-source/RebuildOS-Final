import { motion } from 'motion/react';
import styles from './QuietNotice.module.css';

interface QuietNoticeProps {
  text: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}

/** One-line, non-blocking information with one action. Never red. See DESIGN.md §6 Quiet notice. */
export function QuietNotice({ text, actionLabel, onAction, onDismiss }: QuietNoticeProps) {
  return (
    <motion.div className={styles.notice} role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      <span className={styles.text}>{text}</span>
      <button type="button" className={styles.action} onClick={onAction}>
        {actionLabel}
      </button>
      <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </motion.div>
  );
}
