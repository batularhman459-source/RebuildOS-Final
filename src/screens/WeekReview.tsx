import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDay } from '../app/day';
import { Stage } from '../components/Stage';
import { Star } from '../components/Star';
import { addDays, dayKey } from '../core/day';
import { formatDuration } from '../core/focus';
import { APP_LOCALE } from '../core/locale';
import { activeMissions, nextAction } from '../core/missions';
import { BLOCKERS, commonBlockers, reviewWeek, summariseWeek } from '../core/week';
import { db } from '../data/db';
import { setMissionStatus } from '../data/missions';
import { getFocusGoalId, getWeekReviews, saveWeekReview } from '../data/week';
import styles from './WeekReview.module.css';

type Step = 1 | 2 | 3;
const NOTHING = 'Nothing, good week';
const dayOf = (t: number) => dayKey(new Date(t));
const narrow = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'narrow' });
const short = new Intl.DateTimeFormat(APP_LOCALE, { day: 'numeric', month: 'short' });
const weekdayLong = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'long' });

/** A small, practical idea for each blocker, shown when it's picked. */
const TIPS: Record<string, string> = {
  Tired: 'On tired days, answer “Okay”: the smaller version still counts.',
  Busy: 'Give your tasks a smaller version, so a busy day can still be a day.',
  'My phone': 'Start Focus: it keeps the screen on one thing.',
  'Low mood': 'Rough days with just your minimum still count. That’s the point.',
  'Planned too much': 'One main thing a day is enough. Let the app pick it.',
  'Got sick': 'Rest. Your plan will be right here when you’re back.',
  'Unclear what to do': 'Write the very next step for each goal in Your plan.',
};

/**
 * The weekly check-in: look back at the week (no judgement, real numbers), name what got
 * in the way, choose the goal that comes first next week. About two minutes.
 */
