import { useLiveQuery } from 'dexie-react-hooks';
import { activeMissions } from '../core/missions';
import { db } from '../data/db';
import forms from './forms.module.css';

interface MissionPickerProps {
  value?: string;
  onChange: (missionId: string | undefined) => void;
}

/** Optional Mission for an Action. Tap a Mission, tap again to clear. Hidden when there are no Missions. */
export function MissionPicker({ value, onChange }: MissionPickerProps) {
  const missions = useLiveQuery(async () => activeMissions(await db.missions.toArray()), []);
  if (!missions || missions.length === 0) return null;

  return (
    <div className={forms.group}>
      <span className={forms.label} id="mission-label">
        Goal (optional)
      </span>
      <div className={forms.chips} role="group" aria-labelledby="mission-label">
        {missions.map((m) => (
          <button
            key={m.id}
            type="button"
            className={forms.chip}
            aria-pressed={value === m.id}
            onClick={() => onChange(value === m.id ? undefined : m.id)}
          >
            {m.title}
          </button>
        ))}
      </div>
    </div>
  );
}
