import { useId } from 'react';
import { addDays } from '../core/day';
import { formatShortDay } from '../core/locale';
import type { DayKey } from '../core/types';
import type { When } from '../data/actions';
import forms from './forms.module.css';
import styles from './WhenPicker.module.css';

export type WhenChoice = 'today' | 'tomorrow' | 'date' | 'someday';

interface WhenPickerProps {
  today: DayKey;
  when: When;
  time?: string;
  onChange: (when: When, time: string | undefined) => void;
}

/** Turn a stored When into the chip that should look selected. */
export function choiceOf(when: When, today: DayKey): WhenChoice {
  if (when === 'today') return 'today';
  if (when === 'later') return 'someday';
  if (when.day <= today) return 'today';
  if (when.day === addDays(today, 1)) return 'tomorrow';
  return 'date';
}

/**
 * When a task happens, in plain words: Today · Tomorrow · Pick a date · Someday,
 * plus an optional time that orders the day (no reminders yet).
 */
export function WhenPicker({ today, when, time, onChange }: WhenPickerProps) {
  const choice = choiceOf(when, today);
  const dateId = useId();
  const timeId = useId();
  const pickedDay = typeof when === 'object' && when.day > addDays(today, 1) ? when.day : addDays(today, 2);

  const chips: { id: WhenChoice; label: string; value: When }[] = [
    { id: 'today', label: 'Today', value: 'today' },
    { id: 'tomorrow', label: 'Tomorrow', value: { day: addDays(today, 1) } },
    { id: 'date', label: choice === 'date' && typeof when === 'object' ? formatShortDay(when.day) : 'Pick a date', value: { day: pickedDay } },
    { id: 'someday', label: 'Someday', value: 'later' },
  ];

  return (
    <div className={forms.group}>
      <span className={forms.label} id={`${dateId}-label`}>
        When
      </span>
      <div className={forms.chips} role="group" aria-labelledby={`${dateId}-label`}>
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            className={forms.chip}
            aria-pressed={choice === c.id}
            onClick={() => onChange(c.value, c.id === 'someday' ? undefined : time)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {choice === 'date' && (
        <div className={styles.row}>
          <label htmlFor={dateId} className={styles.rowLabel}>
            Date
          </label>
          <input
            id={dateId}
            type="date"
            className={styles.native}
            min={addDays(today, 1)}
            value={typeof when === 'object' ? when.day : pickedDay}
            onChange={(e) => e.target.value && onChange({ day: e.target.value }, time)}
          />
        </div>
      )}

      {choice !== 'someday' && (
        <div className={styles.row}>
          <label htmlFor={timeId} className={styles.rowLabel}>
            Time <span className={styles.optional}>(optional, sorts your day)</span>
          </label>
          <div className={styles.timeWrap}>
            <input
              id={timeId}
              type="time"
              className={styles.native}
              value={time ?? ''}
              onChange={(e) => onChange(when, e.target.value || undefined)}
            />
            {time && (
              <button type="button" className={styles.clear} aria-label="Remove time" onClick={() => onChange(when, undefined)}>
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
