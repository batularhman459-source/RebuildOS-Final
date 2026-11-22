import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage } from '../components/Stage';
import { Star } from '../components/Star';
import { AREAS, areaById, type Area } from '../core/areas';
import { scheduleLabel } from '../core/habits';
import { MAX_MINIMUM_ITEMS, MINIMUM_SUGGESTIONS, type MinimumDay } from '../core/rebuild';
import type { AreaId, HabitSchedule } from '../core/types';
import { completeSetup, markSetupDone } from '../data/setup';
import styles from './Setup.module.css';

type Step = 0 | 1 | 2 | 3;
type Key = AreaId | 'own';

/** Up to three areas: focus wins. */
const MAX_AREAS = 3;
/** Ideas ticked by default per area; the rest are one tap away. */
const IDEAS_ON = 2;

interface Plan {
  goal: string;
  tasks: { title: string; smaller?: string; minutes?: number; on: boolean }[];
  habits: { title: string; schedule: HabitSchedule; on: boolean }[];
  newTask: string;
}

const ICONS: Record<Key, string> = {
  fitness: 'M6 7v10 M18 7v10 M3 10v4 M21 10v4 M6 12h12',
  study: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z M4 5.5v16',
  money: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5 M12 6.5v1.5 M12 16v1.5',
  project: 'M5 19l3-1 8-8a2.8 2.8 0 0 0-4-4l-8 8-1 3z M14 6l4 4',
  skill: 'M9 18V6l10-2v12 M9 18a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0z M19 16a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0z',
  mind: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14z M5 19l7-7',
  sleep: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  social: 'M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7z M2.5 20a6.5 6.5 0 0 1 13 0 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14a6 6 0 0 1 3.5 6',
  own: 'M12 5v14 M5 12h14',
};

function planFor(area: Area | undefined): Plan {
  return {
    goal: area?.goals[0] ?? '',
    tasks: (area?.ideas ?? []).map((i, n) => ({ ...i, on: n < IDEAS_ON })),
    habits: (area?.habits ?? []).map((h, n) => ({ ...h, on: n === 0 })),
    newTask: '',
  };
}

function AreaIcon({ k }: { k: Key }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[k]} />
    </svg>
  );
}

const grid: Variants = { show: { transition: { staggerChildren: 0.04 } } };
const tile: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] } } };

/**
 * First-time setup in about 30 seconds: pick what you want to change, keep the
 * suggestions you like (goal, things to do with smaller versions, a habit), set a
 * rough-day minimum. Everything can be changed later; it can also be skipped.
 */
