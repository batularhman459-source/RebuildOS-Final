import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage } from '../components/Stage';
import { Star } from '../components/Star';
import { AREAS, areaById } from '../core/areas';
import { MINIMUM_SUGGESTIONS } from '../core/rebuild';
import type { AreaId } from '../core/types';
import { completeSetup, markSetupDone } from '../data/setup';
import styles from './Setup.module.css';

type Key = AreaId | 'own';
const ease = [0.2, 0.8, 0.2, 1] as const;

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

const OPTIONS: { key: Key; label: string }[] = [...AREAS.map((a) => ({ key: a.id as Key, label: a.label })), { key: 'own', label: 'Something else' }];

const grid: Variants = { show: { transition: { staggerChildren: 0.04, delayChildren: 0.12 } } };
const tile: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } };

/**
 * Setup is one question: what do you want to change? Pick one area, confirm the goal,
 * go. Each day then brings one thing for it (with a smaller version for okay days).
 * Everything else uses sensible defaults and can be changed later in Your plan.
 */
export function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [picked, setPicked] = useState<Key | null>(null);
  const [goal, setGoal] = useState('');
  const [saving, setSaving] = useState(false);
  const area = picked && picked !== 'own' ? areaById(picked) : undefined;

  function pick(k: Key) {
    if (picked) return;
    setPicked(k);
    setGoal(k === 'own' ? '' : (areaById(k)?.goals[0] ?? ''));
    window.setTimeout(() => {
      setStep(2);
      setPicked(k);
    }, 280);
  }

  async function skip() {
    await markSetupDone();
    navigate('/', { replace: true });
  }

  async function finish() {
    setSaving(true);
    await completeSetup({
      goals: [
        {
          title: goal,
          area: area?.id,
          tasks: (area?.ideas ?? []).map((i) => ({ title: i.title, smaller: i.smaller, minutes: i.minutes })),
          habits: area?.habits.slice(0, 1) ?? [],
        },
      ],
      minimum: { includeGoalStep: true, items: [...(area?.minimum.slice(0, 1) ?? []), ...MINIMUM_SUGGESTIONS].filter((v, i, a) => a.indexOf(v) === i).slice(0, 2) },
    });
    navigate('/', { replace: true });
  }

  return (
    <div className={styles.root}>
      <Stage glowTop="88%" aria-label="Setup">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="areas" className={styles.step} exit={{ opacity: 0, transition: { duration: 0.18 } }}>
              <motion.div className={styles.head} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
                <Star size={28} variant="gradient" />
                <h1 className={styles.title}>What do you want to change?</h1>
                <p className={styles.text}>Pick one. That’s all the setup there is.</p>
              </motion.div>
              <motion.div className={styles.areaGrid} role="group" aria-label="Life areas" initial="hidden" animate="show" variants={grid}>
                {OPTIONS.map(({ key, label }) => (
                  <motion.button
                    key={key}
                    type="button"
                    variants={tile}
                    className={`${styles.areaCard} ${picked === key ? styles.areaOn : ''}`}
                    aria-pressed={picked === key}
                    onClick={() => pick(key)}
                  >
                    <span className={styles.areaIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={ICONS[key]} />
                      </svg>
                    </span>
                    <span className={styles.areaLabel}>{label}</span>
                  </motion.button>
                ))}
              </motion.div>
              <button type="button" className={styles.skip} onClick={() => void skip()}>
                Skip for now
              </button>
            </motion.div>
          ) : (
            <motion.div key="goal" className={styles.step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <button
                type="button"
                className={styles.back}
                aria-label="Back"
                onClick={() => {
                  setPicked(null);
                  setStep(1);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <motion.div className={styles.head} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
                <p className={styles.kicker}>{area?.label ?? 'Your own goal'}</p>
                <h1 className={styles.title}>Your goal</h1>
              </motion.div>
              <motion.div className={styles.goalBox} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease }}>
                <label htmlFor="setup-goal" className="visually-hidden">
                  Your goal
                </label>
                <input
                  id="setup-goal"
                  className={styles.goalInput}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Pass my driving test"
                  maxLength={100}
                />
                {area && (
                  <div className={styles.chips} role="group" aria-label="Other goals">
                    {area.goals.map((g) => (
                      <button key={g} type="button" className={styles.chip} aria-pressed={goal === g} onClick={() => setGoal(g)}>
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
              {area?.ideas[0] && (
                <motion.div className={styles.preview} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16, ease }}>
                  <p className={styles.previewLabel}>Every day you get one thing for it, like</p>
                  <p className={styles.previewThing}>{area.ideas[0].title}</p>
                  <p className={styles.previewLabel}>On an okay day: {area.ideas[0].smaller}</p>
                </motion.div>
              )}
              {!area && <p className={styles.text}>You can add the first steps for it in Your plan, under Sky.</p>}
              <div className={styles.fill} />
              <button type="button" className={styles.primary} disabled={!goal.trim() || saving} onClick={() => void finish()}>
                Let’s go
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Stage>
    </div>
  );
}
