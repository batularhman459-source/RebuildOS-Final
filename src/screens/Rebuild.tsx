import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDay } from '../app/day';
import { Sheet } from '../components/Sheet';
import { Stage } from '../components/Stage';
import forms from '../components/forms.module.css';
import { defaultSlots, SLOT_LABELS, SLOT_ORDER, SLOT_SUGGESTIONS } from '../core/rebuild';
import { isLive } from '../core/today';
import type { Action, RebuildSlot, RebuildSlotKind } from '../core/types';
import { db } from '../data/db';
import { startSmallDay } from '../data/days';
import styles from './Rebuild.module.css';

/** "Make today smaller": up to three small things. Any of them counts. See docs/product-brief.md §4.5. */
export function Rebuild() {
  const navigate = useNavigate();
  const day = useDay();
  const source = useLiveQuery(async () => {
    const [actions, missions, sessions] = await Promise.all([db.actions.toArray(), db.missions.toArray(), db.focusSessions.toArray()]);
    return { actions, missions, sessions };
  }, []);
  const [slots, setSlots] = useState<RebuildSlot[] | null>(null);
  const [removed, setRemoved] = useState<RebuildSlotKind[]>([]);
  const [swapping, setSwapping] = useState<RebuildSlotKind | null>(null);

  // Pre-fill once, from the data as it was when the screen opened.
  useEffect(() => {
    if (source && !slots) setSlots(defaultSlots(source.actions, source.missions, source.sessions));
  }, [source, slots]);

  if (!slots || !source) return <div className={styles.root} />;

  const visible = slots.filter((s) => !removed.includes(s.kind));
  const canStart = visible.some((s) => s.title.trim());

  function update(kind: RebuildSlotKind, patch: Partial<RebuildSlot>) {
    setSlots((prev) => prev?.map((s) => (s.kind === kind ? { ...s, ...patch } : s)) ?? null);
  }

  async function start() {
    await startSmallDay(day, visible);
    navigate('/', { replace: true });
  }

  const swapSlot = swapping ? slots.find((s) => s.kind === swapping) : undefined;

  return (
    <div className={styles.root}>
      <Stage height="330px" glowTop="70%" aria-label="A smaller day">
        <button type="button" className={styles.close} aria-label="Back to Today" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div style={{ flex: 1 }} />
        <h1 className={styles.title}>
          A smaller <i>day.</i>
        </h1>
        <p className={styles.subtitle}>Do one, two or all three. Any of them counts.</p>
      </Stage>

      <section className={styles.slots} aria-label="Your small things">
        {SLOT_ORDER.map((kind) => {
          const slot = slots.find((s) => s.kind === kind)!;
          if (removed.includes(kind)) {
            return (
              <button key={kind} type="button" className={styles.restore} onClick={() => setRemoved((r) => r.filter((k) => k !== kind))}>
                + {SLOT_LABELS[kind]}
              </button>
            );
          }
          return (
            <div key={kind} className={`${styles.slot} ${kind === 'forward' ? styles.forward : ''}`}>
              <div className={styles.slotText}>
                <span className={styles.slotLabel}>{SLOT_LABELS[kind]}</span>
                {slot.title ? (
                  <span className={styles.slotTitle}>{slot.title}</span>
                ) : (
                  <input
                    className={styles.inlineInput}
                    placeholder="What’s one thing that matters?"
                    aria-label="One step forward"
                    onBlur={(e) => e.target.value.trim() && update(kind, { title: e.target.value.trim(), actionId: undefined })}
                    onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                    maxLength={140}
                  />
                )}
                {kind === 'forward' && slot.title && <span className={styles.slotHint}>25 minutes is enough</span>}
              </div>
              <button type="button" className={styles.swap} onClick={() => setSwapping(kind)}>
                Swap
              </button>
            </div>
          );
        })}
      </section>

      <div className={styles.footer}>
        <button type="button" className={styles.start} disabled={!canStart} onClick={() => void start()}>
          Start this day
        </button>
        <p className={styles.note}>Your full Today is kept for tomorrow.</p>
      </div>

      <SwapSheet
        kind={swapping}
        current={swapSlot}
        actions={source.actions}
        onClose={() => setSwapping(null)}
        onPick={(patch) => {
          if (swapping) update(swapping, patch);
          setSwapping(null);
        }}
        onRemove={() => {
          if (swapping) setRemoved((r) => [...r, swapping]);
          setSwapping(null);
        }}
      />
    </div>
  );
}

interface SwapSheetProps {
  kind: RebuildSlotKind | null;
  current?: RebuildSlot;
  actions: Action[];
  onClose: () => void;
  onPick: (patch: Partial<RebuildSlot>) => void;
  onRemove: () => void;
}

function SwapSheet({ kind, current, actions, onClose, onPick, onRemove }: SwapSheetProps) {
  const [own, setOwn] = useState('');
  useEffect(() => setOwn(''), [kind]);

  const yours =
    kind === 'forward'
      ? actions
          .filter((a) => isLive(a) && a.state !== 'done' && a.origin !== 'rebuild')
          .sort((a, b) => (a.state === b.state ? a.sortOrder - b.sortOrder : a.state === 'today' ? -1 : 1))
          .slice(0, 6)
      : [];

  function submit(e: FormEvent) {
    e.preventDefault();
    if (own.trim()) onPick({ title: own.trim(), actionId: undefined });
  }

  return (
    <Sheet open={kind !== null} onClose={onClose} label="Swap">
      {kind && (
        <>
          <h2 className={forms.title}>{SLOT_LABELS[kind]}</h2>
          <div className={forms.list}>
            {yours.map((a) => (
              <button key={a.id} type="button" className={forms.listButton} onClick={() => onPick({ title: a.title, actionId: a.id })}>
                <span style={{ flex: 1 }}>{a.title}</span>
                {current?.actionId === a.id && <span aria-label="current">✓</span>}
              </button>
            ))}
            {SLOT_SUGGESTIONS[kind].map((t) => (
              <button key={t} type="button" className={forms.listButton} onClick={() => onPick({ title: t, actionId: undefined })}>
                <span style={{ flex: 1 }}>{t}</span>
                {current?.title === t && !current.actionId && <span aria-label="current">✓</span>}
              </button>
            ))}
          </div>
          <form onSubmit={submit} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <label htmlFor="swap-own" className="visually-hidden">
              Write your own
            </label>
            <input
              id="swap-own"
              className={forms.input}
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              placeholder="Write your own"
              autoComplete="off"
              maxLength={140}
            />
            <button type="submit" className={forms.chip} style={{ height: 52 }} disabled={!own.trim()}>
              Use
            </button>
          </form>
          <button type="button" className={`${forms.listButton}`} style={{ color: 'var(--ink-muted)' }} onClick={onRemove}>
            Remove this one for today
          </button>
        </>
      )}
    </Sheet>
  );
}