export function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [picked, setPicked] = useState<Key[]>([]);
  const [plans, setPlans] = useState<Partial<Record<Key, Plan>>>({});
  const [minimum, setMinimum] = useState<MinimumDay | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleArea(k: Key) {
    if (picked.includes(k)) {
      setPicked(picked.filter((x) => x !== k));
      return;
    }
    if (picked.length >= MAX_AREAS) return;
    setPicked([...picked, k]);
    if (!plans[k]) setPlans({ ...plans, [k]: planFor(k === 'own' ? undefined : areaById(k)) });
  }

  function update(k: Key, change: Partial<Plan>) {
    setPlans((p) => ({ ...p, [k]: { ...p[k]!, ...change } }));
  }

  /** Rough-day ideas from the chosen areas first, then general ones. */
  const minimumOptions = [
    ...new Set([...picked.flatMap((k) => (k === 'own' ? [] : (areaById(k)?.minimum ?? []))), ...MINIMUM_SUGGESTIONS]),
  ].slice(0, 7);

  function toMinimum() {
    if (!minimum) {
      const fromAreas = picked.flatMap((k) => (k === 'own' ? [] : (areaById(k)?.minimum.slice(0, 1) ?? [])));
      const items = (fromAreas.length ? fromAreas : minimumOptions.slice(0, 2)).slice(0, MAX_MINIMUM_ITEMS - 1);
      setMinimum({ includeGoalStep: true, items });
    }
    setStep(3);
  }

  async function skip() {
    await markSetupDone();
    navigate('/', { replace: true });
  }

  async function finish() {
    setSaving(true);
    await completeSetup({
      goals: picked.map((k) => {
        const p = plans[k]!;
        return {
          title: p.goal,
          area: k === 'own' ? undefined : k,
          tasks: p.tasks.filter((t) => t.on).map(({ title, smaller, minutes }) => ({ title, smaller, minutes })),
          habits: p.habits.filter((h) => h.on).map(({ title, schedule }) => ({ title, schedule })),
        };
      }),
      minimum: minimum ?? { includeGoalStep: true, items: [] },
    });
    navigate('/', { replace: true });
  }

  const goalsOk = picked.length > 0 && picked.every((k) => (plans[k]?.goal.trim().length ?? 0) > 0);

  const headings: Record<Exclude<Step, 0>, { title: string; text: string }> = {
    1: { title: 'What do you want to change?', text: `Pick up to ${MAX_AREAS}. We’ll suggest the rest.` },
    2: { title: 'Your plan', text: 'Keep what fits, change the rest. Each task has a smaller version for okay days.' },
    3: { title: 'On a rough day…', text: 'Your minimum: tiny things that still count.' },
  };

  if (step === 0) {
    return (
      <div className={styles.root}>
        <Stage glowTop="40%" aria-label="Welcome to RebuildOS">
          <div style={{ flex: 1 }} />
          <motion.div className={styles.intro} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Star size={84} variant="gradient" />
            <h1 className={styles.introTitle}>
              Let’s set you <i>up.</i>
            </h1>
            <p className={styles.introText}>Pick what you want to change and keep the suggestions you like. About 30 seconds.</p>
          </motion.div>
          <div style={{ flex: 1.2 }} />
          <div className={styles.introButtons}>
            <button type="button" className={styles.primaryOnStage} onClick={() => setStep(1)}>
              Start
            </button>
            <button type="button" className={styles.textOnStage} onClick={() => void skip()}>
              Skip for now
            </button>
          </div>
        </Stage>
      </div>
    );
  }

  const h = headings[step];
  return (
    <div className={styles.root}>
      <Stage height="230px" glowTop="85%" aria-label="Setup">
        <div className={styles.topRow}>
          <button type="button" className={styles.back} aria-label="Back" onClick={() => setStep((step - 1) as Step)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <ol className={styles.dots} aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((n) => (
              <li key={n} className={n <= step ? styles.dotOn : ''} aria-hidden="true" />
            ))}
          </ol>
          <button type="button" className={styles.skipTop} onClick={() => void skip()}>
            Skip
          </button>
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
              <motion.div className={styles.areaGrid} role="group" aria-label="Life areas" initial="hidden" animate="show" variants={grid}>
                {[...AREAS.map((a) => ({ k: a.id as Key, label: a.label, hint: a.hint })), { k: 'own' as Key, label: 'Something else', hint: 'Write your own goal' }].map(
                  ({ k, label, hint }) => {
                    const on = picked.includes(k);
                    const full = !on && picked.length >= MAX_AREAS;
                    return (
                      <motion.button
                        key={k}
                        type="button"
                        variants={tile}
                        className={`${styles.areaCard} ${on ? styles.areaOn : ''}`}
                        aria-pressed={on}
                        aria-disabled={full}
                        onClick={() => toggleArea(k)}
                      >
                        <span className={styles.areaIcon}>
                          <AreaIcon k={k} />
                        </span>
                        <span className={styles.areaLabel}>{label}</span>
                        <span className={styles.areaHint}>{hint}</span>
                      </motion.button>
                    );
                  },
                )}
              </motion.div>
              {picked.length >= MAX_AREAS && <p className={styles.hint}>That’s {MAX_AREAS}. Fewer goals, more done.</p>}
            </>
          )}

          {step === 2 &&
            picked.map((k, idx) => {
              const area = k === 'own' ? undefined : areaById(k);
              const p = plans[k]!;
              const goalId = `setup-goal-${k}`;
              return (
                <motion.section
                  key={k}
                  className={styles.planCard}
                  aria-labelledby={`${goalId}-h`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: idx * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <h2 id={`${goalId}-h`} className={styles.planArea}>
                    <span className={styles.planIcon}>
                      <AreaIcon k={k} />
                    </span>
                    {area?.label ?? 'Your own goal'}
                  </h2>

                  <label htmlFor={goalId} className={styles.label}>
                    Goal
                  </label>
                  <input
                    id={goalId}
                    className={styles.input}
                    value={p.goal}
                    onChange={(e) => update(k, { goal: e.target.value })}
                    placeholder="e.g. Pass my driving test"
                    maxLength={100}
                  />
                  {area && area.goals.length > 1 && (
                    <div className={styles.chips} role="group" aria-label={`Other ${area.label} goals`}>
                      {area.goals.map((g) => (
                        <button key={g} type="button" className={styles.chipSmall} aria-pressed={p.goal === g} onClick={() => update(k, { goal: g })}>
                          {g}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className={styles.label}>Things to do</p>
                  {p.tasks.length > 0 && (
                    <ul className={styles.picks}>
                      {p.tasks.map((t, i) => (
                        <li key={i}>
                          <label className={styles.pick}>
                            <input
                              type="checkbox"
                              checked={t.on}
                              onChange={(e) => update(k, { tasks: p.tasks.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)) })}
                            />
                            <span className={styles.pickText}>
                              <span>{t.title}</span>
                              {t.smaller && <span className={styles.smaller}>Okay day: {t.smaller}</span>}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    className={styles.addRow}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!p.newTask.trim()) return;
                      update(k, { tasks: [...p.tasks, { title: p.newTask.trim(), on: true }], newTask: '' });
                    }}
                  >
                    <input
                      className={styles.input}
                      value={p.newTask}
                      onChange={(e) => update(k, { newTask: e.target.value })}
                      placeholder="+ Add your own"
                      aria-label={`Add a task for ${area?.label ?? 'your goal'}`}
                      maxLength={140}
                    />
                    {p.newTask.trim() && (
                      <button type="submit" className={styles.addButton}>
                        Add
                      </button>
                    )}
                  </form>

                  {p.habits.length > 0 && (
                    <>
                      <p className={styles.label}>Habit</p>
                      <ul className={styles.picks}>
                        {p.habits.map((hb, i) => (
                          <li key={i}>
                            <label className={styles.pick}>
                              <input
                                type="checkbox"
                                checked={hb.on}
                                onChange={(e) => update(k, { habits: p.habits.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)) })}
                              />
                              <span>{hb.title}</span>
                              <span className={styles.meta}>{scheduleLabel(hb.schedule)}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </motion.section>
              );
            })}

          {step === 3 && minimum && (
            <>
              <ul className={styles.picks}>
                <li>
                  <label className={styles.pick}>
                    <input type="checkbox" checked={minimum.includeGoalStep} onChange={(e) => setMinimum({ ...minimum, includeGoalStep: e.target.checked })} />
                    <span className={styles.pickText}>
                      <span>One small step on a goal</span>
                      <span className={styles.smaller}>Uses the smaller version</span>
                    </span>
                  </label>
                </li>
                {minimumOptions.map((item) => {
                  const on = minimum.items.includes(item);
                  const full = !on && minimum.items.length >= MAX_MINIMUM_ITEMS;
                  return (
                    <li key={item}>
                      <label className={styles.pick}>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={full}
                          onChange={(e) =>
                            setMinimum({ ...minimum, items: e.target.checked ? [...minimum.items, item] : minimum.items.filter((x) => x !== item) })
                          }
                        />
                        <span>{item}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className={styles.hint}>Three things is plenty. You can change this any time.</p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className={styles.footer}>
        {step === 1 && (
          <button type="button" className={styles.primary} disabled={picked.length === 0} onClick={() => setStep(2)}>
            Next
          </button>
        )}
        {step === 2 && (
          <button type="button" className={styles.primary} disabled={!goalsOk} onClick={toMinimum}>
            Next
          </button>
        )}
        {step === 3 && (
          <button type="button" className={styles.primary} disabled={saving} onClick={() => void finish()}>
            Done — let’s go
          </button>
        )}
      </div>
    </div>
  );
}
