import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { InstallSteps } from '../components/InstallSteps';
import { Sheet } from '../components/Sheet';
import { Stage } from '../components/Stage';
import { Star } from '../components/Star';
import forms from '../components/forms.module.css';
import { shouldPromptInstall, shouldRequireInstall } from '../core/install';
import { getInstallPromptState, isInstalled, isPhone, markInstallPromptShown, recordBrowserOpen } from '../data/install';
import { useDay } from './day';
import styles from './InstallFlow.module.css';

/**
 * In a phone browser: a friendly prompt once, after the first finished Focus session;
 * from the third day of use, a screen that asks to install before continuing.
 * Installed apps and desktop browsers never see either.
 */
export function InstallFlow() {
  const day = useDay();
  const { pathname } = useLocation();
  const [installed] = useState(isInstalled);
  const [required, setRequired] = useState(false);
  const promptState = useLiveQuery(() => getInstallPromptState(), []);

  useEffect(() => {
    if (installed) return;
    void recordBrowserOpen(day).then((openDays) => setRequired(shouldRequireInstall({ installed, isPhone: isPhone(), openDays })));
  }, [day, installed]);

  if (installed) return null;
  if (required) return <InstallRequired />;

  const showPrompt =
    pathname === '/' && promptState !== undefined && shouldPromptInstall({ installed, due: promptState.due, shownBefore: promptState.shownBefore });

  return (
    <Sheet open={showPrompt} onClose={() => void markInstallPromptShown()} label="Add RebuildOS to your home screen">
      <h2 className={forms.title}>Keep RebuildOS on your home screen</h2>
      <p className={styles.text}>It opens like an app, works offline and keeps your progress safe on this phone.</p>
      <InstallSteps />
      <button type="button" className={styles.later} onClick={() => void markInstallPromptShown()}>
        Not now
      </button>
    </Sheet>
  );
}

function InstallRequired() {
  return (
    <div className={styles.gate} role="dialog" aria-modal="true" aria-label="Add RebuildOS to your home screen">
      <Stage glowTop="30%" aria-label="Install RebuildOS">
        <div style={{ flex: 1 }} />
        <Star size={88} variant="gradient" />
        <h1 className={styles.title}>
          One more <i>step.</i>
        </h1>
        <p className={styles.gateText}>
          RebuildOS lives on your home screen. It opens like an app and keeps your progress safe on this phone.
        </p>
        <div style={{ flex: 0.6 }} />
        <div className={styles.steps}>
          <InstallSteps tone="dark" />
        </div>
        <p className={styles.note}>Everything you’ve added so far comes with you.</p>
        <div style={{ flex: 1 }} />
      </Stage>
    </div>
  );
}
