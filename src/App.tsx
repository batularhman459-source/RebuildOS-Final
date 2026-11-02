import { MotionConfig } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DayProvider } from './app/day';
import { SheetsProvider } from './app/sheets';
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
import { Welcome } from './screens/Welcome';
import { Today } from './screens/Today';
import styles from './App.module.css';

/** Full-screen moments hide the dock. */
const FULL_SCREEN = ['/focus', '/rebuild', '/welcome'];

export function App() {
  const { pathname } = useLocation();
  const fullScreen = FULL_SCREEN.some((p) => pathname.startsWith(p));

  return (
    <MotionConfig reducedMotion="user">
      <DayProvider>
        <SheetsProvider>
          <StartupRouting />
          <div className={styles.shell}>
            <main className={styles.main}>
              <Routes>
                <Route path="/" element={<Today />} />
                <Route path="/plan" element={<Plan />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/mission/:id" element={<Mission />} />
                <Route path="/focus" element={<Focus />} />
                <Route path="/rebuild" element={<Rebuild />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            {!fullScreen && <Dock />}
          </div>
        </SheetsProvider>
      </DayProvider>
    </MotionConfig>
  );
}

/**
 * On opening the app: go straight back to a running Focus session; otherwise, after
 * three or more days away, show Welcome back. Then remember today as the last day seen.
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
      }
      await setLastSeenDay(day);
    })();
  }, [navigate, day]);

  return null;
}