export function WeekReview() {
  const today = useDay();
  const navigate = useNavigate();
  const week = reviewWeek(today);
  const [step, setStep] = useState<Step>(1);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [focus, setFocus] = useState<string | undefined>();
  const [paused, setPaused] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const data = useLiveQuery(async () => {
    const [actions, sessions, checks, days, missions, habits, reviews, currentFocus] = await Promise.all([
      db.actions.toArray(),
      db.focusSessions.toArray(),
      db.habitChecks.toArray(),
      db.days.toArray(),
      db.missions.toArray(),
      db.habits.toArray(),
      getWeekReviews(),
      getFocusGoalId(today),
    ]);
    return {
      summary: summariseWeek(week, today, dayOf, { actions, sessions, checks, days, missions, habits }),
      goals: activeMissions(missions).map((m) => ({ m, next: nextAction(m.id, actions)?.title })),
      lately: commonBlockers(reviews.filter((r) => r.week !== week)),
      currentFocus,
    };
  }, [week, today]);

  if (!data) return <div className={styles.root} />;
  const { summary, goals } = data;
  const chosenFocus = focus ?? data.currentFocus ?? goals[0]?.m.id;

  function toggleBlocker(b: string) {
    if (b === NOTHING) return setBlockers(blockers.includes(NOTHING) ? [] : [NOTHING]);
    const without = blockers.filter((x) => x !== NOTHING);
    setBlockers(without.includes(b) ? without.filter((x) => x !== b) : [...without, b]);
  }

  async function save() {
    setSaving(true);
    for (const id of paused) await setMissionStatus(id, 'parked');
    const focusGoalId = chosenFocus && !paused.includes(chosenFocus) ? chosenFocus : goals.find((g) => !paused.includes(g.m.id))?.m.id;
    await saveWeekReview({ week, blockers: blockers.filter((b) => b !== NOTHING), note: note.trim() || undefined, focusGoalId, at: Date.now() });
    navigate('/', { replace: true });
  }

  const range = `${short.format(new Date(`${week}T12:00:00`))} – ${short.format(new Date(`${addDays(week, 6)}T12:00:00`))}`;
  const feelingLine = (['good', 'okay', 'rough'] as const)
    .filter((f) => summary.feelings[f] > 0)
    .map((f) => `${summary.feelings[f]} ${f}`)
    .join(' · ');
  const headings: Record<Step, { title: string; text: string }> = {
    1: { title: 'Your week', text: range },
    2: { title: 'What got in the way?', text: 'Tap any that fit. No judgement.' },
    3: { title: 'Next week', text: 'Which goal comes first? Its tasks get suggested first.' },
  };
  const h = headings[step];

  return (
    <div className={styles.root}>
      <Stage height="230px" glowTop="85%" aria-label="Weekly check-in">
        <div className={styles.topRow}>
          <button
            type="button"
            className={styles.round}
            aria-label={step === 1 ? 'Close' : 'Back'}
            onClick={() => (step === 1 ? navigate(-1) : setStep((step - 1) as Step))}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={step === 1 ? 'M6 6l12 12M18 6L6 18' : 'M15 5l-7 7 7 7'} />
            </svg>
          </button>
          <ol className={styles.dots} aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((n) => (
              <li key={n} className={n <= step ? styles.dotOn : ''} aria-hidden="true" />
            ))}
          </ol>
          <span className={styles.round} aria-hidden="true" />
        </div>
        <div style={{ flex: 1 }} />
        <h1 className={styles.question}>{h.title}</h1>
        <p className={styles.questionText}>{h.text}</p>
      </Stage>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className={styles.body}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {step === 1 && (
            <>
              <section className={styles.card} aria-label="Days">
                <ol className={styles.week}>
                  {summary.days.map(({ day, active }, i) => (
                    <motion.li
                      key={day}
                      className={styles.day}
                      aria-label={`${weekdayLong.format(new Date(`${day}T12:00:00`))}: ${active ? 'active' : 'not active'}`}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 + i * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
                    >
                      <Star size={22} variant={active ? 'solid' : 'empty'} />
                      <span aria-hidden="true">{narrow.format(new Date(`${day}T12:00:00`))}</span>
                    </motion.li>
                  ))}
                </ol>
                <p className={styles.lead}>
                  Active on {summary.activeCount} of {summary.days.length} days
                </p>
                {feelingLine && <p className={styles.muted}>Days: {feelingLine}</p>}
                <dl className={styles.stats}>
                  <div>
                    <dt>focused</dt>
                    <dd>{summary.focusMs >= 60_000 ? formatDuration(summary.focusMs) : '0 min'}</dd>
                  </div>
                  <div>
                    <dt>tasks done</dt>
                    <dd>{summary.tasksDone}</dd>
                  </div>
                </dl>
              </section>

              <section className={styles.card} aria-labelledby="wins-h">
                <h2 id="wins-h" className={styles.cardTitle}>
                  Done this week
                </h2>
                {summary.wins.length > 0 ? (
                  <ul className={styles.rows}>
                    {summary.wins.map((w, i) => (
                      <li key={i}>
                        <Star size={12} />
                        {w}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.muted}>Nothing ticked off this week. That happens. Next week starts fresh.</p>
                )}
              </section>

              {(summary.goals.length > 0 || summary.habits.length > 0) && (
                <section className={styles.card} aria-labelledby="goals-h">
                  <h2 id="goals-h" className={styles.cardTitle}>
                    Goals and habits
                  </h2>
                  <ul className={styles.rows}>
                    {summary.goals.map((g) => (
                      <li key={g.id} className={styles.split}>
                        <span>{g.title}</span>
                        <span className={styles.meta}>
                          {g.steps} {g.steps === 1 ? 'step' : 'steps'}
                          {g.focusMs >= 60_000 ? ` · ${formatDuration(g.focusMs)}` : ''}
                        </span>
                      </li>
                    ))}
                    {summary.habits.map((hb) => (
                      <li key={hb.id} className={styles.split}>
                        <span>{hb.title}</span>
                        <span className={styles.meta}>
                          {Math.min(hb.done, hb.target)} of {hb.target}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className={styles.chips} role="group" aria-label="What got in the way">
                {[...BLOCKERS, NOTHING].map((b) => (
                  <button key={b} type="button" className={styles.chip} aria-pressed={blockers.includes(b)} onClick={() => toggleBlocker(b)}>
                    {b}
                  </button>
                ))}
              </div>
              {data.lately.length > 0 && (
                <p className={styles.muted}>
                  Lately, <strong>{data.lately.join(' and ').toLowerCase()}</strong> keep coming up.
                </p>
              )}
              <AnimatePresence initial={false}>
                {blockers
                  .filter((b) => TIPS[b])
                  .map((b) => (
                    <motion.p
                      key={b}
                      className={styles.tip}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                      {TIPS[b]}
                    </motion.p>
                  ))}
              </AnimatePresence>
              <label htmlFor="week-note" className={styles.label}>
                One thing to remember (optional)
              </label>
              <input
                id="week-note"
                className={styles.input}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Mornings work better for me"
                maxLength={140}
              />
            </>
          )}

          {step === 3 &&
            (goals.length === 0 ? (
              <p className={styles.muted}>No goals yet. You can add one in Your plan, under Progress.</p>
            ) : (
              <ul className={styles.goalList} role="radiogroup" aria-label="Goal that comes first">
                {goals.map(({ m, next }) => {
                  const isPaused = paused.includes(m.id);
                  const on = chosenFocus === m.id && !isPaused;
                  return (
                    <li key={m.id} className={`${styles.goalRow} ${isPaused ? styles.goalPaused : ''}`}>
                      <button type="button" role="radio" aria-checked={on} className={styles.goalPick} disabled={isPaused} onClick={() => setFocus(m.id)}>
                        <span className={`${styles.radio} ${on ? styles.radioOn : ''}`} aria-hidden="true" />
                        <span className={styles.goalText}>
                          <span>{m.title}</span>
                          <span className={styles.meta}>{isPaused ? 'Paused next week' : next ? `Next: ${next}` : 'Needs a next step'}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={styles.pause}
                        aria-pressed={isPaused}
                        aria-label={`${isPaused ? 'Keep' : 'Pause'} ${m.title}`}
                        onClick={() => setPaused(isPaused ? paused.filter((x) => x !== m.id) : [...paused, m.id])}
                      >
                        {isPaused ? 'Keep' : 'Pause'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ))}
        </motion.div>
      </AnimatePresence>

      <div className={styles.footer}>
        {step < 3 ? (
          <button type="button" className={styles.primary} onClick={() => setStep((step + 1) as Step)}>
            Next
          </button>
        ) : (
          <button type="button" className={styles.primary} disabled={saving} onClick={() => void save()}>
            Save my week
          </button>
        )}
      </div>
    </div>
  );
}
