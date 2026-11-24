import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './undo.module.css';

/** "Task deleted · Undo": a short bar above the tab bar, like Mail and Reminders. */

interface UndoApi {
  show: (message: string, undo: () => Promise<void> | void) => void;
}

const UndoContext = createContext<UndoApi>({ show: () => {} });

export function useUndo(): UndoApi {
  return useContext(UndoContext);
}

/** How long the bar stays. */
const SHOW_MS = 5000;

export function UndoProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<{ id: number; message: string; undo: () => Promise<void> | void } | null>(null);
  const timer = useRef(0);

  const show = useCallback<UndoApi['show']>((message, undo) => {
    window.clearTimeout(timer.current);
    setCurrent({ id: Date.now(), message, undo });
    timer.current = window.setTimeout(() => setCurrent(null), SHOW_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <UndoContext.Provider value={{ show }}>
      {children}
      <div className={styles.slot} aria-live="polite">
        <AnimatePresence>
          {current && (
            <motion.div
              key={current.id}
              className={styles.bar}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <span className={styles.message}>{current.message}</span>
              <button
                type="button"
                className={styles.undo}
                onClick={async () => {
                  window.clearTimeout(timer.current);
                  const { undo } = current;
                  setCurrent(null);
                  await undo();
                }}
              >
                Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </UndoContext.Provider>
  );
}
