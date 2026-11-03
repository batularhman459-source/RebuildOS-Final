import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteAction, makeMain, reopenAction, scheduleAction, updateAction, type When } from '../data/actions';
import { useDay } from '../app/day';
import type { Action } from '../core/types';
import { WhenPicker } from './WhenPicker';
import { db } from '../data/db';
import { startFocus } from '../data/focus';
import { setActionMission } from '../data/missions';
import { EstimateChips } from './EstimateChips';
import { MissionPicker } from './MissionPicker';
import { Sheet } from './Sheet';
import forms from './forms.module.css';

interface ActionSheetProps {
  actionId?: string;
  onClose: () => void;
}

/** Edit a task: name, when, goal, how long; start Focus or do it first. Opened by tapping a task anywhere. */
export function ActionSheet({ actionId, onClose }: ActionSheetProps) {
  const action = useLiveQuery(() => (actionId ? db.actions.get(actionId) : undefined), [actionId]);
  const [title, setTitle] = useState('');
  const inputId = useId();
  const navigate = useNavigate();
  const today = useDay();
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (action) setTitle(action.title);
    setMore(false);
  }, [action?.id]);

  const open = actionId !== undefined && action !== undefined;

  async function run(fn: () => Promise<void>) {
    await saveTitle();
    await fn();
    onClose();
  }

  async function saveTitle() {
    if (action && title.trim() && title.trim() !== action.title) await updateAction(action.id, { title });
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        void saveTitle();
        onClose();
      }}
      label="Edit task"
    >
      {action && (
        <>
          <label htmlFor={inputId} className="visually-hidden">
            Task name
          </label>
          <input
            id={inputId}
            className={forms.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            maxLength={140}
            enterKeyHint="done"
          />
          {action.state !== 'done' && (
            <WhenPicker
              today={today}
              when={whenOf(action)}
              time={action.time}
              onChange={(w, t) => void scheduleAction(action.id, w, t ?? '')}
            />
          )}
          <MissionPicker value={action.missionId} onChange={(m) => void setActionMission(action.id, m)} />
          {action.state !== 'done' &&
            (action.estimateMinutes || more ? (
              <EstimateChips value={action.estimateMinutes} onChange={(m) => void updateAction(action.id, { estimateMinutes: m })} />
            ) : (
              <button type="button" className={forms.moreLink} onClick={() => setMore(true)}>
                + How long it takes
              </button>
            ))}
          <div className={forms.list}>
            {action.state !== 'done' && (
              <button
                type="button"
                className={forms.listButton}
                onClick={() =>
                  run(async () => {
                    await startFocus(action.id);
                    navigate('/focus');
                  })
                }
              >
                Start focus
              </button>
            )}
            {action.state === 'today' && !action.isMain && (
              <button type="button" className={forms.listButton} onClick={() => run(() => makeMain(action.id))}>
                Do this first
              </button>
            )}
            {action.state === 'done' && (
              <button type="button" className={forms.listButton} onClick={() => run(() => reopenAction(action.id))}>
                Not done yet
              </button>
            )}
            <button type="button" className={`${forms.listButton} ${forms.danger}`} onClick={() => run(() => deleteAction(action.id))}>
              Delete
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function whenOf(a: Action): When {
  if (a.state === 'today') return 'today';
  return a.targetDay ? { day: a.targetDay } : 'later';
}
