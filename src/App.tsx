import { MotionConfig } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DayProvider } from './app/day';
import { SheetsProvider } from './app/sheets';
import { Dock } from './components/Dock';
import { isRunning } from './core/focus';
import { getActiveSession } from './data/focus';
import { Focus } from './screens/Focus';
import { Plan } from './screens/Plan';
import { Progress } from './screens/Progress';
import { Today } from './screens/Today';
import styles from './App.module.css';

/** Full-screen moments hide the dock. */
const FULL_SCREEN = ['/focus'];

export function App() {
  const { pathname } = useLocation();
  const fullScreen = FULL_SCREEN.some((p) => pathname.startsWith(p));

  return (
    <MotionConfig reducedMotion="user">
      <DayProvider>
        <SheetsProvider>
          <ReturnToRunningFocus />
          <div className={styles.shell}>
            <main className={styles.main}>
              <Routes>
                <Route path="/" element={<Today />} />
                <Route path="/plan" element={<Plan />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/focus" element={<Focus />} />
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

/** If the app is reopened while a Focus session is still running, go straight back to it. */
function ReturnToRunningFocus() {
  const navigate = useNavigate();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    void getActiveSession().then((s) => {
      if (s && isRunning(s.segments) && window.location.pathname !== '/focus') navigate('/focus');
    });
  }, [navigate]);

  return null;
}
