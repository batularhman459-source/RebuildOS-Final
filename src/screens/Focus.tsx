import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Sheet } from '../components/Sheet';
import { Stage } from '../components/Stage';
import { Star } from '../components/Star';
import forms from '../components/forms.module.css';
import {
  elapsedMs,
  formatClock,
  formatDuration,
  formatSpent,
  glowScale,
  isRunning,
  LONG_SESSION_MS,
  TARGET_PRESETS,
} from '../core/focus';
import type { Action, FocusSession } from '../core/types';
import { completeAction } from '../data/actions';
import { db } from '../data/db';
import { adjustSession, finishFocus, getActiveSession, pauseFocus, resumeFocus, setTarget } from '../data/focus';
import { useNow } from '../data/useNow';
import { useWakeLock } from '../data/useWakeLock';
import styles from './Focus.module.css';

const ease = [0.2, 0.8, 0.2, 1] as const;

interface Finished {
  session: FocusSession;
  action: Action;
}

/** Full-screen Focus. Always tied to an Action. See docs/product-brief.md §4.4 and DESIGN.md §7. */
export function Focus() {
  const navigate = useNavigate();
  // Load the session and its Action together so there is never a moment with one but not the other.
  const current = useLiveQuery(async () => {
    const session = await getActiveSession();
    const action = session ? await db.actions.get(session.actionId) : undefined;
    return session && action && !action.deletedAt ? { session, action } : null;
  }, []);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [finishing, setFinishing] = useState(false);

  if (finished) return <FinishView finished={finished} onDone={() => navigate('/', { replace: true })} />;
  if (current === undefined || finishing) return <div className={styles.root} />;
  if (current === null) return <Navigate to="/" replace />;
  const { session, action } = current;

  return (
    <RunningView
      session={session}
      action={action}
      onLeave={async () => {
        await pauseFocus(session.id);
        navigate('/', { replace: true });
      }}
      onFinish={async () => {
        setFinishing(true);
        const closed = await finishFocus(session.id);
        if (closed) setFinished({ session: closed, action });
        else setFinishing(false);
      }}
    />
  );
}

// ── Running ─────────────────────────────────────────────────────────────────

interface RunningProps {
  session: FocusSession;
  action: Action;
  onLeave: () => void;
  onFinish: () => void;
}

function RunningView({ session, action, onLeave, onFinish }: RunningProps) {
  const running = isRunning(session.segments);
  const now = useNow(running);
  const elapsed = elapsedMs(session.segments, now);
  const [targetOpen, setTargetOpen] = useState(false);
  useWakeLock(running);

  return (
    <motion.div
      className={styles.root}
      initial={{ clipPath: 'inset(0 0 42% 0)' }}
      animate={{ clipPath: 'inset(0 0 0% 0)' }}
      transition={{ duration: 0.42, ease }}
    >
      <Stage glowTop="58%" glowScale={glowScale(elapsed, session.targetMinutes)} aria-label="Focus">
        <button type="button" className={styles.close} aria-label="Leave focus" onClick={onLeave}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className={styles.spacer} />

        <motion.p
          className={styles.actionTitle}
          initial={{ opacity: 0, y: -24, scale: 1.4 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.42, ease }}
        >
          {action.title}
        </motion.p>
        <motion.p
          className={`${styles.timer} ${running ? '' : styles.paused}`}
          role="timer"
          aria-live="off"
          aria-label={`${formatDuration(elapsed)} focused`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.18 }}
        >
          {formatClock(elapsed)}
        </motion.p>
        <button type="button" className={styles.target} onClick={() => setTargetOpen(true)}>
          {!running ? 'Paused · ' : ''}
          {session.targetMinutes ? `of ${session.targetMinutes} minutes` : 'Set a target'}
        </button>

        <div className={styles.spacerLarge} />

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.round}
            aria-label={running ? 'Pause' : 'Resume'}
            onClick={() => void (running ? pauseFocus(session.id) : resumeFocus(session.id))}
          >
            {running ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
                <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 3.5v17l14-8.5z" />
              </svg>
            )}
          </button>
          <button type="button" className={styles.finish} onClick={onFinish}>
            Finish
          </button>
        </div>
      </Stage>

      <Sheet open={targetOpen} onClose={() => setTargetOpen(false)} label="Focus target">
        <h2 className={forms.title}>Target</h2>
        <p className={styles.sheetText}>A target fills the glow as you go. Going past it is fine.</p>
        <div className={forms.chips} role="group" aria-label="Target">
          {[...new Set([...(action.estimateMinutes ? [action.estimateMinutes] : []), ...TARGET_PRESETS])]
            .sort((a, b) => a - b)
            .map((m) => (
              <button
                key={m}
                type="button"
                className={forms.chip}
                aria-pressed={session.targetMinutes === m}
                onClick={() => {
                  void setTarget(session.id, m);
                  setTargetOpen(false);
                }}
              >
                {m} min
              </button>
            ))}
          <button
            type="button"
            className={forms.chip}
            aria-pressed={session.targetMinutes === undefined}
            onClick={() => {
              void setTarget(session.id, undefined);
              setTargetOpen(false);
            }}
          >
            No target
          </button>
        </div>
      </Sheet>
    </motion.div>
  );
}

