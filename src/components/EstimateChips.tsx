import { ESTIMATE_PRESETS } from '../core/focus';
import forms from './forms.module.css';

interface EstimateChipsProps {
  value?: number;
  onChange: (minutes: number | undefined) => void;
}

/** Optional time estimate: tap a preset, tap again to clear. */
export function EstimateChips({ value, onChange }: EstimateChipsProps) {
  return (
    <div className={forms.group}>
      <span className={forms.label} id="estimate-label">
        About how long? (optional)
      </span>
      <div className={forms.chips} role="group" aria-labelledby="estimate-label">
        {ESTIMATE_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            className={forms.chip}
            aria-pressed={value === m}
            onClick={() => onChange(value === m ? undefined : m)}
          >
            {m < 60 ? `${m} min` : m === 60 ? '1 h' : `${m / 60} h`}
          </button>
        ))}
      </div>
    </div>
  );
}
