import styles from './Screen.module.css';

export function Plan() {
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
    </div>
  );
}
