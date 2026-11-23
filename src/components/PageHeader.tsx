import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './PageHeader.module.css';

/** Title of a light page reached from the sky, with a back link above it. */
export function PageHeader({ back, title, right }: { back: { to: string; label: string }; title: string; right?: ReactNode }) {
  return (
    <header className={styles.header}>
      <Link to={back.to} className={styles.back}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {back.label}
      </Link>
      <div className={styles.row}>
        <h1 className={styles.title}>{title}</h1>
        {right}
      </div>
    </header>
  );
}
