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
import { deleteMission, setGoalMeasure, setMissionStatus, updateGoalProgress, updateMission } from '../data/missions';
import { goalProgress, parseAmount, withUnit } from '../core/goals';
import { GoalProgressBar } from '../components/GoalProgressBar';
import { MeasureFields } from '../components/MeasureFields';
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
  const [updating, setUpdating] = useState(false);

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
        <button type="button" className={own.round} aria-label="Edit goal" onClick={() => setEditing(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </div>

      <header className={own.header}>
        {mission.status !== 'active' && (
          <span className={own.status}>{mission.status === 'complete' ? 'Completed' : 'Paused'}</span>
        )}
        <h1 className={own.title}>{mission.title}</h1>
        {mission.doneWhen && <p className={own.doneWhen}>Done when: {mission.doneWhen}</p>}
        {mission.targetDay && <p className={own.doneWhen}>By {formatShortDay(mission.targetDay)}</p>}
      </header>

      <section className={own.progress} aria-label="Progress">
        <GoalProgressBar progress={goalProgress(mission, actions)} large />
        {mission.measure ? (
          <button type="button" className={own.progressButton} onClick={() => setUpdating(true)}>
            Update progress
          </button>
        ) : (
          <button type="button" className={own.progressLink} onClick={() => setEditing(true)}>
            + Add a target to measure (e.g. 21 km)
          </button>
        )}
      </section>

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
            Mark goal complete
          </button>
        ) : (
          <button type="button" className={own.footerButton} onClick={() => void setMissionStatus(mission.id, 'active')}>
            {mission.status === 'complete' ? 'Reopen goal' : 'Make it active again'}
          </button>
        )}
      </div>

      {mission.measure && <UpdateProgressSheet mission={mission} open={updating} onClose={() => setUpdating(false)} />}

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
  const [measureTarget, setMeasureTarget] = useState(mission.measure ? String(mission.measure.target) : '');
  const [measureUnit, setMeasureUnit] = useState(mission.measure?.unit ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(mission.title);
    setDoneWhen(mission.doneWhen ?? '');
    setTargetDay(mission.targetDay ?? '');
    setConfirmDelete(false);
    setMeasureTarget(mission.measure ? String(mission.measure.target) : '');
    setMeasureUnit(mission.measure?.unit ?? '');
  }, [open, mission]);

  async function save() {
    await updateMission(mission.id, { title, doneWhen, targetDay });
    const target = parseAmount(measureTarget);
    if (target !== undefined && target > 0) {
      if (target !== mission.measure?.target || measureUnit.trim() !== mission.measure?.unit) await setGoalMeasure(mission.id, { target, unit: measureUnit });
    } else if (!measureTarget.trim() && mission.measure) {
      await setGoalMeasure(mission.id, undefined);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        void save();
        onClose();
      }}
      label="Edit goal"
    >
      <div className={forms.group}>
        <label htmlFor="edit-mission-title" className={forms.label}>
          Goal
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
      <MeasureFields target={measureTarget} unit={measureUnit} onTarget={setMeasureTarget} onUnit={setMeasureUnit} />
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
            Pause this goal for now
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
          {confirmDelete ? 'Tap again to delete. Its tasks are kept.' : 'Delete goal'}
        </button>
      </div>
    </Sheet>
  );
}

// ── Completion moment ───────────────────────────────────────────────────────

function MissionComplete({ mission, done, focusMs, onClose }: { mission: MissionRecord; done: number; focusMs: number; onClose: () => void }) {
  return (
    <motion.div className={own.complete} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <Stage glowTop="40%" aria-label="Goal complete">
        <div style={{ flex: 1 }} />
        <motion.div className={own.completeBody} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }}>
          <Star size={72} variant="gradient" />
          <h1 className={own.completeTitle}>
            Goal <i>complete.</i>
          </h1>
          <p className={own.completeMission}>{mission.title}</p>
          <p className={own.completeStats}>
            {done} {done === 1 ? 'task' : 'tasks'}
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

// ── Update progress (measured goals) ────────────────────────────────────────

function UpdateProgressSheet({ mission, open, onClose }: { mission: MissionRecord; open: boolean; onClose: () => void }) {
  const m = mission.measure!;
  const [value, setValue] = useState(String(m.current));
  useEffect(() => {
    if (open) setValue(String(m.current));
  }, [open, m.current]);

  const parsed = parseAmount(value);
  const step = m.target >= 100 ? Math.pow(10, Math.floor(Math.log10(m.target)) - 1) : 1;

  async function save() {
    if (parsed === undefined) return;
    await updateGoalProgress(mission.id, parsed);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} label="Update progress">
      <h2 className={forms.title}>Where are you now?</h2>
      <p className={own.sheetText}>Target: {withUnit(m.target, m.unit)}</p>
      <div className={own.amountRow}>
        <button type="button" className={own.amountStep} aria-label={`Minus ${step}`} onClick={() => setValue(String(Math.max(0, (parsed ?? 0) - step)))}>
          −
        </button>
        <label htmlFor="goal-current" className="visually-hidden">
          Current amount in {m.unit}
        </label>
        <input
          id="goal-current"
          className={own.amountInput}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void save()}
        />
        <span className={own.amountUnit}>{m.unit}</span>
        <button type="button" className={own.amountStep} aria-label={`Plus ${step}`} onClick={() => setValue(String((parsed ?? 0) + step))}>
          +
        </button>
      </div>
      <button type="button" className={forms.primary} disabled={parsed === undefined} onClick={() => void save()}>
        Save
      </button>
    </Sheet>
  );
}
