import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDay } from '../app/day';
import { Stage } from '../components/Stage';
import { MAX_MINIMUM_ITEMS, MINIMUM_SUGGESTIONS, type MinimumDay } from '../core/rebuild';
import { getMinimum, saveMinimum, startMinimumDay } from '../data/minimum';
import styles from './Rebuild.module.css';

/**
 * My minimum day: what you'll still do on a bad day. Set it once; on a bad day,
 * "Just do my minimum" on Today starts it with one tap.
 */
export function Rebuild() {
  const navigate = useNavigate();
  const day = useDay();
  const [minimum, setMinimum] = useState<MinimumDay | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    void getMinimum().then((m) => setMinimum({ ...m, items: [...m.items] }));
  }, []);

  if (!minimum) return <div className={styles.root} />;

  const full = minimum.items.length >= MAX_MINIMUM_ITEMS;
  const ideas = MINIMUM_SUGGESTIONS.filter((s) => !minimum.items.includes(s)).slice(0, 5);
  const isEmpty = !minimum.includeGoalStep && minimum.items.every((i) => !i.trim());

  function setItem(i: number, value: string) {
    setMinimum((m) => m && { ...m, items: m.items.map((x, j) => (j === i ? value : x)) });
  }
  function addItem(value: string) {
    if (!value.trim() || full) return;
    setMinimum((m) => m && { ...m, items: [...m.items, value.trim()] });
    setDraft('');
  }
  function removeItem(i: number) {
    setMinimum((m) => m && { ...m, items: m.items.filter((_, j) => j !== i) });
  }

  async function save() {
    await saveMinimum(minimum!);
    navigate(-1);
  }

  async function startNow() {
    await saveMinimum(minimum!);
    await startMinimumDay(day);
    navigate('/', { replace: true });
  }

  return (
    <div className={styles.root}>
      <Stage height="300px" glowTop="72%" aria-label="My minimum day">
        <button type="button" className={styles.close} aria-label="Close" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div style={{ flex: 1 }} />
        <h1 className={styles.title}>
          My minimum <i>day.</i>
        </h1>
        <p className={styles.subtitle}>What you’ll still do on a bad day. Set it once — then it’s one tap.</p>
      </Stage>

      <section className={styles.slots} aria-label="Your minimum">
        <label className={styles.toggleRow}>
          <span className={styles.toggleText}>
            <span className={styles.toggleTitle}>One step on my main goal</span>
            <span className={styles.toggleHint}>Whatever is up next, or your goal’s next step</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className={styles.switch}
            checked={minimum.includeGoalStep}
            onChange={(e) => setMinimum({ ...minimum, includeGoalStep: e.target.checked })}
          />
        </label>

        {minimum.items.map((item, i) => (
          <div key={i} className={styles.itemRow}>
            <input
              className={styles.itemInput}
              value={item}
              onChange={(e) => setItem(i, e.target.value)}
              aria-label={`Minimum item ${i + 1}`}
              maxLength={80}
            />
            <button type="button" className={styles.remove} aria-label={`Remove ${item || 'item'}`} onClick={() => removeItem(i)}>
              ×
            </button>
          </div>
        ))}

        {!full && (
          <form
            className={styles.itemRow}
            onSubmit={(e) => {
              e.preventDefault();
              addItem(draft);
            }}
          >
            <input
              className={styles.itemInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="+ Add something small"
              aria-label="Add something small"
              maxLength={80}
              enterKeyHint="done"
            />
            {draft.trim() && (
              <button type="submit" className={styles.addButton}>
                Add
              </button>
            )}
          </form>
        )}

        {!full && ideas.length > 0 && (
          <div className={styles.ideas}>
            <span className={styles.ideasLabel}>Ideas</span>
            <div className={styles.chips}>
              {ideas.map((idea) => (
                <button key={idea} type="button" className={styles.chip} onClick={() => addItem(idea)}>
                  + {idea}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className={styles.footer}>
        <button type="button" className={styles.start} onClick={() => void save()} disabled={isEmpty}>
          Save
        </button>
        <button type="button" className={styles.secondary} onClick={() => void startNow()} disabled={isEmpty}>
          Start my minimum day now
        </button>
      </div>
    </div>
  );
}
