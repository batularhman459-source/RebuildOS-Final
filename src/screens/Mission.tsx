import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useDay } from '../app/day';
import { useSheets } from '../app/sheets';
import { ActionRow } from '../components/ActionRow';
import { Sheet } from '../components/Sheet';
import { Stage } from '../components/Stage';
import { Star } from '../components/Star';
import forms from '../components/forms.module.css';
import { dayKey, relativeDay } from '../core/day';
import { formatDuration } from '../core/focus';
import { formatShortDay } from '../core/locale';
import { doneActions, missionStats, openActions } from '../core/missions';
import type { Action, Mission as MissionRecord } from '../core/types';
import { moveToToday } from '../data/actions';
import { db } from '../data/db';
import { startFocus } from '../data/focus';
import { deleteMission, setMissionStatus, updateMission } from '../data/missions';
import styles from './Screen.module.css';
import own from './Mission.module.css';

export function Mission() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const day = useDay();
  const { openAdd } = useSheets();
  const [editing, setEditing] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const data = useLiveQuery(async () => {
    const mission = await db.missions.get(id);
    if (!mission || mission.deletedAt) return null;
    const [actions, sessions] = await Promise.all([db.actions.where('missionId').equals(id).toArray(), db.focusSessions.toArray()]);
    return { mission, actions, sessions };
  }, [id]);

  if (data === undefined) return <div className={styles.screen} />;
  if (data === null && !celebrate) return <Navigate to="/plan" replace />;
  if (data === null) return null;

  const { mission, actions, sessions } = data;
  const open = openActions(mission.id, actions);
  const [next, ...rest] = open;
  const done = doneActions(mission.id, actions);
  const stats = missionStats(mission.id, actions, sessions);

  async function focus(a: Action) {
    await startFocus(a.id);
    navigate('/focus');
  }

  return (
    <div className={styles.screen}>
      <div className={own.topBar}>
        <button type="button" className={own.round} aria-label="Back to Plan" onClick={() => navigate('/plan')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button type="button" className={own.round} aria-label="Edit Mission" onClick={() => setEditing(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </div>

      <header className={own.header}>
        {mission.status !== 'active' && (
          <span className={own.status}>{mission.status === 'complete' ? 'Completed' : 'Parked'}</span>
        )}
        <h1 className={own.title}>{mission.title}</h1>
        {mission.doneWhen && <p className={own.doneWhen}>Done when: {mission.doneWhen}</p>}
        {mission.targetDay && <p className={own.doneWhen}>By {formatShortDay(mission.targetDay)}</p>}
      </header>

      <dl className={own.stats}>
        <div>
          <dt>done</dt>
          <dd>{stats.done}</dd>
        </div>
        <div>
          <dt>focused</dt>
          <dd>{stats.focusMs >= 60_000 ? formatDuration(stats.focusMs) : '0 min'}</dd>
        </div>
        <div>
          <dt>last worked</dt>
          <dd>{stats.lastWorkedAt ? capitalise(relativeDay(dayKey(new Date(stats.lastWorkedAt)), day)) : '—'}</dd>
        </div>
      </dl>

      <section aria-labelledby="next-heading" className={own.section}>
        <h2 id="next-heading" className={own.label}>
          Next
        </h2>
        {next ? (
          <div className={own.next}>
            <NextTitle action={next} />
            <div className={own.nextButtons}>
              {next.state === 'today' ? (
                <span className={own.onToday}>
                  <Star size={12} />
                  On Today
                </span>
              ) : (
                <button type="button" className={own.secondary} onClick={() => void moveToToday(next.id)}>
                  Today
                </button>
              )}
              <button type="button" className={own.primary} onClick={() => void focus(next)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6 3.5v17l14-8.5z" />
                </svg>
                Focus
              </button>
            </div>
          </div>
        ) : (
          <div className={own.noNext}>
            <p>What’s the next step?</p>
            <button type="button" className={own.primary} onClick={() => openAdd('later', mission.id)}>
              Add the next step
            </button>
          </div>
        )}
      </section>

      {(rest.length > 0 || next) && (
        <section aria-label="Other steps" className={own.section}>
          {rest.length > 0 && (
            <ul className={own.list}>
              {rest.map((a) => (
                <ActionRow key={a.id} action={a} meta={a.state === 'today' ? 'Today' : undefined} />
              ))}
            </ul>
          )}
          <button type="button" className={own.addRow} onClick={() => openAdd('later', mission.id)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add a step
          </button>
        </section>
      )}

      {done.length > 0 && (
        <section className={own.section}>
          <button type="button" className={own.disclosure} aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
            {done.length} done
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: showDone ? 'rotate(180deg)' : undefined }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {showDone && (
            <ul className={own.list}>
              {done.map((a) => (
                <ActionRow key={a.id} action={a} />
              ))}
            </ul>
          )}
        </section>
      )}

      <div className={own.footer}>
        {mission.status === 'active' ? (
          <button
            type="button"
            className={own.footerButton}
            onClick={async () => {
              await setMissionStatus(mission.id, 'complete');
              setCelebrate(true);
            }}
          >
            Mark Mission complete
          </button>
        ) : (
          <button type="button" className={own.footerButton} onClick={() => void setMissionStatus(mission.id, 'active')}>
            {mission.status === 'complete' ? 'Reopen Mission' : 'Make it active again'}
          </button>
        )}
      </div>

      <EditMissionSheet
        mission={mission}
        open={editing}
        onClose={() => setEditing(false)}
        onDeleted={() => navigate('/plan', { replace: true })}
      />

      <AnimatePresence>
        {celebrate && (
          <MissionComplete
            mission={mission}
            done={stats.done}
            focusMs={stats.focusMs}
            onClose={() => {
              setCelebrate(false);
              navigate('/plan');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NextTitle({ action }: { action: Action }) {
  const { openAction } = useSheets();
  return (
    <button type="button" className={own.nextTitle} onClick={() => openAction(action.id)}>
      {action.title}
      {action.estimateMinutes && <span className={own.nextMeta}>{action.estimateMinutes} min</span>}
    </button>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Edit ────────────────────────────────────────────────────────────────────

function EditMissionSheet({
  mission,
  open,
  onClose,
  onDeleted,
}: {
  mission: MissionRecord;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(mission.title);
  const [doneWhen, setDoneWhen] = useState(mission.doneWhen ?? '');
  const [targetDay, setTargetDay] = useState(mission.targetDay ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(mission.title);
    setDoneWhen(mission.doneWhen ?? '');
    setTargetDay(mission.targetDay ?? '');
    setConfirmDelete(false);
  }, [open, mission]);

  async function save() {
    await updateMission(mission.id, { title, doneWhen, targetDay });
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        void save();
        onClose();
      }}
      label="Edit Mission"
    >
      <div className={forms.group}>
        <label htmlFor="edit-mission-title" className={forms.label}>
          Mission
        </label>
        <input id="edit-mission-title" className={forms.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      </div>
      <div className={forms.group}>
        <label htmlFor="edit-mission-done" className={forms.label}>
          You’ll know it’s done when…
        </label>
        <input
          id="edit-mission-done"
          className={forms.input}
          value={doneWhen}
          onChange={(e) => setDoneWhen(e.target.value)}
          placeholder="Optional"
          maxLength={160}
        />
      </div>
      <div className={forms.group}>
        <label htmlFor="edit-mission-date" className={forms.label}>
          Target date
        </label>
        <input id="edit-mission-date" type="date" className={forms.input} value={targetDay} onChange={(e) => setTargetDay(e.target.value)} />
      </div>
      <div className={forms.list}>
        {mission.status === 'active' ? (
          <button
            type="button"
            className={forms.listButton}
            onClick={async () => {
              await save();
              await setMissionStatus(mission.id, 'parked');
              onClose();
            }}
          >
            Park this Mission for now
          </button>
        ) : (
          <button
            type="button"
            className={forms.listButton}
            onClick={async () => {
              await save();
              await setMissionStatus(mission.id, 'active');
              onClose();
            }}
          >
            Make it active again
          </button>
        )}
        <button
          type="button"
          className={`${forms.listButton} ${forms.danger}`}
          onClick={async () => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            await deleteMission(mission.id);
            onClose();
            onDeleted();
          }}
        >
          {confirmDelete ? 'Tap again to delete. Its actions are kept.' : 'Delete Mission'}
        </button>
      </div>
    </Sheet>
  );
}

// ── Completion moment ───────────────────────────────────────────────────────

function MissionComplete({ mission, done, focusMs, onClose }: { mission: MissionRecord; done: number; focusMs: number; onClose: () => void }) {
  return (
    <motion.div className={own.complete} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <Stage glowTop="40%" aria-label="Mission complete">
        <div style={{ flex: 1 }} />
        <motion.div className={own.completeBody} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }}>
          <Star size={72} variant="gradient" />
          <h1 className={own.completeTitle}>
            Mission <i>complete.</i>
          </h1>
          <p className={own.completeMission}>{mission.title}</p>
          <p className={own.completeStats}>
            {done} {done === 1 ? 'action' : 'actions'}
            {focusMs >= 60_000 ? ` · ${formatDuration(focusMs)} focused` : ''}
          </p>
        </motion.div>
        <div style={{ flex: 1.2 }} />
        <button type="button" className={own.completeButton} onClick={onClose}>
          Back to Plan
        </button>
      </Stage>
    </motion.div>
  );
}
