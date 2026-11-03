import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useSheets } from '../app/sheets';
import { ActionRow } from '../components/ActionRow';
import { Star } from '../components/Star';
import { dayKey } from '../core/day';
import { formatDuration } from '../core/focus';
import { formatShortDay } from '../core/locale';
import { activeMissions, missionStats, nextAction } from '../core/missions';
import { laterList } from '../core/today';
import { dayLabel, upcoming } from '../core/schedule';
import { APP_LOCALE } from '../core/locale';
import { useDay } from '../app/day';
import { scheduleLabel } from '../core/habits';
import { goalProgress } from '../core/goals';
import { GoalProgressBar } from '../components/GoalProgressBar';
import { getMinimum } from '../data/minimum';
import type { Action, FocusSession, Mission } from '../core/types';
import { moveToToday } from '../data/actions';
import { db } from '../data/db';
import styles from './Screen.module.css';
import own from './Plan.module.css';

export function Plan() {
  const today = useDay();
  const { openAdd, openNewMission, openNewHabit, openHabit } = useSheets();
  const minimum = useLiveQuery(() => getMinimum(), []);
  const data = useLiveQuery(async () => {
    const [missions, actions, sessions, allHabits] = await Promise.all([
      db.missions.toArray(),
      db.actions.toArray(),
      db.focusSessions.toArray(),
      db.habits.toArray(),
    ]);
    return { missions, actions, sessions, allHabits };
  }, []);

  if (!data) return <div className={styles.screen} />;
  const active = activeMissions(data.missions);
  // Later shows loose Actions, plus leftovers from Missions that are complete or gone.
  // Steps of active and parked Missions live on the Mission's page.
  const missionById = new Map(data.missions.map((m) => [m.id, m]));
  const soon = upcoming(data.actions, today);
  const habits = data.allHabits.filter((h) => !h.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  const minimumSummary = minimum
    ? [minimum.includeGoalStep ? 'One goal step' : undefined, ...minimum.items].filter(Boolean).join(' · ')
    : '';
  const later = laterList(data.actions).filter((a) => {
    const m = a.missionId ? missionById.get(a.missionId) : undefined;
    return !m || m.deletedAt !== undefined || m.status === 'complete';
  });
  const others = data.missions
    .filter((m) => !m.deletedAt && m.status !== 'active')
    .sort((a, b) => (b.completedAt ?? b.updatedAt) - (a.completedAt ?? a.updatedAt));

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Plan</h1>
        {active.length > 0 && (
          <span className={styles.meta}>
            {active.length} {active.length === 1 ? 'goal' : 'goals'}
          </span>
        )}
      </header>

      {active.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No goals yet</h2>
          <p className={styles.emptyText}>
            A goal is something bigger you’re working towards, like passing an exam or getting fit. Each one always shows its next step.
          </p>
          <button type="button" className={own.newMission} onClick={openNewMission}>
            New goal
          </button>
        </div>
      ) : (
        <section aria-label="Goals">
          {active.map((m) => (
            <MissionSection key={m.id} mission={m} actions={data.actions} sessions={data.sessions} />
          ))}
          <button type="button" className={own.addRow} onClick={openNewMission}>
            <PlusIcon />
            New goal
          </button>
        </section>
      )}

      <section className={own.section} aria-labelledby="habits-heading">
        <h2 id="habits-heading" className={own.heading}>
          Habits
        </h2>
        {habits.length > 0 ? (
          <ul className={own.list}>
            {habits.map((h) => (
              <li key={h.id} className={own.otherRow}>
                <button type="button" className={own.otherLink} onClick={() => openHabit(h.id)}>
                  <span className={own.otherTitle}>{h.title}</span>
                  <span className={own.otherMeta}>{h.pausedAt ? 'Paused' : scheduleLabel(h.schedule)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={own.hint}>Things you want to keep doing, like reading or the gym. They show up on Today.</p>
        )}
        <button type="button" className={own.addRow} onClick={openNewHabit}>
          <PlusIcon />
          New habit
        </button>
      </section>

      <section className={own.section} aria-labelledby="minimum-heading">
        <h2 id="minimum-heading" className={own.heading}>
          For bad days
        </h2>
        <Link to="/minimum" className={own.minimumRow}>
          <span className={own.minimumTitle}>My minimum day</span>
          <span className={own.minimumText}>{minimumSummary}</span>
        </Link>
      </section>

      {soon.length > 0 && (
        <section className={own.section} aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className={own.heading}>
            Upcoming
          </h2>
          {groupByDay(soon).map(([d, tasks]) => (
            <div key={d} className={own.dayGroup}>
              <h3 className={own.dayLabel}>{dayLabel(d, today, (k) => longDay.format(new Date(`${k}T12:00:00`)))}</h3>
              <ul className={own.list}>
                {tasks.map((a) => (
                  <ActionRow key={a.id} action={a} meta={a.time} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <section className={own.section} aria-labelledby="later-heading">
        <h2 id="later-heading" className={own.heading}>
          Someday
        </h2>
        {later.length > 0 ? (
          <ul className={own.list}>
            {later.map((a) => (
              <ActionRow key={a.id} action={a} meta={a.estimateMinutes ? `${a.estimateMinutes} min` : undefined} />
            ))}
          </ul>
        ) : (
          <p className={own.hint}>Tasks without a date. Do them whenever suits you.</p>
        )}
        <button type="button" className={own.addRow} onClick={() => openAdd('later')}>
          <PlusIcon />
          Add a task
        </button>
      </section>

      {others.length > 0 && (
        <section className={own.section} aria-labelledby="others-heading">
          <h2 id="others-heading" className={own.heading}>
            Paused and completed
          </h2>
          <ul className={own.list}>
            {others.map((m) => (
              <li key={m.id} className={own.otherRow}>
                <Link to={`/goal/${m.id}`} className={own.otherLink}>
                  <span className={own.otherTitle}>{m.title}</span>
                  <span className={own.otherMeta}>
                    {m.status === 'complete' && m.completedAt ? `Completed ${formatShortDay(dayKey(new Date(m.completedAt)))}` : 'Paused'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MissionSection({ mission, actions, sessions }: { mission: Mission; actions: Action[]; sessions: FocusSession[] }) {
  const { openAdd } = useSheets();
  const next = nextAction(mission.id, actions);
  const stats = missionStats(mission.id, actions, sessions);
  const meta = mission.targetDay ? `By ${formatShortDay(mission.targetDay)}` : stats.focusMs >= 60_000 ? formatDuration(stats.focusMs) : undefined;

  return (
    <div className={own.mission}>
      <Link to={`/goal/${mission.id}`} className={own.missionHead}>
        <span className={own.missionTitle}>{mission.title}</span>
        {meta && <span className={own.missionMeta}>{meta}</span>}
      </Link>
      <GoalProgressBar progress={goalProgress(mission, actions)} />
      {next ? (
        <div className={own.nextRow}>
          <span className={own.next}>Next: {next.title}</span>
          {next.state === 'today' ? (
            <span className={own.onToday}>
              <Star size={12} />
              On Today
            </span>
          ) : (
            <button type="button" className={own.todayButton} onClick={() => void moveToToday(next.id)} aria-label={`Do ${next.title} today`}>
              Today
            </button>
          )}
        </div>
      ) : (
        <button type="button" className={own.needsStep} onClick={() => openAdd('later', mission.id)}>
          <PlusIcon />
          Add the next step
        </button>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}


const longDay = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'long', day: 'numeric', month: 'short' });

function groupByDay(tasks: Action[]): [string, Action[]][] {
  const groups = new Map<string, Action[]>();
  for (const t of tasks) {
    const key = t.targetDay!;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()];
}
