import { useLiveQuery } from 'dexie-react-hooks';
import { useSheets } from '../app/sheets';
import { ActionRow } from '../components/ActionRow';
import { laterList } from '../core/today';
import { db } from '../data/db';
import styles from './Screen.module.css';
import own from './Plan.module.css';

export function Plan() {
  const { openAdd } = useSheets();
  const later = useLiveQuery(async () => laterList(await db.actions.toArray()), []);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Plan</h1>
      </header>

      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>No Missions yet</h2>
        <p className={styles.emptyText}>
          Missions are bigger goals, like passing an exam or getting fit. Each one always shows its next step.
        </p>
      </div>

      <section className={own.section} aria-labelledby="later-heading">
        <h2 id="later-heading" className={own.heading}>
          Later
        </h2>
        {later && later.length > 0 ? (
          <ul className={own.list}>
            {later.map((a) => (
              <ActionRow key={a.id} action={a} meta={a.estimateMinutes ? `${a.estimateMinutes} min` : undefined} />
            ))}
          </ul>
        ) : (
          <p className={own.hint}>Things you want to do, just not today.</p>
        )}
        <button type="button" className={own.addRow} onClick={() => openAdd('later')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add for later
        </button>
      </section>
    </div>
  );
}
