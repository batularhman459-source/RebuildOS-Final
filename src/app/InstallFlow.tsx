import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { InstallSteps } from '../components/InstallSteps';
import { Sheet } from '../components/Sheet';
import forms from '../components/forms.module.css';
import { shouldPromptInstall } from '../core/install';
import { getInstallPromptState, isInstalled, markInstallPromptShown } from '../data/install';
import styles from './InstallFlow.module.css';

/**
 * A friendly, closable suggestion to add RebuildOS to the home screen — once, back on
 * Today after the first finished Focus session. Never blocks the app. It can also be
 * opened any time from Progress → Your data.
 */
export function InstallFlow() {
  const { pathname } = useLocation();
  const [installed] = useState(isInstalled);
  const promptState = useLiveQuery(() => getInstallPromptState(), []);

  if (installed) return null;
  const show =
    pathname === '/' && promptState !== undefined && shouldPromptInstall({ installed, due: promptState.due, shownBefore: promptState.shownBefore });

  return (
    <Sheet open={show} onClose={() => void markInstallPromptShown()} label="Add RebuildOS to your home screen">
      <h2 className={forms.title}>Put RebuildOS on your home screen</h2>
      <p className={styles.text}>It opens like a normal app, works offline, and keeps your progress safe on this phone.</p>
      <InstallSteps />
      <button type="button" className={styles.later} onClick={() => void markInstallPromptShown()}>
        Maybe later
      </button>
    </Sheet>
  );
}
