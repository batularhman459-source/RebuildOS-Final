import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useState } from 'react';
import { deleteAction, makeMain, moveToLater, moveToToday, reopenAction, updateAction } from '../data/actions';
import { db } from '../data/db';
import { EstimateChips } from './EstimateChips';
import { Sheet } from './Sheet';
import forms from './forms.module.css';

interface ActionSheetProps {
  actionId?: string;
  onClose: () => void;
}

/** Edit an Action and move it around. Opened by tapping an Action anywhere. */
export function ActionSheet({ actionId, onClose }: ActionSheetProps) {
  const action = useLiveQuery(() => (actionId ? db.actions.get(actionId) : undefined), [actionId]);
  const [title, setTitle] = useState('');
  const inputId = useId();

  useEffect(() => {
    if (action) setTitle(action.title);
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
      label="Edit action"
    >
      {action && (
        <>
          <label htmlFor={inputId} className="visually-hidden">
            Action name
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
            <EstimateChips
              value={action.estimateMinutes}
              onChange={(m) => void updateAction(action.id, { estimateMinutes: m })}
            />
          )}
          <div className={forms.list}>
            {action.state === 'today' && !action.isMain && (
              <button type="button" className={forms.listButton} onClick={() => run(() => makeMain(action.id))}>
                Make it the main action
              </button>
            )}
            {action.state === 'today' && (
              <button type="button" className={forms.listButton} onClick={() => run(() => moveToLater(action.id))}>
                Move to Later
              </button>
            )}
            {action.state === 'later' && (
              <button type="button" className={forms.listButton} onClick={() => run(() => moveToToday(action.id))}>
                Move to Today
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
