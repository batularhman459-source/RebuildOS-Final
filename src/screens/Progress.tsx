import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useDay } from '../app/day';
import { Star } from '../components/Star';
import { YourData } from '../components/YourData';
import { dayKey } from '../core/day';
import { formatDuration } from '../core/focus';
import { APP_LOCALE } from '../core/locale';
import { activeMissions, missionStats } from '../core/missions';
import { allTime, focusMinutesByDay, lastSevenDays } from '../core/progress';
import { lastDays } from '../core/day';
import { FocusChart } from '../components/FocusChart';
import { GoalsRing } from '../components/GoalsRing';
import { HabitGrid } from '../components/HabitGrid';
import { Section } from '../components/Section';
import { Icon } from '../components/Icon';
import { habitWeek, isActive, recentWeeks } from '../core/habits';
import { goalProgress } from '../core/goals';
import { GoalProgressBar } from '../components/GoalProgressBar';
import { db } from '../data/db';
import styles from './Screen.module.css';
import own from './Progress.module.css';

const weekday = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'narrow' });
const weekdayLong = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'long' });
const dayOf = (t: number) => dayKey(new Date(t));

function focusText(ms: number): string {
  return ms >= 60_000 ? formatDuration(ms) : '0 min';
}

/** Honest progress in real units. Looking back lives here, not on Today. See DESIGN.md and docs/product-brief.md §4.7. */
export function Progress() {
  const today = useDay();
  const data = useLiveQuery(async () => {
    const [actions, sessions, missions, habits, checks, days] = await Promise.all([
      db.actions.toArray(),
      db.focusSessions.toArray(),
      db.missions.toArray(),
      db.habits.toArray(),
      db.habitChecks.toArray(),
      db.days.toArray(),
    ]);
    return { actions, sessions, missions, habits, checks, days, wins: days.filter((d) => d.smallWin).map((d) => d.day) };
  }, []);

  if (!data) return <div className={styles.screen} />;
  const week = lastSevenDays(today, data.actions, data.sessions, dayOf, data.checks, data.wins);
  const record = allTime(data.actions, data.sessions);
  const focus = focusMinutesByDay(lastDays(today, 14), data.sessions, dayOf);
  const habits = data.habits.filter(isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const goals = activeMissions(data.missions).map((m) => ({ m, stats: missionStats(m.id, data.actions, data.sessions), progress: goalProgress(m, data.actions) }));
  const measured = goals.filter((g) => g.progress.kind !== 'none');
  const weekKeys = new Set(week.days.map((d) => d.day));
  const feelings = { good: 0, okay: 0, rough: 0 };
  for (const d of data.days) if (weekKeys.has(d.day) && d.feeling) feelings[d.feeling] += 1;
  const feelingLine = (['good', 'okay', 'rough'] as const)
    .filter((f) => feelings[f] > 0)
    .map((f) => `${feelings[f]} ${f}`)
    .join(' · ');
  const average = measured.length ? measured.reduce((t, g) => t + g.progress.fraction, 0) / measured.length : 0;

  return (
    <div className={styles.screen}>
      <header className={own.detailsHeader}>
        <Link to="/sky" className={own.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          Sky
        </Link>
        <h1 className={styles.title}>Details</h1>
      </header>

      <Link to="/week" className={own.planCard}>
        <span className={`${own.planIcon} ${own.planIconDark}`}>
          <Star size={18} variant="gradient" />
        </span>
        <span className={own.planBody}>
          <span className={own.planTitle}>Weekly check-in</span>
          <span className={own.planText}>Look back and choose what comes first. 2 minutes.</span>
        </span>
        <Icon name="chevron" size={16} className={own.planChevron} />
      </Link>

      <Section title="Last 7 days" card>
        <ol className={own.week}>
          {week.days.map(({ day, active }) => {
            const date = new Date(`${day}T12:00:00`);
            const isToday = day === today;
            return (
              <li key={day} className={own.day}>
                <Star
                  size={isToday ? 26 : 22}
                  variant={active ? 'solid' : 'empty'}
                  label={`${isToday ? 'Today' : weekdayLong.format(date)}: ${active ? 'active' : 'not active'}`}
                />
                <span className={`${own.dayLabel} ${isToday ? own.today : ''}`} aria-hidden="true">
                  {weekday.format(date)}
                </span>
              </li>
            );
          })}
        </ol>
        <p className={own.caption}>
          {week.activeCount === 0
            ? 'Each day you finish a task, tick a habit or focus, a star fills in.'
            : `Active on ${week.activeCount} of the last 7 days.`}
        </p>
        {feelingLine && <p className={own.feelings}>Days: {feelingLine}</p>}
        <dl className={own.stats}>
          <div>
            <dt>tasks done</dt>
            <dd>{week.actionsDone}</dd>
          </div>
          <div>
            <dt>focused</dt>
            <dd>{focusText(week.focusMs)}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Focus" subtitle="Last 14 days" card>
        <FocusChart data={focus} today={today} />
      </Section>

      {goals.length > 0 && (
        <Section title="Goals" card>
          {measured.length > 0 && <GoalsRing fraction={average} goals={measured.length} />}
          <ul className={own.missions}>
            {goals.map(({ m, stats, progress }) => (
              <li key={m.id}>
                <Link to={`/goal/${m.id}`} className={own.goalRow}>
                  <span className={own.missionRow}>
                    <span className={own.missionTitle}>{m.title}</span>
                    {stats.focusMs >= 60_000 && <span className={own.missionMeta}>{focusText(stats.focusMs)} focused</span>}
                  </span>
                  <GoalProgressBar progress={progress} />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {habits.length > 0 && (
        <Section title="Habits this week" subtitle="Last 5 weeks, this week at the bottom" card>
          <ul className={own.habits}>
            {habits.map((h) => {
              const wk = habitWeek(h, today, data.checks);
              const lately = recentWeeks(h, today, data.checks);
              return (
                <li key={h.id} className={own.habit}>
                  <div className={own.habitHead}>
                    <span className={own.habitTitle}>{h.title}</span>
                    <span className={own.habitCount} aria-label={`${h.title}: ${wk.done} of ${wk.target} this week`}>
                      {wk.done >= wk.target ? `Done this week · ${wk.done}×` : `${wk.done} of ${wk.target} this week`}
                    </span>
                  </div>
                  <HabitGrid habitId={h.id} title={h.title} today={today} checks={data.checks} since={dayKey(new Date(h.createdAt))} />
                  {lately.possible > 0 && (
                    <span className={own.lately}>
                      Last 4 weeks: {lately.done} of {lately.possible}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title="All time" subtitle="Your record only ever grows" card>
        <dl className={own.record}>
          <div>
            <dt>focused</dt>
            <dd>{focusText(record.focusMs)}</dd>
          </div>
          <div>
            <dt>tasks done</dt>
            <dd>{record.actionsDone}</dd>
          </div>
        </dl>
      </Section>

      <YourData />
    </div>
  );
}
