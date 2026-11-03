import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { activeMissions, RECOMMENDED_ACTIVE_MISSIONS } from '../core/missions';
import { db } from '../data/db';
import { createMission } from '../data/missions';
import { Sheet } from './Sheet';
import forms from './forms.module.css';
import styles from './NewMissionSheet.module.css';

interface NewMissionSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Two short steps: "What’s your goal?" then "What's the first step?".
 * A Mission never exists without a next Action. No setup screens.
 */
export function NewMissionSheet({ open, onClose }: NewMissionSheetProps) {
  const navigate = useNavigate();
  const activeCount = useLiveQuery(async () => activeMissions(await db.missions.toArray()).length, []) ?? 0;
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [doneWhen, setDoneWhen] = useState('');
  const [targetDay, setTargetDay] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [firstStep, setFirstStep] = useState('');
  const [today, setToday] = useState(true);
  const titleRef = useRef<HTMLInputElement>(null);
  const stepRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setTitle('');
    setDoneWhen('');
    setTargetDay('');
    setShowDate(false);
    setFirstStep('');
    setToday(true);
    const t = window.setTimeout(() => titleRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (step === 2) stepRef.current?.focus();
  }, [step]);

  function next(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) setStep(2);
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!firstStep.trim()) return;
    const id = await createMission({ title, doneWhen, targetDay, firstStep, firstStepToday: today });
    onClose();
    navigate(`/goal/${id}`);
  }

  return (
    <Sheet open={open} onClose={onClose} label="New goal">
      {step === 1 ? (
        <form onSubmit={next} className={styles.form}>
          <label htmlFor="mission-title" className={styles.question}>
            What’s your goal?
          </label>
          <input
            ref={titleRef}
            id="mission-title"
            className={forms.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Run a half marathon"
            autoComplete="off"
            enterKeyHint="next"
            maxLength={100}
          />
          <div className={forms.group}>
            <label htmlFor="mission-done-when" className={forms.label}>
              You’ll know it’s done when… (optional)
            </label>
            <input
              id="mission-done-when"
              className={forms.input}
              value={doneWhen}
              onChange={(e) => setDoneWhen(e.target.value)}
              placeholder="e.g. I finish the Berlin half in April"
              autoComplete="off"
              maxLength={160}
            />
          </div>
          {showDate ? (
            <div className={forms.group}>
              <label htmlFor="mission-date" className={forms.label}>
                Target date (optional)
              </label>
              <input id="mission-date" type="date" className={forms.input} value={targetDay} onChange={(e) => setTargetDay(e.target.value)} />
            </div>
          ) : (
            <div className={forms.chips}>
              <button type="button" className={forms.chip} onClick={() => setShowDate(true)}>
                + Target date
              </button>
            </div>
          )}
          {activeCount >= RECOMMENDED_ACTIVE_MISSIONS && (
            <p className={styles.note}>
              You have {activeCount} active goals. Fewer at a time is usually easier — you can pause one any time.
            </p>
          )}
          <button type="submit" className={forms.primary} disabled={!title.trim()}>
            Next
          </button>
        </form>
      ) : (
        <form onSubmit={create} className={styles.form}>
          <button type="button" className={styles.back} onClick={() => setStep(1)}>
            ← {title.trim()}
          </button>
          <label htmlFor="mission-first-step" className={styles.question}>
            What’s the first step?
          </label>
          <input
            ref={stepRef}
            id="mission-first-step"
            className={forms.input}
            value={firstStep}
            onChange={(e) => setFirstStep(e.target.value)}
            placeholder="e.g. Run 3 km, easy pace"
            autoComplete="off"
            enterKeyHint="done"
            maxLength={140}
          />
          <div className={forms.chips} role="group" aria-label="When">
            <button type="button" className={forms.chip} aria-pressed={today} onClick={() => setToday(true)}>
              Do it today
            </button>
            <button type="button" className={forms.chip} aria-pressed={!today} onClick={() => setToday(false)}>
              Later
            </button>
          </div>
          <button type="submit" className={forms.primary} disabled={!firstStep.trim()}>
            Create goal
          </button>
        </form>
      )}
    </Sheet>
  );
}
