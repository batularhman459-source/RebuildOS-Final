import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage } from '../components/Stage';
import { Star } from '../components/Star';
import { parseAmount, withUnit } from '../core/goals';
import { scheduleLabel } from '../core/habits';
import { DEFAULT_MINIMUM, MINIMUM_SUGGESTIONS, type MinimumDay } from '../core/rebuild';
import { GOAL_TEMPLATES, type GoalTemplate } from '../core/templates';
import type { HabitSchedule } from '../core/types';
import { completeSetup, markSetupDone } from '../data/setup';
import styles from './Setup.module.css';

type Step = 0 | 1 | 2 | 3 | 4;

interface HabitPick {
  title: string;
  schedule: HabitSchedule;
  on: boolean;
}

/**
 * First-time setup: a goal, its first steps, a habit or two and My minimum day,
 * in about a minute — so nobody starts in front of an empty app. Everything can
 * be changed later; it can also be skipped.
 */
export function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [template, setTemplate] = useState<GoalTemplate | null>(null);
  const [goal, setGoal] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [steps, setSteps] = useState<{ title: string; on: boolean }[]>([]);
  const [newStep, setNewStep] = useState('');
  const [habits, setHabits] = useState<HabitPick[]>([]);
  const [newHabit, setNewHabit] = useState('');
  const [minimum, setMinimum] = useState<MinimumDay>({ ...DEFAULT_MINIMUM, items: [...DEFAULT_MINIMUM.items] });
  const [saving, setSaving] = useState(false);

  function pick(t: GoalTemplate) {
    setTemplate(t);
    setGoal(t.goal);
    setTarget(t.measure ? String(t.measure.target) : '');
    setUnit(t.measure?.unit ?? '');
    setSteps(t.steps.map((title, i) => ({ title, on: i < 3 })));
    setHabits(t.habits.map((h) => ({ ...h, on: true })));
  }

  async function skip() {
    await markSetupDone();
    navigate('/', { replace: true });
  }

  async function finish() {
    setSaving(true);
    const t = parseAmount(target);
    await completeSetup({
      goal,
      doneWhen: template?.doneWhen,
      measure: t !== undefined && t > 0 && unit.trim() ? { target: t, unit } : undefined,
      steps: steps.filter((s) => s.on).map((s) => s.title),
      habits: habits.filter((h) => h.on).map(({ title, schedule }) => ({ title, schedule })),
      minimum,
    });
    navigate('/', { replace: true });
  }

  const chosenSteps = steps.filter((s) => s.on && s.title.trim());
  const canNext = step === 1 ? goal.trim().length > 0 : step === 2 ? chosenSteps.length > 0 : true;

  const headings: Record<Exclude<Step, 0>, { title: string; text: string }> = {
    1: { title: 'What’s one goal you’re working on?', text: 'Pick one to start from, or write your own.' },
    2: { title: 'Your first steps', text: 'Small and concrete. The first one goes on Today.' },
    3: { title: 'Habits to keep', text: 'Things you want to keep doing. They show up on Today.' },
    4: { title: 'On a bad day…', text: 'Your minimum: what you’ll still do. One tap starts it.' },
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
            <p className={styles.introText}>One goal, its first steps, a habit or two. About a minute — you can change everything later.</p>
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
          <ol className={styles.dots} aria-label={`Step ${step} of 4`}>
            {[1, 2, 3, 4].map((n) => (
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
          transition={{ duration: 0.2 }}
        >
          {step === 1 && (
            <>
              <div className={styles.chips} role="group" aria-label="Goal ideas">
                {GOAL_TEMPLATES.map((t) => (
                  <button key={t.id} type="button" className={styles.chip} aria-pressed={template?.id === t.id} onClick={() => pick(t)}>
                    {t.label}
                  </button>
                ))}
              </div>
              <label htmlFor="setup-goal" className={styles.label}>
                Your goal
              </label>
              <input
                id="setup-goal"
                className={styles.input}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Pass my driving test"
                maxLength={100}
              />
              {(template?.measure || target) && (
                <div className={styles.measure}>
                  <label htmlFor="setup-target" className={styles.label}>
                    Measured in
                  </label>
                  <div className={styles.measureRow}>
                    <input id="setup-target" className={styles.input} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Target" />
                    <input className={styles.input} value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unit" maxLength={12} />
                  </div>
                  {parseAmount(target) !== undefined && unit && <p className={styles.hint}>A progress bar will track 0 → {withUnit(parseAmount(target)!, unit)}.</p>}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <ul className={styles.picks}>
                {steps.map((s, i) => (
                  <li key={i}>
                    <label className={styles.pick}>
                      <input
                        type="checkbox"
                        checked={s.on}
                        onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))}
                      />
                      <span>{s.title}</span>
                      {i === steps.findIndex((x) => x.on) && <span className={styles.badge}>Today</span>}
                    </label>
                  </li>
                ))}
              </ul>
              <form
                className={styles.addRow}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newStep.trim()) return;
                  setSteps([...steps, { title: newStep.trim(), on: true }]);
                  setNewStep('');
                }}
              >
                <input className={styles.input} value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="+ Add a step" aria-label="Add a step" maxLength={140} />
                {newStep.trim() && (
                  <button type="submit" className={styles.addButton}>
                    Add
                  </button>
                )}
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <ul className={styles.picks}>
                {habits.map((hb, i) => (
                  <li key={i}>
                    <label className={styles.pick}>
                      <input type="checkbox" checked={hb.on} onChange={(e) => setHabits(habits.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
                      <span>{hb.title}</span>
                      <span className={styles.meta}>{scheduleLabel(hb.schedule)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <form
                className={styles.addRow}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newHabit.trim()) return;
                  setHabits([...habits, { title: newHabit.trim(), schedule: { kind: 'daily' }, on: true }]);
                  setNewHabit('');
                }}
              >
                <input className={styles.input} value={newHabit} onChange={(e) => setNewHabit(e.target.value)} placeholder="+ Add a habit (every day)" aria-label="Add a habit" maxLength={80} />
                {newHabit.trim() && (
                  <button type="submit" className={styles.addButton}>
                    Add
                  </button>
                )}
              </form>
              {habits.length === 0 && <p className={styles.hint}>No habits is fine too. You can add them any time in Plan.</p>}
            </>
          )}

          {step === 4 && (
            <>
              <ul className={styles.picks}>
                <li>
                  <label className={styles.pick}>
                    <input type="checkbox" checked={minimum.includeGoalStep} onChange={(e) => setMinimum({ ...minimum, includeGoalStep: e.target.checked })} />
                    <span>One step on my main goal</span>
                  </label>
                </li>
                {MINIMUM_SUGGESTIONS.slice(0, 4).map((item) => (
                  <li key={item}>
                    <label className={styles.pick}>
                      <input
                        type="checkbox"
                        checked={minimum.items.includes(item)}
                        onChange={(e) =>
                          setMinimum({ ...minimum, items: e.target.checked ? [...minimum.items, item] : minimum.items.filter((x) => x !== item) })
                        }
                      />
                      <span>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className={styles.hint}>You can change this any time in Plan → My minimum day.</p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className={styles.footer}>
        {step < 4 ? (
          <button type="button" className={styles.primary} disabled={!canNext} onClick={() => setStep((step + 1) as Step)}>
            Next
          </button>
        ) : (
          <button type="button" className={styles.primary} disabled={saving} onClick={() => void finish()}>
            Done — show me Today
          </button>
        )}
      </div>
    </div>
  );
}
