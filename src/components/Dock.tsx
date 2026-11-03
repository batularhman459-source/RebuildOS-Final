import { NavLink, useLocation } from 'react-router-dom';
import { useSheets } from '../app/sheets';
import styles from './Dock.module.css';

const TABS = [
  { to: '/', label: 'Today', end: true },
  { to: '/plan', label: 'Plan', end: false },
  { to: '/progress', label: 'Progress', end: false },
] as const;

/** Floating frosted dock: three tabs plus Add. Hidden on full-screen moments. See DESIGN.md §6 Dock. */
export function Dock() {
  const { openAdd } = useSheets();
  const { pathname } = useLocation();

  return (
    <nav className={styles.dock} aria-label="Main">
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `${styles.tab} ${isActive || (tab.to === '/plan' && pathname.startsWith('/goal/')) ? styles.active : ''}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <button
        type="button"
        className={styles.add}
        aria-label="Add a task"
        onClick={() => {
          const missionId = pathname.match(/^\/goal\/([^/]+)/)?.[1];
          openAdd(pathname.startsWith('/plan') || missionId ? 'later' : 'today', missionId);
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </nav>
  );
}
