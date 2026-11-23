import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDay } from '../app/day';
import { useSheets } from '../app/sheets';
import { startupReady } from '../app/startup';
import { weekReviewDue } from '../core/week';
import { getFocusGoalId, getWeekReviews } from '../data/week';
import { ActionRow } from '../components/ActionRow';
import { Stage } from '../components/Stage';
import { Star } from '../components/Star';
import { dayKey } from '../core/day';
import { elapsedMs, formatEstimate, formatSpent } from '../core/focus';
import { APP_LOCALE } from '../core/locale';
import { todayView, type TodayView } from '../core/today';
import { keyOfAction, mainSuggestions, type MainSuggestion } from '../core/suggest';
import type { Action, DayRecord, Feeling } from '../core/types';
import { addAction, completeAction, reopenAction } from '../data/actions';
import { getDayRecord } from '../data/days';
import { activeDays } from '../core/progress';
import { toggleHabit } from '../data/habits';
import { acceptSuggestion, checkIn, markCounted, recordSmallWin, swapMain } from '../data/checkin';
import { doneThisWeek, isDoneOn, showsToday, weekStart } from '../core/habits';
import { Icon } from '../components/Icon';
import { reopenDay } from '../data/closeDay';
import { db } from '../data/db';
import { getActiveSession, startFocus } from '../data/focus';
import styles from './Today.module.css';

const shortDate = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });

/** Morning until noon, afternoon until 18:00, evening after; late night still counts as evening. */
function greeting(hour: number): string {
  if (hour >= 4 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}
const dayOf = (t: number) => dayKey(new Date(t));
const ease = [0.2, 0.8, 0.2, 1] as const;
/** Stage content: the block fades out quickly, then its lines rise in one after another. */
const enter = {
  initial: 'hidden',
  animate: 'show',
  exit: 'gone',
  variants: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.2, staggerChildren: 0.07 } },
    gone: { opacity: 0, transition: { duration: 0.16 } },
  },
} as const;
const line = {
  variants: {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
  },
} as const;
const FEELING_LABEL: Record<Feeling, string> = { good: 'Good day', okay: 'Okay day', rough: 'Rough day' };
/** Okay days without a written smaller version: just this long on the task. */
const OKAY_MINUTES = 15;

