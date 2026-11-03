import type { HabitSchedule } from '../core/types';
import forms from './forms.module.css';
import styles from './RepeatPicker.module.css';

interface RepeatPickerProps {
  /** undefined = a one-off task. */
  value?: HabitSchedule;
  onChange: (value: HabitSchedule | undefined) => void;
  /** Hide "Never" when editing an existing habit. */
  allowNever?: boolean;
}

/** Never · Every day · X times a week (with − / + for X). A repeating task is a habit. */
export function RepeatPicker({ value, onChange, allowNever = true }: RepeatPickerProps) {
  const weekly = value?.kind === 'weekly' ? value.times : undefined;
  return (
    <div className={forms.group}>
      <span className={forms.label} id="repeat-label">
        Repeat
      </span>
      <div className={forms.chips} role="group" aria-labelledby="repeat-label">
        {allowNever && (
          <button type="button" className={forms.chip} aria-pressed={!value} onClick={() => onChange(undefined)}>
            Never
          </button>
        )}
        <button type="button" className={forms.chip} aria-pressed={value?.kind === 'daily'} onClick={() => onChange({ kind: 'daily' })}>
          Every day
        </button>
        <button
          type="button"
          className={forms.chip}
          aria-pressed={value?.kind === 'weekly'}
          onClick={() => onChange({ kind: 'weekly', times: weekly ?? 3 })}
        >
          Some days a week
        </button>
      </div>
      {weekly !== undefined && (
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.step}
            aria-label="Fewer times a week"
            disabled={weekly <= 1}
            onClick={() => onChange({ kind: 'weekly', times: weekly - 1 })}
          >
            −
          </button>
          <span className={styles.value} aria-live="polite">
            <strong>{weekly}×</strong> a week
          </span>
          <button
            type="button"
            className={styles.step}
            aria-label="More times a week"
            disabled={weekly >= 6}
            onClick={() => onChange({ kind: 'weekly', times: weekly + 1 })}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
