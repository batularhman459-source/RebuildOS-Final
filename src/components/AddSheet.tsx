import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useDay } from '../app/day';
import { addAction, type When } from '../data/actions';
import { EstimateChips } from './EstimateChips';
import { MissionPicker } from './MissionPicker';
import { Sheet } from './Sheet';
import { WhenPicker } from './WhenPicker';
import forms from './forms.module.css';

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  /** Where the task goes by default: from Today it's today, from Plan it's someday. */
  defaultDestination: 'today' | 'later';
  defaultMissionId?: string;
}

/** New task: only the name is required. Everything else is optional and in plain words. */
export function AddSheet({ open, onClose, defaultDestination, defaultMissionId }: AddSheetProps) {
  const today = useDay();
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<When>(defaultDestination);
  const [time, setTime] = useState<string | undefined>();
  const [estimate, setEstimate] = useState<number | undefined>();
  const [missionId, setMissionId] = useState<string | undefined>();
  const [more, setMore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setWhen(defaultDestination);
    setTime(undefined);
    setEstimate(undefined);
    setMissionId(defaultMissionId);
    setMore(false);
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open, defaultDestination, defaultMissionId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await addAction({ title, when, time, estimateMinutes: estimate, missionId });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} label="New task">
      <form onSubmit={submit} className={forms.group} style={{ gap: 'var(--space-5, 20px)' }}>
        <label htmlFor={inputId} className={forms.title}>
          New task
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className={forms.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to do?"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={140}
        />
        <WhenPicker
          today={today}
          when={when}
          time={time}
          onChange={(w, t) => {
            setWhen(w);
            setTime(t);
          }}
        />
        <MissionPicker value={missionId} onChange={setMissionId} />
        {more ? (
          <EstimateChips value={estimate} onChange={setEstimate} />
        ) : (
          <button type="button" className={forms.moreLink} onClick={() => setMore(true)}>
            + How long it takes
          </button>
        )}
        <button type="submit" className={forms.primary} disabled={!title.trim()}>
          Add task
        </button>
      </form>
    </Sheet>
  );
}
