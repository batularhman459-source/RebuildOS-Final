import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useRef, useState } from 'react';
import { promptsFor, wordCount } from '../core/journal';
import type { DayKey } from '../core/types';
import { getEntry, saveEntry } from '../data/journal';
import styles from './JournalEditor.module.css';

/**
 * Write about a day. Saves by itself as you type (and when you leave); prompts help
 * when the page is blank. Nothing here is required.
 */
export function JournalEditor({ day, label = 'Journal' }: { day: DayKey; label?: string }) {
  const entry = useLiveQuery(async () => (await getEntry(day)) ?? null, [day]);
  const [text, setText] = useState('');
  const [prompt, setPrompt] = useState<string | undefined>();
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const loaded = useRef(false);
  const latest = useRef({ text: '', prompt: undefined as string | undefined, dirty: false });
  const timer = useRef(0);
  const id = useId();
  const suggested = promptsFor(day);
  // A prompt saved with the entry always stays visible.
  const prompts = prompt && !suggested.includes(prompt) ? [prompt, ...suggested.slice(0, 2)] : suggested;

  // Load once per day; later database updates come from our own saves.
  useEffect(() => {
    loaded.current = false;
  }, [day]);
  useEffect(() => {
    if (entry === undefined || loaded.current) return;
    loaded.current = true;
    setText(entry?.text ?? '');
    setPrompt(entry?.prompt);
    latest.current = { text: entry?.text ?? '', prompt: entry?.prompt, dirty: false };
  }, [entry]);

  async function flush() {
    window.clearTimeout(timer.current);
    if (!latest.current.dirty) return;
    latest.current.dirty = false;
    await saveEntry(day, latest.current.text, latest.current.prompt);
    setSaved('saved');
  }

  // Save whatever is pending when leaving the page.
  useEffect(
    () => () => {
      void flush();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [day],
  );

  function change(next: string, nextPrompt = prompt) {
    setText(next);
    latest.current = { text: next, prompt: nextPrompt, dirty: true };
    setSaved('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 600);
  }

  const words = wordCount(text);
  return (
    <div className={styles.editor}>
      <div className={styles.prompts} role="group" aria-label="Prompts">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            className={styles.prompt}
            aria-pressed={prompt === p}
            onClick={() => {
              const next = prompt === p ? undefined : p;
              setPrompt(next);
              change(text, next);
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <textarea
        id={id}
        className={styles.text}
        value={text}
        onChange={(e) => change(e.target.value)}
        onBlur={() => void flush()}
        placeholder={prompt ?? 'A few lines about today. Only you will see this.'}
        rows={6}
      />
      <p className={styles.status} aria-live="polite">
        {saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved' : words > 0 ? `${words} ${words === 1 ? 'word' : 'words'}` : 'Stays on this phone'}
      </p>
    </div>
  );
}
