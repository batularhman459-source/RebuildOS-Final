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
import { Card, EmptyState, Section } from '../components/Section';
import { Icon } from '../components/Icon';
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
  const goalTitle = (a: Action) => (a.missionId ? missionById.get(a.missionId)?.title : undefined);
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

      <Section title="Goals" action={active.length > 0 ? { label: 'New goal', onClick: openNewMission } : undefined}>
        {active.length === 0 ? (
          <EmptyState
            icon="plan"
            title="No goals yet"
            text="A goal is something bigger you’re working towards, like passing an exam or getting fit. Each one always shows its next step."
            action={{ label: 'New goal', onClick: openNewMission }}
          />
        ) : (
          <div className={own.goalCards}>
            {active.map((m) => (
              <Card key={m.id} className={own.goalCard}>
                <MissionSection mission={m} actions={data.actions} sessions={data.sessions} />
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title="Habits" action={habits.length > 0 ? { label: 'New habit', onClick: openNewHabit } : undefined}>
        {habits.length > 0 ? (
          <Card>
            <ul className={own.cardList}>
              {habits.map((h) => (
                <li key={h.id} className={own.otherRow}>
                  <button type="button" className={own.otherLink} onClick={() => openHabit(h.id)}>
                    <span className={own.rowIcon}>
                      <Icon name="repeat" size={16} />
                    </span>
                    <span className={own.otherTitle}>{h.title}</span>
                    <span className={own.otherMeta}>{h.pausedAt ? 'Paused' : scheduleLabel(h.schedule)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState
            icon="repeat"
            title="No habits yet"
            text="Things you want to keep doing, like reading or the gym. They show up on Today."
            action={{ label: 'New habit', onClick: openNewHabit }}
          />
        )}
      </Section>

      <Section title="For bad days">
        <Link to="/minimum" className={own.minimumCard}>
          <span className={own.rowIcon}>
            <Icon name="leaf" size={16} />
          </span>
          <span className={own.minimumBody}>
            <span className={own.minimumTitle}>My minimum day</span>
            <span className={own.minimumText}>{minimumSummary}</span>
          </span>
          <Icon name="chevron" size={16} className={own.chevron} />
        </Link>
      </Section>

      {soon.length > 0 && (
        <Section title="Upcoming">
          {groupByDay(soon).map(([d, tasks]) => (
            <div key={d} className={own.dayGroup}>
              <h3 className={own.dayLabel}>
                <Icon name="calendar" size={15} />
                {dayLabel(d, today, (k) => longDay.format(new Date(`${k}T12:00:00`)))}
              </h3>
              <Card>
                <ul className={own.cardList}>
                  {tasks.map((a) => (
                    <ActionRow key={a.id} action={a} meta={a.time} goal={goalTitle(a)} />
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </Section>
      )}

      <Section title="Someday" subtitle="Tasks without a date" action={{ label: 'Add a task', onClick: () => openAdd('later') }}>
        {later.length > 0 ? (
          <Card>
            <ul className={own.cardList}>
              {later.map((a) => (
                <ActionRow key={a.id} action={a} goal={goalTitle(a)} meta={a.estimateMinutes ? `${a.estimateMinutes} min` : undefined} />
              ))}
            </ul>
          </Card>
        ) : (
          <p className={own.hint}>Nothing here. Tasks you want to do whenever suits you go here.</p>
        )}
      </Section>

      {others.length > 0 && (
        <Section title="Paused and completed">
          <Card>
            <ul className={own.cardList}>
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
          </Card>
        </Section>
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
