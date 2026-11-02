import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { addAction } from '../data/actions';
import { EstimateChips } from './EstimateChips';
import { MissionPicker } from './MissionPicker';
import { Sheet } from './Sheet';
import forms from './forms.module.css';

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  /** Where the Action goes by default: adding from Today puts it on Today, from Plan in Later. */
  defaultDestination: 'today' | 'later';
  defaultMissionId?: string;
}

/** Quick add: only the name is required. Creating an Action should take seconds. */
export function AddSheet({ open, onClose, defaultDestination, defaultMissionId }: AddSheetProps) {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState(defaultDestination);
  const [estimate, setEstimate] = useState<number | undefined>();
  const [missionId, setMissionId] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setEstimate(undefined);
    setDestination(defaultDestination);
    setMissionId(defaultMissionId);
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open, defaultDestination, defaultMissionId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await addAction({ title, destination, estimateMinutes: estimate, missionId });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} label="Add an action">
      <form onSubmit={submit} className={forms.group} style={{ gap: 'var(--space-4)' }}>
        <label htmlFor={inputId} className={forms.title}>
          Add an action
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className={forms.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Book dentist"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={140}
        />
        <div className={forms.chips} role="group" aria-label="When">
          <button type="button" className={forms.chip} aria-pressed={destination === 'today'} onClick={() => setDestination('today')}>
            Today
          </button>
          <button type="button" className={forms.chip} aria-pressed={destination === 'later'} onClick={() => setDestination('later')}>
            Later
          </button>
        </div>
        <EstimateChips value={estimate} onChange={setEstimate} />
        <MissionPicker value={missionId} onChange={setMissionId} />
        <button type="submit" className={forms.primary} disabled={!title.trim()}>
          Add
        </button>
      </form>
    </Sheet>
  );
}
