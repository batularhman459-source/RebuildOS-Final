import type { ReactNode } from 'react';
import { useNav } from '../app/nav';
import styles from './PageHeader.module.css';

/**
 * Title of a page reached from the sky, with the one back button used everywhere: it
 * returns to wherever you came from (or `back.to` when the app was opened on this page).
 */
export function PageHeader({ back, title, right }: { back: { to: string; label: string }; title: string; right?: ReactNode }) {
  const nav = useNav();
  return (
    <header className={styles.header}>
      <button type="button" className={styles.back} onClick={nav.back}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {back.label}
      </button>
      <div className={styles.row}>
        <h1 className={styles.title}>{title}</h1>
        {right}
      </div>
    </header>
  );
}
