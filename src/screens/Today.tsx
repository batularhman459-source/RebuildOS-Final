import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { useDay } from '../app/day';
import { useSheets } from '../app/sheets';
import { ActionRow } from '../components/ActionRow';
import { QuietNotice } from '../components/QuietNotice';
import { Stage } from '../components/Stage';
import { dayKey } from '../core/day';
import { formatEstimate } from '../core/focus';
import { APP_LOCALE } from '../core/locale';
import { todayView } from '../core/today';
import type { Action } from '../core/types';
import { addAction, completeAction, dismissRolloverNotice, getRolloverNotice, undoRollover } from '../data/actions';
import { db } from '../data/db';
import styles from './Today.module.css';

const dateFormat = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const dayOf = (t: number) => dayKey(new Date(t));
const enter = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } };

export function Today() {
  const day = useDay();
  const { openAdd } = useSheets();
  const actions = useLiveQuery(() => db.actions.toArray(), []);
  const notice = useLiveQuery(() => getRolloverNotice(day), [day]);

  const view = actions ? todayView(actions, day, dayOf) : undefined;
  const hasList = view && (view.open.length > 0 || view.doneToday.length > 0);

  return (
    <>
      <Stage height="max(420px, 58vh)" aria-label="Main action">
        <span className={styles.date}>{dateFormat.format(new Date())}</span>
        <div className={styles.spacer} />
        {view && (
          <AnimatePresence mode="wait" initial={false}>
            {view.main ? (
              <MainAction key={view.main.id} action={view.main} />
            ) : (
              <AskForAction key={view.doneToday.length > 0 ? 'again' : 'first'} again={view.doneToday.length > 0} />
            )}
          </AnimatePresence>
        )}
        <div className={styles.spacer} />
      </Stage>

      <section className={styles.below} aria-label="Also today">
        {notice && (
          <QuietNotice
            text={`${notice.movedIds.length} ${notice.movedIds.length === 1 ? 'action' : 'actions'} moved to Later`}
            actionLabel="Undo"
            onAction={() => void undoRollover(day)}
            onDismiss={() => void dismissRolloverNotice(day)}
          />
        )}
        {hasList && (
          <ul className={styles.list}>
            {view.open.map((a) => (
              <ActionRow key={a.id} action={a} meta={a.estimateMinutes ? `${a.estimateMinutes} min` : undefined} />
            ))}
            {view.doneToday.map((a) => (
              <ActionRow key={a.id} action={a} />
            ))}
          </ul>
        )}
        {view?.main && (
          <button type="button" className={styles.addRow} onClick={() => openAdd('today')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add an action
          </button>
        )}
      </section>
    </>
  );
}

function MainAction({ action }: { action: Action }) {
  const { openAction } = useSheets();
  return (
    <motion.div className={styles.main} {...enter} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
      <button type="button" className={styles.mainTitle} onClick={() => openAction(action.id)}>
        <h1>{action.title}</h1>
      </button>
      {action.estimateMinutes && <p className={styles.support}>{formatEstimate(action.estimateMinutes)}</p>}
      <div className={styles.stageButtons}>
        <button type="button" className={styles.stagePrimary} onClick={() => void completeAction(action.id)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          Mark as done
        </button>
      </div>
    </motion.div>
  );
}

function AskForAction({ again }: { again: boolean }) {
  const [title, setTitle] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await addAction({ title, destination: 'today' });
    setTitle('');
  }

  return (
    <motion.form className={styles.ask} onSubmit={submit} {...enter} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
      {again ? (
        <>
          <h1 className={styles.moment}>
            That’s <i>done.</i>
          </h1>
          <p className={styles.support}>Want to pick one more thing?</p>
        </>
      ) : (
        <h1 className={styles.question}>What’s one thing you want to get done today?</h1>
      )}
      <label htmlFor="first-action" className="visually-hidden">
        Action
      </label>
      <input
        id="first-action"
        className={styles.stageInput}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={again ? 'e.g. Reply to emails' : 'e.g. Revise chapter 3'}
        autoComplete="off"
        enterKeyHint="done"
        maxLength={140}
      />
      <button type="submit" className={styles.stagePrimary} disabled={!title.trim()}>
        Add to today
      </button>
    </motion.form>
  );
}
