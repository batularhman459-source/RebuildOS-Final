import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDay } from '../app/day';
import { Stage } from '../components/Stage';
import { dayKey } from '../core/day';
import { formatDuration } from '../core/focus';
import { activeMissions, nextAction } from '../core/missions';
import { summarise } from '../core/progress';
import { isLive, todayView } from '../core/today';
import type { Action } from '../core/types';
import { closeDay, type LeftoverChoice, type TomorrowMain } from '../data/closeDay';
import { db } from '../data/db';
import styles from './CloseDay.module.css';

const dayOf = (t: number) => dayKey(new Date(t));
const NEW = '__new__';

/** "Close the day": what you did, where leftovers go, tomorrow's Main Action, optional energy. ~30 seconds. */
export function CloseDay() {
  const navigate = useNavigate();
  const day = useDay();
  const data = useLiveQuery(async () => {
    const [actions, sessions, missions] = await Promise.all([db.actions.toArray(), db.focusSessions.toArray(), db.missions.toArray()]);
    return { actions, sessions, missions };
  }, []);

  const [leftovers, setLeftovers] = useState<Record<string, LeftoverChoice> | null>(null);
  const [mainChoice, setMainChoice] = useState<string | null>(null);
  const [newMain, setNewMain] = useState('');
  const [energy, setEnergy] = useState<number | undefined>();

  const view = data ? todayView(data.actions, day, dayOf) : undefined;
  const open: Action[] = view ? [...(view.main ? [view.main] : []), ...view.open] : [];

  // Defaults, set once: the Main Action carries to tomorrow, everything else goes to Later
  // (the same as the overnight rule), and the Main Action stays tomorrow's Main Action.
  useEffect(() => {
    if (!view || leftovers) return;
    setLeftovers(Object.fromEntries(open.map((a) => [a.id, a.isMain ? 'tomorrow' : 'later'])));
    setMainChoice(view.main?.id ?? null);
  }, [view, leftovers, open]);

  if (!data || !view || !leftovers) return <div className={styles.root} />;

  const summary = summarise([day], data.actions, data.sessions, dayOf);
  const forTomorrow = open.filter((a) => leftovers[a.id] === 'tomorrow');
  // Also offer each active Mission's next step that isn't already on Today.
  const fromMissions = activeMissions(data.missions)
    .map((m) => nextAction(m.id, data.actions.filter(isLive)))
    .filter((a): a is Action => a !== undefined && a.state === 'later')
    .slice(0, 3);
  const mainOptions = [...forTomorrow, ...fromMissions];
  const chosen = mainChoice === NEW || mainOptions.some((a) => a.id === mainChoice) ? mainChoice : (forTomorrow[0]?.id ?? null);

  async function finish() {
    const tomorrowMain: TomorrowMain =
      chosen === NEW ? (newMain.trim() ? { title: newMain } : undefined) : chosen ? { actionId: chosen } : undefined;
    await closeDay(day, { leftovers: leftovers!, tomorrowMain, energy });
    navigate('/', { replace: true });
  }

  return (
    <div className={styles.root}>
      <Stage height="300px" glowTop="72%" aria-label="Close the day">
        <button type="button" className={styles.close} aria-label="Not now" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div style={{ flex: 1 }} />
        <h1 className={styles.title}>
          Your <i>day.</i>
        </h1>
        <p className={styles.summary}>
          {summary.actionsDone === 0 && summary.focusMs < 60_000 ? (
            'A quiet day.'
          ) : (
            <>
              <strong>{summary.actionsDone}</strong> {summary.actionsDone === 1 ? 'action' : 'actions'} done
              {summary.focusMs >= 60_000 && (
                <>
                  {' · '}
                  <strong>{formatDuration(summary.focusMs)}</strong> focused
                </>
              )}
            </>
          )}
        </p>
      </Stage>

      <div className={styles.body}>
        {view.doneToday.length > 0 && (
          <section className={styles.section} aria-labelledby="did-heading">
            <h2 id="did-heading" className={styles.heading}>
              What you did
            </h2>
            <ul className={styles.doneList}>
              {view.doneToday.map((a) => (
                <li key={a.id}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  {a.title}
                </li>
              ))}
            </ul>
          </section>
        )}

        {open.length > 0 && (
          <section className={styles.section} aria-labelledby="open-heading">
            <h2 id="open-heading" className={styles.heading}>
              Still open
            </h2>
            <ul className={styles.openList}>
              {open.map((a) => (
                <li key={a.id} className={styles.openRow}>
                  <span className={styles.openTitle}>{a.title}</span>
                  <div className={styles.segment} role="group" aria-label={`Where should ${a.title} go?`}>
                    {(['tomorrow', 'later'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={leftovers[a.id] === c}
                        onClick={() => setLeftovers({ ...leftovers, [a.id]: c })}
                      >
                        {c === 'tomorrow' ? 'Tomorrow' : 'Later'}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.section} aria-labelledby="main-heading">
          <h2 id="main-heading" className={styles.heading}>
            Tomorrow’s main action
          </h2>
          <div className={styles.options} role="radiogroup" aria-labelledby="main-heading">
            {mainOptions.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={chosen === a.id} className={styles.option} onClick={() => setMainChoice(a.id)}>
                <span className={styles.radio} aria-hidden="true" />
                <span className={styles.optionText}>
                  {a.title}
                  {a.state === 'later' && a.missionId && (
                    <span className={styles.optionMeta}>{data.missions.find((m) => m.id === a.missionId)?.title}</span>
                  )}
                </span>
              </button>
            ))}
            <div className={styles.option} data-new>
              <button
                type="button"
                role="radio"
                aria-checked={chosen === NEW}
                aria-label="Something new"
                className={styles.radioButton}
                onClick={() => setMainChoice(NEW)}
              >
                <span className={styles.radio} aria-hidden="true" />
              </button>
              <input
                className={styles.newInput}
                placeholder="Something new"
                aria-label="Tomorrow’s main action"
                value={newMain}
                onFocus={() => setMainChoice(NEW)}
                onChange={(e) => {
                  setNewMain(e.target.value);
                  setMainChoice(NEW);
                }}
                maxLength={140}
              />
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="energy-heading">
          <h2 id="energy-heading" className={styles.heading}>
            Energy today <span className={styles.optional}>(optional)</span>
          </h2>
          <div className={styles.energy} role="radiogroup" aria-labelledby="energy-heading">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={energy === n}
                aria-label={`${n} of 5`}
                className={`${styles.dot} ${energy !== undefined && n <= energy ? styles.dotOn : ''}`}
                onClick={() => setEnergy(energy === n ? undefined : n)}
              />
            ))}
          </div>
          <div className={styles.energyScale} aria-hidden="true">
            <span>Low</span>
            <span>High</span>
          </div>
        </section>

        <div className={styles.footer}>
          <button type="button" className={styles.primary} onClick={() => void finish()}>
            Close the day
          </button>
        </div>
      </div>
    </div>
  );
}