// ── Finished ────────────────────────────────────────────────────────────────

function FinishView({ finished, onDone }: { finished: Finished; onDone: () => void }) {
  const { session, action } = finished;
  const [ms, setMs] = useState(() => elapsedMs(session.segments, session.finishedAt ?? Date.now()));
  const [checkedLong, setCheckedLong] = useState(ms < LONG_SESSION_MS);

  async function done() {
    await completeAction(action.id);
    onDone();
  }

  return (
    <div className={styles.root}>
      <Stage glowTop="44%" aria-label="Focus finished">
        <div className={styles.spacer} />
        <AnimatePresence mode="wait" initial={false}>
          {checkedLong ? (
            <motion.div key="ask" className={styles.finishBody} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}>
              <Star size={56} variant="gradient" />
              <h1 className={styles.finishTitle}>
                {formatSpent(ms)} on
                <br />
                {action.title}
              </h1>
              <p className={styles.question}>Is this action done?</p>
            </motion.div>
          ) : (
            <LongSessionCheck
              key="long"
              ms={ms}
              onKeep={() => setCheckedLong(true)}
              onAdjust={async (minutes) => {
                await adjustSession(session.id, minutes);
                setMs(minutes * 60_000);
                setCheckedLong(true);
              }}
            />
          )}
        </AnimatePresence>
        <div className={styles.spacerLarge} />
        {checkedLong && (
          <div className={styles.finishButtons}>
            <button type="button" className={styles.finishPrimary} onClick={() => void done()}>
              Done
            </button>
            <button type="button" className={styles.finishSecondary} onClick={onDone}>
              More to do
            </button>
            <p className={styles.note}>Your time is saved either way.</p>
          </div>
        )}
      </Stage>
    </div>
  );
}

function LongSessionCheck({ ms, onKeep, onAdjust }: { ms: number; onKeep: () => void; onAdjust: (minutes: number) => void }) {
  const [minutes, setMinutes] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const m = Number(minutes);
    if (Number.isFinite(m) && m > 0) onAdjust(m);
  }

  return (
    <motion.form className={styles.finishBody} onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <h1 className={styles.finishTitle}>That was a long one.</h1>
      <p className={styles.question}>The timer ran for {formatDuration(ms)}. Was that all focused time?</p>
      <button type="button" className={styles.finishPrimary} onClick={onKeep}>
        Yes, keep {formatDuration(ms)}
      </button>
      <label htmlFor="adjust-minutes" className={styles.note}>
        Or enter the minutes you actually focused
      </label>
      <div className={styles.adjustRow}>
        <input
          id="adjust-minutes"
          className={styles.adjustInput}
          inputMode="numeric"
          pattern="[0-9]*"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))}
          placeholder="e.g. 50"
        />
        <button type="submit" className={styles.finishSecondary} disabled={!minutes}>
          Save
        </button>
      </div>
    </motion.form>
  );
}