export function Today() {
  const day = useDay();
  const { openAdd } = useSheets();
  const actions = useLiveQuery(() => db.actions.toArray(), []);
  const missions = useLiveQuery(() => db.missions.toArray(), []);
  const weekInfo = useLiveQuery(async () => {
    const reviews = await getWeekReviews();
    return { due: weekReviewDue(day, new Set(reviews.map((r) => r.week))), focus: await getFocusGoalId(day) };
  }, [day]);
  const dayNumber = useLiveQuery(async () => {
    const [all, sessions, checks, days] = await Promise.all([db.actions.toArray(), db.focusSessions.toArray(), db.habitChecks.toArray(), db.days.toArray()]);
    const active = activeDays(all, sessions, dayOf, checks, days.filter((d) => d.smallWin).map((d) => d.day));
    return active.size + (active.has(day) ? 0 : 1);
  }, [day]);
  const navigate = useNavigate();
  const record = useLiveQuery(async () => (await getDayRecord(day)) ?? null, [day]);
  const small = record?.mode === 'small';
  const feeling = record?.feeling;
  const habitData = useLiveQuery(async () => {
    const [habits, checks] = await Promise.all([db.habits.toArray(), db.habitChecks.where('day').aboveOrEqual(weekStart(day)).toArray()]);
    return { habits, checks };
  }, [day]);

  const closed = record?.closedAt !== undefined;
  // Each day starts with the check-in; a closed day doesn't ask again.
  useEffect(() => {
    if (record === undefined || record?.feeling || closed) return;
    let cancelled = false;
    void startupReady.then(() => {
      if (!cancelled && window.location.pathname === '/') navigate('/checkin', { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [record, closed, navigate]);

  /** After the main thing (or its smaller version) is done: the day counts, once. */
  async function counted() {
    if (await markCounted(day)) navigate('/done');
  }

  const normalView = actions ? todayView(actions, day, dayOf) : undefined;
  const view = actions && normalView ? (small && record ? smallDayView(record, actions) : normalView) : undefined;
  // Once the day is closed, Today only shows what was done; tomorrow's Actions wait for tomorrow.
  const listOpen = view && !closed ? view.open : [];
  // Habits show on a normal, open day; a minimum day stays minimal.
  const todaysHabits =
    habitData && !small && !closed
      ? habitData.habits
          .filter((h) => showsToday(h, day, habitData.checks))
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((h) => {
            const done = isDoneOn(h.id, day, habitData.checks);
            const meta = h.schedule.kind === 'weekly' ? `${doneThisWeek(h.id, day, habitData.checks)} of ${h.schedule.times} this week` : undefined;
            return { habit: h, done, meta };
          })
      : [];
  // Tasks you added yourself and ticked today stay visible (struck through), so the tick lands.
  const doneExtras = view && !small ? view.doneToday.filter((a) => !a.missionId) : [];
  const tomorrowMain = closed ? actions?.find((a) => !a.deletedAt && a.state === 'today' && a.isMain && (a.todayDay ?? '') > day) : undefined;
  const missionOf = (a: Action) => (a.missionId ? missions?.find((m) => m.id === a.missionId && !m.deletedAt) : undefined);
  // Other things the main thing could be (for Swap, and when Today has no main thing).
  const mainKey = view?.main ? keyOfAction(view.main) : undefined;
  const suggestions =
    actions && missions ? mainSuggestions(actions, missions, day, Date.now(), mainKey ? [mainKey] : [], weekInfo?.focus) : [];
  const goalTitle = (id: string) => missions?.find((m) => m.id === id)?.title ?? '';

  return (
    <Stage height="100svh" aria-label="Up next" className={styles.full}>
      <div className={styles.stageHeader}>
        <span className={styles.greeting}>
          <Star size={18} variant="gradient" />
          <span>
            {dayNumber ? `Day ${dayNumber}` : greeting(new Date().getHours())}
            <span className={styles.headerDate}>{shortDate.format(new Date())}</span>
          </span>
        </span>
        {feeling && !closed && (
          <button type="button" className={styles.feelingPill} onClick={() => navigate('/checkin')} aria-label={`${FEELING_LABEL[feeling]}, change`}>
            {FEELING_LABEL[feeling]}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>
      <div className={styles.spacer} />
      {view && record !== undefined && (
        <AnimatePresence mode="wait" initial={false}>
          {closed ? (
            <DayClosed key="closed" tomorrow={tomorrowMain?.title} onReopen={() => void reopenDay(day)} />
          ) : small && record ? (
            <RoughDay key="rough" record={record} actions={actions ?? []} onAllDone={() => void counted()} />
          ) : feeling === 'okay' && record?.smallWin ? (
            <SmallWin key="small-win" title={record.smallWin.title} next={view.main} onMore={() => void checkIn(day, 'good')} />
          ) : view.main ? (
            <MainAction
              key={`${view.main.id}-${feeling}`}
              action={view.main}
              missionTitle={missionOf(view.main)?.title}
              okay={feeling === 'okay'}
              canSwap={suggestions.length > 0}
              onSwap={() => void swapMain(day)}
              onDone={async () => {
                if (feeling === 'okay') await recordSmallWin(day, view.main!.id, view.main!.smaller ?? view.main!.title);
                else await completeAction(view.main!.id);
                await counted();
              }}
            />
          ) : (
            <AskForAction
              key={view.doneToday.length > 0 ? 'again' : 'first'}
              again={view.doneToday.length > 0}
              suggestions={suggestions}
              goalTitle={goalTitle}
              onPick={(s) => void acceptSuggestion(day, s)}
            />
          )}
        </AnimatePresence>
      )}
      <div className={styles.spacerLarge} />

      <section className={styles.extras} aria-label="Also today">
        {weekInfo?.due && !small && (
          <button type="button" className={styles.weekCard} onClick={() => navigate('/week')}>
            <Star size={16} variant="gradient" />
            <span className={styles.weekTitle}>Your week, in 2 minutes</span>
            <Icon name="chevron" size={16} />
          </button>
        )}
        {todaysHabits.length > 0 && (
          <ul className={styles.habitChips} aria-label="Habits today">
            {todaysHabits.map(({ habit, done, meta }) => (
              <li key={habit.id}>
                <button
                  type="button"
                  className={`${styles.habitChip} ${done ? styles.habitDone : ''}`}
                  aria-pressed={done}
                  aria-label={`${done ? 'Untick' : 'Tick'} ${habit.title}${meta ? `, ${meta}` : ''}`}
                  onClick={() => void toggleHabit(habit.id, day)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={done ? 'M5 12.5l4.5 4.5L19 7.5' : 'M12 5v14M5 12h14'} />
                  </svg>
                  {habit.title}
                  {meta && <span className={styles.habitMeta}>{meta}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {view && !small && !closed && listOpen.length + doneExtras.length > 0 && (
          <ul className={styles.moreList}>
            {listOpen.map((a) => (
              <ActionRow key={a.id} action={a} goal={missionOf(a)?.title} meta={a.time ?? (a.estimateMinutes ? `${a.estimateMinutes} min` : undefined)} />
            ))}
            {doneExtras.map((a) => (
              <ActionRow key={a.id} action={a} />
            ))}
          </ul>
        )}
        {view && !closed && (
          <div className={styles.extraLinks}>
            {!small && (
              <button type="button" className={styles.extraLink} onClick={() => openAdd('today')} aria-label="Add a task">
                <Icon name="plus" size={15} />
                Add a task
              </button>
            )}
            {small && (
              <button type="button" className={styles.extraLink} onClick={() => navigate('/minimum')}>
                Edit my minimum
              </button>
            )}
          </div>
        )}
      </section>
    </Stage>
  );
}

interface MainActionProps {
  action: Action;
  missionTitle?: string;
  /** Okay day: show the smaller version (or a short time on the task). */
  okay: boolean;
  canSwap: boolean;
  onSwap: () => void;
  onDone: () => Promise<void>;
}

function MainAction({ action, missionTitle, okay, canSwap, onSwap, onDone }: MainActionProps) {
  const { openAction } = useSheets();
  const navigate = useNavigate();
  const active = useLiveQuery(() => getActiveSession(), []);
  const pausedHere = active && active.actionId === action.id ? active : undefined;
  const [busy, setBusy] = useState(false);
  const title = okay && action.smaller ? action.smaller : action.title;

  async function focus() {
    await startFocus(action.id, okay ? { smaller: true, targetMinutes: action.smaller ? undefined : OKAY_MINUTES } : {});
    navigate('/focus');
  }

  const support = pausedHere
    ? `${formatSpent(elapsedMs(pausedHere.segments, Date.now()))} so far`
    : okay
      ? action.smaller
        ? `Instead of “${action.title}”`
        : `Just ${OKAY_MINUTES} minutes of it`
      : [action.time ? `At ${action.time}` : undefined, action.estimateMinutes ? formatEstimate(action.estimateMinutes) : undefined]
          .filter(Boolean)
          .join(' · ');

  return (
    <motion.div className={styles.main} {...enter}>
      <motion.p className={styles.context} {...line}>
        {okay ? (action.smaller ? 'The smaller version' : 'A small start') : (missionTitle ?? 'Your main thing')}
        {okay && missionTitle ? ` · ${missionTitle}` : ''}
      </motion.p>
      <motion.button type="button" className={styles.mainTitle} onClick={() => openAction(action.id)} {...line}>
        <h1>{title}</h1>
      </motion.button>
      {support && (
        <motion.p className={styles.support} {...line}>
          {support}
        </motion.p>
      )}
      <motion.div className={styles.stageButtons} {...line}>
        <button
          type="button"
          className={styles.stagePrimary}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onDone();
            setBusy(false);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          Done
        </button>
        <div className={styles.stageRow}>
          <button type="button" className={styles.stageText} onClick={() => void focus()}>
            {pausedHere ? 'Resume focus' : 'Start focus'}
          </button>
          {canSwap && !pausedHere && (
            <button type="button" className={styles.stageText} onClick={onSwap}>
              Something else
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface AskProps {
  again: boolean;
  suggestions: MainSuggestion[];
  goalTitle: (id: string) => string;
  onPick: (s: MainSuggestion) => void;
}

function AskForAction({ again, suggestions, goalTitle, onPick }: AskProps) {
  const [title, setTitle] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await addAction({ title, destination: 'today' });
    setTitle('');
  }

  return (
    <motion.form className={styles.ask} onSubmit={submit} {...enter}>
      {again ? (
        <>
          <motion.h1 className={styles.moment} {...line}>
            That’s <i>done.</i>
          </motion.h1>
          <motion.p className={styles.support} {...line}>
            Want to pick one more thing?
          </motion.p>
        </>
      ) : (
        <motion.h1 className={styles.question} {...line}>
          What’s one thing you want to get done today?
        </motion.h1>
      )}
      <motion.div className={styles.askFields} {...line}>
        <label htmlFor="first-action" className="visually-hidden">
          Task
        </label>
        <input
          id="first-action"
          className={styles.stageInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={again ? 'e.g. Reply to emails' : 'e.g. Revise chapter 3'}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={140}
        />
        <button type="submit" className={styles.stagePrimary} disabled={!title.trim()}>
          Add to today
        </button>
      </motion.div>
      {suggestions.length > 0 && (
        <motion.div className={styles.suggestions} {...line}>
          <p className={styles.suggestLabel}>Or pick one for your goals</p>
          {suggestions.slice(0, 3).map((s) => (
            <button key={s.key} type="button" className={styles.suggestion} onClick={() => onPick(s)}>
              <span className={styles.suggestTitle}>{s.title}</span>
              <span className={styles.suggestMission}>
                {goalTitle(s.missionId)}
                {s.source === 'repeat' && s.times ? ` · done ${s.times}× lately` : ''}
              </span>
            </button>
          ))}
        </motion.div>
      )}
    </motion.form>
  );
}

/**
 * A small day shows only its slots: the first unfinished one on the stage
 * (step forward first), the rest below. No counts, no score.
 */
function smallDayView(record: DayRecord, actions: Action[]): TodayView {
  const byId = new Map(actions.map((a) => [a.id, a]));
  const slotActions = (record.rebuildSlots ?? [])
    .map((slot) => (slot.actionId ? byId.get(slot.actionId) : undefined))
    .filter((a): a is Action => a !== undefined && !a.deletedAt);
  const main = slotActions.find((a) => a.state !== 'done');
  return {
    main,
    open: slotActions.filter((a) => a !== main && a.state !== 'done'),
    doneToday: slotActions.filter((a) => a.state === 'done'),
  };
}

/** Rough day: the minimum, as a short list right on the stage. All ticked = the day counts. */
function RoughDay({ record, actions, onAllDone }: { record: DayRecord; actions: Action[]; onAllDone: () => void }) {
  const byId = new Map(actions.map((a) => [a.id, a]));
  const items = (record.rebuildSlots ?? [])
    .map((slot) => (slot.actionId ? byId.get(slot.actionId) : undefined))
    .filter((a): a is Action => a !== undefined && !a.deletedAt);
  const doneCount = items.filter((a) => a.state === 'done').length;
  const allDone = items.length > 0 && doneCount === items.length;
  const fired = useRef(allDone);

  useEffect(() => {
    if (allDone && !fired.current) {
      fired.current = true;
      const t = setTimeout(onAllDone, 650);
      return () => clearTimeout(t);
    }
    if (!allDone) fired.current = false;
  }, [allDone, onAllDone]);

  return (
    <motion.div className={styles.rough} {...enter}>
      <motion.h1 className={styles.roughTitle} {...line}>
        {allDone ? (
          <>
            That’s <i>enough.</i>
          </>
        ) : (
          <>
            Rough day.
            <br />
            That’s okay.
          </>
        )}
      </motion.h1>
      <motion.p className={styles.support} {...line}>
        {allDone ? 'Today counts. Rest if you can.' : 'Do these and today still counts.'}
      </motion.p>
      <motion.ul className={styles.roughList} {...line} aria-label="Your minimum">
        {items.map((a) => {
          const done = a.state === 'done';
          return (
            <li key={a.id}>
              <button
                type="button"
                className={`${styles.roughItem} ${done ? styles.roughDone : ''}`}
                onClick={() => void (done ? reopenAction(a.id) : completeAction(a.id))}
                aria-pressed={done}
                aria-label={`${a.title}${done ? ', done' : ''}`}
              >
                <span className={styles.roughCheck} aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
                <span className={styles.roughText}>{a.title}</span>
              </button>
            </li>
          );
        })}
      </motion.ul>
      <motion.p className={styles.roughCount} {...line}>
        {doneCount} of {items.length} done
      </motion.p>
    </motion.div>
  );
}

/** Okay day, smaller version done. The full task waits; doing more is an option, not a push. */
function SmallWin({ title, next, onMore }: { title: string; next?: Action; onMore: () => void }) {
  return (
    <motion.div className={styles.ask} {...enter}>
      <motion.h1 className={styles.moment} {...line}>
        Done. <i>Nice.</i>
      </motion.h1>
      <motion.p className={styles.support} {...line}>
        {title}
      </motion.p>
      {next && (
        <motion.div className={styles.stageButtons} {...line}>
          <button type="button" className={styles.stageText} onClick={onMore}>
            Feeling good? Do the full thing
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

function DayClosed({ tomorrow, onReopen }: { tomorrow?: string; onReopen: () => void }) {
  return (
    <motion.div className={styles.ask} {...enter}>
      <motion.h1 className={styles.moment} {...line}>
        Done for <i>today.</i>
      </motion.h1>
      <motion.p className={styles.support} {...line}>
        {tomorrow ? `Tomorrow: ${tomorrow}` : 'Rest well.'}
      </motion.p>
      <motion.div className={styles.stageButtons} {...line}>
        <button type="button" className={styles.stageText} onClick={onReopen}>
          Open today again
        </button>
      </motion.div>
    </motion.div>
  );
}
