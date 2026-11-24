import { MotionConfig, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { DayProvider } from './app/day';
import { SheetsProvider } from './app/sheets';
import { NavProvider } from './app/nav';
import { UndoProvider } from './app/undo';
import { InstallFlow } from './app/InstallFlow';
import { Dock } from './components/Dock';
import { isRunning } from './core/focus';
import { getActiveSession } from './data/focus';
import { getLastSeenDay, setLastSeenDay } from './data/days';
import { shouldWelcomeBack } from './core/rebuild';
import { useDay } from './app/day';
import { Focus } from './screens/Focus';
import { Mission } from './screens/Mission';
import { Plan } from './screens/Plan';
import { Progress } from './screens/Progress';
import { Rebuild } from './screens/Rebuild';
import { CheckIn } from './screens/CheckIn';
import { DayCounted } from './screens/DayCounted';
import { WeekReview } from './screens/WeekReview';
import { Sky } from './screens/Sky';
import { Journal } from './screens/Journal';
import { DayView } from './screens/DayView';
import { Settings } from './screens/Settings';
import { Welcome } from './screens/Welcome';
import { Setup } from './screens/Setup';
import { needsSetup } from './data/setup';
import { markStartupReady } from './app/startup';
import { Today } from './screens/Today';
import styles from './App.module.css';

/** Full-screen moments hide the dock. */
const FULL_SCREEN = ['/focus', '/minimum', '/welcome', '/setup', '/checkin', '/done', '/week'];

const HAS_VIEW_TRANSITIONS = typeof document !== 'undefined' && 'startViewTransition' in document;

/** Tabs fade in; opacity only, because a transform would break fixed overlays (Focus, compact bar). */
function section(pathname: string): string {
  return '/' + (pathname.split('/')[1] ?? '');
}

export function App() {
  const { pathname } = useLocation();
  const fullScreen = FULL_SCREEN.some((p) => pathname.startsWith(p));
  useStatusBarColour(pathname);
  // A new page starts at the top (the browser would keep the last page's scroll position).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <NavProvider>
      <DayProvider>
        <UndoProvider>
        <SheetsProvider>
          <StartupRouting />
          <InstallFlow />
          <div className={styles.shell}>
            <main className={styles.main}>
              <motion.div
                key={section(pathname)}
                // Where pages slide with View Transitions, don't also fade them.
                initial={HAS_VIEW_TRANSITIONS ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
              <Routes>
                <Route path="/" element={<Today />} />
                <Route path="/plan" element={<Plan />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/goal/:id" element={<Mission />} />
                <Route path="/mission/:id" element={<OldMissionLink />} />
                <Route path="/focus" element={<Focus />} />
                <Route path="/minimum" element={<Rebuild />} />
                <Route path="/rebuild" element={<Navigate to="/minimum" replace />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/setup" element={<Setup />} />
                <Route path="/close" element={<Navigate to="/" replace />} />
                <Route path="/checkin" element={<CheckIn />} />
                <Route path="/done" element={<DayCounted />} />
                <Route path="/week" element={<WeekReview />} />
                <Route path="/sky" element={<Sky />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/day/:day" element={<DayView />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </motion.div>
            </main>
            {!fullScreen && <Dock />}
          </div>
        </SheetsProvider>
        </UndoProvider>
      </DayProvider>
      </NavProvider>
    </MotionConfig>
  );
}

/**
 * On opening the app: go straight back to a running Focus session; otherwise, after
 * three or more days away, show Welcome back; a brand-new person gets the first-time setup. Then remember today as the last day seen.
 */
function StartupRouting() {
  const navigate = useNavigate();
  const day = useDay();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) {
      void setLastSeenDay(day);
      return;
    }
    checked.current = true;
    void (async () => {
      const [session, lastSeen] = await Promise.all([getActiveSession(), getLastSeenDay()]);
      const path = window.location.pathname;
      if (session && isRunning(session.segments)) {
        if (path !== '/focus') navigate('/focus');
      } else if (shouldWelcomeBack(lastSeen, day) && path === '/') {
        navigate('/welcome');
      } else if (path === '/' && (await needsSetup())) {
        navigate('/setup', { replace: true });
      }
      markStartupReady();
      await setLastSeenDay(day);
    })();
  }, [navigate, day]);

  return null;
}

/**
 * The phone's status bar area (behind the time and battery) matches the app, which is
 * dark everywhere.
 */
function useStatusBarColour(pathname: string) {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = '#121110';
  }, [pathname]);
}

/** Goals used to live at /mission/:id. */
function OldMissionLink() {
  const { id = '' } = useParams();
  return <Navigate to={`/goal/${id}`} replace />;
}
