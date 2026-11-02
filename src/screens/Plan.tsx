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
import type { Action, FocusSession, Mission } from '../core/types';
import { moveToToday } from '../data/actions';
import { db } from '../data/db';
import styles from './Screen.module.css';
import own from './Plan.module.css';

export function Plan() {
  const { openAdd, openNewMission } = useSheets();
  const data = useLiveQuery(async () => {
    const [missions, actions, sessions] = await Promise.all([db.missions.toArray(), db.actions.toArray(), db.focusSessions.toArray()]);
    return { missions, actions, sessions };
  }, []);

  if (!data) return <div className={styles.screen} />;
  const active = activeMissions(data.missions);
  // Later shows loose Actions, plus leftovers from Missions that are complete or gone.
  // Steps of active and parked Missions live on the Mission's page.
  const missionById = new Map(data.missions.map((m) => [m.id, m]));
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
            {active.length} {active.length === 1 ? 'Mission' : 'Missions'}
          </span>
        )}
      </header>

      {active.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No Missions yet</h2>
          <p className={styles.emptyText}>
            Missions are bigger goals, like passing an exam or getting fit. Each one always shows its next step.
          </p>
          <button type="button" className={own.newMission} onClick={openNewMission}>
            New Mission
          </button>
        </div>
      ) : (
        <section aria-label="Missions">
          {active.map((m) => (
            <MissionSection key={m.id} mission={m} actions={data.actions} sessions={data.sessions} />
          ))}
          <button type="button" className={own.addRow} onClick={openNewMission}>
            <PlusIcon />
            New Mission
          </button>
        </section>
      )}

      <section className={own.section} aria-labelledby="later-heading">
        <h2 id="later-heading" className={own.heading}>
          Later
        </h2>
        {later.length > 0 ? (
          <ul className={own.list}>
            {later.map((a) => (
              <ActionRow key={a.id} action={a} meta={a.estimateMinutes ? `${a.estimateMinutes} min` : undefined} />
            ))}
          </ul>
        ) : (
          <p className={own.hint}>Things you want to do, just not today.</p>
        )}
        <button type="button" className={own.addRow} onClick={() => openAdd('later')}>
          <PlusIcon />
          Add for later
        </button>
      </section>

      {others.length > 0 && (
        <section className={own.section} aria-labelledby="others-heading">
          <h2 id="others-heading" className={own.heading}>
            Parked and completed
          </h2>
          <ul className={own.list}>
            {others.map((m) => (
              <li key={m.id} className={own.otherRow}>
                <Link to={`/mission/${m.id}`} className={own.otherLink}>
                  <span className={own.otherTitle}>{m.title}</span>
                  <span className={own.otherMeta}>
                    {m.status === 'complete' && m.completedAt ? `Completed ${formatShortDay(dayKey(new Date(m.completedAt)))}` : 'Parked'}
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
      <Link to={`/mission/${mission.id}`} className={own.missionHead}>
        <span className={own.missionTitle}>{mission.title}</span>
        {meta && <span className={own.missionMeta}>{meta}</span>}
      </Link>
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

