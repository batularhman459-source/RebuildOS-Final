import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Stage } from '../components/Stage';
import { Star } from '../components/Star';
import { elapsedMs, formatDuration } from '../core/focus';
import { db } from '../data/db';
import styles from './Welcome.module.css';

/** Shown after three or more days away. Nothing is listed as missed; everything is where it was. */
export function Welcome() {
  const navigate = useNavigate();
  const record = useLiveQuery(async () => {
    const [done, sessions] = await Promise.all([
      db.actions.filter((a) => !a.deletedAt && a.state === 'done').count(),
      db.focusSessions.filter((s) => !s.deletedAt && s.finishedAt !== undefined).toArray(),
    ]);
    return { done, focused: sessions.reduce((t, s) => t + elapsedMs(s.segments, s.finishedAt!), 0) };
  }, []);

  return (
    <div className={styles.root}>
      <Stage glowTop="34%" aria-label="Welcome back">
        <div style={{ flex: 1 }} />
        <motion.div
          className={styles.body}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Star size={112} variant="gradient" />
          <h1 className={styles.title}>
            Welcome <i>back.</i>
          </h1>
          <p className={styles.subtitle}>Everything is where you left it.</p>
          {record && (record.done > 0 || record.focused >= 60_000) && (
            <p className={styles.record}>
              {record.focused >= 60_000 && (
                <>
                  <strong>{formatDuration(record.focused)}</strong> focused
                </>
              )}
              {record.focused >= 60_000 && record.done > 0 && ' · '}
              {record.done > 0 && (
                <>
                  <strong>{record.done}</strong> {record.done === 1 ? 'action' : 'actions'} done
                </>
              )}
            </p>
          )}
        </motion.div>
        <div style={{ flex: 1.2 }} />
        <div className={styles.buttons}>
          <button type="button" className={styles.primary} onClick={() => navigate('/rebuild', { replace: true })}>
            Start with a small day
          </button>
          <button type="button" className={styles.secondary} onClick={() => navigate('/', { replace: true })}>
            Go to Today
          </button>
        </div>
      </Stage>
    </div>
  );
}
