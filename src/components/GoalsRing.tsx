import styles from './GoalsRing.module.css';

interface GoalsRingProps {
  /** 0–1 */
  fraction: number;
  goals: number;
}

/** Average progress across active goals, as one calm ring with the number in the middle. */
export function GoalsRing({ fraction, goals }: GoalsRingProps) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.round(fraction * 100);
  return (
    <div className={styles.wrap}>
      <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`${pct}% average progress across ${goals} ${goals === 1 ? 'goal' : 'goals'}`}>
        <circle cx="44" cy="44" r={r} className={styles.track} />
        <circle
          cx="44"
          cy="44"
          r={r}
          className={styles.fill}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="50" textAnchor="middle" className={styles.value}>
          {pct}%
        </text>
      </svg>
      <div className={styles.text}>
        <span className={styles.title}>Across your goals</span>
        <span className={styles.sub}>
          Average of {goals} active {goals === 1 ? 'goal' : 'goals'}
        </span>
      </div>
    </div>
  );
}
