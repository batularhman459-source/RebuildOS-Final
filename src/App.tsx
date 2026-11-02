import { Navigate, Route, Routes } from 'react-router-dom';
import { Dock } from './components/Dock';
import { Plan } from './screens/Plan';
import { Progress } from './screens/Progress';
import { Today } from './screens/Today';
import styles from './App.module.css';

export function App() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Dock />
    </div>
  );
}
