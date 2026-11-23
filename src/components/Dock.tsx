import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import styles from './Dock.module.css';

/** Your plan, Details, the journal, settings and goal pages are reached from the sky. */
const UNDER_SKY = ['/sky', '/progress', '/plan', '/goal/', '/journal', '/day/', '/settings'];
/** Screens that are dark all the way down get the dark dock. */
const DARK = ['/', '/sky'];

/** Floating dock: two tabs, Today and Sky. Hidden on full-screen moments. See DESIGN.md §6 Dock. */
export function Dock() {
  const { pathname } = useLocation();
  const dark = DARK.includes(pathname);
  const onSky = UNDER_SKY.some((p) => pathname.startsWith(p));

  return (
    <nav className={`${styles.dock} ${dark ? styles.dark : ''}`} aria-label="Main">
      <div className={styles.tabs}>
        <NavLink to="/" end className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
          <Icon name="today" size={20} />
          <span>Today</span>
        </NavLink>
        <NavLink to="/sky" className={() => `${styles.tab} ${onSky ? styles.active : ''}`} aria-current={onSky ? 'page' : undefined}>
          <Icon name="sparkle" size={20} />
          <span>Sky</span>
        </NavLink>
      </div>
    </nav>
  );
}
