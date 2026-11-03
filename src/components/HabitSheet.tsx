import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useState } from 'react';
import { db } from '../data/db';
import { deleteHabit, setHabitPaused, updateHabit } from '../data/habits';
import { MissionPicker } from './MissionPicker';
import { RepeatPicker } from './RepeatPicker';
import { Sheet } from './Sheet';
import forms from './forms.module.css';

interface HabitSheetProps {
  habitId?: string;
  onClose: () => void;
}

/** Edit a habit: name, how often, goal; pause or delete. */
export function HabitSheet({ habitId, onClose }: HabitSheetProps) {
  const habit = useLiveQuery(() => (habitId ? db.habits.get(habitId) : undefined), [habitId]);
  const [title, setTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputId = useId();

  useEffect(() => {
    if (habit) setTitle(habit.title);
    setConfirmDelete(false);
  }, [habit?.id]);

  const open = habitId !== undefined && habit !== undefined;

  async function save() {
    if (habit && title.trim() && title.trim() !== habit.title) await updateHabit(habit.id, { title });
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        void save();
        onClose();
      }}
      label="Edit habit"
    >
      {habit && (
        <>
          <label htmlFor={inputId} className="visually-hidden">
            Habit name
          </label>
          <input
            id={inputId}
            className={forms.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            maxLength={80}
            enterKeyHint="done"
          />
          <RepeatPicker value={habit.schedule} allowNever={false} onChange={(s) => s && void updateHabit(habit.id, { schedule: s })} />
          <MissionPicker value={habit.missionId} onChange={(m) => void updateHabit(habit.id, { missionId: m })} />
          <div className={forms.list}>
            <button
              type="button"
              className={forms.listButton}
              onClick={async () => {
                await save();
                await setHabitPaused(habit.id, habit.pausedAt === undefined);
                onClose();
              }}
            >
              {habit.pausedAt === undefined ? 'Pause this habit' : 'Start this habit again'}
            </button>
            <button
              type="button"
              className={`${forms.listButton} ${forms.danger}`}
              onClick={async () => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                await deleteHabit(habit.id);
                onClose();
              }}
            >
              {confirmDelete ? 'Tap again to delete this habit' : 'Delete habit'}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
