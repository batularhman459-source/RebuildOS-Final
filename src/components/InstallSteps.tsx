import { currentPlatform, promptInstall, useCanPromptInstall } from '../data/install';
import styles from './InstallSteps.module.css';

interface InstallStepsProps {
  /** Light (sheet) or dark (stage) surface. */
  tone?: 'light' | 'dark';
}

/** How to put RebuildOS on the home screen, for the device in hand. */
export function InstallSteps({ tone = 'light' }: InstallStepsProps) {
  const canPrompt = useCanPromptInstall();
  const platform = currentPlatform();
  const cls = `${styles.steps} ${tone === 'dark' ? styles.dark : ''}`;

  if (canPrompt) {
    return (
      <div className={cls}>
        <button type="button" className={styles.install} onClick={() => void promptInstall()}>
          Install RebuildOS
        </button>
      </div>
    );
  }

  if (platform === 'ios') {
    return (
      <ol className={cls}>
        <li>
          <span className={styles.num}>1</span>
          <span>
            Tap <ShareIcon /> <strong>Share</strong> in Safari’s toolbar
          </span>
        </li>
        <li>
          <span className={styles.num}>2</span>
          <span>
            Scroll down and tap <strong>Add to Home Screen</strong>
          </span>
        </li>
        <li>
          <span className={styles.num}>3</span>
          <span>Open RebuildOS from your home screen</span>
        </li>
      </ol>
    );
  }

  return (
    <ol className={cls}>
      <li>
        <span className={styles.num}>1</span>
        <span>
          Open your browser’s menu <strong>⋮</strong>
        </span>
      </li>
      <li>
        <span className={styles.num}>2</span>
        <span>
          Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>
        </span>
      </li>
      <li>
        <span className={styles.num}>3</span>
        <span>Open RebuildOS from your home screen</span>
      </li>
    </ol>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: '-2px' }}>
      <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}
