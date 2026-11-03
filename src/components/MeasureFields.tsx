import { useId } from 'react';
import forms from './forms.module.css';
import styles from './MeasureFields.module.css';

interface MeasureFieldsProps {
  target: string;
  unit: string;
  onTarget: (v: string) => void;
  onUnit: (v: string) => void;
}

/** "Target: 21 · Unit: km" — a goal you can measure gets a real progress bar. */
export function MeasureFields({ target, unit, onTarget, onUnit }: MeasureFieldsProps) {
  const id = useId();
  return (
    <div className={styles.row}>
      <div className={forms.group} style={{ flex: 1.2 }}>
        <label htmlFor={`${id}-target`} className={forms.label}>
          Target
        </label>
        <input
          id={`${id}-target`}
          className={forms.input}
          inputMode="decimal"
          value={target}
          onChange={(e) => onTarget(e.target.value)}
          placeholder="e.g. 21"
          maxLength={12}
        />
      </div>
      <div className={forms.group} style={{ flex: 1 }}>
        <label htmlFor={`${id}-unit`} className={forms.label}>
          Unit
        </label>
        <input
          id={`${id}-unit`}
          className={forms.input}
          value={unit}
          onChange={(e) => onUnit(e.target.value)}
          placeholder="km, €, pages"
          maxLength={12}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
